import {access,readFile} from "node:fs/promises";
import {resolve} from "node:path";

const root=resolve(import.meta.dirname,"..");
const pages=["index.html","hoc-vien.html","600-cau-hoi.html","lich-dao-tao.html","bo-tuc-tay-lai.html","dang-ky-hoc-lai-xe.html","chinh-sach-bao-mat.html","404.html"];
const manifestOptional=new Set(["chinh-sach-bao-mat.html","404.html"]);
const publicPages=new Set(["600-cau-hoi.html","bo-tuc-tay-lai.html","dang-ky-hoc-lai-xe.html","chinh-sach-bao-mat.html"]);
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
  if(!html.includes('/mobile-viewport-lock.css?v=3'))errors.push(`${page}: thiếu CSS ổn định giao diện mobile`);
  if(!manifestOptional.has(page)&&!/<link\s+rel="manifest"/.test(html))errors.push(`${page}: thiếu manifest`);
  if(page!=="404.html"&&!/<meta\s+name="description"/.test(html))errors.push(`${page}: thiếu mô tả`);
  if(publicPages.has(page)&&!/<link\s+rel="canonical"\s+href="https:\/\/www\.hoclaixecungdat\.com\//.test(html))errors.push(`${page}: canonical chưa dùng tên miền chính`);
  if(publicPages.has(page)&&!/<meta\s+name="robots"[^>]*index,follow/i.test(html))errors.push(`${page}: chưa cho phép index rõ ràng`);

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

for(const publicAsset of ["public/robots.txt","public/sitemap.xml"]){
  if(!(await exists(resolve(root,publicAsset))))errors.push(`Thiếu ${publicAsset}`);
}

const registrationHtml=await readFile(resolve(root,"dang-ky-hoc-lai-xe.html"),"utf8");
const registrationJs=await readFile(resolve(root,"new-student-registration.js"),"utf8");
const eligibilityJs=await readFile(resolve(root,"license-eligibility-section.js"),"utf8");
const trainingDetailsJs=await readFile(resolve(root,"license-training-details.js"),"utf8");
const tuitionDetailsJs=await readFile(resolve(root,"tuition-details.js"),"utf8");
const faqJs=await readFile(resolve(root,"official-faq-section.js"),"utf8");
const viteConfig=await readFile(resolve(root,"vite.config.js"),"utf8");
const registrationLicenses=["A1","A","B số tự động","B số sàn","C1"];
for(const license of registrationLicenses){
  if(!registrationHtml.includes(`data-license-card="${license}"`))errors.push(`Biểu mẫu đăng ký: thiếu hạng ${license}`);
  if(!trainingDetailsJs.includes(`"${license}":{`))errors.push(`Nội dung đào tạo: thiếu hạng ${license}`);
  if(!tuitionDetailsJs.includes(`license:"${license}"`))errors.push(`Học phí tư vấn: thiếu hạng ${license}`);
}
if(!/<input\b[^>]*id="licenseClass"[^>]*value="B số tự động"/.test(registrationHtml))errors.push("Biểu mẫu đăng ký: hạng mặc định không phải B số tự động");
if(!registrationJs.includes('licenseInput.setAttribute("value",storedLicense)'))errors.push("Biểu mẫu đăng ký: chưa đồng bộ giá trị hạng với HTML");
if(!registrationJs.includes("license_class:selectedLicenseForSubmit()"))errors.push("Biểu mẫu đăng ký: dữ liệu gửi chưa lấy hạng đã đồng bộ");
if(!registrationHtml.includes("2,5–3 tháng")||!registrationHtml.includes("3,5–4 tháng"))errors.push("Nội dung khóa học: thiếu thời gian dự kiến của hạng B hoặc C1");
if(!registrationHtml.includes('href="/chinh-sach-bao-mat.html"'))errors.push("Biểu mẫu đăng ký: thiếu liên kết chính sách dữ liệu trong phần đồng ý");
if(!eligibilityJs.includes("Không còn phần thi mô phỏng trên máy tính"))errors.push("Nội dung sát hạch: chưa nêu rõ B/C1 không còn thi mô phỏng");
for(const requiredText of ["01/07/2026","Thông tư 108/2026/TT-BCA","lý thuyết, thực hành trong hình và thực hành trên đường"]){
  if(!faqJs.toLowerCase().includes(requiredText.toLowerCase()))errors.push(`Hỏi đáp sát hạch: thiếu "${requiredText}"`);
}
if(viteConfig.includes("hero-student-car.webp")||registrationHtml.includes("hero-student-car.webp"))errors.push("Hình ảnh thương hiệu: còn tham chiếu tệp WebP bị hỏng");
const heroPath=resolve(root,"public/hero-vip-navy-champagne.webp");
const hero=await readFile(heroPath);
const declaredRiffSize=hero.length>=12?hero.readUInt32LE(4)+8:0;
if(hero.subarray(0,4).toString()!=="RIFF"||hero.subarray(8,12).toString()!=="WEBP"||declaredRiffSize!==hero.length)errors.push("Hình ảnh thương hiệu: tệp WebP không đầy đủ hoặc sai định dạng");

const privacyHtml=await readFile(resolve(root,"chinh-sach-bao-mat.html"),"utf8");
for(const requiredText of ["Bên kiểm soát dữ liệu","Mục đích và căn cứ xử lý","Quyền của chủ thể dữ liệu","91/2025/QH15","356/2025/NĐ-CP"]){
  if(!privacyHtml.includes(requiredText))errors.push(`Chính sách dữ liệu: thiếu "${requiredText}"`);
}

const sitemap=await readFile(resolve(root,"public/sitemap.xml"),"utf8");
if(sitemap.includes("vercel.app"))errors.push("sitemap.xml: còn tên miền Vercel");
if(!sitemap.includes("https://www.hoclaixecungdat.com/"))errors.push("sitemap.xml: thiếu tên miền chính");

if(errors.length){
  console.error(`Website chưa hợp lệ (${errors.length} lỗi):`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Hợp lệ: ${pages.length} trang, metadata công khai, ID duy nhất và toàn bộ tài nguyên nội bộ tồn tại.`);
