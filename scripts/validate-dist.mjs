import {readFile,readdir} from "node:fs/promises";
import {resolve} from "node:path";

const root=resolve(import.meta.dirname,"..");
const dist=resolve(root,"dist");
const forbidden=[
  /đào\s+tạo\s+lái\s+xe\s+trọn\s+gói/iu,
  /daotaolaixetrongoi\.com/iu,
  /hoc-vien-thay-dat\.vercel\.app/iu,
  /daotaolaixe-thaydat\.vercel\.app/iu,
  /trung\s+tâm\s+đào\s+tạo\s+lái\s+xe\s+thầy\s+đạt/iu
];
const errors=[];

for(const name of await readdir(dist)){
  if(!/\.(?:html|xml|txt)$/i.test(name))continue;
  const text=await readFile(resolve(dist,name),"utf8");
  for(const rule of forbidden){
    if(rule.test(text))errors.push(`${name}: còn nội dung thương hiệu cũ (${rule})`);
  }
}

const vercel=JSON.parse(await readFile(resolve(root,"vercel.json"),"utf8"));
const rewrites=vercel.rewrites||[];
const hasHome=rewrites.some(item=>item.source==="/"&&item.destination==="/dang-ky-hoc-lai-xe.html");
const hasLogin=rewrites.some(item=>item.source==="/dang-nhap.html"&&item.destination==="/index.html");
if(!hasHome)errors.push("vercel.json: thiếu rewrite / -> trang chủ công khai");
if(!hasLogin)errors.push("vercel.json: thiếu rewrite /dang-nhap.html -> ứng dụng đăng nhập");

const landing=await readFile(resolve(dist,"dang-ky-hoc-lai-xe.html"),"utf8");
if(!landing.includes('rel="canonical" href="https://www.hoclaixecungdat.com/"'))errors.push("Trang chủ: canonical chưa trỏ về tên miền chính /");
if(!landing.includes("Học lái xe cùng Đạt"))errors.push("Trang chủ: thiếu thương hiệu Học lái xe cùng Đạt");

const sitemap=await readFile(resolve(dist,"sitemap.xml"),"utf8");
if(!sitemap.includes("<loc>https://www.hoclaixecungdat.com/</loc>"))errors.push("sitemap.xml: thiếu trang chủ trên tên miền chính /");
if(sitemap.includes("vercel.app"))errors.push("sitemap.xml: còn tên miền triển khai Vercel");
if(sitemap.includes("/dang-ky-hoc-lai-xe.html</loc>"))errors.push("sitemap.xml: còn URL trang đăng ký cũ thay vì canonical /");

if(errors.length){
  console.error(`Bản build chưa đạt (${errors.length} lỗi):`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log("Bản build hợp lệ: branding sạch, homepage/login tách rõ và SEO canonical nhất quán.");
