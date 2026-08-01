import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const [page,home,script,admin,styles,sql,vite,worker]=await Promise.all([
  readFile(new URL("bo-tuc-tay-lai.html",root),"utf8"),
  readFile(new URL("index.html",root),"utf8"),
  readFile(new URL("driving-refresh.js",root),"utf8"),
  readFile(new URL("driving-refresh-admin.js",root),"utf8"),
  readFile(new URL("driving-refresh.css",root),"utf8"),
  readFile(new URL("CAP-NHAT-DANG-KY-BO-TUC-TAY-LAI.sql",root),"utf8"),
  readFile(new URL("vite.config.js",root),"utf8"),
  readFile(new URL("public/sw.js",root),"utf8")
]);

for(const token of ["refreshForm","refreshFullName","refreshPhone","refreshLicenseStatus","refreshTransmission","name=\"goals\"","refreshPreferredDate","refreshConsent","refreshSuccess","driving-refresh.js"]){
  if(!page.includes(token))throw new Error(`Trang đăng ký thiếu: ${token}`);
}
for(const token of ["/bo-tuc-tay-lai.html","drivingRefreshAdminBtn","drivingRefreshAdminDialog","driving-refresh-admin.js"]){
  if(!home.includes(token))throw new Error(`Website chính chưa liên kết tính năng: ${token}`);
}
for(const token of ["app_create_driving_refresh_registration","selectedGoals","refreshSuccessCode","refreshWebsite","consent:true"]){
  if(!script.includes(token))throw new Error(`Luồng gửi đăng ký thiếu: ${token}`);
}
for(const token of ["app_admin_list_driving_refresh_registrations","app_admin_update_driving_refresh_registration","statusLabels","data-refresh-save","managerToken"]){
  if(!admin.includes(token))throw new Error(`Quản lý Admin thiếu: ${token}`);
}
for(const token of ["refresh-hero","refresh-registration","refresh-admin-dialog","@media(max-width:720px)"]){
  if(!styles.includes(token))throw new Error(`Giao diện bổ túc tay lái thiếu: ${token}`);
}
for(const token of ["driving_refresh_registrations","enable row level security","app_create_driving_refresh_registration","app_admin_list_driving_refresh_registrations","app_admin_update_driving_refresh_registration","v_me->>'role', '') <> 'admin'","notify pgrst"]){
  if(!sql.includes(token))throw new Error(`Cơ sở dữ liệu bổ túc tay lái thiếu: ${token}`);
}
if(!vite.includes('drivingRefresh:resolve(__dirname,"bo-tuc-tay-lai.html")'))throw new Error("Vite chưa xuất bản trang bổ túc tay lái.");
for(const token of ['thay-dat-pwa-v6','"/bo-tuc-tay-lai.html"'])if(!worker.includes(token))throw new Error(`PWA thiếu: ${token}`);

console.log("Đăng ký bổ túc tay lái hợp lệ: trang công khai, biểu mẫu Supabase, chống spam, quản lý trạng thái Admin và giao diện điện thoại.");

