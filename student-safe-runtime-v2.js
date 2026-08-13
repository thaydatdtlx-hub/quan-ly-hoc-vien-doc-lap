const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
let me=null,student=null;

const money=value=>new Intl.NumberFormat("vi-VN").format(Math.max(0,Number(value)||0))+" ₫";
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function date(value){if(!value)return"Chưa cập nhật";const m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(value)}
function showPortal(){$("studentPortal")?.classList.remove("hidden");$("studentLoading")?.classList.add("hidden")}
function warning(message){showPortal();let box=$("studentRuntimeWarning");if(!box){box=document.createElement("div");box.id="studentRuntimeWarning";box.style.cssText="margin:14px auto;padding:12px 14px;max-width:1200px;border:1px solid #f0d5a8;border-radius:12px;background:#fff8e9;color:#76551c;font:700 12px/1.5 system-ui";$("studentPortal")?.prepend(box)}box.textContent=message}
function clearWarning(){$("studentRuntimeWarning")?.remove()}
function isAuthError(error){return /hết hạn|không hợp lệ|invalid|expired|không phải tài khoản học viên/i.test(error?.message||"")}

async function rpc(fn,body={},timeoutMs=5500){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json","Cache-Control":"no-store"},cache:"no-store",signal:controller.signal,body:JSON.stringify(body)});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.details||data?.error||`Không tải được ${fn}`);
    return data;
  }catch(error){
    if(error?.name==="AbortError")throw new Error("Kết nối dữ liệu đang chậm. Vui lòng thử lại sau vài giây.");
    throw error;
  }finally{clearTimeout(timer)}
}

function renderCore(){
  if(!student)return;
  if(me)$("studentUsername").textContent=`${me.username||"Học viên"} · Học viên`;
  $("studentName").textContent=student.name||"Học viên";
  $("studentCode").textContent=student.student_code||"Chưa có mã";
  $("studentCourse").textContent=student.course||"Chưa có khóa";
  $("studentLicense").textContent=student.license_class||"Chưa có hạng";
  if(student.photo_data&&$("studentPhoto")){$("studentPhoto").src=student.photo_data;$("studentPhoto").classList.remove("hidden");$("studentPhotoPlaceholder")?.classList.add("hidden")}
  const total=Math.max(0,Number(student.tuition_total)||0),paid=Math.max(0,Number(student.paid)||0),debt=Math.max(0,total-paid),rate=total?Math.min(100,Math.round(paid/total*100)):0;
  $("tuitionTotal").textContent=money(total);$("tuitionPaid").textContent=money(paid);$("tuitionDebt").textContent=money(debt);$("tuitionRate").textContent=`Đã đóng ${rate}% tổng học phí`;
  $("tuitionStatus").textContent=debt?"Còn học phí cần hoàn tất":"Đã hoàn tất học phí";$("tuitionStatus").className=debt?"has-debt":"complete";$("tuitionDebtNote").textContent=debt?"Vui lòng hoàn tất theo lịch hẹn":"Không còn công nợ";$("tuitionPaymentLink")?.classList.toggle("hidden",debt===0);
  $("paymentDebt").textContent=money(debt);$("paymentAmountBadge").textContent=debt?`Còn nợ ${money(debt)}`:"Đã hoàn tất";$("paymentAmountBadge").className=debt?"has-debt":"complete";
  const name=String(student.name||"HOC VIEN").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").replace(/[^a-zA-Z0-9 ]/g," ").replace(/\s+/g," ").trim().toUpperCase();
  $("paymentContent").textContent=`HP DTLX ${name}`.slice(0,50).trim();
  $("paymentPending")?.classList.toggle("hidden",debt===0);$("paymentComplete")?.classList.toggle("hidden",debt>0);
  const progress=[["▤","Hồ sơ",student.profile_status||"Chưa cập nhật"],["◉","Lý thuyết online",student.online_status||"Chưa hoàn thành"],["▣","Cabin",student.cabin_status||"Chưa hoàn thành"],["⌖","DAT",student.dat_status||"Chưa thực hiện"],["✓","Thi tốt nghiệp",student.graduation_status||"Chưa hoàn thành"],["★","Thi sát hạch",student.exam_status||"Chưa thi sát hạch"]];
  if($("studentProgress"))$("studentProgress").innerHTML=progress.map(([icon,label,status])=>`<article class="progress-card"><span>${icon}</span><div><small>${esc(label)}</small><strong>${esc(status)}</strong></div><i></i></article>`).join("");
  const profile=[["Ngày sinh",date(student.date_of_birth)],["Số CCCD",student.cccd||"Chưa cập nhật"],["Điện thoại",student.phone||"Chưa cập nhật"],["Địa chỉ",student.address||"Chưa cập nhật"],["Hạng đào tạo",student.license_class||"Chưa cập nhật"],["Sát hạch / bằng lái",student.exam_status||"Chưa thi sát hạch"],["Trạng thái hồ sơ",student.profile_status||"Chưa cập nhật"]];
  if($("studentProfile"))$("studentProfile").innerHTML=profile.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
  clearWarning();showPortal();
  if(debt>0)void import("qrcode").then(({default:QRCode})=>QRCode.toDataURL(buildQrPayload(debt,$("paymentContent")?.textContent||"HOC PHI"),{width:420,margin:2,errorCorrectionLevel:"M"})).then(url=>{$("tuitionQr").src=url;if($("tuitionQrOpen"))$("tuitionQrOpen").href=url}).catch(()=>{});
}
function tlv(id,value){const text=String(value);return`${id}${String(text.length).padStart(2,"0")}${text}`}
function crc16(value){let crc=0xffff;for(let i=0;i<value.length;i++){crc^=value.charCodeAt(i)<<8;for(let bit=0;bit<8;bit++)crc=(crc&0x8000)?(crc<<1)^0x1021:crc<<1;crc&=0xffff}return crc.toString(16).toUpperCase().padStart(4,"0")}
function buildQrPayload(amount,content){const account=tlv("00","970422")+tlv("01","360556789999"),receiver=tlv("00","A000000727")+tlv("01",account)+tlv("02","QRIBFTTA"),base=tlv("00","01")+tlv("01","12")+tlv("38",receiver)+tlv("53","704")+tlv("54",String(Math.round(amount)))+tlv("58","VN")+tlv("62",tlv("08",content))+"6304";return base+crc16(base)}

