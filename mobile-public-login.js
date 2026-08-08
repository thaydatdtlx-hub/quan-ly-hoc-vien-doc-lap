import "./mobile-public-login.css";

function mountMobileLogin(){
  if(location.pathname!=="/dang-ky-hoc-lai-xe.html")return;
  const header=document.querySelector(".site-header");
  if(!header||header.querySelector(".site-mobile-login"))return;

  const link=document.createElement("a");
  link.className="site-mobile-login";
  link.href="/dang-nhap.html";
  link.setAttribute("aria-label","Đăng nhập hệ thống học viên");
  link.innerHTML='<span aria-hidden="true">↪</span><b>Đăng nhập</b>';
  header.append(link);
}

function init(){
  mountMobileLogin();
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    mountMobileLogin();
    if(document.querySelector(".site-mobile-login")||attempts>=20)clearInterval(timer);
  },250);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
window.addEventListener("pageshow",mountMobileLogin);
