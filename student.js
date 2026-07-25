import {SCHEDULE_FIELDS,parseScheduleFromNotes} from "./schedule-data.js";
import {markNoticesRead,readNoticeIds,studentNotifications} from "./account-notifications.js";
import QRCode from "qrcode";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
let token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"",me=null,student=null,trainingSessions=[],trainingRequests=[],trainingSlots=[],studentNotices=[],serverNotices=[],forcePasswordChange=false,bookingFeatureAvailable=true,slotFeatureAvailable=true,notificationTimer=null;

async function rpc(fn,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||data?.error||"Không thể kết nối máy chủ");
  return data;
}
function clearAuth(){for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}}
function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]))}
function normalize(value){return String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")}
function money(value){return new Intl.NumberFormat("vi-VN").format(Number(value||0))+" ₫"}
function paymentReference(){
  const studentName=String(student?.name||"HOC VIEN")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d")
    .replace(/[^a-zA-Z0-9 ]/g," ").replace(/\s+/g," ").trim().toUpperCase();
  return `HP DTLX ${studentName}`.slice(0,50).trim();
}
function tlv(id,value){
  const text=String(value);
  return `${id}${String(text.length).padStart(2,"0")}${text}`;
}
function crc16(value){
  let crc=0xffff;
  for(let index=0;index<value.length;index++){
    crc^=value.charCodeAt(index)<<8;
    for(let bit=0;bit<8;bit++)crc=(crc&0x8000)?(crc<<1)^0x1021:crc<<1;
    crc&=0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4,"0");
}
function tuitionQrPayload(amount,content){
  const account=tlv("00","970422")+tlv("01","360556789999");
  const receiver=tlv("00","A000000727")+tlv("01",account)+tlv("02","QRIBFTTA");
  const base=tlv("00","01")+tlv("01","12")+tlv("38",receiver)+tlv("53","704")+tlv("54",String(Math.round(amount)))+tlv("58","VN")+tlv("62",tlv("08",content))+"6304";
  return base+crc16(base);
}
function date(value,withTime=false){
  if(!value)return"Chưa cập nhật";
  const parsed=new Date(value);if(Number.isNaN(parsed.valueOf()))return String(value);
  return new Intl.DateTimeFormat("vi-VN",withTime?{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}:{day:"2-digit",month:"2-digit",year:"numeric"}).format(parsed);
}
function toast(message){$("studentToast").textContent=message;$("studentToast").classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>$("studentToast").classList.remove("show"),2800)}
function progressTone(value){
  const status=normalize(value);
  if(status.includes("thi rot"))return"fail";
  if(status.includes("dang"))return"doing";
  if(status.includes("da hoan thanh")||status==="da dau")return"done";
  return"pending";
}
const requestStatus={
  pending:{label:"Chờ Admin duyệt",className:"pending"},
  approved:{label:"Đã duyệt",className:"approved"},
  rejected:{label:"Từ chối",className:"rejected"},
  cancelled:{label:"Đã hủy",className:"cancelled"}
};
function requestField(type){return SCHEDULE_FIELDS.find(field=>field.key===type)}
async function loadTrainingRequests(){
  try{
    trainingRequests=await rpc("app_list_training_requests",{p_token:token,p_student_id:student.id})||[];
    bookingFeatureAvailable=true;
  }catch(error){
    trainingRequests=[];
    bookingFeatureAvailable=false;
    if(!/app_list_training_requests|schema cache|PGRST202/i.test(error?.message||""))throw error;
  }
  student.training_requests=trainingRequests;
}
async function loadTrainingSlots(){
  try{
    trainingSlots=await rpc("app_list_training_slots",{p_token:token,p_session_type:null})||[];
    slotFeatureAvailable=true;
  }catch(error){
    trainingSlots=[];
    slotFeatureAvailable=false;
    if(!/app_list_training_slots|schema cache|PGRST202/i.test(error?.message||""))throw error;
  }
}
function formatDuration(minutes){
  const value=Number(minutes)||0,hours=Math.floor(value/60),rest=value%60;
  return [hours?`${hours} giờ`:"",rest?`${rest} phút`:""].filter(Boolean).join(" ")||"Chưa xác định";
}
function availableSlots(type){
  return trainingSlots.filter(slot=>
    slot.session_type===type&&slot.status==="open"&&new Date(slot.starts_at)>new Date()&&Number(slot.available_count)>0
  );
}
function renderRequestSlotDetails(){
  const slot=trainingSlots.find(item=>String(item.id)===String($("requestSlot").value));
  if(!slot){
    $("requestSlotDetails").className="request-slot-details is-empty";
    $("requestSlotDetails").textContent="Hiện chưa có ca học phù hợp còn chỗ. Vui lòng quay lại sau.";
    return;
  }
  $("requestSlotDetails").className="request-slot-details";
  $("requestSlotDetails").innerHTML=`
    <strong>${esc(date(slot.starts_at,true))} · ${esc(formatDuration(slot.duration_minutes))}</strong>
    <span>⌖ ${esc(slot.location||"Địa điểm sẽ được Admin cập nhật")}</span>
    <span>👤 ${esc(slot.instructor_name||"Chưa gán giáo viên")} · 🚘 ${esc(slot.vehicle_plate||"Chưa gán xe")}</span>
    <span>✓ Còn ${Math.max(0,Number(slot.available_count)||0)} chỗ</span>`;
}
function fillSlotOptions(type){
  const slots=availableSlots(type);
  $("requestSlot").innerHTML=slots.map(slot=>
    `<option value="${slot.id}">${esc(date(slot.starts_at,true))} · còn ${Math.max(0,Number(slot.available_count)||0)} chỗ</option>`
  ).join("");
  $("requestSlot").disabled=slots.length===0;
  $("submitTrainingRequest").disabled=slots.length===0;
  renderRequestSlotDetails();
}
function renderTrainingRequests(){
  const pending=trainingRequests.filter(request=>request.status==="pending").length;
  $("bookingPendingBadge").textContent=`${pending} yêu cầu chờ duyệt`;
  $("studentBookingRequests").innerHTML=trainingRequests.length?trainingRequests.slice(0,8).map(request=>{
    const field=requestField(request.request_type)||{icon:"▣",label:"Buổi thực hành"};
    const status=requestStatus[request.status]||requestStatus.pending;
    return `<article class="booking-request">
      <span>${field.icon}</span>
      <div><strong>${esc(field.label)}</strong><small>${esc(date(request.slot_starts_at||request.requested_at,true))}</small>${request.slot_id?`<em class="slot-meta">⌖ ${esc(request.slot_location||"Chưa có địa điểm")} · 👤 ${esc(request.slot_instructor_name||"Chưa gán giáo viên")} · 🚘 ${esc(request.slot_vehicle_plate||"Chưa gán xe")}</em>`:""}${request.note?`<em>Ghi chú: ${esc(request.note)}</em>`:""}${request.admin_note?`<em>Admin: ${esc(request.admin_note)}</em>`:""}</div>
      <span class="request-status ${status.className}">${status.label}</span>
      ${request.status==="pending"?`<button class="cancel-request" type="button" data-cancel-request="${request.id}">Hủy yêu cầu</button>`:""}
    </article>`;
  }).join(""):`<div class="booking-empty">Chưa có yêu cầu đăng ký lịch thực hành.</div>`;
}
function openTrainingRequest(type){
  if(!bookingFeatureAvailable)return alert("Chức năng đăng ký đang được Admin cập nhật. Vui lòng thử lại sau.");
  $("trainingRequestForm").reset();
  $("requestType").value=type;
  $("requestType").disabled=true;
  $("trainingRequestTitle").textContent=type==="practice"?"Đăng ký học sa hình":"Đăng ký làm quen xe";
  $("trainingRequestError").textContent="";
  $("requestSlotField").classList.toggle("hidden",!slotFeatureAvailable);
  $("requestSlotDetails").classList.toggle("hidden",!slotFeatureAvailable);
  $("requestLegacyTimeField").classList.toggle("hidden",slotFeatureAvailable);
  if(slotFeatureAvailable){
    fillSlotOptions(type);
  }else{
    $("submitTrainingRequest").disabled=false;
    const now=new Date(Date.now()+30*60000),offset=now.getTimezoneOffset()*60000;
    $("requestStartsAt").min=new Date(now-offset).toISOString().slice(0,16);
  }
  $("trainingRequestDialog").showModal();
}
function renderPortal(){
  $("studentUsername").textContent=`${me.username} · Học viên`;
  $("studentName").textContent=student.name||"Học viên";
  $("studentCode").textContent=student.student_code||"Chưa có mã";
  $("studentCourse").textContent=student.course||"Chưa có khóa";
  $("studentLicense").textContent=student.license_class||"Chưa có hạng";
  if(student.photo_data){$("studentPhoto").src=student.photo_data;$("studentPhoto").classList.remove("hidden");$("studentPhotoPlaceholder").classList.add("hidden")}

  const total=Math.max(0,Number(student.tuition_total)||0),paid=Math.max(0,Number(student.paid)||0),debt=Math.max(0,total-paid),rate=total?Math.min(100,Math.round(paid/total*100)):0;
  $("tuitionTotal").textContent=money(total);$("tuitionPaid").textContent=money(paid);$("tuitionDebt").textContent=money(debt);
  $("tuitionRate").textContent=`Đã đóng ${rate}% tổng học phí`;
  $("tuitionStatus").textContent=debt?"Còn học phí cần hoàn tất":"Đã hoàn tất học phí";
  $("tuitionStatus").className=debt?"has-debt":"complete";
  $("tuitionDebtNote").textContent=debt?"Vui lòng hoàn tất theo lịch hẹn":"Không còn công nợ";
  $("tuitionPaymentLink").classList.toggle("hidden",debt===0);

  const paymentContent=paymentReference();
  $("paymentDebt").textContent=money(debt);
  $("paymentAmountBadge").textContent=debt?`Còn nợ ${money(debt)}`:"Đã hoàn tất";
  $("paymentAmountBadge").className=debt?"has-debt":"complete";
  $("paymentContent").textContent=paymentContent;
  $("paymentPending").classList.toggle("hidden",debt===0);
  $("paymentComplete").classList.toggle("hidden",debt>0);
  if(debt>0){
    QRCode.toDataURL(tuitionQrPayload(debt,paymentContent),{errorCorrectionLevel:"M",margin:2,width:480,color:{dark:"#14385e",light:"#ffffff"}})
      .then(qrUrl=>{$("tuitionQr").src=qrUrl;$("tuitionQrOpen").href=qrUrl})
      .catch(()=>toast("Không thể tạo mã QR. Vui lòng dùng thông tin chuyển khoản bên cạnh."));
  }else{
    $("tuitionQr").removeAttribute("src");
    $("tuitionQrOpen").removeAttribute("href");
  }

  const progress=[
    ["▤","Hồ sơ",student.profile_status||"Chưa cập nhật"],
    ["◉","Lý thuyết online",student.online_status||"Chưa hoàn thành"],
    ["▣","Cabin",student.cabin_status||"Chưa hoàn thành"],
    ["⌖","DAT",student.dat_status||"Chưa thực hiện"],
    ["✓","Thi tốt nghiệp",student.graduation_status||"Chưa hoàn thành"],
    ["★","Thi sát hạch",student.exam_status||"Chưa thi sát hạch"]
  ];
  $("studentProgress").innerHTML=progress.map(([icon,label,status])=>`<article class="progress-card ${progressTone(status)}"><span>${icon}</span><div><small>${esc(label)}</small><strong>${esc(status)}</strong></div><i></i></article>`).join("");

  const profile=[
    ["Ngày sinh",date(student.date_of_birth)],
    ["Số CCCD",student.cccd||"Chưa cập nhật"],
    ["Điện thoại",student.phone||"Chưa cập nhật"],
    ["Địa chỉ",student.address||"Chưa cập nhật"],
    ["Hạng đào tạo",student.license_class||"Chưa cập nhật"],
    ["Trạng thái hồ sơ",student.profile_status||"Chưa cập nhật"]
  ];
  $("studentProfile").innerHTML=profile.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");

  const schedule=parseScheduleFromNotes(student.notes||"")||{dates:{},locations:{},note:""},now=new Date();
  const fixedEvents=SCHEDULE_FIELDS.filter(field=>schedule.dates?.[field.key]).map(field=>({field,date:schedule.dates[field.key],location:schedule.locations?.[field.key]||""}));
  const repeatEvents=trainingSessions.map(session=>({
    field:SCHEDULE_FIELDS.find(field=>field.key===session.session_type),
    date:session.starts_at,
    location:session.location||""
  })).filter(event=>event.field);
  const events=[...fixedEvents,...repeatEvents].filter(event=>new Date(event.date)>=now).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,3);
  $("studentUpcoming").innerHTML=events.length?events.map(event=>`<article><span class="tone-${event.field.tone}">${event.field.icon}</span><div><strong>${esc(event.field.label)}</strong><small>${esc(date(event.date,true))}</small><em>${esc(event.location||"Chưa cập nhật địa điểm")}</em></div></article>`).join(""):`<div class="no-schedule"><span>📅</span><strong>Chưa có lịch sắp tới</strong><small>Lịch mới sẽ hiển thị tại đây khi được cập nhật.</small></div>`;
  renderTrainingRequests();
  renderStudentNotifications();
  $("studentLoading").classList.add("hidden");$("studentPortal").classList.remove("hidden");
}
$("copyPaymentContent").onclick=()=>copyPaymentValue($("paymentContent").textContent,"Đã sao chép nội dung chuyển khoản");
document.querySelectorAll(".copy-payment[data-copy]").forEach(button=>button.onclick=()=>copyPaymentValue(button.dataset.copy,"Đã sao chép số tài khoản"));
async function copyPaymentValue(value,successMessage){
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);
    else{
      const input=document.createElement("textarea");input.value=value;input.setAttribute("readonly","");input.style.position="fixed";input.style.opacity="0";document.body.appendChild(input);input.select();document.execCommand("copy");input.remove();
    }
    toast(successMessage);
  }catch{toast("Không thể sao chép. Vui lòng nhấn giữ để sao chép thủ công.")}
}
async function loadServerNotifications(){
  try{
    const rows=await rpc("app_list_notifications",{p_token:token})||[];
    serverNotices=rows.map(notice=>({...notice,id:`server-${notice.id}`,server_id:String(notice.id)}));
  }catch(error){
    serverNotices=[];
  }
}
function isNoticeRead(notice,read){return notice.server_id?Boolean(notice.read_at):read.has(notice.id)}
function renderStudentNotifications(){
  const local=studentNotifications(student),serverKeys=new Set(serverNotices.map(notice=>`${notice.title}|${notice.body}`));
  studentNotices=[...serverNotices,...local.filter(notice=>!serverKeys.has(`${notice.title}|${notice.body}`))];
  const read=readNoticeIds(me),unread=studentNotices.filter(notice=>!isNoticeRead(notice,read)).length;
  $("studentNotificationBadge").textContent=unread;$("studentNotificationBadge").classList.toggle("hidden",unread===0);
  $("studentNotificationSummary").textContent=`${studentNotices.length} thông báo · ${unread} chưa đọc`;
  $("studentNotificationList").innerHTML=studentNotices.length?studentNotices.map(notice=>`
    <article class="notification-item tone-${esc(notice.tone||"blue")} ${isNoticeRead(notice,read)?"is-read":""}">
      <span class="notification-icon">${esc(notice.icon||"•")}</span>
      <div><strong>${esc(notice.title)}</strong><p>${esc(notice.body)}</p>${notice.href?`<a href="${esc(notice.href)}">${esc(notice.action||"Xem chi tiết")} →</a>`:""}</div>
    </article>`).join(""):`<div class="notification-empty"><span>🔔</span><strong>Chưa có thông báo</strong><p>Các cập nhật của trung tâm sẽ hiển thị tại đây.</p></div>`;
}
$("studentNotificationBtn").onclick=async()=>{
  await loadServerNotifications();renderStudentNotifications();
  $("studentNotificationDialog").showModal();
};
$("studentMarkNotificationsRead").onclick=async()=>{
  const serverIds=serverNotices.filter(notice=>!notice.read_at).map(notice=>notice.server_id);
  try{
    if(serverIds.length)await rpc("app_mark_notifications_read",{p_token:token,p_ids:serverIds});
    const now=new Date().toISOString();serverNotices.forEach(notice=>notice.read_at=notice.read_at||now);
    markNoticesRead(me,studentNotices.filter(notice=>!notice.server_id));
    renderStudentNotifications();toast("Đã đánh dấu tất cả thông báo là đã đọc");
  }catch(error){toast(error?.message||"Không thể cập nhật thông báo.")}
};
document.querySelectorAll("[data-booking-type]").forEach(button=>button.onclick=()=>openTrainingRequest(button.dataset.bookingType));
$("requestSlot").onchange=renderRequestSlotDetails;
$("trainingRequestForm").onsubmit=async event=>{
  event.preventDefault();$("trainingRequestError").textContent="";
  const slotId=$("requestSlot").value,startsAt=$("requestStartsAt").value;
  if(slotFeatureAvailable&&!slotId)return $("trainingRequestError").textContent="Hiện chưa có ca học phù hợp còn chỗ.";
  if(!slotFeatureAvailable&&!startsAt)return $("trainingRequestError").textContent="Vui lòng chọn ngày và giờ mong muốn.";
  $("submitTrainingRequest").disabled=true;
  try{
    if(slotFeatureAvailable){
      await rpc("app_student_create_training_request_slot",{
        p_token:token,p_slot_id:slotId,p_note:$("requestNote").value.trim()
      });
    }else{
      await rpc("app_student_create_training_request",{
        p_token:token,p_request_type:$("requestType").value,
        p_requested_at:new Date(startsAt).toISOString(),p_note:$("requestNote").value.trim()
      });
    }
    await Promise.all([loadTrainingRequests(),loadTrainingSlots()]);
    $("trainingRequestDialog").close();renderTrainingRequests();renderStudentNotifications();toast("Đã gửi yêu cầu đến Admin");
  }catch(error){$("trainingRequestError").textContent=error?.message||"Không thể gửi yêu cầu đăng ký."}
  finally{if(!slotFeatureAvailable||availableSlots($("requestType").value).length)$("submitTrainingRequest").disabled=false}
};
$("studentBookingRequests").onclick=async event=>{
  const requestId=event.target.dataset.cancelRequest;
  if(!requestId||!confirm("Hủy yêu cầu đăng ký đang chờ Admin duyệt?"))return;
  event.target.disabled=true;
  try{
    await rpc("app_student_cancel_training_request",{p_token:token,p_request_id:requestId});
    await Promise.all([loadTrainingRequests(),loadTrainingSlots()]);renderTrainingRequests();renderStudentNotifications();toast("Đã hủy yêu cầu");
  }catch(error){toast(error?.message||"Không thể hủy yêu cầu.")}
  finally{event.target.disabled=false}
};
function openPassword(forced=false){
  forcePasswordChange=forced;
  $("studentPasswordNotice").textContent=forced?"Đây là lần đăng nhập đầu tiên. Vui lòng đổi mật khẩu trước khi xem thông tin.":"Mật khẩu mới phải có ít nhất 8 ký tự.";
  $("studentPasswordClose").classList.toggle("hidden",forced);$("studentPasswordCancel").classList.toggle("hidden",forced);
  $("studentPasswordError").textContent="";$("studentPasswordDialog").showModal();
}
$("studentChangePasswordBtn").onclick=()=>openPassword(false);
document.querySelectorAll(".dialog-close").forEach(button=>button.onclick=()=>{if(!forcePasswordChange)button.closest("dialog").close()});
$("studentPasswordDialog").addEventListener("cancel",event=>{if(forcePasswordChange)event.preventDefault()});
$("studentPasswordForm").onsubmit=async event=>{
  event.preventDefault();$("studentPasswordError").textContent="";
  if($("studentNewPassword").value!==$("studentConfirmPassword").value)return $("studentPasswordError").textContent="Hai lần nhập mật khẩu mới không giống nhau.";
  $("studentSavePasswordBtn").disabled=true;
  try{
    await rpc("app_student_change_password",{p_token:token,p_old_password:$("studentOldPassword").value,p_new_password:$("studentNewPassword").value});
    forcePasswordChange=false;me.force_change_password=false;$("studentPasswordDialog").close();event.target.reset();toast("Đã đổi mật khẩu thành công");
  }catch(error){$("studentPasswordError").textContent=error?.message||"Không thể đổi mật khẩu."}
  finally{$("studentSavePasswordBtn").disabled=false}
};
$("studentLogoutBtn").onclick=async()=>{
  try{await rpc("app_student_logout",{p_token:token})}catch{}
  clearAuth();location.replace("/");
};
async function boot(){
  if(!token)return location.replace("/");
  try{
    me=await rpc("app_student_me",{p_token:token});
    student=await rpc("app_student_portal",{p_token:token});
    if(!me?.id||!student?.id)throw new Error("Không tìm thấy hồ sơ học viên.");
    try{
      trainingSessions=await rpc("app_list_training_sessions",{p_token:token,p_student_id:student.id})||[];
    }catch(error){
      if(!/app_list_training_sessions|schema cache|PGRST202/i.test(error?.message||""))throw error;
      trainingSessions=[];
    }
    await Promise.all([loadTrainingRequests(),loadTrainingSlots(),loadServerNotifications()]);
    student.training_sessions=trainingSessions;
    renderPortal();
    notificationTimer=setInterval(async()=>{
      if(document.visibilityState!=="visible")return;
      try{await loadServerNotifications();renderStudentNotifications()}catch{}
    },60000);
    if(me.force_change_password)openPassword(true);
  }catch(error){
    clearAuth();alert(error?.message||"Phiên đăng nhập đã hết hạn.");location.replace("/");
  }
}
boot();
