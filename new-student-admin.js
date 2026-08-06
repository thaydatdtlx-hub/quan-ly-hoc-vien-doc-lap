import "./new-student-admin.css";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const POLL_INTERVAL=30000;
const SEEN_STORAGE_KEY="hv_new_student_registration_seen_v2";
const $=id=>document.getElementById(id);
const token=()=>localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
let rows=[];
let loaded=false;
let loading=false;
let pollTimer=null;

const labels={new:"Mới",contacted:"Đã liên hệ",consulting:"Đang tư vấn",enrolled:"Đã nhập học",cancelled:"Không tiếp tục"};
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const normalize=value=>String(value??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
const dt=value=>value?new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value)):"";
const d=value=>value?String(value).split("-").reverse().join("/"):"Chưa chọn";

async function rpc(fn,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||"Không thể kết nối máy chủ");
  return data;
}

function readSeenIds(){
  try{return new Set(JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY)||"[]").map(String))}
  catch{return new Set()}
}

function writeSeenIds(ids){
  localStorage.setItem(SEEN_STORAGE_KEY,JSON.stringify([...ids].slice(-500)));
}

function pendingRows(){return rows.filter(item=>item.status==="new")}
function unreadRows(){
  const seen=readSeenIds();
  return pendingRows().filter(item=>!seen.has(String(item.id)));
}

function isAdminActive(){
  const app=$("app");
  const accountName=$("accountName");
  return Boolean(token()&&app&&!app.classList.contains("hidden")&&/\badmin\b/i.test(accountName?.textContent||""));
}

function ensurePublicRegistrationLink(){
  if(document.querySelector(".intro-new-student-cta"))return;
  const intro=document.querySelector(".login-intro");
  if(!intro)return;
  const link=document.createElement("a");
  link.className="intro-new-student-cta";
  link.href="/dang-ky-hoc-lai-xe.html";
  link.innerHTML='<span aria-hidden="true">🎓</span><div><strong>ĐĂNG KÝ HỌC LÁI XE MỚI</strong><small>A1 · A · B số tự động · B số sàn · C1</small></div><b aria-hidden="true">→</b>';
  const refreshLink=intro.querySelector(".intro-refresh-cta");
  if(refreshLink)refreshLink.insertAdjacentElement("beforebegin",link);
  else intro.append(link);
}

function ensureNotificationBadge(){
  const button=$("notificationBtn");
  if(!button)return;
  button.classList.add("new-student-notification-host");
  if(button.querySelector(".new-student-notification-dot"))return;
  const badge=document.createElement("span");
  badge.className="new-student-notification-dot hidden";
  badge.setAttribute("aria-label","Đăng ký học lái xe mới chưa xem");
  button.append(badge);
}

function updatePermissionButton(){
  const button=$("newStudentEnableNotifications");
  if(!button)return;
  if(!("Notification" in window)){
    button.hidden=true;
    return;
  }
  button.hidden=false;
  if(Notification.permission==="granted"){
    button.textContent="✓ Thông báo trình duyệt đã bật";
    button.disabled=true;
  }else if(Notification.permission==="denied"){
    button.textContent="Thông báo trình duyệt đang bị chặn";
    button.disabled=true;
  }else{
    button.textContent="Bật thông báo trình duyệt";
    button.disabled=false;
  }
}

async function requestBrowserNotification(){
  if(!("Notification" in window))return;
  try{await Notification.requestPermission()}catch{}
  updatePermissionButton();
}

