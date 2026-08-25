import "./student-payment-navigation.css";
import {openTuitionPaymentModal} from "./student-payment-modal.js";

const PAYMENT_HASH="#studentPayment";
let debtObserver=null;
let legacyPaymentRequested=false;
let legacyPaymentOpened=false;
let legacyOpenAttempts=0;
let legacyOpenTimer=null;

function isLegacyPaymentView(){
  return new URLSearchParams(location.search).get("view")==="payment";
}

function debtAmount(){
  const debtValue=document.getElementById("tuitionDebt");
  return Number(String(debtValue?.textContent||"").replace(/[^0-9]/g,""))||0;
}

function clearLegacyStandaloneState(){
  document.body.classList.remove("student-payment-page");
  document.querySelectorAll("#studentPortal .payment-page-hidden").forEach(node=>node.classList.remove("payment-page-hidden"));
  const payment=document.getElementById("studentPayment");
  payment?.classList.remove("student-payment-standalone");
  payment?.style.removeProperty("display");
  document.getElementById("studentPaymentBack")?.remove();
}

function migrateLegacyPaymentUrl(){
  if(!isLegacyPaymentView())return false;
  const url=new URL(location.href);
  url.searchParams.delete("view");
  url.hash=PAYMENT_HASH.slice(1);
  history.replaceState(history.state,"",`${url.pathname}${url.search}${url.hash}`);
  clearLegacyStandaloneState();
  return true;
}

function openPaymentPopup(event){
  event?.preventDefault();
  if(debtAmount()<=0)return false;
  const opened=openTuitionPaymentModal();
  if(opened)legacyPaymentOpened=true;
  return opened;
}

function scheduleLegacyPaymentOpen(delay=0){
  if(!legacyPaymentRequested||legacyPaymentOpened||legacyOpenAttempts>=12)return;
  clearTimeout(legacyOpenTimer);
  legacyOpenTimer=setTimeout(()=>{
    legacyOpenAttempts++;
    if(!openPaymentPopup())scheduleLegacyPaymentOpen(Math.min(900,120*legacyOpenAttempts));
  },delay);
}

function bindPaymentLink(paymentLink){
  if(!paymentLink||paymentLink.dataset.paymentPopupBound==="true")return;
  paymentLink.dataset.paymentPopupBound="true";
  paymentLink.addEventListener("click",event=>{
    event.preventDefault();
    event.stopPropagation();
    openPaymentPopup(event);
  });
}

function enhanceDebtCard(){
  const debtCard=document.querySelector("#studentPortal .tuition-card.debt");
  const debtValue=document.getElementById("tuitionDebt");
  const paymentLink=document.getElementById("tuitionPaymentLink");
  if(!debtCard||!debtValue)return;

  const hasDebt=debtAmount()>0;
  debtCard.classList.toggle("is-payment-complete",!hasDebt);
  debtCard.tabIndex=hasDebt?0:-1;
  debtCard.setAttribute("role",hasDebt?"button":"group");
  debtCard.setAttribute("aria-label",hasDebt?`Mở mã QR đóng học phí. ${debtValue.textContent}`:"Đã hoàn tất học phí");
  debtCard.setAttribute("aria-haspopup",hasDebt?"dialog":"false");
  debtCard.setAttribute("aria-controls",hasDebt?"tuitionPaymentDialog":"");

  if(paymentLink){
    paymentLink.href=PAYMENT_HASH;
    paymentLink.textContent="Đóng học phí bằng QR →";
    paymentLink.setAttribute("aria-haspopup","dialog");
    paymentLink.setAttribute("aria-controls","tuitionPaymentDialog");
    bindPaymentLink(paymentLink);
  }

  if(!debtCard.dataset.paymentNavigationBound){
    debtCard.dataset.paymentNavigationBound="true";
    debtCard.addEventListener("click",event=>{
      if(debtAmount()<=0||event.target.closest("a,button"))return;
      event.preventDefault();
      event.stopPropagation();
      openPaymentPopup(event);
    });
    debtCard.addEventListener("keydown",event=>{
      if(debtAmount()<=0||!["Enter"," "].includes(event.key))return;
      event.preventDefault();
      event.stopPropagation();
      openPaymentPopup(event);
    });
  }

  if(hasDebt)scheduleLegacyPaymentOpen();
}

function updatePaymentShortcuts(){
  document.querySelectorAll('[data-mobile-scroll="#studentPayment"]').forEach(button=>{
    button.removeAttribute("data-mobile-scroll");
    button.setAttribute("aria-haspopup","dialog");
    button.setAttribute("aria-controls","tuitionPaymentDialog");
    if(button.dataset.paymentNavigationBound)return;
    button.dataset.paymentNavigationBound="true";
    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      openPaymentPopup(event);
    });
  });
}

function observeDebtValue(){
  const debtValue=document.getElementById("tuitionDebt");
  if(!debtValue)return;
  enhanceDebtCard();
  debtObserver?.disconnect();
  debtObserver=new MutationObserver(enhanceDebtCard);
  debtObserver.observe(debtValue,{subtree:true,childList:true,characterData:true});
}

function refreshPaymentNavigation(){
  clearLegacyStandaloneState();
  updatePaymentShortcuts();
  observeDebtValue();
  scheduleLegacyPaymentOpen();
}

function boot(){
  legacyPaymentRequested=migrateLegacyPaymentUrl();
  refreshPaymentNavigation();
  window.addEventListener("student-profile-ready",refreshPaymentNavigation);
  window.addEventListener("student-functions-ready",refreshPaymentNavigation);
  window.addEventListener("pageshow",refreshPaymentNavigation);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
