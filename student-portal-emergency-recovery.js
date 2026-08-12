function showStudentPortal(){
  if(location.pathname!=="/hoc-vien.html")return;
  const portal=document.getElementById("studentPortal");
  const loading=document.getElementById("studentLoading");
  if(portal)portal.classList.remove("hidden");
  if(loading)loading.classList.add("hidden");
  const view=new URLSearchParams(location.search).get("view");
  if(view==="payment"){
    window.setTimeout(()=>{
      document.querySelector('[data-student-finance-tab="payment"]')?.click();
      (document.getElementById("studentFinanceHub")||document.getElementById("studentPayment"))?.scrollIntoView({block:"start"});
    },500);
  }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",showStudentPortal,{once:true});else showStudentPortal();
window.addEventListener("pageshow",showStudentPortal);
window.setTimeout(showStudentPortal,250);
window.setTimeout(showStudentPortal,1000);