function ensureUi(){
  if($("newStudentAdminBtn"))return;
  const toolbar=document.querySelector("#app .toolbar");
  if(!toolbar)return;

  const button=document.createElement("button");
  button.id="newStudentAdminBtn";
  button.className="new-student-admin-btn admin-only hidden";
  button.type="button";
  button.innerHTML='<span>🎓</span><div><strong>ĐĂNG KÝ HỌC MỚI</strong><small id="newStudentAdminCount">Khách mới</small></div>';
  const refresh=$("drivingRefreshAdminBtn");
  toolbar.insertBefore(button,refresh||null);

  const dialog=document.createElement("dialog");
  dialog.id="newStudentAdminDialog";
  dialog.className="new-student-admin-dialog";
  dialog.innerHTML=`
    <div class="new-student-admin-head">
      <div><p>KHÁCH HÀNG TIỀM NĂNG</p><h2>Đăng ký học lái xe mới</h2><small>Tiếp nhận, liên hệ và cập nhật trạng thái tư vấn.</small></div>
      <button type="button" data-new-close aria-label="Đóng">×</button>
    </div>
    <div class="new-student-admin-summary">
      <article><small>Tổng đăng ký</small><strong id="newStudentTotal">0</strong></article>
      <article><small>Chưa liên hệ</small><strong id="newStudentNew">0</strong></article>
      <article><small>Đang tư vấn</small><strong id="newStudentConsulting">0</strong></article>
      <article><small>Đã nhập học</small><strong id="newStudentEnrolled">0</strong></article>
    </div>
    <div class="new-student-admin-toolbar">
      <input id="newStudentSearch" type="search" placeholder="Tìm tên, điện thoại, mã đăng ký">
      <select id="newStudentStatus"><option value="all">Tất cả trạng thái</option>${Object.entries(labels).map(([value,label])=>`<option value="${value}">${label}</option>`).join("")}</select>
      <button id="newStudentReload" type="button">Làm mới</button>
      <button id="newStudentEnableNotifications" class="new-student-permission-btn" type="button">Bật thông báo trình duyệt</button>
      <button id="newStudentExport" type="button">Xuất dữ liệu</button>
    </div>
    <p id="newStudentAdminError" class="new-student-admin-error" role="alert"></p>
    <div id="newStudentAdminList" class="new-student-admin-list"><div class="new-student-admin-empty">Đang tải danh sách đăng ký…</div></div>`;
  document.body.append(dialog);

  button.onclick=()=>openAdminDialog(false);
  dialog.querySelector("[data-new-close]").onclick=()=>dialog.close();
  $("newStudentReload").onclick=()=>load({manual:true,notify:false});
  $("newStudentEnableNotifications").onclick=requestBrowserNotification;
  $("newStudentSearch").oninput=render;
  $("newStudentStatus").onchange=render;
  $("newStudentExport").onclick=exportCsv;
  $("newStudentAdminList").onclick=saveStatus;
  updatePermissionButton();
}

function markCurrentRegistrationsSeen(){
  const seen=readSeenIds();
  pendingRows().forEach(item=>seen.add(String(item.id)));
  writeSeenIds(seen);
  syncNotificationUi();
}

async function openAdminDialog(fromNotification=false){
  const dialog=$("newStudentAdminDialog");
  if(!dialog)return;
  if(!dialog.open)dialog.showModal();
  if(fromNotification&&$("newStudentStatus"))$("newStudentStatus").value="new";
  markCurrentRegistrationsSeen();
  await load({manual:true,notify:false});
  if(fromNotification)render();
}

function summary(){
  if(!$("newStudentTotal"))return;
  const count=status=>rows.filter(item=>item.status===status).length;
  $("newStudentTotal").textContent=rows.length;
  $("newStudentNew").textContent=count("new");
  $("newStudentConsulting").textContent=count("consulting");
  $("newStudentEnrolled").textContent=count("enrolled");
  $("newStudentAdminCount").innerHTML=count("new")?`${count("new")} khách mới <span class="new-student-admin-badge">${count("new")}</span>`:"Đã xử lý hết";
}

function render(){
  if(!$("newStudentAdminList"))return;
  const query=normalize($("newStudentSearch").value);
  const status=$("newStudentStatus").value;
  const filtered=rows.filter(item=>(status==="all"||item.status===status)&&(!query||normalize(`${item.registration_code} ${item.full_name} ${item.phone} ${item.area} ${item.license_class} ${item.note}`).includes(query)));
  $("newStudentAdminList").innerHTML=filtered.length?filtered.map(item=>`
    <article class="new-student-admin-item status-${esc(item.status)}" data-new-id="${esc(item.id)}">
      <div class="new-student-admin-person">
        <span>${esc(item.registration_code)}</span><strong>${esc(item.full_name)}</strong>
        <a href="tel:${esc(String(item.phone||"").replace(/[^0-9+]/g,""))}">${esc(item.phone)}</a>
        <small>Đăng ký ${esc(dt(item.created_at))}</small>
      </div>
      <div class="new-student-admin-detail">
        <strong>${esc(item.license_class)} · ${esc(item.area)}</strong>
        <span>Ngày sinh: ${esc(d(item.date_of_birth))}</span>
        <span>Dự kiến bắt đầu: ${esc(d(item.preferred_start_date))}</span>
        <span>Liên hệ: ${esc(item.preferred_contact_time||"Linh hoạt")} · ${esc(item.consultation_channel||"Zalo")}</span>
        <span>Kinh nghiệm: ${esc(item.learning_history||"Chưa ghi")}</span>
        ${item.note?`<span>Nhu cầu: ${esc(item.note)}</span>`:""}
      </div>
      <div class="new-student-admin-actions">
        <select data-new-status>${Object.entries(labels).map(([value,label])=>`<option value="${value}"${item.status===value?' selected':''}>${label}</option>`).join("")}</select>
        <textarea data-new-note maxlength="800" placeholder="Ghi chú tư vấn…">${esc(item.admin_note||"")}</textarea>
        <button type="button" data-new-save>Lưu cập nhật</button>
      </div>
    </article>`).join(""):'<div class="new-student-admin-empty">Không có đăng ký phù hợp.</div>';
}

