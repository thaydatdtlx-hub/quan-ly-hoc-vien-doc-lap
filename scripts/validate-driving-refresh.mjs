import {readFile} from "node:fs/promises";
import {calculateDrivingRefreshCost,DRIVING_REFRESH_RATES,WEEKEND_SURCHARGE_PER_HOUR} from "../driving-refresh-pricing.js";

const root=new URL("../",import.meta.url);
const [page,home,script,admin,styles,stylesV2,sql,vite,worker]=await Promise.all([
  readFile(new URL("bo-tuc-tay-lai.html",root),"utf8"),
  readFile(new URL("index.html",root),"utf8"),
  readFile(new URL("driving-refresh.js",root),"utf8"),
  readFile(new URL("driving-refresh-admin.js",root),"utf8"),
  readFile(new URL("driving-refresh.css",root),"utf8"),
  readFile(new URL("driving-refresh-v2.css",root),"utf8"),
  readFile(new URL("CAP-NHAT-DANG-KY-BO-TUC-TAY-LAI.sql",root),"utf8"),
  readFile(new URL("vite.config.js",root),"utf8"),
  readFile(new URL("public/sw.js",root),"utf8")
]);

for(const token of ["refreshForm","refreshFullName","refreshPhone","refreshLicenseStatus","refreshTransmission","refreshDurationHours","refreshPricing","refreshEstimatedTotal","refreshSuccessTotal","name=\"goals\"","refreshPreferredDate","refreshConsent","refreshSuccess","driving-refresh.js"]){
  if(!page.includes(token))throw new Error(`Trang đăng ký thiếu: ${token}`);
}
for(const token of ["/bo-tuc-tay-lai.html","drivingRefreshAdminBtn","drivingRefreshAdminDialog","driving-refresh-admin.js"]){
  if(!home.includes(token))throw new Error(`Website chính chưa liên kết tính năng: ${token}`);
}
if(home.includes('class="intro-study-cta"'))throw new Error("Khu vực giới thiệu vẫn còn nút Học lý thuyết 600 câu.");
for(const token of ["width:min(620px,100%)","min-height:88px",".intro-refresh-cta strong{font-size:18px"]){
  if(!styles.includes(token))throw new Error(`Nút bổ túc nổi bật thiếu: ${token}`);
}
for(const token of ["app_create_driving_refresh_registration","calculateDrivingRefreshCost","currentPricing","duration_hours","estimated_total","refreshSuccessCode","refreshWebsite","consent:true"]){
  if(!script.includes(token))throw new Error(`Luồng gửi đăng ký thiếu: ${token}`);
}
for(const token of ["app_admin_list_driving_refresh_registrations","app_admin_update_driving_refresh_registration","estimated_total","weekend_surcharge_per_hour","statusLabels","data-refresh-save","managerToken"]){
  if(!admin.includes(token))throw new Error(`Quản lý Admin thiếu: ${token}`);
}
for(const token of ["refresh-hero","refresh-registration","refresh-admin-dialog","@media(max-width:720px)"]){
  if(!styles.includes(token))throw new Error(`Giao diện bổ túc tay lái thiếu: ${token}`);
}
for(const token of ["refresh-topline","refresh-hero-panel","refresh-proof","refresh-audience","refresh-form-steps","refresh-pricing","refresh-pricing-total","refresh-mobile-cta","@media(max-width:780px)"]){
  if(!page.includes(token)&&!stylesV2.includes(token))throw new Error(`Giao diện V2 thiếu: ${token}`);
}
for(const token of ["refreshHeroPricing","refreshHeroTotal","data-hero-transmission","data-hero-hours","data-hero-weekend","Modern Racing Dashboard"]){
  if(!page.includes(token)&&!stylesV2.includes(token))throw new Error(`Giao diện Racing Dashboard thiếu: ${token}`);
}
for(const token of ['data-refresh-view="1"','data-refresh-view="2"','data-refresh-view="3"','data-refresh-step="1"','data-refresh-mobile-next','refresh-pricing-stage','refresh-view-actions']){
  if(!page.includes(token)&&!stylesV2.includes(token))throw new Error(`Luồng ba màn hình thiếu: ${token}`);
}
for(const token of ["stageViews","stageButtons","setStage","stageFromHash","currentStage"]){
  if(!script.includes(token))throw new Error(`Điều hướng ba màn hình thiếu: ${token}`);
}
for(const token of ["Mobile-first refinement","font-size:16px",":has(input:focus","@media(max-width:360px)","line-height:1.02"]){
  if(!stylesV2.includes(token))throw new Error(`Tối ưu giao diện điện thoại thiếu: ${token}`);
}
for(const token of ["heroTransmissionButtons","heroHourPresetButtons","heroWeekendButtons","setHeroHours","refreshHeroHoursMinus","refreshHeroHoursPlus"]){
  if(!script.includes(token))throw new Error(`Tương tác bảng tính đầu trang thiếu: ${token}`);
}
if(!script.includes('@fontsource/be-vietnam-pro/400.css')||!script.includes('@fontsource/be-vietnam-pro/900.css'))throw new Error("Trang bổ túc chưa tải đầy đủ kiểu chữ Be Vietnam Pro.");
if(!stylesV2.includes('--race-font:"Be Vietnam Pro"')||stylesV2.includes('Arial Narrow')||stylesV2.includes('Impact'))throw new Error("Kiểu chữ trang bổ túc chưa được thống nhất.");
if(!page.includes("/driving-refresh-v2.css"))throw new Error("Trang bổ túc chưa nạp giao diện V2.");
for(const token of ["driving_refresh_registrations","enable row level security","duration_hours","base_hourly_rate","weekend_surcharge_per_hour","estimated_total","300000","290000","50000","app_create_driving_refresh_registration","app_admin_list_driving_refresh_registrations","app_admin_update_driving_refresh_registration","v_me->>'role', '') <> 'admin'","notify pgrst"]){
  if(!sql.includes(token))throw new Error(`Cơ sở dữ liệu bổ túc tay lái thiếu: ${token}`);
}
if(!vite.includes('drivingRefresh:resolve(__dirname,"bo-tuc-tay-lai.html")'))throw new Error("Vite chưa xuất bản trang bổ túc tay lái.");
for(const token of ['thay-dat-pwa-v14','"/bo-tuc-tay-lai.html"'])if(!worker.includes(token))throw new Error(`PWA thiếu: ${token}`);

