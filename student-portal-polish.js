import QRCode from "qrcode";
import "./student-portal-polish.css";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const DEFAULT_PAYMENT={bank_name:"MB Bank (MBBank)",bank_bin:"970422",bank_account:"360556789999",bank_holder:"Trần Quốc Đạt",payment_note:"Học phí sẽ được cập nhật sau khi trung tâm đối soát giao dịch."};
let siteConfig={...DEFAULT_PAYMENT};
let mounted=false;
let qrTimer=null;

function normalize(value=""){return String(value).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")}
function esc(value=""){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function numberFromText(value=""){return Number(String(value).replace(/[^0-9]/g,""))||0}
function text(selector){return document.querySelector(selector)?.textContent?.trim()||""}
function tlv(id,value){const v=String(value);return `${id}${String(v.length).padStart(2,"0")}${v}`}
function crc16(value){let crc=0xffff;for(let i=0;i<value.length;i++){crc^=value.charCodeAt(i)<<8;for(let bit=0;bit<8;bit++)crc=(crc&0x8000)?(crc<<1)^0x1021:crc<<1;crc&=0xffff}return crc.toString(16).toUpperCase().padStart(4,"0")}
function qrPayload(amount,content){
  const bin=String(siteConfig.bank_bin||"").replace(/\D/g,"");
  const accountNo=String(siteConfig.bank_account||"").replace(/\D/g,"");
  if(!bin||!accountNo||!amount)return"";
  const account=tlv("00",bin)+tlv("01",accountNo);
  const receiver=tlv("00","A000000727")+tlv("01",account)+tlv("02","QRIBFTTA");
  const base=tlv("00","01")+tlv("01","12")+tlv("38",receiver)+tlv("53","704")+tlv("54",String(Math.round(amount)))+tlv("58","VN")+tlv("62",tlv("08",content||"HOC PHI"))+"6304";
  return base+crc16(base);
}
async function rpc(fn,body={}){
  const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!res.ok)throw new Error("Không tải được cấu hình.");
  return res.json();
}

function fixMetadata(){
  if(location.pathname!=="/hoc-vien.html")return;
  const canonical=document.querySelector('link[rel="canonical"]');
  if(canonical)canonical.href="https://hoclaixecungdat.vercel.app/hoc-vien.html";
  document.querySelector(".mobile-page-tabs")?.remove();
}

function statusFromText(value=""){
  const n=normalize(value);
  if(/da nhan bang|da dau|da hoan thanh|hoan tat/.test(n))return"done";
  if(/dang|cho duyet|cho xac nhan|sap toi/.test(n))return"doing";
  if(/rot|chua dat|that bai/.test(n))return"warning";
  return"pending";
}
function progressSource(){
  const raw=document.getElementById("studentProgress")?.innerText||"";
  return normalize(raw);
}
function progressStep(label,keywords){
  const grid=document.getElementById("studentProgress");
  const source=grid?.innerText||"";
  const children=[...(grid?.children||[])];
  const node=children.find(item=>keywords.some(k=>normalize(item.textContent).includes(normalize(k))));
  const value=node?.textContent||source;
  return{label,state:statusFromText(value)};
}
function roadmapData(){
  const source=progressSource();
  const exam=text("#studentProgress");
  const steps=[
    progressStep("Online",["online","lý thuyết"]),
    progressStep("Cabin",["cabin"]),
    progressStep("DAT",["dat"]),
    progressStep("Tốt nghiệp",["tốt nghiệp"]),
    progressStep("Sát hạch",["sát hạch"]),
    {label:"Nhận bằng",state:/da nhan bang/.test(source)?"done":statusFromText(exam.includes("Đã nhận bằng")?"đã nhận bằng":"chưa")}
  ];
  return steps;
}
function nextAction(){
  const mobileTitle=text("#mobileStudentActionTitle"),mobileDetail=text("#mobileStudentActionDetail");
  if(mobileTitle&&!/dang cap nhat lich hoc/.test(normalize(mobileTitle)))return{title:mobileTitle,detail:mobileDetail||"Mở lịch đào tạo để xem chi tiết.",href:"/lich-dao-tao.html",cta:"Xem lịch"};
  const pending=text("#bookingPendingBadge");
  if(numberFromText(pending)>0)return{title:"Bạn có yêu cầu lịch đang chờ duyệt",detail:pending+". Admin sẽ xác nhận trước khi lịch có hiệu lực.",href:"#trainingBooking",cta:"Xem yêu cầu"};
  const debt=numberFromText(text("#tuitionDebt"));
  if(debt>0)return{title:"Học phí còn cần hoàn tất",detail:`Bạn còn ${new Intl.NumberFormat("vi-VN").format(debt)} ₫. Có thể xem QR và nội dung chuyển khoản ngay trong Cổng học viên.`,href:"#studentPayment",cta:"Xem học phí"};
  const latest=document.getElementById("theoryLatestExam");
  if(latest?.classList.contains("failed"))return{title:"Nên tiếp tục ôn 600 câu",detail:text("#theoryLatestExam")||"Bài thi thử gần nhất chưa đạt yêu cầu.",href:"/600-cau-hoi.html",cta:"Tiếp tục học"};
  const steps=roadmapData();
  const current=steps.find(step=>step.state!=="done");
  if(current)return{title:`Bước tiếp theo: ${current.label}`,detail:"Theo dõi tiến độ và lịch đào tạo để hoàn thành đúng lộ trình.",href:"/lich-dao-tao.html",cta:"Xem lịch đào tạo"};
  return{title:"Lộ trình đào tạo đã hoàn tất",detail:"Hồ sơ hiện không có việc gấp cần xử lý.",href:"#studentProgress",cta:"Xem tiến độ"};
}
function renderPriority(){
  const host=document.getElementById("studentPriorityCenter");if(!host)return;
  const action=nextAction(),steps=roadmapData();
  host.innerHTML=`<div class="student-priority-head"><div><p>ƯU TIÊN HÔM NAY</p><h2>Việc cần làm tiếp theo</h2></div><span>Tự động theo hồ sơ</span></div><div class="student-priority-grid"><a class="student-next-action" href="${esc(action.href)}"><span class="student-next-icon">→</span><div><strong>${esc(action.title)}</strong><small>${esc(action.detail)}</small></div><b>${esc(action.cta)}</b></a><div class="student-roadmap" aria-label="Lộ trình đào tạo">${steps.map((step,index)=>`<div class="student-roadmap-step ${step.state}"><i>${step.state==="done"?"✓":index+1}</i><span><strong>${esc(step.label)}</strong><small>${step.state==="done"?"Hoàn tất":step.state==="doing"?"Đang thực hiện":step.state==="warning"?"Cần chú ý":"Chưa tới"}</small></span></div>`).join("")}</div></div>`;
}

function mountPriority(){
  if(document.getElementById("studentPriorityCenter"))return;
  const hero=document.querySelector(".student-hero");if(!hero)return;
  const section=document.createElement("section");section.id="studentPriorityCenter";section.className="portal-section student-priority-center";section.setAttribute("aria-label","Việc cần làm và lộ trình đào tạo");
  hero.insertAdjacentElement("afterend",section);renderPriority();
}

function switchFinanceTab(tab){
  document.querySelectorAll("[data-student-finance-tab]").forEach(button=>button.classList.toggle("active",button.dataset.studentFinanceTab===tab));
  const overview=document.querySelector('[data-student-finance-panel="overview"]'),payment=document.querySelector('[data-student-finance-panel="payment"]'),history=document.querySelector('[data-student-finance-panel="history"]');
  [overview,payment,history].forEach(panel=>panel?.classList.remove("active"));
  document.querySelector(`[data-student-finance-panel="${tab}"]`)?.classList.add("active");
}
function mountFinanceTabs(){
  const overview=document.querySelector('section[aria-labelledby="financeHeading"]');
  const payment=document.getElementById("studentPayment");
  const history=document.getElementById("studentPaymentHistory");
  if(!overview||!payment||!history||document.getElementById("studentFinanceHub"))return;
  const hub=document.createElement("section");hub.id="studentFinanceHub";hub.className="portal-section student-finance-hub";hub.innerHTML=`<div class="section-heading"><div><p>HỌC PHÍ</p><h2>Học phí & thanh toán</h2></div><span id="studentFinanceHubStatus">Theo dõi tập trung</span></div><nav class="student-finance-tabs" aria-label="Chuyển mục học phí"><button class="active" type="button" data-student-finance-tab="overview">Tổng quan</button><button type="button" data-student-finance-tab="payment">Thanh toán</button><button type="button" data-student-finance-tab="history">Phiếu thu</button></nav><div class="student-finance-panels"></div>`;
  overview.parentNode.insertBefore(hub,overview);
  const panels=hub.querySelector(".student-finance-panels");
  overview.dataset.studentFinancePanel="overview";payment.dataset.studentFinancePanel="payment";history.dataset.studentFinancePanel="history";
  overview.classList.add("student-finance-panel","active");payment.classList.add("student-finance-panel");history.classList.add("student-finance-panel");
  panels.append(overview,payment,history);
  hub.querySelectorAll("[data-student-finance-tab]").forEach(button=>button.onclick=()=>switchFinanceTab(button.dataset.studentFinanceTab));
  const anchorHandler=()=>{if(location.hash==="#studentPayment")switchFinanceTab("payment");if(location.hash==="#studentPaymentHistory")switchFinanceTab("history")};
  window.addEventListener("hashchange",anchorHandler);anchorHandler();
}

function updatePaymentDetails(){
  if(location.pathname!=="/hoc-vien.html")return;
  const details=document.querySelector("#studentPayment .payment-details");if(!details)return;
  const bankHeading=details.querySelector(".bank-heading strong");if(bankHeading&&siteConfig.bank_name)bankHeading.textContent=siteConfig.bank_name;
  const rows=[...details.querySelectorAll("dl>div")];
  const accountRow=rows.find(row=>normalize(row.querySelector("dt")?.textContent).includes("so tai khoan"));
  const holderRow=rows.find(row=>normalize(row.querySelector("dt")?.textContent).includes("chu tai khoan"));
  if(accountRow&&siteConfig.bank_account){const span=accountRow.querySelector("dd span");const copy=accountRow.querySelector("button");if(span)span.textContent=siteConfig.bank_account;if(copy)copy.dataset.copy=siteConfig.bank_account}
  if(holderRow&&siteConfig.bank_holder){const dd=holderRow.querySelector("dd");if(dd)dd.textContent=siteConfig.bank_holder}
  const note=details.querySelector(".payment-note");if(note&&siteConfig.payment_note)note.innerHTML=`<b>Lưu ý:</b> ${esc(siteConfig.payment_note)}`;
  scheduleQrUpdate();
}
async function regenerateQr(){
  const img=document.getElementById("tuitionQr");if(!img)return;
  const amount=numberFromText(text("#paymentDebt"));if(!amount)return;
  const content=text("#paymentContent")||"HOC PHI";
  const payload=qrPayload(amount,content);if(!payload)return;
  try{
    const dataUrl=await QRCode.toDataURL(payload,{width:520,margin:2,errorCorrectionLevel:"M"});
    img.src=dataUrl;
    img.alt=`Mã QR đóng học phí qua ${siteConfig.bank_name||"ngân hàng"}`;
    const open=document.getElementById("tuitionQrOpen");if(open)open.href=dataUrl;
  }catch{}
}
function scheduleQrUpdate(){clearTimeout(qrTimer);qrTimer=setTimeout(regenerateQr,120)}
async function loadSiteConfig(){try{siteConfig={...DEFAULT_PAYMENT,...await rpc("app_public_site_config",{})};updatePaymentDetails()}catch{siteConfig={...DEFAULT_PAYMENT};updatePaymentDetails()}}

function hideRedundantMobileTabs(){document.querySelector(".mobile-page-tabs")?.remove()}
function moveProgressNearTop(){
  const priority=document.getElementById("studentPriorityCenter");
  const progress=document.querySelector('section[aria-labelledby="progressHeading"]');
  if(priority&&progress&&priority.nextElementSibling!==progress)priority.insertAdjacentElement("afterend",progress);
}
function refresh(){
  fixMetadata();hideRedundantMobileTabs();mountPriority();moveProgressNearTop();mountFinanceTabs();renderPriority();updatePaymentDetails();
}
function init(){
  if(location.pathname!=="/hoc-vien.html")return;
  mounted=true;fixMetadata();refresh();loadSiteConfig();
  const observer=new MutationObserver(()=>{refresh();scheduleQrUpdate()});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});
  let tries=0;const timer=setInterval(()=>{tries++;refresh();if(tries>20)clearInterval(timer)},500);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.addEventListener("pageshow",()=>{if(mounted)refresh()});
