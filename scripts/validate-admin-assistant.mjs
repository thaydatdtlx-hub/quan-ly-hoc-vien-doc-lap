import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const [adminHtml,studentHtml,app,assistant,styles,genericChat,worker]=await Promise.all([
  readFile(new URL("index.html",root),"utf8"),
  readFile(new URL("hoc-vien.html",root),"utf8"),
  readFile(new URL("app.js",root),"utf8"),
  readFile(new URL("admin-assistant.js",root),"utf8"),
  readFile(new URL("admin-assistant.css",root),"utf8"),
  readFile(new URL("ai-chat.js",root),"utf8"),
  readFile(new URL("public/sw.js",root),"utf8")
]);

if(!adminHtml.includes("/admin-assistant.js"))throw new Error("Trang Admin chưa nạp Trợ lý Admin.");
if(studentHtml.includes("admin-assistant"))throw new Error("Trợ lý Admin không được xuất hiện trong Cổng học viên.");
for(const token of ["__THAY_DAT_ADMIN_ASSISTANT_CONTEXT__","__THAY_DAT_ADMIN_ASSISTANT_ACTION__","me?.role!==\"admin\"","publishAdminAssistantContext","theoryProgress","attendanceRecords","earlyWarnings"]){
  if(!app.includes(token))throw new Error(`Ngữ cảnh Admin thiếu: ${token}`);
}
for(const token of ["Tổng quan hôm nay","Ai còn nợ học phí?","Học viên cần cảnh báo","Ai chưa học 600 câu?","studentScore","studentDetail","globalAction","thaydat:admin-context",".ai-chat-launcher,.ai-chat-panel"]){
  if(!assistant.includes(token))throw new Error(`Trợ lý Admin thiếu chức năng: ${token}`);
}
for(const token of ["admin-assistant-launcher","admin-assistant-panel","safe-area-inset-bottom","min-height:44px"]){
  if(!styles.includes(token))throw new Error(`Giao diện Trợ lý Admin thiếu: ${token}`);
}
if(!genericChat.includes("managerAuth"))throw new Error("Trợ lý chung chưa được tách khỏi phiên quản trị.");
if(!worker.includes('thay-dat-pwa-v8'))throw new Error("PWA chưa làm mới bộ nhớ đệm cho Trợ lý Admin.");

console.log("Trợ lý Admin hợp lệ: chỉ dành cho Admin, tra cứu học viên, học phí, 600 câu, điểm danh, lịch và cảnh báo; mở đúng chức năng liên quan.");
