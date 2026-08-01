import {readFile} from "node:fs/promises";
import {calculateDrivingRefreshCost,DRIVING_REFRESH_RATES,SA_HINH_REFRESH_RATES,SA_HINH_TRACK_RATE_PER_HOUR,WEEKEND_SURCHARGE_PER_HOUR,REFRESH_SERVICE_TYPES} from "../driving-refresh-pricing.js";

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

for(const token of ["refreshForm","refreshServiceType","refreshFullName","refreshPhone","refreshLicenseStatus","refreshTransmission","refreshDurationHours","refreshPricing","refreshEstimatedTotal","refreshSuccessTotal","name=\"goals\"","name=\"sa_hinh_lessons\"","refreshSaHinhLessons","refreshPreferredDate","refreshConsent","refreshSuccess","driving-refresh.js"]){
  if(!page.includes(token))throw new Error(`Trang đăng ký thiếu: ${token}`);
}
for(const token of ["/bo-tuc-tay-lai.html","drivingRefreshAdminBtn","drivingRefreshAdminDialog","driving-refresh-admin.js"]){
  if(!home.includes(token))throw new Error(`Website chính chưa liên kết tính năng: ${token}`);
}
if(home.includes('class="intro-study-cta"'))throw new Error("Khu vực giới thiệu vẫn còn nút Học lý thuyết 600 câu.");
if(home.includes('class="login-refresh-link"'))throw new Error("Khung đăng nhập vẫn còn nút Đăng ký bổ túc tay lái.");
for(const token of ["width:min(620px,100%)","min-height:88px",".intro-refresh-cta strong{font-size:18px"]){
  if(!styles.includes(token))throw new Error(`Nút bổ túc nổi bật thiếu: ${token}`);
}
for(const token of ["app_create_driving_refresh_registration","calculateDrivingRefreshCost","currentPricing","service_type","training_package","vehicle_hourly_rate","track_hourly_rate","duration_hours","estimated_total","refreshSuccessCode","refreshWebsite","consent:true"]){
  if(!script.includes(token))throw new Error(`Luồng gửi đăng ký thiếu: ${token}`);
}
for(const token of ["app_admin_list_driving_refresh_registrations","app_admin_update_driving_refresh_registration","service_type","training_package","track_hourly_rate","estimated_total","weekend_surcharge_per_hour","statusLabels","data-refresh-save","managerToken"]){
  if(!admin.includes(token))throw new Error(`Quản lý Admin thiếu: ${token}`);
}
for(const token of ["refresh-hero","refresh-registration","refresh-admin-dialog","@media(max-width:720px)"]){
  if(!styles.includes(token))throw new Error(`Giao diện bổ túc tay lái thiếu: ${token}`);
}
for(const token of ["refresh-topline","refresh-hero-panel","refresh-proof","refresh-audience","refresh-form-steps","refresh-pricing","refresh-pricing-total","refresh-mobile-cta","@media(max-width:780px)"]){
  if(!page.includes(token)&&!stylesV2.includes(token))throw new Error(`Giao diện V2 thiếu: ${token}`);
}
for(const token of ["refreshHeroPricing","refreshHeroTotal","data-hero-service","data-hero-transmission","data-hero-hours","data-hero-weekend","Modern Racing Dashboard"]){
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
if(!page.includes("/driving-refresh-v2.css?v=9"))throw new Error("Trang bổ túc chưa nạp đúng phiên bản giao diện V2 mới nhất.");
for(const token of ["@media(max-width:1100px)","grid-auto-rows:max-content","align-content:start","padding:35px 12px 104px","env(safe-area-inset-top)","display:flex;min-height:0;flex-direction:column;align-items:stretch","grid-column:auto;grid-row:auto"]){
  if(!stylesV2.includes(token))throw new Error(`Giao diện tính chi phí trên điện thoại thiếu: ${token}`);
}
for(const token of ["driving_refresh_registrations","enable row level security","service_type","training_package","vehicle_hourly_rate","track_hourly_rate","duration_hours","base_hourly_rate","weekend_surcharge_per_hour","estimated_total","300000","290000","250000","200000","100000","50000","app_create_driving_refresh_registration","app_admin_list_driving_refresh_registrations","app_admin_update_driving_refresh_registration","v_me->>'role', '') <> 'admin'","notify pgrst"]){
  if(!sql.includes(token))throw new Error(`Cơ sở dữ liệu bổ túc tay lái thiếu: ${token}`);
}
if(!vite.includes('drivingRefresh:resolve(__dirname,"bo-tuc-tay-lai.html")'))throw new Error("Vite chưa xuất bản trang bổ túc tay lái.");
for(const token of ['thay-dat-pwa-v18','"/bo-tuc-tay-lai.html"'])if(!worker.includes(token))throw new Error(`PWA thiếu: ${token}`);

if(DRIVING_REFRESH_RATES["Số tự động"]!==300000||DRIVING_REFRESH_RATES["Số sàn"]!==290000||WEEKEND_SURCHARGE_PER_HOUR!==50000)throw new Error("Bảng đơn giá bổ túc tay lái chưa đúng.");
if(SA_HINH_REFRESH_RATES["Số tự động"]!==250000||SA_HINH_REFRESH_RATES["Số sàn"]!==200000||SA_HINH_TRACK_RATE_PER_HOUR!==100000)throw new Error("Bảng đơn giá bổ túc sa hình chưa đúng.");
const pricingCases=[
  [{transmission:"Số tự động",durationHours:2,preferredDate:"2026-08-03"},600000],
  [{transmission:"Số tự động",durationHours:4,preferredDate:"2026-08-02"},1400000],
  [{transmission:"Số sàn",durationHours:6,preferredDate:"2026-08-03"},1740000],
  [{transmission:"Số sàn",durationHours:10,preferredDate:"2026-08-01"},3400000],
  [{transmission:"Số tự động",durationHours:2,preferredTime:"Cuối tuần"},700000],
  [{serviceType:REFRESH_SERVICE_TYPES.SA_HINH,transmission:"Số tự động",durationHours:2,preferredDate:"2026-08-03"},700000],
  [{serviceType:REFRESH_SERVICE_TYPES.SA_HINH,transmission:"Số sàn",durationHours:2,preferredTime:"Cuối tuần"},700000],
  [{serviceType:REFRESH_SERVICE_TYPES.SA_HINH,transmission:"Số tự động",durationHours:4,preferredTime:"Cuối tuần"},1600000]
];
for(const [input,expected] of pricingCases){
  const result=calculateDrivingRefreshCost(input);
  if(result.estimatedTotal!==expected)throw new Error(`Tính sai chi phí ${JSON.stringify(input)}: ${result.estimatedTotal} thay vì ${expected}.`);
}

console.log("Đăng ký bổ túc tay lái và sa hình hợp lệ: tính giá, bài tập, biểu mẫu Supabase, quản lý Admin và giao diện điện thoại.");
