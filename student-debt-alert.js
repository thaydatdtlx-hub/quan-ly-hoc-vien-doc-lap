const moneyNumber=value=>Number(String(value??"").replace(/[^0-9]/g,""))||0;

function ensureStyles(){
  if(document.getElementById("studentDebtAlertStyles"))return;
  const style=document.createElement("style");
  style.id="studentDebtAlertStyles";
  style.textContent=`
    .student-debt-alert{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:18px;margin:18px 0 0;padding:20px 22px;border:1px solid #f1c987;border-radius:24px;background:linear-gradient(135deg,#fff5e9 0%,#fff0dc 100%);box-shadow:0 14px 34px rgba(145,82,12,.08);color:#153f68;text-decoration:none;transition:.18s ease}
    .student-debt-alert:hover{transform:translateY(-1px);border-color:#e8b45d;box-shadow:0 18px 38px rgba(145,82,12,.12)}
    .student-debt-alert[hidden]{display:none!important}
    .student-debt-alert__icon{display:grid;width:62px;height:62px;place-items:center;border-radius:19px;background:#ffdca9;color:#bd620b;font-size:30px;font-weight:950}
    .student-debt-alert__copy{min-width:0}.student-debt-alert__copy small{display:block;color:#6d8295;font-size:11px;font-weight:850}.student-debt-alert__copy strong{display:block;margin:4px 0 3px;color:#153f68;font-size:clamp(26px,3vw,36px);line-height:1.05;letter-spacing:-.02em}.student-debt-alert__copy em{display:block;color:#6a8194;font-size:11px;font-style:normal;font-weight:750}.student-debt-alert__copy b{display:inline-block;margin-top:8px;color:#ae5708;font-size:11px;font-weight:950}
    .student-debt-alert__arrow{display:grid;width:42px;height:42px;place-items:center;border-radius:14px;background:#fff8ee;color:#d27b1e;font-size:26px;font-weight:950}
    @media(max-width:760px){.student-debt-alert{margin:12px 12px 0;padding:16px;border-radius:20px;gap:13px}.student-debt-alert__icon{width:52px;height:52px;border-radius:16px;font-size:24px}.student-debt-alert__copy strong{font-size:26px}.student-debt-alert__copy small,.student-debt-alert__copy em,.student-debt-alert__copy b{font-size:10px}.student-debt-alert__arrow{width:36px;height:36px;border-radius:12px;font-size:22px}}
  `;
  document.head.append(style);
}

function mountAlert(){
  if(location.pathname!=="/hoc-vien.html")return null;
  let alert=document.getElementById("studentDebtAlert");
  if(alert)return alert;
  ensureStyles();
  alert=document.createElement("a");
  alert.id="studentDebtAlert";
  alert.className="student-debt-alert";
  alert.href="#studentPayment";
  alert.hidden=true;
  alert.setAttribute("aria-label","Mở trang đóng học phí");
  alert.innerHTML=`<span class="student-debt-alert__icon">!</span><span class="student-debt-alert__copy"><small>Học phí còn nợ</small><strong id="studentDebtAlertAmount">0 ₫</strong><em id="studentDebtAlertNote">Vui lòng hoàn tất theo lịch hẹn</em><b>Mở trang đóng học phí →</b></span><span class="student-debt-alert__arrow">›</span>`;
  const priority=document.getElementById("studentPriorityCenter"),hero=document.querySelector(".student-hero");
  if(priority)priority.insertAdjacentElement("afterend",alert);
  else if(hero)hero.insertAdjacentElement("afterend",alert);
  else document.getElementById("studentPortal")?.prepend(alert);
  alert.addEventListener("click",()=>{
    document.querySelector('[data-student-finance-tab="payment"]')?.click();
    window.setTimeout(()=>document.getElementById("studentFinanceHub")?.scrollIntoView({behavior:"smooth",block:"start"}),40);
  });
  return alert;
}

function renderAlert(){
  const alert=mountAlert();
  if(!alert)return;
  const debtNode=document.getElementById("tuitionDebt");
  const debt=moneyNumber(debtNode?.textContent);
  if(debt<=0){alert.hidden=true;return}
  const amount=document.getElementById("studentDebtAlertAmount");
  const note=document.getElementById("studentDebtAlertNote");
  if(amount)amount.textContent=debtNode?.textContent?.trim()||new Intl.NumberFormat("vi-VN").format(debt)+" ₫";
  if(note)note.textContent=document.getElementById("tuitionDebtNote")?.textContent?.trim()||"Vui lòng hoàn tất theo lịch hẹn";
  alert.hidden=false;
}

function init(){
  if(location.pathname!=="/hoc-vien.html")return;
  renderAlert();
  const debt=document.getElementById("tuitionDebt"),note=document.getElementById("tuitionDebtNote"),priority=document.getElementById("studentPriorityCenter");
  const observer=new MutationObserver(renderAlert);
  if(debt)observer.observe(debt,{subtree:true,childList:true,characterData:true});
  if(note)observer.observe(note,{subtree:true,childList:true,characterData:true});
  if(priority)observer.observe(priority.parentElement||document.body,{childList:true});
  let tries=0;
  const timer=window.setInterval(()=>{tries++;renderAlert();if(tries>=24)window.clearInterval(timer)},500);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.addEventListener("pageshow",renderAlert);