if(DRIVING_REFRESH_RATES["Số tự động"]!==300000||DRIVING_REFRESH_RATES["Số sàn"]!==290000||WEEKEND_SURCHARGE_PER_HOUR!==50000)throw new Error("Bảng đơn giá bổ túc tay lái chưa đúng.");
const pricingCases=[
  [{transmission:"Số tự động",durationHours:2,preferredDate:"2026-08-03"},600000],
  [{transmission:"Số tự động",durationHours:4,preferredDate:"2026-08-02"},1400000],
  [{transmission:"Số sàn",durationHours:6,preferredDate:"2026-08-03"},1740000],
  [{transmission:"Số sàn",durationHours:10,preferredDate:"2026-08-01"},3400000],
  [{transmission:"Số tự động",durationHours:2,preferredTime:"Cuối tuần"},700000]
];
for(const [input,expected] of pricingCases){
  const result=calculateDrivingRefreshCost(input);
  if(result.estimatedTotal!==expected)throw new Error(`Tính sai chi phí ${JSON.stringify(input)}: ${result.estimatedTotal} thay vì ${expected}.`);
}

console.log("Đăng ký bổ túc tay lái hợp lệ: trang công khai, biểu mẫu Supabase, chống spam, quản lý trạng thái Admin và giao diện điện thoại.");
