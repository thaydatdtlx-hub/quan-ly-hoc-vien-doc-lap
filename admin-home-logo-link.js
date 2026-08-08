const PUBLIC_HOME="/dang-ky-hoc-lai-xe.html";
function goHome(){location.assign(PUBLIC_HOME)}
function wire(){
  const logo=document.querySelector("#app .topbar .brand-mark");
  if(logo&&!logo.dataset.homeLinked){
    logo.dataset.homeLinked="true";logo.removeAttribute("aria-hidden");logo.setAttribute("role","link");logo.setAttribute("tabindex","0");logo.setAttribute("aria-label","Về trang chủ Học lái xe cùng Đạt");logo.setAttribute("title","Về trang chủ");logo.style.cursor="pointer";
    logo.addEventListener("click",goHome);logo.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();goHome()}});
  }
  const mobile=document.querySelector("#app .mobile-app-brand");if(mobile){mobile.href=PUBLIC_HOME;mobile.setAttribute("aria-label","Về trang chủ Học lái xe cùng Đạt")}
}
wire();new MutationObserver(wire).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});window.addEventListener("pageshow",wire);
