import {readFile} from "node:fs/promises";

const [sql,scheduleSql,adminJs,studentJs,adminHtml,studentHtml]=await Promise.all([
  readFile(new URL("../CAP-NHAT-TRUNG-TAM-THONG-BAO-BUOC-11.sql",import.meta.url),"utf8"),
  readFile(new URL("../CAP-NHAT-NHAC-LICH-TU-DONG.sql",import.meta.url),"utf8"),
  readFile(new URL("../app.js",import.meta.url),"utf8"),
  readFile(new URL("../student.js",import.meta.url),"utf8"),
  readFile(new URL("../index.html",import.meta.url),"utf8"),
  readFile(new URL("../hoc-vien.html",import.meta.url),"utf8")
]);

const requiredSql=[
  "app_training_hour_targets","app_generate_all_notifications","app_attendance_notification_trigger",
  "app_exam_attempt_notification_trigger","app_student_status_change_notification_trigger",
  "app_list_training_hour_targets","app_save_training_hour_targets","hv-auto-notification-center",
  "category text not null"
];
for(const token of requiredSql)if(!sql.includes(token))throw new Error(`SQL thông báo thiếu: ${token}`);
for(const token of ["interval '23 hours'","interval '25 hours'","app_training_request_notification_trigger","app_training_session_notification_trigger"]){
  if(!scheduleSql.includes(token))throw new Error(`SQL nhắc lịch thiếu: ${token}`);
}
for(const category of ["schedule","attendance","training","theory","finance","profile"]){
  if(!sql.includes(`'${category}'`))throw new Error(`SQL thiếu nhóm thông báo ${category}.`);
  if(!adminHtml.includes(`data-notification-filter="${category}"`))throw new Error(`Admin thiếu bộ lọc ${category}.`);
  if(!studentHtml.includes(`data-student-notification-filter="${category}"`))throw new Error(`Học viên thiếu bộ lọc ${category}.`);
}
for(const token of ["notificationSettingsForm","data-hour-target","app_save_training_hour_targets","notificationCategory"]){
  if(!`${adminHtml}\n${adminJs}`.includes(token))throw new Error(`Giao diện Admin thiếu: ${token}`);
}
for(const token of ["studentNotificationSearch","studentNotificationFilter","app_mark_notifications_read"]){
  if(!`${studentHtml}\n${studentJs}`.includes(token))throw new Error(`Giao diện học viên thiếu: ${token}`);
}
console.log("Trung tâm thông báo hợp lệ: lịch 24 giờ, duyệt/đổi ca, học phí, hồ sơ, thi, điểm danh và giờ còn thiếu.");
