import {SCHEDULE_FIELDS,parseScheduleFromNotes} from "./schedule-data.js";
import {markNoticesRead,readNoticeIds,studentNotifications} from "./account-notifications.js";
import QRCode from "qrcode";

const SUPABASE_URL="https://ainrsticcgpoqadiaivj.supabase.co";
const SUPABASE_KEY="sb_publishable_e3yowYg73Lcrkx6WU5StHw_telwpp1z";
const $=id=>document.getElementById(id);
let token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"",me=null,student=null,studentNotices=[],forcePasswordChange=false;

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
  const events=SCHEDULE_FIELDS.filter(field=>schedule.dates?.[field.key]).map(field=>({field,date:schedule.dates[field.key],location:schedule.locations?.[field.key]||""})).filter(event=>new Date(event.date)>=now).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,3);
  $("studentUpcoming").innerHTML=events.length?events.map(event=>`<article><span class="tone-${event.field.tone}">${event.field.icon}</span><div><strong>${esc(event.field.label)}</strong><small>${esc(date(event.date,true))}</small><em>${esc(event.location||"Chưa cập nhật địa điểm")}</em></div></article>`).join(""):`<div class="no-schedule"><span>📅</span><strong>Chưa có lịch sắp tới</strong><small>Lịch mới sẽ hiển thị tại đây khi được cập nhật.</small></div>`;
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
function renderStudentNotifications(markRead=false){
  studentNotices=studentNotifications(student);
  if(markRead)markNoticesRead(me,studentNotices);
  const read=readNoticeIds(me),unread=studentNotices.filter(notice=>!read.has(notice.id)).length;
  $("studentNotificationBadge").textContent=unread;$("studentNotificationBadge").classList.toggle("hidden",unread===0);
  $("studentNotificationSummary").textContent=`${studentNotices.length} thông báo · ${unread} chưa đọc`;
  $("studentNotificationList").innerHTML=studentNotices.length?studentNotices.map(notice=>`
    <article class="notification-item tone-${esc(notice.tone||"blue")} ${read.has(notice.id)?"is-read":""}">
      <span class="notification-icon">${esc(notice.icon||"•")}</span>
      <div><strong>${esc(notice.title)}</strong><p>${esc(notice.body)}</p>${notice.href?`<a href="${esc(notice.href)}">${esc(notice.action||"Xem chi tiết")} →</a>`:""}</div>
    </article>`).join(""):`<div class="notification-empty"><span>🔔</span><strong>Chưa có thông báo</strong><p>Các cập nhật của trung tâm sẽ hiển thị tại đây.</p></div>`;
}
$("studentNotificationBtn").onclick=()=>{$("studentNotificationDialog").showModal()};
$("studentMarkNotificationsRead").onclick=()=>{renderStudentNotifications(true);toast("Đã đánh dấu tất cả thông báo là đã đọc")};
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
    renderPortal();
    if(me.force_change_password)openPassword(true);
  }catch(error){
    clearAuth();alert(error?.message||"Phiên đăng nhập đã hết hạn.");location.replace("/");
  }
}
boot();
