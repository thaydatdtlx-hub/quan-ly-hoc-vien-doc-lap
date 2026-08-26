import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const [client,api,portal,fullPortal,payloadTools,recovery,attendance,payments,chat,login,serviceWorker,injector,viteConfig]=await Promise.all([
  readFile(new URL("student-rpc-client.js",root),"utf8"),
  readFile(new URL("api/student-rpc.js",root),"utf8"),
  readFile(new URL("student-rescue-runtime-ios.js",root),"utf8"),
  readFile(new URL("student.js",root),"utf8"),
  readFile(new URL("student-payload.js",root),"utf8"),
  readFile(new URL("student-mobile-recovery.js",root),"utf8"),
  readFile(new URL("student-attendance-rescue.js",root),"utf8"),
  readFile(new URL("student-payment-history-rescue.js",root),"utf8"),
  readFile(new URL("ai-chat.js",root),"utf8"),
  readFile(new URL("mobile-login-stability.js",root),"utf8"),
  readFile(new URL("public/sw.js",root),"utf8"),
  readFile(new URL("scripts/inject-mobile-login-stability.mjs",root),"utf8"),
  readFile(new URL("vite.config.js",root),"utf8")
]);

for(const token of ["/api/student-rpc","proxyRpc","directRpc","AbortController","proxyError?.status>=400","same-origin"]){
  if(!client.includes(token))throw new Error(`Client RPC học viên thiếu: ${token}`);
}
if(/directRpc[\s\S]*?Cache-Control/.test(client))throw new Error("Fallback trực tiếp không được gửi header Cache-Control qua CORS.");
for(const token of ["app_student_login","app_login","app_student_portal","app_student_me","app_student_logout","app_student_list_attendance","app_student_list_payments","app_list_training_sessions","app_public_site_config","Request too large","upstream unavailable"]){
  if(!api.includes(token))throw new Error(`Proxy RPC học viên thiếu: ${token}`);
}
const portalRpcNames=[...fullPortal.matchAll(/rpc\("([^"]+)"/g)].map(match=>match[1]);
for(const name of new Set(portalRpcNames)){
  if(!api.includes(`"${name}"`))throw new Error(`Proxy chưa cho phép RPC được portal đầy đủ sử dụng: ${name}`);
}
for(const [name,source] of [["portal đầy đủ",fullPortal],["portal dự phòng",portal],["điểm danh",attendance],["học phí",payments],["trợ lý",chat]]){
  if(!source.includes("student-rpc-client.js"))throw new Error(`Module ${name} chưa dùng kết nối cùng domain.`);
}
for(const token of ["studentRpc(fn,body","app_list_training_requests","app_student_change_password","student-profile-ready","data-student-profile","normalizeCoreRpcPayload","Promise.allSettled","data-student-functions","student-functions-ready"]){
  if(!fullPortal.includes(token))throw new Error(`Portal đầy đủ thiếu chức năng hoặc trạng thái sẵn sàng: ${token}`);
}
for(const token of ["normalizeCoreRpcPayload","isStudentAuthError","value.data","value.result"]){
  if(!payloadTools.includes(token))throw new Error(`Chuẩn hóa phản hồi học viên thiếu: ${token}`);
}
if(portal.includes("XMLHttpRequest")||portal.includes("Promise.race"))throw new Error("Portal iOS vẫn dùng fallback request dễ treo.");
for(const token of ["finishProfileSync","student-profile-ready","querySelectorAll(\"#studentRuntimeWarning\")","visibilitychange"]){
  if(!portal.includes(token))throw new Error(`Portal chưa kết thúc chắc chắn trạng thái đồng bộ: ${token}`);
}
for(const token of ["student_mobile_recovery_20260816_v2","student-profile-ready","data-student-profile","querySelectorAll"]){
  if(!recovery.includes(token))throw new Error(`Lớp phục hồi hồ sơ mobile thiếu: ${token}`);
}
for(const token of ["stabilizeStudentPortal","student-mobile-recovery.js?v=20260817-1","ai-chat.js?v=20260816-3"]){
  if(!viteConfig.includes(token))throw new Error(`Bản build cổng học viên thiếu: ${token}`);
}
for(const forbidden of ["html.matchAll(/<script","student_rescue_cleanup_20260816","student-rescue-runtime-ios.js?v="]){
  if(viteConfig.includes(forbidden))throw new Error(`Build vẫn đang loại bỏ hoặc thay thế portal đầy đủ: ${forbidden}`);
}
for(const token of ["/api/student-rpc","same-origin","app_student_login","app_login","/hoc-vien.html?mobile=3"]){
  if(!login.includes(token))throw new Error(`Đăng nhập mobile thiếu: ${token}`);
}
if(/headers:\{apikey:[^}]*Cache-Control/.test(login))throw new Error("Fallback đăng nhập trực tiếp không được gửi header Cache-Control qua CORS.");
if(!serviceWorker.includes('thay-dat-pwa-v44')||!serviceWorker.includes('/mobile-login-stability.js')||!serviceWorker.includes('/student-core-recovery.js')||!serviceWorker.includes('/student-mobile-recovery.js')||!serviceWorker.includes('/lich-dao-tao.html'))throw new Error("PWA chưa làm mới cache cho luồng đăng nhập, lịch và hồ sơ mobile.");
for(const token of ['mobile-login-stability.js?v=20260826-4','login-final-v27.css?v=27','copyFile','resolve("dist","mobile-login-stability.js")']){
  if(!injector.includes(token))throw new Error(`Bản build đăng nhập mobile thiếu: ${token}`);
}

const {default:handler}=await import(new URL("api/student-rpc.js",root));
function invokeHandler(fn){
  return new Promise(resolve=>{
  const response={
    statusCode:200,
    setHeader(){},
    status(code){this.statusCode=code;return this},
    json(payload){resolve({status:this.statusCode,payload});return this},
    send(payload){resolve({status:this.statusCode,payload});return this}
  };
    handler({method:"POST",body:{fn,body:{p_token:"test"}}},response);
  });
}
const result=await invokeHandler("app_not_allowed");
if(result.status!==400||result.payload?.error!=="RPC not allowed")throw new Error("Whitelist RPC học viên chưa chặn hàm ngoài phạm vi.");

const handlerFetch=globalThis.fetch;
try{
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:true}),{status:200,headers:{"Content-Type":"application/json"}});
  for(const name of new Set(portalRpcNames)){
    const allowed=await invokeHandler(name);
    if(allowed.status!==200||allowed.payload?.error==="RPC not allowed")throw new Error(`Proxy vẫn chặn RPC portal: ${name}`);
  }
}finally{globalThis.fetch=handlerFetch}

