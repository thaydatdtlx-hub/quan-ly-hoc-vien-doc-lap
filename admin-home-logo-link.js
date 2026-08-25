import "./coccoc-sidebar.js";

const PUBLIC_HOME="/dang-ky-hoc-lai-xe.html";

function goHome(){location.assign(PUBLIC_HOME)}

function wire(){
  const logo=document.querySelector("#app .topbar .brand-mark");
  if(logo&&!logo.dataset.homeLinked){
    logo.dataset.homeLinked="true";
    logo.removeAttribute("aria-hidden");
    logo.setAttribute("role","link");
    logo.setAttribute("tabindex","0");
    logo.setAttribute("aria-label","Về trang chủ Học lái xe cùng Đạt");
    logo.setAttribute("title","Về trang chủ");
    logo.style.cursor="pointer";
    logo.addEventListener("click",goHome);
    logo.addEventListener("keydown",event=>{
      if(event.key==="Enter"||event.key===" "){
        event.preventDefault();
        goHome();
      }
    });
  }

  const mobile=document.querySelector("#app .mobile-app-brand");
  if(mobile){
    mobile.href=PUBLIC_HOME;
    mobile.setAttribute("aria-label","Về trang chủ Học lái xe cùng Đạt");
  }
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wire,{once:true});
else wire();
window.addEventListener("pageshow",wire);
