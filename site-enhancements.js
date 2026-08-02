import "./admin-profile.js";
import "./admin-profile-mobile.js";

function ensureMobileViewportStyles(){
  if(document.querySelector('link[data-mobile-viewport-lock]'))return;
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href="/mobile-viewport-lock.css?v=2";
  link.dataset.mobileViewportLock="true";
  document.head.append(link);
}

ensureMobileViewportStyles();

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
  ensureMobileViewportStyles();
  ensureLiveRegions();
  addConnectionStatus();
  polishExternalLinks();
  labelDialogCloseButtons();
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootEnhancements,{once:true});
else bootEnhancements();