const {studentRpc}=await import(new URL("student-rpc-client.js",root));
const {isStudentAuthError,normalizeCoreRpcPayload}=await import(new URL("student-payload.js",root));
const wrappedProfile=normalizeCoreRpcPayload([JSON.stringify({data:{id:"student-wrapped",name:"Học viên bọc"}})]);
if(wrappedProfile?.id!=="student-wrapped")throw new Error("Portal chưa đọc được phản hồi hồ sơ dạng chuỗi/mảng/bọc.");
if(isStudentAuthError(new Error("Không tìm thấy hồ sơ học viên.")))throw new Error("Lỗi dữ liệu đang bị nhận nhầm là lỗi phiên đăng nhập.");
if(!isStudentAuthError(Object.assign(new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn."),{status:400})))throw new Error("Portal chưa nhận diện đúng phiên học viên hết hạn.");
const nativeFetch=globalThis.fetch;
const nativeWarn=console.warn;
try{
  let calls=[];
  globalThis.fetch=async(url,options)=>{
    calls.push({url:String(url),options});
    return new Response(JSON.stringify({id:"student-ok"}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  const proxyResult=await studentRpc("app_student_portal",{p_token:"test"});
  if(proxyResult?.id!=="student-ok"||calls.length!==1||calls[0].url!=="/api/student-rpc")throw new Error("Client chưa ưu tiên proxy cùng domain.");

  calls=[];
  globalThis.fetch=async(url,options)=>{
    calls.push({url:String(url),options});
    if(String(url)==="/api/student-rpc")return new Response(JSON.stringify({error:"Upstream unavailable"}),{status:502,headers:{"Content-Type":"application/json"}});
    return new Response(JSON.stringify({id:"fallback-ok"}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  console.warn=()=>{};
  const fallbackResult=await studentRpc("app_student_portal",{p_token:"test"});
  if(fallbackResult?.id!=="fallback-ok"||calls.length!==2||calls[1].options?.headers?.["Cache-Control"])throw new Error("Fallback trực tiếp trên iOS chưa an toàn.");

  calls=[];
  globalThis.fetch=async(url,options)=>{
    calls.push({url:String(url),options});
    return new Response(JSON.stringify({error:"Phiên đăng nhập không hợp lệ hoặc đã hết hạn."}),{status:400,headers:{"Content-Type":"application/json"}});
  };
  let rejected=false;
  try{await studentRpc("app_student_portal",{p_token:"expired"})}catch{rejected=true}
  if(!rejected||calls.length!==1)throw new Error("Lỗi phiên 4xx đang bị retry không cần thiết.");
}finally{globalThis.fetch=nativeFetch;console.warn=nativeWarn}

console.log("Kết nối dữ liệu học viên hợp lệ: same-origin trước, fallback iOS an toàn, whitelist và health check đã sẵn sàng.");
