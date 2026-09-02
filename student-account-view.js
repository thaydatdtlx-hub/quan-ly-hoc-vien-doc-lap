import "./student-account-view.css";

const MOBILE_QUERY=window.matchMedia("(max-width: 720px)");
const ACCOUNT_ACTIVE_CLASS="student-account-view-active";
const $=id=>document.getElementById(id);

let portal=null;
let profilePanel=null;
let originalParent=null;
let originalAnchor=null;
let accountView=null;
let profileSlot=null;
let accountNav=null;
let syncFrame=0;

function text(id,fallback=""){
  return $(id)?.textContent?.trim()||fallback;
}
function setText(id,value){
  const node=$(id),next=String(value);
  if(node&&node.textContent!==next)node.textContent=next;
}
function initials(value){
  const words=String(value||"HV").trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).map(word=>word[0]||"").join("").toUpperCase()||"HV";
}
function userIcon(){
  return '<svg class="mobile-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>';
}
function ensureAccountView(){
  portal=$("studentPortal");
  profilePanel=document.querySelector(".profile-panel");
  if(!portal||!profilePanel)return false;

  originalParent=profilePanel.parentNode;
  originalAnchor=document.createComment("student-profile-original-position");
  originalParent.insertBefore(originalAnchor,profilePanel);

  accountView=document.createElement("section");
  accountView.id="studentAccountView";
  accountView.className="student-account-view";
  accountView.hidden=true;
  accountView.tabIndex=-1;
  accountView.setAttribute("aria-labelledby","studentAccountViewTitle");
  accountView.innerHTML=`
    <header class="student-account-view-head">
      <div class="student-account-view-avatar">
        <img id="studentAccountViewPhoto" alt="Ảnh học viên" hidden>
        <span id="studentAccountViewInitials">HV</span>
        <i aria-hidden="true"></i>
      </div>
      <div class="student-account-view-copy">
        <p>TÀI KHOẢN HỌC VIÊN</p>
        <h1 id="studentAccountViewTitle">Học viên</h1>
        <div class="student-account-view-tags">
          <span id="studentAccountViewCode">Chưa có mã</span>
          <span id="studentAccountViewCourse">Chưa có khóa</span>
          <span id="studentAccountViewLicense">Chưa có hạng</span>
        </div>
      </div>
    </header>
    <div id="studentAccountProfileSlot" class="student-account-profile-slot"></div>
    <section class="student-account-security" aria-labelledby="studentAccountSecurityTitle">
      <div>
        <p>BẢO MẬT TÀI KHOẢN</p>
        <h2 id="studentAccountSecurityTitle">Đăng nhập và bảo mật</h2>
        <span>Quản lý mật khẩu hoặc đăng xuất khỏi thiết bị này.</span>
      </div>
      <div class="student-account-security-actions">
        <button type="button" data-student-account-proxy="studentChangePasswordBtn">Đổi mật khẩu</button>
        <button class="danger" type="button" data-student-account-proxy="studentLogoutBtn">Đăng xuất</button>
      </div>
    </section>`;
  portal.prepend(accountView);
  profileSlot=$("studentAccountProfileSlot");
  return true;
}
function findAccountNav(){
  const nav=document.querySelector(".mobile-bottom-nav");
  if(!nav)return null;
  const items=[...nav.children];
  let item=items.find(node=>/tài khoản/i.test(node.querySelector("small")?.textContent||""));
  if(!item)item=nav.querySelector('[data-mobile-action="student-more"]');
  if(!item)item=items.at(-1)||null;
  if(!item)return null;

  item.removeAttribute("data-mobile-action");
  item.removeAttribute("data-mobile-scroll");
  item.removeAttribute("data-mobile-click");
  item.dataset.studentAccountView="open";
  item.setAttribute("aria-controls","studentAccountView");
  item.setAttribute("aria-label","Mở mục Tài khoản");
  if(item.tagName==="A")item.setAttribute("href","#tai-khoan");
  else item.setAttribute("type","button");

  let icon=item.querySelector(":scope > span");
  if(!icon){icon=document.createElement("span");item.prepend(icon)}
  icon.removeAttribute("data-mobile-icon");
  icon.removeAttribute("data-mobile-icon-rendered");
  icon.innerHTML=userIcon();

  let label=item.querySelector(":scope > small");
  if(!label){label=document.createElement("small");item.append(label)}
  label.textContent="Tài khoản";
  return item;
}
function ensureMenuEntry(){
  const menu=$("mobileStudentAccountMenu");
  if(!menu||menu.querySelector('[data-student-account-view="open"]'))return;
  const button=document.createElement("button");
  button.type="button";
  button.dataset.studentAccountView="open";
  button.textContent="Xem thông tin tài khoản";
  const firstButton=menu.querySelector("button");
  menu.insertBefore(button,firstButton||null);
}
function syncAccountSummary(){
  if(!accountView)return;
  const name=text("studentName",text("studentUsername","Học viên"));
  setText("studentAccountViewTitle",name);
  setText("studentAccountViewInitials",initials(name));
  setText("studentAccountViewCode",text("studentCode","Chưa có mã"));
  setText("studentAccountViewCourse",text("studentCourse","Chưa có khóa"));
  setText("studentAccountViewLicense",text("studentLicense","Chưa có hạng"));

  const source=$("studentPhoto");
  const target=$("studentAccountViewPhoto");
  const placeholder=$("studentAccountViewInitials");
  const hasPhoto=Boolean(source?.src&&!source.classList.contains("hidden"));
  if(hasPhoto){
    if(target.src!==source.src)target.src=source.src;
    if(target.hidden)target.hidden=false;
    if(!placeholder.hidden)placeholder.hidden=true;
  }else{
    if(target.hasAttribute("src"))target.removeAttribute("src");
    if(!target.hidden)target.hidden=true;
    if(placeholder.hidden)placeholder.hidden=false;
  }
}
function scheduleSummarySync(){
  cancelAnimationFrame(syncFrame);
  syncFrame=requestAnimationFrame(syncAccountSummary);
}
function setNavState(active){
  const nav=accountNav?.closest(".mobile-bottom-nav");
  if(!nav)return;
  nav.querySelectorAll(".active").forEach(item=>item.classList.remove("active"));
  nav.querySelectorAll('[aria-current="page"]').forEach(item=>item.removeAttribute("aria-current"));
  const target=active?accountNav:nav.querySelector('[data-mobile-scroll="#studentPortal"]')||nav.firstElementChild;
  target?.classList.add("active");
  target?.setAttribute("aria-current","page");
}
function moveProfileForViewport(){
  if(!profilePanel||!accountView||!profileSlot)return;
  if(MOBILE_QUERY.matches){
    if(profilePanel.parentNode!==profileSlot)profileSlot.append(profilePanel);
    return;
  }
  document.body.classList.remove(ACCOUNT_ACTIVE_CLASS);
  accountView.hidden=true;
  if(originalAnchor?.parentNode&&profilePanel.parentNode!==originalParent){
    originalAnchor.parentNode.insertBefore(profilePanel,originalAnchor.nextSibling);
  }
}
function closeAccountMenu(){
  $("mobileStudentAccountMenu")?.classList.add("hidden");
}
function showAccount(){
  if(!MOBILE_QUERY.matches){
    profilePanel?.scrollIntoView({behavior:"smooth",block:"start"});
    return;
  }
  moveProfileForViewport();
  syncAccountSummary();
  accountView.hidden=false;
  document.body.classList.add(ACCOUNT_ACTIVE_CLASS);
  setNavState(true);
  closeAccountMenu();
  requestAnimationFrame(()=>{
    window.scrollTo({top:0,behavior:"auto"});
    accountView.focus({preventScroll:true});
  });
}
function showOverview({scroll=false}={}){
  if(!accountView)return;
  document.body.classList.remove(ACCOUNT_ACTIVE_CLASS);
  accountView.hidden=true;
  setNavState(false);
  closeAccountMenu();
  if(scroll)requestAnimationFrame(()=>portal?.scrollIntoView({behavior:"smooth",block:"start"}));
}
function installActions(){
  document.addEventListener("click",event=>{
    const open=event.target.closest('[data-student-account-view="open"]');
    if(open){
      event.preventDefault();
      event.stopImmediatePropagation();
      showAccount();
      return;
    }

    const proxy=event.target.closest("[data-student-account-proxy]");
    if(proxy){
      event.preventDefault();
      $(proxy.dataset.studentAccountProxy)?.click();
      return;
    }

    const profileTab=event.target.closest('.mobile-page-tabs [data-mobile-scroll=".profile-panel"]');
    if(profileTab){
      event.preventDefault();
      event.stopImmediatePropagation();
      showAccount();
      return;
    }

    const bottomItem=event.target.closest(".mobile-bottom-nav > *");
    if(bottomItem&&bottomItem!==accountNav&&document.body.classList.contains(ACCOUNT_ACTIVE_CLASS)){
      showOverview();
    }
  },true);
}
function boot(){
  if(location.pathname!=="/hoc-vien.html")return;
  if(!ensureAccountView())return;
  accountNav=findAccountNav();
  ensureMenuEntry();
  installActions();
  moveProfileForViewport();
  syncAccountSummary();

  const observer=new MutationObserver(scheduleSummarySync);
  ["studentName","studentUsername","studentCode","studentCourse","studentLicense","studentPhoto"].forEach(id=>{
    const node=$(id);
    if(node)observer.observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class","src"]});
  });
  MOBILE_QUERY.addEventListener?.("change",()=>{
    moveProfileForViewport();
    if(!MOBILE_QUERY.matches)showOverview();
  });
  window.addEventListener("pageshow",()=>{
    moveProfileForViewport();
    syncAccountSummary();
  });
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
