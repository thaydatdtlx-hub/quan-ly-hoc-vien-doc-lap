import {readFile,stat} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const manifest=JSON.parse(await readFile(new URL("public/site.webmanifest",root),"utf8"));
if(manifest.display!=="standalone"||manifest.start_url!=="/?login=1"||manifest.scope!=="/")throw new Error("Manifest chưa mở đúng cổng đăng nhập ở chế độ ứng dụng độc lập.");
for(const size of ["192x192","512x512"]){
  if(!manifest.icons.some(icon=>icon.sizes===size&&icon.type==="image/png"))throw new Error(`Manifest thiếu biểu tượng PNG ${size}.`);
}
if(!manifest.icons.some(icon=>icon.purpose==="maskable"))throw new Error("Manifest thiếu biểu tượng maskable cho Android.");

for(const icon of manifest.icons){
  const path=new URL(`public/${icon.src.replace(/^\//,"")}`,root);
  if((await stat(path)).size<1000)throw new Error(`Biểu tượng ${icon.src} không hợp lệ.`);
}

const sw=await readFile(new URL("public/sw.js",root),"utf8");
for(const token of ["self.addEventListener(\"install\"","self.addEventListener(\"activate\"","self.addEventListener(\"fetch\"","/offline.html","request.mode===\"navigate\""]){
  if(!sw.includes(token))throw new Error(`Service Worker thiếu: ${token}`);
}

const installer=await readFile(new URL("pwa-install.js",root),"utf8");
for(const token of ["serviceWorker.register","beforeinstallprompt","appinstalled","navigator.standalone","Thêm vào MH chính","showLaunchScreen"]){
  if(!installer.includes(token))throw new Error(`Luồng cài ứng dụng thiếu: ${token}`);
}

for(const file of ["index.html","hoc-vien.html","lich-dao-tao.html","600-cau-hoi.html","bo-tuc-tay-lai.html"]){
  const html=await readFile(new URL(file,root),"utf8");
  for(const token of ["/site.webmanifest","/apple-touch-icon-180.png","mobile-web-app-capable","/pwa-install.css","/pwa-install.js"]){
    if(!html.includes(token))throw new Error(`${file} thiếu ${token}.`);
  }
}
console.log("PWA hợp lệ: cài iPhone/Android, biểu tượng chuẩn, toàn màn hình, màn hình khởi động và ngoại tuyến.");
