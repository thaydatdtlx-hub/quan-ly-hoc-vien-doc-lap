const FULL_MODULES=[
  "./site-enhancements.js",
  "./pwa-install.js",
  "./push-notifications.js",
  "./mobile-dashboard.js",
  "./ai-chat.js"
];
const CORE_SAFE_MODULES=[
  "./pwa-install.js",
  "./push-notifications.js",
  "./ai-chat.js"
];
const loadedModules=new Set();
let loadChain=Promise.resolve();

const byId=id=>document.getElementById(id);
const text=id=>(byId(id)?.textContent||"").trim();
const hasChildren=id=>Boolean(byId(id)?.children?.length);

function hasIdentity(){
  const name=text("studentName"),code=text("studentCode");
  return Boolean((name&&name!=="Học viên")||(code&&code!=="Chưa có mã"));
}
function coreRendered(){
  const finance=text("tuitionStatus");
  return hasIdentity()&&finance&&finance!=="Đang cập nhật"&&hasChildren("studentProgress")&&hasChildren("studentProfile");
}
function fullPortalRendered(){
  const portal=byId("studentPortal");
  if(!portal||portal.classList.contains("hidden")||!coreRendered())return false;
  if(!hasChildren("studentUpcoming"))return false;
  if(!hasChildren("studentBookingRequests"))return false;
  if(!hasChildren("studentPaymentHistoryList"))return false;
  if(!hasChildren("studentAttendanceList"))return false;
  return /^\d+\/\d+\s+thông báo\b/i.test(text("studentNotificationSummary"));
}
function afterPaint(callback){requestAnimationFrame(()=>requestAnimationFrame(callback))}
function loadModules(modules){
  const pending=modules.filter(module=>!loadedModules.has(module));
  if(!pending.length)return loadChain;
  pending.forEach(module=>loadedModules.add(module));
  document.documentElement.setAttribute("data-student-postboot","loading");
  loadChain=loadChain.then(()=>Promise.allSettled(pending.map(module=>import(module)))).then(results=>{
    const failed=results.filter(result=>result.status==="rejected");
    document.documentElement.setAttribute("data-student-postboot",failed.length?"partial":"ready");
    if(failed.length)console.warn("[student-postboot] Một số module phụ không tải được.",failed.map(result=>result.reason));
  });
  return loadChain;
}
function showRenderWarning(){
  let box=byId("studentRuntimeWarning");
  if(!box){
    box=document.createElement("div");box.id="studentRuntimeWarning";
    box.style.cssText="margin:14px auto;padding:12px 14px;max-width:1200px;border:1px solid #f0d5a8;border-radius:12px;background:#fff8e9;color:#76551c;font:700 12px/1.5 system-ui";
    byId("studentPortal")?.prepend(box);
  }
  box.textContent="Dữ liệu đã về từ máy chủ nhưng một phần giao diện chưa render hoàn tất. Hệ thống đang giữ phiên đăng nhập và khôi phục dữ liệu cốt lõi.";
}
function handleFunctionsReady(){
  queueMicrotask(()=>{
    if(fullPortalRendered()){
      afterPaint(()=>void loadModules(FULL_MODULES));
      return;
    }
    document.documentElement.setAttribute("data-student-functions","render-error");
    showRenderWarning();
    window.__retryStudentCoreProfile?.();
    window.setTimeout(()=>{
      if(fullPortalRendered())afterPaint(()=>void loadModules(FULL_MODULES));
      else if(coreRendered())afterPaint(()=>void loadModules(CORE_SAFE_MODULES));
    },700);
  });
}
function handleCoreRecovery(event){
  if(event?.detail?.source!=="core-xhr-full")return;
  queueMicrotask(()=>{
    if(fullPortalRendered()){
      afterPaint(()=>void loadModules(FULL_MODULES));
      return;
    }
    if(coreRendered()){
      document.documentElement.setAttribute("data-student-functions","core-recovered");
      showRenderWarning();
      afterPaint(()=>void loadModules(CORE_SAFE_MODULES));
    }
  });
}

window.addEventListener("student-functions-ready",handleFunctionsReady);
window.addEventListener("student-profile-ready",handleCoreRecovery);

const current=document.documentElement.getAttribute("data-student-functions");
if(current==="ready"||current==="partial")handleFunctionsReady();
else if(document.documentElement.getAttribute("data-student-core-recovery")==="ready")handleCoreRecovery({detail:{source:"core-xhr-full"}});
