import {readFile} from "node:fs/promises";

const dist=new URL("../dist/",import.meta.url);
const [html,portalSource]=await Promise.all([
  readFile(new URL("hoc-vien.html",dist),"utf8"),
  readFile(new URL("../hoc-vien.html",import.meta.url),"utf8")
]);
const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map(match=>match[1]);
const scriptAssets=[...html.matchAll(/<script[^>]+src="(\/assets\/[^"]+\.js)"[^>]*><\/script>/g)].map(match=>match[1]);
if(!assets.length||!scriptAssets.length)throw new Error("Build cổng học viên không có JavaScript entry.");

const source=(await Promise.all([...new Set(assets)].map(asset=>readFile(new URL(`.${asset}`,dist),"utf8")))).join("\n");
for(const token of [
  "/api/student-rpc",
  "app_list_training_requests",
  "app_student_create_training_request_slot",
  "app_mark_notifications_read",
  "app_student_change_password",
  "student-profile-ready",
  "data-student-postboot",
  "render-error",
  "student-functions-ready"
]){
  if(!source.includes(token))throw new Error(`Bundle cổng học viên thiếu chức năng/guard: ${token}`);
}
if(source.includes("student_mobile_recovery_20260816_v2"))throw new Error("Core bundle vẫn chứa student-mobile-recovery observer chạy sớm.");
if(html.includes("student_rescue_cleanup_20260816")||source.includes("Đổi mật khẩu đang được tạm tắt"))throw new Error("Build vẫn đang dùng portal cứu hộ tối giản thay cho portal đầy đủ.");
for(const stylesheet of ["student-fresh.css","student-premium-dashboard.css"]){
  if(portalSource.includes(stylesheet)||html.includes(stylesheet))throw new Error(`Build cổng học viên vẫn còn lớp giao diện mới: ${stylesheet}`);
}
if(!portalSource.includes('href="/student.css"'))throw new Error("Mã nguồn cổng học viên thiếu giao diện gốc từ commit 6d64ac7.");
if(!html.includes('/mobile-viewport-lock.css?v=3'))throw new Error("Build cổng học viên thiếu lớp ổn định giao diện mobile.");
if(!html.includes('/student-core-recovery.js?v=20260818-1'))throw new Error("Build cổng học viên thiếu lớp khôi phục hồ sơ XHR độc lập.");
for(const earlyAsset of ["pwa-install","mobile-dashboard","site-enhancements","ai-chat"]){
  if(scriptAssets.some(asset=>new RegExp(`/assets/${earlyAsset}-[^\\\"]+\\.js`).test(asset)))throw new Error(`HTML cổng học viên vẫn thực thi ${earlyAsset} trước core.`);
}

console.log("Build cổng học viên hợp lệ: post-boot guard nằm trong core entry; module phụ chỉ có thể preload, không thực thi trước DATA.");
