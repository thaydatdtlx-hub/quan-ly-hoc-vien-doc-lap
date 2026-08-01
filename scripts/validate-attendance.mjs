import {readFileSync} from "node:fs";
import {attendanceSummary,attendanceTypeLabel,buildAdminReport,calculateAttendanceMinutes,formatAttendanceDuration} from "../attendance-utils.js";

if(calculateAttendanceMinutes("08:00","10:30")!==150)throw new Error("Sai phép tính giờ học.");
if(calculateAttendanceMinutes("10:30","08:00")!==0)throw new Error("Không chặn giờ kết thúc trước giờ bắt đầu.");
if(formatAttendanceDuration(150)!=="2 giờ 30 phút")throw new Error("Sai định dạng thời lượng.");
if(attendanceTypeLabel("dat_practice")!=="Thực hành DAT")throw new Error("Sai nhãn nội dung đào tạo.");
const records=[{student_id:"1",status:"present",actual_minutes:120},{student_id:"1",status:"absent",actual_minutes:0},{student_id:"1",status:"excused",actual_minutes:0}];
const summary=attendanceSummary(records);
if(summary.sessions!==3||summary.present!==1||summary.absent!==1||summary.excused!==1||summary.actualMinutes!==120||summary.rate!==33)throw new Error("Sai tổng hợp điểm danh.");
const report=buildAdminReport([{id:"1",name:"Nguyễn Văn An",tuition_total:10_000_000,paid:4_000_000}],records,[{student_id:"1",answered_count:120,exam_count:2}])[0];
if(report.actualMinutes!==120||report.debt!==6_000_000||report.theory_answered!==120)throw new Error("Sai báo cáo Admin.");
const sql=readFileSync(new URL("../CAP-NHAT-DIEM-DANH-BAO-CAO.sql",import.meta.url),"utf8");
for(const required of ["app_attendance_records","app_save_attendance_record","app_student_list_attendance","app_admin_attendance_report","enable row level security"])if(!sql.toLowerCase().includes(required))throw new Error(`SQL thiếu ${required}`);
console.log("Điểm danh hợp lệ: giờ thực học, trạng thái chuyên cần và báo cáo Admin.");
