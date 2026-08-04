import "./student-profile-self-service.js";
import "./admin-student-profile-change.js";
import "./new-student-admin.js";

let adminProfileModulesPromise=null;
let adminProfileObserver=null;

function adminSessionReady(){
  const app=document.getElementById("app");
  const account=document.querySelector(".topbar .account");
  const name=document.getElementById("accountName");
  const signedIn=app&&!app.classList.contains("hidden");
  const isAdmin=/\badmin\b/i.test(name?.textContent||"");
  return Boolean(signedIn&&account&&name&&isAdmin);
}

function ensureAdminProfileModules(){
  if(document.getElementById("adminProfileSummary")){
    adminProfileObserver?.disconnect();
    adminProfileObserver=null;
    return;
  }
  if(!adminSessionReady()||adminProfileModulesPromise)return;

  adminProfileModulesPromise=Promise.all([
    import("./admin-profile.js?v=3"),
    import("./admin-profile-mobile.js?v=2")
  ]).catch(error=>{
    console.error("Không thể nạp giao diện tài khoản Admin",error);
    adminProfileModulesPromise=null;
  });
}

function watchAdminProfile(){
  ensureAdminProfileModules();
  if(adminProfileObserver)return;
  const root=document.getElementById("app")||document.body;
  adminProfileObserver=new MutationObserver(()=>ensureAdminProfileModules());
  adminProfileObserver.observe(root,{
    subtree:true,
    childList:true,
    characterData:true,
    attributes:true,
    attributeFilter:["class"]
  });
  window.addEventListener("pageshow",ensureAdminProfileModules);
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible")ensureAdminProfileModules();
  });
}

function ensureStyleLink(href,dataAttribute){
  if(document.querySelector(`link[${dataAttribute}]`)||document.querySelector(`link[href="${href}"]`))return;
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href=href;
  link.setAttribute(dataAttribute,"true");
  document.head.append(link);
}

function ensureAdminLayoutStyles(){
  ensureStyleLink("/admin-profile.css?v=3","data-admin-profile-base");
  ensureStyleLink("/admin-desktop-layout.css?v=3","data-admin-desktop-layout");
  ensureStyleLink("/admin-account-size-fix.css?v=1","data-admin-account-size-fix");
  ensureStyleLink("/admin-toolbar-colorful.css?v=1","data-admin-toolbar-colorful");
}

function ensureMobileViewportStyles(){
  ensureStyleLink("/mobile-viewport-lock.css?v=2","data-mobile-viewport-lock");
}

ensureAdminLayoutStyles();
ensureMobileViewportStyles();
watchAdminProfile();

const statusHosts=[
  ".login-card",
  ".topbar .account",
  ".student-account",
  ".topbar-actions",
  ".quiz-topbar nav"
];

function ensureLiveRegions(){
  document.querySelectorAll('[role="status"]').forEach(node=>{
    node.setAttribute("aria-live","polite");
    node.setAttribute("aria-atomic","true");
  });
  document.querySelectorAll(".loading,.student-loading").forEach(node=>{
    node.setAttribute("role","status");
    node.setAttribute("aria-live","polite");
    node.setAttribute("aria-atomic","true");
  });
}

function addConnectionStatus(){
  if(document.querySelector(".system-status"))return;
  const hosts=statusHosts.map(selector=>document.querySelector(selector)).filter(Boolean);
  if(!hosts.length)return;

  const statuses=hosts.map(host=>{
    const status=document.createElement("span");
    status.className="system-status";
    status.setAttribute("role","status");
    status.setAttribute("aria-live","polite");
    host.prepend(status);
    return status;
  });

  const update=()=>{
    const online=navigator.onLine;
    statuses.forEach(status=>{
      status.dataset.state=online?"online":"offline";
      status.textContent=online?"Hệ thống trực tuyến":"Đang ngoại tuyến";
    });
    document.body.classList.toggle("is-offline",!online);
  };

  update();
  window.addEventListener("online",update);
  window.addEventListener("offline",update);
}

function polishExternalLinks(){
  document.querySelectorAll('a[target="_blank"]').forEach(link=>{
    const tokens=new Set((link.getAttribute("rel")||"").split(/\s+/).filter(Boolean));
    tokens.add("noopener");
    tokens.add("noreferrer");
    link.setAttribute("rel",[...tokens].join(" "));
  });
}

function labelDialogCloseButtons(){
  document.querySelectorAll("dialog button.close,dialog .dialog-close").forEach(button=>{
    if(!button.getAttribute("aria-label")&&button.textContent.trim()==="×"){
      button.setAttribute("aria-label","Đóng hộp thoại");
    }
  });
}

function bootEnhancements(){
  ensureAdminLayoutStyles();
  ensureMobileViewportStyles();
  watchAdminProfile();
  ensureLiveRegions();
  addConnectionStatus();
  polishExternalLinks();
  labelDialogCloseButtons();
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootEnhancements,{once:true});
else bootEnhancements();