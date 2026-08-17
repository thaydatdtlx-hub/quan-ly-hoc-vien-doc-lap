import {readFile} from "node:fs/promises";

const dist=new URL("../dist/",import.meta.url);
const html=await readFile(new URL("hoc-vien.html",dist),"utf8");
const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map(match=>match[1]);
if(!assets.length)throw new Error("Build cổng học viên không có JavaScript bundle.");

const source=(await Promise.all([...new Set(assets)].map(asset=>readFile(new URL(`.${asset}`,dist),"utf8")))).join("\n");
for(const token of [
  "/api/student-rpc",
  "app_list_training_requests",
  "app_student_create_training_request_slot",
  "app_mark_notifications_read",
  "app_student_change_password",
  "student-profile-ready",
  "student_mobile_recovery_20260816_v2"
]){
  if(!source.includes(token))throw new Error(`Bundle cổng học viên thiếu chức năng đầy đủ: ${token}`);
}
if(html.includes("student_rescue_cleanup_20260816")||source.includes("Đổi mật khẩu đang được tạm tắt"))throw new Error("Build vẫn đang dùng portal cứu hộ tối giản thay cho portal đầy đủ.");

console.log("Build cổng học viên hợp lệ: đầy đủ lịch, thông báo, đổi mật khẩu, RPC cùng domain và recovery mobile.");
