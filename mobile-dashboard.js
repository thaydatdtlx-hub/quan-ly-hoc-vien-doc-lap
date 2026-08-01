const $=id=>document.getElementById(id);
const isMobile=()=>matchMedia("(max-width: 720px)").matches;
const numberFrom=value=>Number(String(value||"").replace(/[^0-9-]/g,""))||0;
const initials=value=>String(value||"").trim().split(/\s+/).filter(Boolean).slice(-2).map(part=>part[0]).join("").toUpperCase()||"ĐĐ";
const setText=(id,value)=>{const node=$(id),next=String(value);if(node&&node.textContent!==next)node.textContent=next};
const setHidden=(node,hidden)=>{if(node&&node.classList.contains("hidden")!==hidden)node.classList.toggle("hidden",hidden)};

const MOBILE_ICONS={
  search:'<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path>',
  grid:'<rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect>',
  home:'<path d="m3 11 9-8 9 8"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>',
  userPlus:'<path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8" cy="7" r="4"></circle><path d="M19 8v6M22 11h-6"></path>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 11h18"></path>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path>',
  graduation:'<path d="m2 10 10-5 10 5-10 5Z"></path><path d="M6 12v5c3 2 9 2 12 0v-5M22 10v6"></path>',
  clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"></rect><path d="M9 4V2h6v2M9 12l2 2 4-4"></path>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path>',
  wallet:'<path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6"></path><path d="M16 13h4"></path>',
  check:'<circle cx="12" cy="12" r="9"></circle><path d="m8 12 3 3 5-6"></path>',
  alert:'<circle cx="12" cy="12" r="9"></circle><path d="M12 7v6M12 17h.01"></path>',
  clock:'<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
  more:'<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>',
  list:'<path d="M9 6h12M9 12h12M9 18h12"></path><path d="M4 6h.01M4 12h.01M4 18h.01"></path>',
  car:'<path d="m5 17-2-2v-4l2-5h14l2 5v4l-2 2Z"></path><path d="M5 11h14M7 17v2M17 17v2"></path><circle cx="7" cy="14" r="1"></circle><circle cx="17" cy="14" r="1"></circle>'
};
const iconMarkup=name=>`<svg class="mobile-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${MOBILE_ICONS[name]||MOBILE_ICONS.grid}</svg>`;
function renderIcons(root=document){root.querySelectorAll("[data-mobile-icon]").forEach(node=>{const name=node.dataset.mobileIcon;if(node.dataset.mobileIconRendered===name)return;node.innerHTML=iconMarkup(name);node.dataset.mobileIconRendered=name})}
function setIcon(id,name){const node=$(id);if(!node||node.dataset.mobileIconRendered===name)return;node.dataset.mobileIcon=name;node.innerHTML=iconMarkup(name);node.dataset.mobileIconRendered=name}

