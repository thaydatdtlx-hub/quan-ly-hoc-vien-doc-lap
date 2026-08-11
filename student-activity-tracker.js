const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const SESSION_KEY="hv_activity_session_id";
const LAST_TOUCH_KEY="hv_activity_last_touch";
const MAX_IDLE_MS=30*60*1000;
const HEARTBEAT_MS=30000;
let active=false,sessionId="",heartbeatTimer=null,lastActionKey="",lastActionAt=0;

function token(){return localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||""}
function uuid(){
  if(crypto.randomUUID)return crypto.randomUUID();
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=[...bytes].map(value=>value.toString(16).padStart(2,"0"));
  return `${hex.slice(0,4).join("")}-${hex.slice(4,6).join("")}-${hex.slice(6,8).join("")}-${hex.slice(8,10).join("")}-${hex.slice(10).join("")}`;
}
function pagePath(){return `${location.pathname}${location.hash||""}`.slice(0,500)}
function pageLabel(){
  const labels={
    "/hoc-vien.html":"Cổng học viên",
    "/600-cau-hoi.html":"Học 600 câu lý thuyết",
    "/lich-dao-tao.html":"Lịch đào tạo",
    "/bo-tuc-tay-lai.html":"Bổ túc tay lái",
    "/dang-ky-hoc-lai-xe.html":"Trang đăng ký học lái xe",
    "/":"Trang chủ"
  };
  return labels[location.pathname]||document.title||location.pathname;
}
async function postRpc(fn,body,keepalive=false){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:"POST",keepalive,
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  if(!response.ok)throw new Error("activity rpc unavailable");
  return response.json().catch(()=>null);
}
async function studentMe(){const value=token();if(!value)return null;try{return await postRpc("app_student_me",{p_token:value})}catch{return null}}
function chooseSession(){
  const now=Date.now(),last=Number(sessionStorage.getItem(LAST_TOUCH_KEY)||0),stored=sessionStorage.getItem(SESSION_KEY)||"";
  const isNew=!stored||!last||now-last>MAX_IDLE_MS;
  sessionId=isNew?uuid():stored;
  if(isNew)sessionStorage.setItem(SESSION_KEY,sessionId);
  sessionStorage.setItem(LAST_TOUCH_KEY,String(now));
  return isNew;
}
function touch(eventType="heartbeat",action=null,label=null,metadata={},end=false,keepalive=false){
  const value=token();if(!active||!value||!sessionId)return Promise.resolve(null);
  sessionStorage.setItem(LAST_TOUCH_KEY,String(Date.now()));
  return postRpc("app_student_activity_touch",{
    p_token:value,p_session_id:sessionId,p_event_type:eventType,p_path:pagePath(),
    p_action:action,p_label:label,p_metadata:metadata&&typeof metadata==="object"?metadata:{},p_end:end
  },keepalive).catch(()=>null);
}
function sanitizedLabel(element){return String(element?.getAttribute?.("aria-label")||element?.title||element?.textContent||"").replace(/\s+/g," ").trim().slice(0,120)}
function actionFromElement(element){
  const target=element?.closest?.("a,button,[role='button']");if(!target)return null;
  if(target.matches("#studentLogoutBtn,[data-mobile-click='studentLogoutBtn']"))return{action:"logout",label:"Đăng xuất",end:true};
  const rules=[
    ["#studentNotificationBtn,[data-mobile-click='studentNotificationBtn']","open_notifications","Xem thông báo"],
    ["#studentChangePasswordBtn,[data-mobile-click='studentChangePasswordBtn']","open_change_password","Mở đổi mật khẩu"],
    ["[data-student-receipt]","open_receipt","Xem / In phiếu thu"],
    ["#copyPaymentAccount","copy_bank_account","Sao chép số tài khoản"],
    ["#copyPaymentContent","copy_payment_content","Sao chép nội dung chuyển khoản"],
    ["#submitTrainingRequest","submit_training_request","Gửi yêu cầu đăng ký lịch"],
    ["[data-student-finance-tab]","switch_finance_tab","Chuyển mục học phí"],
    ["[data-mobile-scroll='#trainingBooking']","open_training_booking","Mở đăng ký lịch thực hành"],
    ["[data-mobile-scroll='#studentPayment']","open_tuition_payment","Mở thanh toán học phí"],
    ["a[href='/600-cau-hoi.html']","open_theory","Mở học 600 câu"],
    ["a[href='/lich-dao-tao.html']","open_schedule","Mở lịch đào tạo"],
    ["a[href*='bo-tuc-tay-lai.html']","open_driving_refresh","Mở bổ túc tay lái"]
  ];
  for(const [selector,action,label] of rules)if(target.matches(selector))return{action,label,end:false};
  if(location.pathname==="/600-cau-hoi.html"){
    if(target.matches(".answer-option")||target.closest("#answerOptions .answer-option")){
      const number=(document.getElementById("questionNumber")?.textContent||"").match(/\d+/)?.[0]||"";
      return{action:"answer_theory_question",label:number?`Trả lời câu ${number}`:"Trả lời câu lý thuyết",end:false};
    }
    const label=sanitizedLabel(target);
    if(/thi thử/i.test(label))return{action:"start_mock_exam",label:"Mở thi thử",end:false};
    if(/nộp bài/i.test(label))return{action:"submit_mock_exam",label:"Nộp bài thi thử",end:false};
    if(/xem lại/i.test(label))return{action:"review_mock_exam",label:"Xem lại bài thi",end:false};
  }
  if(target.tagName==="A"){
    const href=target.getAttribute("href")||"";let targetPath="";
    try{const url=new URL(href,location.origin);if(url.origin===location.origin)targetPath=url.pathname+url.hash}catch{}
    if(targetPath)return{action:"open_link",label:sanitizedLabel(target)||"Mở liên kết",metadata:{target_path:targetPath},end:false};
  }
  return null;
}
function onClick(event){
  if(!active)return;const info=actionFromElement(event.target);if(!info)return;
  const key=`${info.action}|${info.label}`;const now=Date.now();if(key===lastActionKey&&now-lastActionAt<800)return;lastActionKey=key;lastActionAt=now;
  if(info.end){touch("logout",info.action,info.label,{},true,true);sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(LAST_TOUCH_KEY);active=false;return}
  touch("action",info.action,info.label,info.metadata||{});
}
function onVisibility(){if(!active)return;if(document.visibilityState==="visible")touch("heartbeat");else touch("page_leave","tab_hidden",pageLabel(),{},false,true)}
function onPageHide(){if(active)touch("page_leave","pagehide",pageLabel(),{},false,true)}
function startHeartbeat(){clearInterval(heartbeatTimer);heartbeatTimer=setInterval(()=>{if(active&&document.visibilityState==="visible")touch("heartbeat")},HEARTBEAT_MS)}
async function init(){
  const me=await studentMe();if(me?.role!=="student")return;
  const isNew=chooseSession();active=true;
  if(isNew)await touch("session_start","open_session",pageLabel(),{title:String(document.title||"").slice(0,120)});
  await touch("page_view","open_page",pageLabel(),{title:String(document.title||"").slice(0,120)});
  document.addEventListener("click",onClick,true);document.addEventListener("visibilitychange",onVisibility);window.addEventListener("pagehide",onPageHide);startHeartbeat();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
