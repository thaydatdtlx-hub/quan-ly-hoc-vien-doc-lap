const PUBLIC_HOME="/dang-ky-hoc-lai-xe.html";

function goHome(){
  window.location.assign(PUBLIC_HOME);
}

function wireAdminHomeLogo(){
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

  const mobileBrand=document.querySelector("#app .mobile-app-brand");
  if(mobileBrand){
    mobileBrand.setAttribute("href",PUBLIC_HOME);
    mobileBrand.setAttribute("aria-label","Về trang chủ Học lái xe cùng Đạt");
  }
}

wireAdminHomeLogo();

const observer=new MutationObserver(wireAdminHomeLogo);
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
window.addEventListener("pageshow",wireAdminHomeLogo);
