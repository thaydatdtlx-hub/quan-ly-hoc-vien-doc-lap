import QRCode from "qrcode";
import {SCHEDULE_FIELDS,parseScheduleFromNotes} from "./schedule-data.js";
import {attendanceStatusLabel,attendanceSummary,attendanceTypeLabel,formatAttendanceDuration} from "./attendance-utils.js";
import {paymentMethodLabel} from "./payment-receipt.js";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
let me=null,student=null,trainingSessions=[],trainingRequests=[],trainingSlots=[],payments=[],attendance=[],theory=null;

const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const normalize=value=>String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
const money=value=>new Intl.NumberFormat("vi-VN").format(Math.max(0,Number(value)||0))+" ₫";
function date(value,withTime=false){
  if(!value)return"Chưa cập nhật";
  const m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m&&!withTime)return`${m[3]}/${m[2]}/${m[1]}`;
  const d=new Date(value);if(Number.isNaN(d.valueOf()))return String(value);
  return new Intl.DateTimeFormat("vi-VN",withTime?{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}:{day:"2-digit",month:"2-digit",year:"numeric"}).format(d);
}
async function rpc(fn,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json","Cache-Control":"no-store"},cache:"no-store",body:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||data?.error||`Không tải được ${fn}`);
  return data;
}
function showPortal(){
  $("studentPortal")?.classList.remove("hidden");
  $("studentLoading")?.classList.add("hidden");
}
function showLoadWarning(message){
  showPortal();
  let box=$("studentRuntimeWarning");
  if(!box){
    box=document.createElement("div");box.id="studentRuntimeWarning";
    box.style.cssText="margin:14px auto;padding:12px 14px;max-width:1200px;border:1px solid #f0d5a8;border-radius:12px;background:#fff8e9;color:#76551c;font:700 12px/1.5 system-ui";
    $("studentPortal")?.prepend(box);
  }
  box.textContent=message;
}
function paymentReference(){
  const name=String(student?.name||"HOC VIEN").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").replace(/[^a-zA-Z0-9 ]/g," ").replace(/\s+/g," ").trim().toUpperCase();
  return `HP DTLX ${name}`.slice(0,50).trim();
}
function tlv(id,value){const text=String(value);return`${id}${String(text.length).padStart(2,"0")}${text}`}
function crc16(value){let crc=0xffff;for(let i=0;i<value.length;i++){crc^=value.charCodeAt(i)<<8;for(let bit=0;bit<8;bit++)crc=(crc&0x8000)?(crc<<1)^0x1021:crc<<1;crc&=0xffff}return crc.toString(16).toUpperCase().padStart(4,"0")}
function qrPayload(amount,content){const account=tlv("00","970422")+tlv("01","360556789999"),receiver=tlv("00","A000000727")+tlv("01",account)+tlv("02","QRIBFTTA"),base=tlv("00","01")+tlv("01","12")+tlv("38",receiver)+tlv("53","704")+tlv("54",String(Math.round(amount)))+tlv("58","VN")+tlv("62",tlv("08",content))+"6304";return base+crc16(base)}
function progressTone(value){const n=normalize(value);if(n.includes("rot"))return"fail";if(n.includes("dang"))return"doing";if(n.includes("hoan thanh")||n==="da dau"||n.includes("nhan bang"))return"done";return"pending"}
function renderCore(){
  if(!student||!me)return;
  $("studentUsername").textContent=`${me.username||"Học viên"} · Học viên`;
  $("studentName").textContent=student.name||"Học viên";
  $("studentCode").textContent=student.student_code||"Chưa có mã";
  $("studentCourse").textContent=student.course||"Chưa có khóa";
  $("studentLicense").textContent=student.license_class||"Chưa có hạng";
  if(student.photo_data&&$("studentPhoto")){$("studentPhoto").src=student.photo_data;$("studentPhoto").classList.remove("hidden");$("studentPhotoPlaceholder")?.classList.add("hidden")}

  const total=Math.max(0,Number(student.tuition_total)||0),paid=Math.max(0,Number(student.paid)||0),debt=Math.max(0,total-paid),rate=total?Math.min(100,Math.round(paid/total*100)):0;
  $("tuitionTotal").textContent=money(total);$("tuitionPaid").textContent=money(paid);$("tuitionDebt").textContent=money(debt);$("tuitionRate").textContent=`Đã đóng ${rate}% tổng học phí`;
  $("tuitionStatus").textContent=debt?"Còn học phí cần hoàn tất":"Đã hoàn tất học phí";$("tuitionStatus").className=debt?"has-debt":"complete";$("tuitionDebtNote").textContent=debt?"Vui lòng hoàn tất theo lịch hẹn":"Không còn công nợ";$("tuitionPaymentLink")?.classList.toggle("hidden",debt===0);
  $("paymentDebt").textContent=money(debt);$("paymentAmountBadge").textContent=debt?`Còn nợ ${money(debt)}`:"Đã hoàn tất";$("paymentAmountBadge").className=debt?"has-debt":"complete";$("paymentContent").textContent=paymentReference();$("paymentPending")?.classList.toggle("hidden",debt===0);$("paymentComplete")?.classList.toggle("hidden",debt>0);
  if(debt>0&&$("tuitionQr"))QRCode.toDataURL(qrPayload(debt,paymentReference()),{width:480,margin:2,errorCorrectionLevel:"M"}).then(url=>{$("tuitionQr").src=url;if($("tuitionQrOpen"))$("tuitionQrOpen").href=url}).catch(()=>{});

  const schedule=parseScheduleFromNotes(student.notes||"")||{dates:{},locations:{}};
  const progress=[["▤","Hồ sơ",student.profile_status||"Chưa cập nhật",""],["◉","Lý thuyết online",student.online_status||"Chưa hoàn thành",""],["▣","Cabin",student.cabin_status||"Chưa hoàn thành",""],["⌖","DAT",student.dat_status||"Chưa thực hiện",""],["✓","Thi tốt nghiệp",student.graduation_status||"Chưa hoàn thành",""],["★","Thi sát hạch",student.exam_status||"Chưa thi sát hạch",""]];
  $("studentProgress").innerHTML=progress.map(([icon,label,status])=>`<article class="progress-card ${progressTone(status)}"><span>${icon}</span><div><small>${esc(label)}</small><strong>${esc(status)}</strong></div><i></i></article>`).join("");
  const profile=[["Ngày sinh",date(student.date_of_birth)],["Số CCCD",student.cccd||"Chưa cập nhật"],["Điện thoại",student.phone||"Chưa cập nhật"],["Địa chỉ",student.address||"Chưa cập nhật"],["Hạng đào tạo",student.license_class||"Chưa cập nhật"],["Sát hạch / bằng lái",student.exam_status||"Chưa thi sát hạch"],["Trạng thái hồ sơ",student.profile_status||"Chưa cập nhật"]];
  $("studentProfile").innerHTML=profile.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
  showPortal();
}
function renderTheory(){const s=theory||{};$("theoryLearned").textContent=`${Number(s.answered_count)||0}/600`;$("theoryCorrect").textContent=`${Number(s.correct_count)||0} câu`;$("theoryExamCount").textContent=`${Number(s.exam_count)||0} lần`;$("theoryBestScore").textContent=s.best_total?`${s.best_score}/${s.best_total}`:"Chưa thi"}
function renderPayments(){if(!$("studentPaymentHistoryList"))return;$("studentPaymentHistoryCount").textContent=`${payments.length} phiếu thu`;$("studentPaymentHistoryList").innerHTML=payments.length?payments.map(p=>`<article class="student-payment-item"><span class="student-payment-icon">✓</span><div><strong>${esc(p.receipt_no)}</strong><small>${esc(date(p.payment_date))} · ${esc(paymentMethodLabel(p.payment_method))}</small><em>${esc(p.note||"Thu học phí")}</em></div><b>${money(p.amount)}</b></article>`).join(""):`<div class="student-payment-empty"><span>₫</span><strong>Chưa có phiếu thu</strong></div>`}
function renderAttendance(){if(!$("studentAttendanceList"))return;const s=attendanceSummary(attendance);$("studentAttendanceRate").textContent=`${s.rate}% chuyên cần`;$("studentAttendanceSessions").textContent=s.sessions;$("studentAttendancePresent").textContent=s.present;$("studentAttendanceHours").textContent=formatAttendanceDuration(s.actualMinutes);$("studentAttendanceAbsent").textContent=`${s.absent} / ${s.excused}`;$("studentAttendanceList").innerHTML=attendance.length?attendance.slice(0,30).map(r=>`<article class="student-attendance-item status-${esc(r.status)}"><span class="student-attendance-date"><b>${esc(date(r.session_date))}</b><small>${esc(attendanceTypeLabel(r.session_type))}</small></span><div><strong>${esc(attendanceStatusLabel(r.status))}</strong><small>${esc(formatAttendanceDuration(r.actual_minutes))}</small></div></article>`).join(""):`<div class="student-attendance-empty"><span>◷</span><strong>Chưa có dữ liệu điểm danh</strong></div>`}
function renderSchedule(){if(!$("studentUpcoming"))return;const schedule=parseScheduleFromNotes(student.notes||"")||{dates:{},locations:{}};const fixed=SCHEDULE_FIELDS.filter(f=>schedule.dates?.[f.key]).map(f=>({field:f,date:schedule.dates[f.key],location:schedule.locations?.[f.key]||""}));const repeat=trainingSessions.map(s=>({field:SCHEDULE_FIELDS.find(f=>f.key===s.session_type),date:s.starts_at,location:s.location||""})).filter(x=>x.field);const now=new Date(),events=[...fixed,...repeat].filter(x=>new Date(x.date)>=now).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,3);$("studentUpcoming").innerHTML=events.length?events.map(e=>`<article><span class="tone-${e.field.tone}">${e.field.icon}</span><div><strong>${esc(e.field.label)}</strong><small>${esc(date(e.date,true))}</small><em>${esc(e.location||"Chưa cập nhật địa điểm")}</em></div></article>`).join(""):`<div class="no-schedule"><span>📅</span><strong>Chưa có lịch sắp tới</strong></div>`}
function renderRequests(){if(!$("studentBookingRequests"))return;const pending=trainingRequests.filter(r=>r.status==="pending").length;$("bookingPendingBadge").textContent=`${pending} yêu cầu chờ duyệt`;$("studentBookingRequests").innerHTML=trainingRequests.length?trainingRequests.slice(0,8).map(r=>`<article class="booking-request"><span>▣</span><div><strong>${esc(SCHEDULE_FIELDS.find(f=>f.key===r.request_type)?.label||"Buổi thực hành")}</strong><small>${esc(date(r.slot_starts_at||r.requested_at,true))}</small></div><span class="request-status ${esc(r.status)}">${esc(r.status||"pending")}</span></article>`).join(""):`<div class="booking-empty">Chưa có yêu cầu đăng ký lịch thực hành.</div>`}
async function loadOptional(){
  const jobs=[
    rpc("app_list_training_sessions",{p_token:token,p_student_id:student.id}).then(v=>{trainingSessions=Array.isArray(v)?v:[];renderSchedule()}),
    rpc("app_list_training_requests",{p_token:token,p_student_id:student.id}).then(v=>{trainingRequests=Array.isArray(v)?v:[];renderRequests()}),
    rpc("app_list_training_slots",{p_token:token,p_session_type:null}).then(v=>{trainingSlots=Array.isArray(v)?v:[]}),
    rpc("app_student_get_theory_progress",{p_token:token}).then(v=>{theory=v||{};renderTheory()}),
    rpc("app_student_list_payments",{p_token:token}).then(v=>{payments=Array.isArray(v)?v:[];renderPayments()}),
    rpc("app_student_list_attendance",{p_token:token}).then(v=>{attendance=Array.isArray(v)?v:[];renderAttendance()})
  ];
  await Promise.allSettled(jobs);
}
function wireActions(){
  $("studentLogoutBtn")?.addEventListener("click",async()=>{try{await rpc("app_student_logout",{p_token:token})}catch{}for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}location.replace("/")});
  $("copyPaymentContent")?.addEventListener("click",()=>navigator.clipboard?.writeText($("paymentContent")?.textContent||"").catch(()=>{}));
  $("copyPaymentAccount")?.addEventListener("click",()=>navigator.clipboard?.writeText($("paymentAccountNumber")?.textContent||"").catch(()=>{}));
  document.querySelectorAll("[data-booking-type]").forEach(button=>button.addEventListener("click",()=>{$("requestType").value=button.dataset.bookingType;$("trainingRequestDialog")?.showModal()}));
  document.querySelectorAll(".dialog-close").forEach(button=>button.addEventListener("click",()=>button.closest("dialog")?.close()));
}
async function boot(){
  if(!token){location.replace("/");return}
  try{
    me=await rpc("app_student_me",{p_token:token});
    if(me?.role!=="student")throw new Error("Phiên đăng nhập không phải tài khoản học viên.");
  }catch(error){
    for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}
    alert(error?.message||"Phiên đăng nhập đã hết hạn.");location.replace("/");return;
  }
  try{
    student=await rpc("app_student_portal",{p_token:token});
    if(!student?.id)throw new Error("Không tìm thấy hồ sơ học viên.");
    renderCore();wireActions();
    void loadOptional();
  }catch(error){
    showLoadWarning(`Tài khoản đã xác thực nhưng hồ sơ chưa tải được: ${error?.message||"Lỗi không xác định"}. Vui lòng tải lại trang; phiên đăng nhập vẫn được giữ.`);
  }
}
boot();