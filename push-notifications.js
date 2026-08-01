const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const manager={toggle:document.getElementById("pushNotificationToggle"),test:document.getElementById("pushNotificationTest"),status:document.getElementById("pushNotificationStatus")};
const student={toggle:document.getElementById("studentPushNotificationToggle"),test:document.getElementById("studentPushNotificationTest"),status:document.getElementById("studentPushNotificationStatus")};
const controls=manager.toggle?manager:student.toggle?student:null;
const authToken=()=>localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";

function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function isStandalone(){return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}
function supported(){return"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window}
function setStatus(message,tone=""){if(!controls)return;controls.status.textContent=message;controls.status.dataset.tone=tone}
function setUi(enabled){
  if(!controls)return;
  controls.toggle.textContent=enabled?"Tắt thông báo điện thoại":"Bật thông báo điện thoại";
  controls.toggle.dataset.enabled=String(enabled);
  controls.test.hidden=!enabled;
  if(enabled)setStatus("Đã bật trên thiết bị này","success");
}
async function rpc(fn,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||"Không thể kết nối máy chủ.");
  return data;
}
function applicationServerKey(value){
  const padding="=".repeat((4-value.length%4)%4),base64=(value+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64),result=new Uint8Array(raw.length);for(let index=0;index<raw.length;index++)result[index]=raw.charCodeAt(index);return result;
}
async function getVapidKey(){
  const response=await fetch(`${SUPABASE_URL}/functions/v1/web-push`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.configured||!data?.publicKey)throw new Error("Hệ thống Push đang chờ Admin kích hoạt trên Supabase.");
  return data.publicKey;
}
async function currentSubscription(){const registration=await navigator.serviceWorker.ready;return await registration.pushManager.getSubscription()}
async function refresh(){
  if(!controls)return;
  if(!supported()){controls.toggle.disabled=true;setStatus("Trình duyệt này chưa hỗ trợ thông báo đẩy.","warning");return;}
  const subscription=await currentSubscription().catch(()=>null);setUi(Boolean(subscription));
  if(subscription&&authToken()){
    rpc("app_save_push_subscription",{p_token:authToken(),p_subscription:subscription.toJSON(),p_user_agent:navigator.userAgent}).catch(()=>{});
  }
  if(Notification.permission==="denied")setStatus("Thông báo đang bị chặn trong Cài đặt điện thoại.","warning");
}
async function togglePush(){
  controls.toggle.disabled=true;
  try{
    if(isIos()&&!isStandalone())throw new Error("Trên iPhone, hãy Thêm vào MH chính rồi mở ứng dụng từ biểu tượng Thầy Đạt.");
    const existing=await currentSubscription();
    if(existing){
      await rpc("app_disable_push_subscription",{p_token:authToken(),p_endpoint:existing.endpoint});
      await existing.unsubscribe();setUi(false);setStatus("Đã tắt thông báo trên thiết bị này.");return;
    }
    const permission=await Notification.requestPermission();
    if(permission!=="granted")throw new Error("Bạn chưa cho phép ứng dụng gửi thông báo.");
    const registration=await navigator.serviceWorker.ready,vapidKey=await getVapidKey();
    const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationServerKey(vapidKey)});
    await rpc("app_save_push_subscription",{p_token:authToken(),p_subscription:subscription.toJSON(),p_user_agent:navigator.userAgent});
    setUi(true);setStatus("Đã bật. Hãy nhấn Gửi thử để kiểm tra.","success");
  }catch(error){setStatus(error?.message||"Không thể bật thông báo.","warning")}finally{controls.toggle.disabled=false}
}
async function testPush(){
  controls.test.disabled=true;setStatus("Đang gửi thông báo thử…");
  try{await rpc("app_create_push_test_notification",{p_token:authToken()});setStatus("Đã gửi. Thông báo sẽ xuất hiện trong vài giây.","success")}
  catch(error){setStatus(error?.message||"Không thể gửi thông báo thử.","warning")}
  finally{controls.test.disabled=false}
}

if(controls){
  controls.toggle.addEventListener("click",togglePush);controls.test.addEventListener("click",testPush);refresh();
  document.addEventListener("click",event=>{if(event.target instanceof Element&&event.target.closest("#notificationBtn,#studentNotificationBtn"))refresh()});
}
