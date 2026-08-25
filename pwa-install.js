const isStudentPortal=()=>location.pathname==="/hoc-vien.html";
const professionalUiPromise=import("./platform-professional.js?v=20260825-1").catch(error=>console.warn("[professional-ui] Không thể tải giao diện dùng chung.",error));
let sharedEnhancementsPromise=null;

function loadSharedEnhancements(){
  if(sharedEnhancementsPromise)return sharedEnhancementsPromise;
  sharedEnhancementsPromise=Promise.all([
    professionalUiPromise,
    import("./site-unification.js"),
    import("./site-config-public.js"),
    import("./professional-public-polish.js"),
    import("./student-portal-polish.js"),
    import("./student-activity-tracker.js"),
    import("./theory-answer-explanations.js"),
    import("./theory-hero-brand.js"),
    import("./mobile-public-login.js"),
    import("./b-exam-set-picker.js"),
    import("./exam-candidate-screen.js?v=3"),
    import("./exam-candidate-entry.js")
  ]).catch(error=>{
    console.warn("[pwa-enhancements] Không thể tải tiện ích giao diện.",error);
    sharedEnhancementsPromise=null;
  });
  return sharedEnhancementsPromise;
}

function studentFunctionsReady(){
  const state=document.documentElement.getAttribute("data-student-functions");
  return state==="ready"||state==="partial";
}

function afterStudentPaint(callback){requestAnimationFrame(()=>requestAnimationFrame(callback))}
function loadEnhancementsWhenSafe(){
  if(!isStudentPortal()){void loadSharedEnhancements();return}
  if(studentFunctionsReady()){afterStudentPaint(()=>void loadSharedEnhancements());return}
  window.addEventListener("student-functions-ready",()=>afterStudentPaint(()=>void loadSharedEnhancements()),{once:true});
}
loadEnhancementsWhenSafe();

if(document.getElementById("app")){
  void Promise.all([
    import("./admin-tuition-settings.js"),
    import("./admin-site-config.js"),
    import("./admin-home-logo-link.js"),
    import("./recruitment-operations.js"),
    import("./student-activity-admin.js")
  ]).catch(error=>console.warn("[admin-modules] Không thể tải tiện ích quản trị.",error));
}

const DISMISS_KEY="thay_dat_pwa_install_dismissed";
const DISMISS_DAYS=7;
const PUBLIC_MARKETING_PATHS=new Set(["/dang-ky-hoc-lai-xe.html","/600-cau-hoi.html","/bo-tuc-tay-lai.html","/chinh-sach-bao-mat.html"]);
const SW_REFRESH_KEY="hoclaixecungdat_sw_refresh_v49";
let deferredInstallPrompt=null;
let installBanner=null;

function isStandalone(){return window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true}
function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function isPublicLanding(){return location.pathname==="/dang-ky-hoc-lai-xe.html"||(location.pathname==="/"&&Boolean(document.getElementById("registrationForm")))}
function isPublicMarketingPage(){return PUBLIC_MARKETING_PATHS.has(location.pathname)||isPublicLanding()}
function shouldOfferInstall(){return !isPublicLanding()}
function recentlyDismissed(){const value=Number(localStorage.getItem(DISMISS_KEY)||0);return value&&Date.now()-value<DISMISS_DAYS*86400000}
function removeInstallBanner(){installBanner?.remove();installBanner=null}
function dismissInstallBanner(){localStorage.setItem(DISMISS_KEY,String(Date.now()));removeInstallBanner()}

async function clearPublicPwaState(){
  try{
    const registrations=await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration=>registration.unregister()));
  }catch{}
  try{
    if("caches" in window){
      const keys=await caches.keys();
      await Promise.all(keys.filter(name=>name.startsWith("thay-dat-pwa-")||name.startsWith("hoclaixecungdat-pwa-")).map(name=>caches.delete(name)));
    }
  }catch{}
}

function showLaunchScreen(){
  if(!isStandalone()||sessionStorage.getItem("hoclaixecungdat_pwa_launched"))return;
  sessionStorage.setItem("hoclaixecungdat_pwa_launched","1");
  const splash=document.createElement("div");splash.className="pwa-launch-screen";
  splash.innerHTML='<img src="/app-icon-192.png" alt=""><strong>HỌC LÁI XE CÙNG ĐẠT</strong><span>Cổng học viên và quản lý đào tạo</span>';
  document.body.append(splash);
  requestAnimationFrame(()=>splash.classList.add("visible"));
  window.setTimeout(()=>{splash.classList.add("leaving");window.setTimeout(()=>splash.remove(),320)},950);
}

function showInstallBanner(mode){
  if(!shouldOfferInstall()||isStandalone()||recentlyDismissed()||installBanner)return;
  installBanner=document.createElement("aside");installBanner.className="pwa-install-banner";installBanner.setAttribute("aria-label","Cài ứng dụng Học lái xe cùng Đạt");
  installBanner.innerHTML=`<img src="/app-icon-192.png" alt=""><div><strong>Cài ứng dụng Học lái xe cùng Đạt</strong><p>${mode==="ios"?"Mở nhanh cổng học viên toàn màn hình ngay từ iPhone.":"Truy cập lịch học, học phí và tiến độ như một ứng dụng."}</p><small class="pwa-ios-help" hidden>Nhấn nút Chia sẻ <b>□↑</b>, sau đó chọn <b>Thêm vào MH chính</b>.</small></div><button class="pwa-install-action" type="button">${mode==="ios"?"Cách cài":"Cài ngay"}</button><button class="pwa-install-close" type="button" aria-label="Để sau">×</button>`;
  document.body.append(installBanner);
  installBanner.querySelector(".pwa-install-close").addEventListener("click",dismissInstallBanner);
  installBanner.querySelector(".pwa-install-action").addEventListener("click",async()=>{
    if(mode==="ios"){const help=installBanner.querySelector(".pwa-ios-help");help.hidden=false;installBanner.classList.add("show-instructions");return}
    if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();const {outcome}=await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;if(outcome==="accepted")removeInstallBanner();
  });
}

function activateWaitingWorker(registration){
  registration.waiting?.postMessage({type:"SKIP_WAITING"});
  registration.addEventListener("updatefound",()=>{
    const worker=registration.installing;
    if(!worker)return;
    worker.addEventListener("statechange",()=>{
      if(worker.state==="installed"&&navigator.serviceWorker.controller)worker.postMessage({type:"SKIP_WAITING"});
    });
  });
}

if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(sessionStorage.getItem(SW_REFRESH_KEY))return;
    sessionStorage.setItem(SW_REFRESH_KEY,"1");
    location.reload();
  });
  window.addEventListener("load",()=>{
    if(isPublicMarketingPage()){void clearPublicPwaState();return}
    navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"}).then(registration=>{
      activateWaitingWorker(registration);
      return registration.update();
    }).catch(()=>{});
  },{once:true});
}
showLaunchScreen();
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstallPrompt=event;if(shouldOfferInstall())showInstallBanner("native")});
window.addEventListener("appinstalled",()=>{localStorage.removeItem(DISMISS_KEY);removeInstallBanner()});
if(isIos()&&!isStandalone()&&shouldOfferInstall())window.setTimeout(()=>showInstallBanner("ios"),1400);