function renderNotificationCard(){
  const list=$("notificationList");
  const dialog=$("notificationDialog");
  if(!list||!dialog?.open)return;
  list.querySelector(".new-student-central-notice")?.remove();
  const pending=pendingRows();
  if(!pending.length)return;
  const unread=unreadRows();
  const latest=pending[0];
  const article=document.createElement("article");
  article.className=`new-student-central-notice${unread.length?" is-unread":""}`;
  article.innerHTML=`
    <span class="new-student-central-icon">🎓</span>
    <div>
      <div class="new-student-central-meta"><span>ĐĂNG KÝ HỌC MỚI</span>${unread.length?"<b>Mới</b>":""}</div>
      <strong>${pending.length} đăng ký đang chờ liên hệ</strong>
      <p>${unread.length?`Có ${unread.length} đăng ký chưa xem. `:""}Mới nhất: ${esc(latest.full_name)} · ${esc(latest.license_class)} · ${esc(latest.area)}.</p>
      <button type="button" data-open-new-student-notice>Mở danh sách đăng ký →</button>
    </div>`;
  article.querySelector("button").onclick=()=>{
    try{dialog.close()}catch{}
    openAdminDialog(true);
  };
  list.prepend(article);
}

function syncNotificationUi(){
  ensureNotificationBadge();
  const unread=unreadRows().length;
  const badge=document.querySelector(".new-student-notification-dot");
  if(badge){
    badge.textContent=unread>99?"99+":String(unread||"");
    badge.classList.toggle("hidden",!unread);
  }
  renderNotificationCard();
}

function showNewRegistrationToast(items){
  if(!items.length)return;
  const latest=items[0];
  document.querySelector(".new-student-live-toast")?.remove();
  const toast=document.createElement("button");
  toast.type="button";
  toast.className="new-student-live-toast";
  toast.innerHTML=`<span>🎓</span><div><strong>${items.length===1?"Có đăng ký học lái xe mới":`Có ${items.length} đăng ký học lái xe mới`}</strong><small>${esc(latest.full_name)} · ${esc(latest.license_class)} · ${esc(latest.phone)}</small></div><b>›</b>`;
  toast.onclick=()=>{toast.remove();openAdminDialog(true)};
  document.body.append(toast);
  setTimeout(()=>toast.remove(),12000);

  if("Notification" in window&&Notification.permission==="granted"){
    const notice=new Notification(items.length===1?"Đăng ký học lái xe mới":`${items.length} đăng ký học lái xe mới`,{
      body:`${latest.full_name} · ${latest.license_class} · ${latest.phone}`,
      tag:"new-student-registration"
    });
    notice.onclick=()=>{window.focus();openAdminDialog(true);notice.close()};
  }
}

async function load({manual=false,notify=true}={}){
  if(loading||!isAdminActive())return;
  loading=true;
  if(manual&&$("newStudentAdminError"))$("newStudentAdminError").textContent="";
  const previousIds=new Set(rows.map(item=>String(item.id)));
  const hadLoaded=loaded;
  try{
    const data=await rpc("app_admin_list_new_student_registrations",{p_token:token()});
    const next=Array.isArray(data)?data:[];
    const incoming=hadLoaded?next.filter(item=>item.status==="new"&&!previousIds.has(String(item.id))):[];
    rows=next;
    loaded=true;
    summary();
    render();
    syncNotificationUi();
    if(notify&&incoming.length)showNewRegistrationToast(incoming);
  }catch(error){
    if(manual&&$("newStudentAdminError")){
      const message=String(error?.message||"");
      $("newStudentAdminError").textContent=/app_admin_list_new_student_registrations|PGRST202|schema cache/i.test(message)?"Cần chạy file TAO-DANG-KY-HOC-LAI-XE-MOI.sql trong Supabase để kích hoạt dữ liệu.":message;
      $("newStudentAdminList").innerHTML='<div class="new-student-admin-empty">Chưa thể tải dữ liệu.</div>';
    }
  }finally{loading=false}
}

