import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const [admin,student,css,client,studentClient,refreshClient,worker]=await Promise.all([
  readFile(new URL("index.html",root),"utf8"),
  readFile(new URL("hoc-vien.html",root),"utf8"),
  readFile(new URL("mobile-app.css",root),"utf8"),
  readFile(new URL("mobile-dashboard.js",root),"utf8"),
  readFile(new URL("student.js",root),"utf8"),
  readFile(new URL("driving-refresh.js",root),"utf8"),
  readFile(new URL("public/sw.js",root),"utf8")
]);

for(const [name,html] of [["Admin",admin],["Học viên",student]]){
  for(const token of ["mobile-appbar","mobile-page-tabs","mobile-dashboard-home","mobile-module-track","mobile-bottom-nav","data-mobile-icon","/mobile-app.css","/mobile-dashboard.js"]){
    if(!html.includes(token))throw new Error(`${name} thiếu thành phần mobile: ${token}`);
  }
}
for(const token of ["@media(max-width:720px)","env(safe-area-inset-bottom)","position:fixed","scroll-snap-type","mobile-account-menu","flex-direction:row!important","min-height:44px"]){
  if(!css.includes(token))throw new Error(`CSS mobile thiếu: ${token}`);
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
for(const token of ["thay-dat-pwa-v18","cache.put(request,copy)"]){
  if(!worker.includes(token))throw new Error(`PWA chưa lưu tài nguyên mobile: ${token}`);
}
console.log("Mobile dashboard hợp lệ: Admin và học viên có app bar, tab, thẻ kéo ngang, cảnh báo động và thanh điều hướng cố định.");
