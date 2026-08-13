const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
let me=null,student=null;

const PAYMENT={bank_name:"MB Bank (MBBank)",bank_bin:"970422",bank_account:"360556789999",bank_holder:"Trần Quốc Đạt"};
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=value=>new Intl.NumberFormat("vi-VN").format(Math.max(0,Number(value)||0))+" ₫";
function date(value){const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return match?`${match[3]}/${match[2]}/${match[1]}`:(value||"Chưa cập nhật")}
function showPortal(){$("studentPortal")?.classList.remove("hidden");$("studentLoading")?.classList.add("hidden")}
function clearAuth(){for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}}
function warning(message=""){
  let box=$("studentRuntimeWarning");
  if(!message){box?.remove();return}
  if(!box){box=document.createElement("div");box.id="studentRuntimeWarning";box.style.cssText="margin:14px auto;padding:12px 14px;max-width:1200px;border:1px solid #f0d5a8;border-radius:12px;background:#fff8e9;color:#76551c;font:700 12px/1.5 system-ui";$("studentPortal")?.prepend(box)}
  box.textContent=message;
}
async function rpc(fn,body={},timeoutMs=4500){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",cache:"no-store",signal:controller.signal,headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(body)});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.details||data?.error||`Không tải được ${fn}`);
    return data;
  }catch(error){if(error?.name==="AbortError")throw new Error("Kết nối dữ liệu đang chậm.");throw error}
  finally{clearTimeout(timer)}
}
function paymentReference(){const name=String(student?.name||"HOC VIEN").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").replace(/[^a-zA-Z0-9 ]/g," ").replace(/\s+/g," ").trim().toUpperCase();return`HP DTLX ${name}`.slice(0,50).trim()}
function tlv(id,value){const text=String(value);return`${id}${String(text.length).padStart(2,"0")}${text}`}
function crc16(value){let crc=0xffff;for(let i=0;i<value.length;i++){crc^=value.charCodeAt(i)<<8;for(let bit=0;bit<8;bit++)crc=(crc&0x8000)?(crc<<1)^0x1021:crc<<1;crc&=0xffff}return crc.toString(16).toUpperCase().padStart(4,"0")}
function buildQrPayload(amount,content){
  const account=tlv("00",PAYMENT.bank_bin)+tlv("01",PAYMENT.bank_account);
  const receiver=tlv("00","A000000727")+tlv("01",account)+tlv("02","QRIBFTTA");
  const base=tlv("00","01")+tlv("01","12")+tlv("38",receiver)+tlv("53","704")+tlv("54",String(Math.round(amount)))+tlv("58","VN")+tlv("62",tlv("08",content||"HOC PHI"))+"6304";
  return base+crc16(base);
}
async function renderQr(debt){
  const image=$("tuitionQr"),open=$("tuitionQrOpen");
  if(!image)return;
  if(debt<=0){image.removeAttribute("src");image.alt="Không còn học phí cần thanh toán";if(open)open.classList.add("hidden");return}
  image.removeAttribute("src");image.alt="Đang tạo mã QR đóng học phí";
  if(open){open.removeAttribute("href");open.textContent="Đang tạo mã QR…";open.classList.remove("hidden")}
  try{
    const {default:QRCode}=await import("qrcode");
    const dataUrl=await QRCode.toDataURL(buildQrPayload(debt,paymentReference()),{width:640,margin:2,errorCorrectionLevel:"M"});
    image.src=dataUrl;image.alt=`Mã QR đóng học phí ${money(debt)}`;
    if(open){open.href=dataUrl;open.textContent="Mở mã QR kích thước lớn ↗"}
  }catch(error){
    console.error("Không tạo được mã QR học phí",error);
    image.alt="Không tạo được mã QR học phí";
    if(open){open.removeAttribute("href");open.textContent="Không tạo được mã QR – tải lại trang"}
  }
}
function mountPaymentDisclosure(){
  const payment=$("studentPayment"),link=$("tuitionPaymentLink"),finance=document.querySelector('section[aria-labelledby="financeHeading"]');
  if(!payment||!link||!finance)return;
  if(!$("studentPaymentDisclosureStyles")){
    const style=document.createElement("style");style.id="studentPaymentDisclosureStyles";
    style.textContent=`
      #studentPayment.student-payment-collapsed{display:none!important}
      #studentPayment.student-payment-expanded{display:block!important;margin-top:18px;border:1px solid #d9e8f5;background:#f7fbff;box-shadow:none}
      #tuitionPaymentLink{display:inline-flex;align-items:center;gap:6px;margin-top:9px;font-weight:900;cursor:pointer}
      .student-payment-collapse{display:flex;justify-content:flex-end;margin:0 0 14px}
      .student-payment-collapse button{min-height:40px;padding:9px 14px;border:1px solid #d6e5f1;border-radius:12px;background:#fff;color:#144b78;font:800 12px/1 system-ui;cursor:pointer}
      @media(max-width:760px){#studentPayment.student-payment-expanded{margin:14px -12px 0;padding:18px 12px;border-radius:20px}.student-payment-collapse{margin-bottom:10px}.student-payment-collapse button{width:100%}}
    `;
    document.head.append(style);
  }
  const grid=finance.querySelector(".tuition-grid");
  if(grid&&payment.parentElement!==finance)grid.insertAdjacentElement("afterend",payment);
  payment.classList.remove("student-payment-expanded");payment.classList.add("student-payment-collapsed");
  let collapse=$("studentPaymentCollapse");
  if(!collapse){
    collapse=document.createElement("div");collapse.id="studentPaymentCollapse";collapse.className="student-payment-collapse";collapse.innerHTML='<button type="button">Thu gọn thông tin thanh toán ↑</button>';
    payment.prepend(collapse);
    collapse.querySelector("button").addEventListener("click",()=>setPaymentDisclosure(false));
  }
  link.textContent="Xem mã QR & thanh toán →";
  link.setAttribute("role","button");link.setAttribute("aria-controls","studentPayment");link.setAttribute("aria-expanded","false");
  link.addEventListener("click",event=>{event.preventDefault();setPaymentDisclosure(true)});
}
function setPaymentDisclosure(open,scroll=true){
  const payment=$("studentPayment"),link=$("tuitionPaymentLink");if(!payment)return;
  payment.classList.toggle("student-payment-collapsed",!open);payment.classList.toggle("student-payment-expanded",open);link?.setAttribute("aria-expanded",String(open));
  if(link)link.textContent=open?"Đang mở thông tin thanh toán ↑":"Xem mã QR & thanh toán →";
  if(open&&scroll)window.setTimeout(()=>payment.scrollIntoView({behavior:"smooth",block:"start"}),60);
  if(!open&&scroll)window.setTimeout(()=>link?.closest(".tuition-card")?.scrollIntoView({behavior:"smooth",block:"center"}),40);
}
function render(){
  if(!student)return;
  if(me&&$("studentUsername"))$("studentUsername").textContent=`${me.username||"Học viên"} · Học viên`;
  $("studentName").textContent=student.name||"Học viên";$("studentCode").textContent=student.student_code||"Chưa có mã";$("studentCourse").textContent=student.course||"Chưa có khóa";$("studentLicense").textContent=student.license_class||"Chưa có hạng";
  if(student.photo_data&&$("studentPhoto")){$("studentPhoto").src=student.photo_data;$("studentPhoto").classList.remove("hidden");$("studentPhotoPlaceholder")?.classList.add("hidden")}
  const total=Math.max(0,Number(student.tuition_total)||0),paid=Math.max(0,Number(student.paid)||0),debt=Math.max(0,total-paid),rate=total?Math.min(100,Math.round(paid/total*100)):0;
  $("tuitionTotal").textContent=money(total);$("tuitionPaid").textContent=money(paid);$("tuitionDebt").textContent=money(debt);$("tuitionRate").textContent=`Đã đóng ${rate}% tổng học phí`;$("tuitionStatus").textContent=debt?"Còn học phí cần hoàn tất":"Đã hoàn tất học phí";$("tuitionStatus").className=debt?"has-debt":"complete";$("tuitionDebtNote").textContent=debt?"Vui lòng hoàn tất theo lịch hẹn":"Không còn công nợ";
  $("paymentDebt").textContent=money(debt);$("paymentAmountBadge").textContent=debt?`Còn nợ ${money(debt)}`:"Đã hoàn tất";$("paymentAmountBadge").className=debt?"has-debt":"complete";$("paymentContent").textContent=paymentReference();$("paymentPending")?.classList.toggle("hidden",debt===0);$("paymentComplete")?.classList.toggle("hidden",debt>0);
  if($("paymentBankName"))$("paymentBankName").textContent=PAYMENT.bank_name;if($("paymentAccountNumber"))$("paymentAccountNumber").textContent=PAYMENT.bank_account;if($("paymentAccountOwner"))$("paymentAccountOwner").textContent=PAYMENT.bank_holder;
  const progress=[["▤","Hồ sơ",student.profile_status||"Chưa cập nhật"],["◉","Lý thuyết online",student.online_status||"Chưa hoàn thành"],["▣","Cabin",student.cabin_status||"Chưa hoàn thành"],["⌖","DAT",student.dat_status||"Chưa thực hiện"],["✓","Thi tốt nghiệp",student.graduation_status||"Chưa hoàn thành"],["★","Thi sát hạch",student.exam_status||"Chưa thi sát hạch"]];
  if($("studentProgress"))$("studentProgress").innerHTML=progress.map(([icon,label,status])=>`<article class="progress-card"><span>${icon}</span><div><small>${esc(label)}</small><strong>${esc(status)}</strong></div><i></i></article>`).join("");
  const profile=[["Ngày sinh",date(student.date_of_birth)],["Số CCCD",student.cccd||"Chưa cập nhật"],["Điện thoại",student.phone||"Chưa cập nhật"],["Địa chỉ",student.address||"Chưa cập nhật"],["Hạng đào tạo",student.license_class||"Chưa cập nhật"],["Sát hạch / bằng lái",student.exam_status||"Chưa thi sát hạch"],["Trạng thái hồ sơ",student.profile_status||"Chưa cập nhật"]];
  if($("studentProfile"))$("studentProfile").innerHTML=profile.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
  if($("theoryLatestExam"))$("theoryLatestExam").innerHTML="<span>i</span><p>Tiến độ lý thuyết sẽ đồng bộ sau khi Cổng học viên hoạt động ổn định.</p>";
  if($("studentPaymentHistoryList"))$("studentPaymentHistoryList").innerHTML='<div class="student-payment-empty"><span>₫</span><strong>Lịch sử phiếu thu đang tạm tải sau</strong></div>';
  if($("studentAttendanceList"))$("studentAttendanceList").innerHTML='<div class="student-attendance-empty"><span>◷</span><strong>Dữ liệu điểm danh đang tạm tải sau</strong></div>';
  if($("studentBookingRequests"))$("studentBookingRequests").innerHTML='<div class="booking-empty">Đăng ký lịch sẽ mở lại sau khi hệ thống ổn định.</div>';
  mountPaymentDisclosure();warning("");showPortal();void renderQr(debt);
}
function wire(){
  $("studentLogoutBtn")?.addEventListener("click",async()=>{try{await rpc("app_student_logout",{p_token:token},2500)}catch{}clearAuth();location.replace("/")});
  $("copyPaymentContent")?.addEventListener("click",()=>navigator.clipboard?.writeText($("paymentContent")?.textContent||"").catch(()=>{}));
  $("copyPaymentAccount")?.addEventListener("click",()=>navigator.clipboard?.writeText($("paymentAccountNumber")?.textContent||"").catch(()=>{}));
  $("studentNotificationBtn")?.addEventListener("click",()=>alert("Thông báo đang được tạm tắt trong chế độ ổn định hệ thống."));
  $("studentChangePasswordBtn")?.addEventListener("click",()=>alert("Đổi mật khẩu đang được tạm tắt trong chế độ ổn định hệ thống."));
}
async function boot(){
  showPortal();wire();
  if(!token){location.replace("/");return}
  warning("Đang đồng bộ hồ sơ học viên…");
  const [meResult,studentResult]=await Promise.allSettled([rpc("app_student_me",{p_token:token}),rpc("app_student_portal",{p_token:token})]);
  if(meResult.status==="fulfilled")me=meResult.value;if(studentResult.status==="fulfilled")student=studentResult.value;
  if(meResult.status==="rejected"&&/hết hạn|không hợp lệ|invalid|expired/i.test(meResult.reason?.message||"")){clearAuth();location.replace("/");return}
  if(student?.id){render();return}
  warning(studentResult.status==="rejected"?`${studentResult.reason.message} Trang vẫn mở; vui lòng thử tải lại.`:"Hồ sơ chưa tải được. Trang vẫn mở; vui lòng thử tải lại.")
}
boot();