async function loadOptional(){
  const jobs=[
    ["app_student_get_theory_progress",{},v=>{const s=v||{};$("theoryLearned").textContent=`${Number(s.answered_count)||0}/600`;$("theoryCorrect").textContent=`${Number(s.correct_count)||0} câu`;$("theoryExamCount").textContent=`${Number(s.exam_count)||0} lần`;$("theoryBestScore").textContent=s.best_total?`${s.best_score}/${s.best_total}`:"Chưa thi"}],
    ["app_student_list_payments",{},v=>{$("studentPaymentHistoryCount").textContent=`${Array.isArray(v)?v.length:0} phiếu thu`}],
    ["app_student_list_attendance",{},v=>{$("studentAttendanceSessions").textContent=Array.isArray(v)?v.length:0}],
    ["app_list_training_sessions",{p_student_id:student.id},v=>{if($("studentUpcoming")&&!Array.isArray(v)||!v?.length)return;$("studentUpcoming").innerHTML=v.slice(0,3).map(x=>`<article><span>▣</span><div><strong>${esc(x.session_type||"Lịch học")}</strong><small>${esc(x.starts_at||"")}</small><em>${esc(x.location||"Chưa cập nhật địa điểm")}</em></div></article>`).join("")}]
  ];
  await Promise.allSettled(jobs.map(([fn,body,render])=>rpc(fn,{p_token:token,...body},4500).then(render)));
}
function wire(){
  $("studentLogoutBtn")?.addEventListener("click",async()=>{try{await rpc("app_student_logout",{p_token:token},3000)}catch{}for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}location.replace("/")});
  $("copyPaymentContent")?.addEventListener("click",()=>navigator.clipboard?.writeText($("paymentContent")?.textContent||"").catch(()=>{}));
  $("copyPaymentAccount")?.addEventListener("click",()=>navigator.clipboard?.writeText($("paymentAccountNumber")?.textContent||"").catch(()=>{}));
  document.querySelectorAll(".dialog-close").forEach(button=>button.addEventListener("click",()=>button.closest("dialog")?.close()));
}

async function boot(){
  showPortal();wire();
  if(!token){location.replace("/");return}
  warning("Đang đồng bộ dữ liệu học viên… Bạn vẫn có thể sử dụng các chức năng trên trang.");
  const [meResult,studentResult]=await Promise.allSettled([rpc("app_student_me",{p_token:token},5000),rpc("app_student_portal",{p_token:token},5000)]);
  if(meResult.status==="fulfilled")me=meResult.value;
  if(studentResult.status==="fulfilled")student=studentResult.value;
  if(meResult.status==="rejected"&&isAuthError(meResult.reason)){
    for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}
    location.replace("/");return;
  }
  if(student?.id){renderCore();void loadOptional();return}
  warning(studentResult.status==="rejected"?studentResult.reason.message:"Hồ sơ chưa tải được. Trang vẫn mở; vui lòng thử lại sau vài giây.");
}
boot();