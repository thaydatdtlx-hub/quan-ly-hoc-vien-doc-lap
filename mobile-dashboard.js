const $=id=>document.getElementById(id);
const isMobile=()=>matchMedia("(max-width: 720px)").matches;
const numberFrom=value=>Number(String(value||"").replace(/[^0-9-]/g,""))||0;
const initials=value=>String(value||"").trim().split(/\s+/).filter(Boolean).slice(-2).map(part=>part[0]).join("").toUpperCase()||"ĐĐ";
const setText=(id,value)=>{const node=$(id),next=String(value);if(node&&node.textContent!==next)node.textContent=next};
const setHidden=(node,hidden)=>{if(node&&node.classList.contains("hidden")!==hidden)node.classList.toggle("hidden",hidden)};

function setBadge(sourceId,targetIds){
  const source=$(sourceId),value=numberFrom(source?.textContent),hidden=!value||source?.classList.contains("hidden");
  targetIds.forEach(id=>{const target=$(id);if(!target)return;setText(id,value);setHidden(target,hidden)});
  return hidden?0:value;
}
function setAction(prefix,state,title,detail,icon){
  const box=$(`${prefix}ActionTitle`)?.closest(".mobile-action-state");
  box?.classList.toggle("is-warning",state==="warning");box?.classList.toggle("is-danger",state==="danger");
  setText(`${prefix}ActionTitle`,title);setText(`${prefix}ActionDetail`,detail);setText(`${prefix}ActionIcon`,icon);
}
function syncAdmin(){
  if(!$(`dashboardMain`))return;
  const account=$(`accountName`)?.textContent?.trim()||"Tài khoản quản lý";
  setText("mobileAdminAccountName",account);setText("mobileAdminAccountBtn",initials(account));
  const unread=setBadge("notificationBadge",["mobileAdminNotificationBadge","mobileAdminBottomBadge"]),warnings=numberFrom($("warningTotal")?.textContent),debts=numberFrom($("debtStudents")?.textContent);
  if(warnings>0)setAction("mobileAdmin","danger",`${warnings} cảnh báo cần xử lý`,`Ưu tiên kiểm tra học viên có cảnh báo chuyên cần, hồ sơ hoặc tiến độ.`,"!");
  else if(debts>0)setAction("mobileAdmin","warning",`${debts} học viên còn học phí`,`Mở danh sách học viên để theo dõi và nhắc học phí đúng hạn.`,"₫");
  else if(unread>0)setAction("mobileAdmin","warning",`${unread} thông báo chưa đọc`,`Có cập nhật mới trong Trung tâm thông báo của Admin.`,"♢");
  else setAction("mobileAdmin","ready","Không có việc khẩn cấp","Dữ liệu hiện tại không có cảnh báo cần xử lý ngay.","✓");
}
function syncStudent(){
  if(!$(`studentPortal`))return;
  const account=$("studentName")?.textContent?.trim()||$(`studentUsername`)?.textContent?.trim()||"Học viên";
  setText("mobileStudentAccountName",account);setText("mobileStudentAccountBtn",initials(account).slice(0,2));
  setText("mobileStudentOverviewTitle",`Xin chào, ${account.split(/\s+/).slice(-2).join(" ")}`);
  const license=$("studentLicense")?.textContent?.trim();if(license)setText("mobileStudentClass",license);
  const unread=setBadge("studentNotificationBadge",["mobileStudentNotificationBadge","mobileStudentBottomBadge"]),pending=numberFrom($("bookingPendingBadge")?.textContent),debt=numberFrom($("tuitionDebt")?.textContent);
  if(unread>0)setAction("mobileStudent","warning",`${unread} thông báo mới`,`Mở Trung tâm thông báo để xem lịch học và cập nhật từ Admin.`,"♢");
  else if(pending>0)setAction("mobileStudent","warning",`${pending} lịch đang chờ duyệt`,`Admin sẽ thông báo ngay khi ca học được duyệt hoặc điều chỉnh.`,"◷");
  else if(debt>0)setAction("mobileStudent","danger","Học phí chưa hoàn tất",`Số tiền còn lại: ${$("tuitionDebt")?.textContent?.trim()||"đang cập nhật"}.`,"₫");
  else setAction("mobileStudent","ready","Không có việc cần xử lý","Lịch học và thông báo mới sẽ tự động xuất hiện tại đây.","✓");
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
scheduleSync();