function setBadge(sourceId,targetIds){
  const source=$(sourceId),value=numberFrom(source?.textContent),hidden=!value||source?.classList.contains("hidden");
  targetIds.forEach(id=>{const target=$(id);if(!target)return;setText(id,value);setHidden(target,hidden)});
  return hidden?0:value;
}
function setAction(prefix,state,title,detail,icon){
  const box=$(`${prefix}ActionTitle`)?.closest(".mobile-action-state");
  box?.classList.toggle("is-warning",state==="warning");box?.classList.toggle("is-danger",state==="danger");
  setText(`${prefix}ActionTitle`,title);setText(`${prefix}ActionDetail`,detail);setIcon(`${prefix}ActionIcon`,icon);
}
function syncAdmin(){
  if(!$(`dashboardMain`))return;
  const account=$(`accountName`)?.textContent?.trim()||"Tài khoản quản lý";
  setText("mobileAdminAccountName",account);setText("mobileAdminAccountBtn",initials(account));
  const unread=setBadge("notificationBadge",["mobileAdminNotificationBadge","mobileAdminBottomBadge"]),warnings=numberFrom($("warningTotal")?.textContent),debts=numberFrom($("debtStudents")?.textContent);
  if(warnings>0)setAction("mobileAdmin","danger",`${warnings} cảnh báo cần xử lý`,`Ưu tiên kiểm tra học viên có cảnh báo chuyên cần, hồ sơ hoặc tiến độ.`,"alert");
  else if(debts>0)setAction("mobileAdmin","warning",`${debts} học viên còn học phí`,`Mở danh sách học viên để theo dõi và nhắc học phí đúng hạn.`,"wallet");
  else if(unread>0)setAction("mobileAdmin","warning",`${unread} thông báo chưa đọc`,`Có cập nhật mới trong Trung tâm thông báo của Admin.`,"bell");
  else setAction("mobileAdmin","ready","Không có việc khẩn cấp","Dữ liệu hiện tại không có cảnh báo cần xử lý ngay.","check");
}
function syncStudent(){
  if(!$(`studentPortal`))return;
  const account=$("studentName")?.textContent?.trim()||$(`studentUsername`)?.textContent?.trim()||"Học viên";
  setText("mobileStudentAccountName",account);setText("mobileStudentAccountBtn",initials(account).slice(0,2));
  setText("mobileStudentOverviewTitle",`Xin chào, ${account.split(/\s+/).slice(-2).join(" ")}`);
  const license=$("studentLicense")?.textContent?.trim();if(license)setText("mobileStudentClass",license);
  const unread=setBadge("studentNotificationBadge",["mobileStudentNotificationBadge","mobileStudentBottomBadge"]),pending=numberFrom($("bookingPendingBadge")?.textContent),debt=numberFrom($("tuitionDebt")?.textContent);
  if(unread>0)setAction("mobileStudent","warning",`${unread} thông báo mới`,`Mở Trung tâm thông báo để xem lịch học và cập nhật từ Admin.`,"bell");
  else if(pending>0)setAction("mobileStudent","warning",`${pending} lịch đang chờ duyệt`,`Admin sẽ thông báo ngay khi ca học được duyệt hoặc điều chỉnh.`,"clock");
  else if(debt>0)setAction("mobileStudent","danger","Học phí chưa hoàn tất",`Số tiền còn lại: ${$("tuitionDebt")?.textContent?.trim()||"đang cập nhật"}.`,"wallet");
  else setAction("mobileStudent","ready","Không có việc cần xử lý","Lịch học và thông báo mới sẽ tự động xuất hiện tại đây.","check");
}
let syncFrame=0;function scheduleSync(){cancelAnimationFrame(syncFrame);syncFrame=requestAnimationFrame(()=>{syncAdmin();syncStudent()})}

function closeMenus(except){document.querySelectorAll(".mobile-account-menu").forEach(menu=>{if(menu!==except)menu.classList.add("hidden")})}
document.addEventListener("click",event=>{
  const proxy=event.target.closest("[data-mobile-click]");
  if(proxy){event.preventDefault();$(proxy.dataset.mobileClick)?.click();closeMenus();return}
  const scroll=event.target.closest("[data-mobile-scroll]");
  if(scroll){
    event.preventDefault();const target=document.querySelector(scroll.dataset.mobileScroll);target?.scrollIntoView({behavior:"smooth",block:"start"});
    const nav=scroll.closest("nav");nav?.querySelectorAll(".active").forEach(item=>item.classList.remove("active"));scroll.classList.add("active");return;
  }
  const action=event.target.closest("[data-mobile-action]")?.dataset.mobileAction;
  if(action==="admin-search"||action==="admin-more"){
    const toolbar=document.querySelector("#dashboardMain>.toolbar");toolbar?.classList.toggle("mobile-tools-open");
    if(toolbar?.classList.contains("mobile-tools-open")){toolbar.scrollIntoView({behavior:"smooth",block:"start"});if(action==="admin-search")setTimeout(()=>$("search")?.focus(),350)}
    return;
  }
  if(action==="student-search"){const target=$("mobileStudentShortcuts");target?.scrollIntoView({behavior:"smooth",block:"start"});target?.classList.add("mobile-highlight");setTimeout(()=>target?.classList.remove("mobile-highlight"),900);return}
  const accountButton=event.target.closest("#mobileAdminAccountBtn,#mobileStudentAccountBtn");
  if(accountButton){const menu=$(accountButton.id==="mobileAdminAccountBtn"?"mobileAdminAccountMenu":"mobileStudentAccountMenu"),opening=menu?.classList.contains("hidden");closeMenus(menu);if(opening)menu?.classList.remove("hidden");else menu?.classList.add("hidden");return}
  if(action==="student-more"){const menu=$("mobileStudentAccountMenu"),opening=menu?.classList.contains("hidden");closeMenus(menu);if(opening)menu?.classList.remove("hidden");return}
  if(!event.target.closest(".mobile-account-menu"))closeMenus();
});

const observer=new MutationObserver(scheduleSync);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});
addEventListener("resize",()=>{if(!isMobile())closeMenus()});
renderIcons();
scheduleSync();
