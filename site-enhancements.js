import "./login-isolated-v20.js?v=7";

if(location.pathname==="/600-cau-hoi.html"){
  import("./theory-account-identity.js?v=1").catch(error=>console.warn("[site-enhancements] Không thể tải thông tin tài khoản lý thuyết.",error));
}

let baseModulesPromise=null;
function loadBaseModules(){
  if(baseModulesPromise)return baseModulesPromise;
  baseModulesPromise=Promise.all([
    import("./brand-name.js"),
    import("./student-profile-self-service.js"),
    import("./admin-student-profile-change.js"),
    import("./new-student-practice-link.js"),
    import("./student-training-actions.js"),
    import("./schedule-stat-links.js"),
    import("./student-payment-navigation.js")
  ]).catch(error=>{console.warn("[site-enhancements] Không thể tải module phụ.",error);baseModulesPromise=null});
  return baseModulesPromise;
}
function studentFunctionsReady(){const state=document.documentElement.getAttribute("data-student-functions");return state==="ready"||state==="partial"}
function afterStudentPaint(callback){requestAnimationFrame(()=>requestAnimationFrame(callback))}
function loadBaseModulesWhenSafe(){if(location.pathname!=="/hoc-vien.html"){void loadBaseModules();return}if(studentFunctionsReady()){afterStudentPaint(()=>void loadBaseModules());return}window.addEventListener("student-functions-ready",()=>afterStudentPaint(()=>void loadBaseModules()),{once:true})}
loadBaseModulesWhenSafe();

let adminProfileModulesPromise=null;let adminProfileObserver=null;
function adminSessionReady(){const app=document.getElementById("app");const account=document.querySelector(".topbar .account");const name=document.getElementById("accountName");return Boolean(app&&!app.classList.contains("hidden")&&account&&name&&/\badmin\b/i.test(name?.textContent||""))}
function ensureAdminProfileModules(){if(document.getElementById("adminProfileSummary")){adminProfileObserver?.disconnect();adminProfileObserver=null;return}if(!adminSessionReady()||adminProfileModulesPromise)return;adminProfileModulesPromise=Promise.all([import("./admin-profile.js?v=3"),import("./admin-profile-mobile.js?v=2"),import("./new-student-admin.js?v=2")]).catch(error=>{console.error("Không thể nạp giao diện tài khoản Admin",error);adminProfileModulesPromise=null})}
function watchAdminProfile(){ensureAdminProfileModules();if(adminProfileObserver)return;const root=document.getElementById("app")||document.body;adminProfileObserver=new MutationObserver(()=>ensureAdminProfileModules());adminProfileObserver.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});window.addEventListener("pageshow",ensureAdminProfileModules);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")ensureAdminProfileModules()})}

function ensureStyleLink(href,dataAttribute){if(document.querySelector(`link[${dataAttribute}]`)||document.querySelector(`link[href="${href}"]`))return;const link=document.createElement("link");link.rel="stylesheet";link.href=href;link.setAttribute(dataAttribute,"true");document.head.append(link)}
function ensureAdminLayoutStyles(){if(!document.getElementById("app"))return;ensureStyleLink("/admin-profile.css?v=3","data-admin-profile-base");ensureStyleLink("/admin-desktop-layout.css?v=3","data-admin-desktop-layout");ensureStyleLink("/admin-account-size-fix.css?v=1","data-admin-account-size-fix");ensureStyleLink("/admin-toolbar-colorful.css?v=1","data-admin-toolbar-colorful")}
function ensureMobileViewportStyles(){ensureStyleLink("/mobile-viewport-lock.css?v=3","data-mobile-viewport-lock")}
function ensureLoginIsolatedStyle(){
  if(!document.getElementById("login"))return;
  document.querySelectorAll([
    'link[data-login-reference-v19]','link[href*="login-reference-v19.css"]',
    'link[data-login-approved-v21]','link[href*="login-approved-v21.css"]',
    'link[data-login-cars-hotfix-v22]','link[href*="login-cars-hotfix-v22.css"]',
    'link[data-login-final-v6]','link[href*="login-final-v6.css"]',
    'link[data-login-final-v24]','link[href*="login-final-v24.css"]',
    'link[data-login-final-v25]','link[href*="login-final-v25.css"]',
    'link[data-login-final-v26]','link[href*="login-final-v26.css"]',
    'link[data-login-final-v27]','link[href*="login-final-v27.css"]',
    'link[data-login-final-v28]','link[href*="login-final-v28.css"]'
  ].join(",")).forEach(link=>link.remove());
  ensureStyleLink("/login-isolated-v20.css?v=3","data-login-isolated-v20");
  ensureStyleLink("/login-final-v28.css?v=28-1","data-login-final-v28");
}

const statusHosts=[".topbar .account",".student-account",".topbar-actions",".quiz-topbar nav"];
function ensureLiveRegions(){document.querySelectorAll('[role="status"]').forEach(node=>{node.setAttribute("aria-live","polite");node.setAttribute("aria-atomic","true")});document.querySelectorAll(".loading,.student-loading").forEach(node=>{node.setAttribute("role","status");node.setAttribute("aria-live","polite");node.setAttribute("aria-atomic","true")})}
function addConnectionStatus(){if(document.querySelector(".system-status"))return;const hosts=statusHosts.map(selector=>document.querySelector(selector)).filter(Boolean);if(!hosts.length)return;const statuses=hosts.map(host=>{const status=document.createElement("span");status.className="system-status";status.setAttribute("role","status");status.setAttribute("aria-live","polite");host.prepend(status);return status});const update=()=>{const online=navigator.onLine;statuses.forEach(status=>{status.dataset.state=online?"online":"offline";status.textContent=online?"Hệ thống trực tuyến":"Đang ngoại tuyến"});document.body.classList.toggle("is-offline",!online)};update();window.addEventListener("online",update);window.addEventListener("offline",update)}
function polishExternalLinks(){document.querySelectorAll('a[target="_blank"]').forEach(link=>{const tokens=new Set((link.getAttribute("rel")||"").split(/\s+/).filter(Boolean));tokens.add("noopener");tokens.add("noreferrer");link.setAttribute("rel",[...tokens].join(" "))})}
function labelDialogCloseButtons(){document.querySelectorAll("dialog button.close,dialog .dialog-close").forEach(button=>{if(!button.getAttribute("aria-label")&&button.textContent.trim()==="×")button.setAttribute("aria-label","Đóng hộp thoại")})}
function bootEnhancements(){ensureAdminLayoutStyles();ensureMobileViewportStyles();ensureLoginIsolatedStyle();if(document.getElementById("app"))watchAdminProfile();ensureLiveRegions();addConnectionStatus();polishExternalLinks();labelDialogCloseButtons()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootEnhancements,{once:true});else bootEnhancements();
