import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const [admin,student,css,mobileLock,enhancements,client,studentClient,refreshClient,worker,manifestSource,taplaiCss,viteConfig,vercelSource]=await Promise.all([
  readFile(new URL("index.html",root),"utf8"),
  readFile(new URL("hoc-vien.html",root),"utf8"),
  readFile(new URL("mobile-app.css",root),"utf8"),
  readFile(new URL("public/mobile-viewport-lock.css",root),"utf8"),
  readFile(new URL("site-enhancements.js",root),"utf8"),
  readFile(new URL("mobile-dashboard.js",root),"utf8"),
  readFile(new URL("student.js",root),"utf8"),
  readFile(new URL("driving-refresh.js",root),"utf8"),
  readFile(new URL("public/sw.js",root),"utf8"),
  readFile(new URL("public/site.webmanifest",root),"utf8"),
  readFile(new URL("taplai-inspired.css",root),"utf8"),
  readFile(new URL("vite.config.js",root),"utf8"),
  readFile(new URL("vercel.json",root),"utf8")
]);
const manifest=JSON.parse(manifestSource);
const vercelConfig=JSON.parse(vercelSource);

for(const [name,html] of [["Admin",admin],["Học viên",student]]){
  for(const token of ["mobile-appbar","mobile-page-tabs","mobile-dashboard-home","mobile-module-track","mobile-bottom-nav","data-mobile-icon","/mobile-app.css","/mobile-dashboard.js","/site-enhancements.js"]){
    if(!html.includes(token))throw new Error(`${name} thiếu thành phần mobile: ${token}`);
  }
}
for(const token of ["@media(max-width:720px)","env(safe-area-inset-bottom)","position:fixed","scroll-snap-type","mobile-account-menu","flex-direction:row!important","min-height:44px"]){
  if(!css.includes(token))throw new Error(`CSS mobile thiếu: ${token}`);
}
for(const token of ["font-size:16px!important","overflow-x:hidden!important","grid-auto-columns:178px!important","100svh","admin-profile-dialog","touch-action:manipulation"]){
  if(!mobileLock.includes(token))throw new Error(`Khóa tỷ lệ mobile thiếu: ${token}`);
}
for(const token of ["mobile-viewport-lock.css?v=3","ensureMobileViewportStyles"]){
  if(!enhancements.includes(token))throw new Error(`Chưa nạp bản vá tỷ lệ mobile: ${token}`);
}
for(const token of ["data-mobile-click","data-mobile-scroll","MutationObserver","mobileAdminNotificationBadge","mobileStudentNotificationBadge","MOBILE_ICONS","renderIcons"]){
  if(!client.includes(token))throw new Error(`Điều hướng mobile thiếu: ${token}`);
}
for(const token of ["studentDrivingRefreshShortcut","studentDrivingRefreshCta","Đã nhận bằng lái","/bo-tuc-tay-lai.html#tinh-chi-phi"]){
  if(!student.includes(token)&&!admin.includes(token))throw new Error(`Liên kết bổ túc tay lái thiếu: ${token}`);
}
for(const token of ["hasReceivedLicense","renderDrivingRefreshAccess","driving_refresh_student_prefill"]){
  if(!studentClient.includes(token)&&!refreshClient.includes(token))throw new Error(`Luồng bổ túc tay lái của học viên thiếu: ${token}`);
}
for(const token of ["thay-dat-pwa-v42","/mobile-viewport-lock.css?v=3","cache.put(request,copy)"]){
  if(!worker.includes(token))throw new Error(`PWA chưa lưu tài nguyên mobile: ${token}`);
}
if(manifest.start_url!=="/?login=1")throw new Error("PWA chưa mở đúng cổng đăng nhập trên điện thoại.");
for(const token of [".td-taplai-inspired .mobile-bar{display:none!important}","padding-bottom:calc(82px + env(safe-area-inset-bottom))",".td-mobile-input-active .td-mobile-actionbar","clip-path:inset(0 -100vmax)"]){
  if(!taplaiCss.includes(token))throw new Error(`Trang đăng ký mobile thiếu: ${token}`);
}
for(const token of ["legacyAppRoot","/?login=1"]){
  if(!viteConfig.includes(token))throw new Error(`Luồng chuyển PWA iPhone cũ thiếu: ${token}`);
}
const legacyRootRedirect=vercelConfig.redirects?.find(rule=>rule.source==="/"&&rule.destination==="https://hoclaixecungdat.vercel.app/?login=1"&&rule.has?.some(condition=>condition.type==="host"&&condition.value==="hoc-vien-thay-dat.vercel.app"));
if(!legacyRootRedirect)throw new Error("Vercel chưa chuyển PWA iPhone cũ về đúng cổng đăng nhập.");
for(const [name,html] of [["Admin",admin],["Học viên",student]]){
  if(!html.includes("/mobile-viewport-lock.css?v=3"))throw new Error(`${name} chưa nạp CSS chống tràn mobile từ HTML.`);
}
console.log("Mobile toàn site hợp lệ: PWA mở đúng cổng đăng nhập, không chồng thanh hành động, không tự zoom và không tràn ngang.");
