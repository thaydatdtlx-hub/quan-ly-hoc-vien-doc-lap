import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const protectedRuntimes=[
  "student.js",
  "schedule.js",
  "questions.js"
];

for(const file of protectedRuntimes){
  const source=await readFile(new URL(file,root),"utf8");
  if(/location\.replace\(["']\/["']\)/.test(source))throw new Error(`${file}: vẫn chuyển phiên hết hạn về trang đăng ký.`);
  if(!source.includes("/?login=1"))throw new Error(`${file}: thiếu đường dẫn cổng đăng nhập chính xác.`);
}

const scheduleRuntime=await readFile(new URL("schedule.js",root),"utf8");
const studentRpcProxy=await readFile(new URL("api/student-rpc.js",root),"utf8");
for(const token of ['import {studentRpc}',"scheduleLoadWatchdog","showScheduleLoadError","isAuthenticationError"]){
  if(!scheduleRuntime.includes(token))throw new Error(`Lịch đào tạo thiếu cơ chế chống treo: ${token}`);
}
if(scheduleRuntime.includes("SUPABASE_URL"))throw new Error("Lịch đào tạo vẫn gọi Supabase trực tiếp không qua RPC có timeout.");
for(const fn of ["app_list_students","app_admin_save_student_schedule","app_admin_save_training_session","app_admin_save_training_slot"]){
  if(!studentRpcProxy.includes(`"${fn}"`))throw new Error(`RPC lịch đào tạo chưa cho phép ${fn}.`);
}

const htmlExpectations={
  "404.html":'href="/?login=1">Về trang đăng nhập',
  "600-cau-hoi.html":'href="/?login=1">Đăng nhập',
  "lich-dao-tao.html":'href="/?login=1" aria-label="Về Dashboard"',
  "dang-ky-hoc-lai-xe.html":'href="/?login=1">Hệ thống học viên',
  "bo-tuc-tay-lai.html":'href="/?login=1">Hệ thống học viên'
};

for(const [file,token] of Object.entries(htmlExpectations)){
  const source=await readFile(new URL(file,root),"utf8");
  if(!source.includes(token))throw new Error(`${file}: liên kết đăng nhập vẫn trỏ sai.`);
}

console.log("Điều hướng xác thực hợp lệ: phiên thiếu hoặc hết hạn luôn trở về /?login=1, không rơi sang trang đăng ký.");
