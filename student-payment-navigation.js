import "./student-payment-navigation.css";

const PAYMENT_URL="/hoc-vien.html?view=payment";

function isPaymentView(){
  return new URLSearchParams(location.search).get("view")==="payment";
}

function openPaymentPage(){
  location.href=PAYMENT_URL;
}

function enhanceDebtCard(){
  const debtCard=document.querySelector("#studentPortal .tuition-card.debt");
  const debtValue=document.getElementById("tuitionDebt");
  const paymentLink=document.getElementById("tuitionPaymentLink");
  if(!debtCard||!debtValue)return;

  const hasDebt=Number(String(debtValue.textContent||"").replace(/[^0-9]/g,""))>0;
  debtCard.classList.toggle("is-payment-complete",!hasDebt);
  debtCard.tabIndex=hasDebt?0:-1;
  debtCard.setAttribute("role",hasDebt?"link":"group");
  debtCard.setAttribute("aria-label",hasDebt?`Mở trang đóng học phí. ${debtValue.textContent}`:"Đã hoàn tất học phí");

  if(paymentLink){
    paymentLink.href=PAYMENT_URL;
    paymentLink.textContent="Mở trang đóng học phí →";
  }

  debtCard.onclick=event=>{
    if(!hasDebt)return;
    if(event.target.closest("a,button"))return;
    openPaymentPage();
  };
  debtCard.onkeydown=event=>{
    if(!hasDebt||!["Enter"," "].includes(event.key))return;
    event.preventDefault();openPaymentPage();
  };
}

function updatePaymentShortcuts(){
  document.querySelectorAll('[data-mobile-scroll="#studentPayment"]').forEach(button=>{
    button.removeAttribute("data-mobile-scroll");
    button.addEventListener("click",openPaymentPage);
  });
}

function buildPaymentView(){
  if(!isPaymentView())return;
  document.body.classList.add("student-payment-page");
  const portal=document.getElementById("studentPortal");
  const payment=document.getElementById("studentPayment");
  if(!portal||!payment)return;

  [...portal.children].forEach(child=>{
    if(child!==payment)child.classList.add("payment-page-hidden");
  });
  payment.style.setProperty("display","block","important");
  payment.classList.add("student-payment-standalone");

  if(!document.getElementById("studentPaymentBack")){
    const back=document.createElement("a");
    back.id="studentPaymentBack";
    back.className="student-payment-back";
    back.href="/hoc-vien.html";
    back.textContent="← Quay lại cổng học viên";
    payment.prepend(back);
  }
  document.title="Đóng học phí · Cổng học viên Thầy Đạt";
}

function watchPortal(){
  const portal=document.getElementById("studentPortal");
  if(!portal)return;
  const apply=()=>{
    enhanceDebtCard();
    updatePaymentShortcuts();
    buildPaymentView();
  };
  apply();
  new MutationObserver(apply).observe(portal,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",watchPortal,{once:true});
else watchPortal();
