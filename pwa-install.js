import "./brand-wording-cleanup.js";
import "./admin-tuition-settings.js";
import "./admin-site-config.js";
import "./admin-home-logo-link.js";
import "./site-unification.js";
import "./site-config-public.js";
import "./professional-public-polish.js";
import "./recruitment-operations.js";
import "./student-portal-polish.js";
import "./theory-answer-explanations.js";
import "./theory-hero-brand.js";
import "./mobile-public-login.js";

const DISMISS_KEY="thay_dat_pwa_install_dismissed";
const DISMISS_DAYS=7;
let deferredInstallPrompt=null;
let installBanner=null;

function isStandalone(){return window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true}
function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function isPublicLanding(){return location.pathname==="/dang-ky-hoc-lai-xe.html"||(location.pathname==="/"&&Boolean(document.getElementById("registrationForm")))}
function shouldOfferInstall(){return !isPublicLanding()}
function recentlyDismissed(){
  const value=Number(localStorage.getItem(DISMISS_KEY)||0);
  return value&&Date.now()-value<DISMISS_DAYS*86400000;
}
function removeInstallBanner(){installBanner?.remove();installBanner=null}
function dismissInstallBanner(){localStorage.setItem(DISMISS_KEY,String(Date.now()));removeInstallBanner()}
function showLaunchScreen(){
  if(!isStandalone()||sessionStorage.getItem("thay_dat_pwa_launched"))return;
  sessionStorage.setItem("thay_dat_pwa_launched","1");
  const splash=document.createElement("div");splash.className="pwa-launch-screen";
  splash.innerHTML='<img src="/app-icon-192.png" alt=""><strong>THẦY ĐẠT</strong><span>Hệ thống quản lý đào tạo học viên lái xe</span>';
  document.body.append(splash);
  requestAnimationFrame(()=>splash.classList.add("visible"));
  window.setTimeout(()=>{splash.classList.add("leaving");window.setTimeout(()=>splash.remove(),320)},950);
}

function showInstallBanner(mode){
  if(!shouldOfferInstall()||isStandalone()||recentlyDismissed()||installBanner)return;
  installBanner=document.createElement("aside");
  installBanner.className="pwa-install-banner";
  installBanner.setAttribute("aria-label","Cài ứng dụng Thầy Đạt");
  installBanner.innerHTML=`
    <img src="/app-icon-192.png" alt="">
    <div><strong>Cài ứng dụng Thầy Đạt</strong><p>${mode==="ios"?"Mở nhanh toàn màn hình ngay từ iPhone.":"Truy cập nhanh như một ứng dụng trên điện thoại."}</p><small class="pwa-ios-help" hidden>Nhấn nút Chia sẻ <b>□↑</b>, sau đó chọn <b>Thêm vào MH chính</b>.</small></div>
    <button class="pwa-install-action" type="button">${mode==="ios"?"Cách cài":"Cài ngay"}</button>
    <button class="pwa-install-close" type="button" aria-label="Để sau">×</button>`;
  document.body.append(installBanner);
  installBanner.querySelector(".pwa-install-close").addEventListener("click",dismissInstallBanner);
  installBanner.querySelector(".pwa-install-action").addEventListener("click",async()=>{
    if(mode==="ios"){
      const help=installBanner.querySelector(".pwa-ios-help");help.hidden=false;
      installBanner.classList.add("show-instructions");
      return;
    }
    if(!deferredInstallPrompt)return;
    deferredInstallPrompt.prompt();
    const {outcome}=await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    if(outcome==="accepted")removeInstallBanner();
  });
}

if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){
  window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(()=>{}),{once:true});
}
showLaunchScreen();
window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();deferredInstallPrompt=event;if(shouldOfferInstall())showInstallBanner("native");
});
window.addEventListener("appinstalled",()=>{localStorage.removeItem(DISMISS_KEY);removeInstallBanner()});
if(isIos()&&!isStandalone()&&shouldOfferInstall())window.setTimeout(()=>showInstallBanner("ios"),1400);