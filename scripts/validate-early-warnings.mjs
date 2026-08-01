import {buildEarlyWarnings,earlyWarningSummary,EARLY_WARNING_RULES} from "../early-warning-utils.js";
import {embedScheduleInNotes} from "../schedule-data.js";

const student={id:"s1",name:"Nguyễn Văn An",student_code:"HV-001",tuition_total:20_000_000,paid:5_000_000,profile_status:"Thiếu hồ sơ",cabin_status:"Đã hoàn thành",dat_status:"Chưa thực hiện",notes:embedScheduleInNotes("",{version:1,dates:{exam:"2026-08-05"},locations:{}})};
const attendance=[
  {student_id:"s1",status:"present",session_type:"theory",actual_minutes:120},
  {student_id:"s1",status:"absent",session_type:"practice",actual_minutes:0},
  {student_id:"s1",status:"absent",session_type:"practice",actual_minutes:0}
];
const theory=[{student_id:"s1",answered_count:200,correct_count:110,exam_count:3,passed_exam_count:0,best_score:20,best_total:30,last_activity:"2026-07-01T00:00:00Z"}];
const warnings=buildEarlyWarnings({students:[student],attendanceRecords:attendance,theoryProgress:theory,now:new Date("2026-08-01T00:00:00+07:00")});
const types=new Set(warnings.map(item=>item.type)),summary=earlyWarningSummary(warnings);
for(const type of ["attendance","theory","finance","profile","schedule","training"])if(!types.has(type))throw new Error(`Thiếu cảnh báo ${type}.`);
if(summary.students!==1||summary.total!==6||summary.high<3)throw new Error("Sai tổng hợp cảnh báo sớm.");
if(EARLY_WARNING_RULES.attendanceRate!==80)throw new Error("Sai ngưỡng chuyên cần.");
if(warnings.some((item,index)=>index&&item.severity==="critical"&&warnings[index-1].severity!=="critical"))throw new Error("Cảnh báo chưa được sắp xếp theo ưu tiên.");
console.log("Cảnh báo sớm hợp lệ: chuyên cần, lý thuyết, học phí, hồ sơ và giờ đào tạo.");
