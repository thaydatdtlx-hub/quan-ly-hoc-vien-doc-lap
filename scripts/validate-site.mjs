import {access,readFile} from "node:fs/promises";
import {resolve} from "node:path";

const root=resolve(import.meta.dirname,"..");
const pages=["index.html","hoc-vien.html","600-cau-hoi.html","lich-dao-tao.html","bo-tuc-tay-lai.html","404.html"];
const errors=[];

async function exists(path){
  try{await access(path);return true}catch{return false}
}

function localReferences(html){
  const refs=[];
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    const raw=match[1];
    if(!raw||raw.startsWith("http")||raw.startsWith("#")||raw.startsWith("data:")||raw==="/")continue;
    const clean=raw.split(/[?#]/)[0];
    if(!clean||!/[.](?:html|css|js|json|webp|png|jpg|jpeg)$/i.test(clean))continue;
    refs.push(clean);
  }
  return refs;
}

function duplicateIds(html){
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  return ids.filter((id,index)=>ids.indexOf(id)!==index);
}

for(const page of pages){
  const path=resolve(root,page);
  const html=await readFile(path,"utf8");
  if(!/<html\s+lang="vi"/.test(html))errors.push(`${page}: thiếu ngôn ngữ tiếng Việt`);
  if(!/<meta\s+name="viewport"/.test(html))errors.push(`${page}: thiếu viewport`);
  if(!/<title>[^<]+<\/title>/.test(html))errors.push(`${page}: thiếu tiêu đề`);
  if(!/<h1[\s>]/.test(html))errors.push(`${page}: thiếu H1`);
  if(!/<link\s+rel="icon"/.test(html))errors.push(`${page}: thiếu favicon`);
  if(!/<link\s+rel="manifest"/.test(html))errors.push(`${page}: thiếu manifest`);
  if(page!=="404.html"&&!/<meta\s+name="description"/.test(html))errors.push(`${page}: thiếu mô tả`);

  for(const duplicate of new Set(duplicateIds(html)))errors.push(`${page}: trùng id "${duplicate}"`);
  for(const image of html.matchAll(/<img\b[^>]*>/g)){
    if(!/\salt="[^"]*"/.test(image[0]))errors.push(`${page}: ảnh thiếu alt (${image[0].slice(0,80)}…)`);
  }

  for(const reference of localReferences(html)){
    const relative=reference.replace(/^\//,"");
    const candidates=[resolve(root,relative),resolve(root,"public",relative)];
    if(!(await Promise.all(candidates.map(exists))).some(Boolean))errors.push(`${page}: không tìm thấy ${reference}`);
  }
}

if(errors.length){
  console.error(`Website chưa hợp lệ (${errors.length} lỗi):`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Hợp lệ: ${pages.length} trang, metadata đầy đủ, ID duy nhất và toàn bộ tài nguyên nội bộ tồn tại.`);
