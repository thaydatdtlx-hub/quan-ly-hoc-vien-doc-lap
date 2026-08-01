const statusHosts=[
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
  const status=document.createElement("span");
  status.className="system-status";
  status.setAttribute("role","status");
  status.setAttribute("aria-live","polite");

  const update=()=>{
    const online=navigator.onLine;
    status.dataset.state=online?"online":"offline";
    status.textContent=online?"Hệ thống trực tuyến":"Đang ngoại tuyến";
    document.body.classList.toggle("is-offline",!online);
  };

  const host=statusHosts.map(selector=>document.querySelector(selector)).find(Boolean);
  if(host)host.prepend(status);
  else{
    const heading=document.querySelector(".login-heading");
    if(heading)heading.insertAdjacentElement("afterend",status);
  }

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
  ensureLiveRegions();
  addConnectionStatus();
  polishExternalLinks();
  labelDialogCloseButtons();
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootEnhancements,{once:true});
else bootEnhancements();
