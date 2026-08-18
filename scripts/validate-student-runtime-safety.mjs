import {readFile} from "node:fs/promises";

const [recoverySource,scheduleSource,studentSource]=await Promise.all([
  readFile(new URL("../public/student-core-recovery.js",import.meta.url),"utf8"),
  readFile(new URL("../schedule-data.js",import.meta.url),"utf8"),
  readFile(new URL("../student.js",import.meta.url),"utf8")
]);

for(const token of [
  "renderEssential","renderFinance","renderProgress","renderProfile",
  "tuitionTotal","tuitionPaid","tuitionDebt","studentProgress","studentProfile",
  "student-functions-ready","coreLooksComplete"
]){
  if(!recoverySource.includes(token))throw new Error(`Core recovery thiếu chốt runtime: ${token}`);
}

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

console.log("Student runtime safety hợp lệ: recovery render đầy đủ và schedule-data không còn khởi động observer trước boot.");