async function saveStatus(event){
  const button=event.target.closest("[data-new-save]");
  const item=event.target.closest("[data-new-id]");
  if(!button||!item)return;
  button.disabled=true;
  button.textContent="Đang lưu…";
  try{
    const updated=await rpc("app_admin_update_new_student_registration",{
      p_token:token(),
      p_registration_id:item.dataset.newId,
      p_status:item.querySelector("[data-new-status]").value,
      p_admin_note:item.querySelector("[data-new-note]").value.trim()
    });
    const index=rows.findIndex(row=>String(row.id)===String(item.dataset.newId));
    if(index>=0)rows[index]=updated;
    if(updated.status!=="new"){
      const seen=readSeenIds();
      seen.add(String(updated.id));
      writeSeenIds(seen);
    }
    summary();
    render();
    syncNotificationUi();
  }catch(error){
    $("newStudentAdminError").textContent=error?.message||"Chưa thể lưu cập nhật.";
    button.disabled=false;
    button.textContent="Lưu cập nhật";
  }
}

function exportCsv(){
  if(!rows.length)return;
  const headers=["Mã đăng ký","Họ tên","Điện thoại","Hạng","Khu vực","Ngày sinh","Ngày dự kiến","Khung liên hệ","Kênh tư vấn","Kinh nghiệm","Trạng thái","Ghi chú học viên","Ghi chú Admin","Ngày tạo"];
  const quote=value=>`"${String(value??"").replace(/"/g,'""')}"`;
  const lines=[headers.map(quote).join(","),...rows.map(item=>[item.registration_code,item.full_name,item.phone,item.license_class,item.area,item.date_of_birth,item.preferred_start_date,item.preferred_contact_time,item.consultation_channel,item.learning_history,labels[item.status]||item.status,item.note,item.admin_note,dt(item.created_at)].map(quote).join(","))];
  const blob=new Blob(["\ufeff"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;
  anchor.download=`dang-ky-hoc-lai-xe-${new Date().toISOString().slice(0,10)}.csv`;
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}

function startPolling(){
  clearInterval(pollTimer);
  pollTimer=null;
  if(!isAdminActive())return;
  load({notify:false});
  pollTimer=setInterval(()=>{
    if(document.visibilityState==="visible")load({notify:true});
  },POLL_INTERVAL);
}

function syncAdminVisibility(){
  const button=$("newStudentAdminBtn");
  if(!button)return;
  const active=isAdminActive();
  button.classList.toggle("hidden",!active);
  if(active&&!pollTimer)startPolling();
  if(!active&&pollTimer){clearInterval(pollTimer);pollTimer=null}
}

function observeAdmin(){
  const app=$("app");
  const accountName=$("accountName");
  const notificationDialog=$("notificationDialog");
  const notificationList=$("notificationList");
  const observer=new MutationObserver(syncAdminVisibility);
  if(app)observer.observe(app,{attributes:true,attributeFilter:["class"]});
  if(accountName)observer.observe(accountName,{childList:true,subtree:true,characterData:true});
  if(notificationDialog)new MutationObserver(()=>{
    if(notificationDialog.open)setTimeout(renderNotificationCard,0);
  }).observe(notificationDialog,{attributes:true,attributeFilter:["open"]});
  if(notificationList)new MutationObserver(()=>{
    if(notificationDialog?.open&&!notificationList.querySelector(".new-student-central-notice")&&pendingRows().length)setTimeout(renderNotificationCard,0);
  }).observe(notificationList,{childList:true});
  syncAdminVisibility();
}

function boot(){
  ensurePublicRegistrationLink();
  ensureUi();
  ensureNotificationBadge();
  observeAdmin();
  window.addEventListener("focus",()=>{if(isAdminActive())load({notify:true})});
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible"&&isAdminActive())load({notify:true});
  });
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
