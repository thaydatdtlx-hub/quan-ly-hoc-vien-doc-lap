import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const professional=read("platform-professional.js");
const styles=read("platform-professional.css");
const coccocSidebar=read("coccoc-sidebar.js");
const coccocSidebarStyles=read("coccoc-sidebar.css");
const adminHome=read("admin-home-logo-link.js");
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
  'import "./coccoc-sidebar.css"',
  'hoclaixecungdat_admin_sidebar_state_v1',
  'coccoc-sidebar-expanded',
  'coccoc-sidebar-collapsed',
  'function bindSidebar(sidebar)',
  'appObserver.observe(app,{childList:true})',
  'coccoc-sidebar-tooltip'
])if(!coccocSidebar.includes(required))throw new Error(`Thanh bên kiểu Cốc Cốc thiếu: ${required}`);
if(coccocSidebar.includes('observe(document.documentElement')||coccocSidebar.includes('observe(document.body'))throw new Error("Thanh bên không được theo dõi toàn bộ trang.");

for(const required of [
  '--coccoc-sidebar-collapsed-width:74px',
  '--coccoc-sidebar-expanded-width:248px',
  'width:calc(100% - var(--coccoc-sidebar-current-width))!important',
  'margin-left:var(--coccoc-sidebar-current-width)!important',
  '.coccoc-sidebar.coccoc-is-collapsed .professional-nav-item',
  '.coccoc-sidebar-toggle',
  '.coccoc-sidebar-tooltip'
])if(!coccocSidebarStyles.includes(required))throw new Error(`CSS thanh bên kiểu Cốc Cốc thiếu: ${required}`);

if(!adminHome.includes('import "./coccoc-sidebar.js"'))throw new Error("Trang quản trị chưa tải thanh bên kiểu Cốc Cốc.");
if(adminHome.includes('observe(document.documentElement'))throw new Error("Liên kết logo quản trị vẫn theo dõi toàn bộ DOM.");

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

console.log("Nâng cấp chuyên nghiệp hợp lệ: thanh bên quản trị thu gọn kiểu Cốc Cốc, không che nội dung và vẫn giữ các lớp ổn định hiện có.");
