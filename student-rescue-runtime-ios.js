import {studentRpc} from "./student-rpc-client.js";

const $=id=>document.getElementById(id);
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
let student=null;

const PAYMENT={bank_name:"MB Bank (MBBank)",bank_bin:"970422",bank_account:"360556789999",bank_holder:"Trần Quốc Đạt"};
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=value=>new Intl.NumberFormat("vi-VN").format(Math.max(0,Number(value)||0))+" ₫";
const setText=(id,value)=>{const node=$(id);if(node)node.textContent=value};
function date(value){const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return match?`${match[3]}/${match[2]}/${match[1]}`:(value||"Chưa cập nhật")}
function showPortal(){$("studentPortal")?.classList.remove("hidden");$("studentLoading")?.classList.add("hidden")}
function clearAuth(){for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}}
function warning(message="",retry=false){
  let box=$("studentRuntimeWarning");
  if(!message){box?.remove();return}
  if(!box){box=document.createElement("div");box.id="studentRuntimeWarning";box.style.cssText="margin:14px auto;padding:12px 14px;max-width:1200px;border:1px solid #f0d5a8;border-radius:12px;background:#fff8e9;color:#76551c;font:700 12px/1.5 system-ui";$("studentPortal")?.prepend(box)}
  box.innerHTML="";
  const text=document.createElement("span");text.textContent=message;box.append(text);
  if(retry){const button=document.createElement("button");button.type="button";button.textContent=" Thử lại";button.style.cssText="margin-left:8px;border:0;border-radius:8px;padding:7px 10px;background:#0b74de;color:#fff;font:800 11px system-ui";button.onclick=()=>boot(true);box.append(button)}
}
async function rpcReliable(fn,body){
  return studentRpc(fn,body,{proxyTimeoutMs:9500,directTimeoutMs:6500});
}
function paymentReference(){const name=String(student?.name||"HOC VIEN").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").replace(/[^a-zA-Z0-9 ]/g," ").replace(/\s+/g," ").trim().toUpperCase();return`HP DTLX ${name}`.slice(0,50).trim()}
function tlv(id,value){const text=String(value);return`${id}${String(text.length).padStart(2,"0")}${text}`}
function crc16(value){let crc=0xffff;for(let i=0;i<value.length;i++){crc^=value.charCodeAt(i)<<8;for(let bit=0;bit<8;bit++)crc=(crc&0x8000)?(crc<<1)^0x1021:crc<<1;crc&=0xffff}return crc.toString(16).toUpperCase().padStart(4,"0")}
function buildQrPayload(amount,content){const account=tlv("00",PAYMENT.bank_bin)+tlv("01",PAYMENT.bank_account);const receiver=tlv("00","A000000727")+tlv("01",account)+tlv("02","QRIBFTTA");const base=tlv("00","01")+tlv("01","12")+tlv("38",receiver)+tlv("53","704")+tlv("54",String(Math.round(amount)))+tlv("58","VN")+tlv("62",tlv("08",content||"HOC PHI"))+"6304";return base+crc16(base)}
async function renderQr(debt){
  const image=$("tuitionQr"),open=$("tuitionQrOpen");if(!image)return;
  if(debt<=0){image.removeAttribute("src");if(open)open.classList.add("hidden");return}
  try{const {default:QRCode}=await import("qrcode");const dataUrl=await QRCode.toDataURL(buildQrPayload(debt,paymentReference()),{width:640,margin:2,errorCorrectionLevel:"M"});image.src=dataUrl;if(open){open.href=dataUrl;open.textContent="Mở mã QR kích thước lớn ↗";open.classList.remove("hidden")}}
  catch(error){console.warn("[student-ios] QR unavailable",error)}
}
function setPaymentDisclosure(open,scroll=true){const payment=$("studentPayment"),link=$("tuitionPaymentLink");if(!payment)return;payment.classList.toggle("student-payment-collapsed",!open);payment.classList.toggle("student-payment-expanded",open);link?.setAttribute("aria-expanded",String(open));if(link)link.textContent=open?"Đang mở thông tin thanh toán ↑":"Xem mã QR & thanh toán →";if(open&&scroll)setTimeout(()=>payment.scrollIntoView({behavior:"smooth",block:"start"}),60)}
function mountPaymentDisclosure(){
  const payment=$("studentPayment"),link=$("tuitionPaymentLink"),finance=document.querySelector('section[aria-labelledby="financeHeading"]');if(!payment||!link||!finance)return;
  if(!$("studentPaymentDisclosureStyles")){const style=document.createElement("style");style.id="studentPaymentDisclosureStyles";style.textContent="#studentPayment.student-payment-collapsed{display:none!important}#studentPayment.student-payment-expanded{display:block!important;margin-top:18px}.student-payment-collapse{display:flex;justify-content:flex-end;margin:0 0 14px}.student-payment-collapse button{min-height:40px;padding:9px 14px;border:1px solid #d6e5f1;border-radius:12px;background:#fff;color:#144b78;font:800 12px system-ui}";document.head.append(style)}
  const grid=finance.querySelector(".tuition-grid");if(grid&&payment.parentElement!==finance)grid.insertAdjacentElement("afterend",payment);
  payment.classList.remove("student-payment-expanded");payment.classList.add("student-payment-collapsed");
  if(!$("studentPaymentCollapse")){const collapse=document.createElement("div");collapse.id="studentPaymentCollapse";collapse.className="student-payment-collapse";collapse.innerHTML='<button type="button">Thu gọn thông tin thanh toán ↑</button>';payment.prepend(collapse);collapse.querySelector("button")?.addEventListener("click",()=>setPaymentDisclosure(false))}
  link.textContent="Xem mã QR & thanh toán →";link.setAttribute("role","button");link.setAttribute("aria-controls","studentPayment");link.setAttribute("aria-expanded","false");link.onclick=event=>{event.preventDefault();setPaymentDisclosure(true)};
}
function renderCore(){
  if(!student?.id)return false;
  warning("");showPortal();
  setText("studentName",student.name||"Học viên");setText("studentCode",student.student_code||"Chưa có mã");setText("studentCourse",student.course||"Chưa có khóa");setText("studentLicense",student.license_class||"Chưa có hạng");setText("mobileStudentOverviewTitle",`Xin chào, ${student.name||"học viên"}`);setText("mobileStudentClass",student.license_class||"Đang học");setText("mobileStudentActionTitle","Hồ sơ đã sẵn sàng");setText("mobileStudentActionDetail","Lịch học và các dữ liệu mới nhất đang được đồng bộ.");
  if(student.photo_data&&$("studentPhoto")){$("studentPhoto").src=student.photo_data;$("studentPhoto").classList.remove("hidden");$("studentPhotoPlaceholder")?.classList.add("hidden")}
  const total=Math.max(0,Number(student.tuition_total)||0),paid=Math.max(0,Number(student.paid)||0),debt=Math.max(0,total-paid),rate=total?Math.min(100,Math.round(paid/total*100)):0;
  setText("tuitionTotal",money(total));setText("tuitionPaid",money(paid));setText("tuitionDebt",money(debt));setText("tuitionRate",`Đã đóng ${rate}% tổng học phí`);setText("tuitionDebtNote",debt?"Vui lòng hoàn tất theo lịch hẹn":"Không còn công nợ");setText("paymentDebt",money(debt));setText("paymentContent",paymentReference());setText("paymentBankName",PAYMENT.bank_name);setText("paymentAccountNumber",PAYMENT.bank_account);setText("paymentAccountOwner",PAYMENT.bank_holder);
  const status=$("tuitionStatus");if(status){status.textContent=debt?"Còn học phí cần hoàn tất":"Đã hoàn tất học phí";status.className=debt?"has-debt":"complete"}
  const badge=$("paymentAmountBadge");if(badge){badge.textContent=debt?`Còn nợ ${money(debt)}`:"Đã hoàn tất";badge.className=debt?"has-debt":"complete"}
  $("paymentPending")?.classList.toggle("hidden",debt===0);$("paymentComplete")?.classList.toggle("hidden",debt>0);
  const progress=[["▤","Hồ sơ",student.profile_status||"Chưa cập nhật"],["◉","Lý thuyết online",student.online_status||"Chưa hoàn thành"],["▣","Cabin",student.cabin_status||"Chưa hoàn thành"],["⌖","DAT",student.dat_status||"Chưa thực hiện"],["✓","Thi tốt nghiệp",student.graduation_status||"Chưa hoàn thành"],["★","Thi sát hạch",student.exam_status||"Chưa thi sát hạch"]];const progressNode=$("studentProgress");if(progressNode)progressNode.innerHTML=progress.map(([icon,label,value])=>`<article class="progress-card"><span>${icon}</span><div><small>${esc(label)}</small><strong>${esc(value)}</strong></div><i></i></article>`).join("");
  const profile=[["Ngày sinh",date(student.date_of_birth)],["Số CCCD",student.cccd||"Chưa cập nhật"],["Điện thoại",student.phone||"Chưa cập nhật"],["Địa chỉ",student.address||"Chưa cập nhật"],["Hạng đào tạo",student.license_class||"Chưa cập nhật"],["Sát hạch / bằng lái",student.exam_status||"Chưa thi sát hạch"],["Trạng thái hồ sơ",student.profile_status||"Chưa cập nhật"]];const profileNode=$("studentProfile");if(profileNode)profileNode.innerHTML=profile.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
  try{mountPaymentDisclosure()}catch(error){console.warn("[student-ios] payment disclosure",error)}
  void renderQr(debt);return true;
}
function wire(){
  $("studentLogoutBtn")?.addEventListener("click",async()=>{try{await rpcReliable("app_student_logout",{p_token:token})}catch{}clearAuth();location.replace("/")});
  $("copyPaymentContent")?.addEventListener("click",()=>navigator.clipboard?.writeText($("paymentContent")?.textContent||"").catch(()=>{}));
  $("copyPaymentAccount")?.addEventListener("click",()=>navigator.clipboard?.writeText($("paymentAccountNumber")?.textContent||"").catch(()=>{}));
}
async function loadUsername(){try{const me=await rpcReliable("app_student_me",{p_token:token});if(me?.username)setText("studentUsername",`${me.username} · Học viên`)}catch{}}
async function boot(force=false){
  showPortal();if(!force)wire();
  if(!token){location.replace("/");return}
  warning(force?"Đang thử kết nối lại hồ sơ học viên…":"Đang đồng bộ hồ sơ học viên…");
  try{
    const result=await rpcReliable("app_student_portal",{p_token:token});
    if(!result?.id)throw new Error("Hồ sơ học viên chưa sẵn sàng.");
    student=result;renderCore();void loadUsername();
  }catch(error){
    const message=error?.message||"Không tải được hồ sơ học viên.";
    if(/hết hạn|không hợp lệ|invalid|expired/i.test(message)){clearAuth();location.replace("/");return}
    warning(`${message} Trang vẫn hoạt động, bạn có thể thử lại.`,true);
  }
}
boot();
