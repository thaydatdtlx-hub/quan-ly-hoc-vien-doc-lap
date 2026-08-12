function text(id){return document.getElementById(id)?.textContent?.trim()||""}
function hasAuthenticatedStudent(){
  const username=text("studentUsername");
  const studentName=text("studentName");
  const code=text("studentCode");
  return Boolean(username)||(studentName&&studentName!=="Học viên")||(code&&code!=="Chưa có mã");
}
function openRequestedView(){
  if(location.pathname!=="/hoc-vien.html")return;
  const view=new URLSearchParams(location.search).get("view");
  if(view!=="payment")return;
  const paymentTab=document.querySelector('[data-student-finance-tab="payment"]');
  if(paymentTab&&!paymentTab.classList.contains("active"))paymentTab.click();
  const target=document.getElementById("studentFinanceHub")||document.getElementById("studentPayment");
  if(target&&!window.__studentPaymentViewOpened){
    window.__studentPaymentViewOpened=true;
    window.setTimeout(()=>target.scrollIntoView({behavior:"smooth",block:"start"}),120);
  }
}
function recoverStudentPortal(){
  if(location.pathname!=="/hoc-vien.html")return false;
  const portal=document.getElementById("studentPortal");
  if(!portal||!hasAuthenticatedStudent())return false;
  portal.classList.remove("hidden");
  document.getElementById("studentLoading")?.classList.add("hidden");
  openRequestedView();
  return true;
}
function init(){
  if(location.pathname!=="/hoc-vien.html")return;
  recoverStudentPortal();
  const observer=new MutationObserver(()=>recoverStudentPortal());
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});
  let tries=0;
  const timer=window.setInterval(()=>{
    tries++;
    recoverStudentPortal();
    if(tries>=40||(!document.getElementById("studentPortal")?.classList.contains("hidden")&&hasAuthenticatedStudent()))window.clearInterval(timer);
  },250);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.addEventListener("pageshow",()=>{window.__studentPaymentViewOpened=false;recoverStudentPortal()});