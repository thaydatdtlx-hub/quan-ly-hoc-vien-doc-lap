import {readFile} from "node:fs/promises";

const [recoverySource,scheduleSource,studentSource,postbootSource,viteSource]=await Promise.all([
  readFile(new URL("../public/student-core-recovery.js",import.meta.url),"utf8"),
  readFile(new URL("../schedule-data.js",import.meta.url),"utf8"),
  readFile(new URL("../student.js",import.meta.url),"utf8"),
  readFile(new URL("../student-postboot.js",import.meta.url),"utf8"),
  readFile(new URL("../vite.config.js",import.meta.url),"utf8")
]);

for(const token of [
  "renderEssential","renderFinance","renderProgress","renderProfile",
  "tuitionTotal","tuitionPaid","tuitionDebt","tuitionStatus","studentProgress","studentProfile",
  "student-functions-ready","coreLooksComplete"
]){
  if(!recoverySource.includes(token))throw new Error(`Core recovery thiếu chốt runtime: ${token}`);
}
if(recoverySource.includes('text("tuitionTotal")!=="0 ₫"'))throw new Error("Core recovery vẫn coi học phí 0 ₫ là render lỗi.");

for(const forbidden of [
  'import("./student-portal-visibility-recovery.js',
  'import("./student-debt-alert.js'
]){
  if(scheduleSource.includes(forbidden))throw new Error(`schedule-data.js vẫn khởi động side-effect quá sớm: ${forbidden}`);
}

for(const token of [
  'Promise.allSettled([',
  'normalizeCoreRpcPayload',
  'data-student-functions',
  'student-functions-ready'
]){
  if(!studentSource.includes(token))throw new Error(`student.js thiếu chốt boot: ${token}`);
}

for(const token of [
  "fullPortalRendered","coreRendered","render-error","__retryStudentCoreProfile",
  "student-functions-ready","core-xhr-full","data-student-postboot",
  'import(module)'
]){
  if(!postbootSource.includes(token))throw new Error(`student-postboot.js thiếu guard: ${token}`);
}
for(const moduleName of ["site-enhancements.js","pwa-install.js","push-notifications.js","mobile-dashboard.js","ai-chat.js"]){
  if(!postbootSource.includes(`\"./${moduleName}\"`))throw new Error(`Post-boot loader thiếu module ${moduleName}.`);
}

if(viteSource.includes('student-mobile-recovery.js?v=20260817-1'))throw new Error("Vite vẫn inject student-mobile-recovery trước core.");
if(viteSource.includes('ai-chat.js?v=20260816-3'))throw new Error("Vite vẫn inject AI chat trước core.");
if(!viteSource.includes('student-postboot.js?v=20260818-1'))throw new Error("Vite chưa inject post-boot guard.");

console.log("Student runtime safety hợp lệ: core-first, zero-tuition hợp lệ và module phụ chỉ chạy sau guard DOM.");
