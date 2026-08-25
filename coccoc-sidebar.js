import "./coccoc-sidebar.css";

const STORAGE_KEY="hoclaixecungdat_admin_sidebar_state_v1";
const DESKTOP_QUERY=window.matchMedia("(min-width:1100px)");
let tooltip=null;
let appObserver=null;
let resizeTimer=0;

function readExpandedState(){
  try{return localStorage.getItem(STORAGE_KEY)==="expanded"}catch{return false}
}

function saveExpandedState(expanded){
  try{localStorage.setItem(STORAGE_KEY,expanded?"expanded":"collapsed")}catch{}
}

function sidebarLabel(node){
  if(!node)return"";
  if(node.classList.contains("professional-sidebar-brand"))return"Học lái xe cùng Đạt";
  if(node.classList.contains("professional-sidebar-profile"))return node.querySelector("strong")?.textContent?.trim()||"Tài khoản quản lý";
  if(node.classList.contains("professional-sidebar-support"))return"Hỗ trợ qua Zalo 0984 811 037";
  return node.querySelector("strong")?.textContent?.trim()||node.getAttribute("aria-label")||"";
}

function ensureTooltip(){
  if(tooltip)return tooltip;
  tooltip=document.createElement("div");
  tooltip.className="coccoc-sidebar-tooltip";
  tooltip.setAttribute("role","tooltip");
  document.body.append(tooltip);
  return tooltip;
}

function hideTooltip(){
  if(!tooltip)return;
  tooltip.classList.remove("is-visible");
}

function showTooltip(target){
  if(!DESKTOP_QUERY.matches||!document.body.classList.contains("coccoc-sidebar-collapsed"))return;
  const label=target?.dataset.coccocLabel||sidebarLabel(target);
  if(!label)return;
  const tip=ensureTooltip();
  const rect=target.getBoundingClientRect();
  tip.textContent=label;
  tip.style.left=`${Math.min(window.innerWidth-250,rect.right+11)}px`;
  tip.style.top=`${Math.max(20,Math.min(window.innerHeight-20,rect.top+rect.height/2))}px`;
  tip.classList.add("is-visible");
}

function dispatchLayoutResize(){
  clearTimeout(resizeTimer);
  resizeTimer=window.setTimeout(()=>window.dispatchEvent(new Event("resize")),240);
}

function applyState(sidebar,expanded,{persist=false}={}){
  if(!sidebar)return;
  const body=document.body;
  body.classList.toggle("coccoc-sidebar-expanded",expanded);
  body.classList.toggle("coccoc-sidebar-collapsed",!expanded);
  body.dataset.adminSidebar=expanded?"expanded":"collapsed";
  sidebar.classList.toggle("coccoc-is-expanded",expanded);
  sidebar.classList.toggle("coccoc-is-collapsed",!expanded);
  sidebar.dataset.sidebarState=expanded?"expanded":"collapsed";

  const toggle=sidebar.querySelector(".coccoc-sidebar-toggle");
  if(toggle){
    toggle.setAttribute("aria-expanded",String(expanded));
    toggle.setAttribute("aria-label",expanded?"Thu gọn thanh điều hướng":"Mở rộng thanh điều hướng");
    const label=toggle.querySelector("strong");
    if(label)label.textContent=expanded?"Thu gọn thanh điều hướng":"Mở rộng thanh điều hướng";
  }

  sidebar.querySelectorAll("[data-coccoc-label]").forEach(node=>{
    const label=node.dataset.coccocLabel;
    if(label)node.setAttribute("aria-label",label);
  });
  hideTooltip();
  if(persist)saveExpandedState(expanded);
  dispatchLayoutResize();
}

function refreshLabels(sidebar){
  const brand=sidebar.querySelector(".professional-sidebar-brand");
  const profile=sidebar.querySelector(".professional-sidebar-profile");
  const support=sidebar.querySelector(".professional-sidebar-support");
  if(brand)brand.dataset.coccocLabel="Học lái xe cùng Đạt";
  if(profile)profile.dataset.coccocLabel=sidebarLabel(profile);
  if(support)support.dataset.coccocLabel="Hỗ trợ qua Zalo 0984 811 037";
  sidebar.querySelectorAll(".professional-nav-item").forEach(item=>{
    const label=sidebarLabel(item);
    if(label)item.dataset.coccocLabel=label;
  });
}

function bindSidebar(sidebar){
  if(!sidebar)return;
  sidebar.classList.add("coccoc-sidebar");
  refreshLabels(sidebar);

  if(sidebar.dataset.coccocBound!=="1"){
    sidebar.dataset.coccocBound="1";
    const controls=document.createElement("div");
    controls.className="coccoc-sidebar-controls";
    controls.innerHTML=`<button class="coccoc-sidebar-toggle" type="button" aria-controls="${sidebar.id||"adminProfessionalSidebar"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg><strong>Mở rộng thanh điều hướng</strong></button>`;
    sidebar.prepend(controls);

    controls.querySelector("button").addEventListener("click",()=>{
      const expanded=!document.body.classList.contains("coccoc-sidebar-expanded");
      applyState(sidebar,expanded,{persist:true});
    });

    sidebar.addEventListener("pointerover",event=>{
      const target=event.target.closest?.("[data-coccoc-label]");
      if(!target||!sidebar.contains(target))return;
      if(event.relatedTarget&&target.contains(event.relatedTarget))return;
      showTooltip(target);
    });
    sidebar.addEventListener("pointerout",event=>{
      const target=event.target.closest?.("[data-coccoc-label]");
      if(!target)return;
      if(event.relatedTarget&&target.contains(event.relatedTarget))return;
      hideTooltip();
    });
    sidebar.addEventListener("focusin",event=>{
      const target=event.target.closest?.("[data-coccoc-label]");
      if(target)showTooltip(target);
    });
    sidebar.addEventListener("focusout",hideTooltip);
    sidebar.addEventListener("click",hideTooltip);
  }

  applyState(sidebar,readExpandedState());
}

function scan(){
  if(!DESKTOP_QUERY.matches){
    document.body.classList.remove("coccoc-sidebar-expanded","coccoc-sidebar-collapsed");
    hideTooltip();
    return;
  }
  document.querySelectorAll("#app>.professional-sidebar").forEach(bindSidebar);
}

function watchAdminShell(){
  const app=document.getElementById("app");
  if(!app||appObserver)return;
  appObserver=new MutationObserver(records=>{
    if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches?.(".professional-sidebar")||node.querySelector?.(".professional-sidebar")))))scan();
  });
  appObserver.observe(app,{childList:true});
}

function boot(){
  if(DESKTOP_QUERY.matches){
    document.body.classList.toggle("coccoc-sidebar-expanded",readExpandedState());
    document.body.classList.toggle("coccoc-sidebar-collapsed",!readExpandedState());
  }
  watchAdminShell();
  scan();
  [180,500,1200,2600,5000].forEach(delay=>window.setTimeout(scan,delay));
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();

DESKTOP_QUERY.addEventListener?.("change",scan);
window.addEventListener("pageshow",scan);
window.addEventListener("resize",hideTooltip,{passive:true});
window.addEventListener("scroll",hideTooltip,{passive:true,capture:true});
