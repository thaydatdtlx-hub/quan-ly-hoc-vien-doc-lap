import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const [admin,student,css,client,worker]=await Promise.all([
  readFile(new URL("index.html",root),"utf8"),
  readFile(new URL("hoc-vien.html",root),"utf8"),
  readFile(new URL("mobile-app.css",root),"utf8"),
  readFile(new URL("mobile-dashboard.js",root),"utf8"),
  readFile(new URL("public/sw.js",root),"utf8")
]);

for(const [name,html] of [["Admin",admin],["Học viên",student]]){
  for(const token of ["mobile-appbar","mobile-page-tabs","mobile-dashboard-home","mobile-module-track","mobile-bottom-nav","/mobile-app.css","/mobile-dashboard.js"]){
    if(!html.includes(token))throw new Error(`${name} thiếu thành phần mobile: ${token}`);
  }
}
for(const token of ["@media(max-width:720px)","env(safe-area-inset-bottom)","position:fixed","scroll-snap-type","mobile-account-menu"]){
  if(!css.includes(token))throw new Error(`CSS mobile thiếu: ${token}`);
}
for(const token of ["data-mobile-click","data-mobile-scroll","MutationObserver","mobileAdminNotificationBadge","mobileStudentNotificationBadge"]){
  if(!client.includes(token))throw new Error(`Điều hướng mobile thiếu: ${token}`);
}
for(const token of ["thay-dat-pwa-v3","cache.put(request,copy)"]){
  if(!worker.includes(token))throw new Error(`PWA chưa lưu tài nguyên mobile: ${token}`);
}
console.log("Mobile dashboard hợp lệ: Admin và học viên có app bar, tab, thẻ kéo ngang, cảnh báo động và thanh điều hướng cố định.");
