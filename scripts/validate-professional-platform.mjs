import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const professional=read("platform-professional.js");
const styles=read("platform-professional.css");
const pwa=read("pwa-install.js");
const serviceWorker=read("public/sw.js");
const publicPage=read("dang-ky-hoc-lai-xe.html");
const studentPage=read("hoc-vien.html");
const adminPage=read("index.html");

for(const required of [
  'import "./platform-professional.css"',
  'function makeSidebar(kind)',
  'professional-student-shell',
  'professional-admin-shell',
  'function configureMobileNavigation()',
  'function mountPublicTrust()',
  'function mountRuntimeGuard()',
  'HỌC LÁI XE CÙNG ĐẠT'
])if(!professional.includes(required))throw new Error(`Nâng cấp chuyên nghiệp thiếu: ${required}`);

if(professional.includes('observer.observe(document.body,{subtree:true'))throw new Error("Không được theo dõi toàn bộ DOM bằng MutationObserver.");
if((professional.match(/new MutationObserver/g)||[]).length>1)throw new Error("Nâng cấp chuyên nghiệp chỉ được dùng tối đa một MutationObserver giới hạn.");

for(const required of [
  ".professional-sidebar",
  ".professional-command-center",
  ".professional-trust-strip",
  ".professional-trust-evidence",
  ".professional-login-trust",
  ".professional-runtime-guard",
  "@media(max-width:760px)",
  ".mobile-page-tabs{display:none!important}"
])if(!styles.includes(required))throw new Error(`CSS chuyên nghiệp thiếu: ${required}`);

for(const required of [
  'import("./platform-professional.js?v=20260825-1")',
  'hoclaixecungdat_sw_refresh_v49',
  'HỌC LÁI XE CÙNG ĐẠT'
])if(!pwa.includes(required))throw new Error(`PWA chưa tích hợp nâng cấp: ${required}`);
if(pwa.includes('import("./brand-wording-cleanup.js")'))throw new Error("PWA vẫn tải trình theo dõi thương hiệu toàn DOM cũ.");

for(const required of [
  'hoclaixecungdat-pwa-v49',
  '/platform-professional.js',
  '/platform-professional.css',
  'SKIP_WAITING'
])if(!serviceWorker.includes(required))throw new Error(`Service worker thiếu: ${required}`);

if(!publicPage.includes('/pwa-install.js'))throw new Error("Trang tuyển sinh chưa tải mô-đun nâng cấp.");
if(!studentPage.includes('/pwa-install.js'))throw new Error("Cổng học viên chưa tải mô-đun nâng cấp.");
if(!adminPage.includes('/pwa-install.js'))throw new Error("Trang quản trị chưa tải mô-đun nâng cấp.");

console.log("Nâng cấp chuyên nghiệp hợp lệ: ổn định mã nguồn, thương hiệu thống nhất, sidebar desktop, mobile tinh gọn và tín hiệu tin cậy tuyển sinh.");
