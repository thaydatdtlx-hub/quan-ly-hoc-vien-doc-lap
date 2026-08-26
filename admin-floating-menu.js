const TOOL_SELECTOR=[
  ".student-activity-floating",
  ".admin-site-floating",
  ".admin-tuition-floating",
  ".admin-assistant-launcher"
].join(",");

const mobileQuery=window.matchMedia("(max-width:720px)");
let scheduled=false;

function buildShell(){
  let menu=document.getElementById("adminToolboxMenu");
  let toggle=document.getElementById("adminToolboxToggle");
  if(!menu){
    menu=document.createElement("aside");
    menu.id="adminToolboxMenu";
    menu.className="admin-toolbox-menu";
    menu.hidden=true;
    menu.setAttribute("aria-label","Công cụ quản trị");
    menu.setAttribute("aria-hidden","true");
    document.body.append(menu);
  }
  if(!toggle){
    toggle=document.createElement("button");
    toggle.id="adminToolboxToggle";
    toggle.className="admin-toolbox-toggle";
    toggle.type="button";
    toggle.hidden=true;
    toggle.setAttribute("aria-controls",menu.id);
    toggle.setAttribute("aria-expanded","false");
    toggle.setAttribute("aria-label","Mở công cụ quản trị");
    toggle.innerHTML='<span class="admin-toolbox-toggle__icon" aria-hidden="true"><i></i><i></i><i></i><i></i></span><strong>Công cụ</strong>';
    document.body.append(toggle);
    toggle.addEventListener("click",event=>{
      event.stopPropagation();
      setOpen(!document.documentElement.classList.contains("admin-toolbox-open"));
    });
  }
  return{menu,toggle};
}

function labelTool(button){
  if(button.dataset.toolboxReady==="2")return;
  button.dataset.toolboxReady="2";
  if(button.classList.contains("student-activity-floating")){
    button.setAttribute("aria-label","Hoạt động học viên");
    button.innerHTML='<span class="admin-toolbox-item__icon" aria-hidden="true">◉</span><strong>Hoạt động<br>học viên</strong>';
  }else if(button.classList.contains("admin-site-floating")){
    button.setAttribute("aria-label","Cấu hình website");
    button.innerHTML='<span class="admin-toolbox-item__icon" aria-hidden="true">⚙</span><strong>Cấu hình<br>website</strong>';
  }else if(button.classList.contains("admin-tuition-floating")){
    button.setAttribute("aria-label","Học phí và ưu đãi");
    button.innerHTML='<span class="admin-toolbox-item__icon" aria-hidden="true">₫</span><strong>Học phí<br>&amp; ưu đãi</strong>';
  }
}

function setOpen(open){
  const{menu,toggle}=buildShell();
  const hasVisibleTools=[...menu.querySelectorAll(TOOL_SELECTOR)].some(button=>!button.hidden);
  const mobile=mobileQuery.matches;
  const next=Boolean(mobile&&open&&hasVisibleTools);
  document.documentElement.classList.toggle("admin-toolbox-open",next);
  menu.setAttribute("aria-hidden",String(!hasVisibleTools||(mobile&&!next)));
  toggle.classList.toggle("is-open",next);
  toggle.setAttribute("aria-expanded",String(next));
  toggle.setAttribute("aria-label",next?"Đóng công cụ quản trị":"Mở công cụ quản trị");
  toggle.querySelector("strong").textContent=next?"Đóng":"Công cụ";
}

function syncTools(){
  scheduled=false;
  const{menu,toggle}=buildShell();
  document.querySelectorAll(TOOL_SELECTOR).forEach(button=>{
    labelTool(button);
    if(button.parentElement!==menu)menu.append(button);
  });
  const assistantOpen=Boolean(document.querySelector(".admin-assistant-panel.is-open"));
  const hasTools=[...menu.querySelectorAll(TOOL_SELECTOR)].some(button=>!button.hidden);
  const mobile=mobileQuery.matches;
  const shouldHideMenu=!hasTools||assistantOpen;
  if(menu.hidden!==shouldHideMenu)menu.hidden=shouldHideMenu;
  if(!mobile)document.documentElement.classList.remove("admin-toolbox-open");
  menu.setAttribute("aria-hidden",String(shouldHideMenu||(mobile&&!document.documentElement.classList.contains("admin-toolbox-open"))));
  const shouldHideToggle=!mobile||!hasTools||assistantOpen;
  if(toggle.hidden!==shouldHideToggle)toggle.hidden=shouldHideToggle;
  if(assistantOpen)setOpen(false);
}

function scheduleSync(){
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(syncTools);
}

buildShell();
document.addEventListener("click",event=>{
  const menu=document.getElementById("adminToolboxMenu");
  const toggle=document.getElementById("adminToolboxToggle");
  if(event.target.closest(TOOL_SELECTOR))setOpen(false);
  else if(document.documentElement.classList.contains("admin-toolbox-open")&&!menu?.contains(event.target)&&!toggle?.contains(event.target))setOpen(false);
});
document.addEventListener("keydown",event=>{if(event.key==="Escape")setOpen(false)});
mobileQuery.addEventListener?.("change",()=>{setOpen(false);scheduleSync()});
new MutationObserver(scheduleSync).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class","hidden"]});
scheduleSync();
