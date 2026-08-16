import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const [client,api,portal,attendance,payments,chat]=await Promise.all([
  readFile(new URL("student-rpc-client.js",root),"utf8"),
  readFile(new URL("api/student-rpc.js",root),"utf8"),
  readFile(new URL("student-rescue-runtime-ios.js",root),"utf8"),
  readFile(new URL("student-attendance-rescue.js",root),"utf8"),
  readFile(new URL("student-payment-history-rescue.js",root),"utf8"),
  readFile(new URL("ai-chat.js",root),"utf8")
]);

for(const token of ["/api/student-rpc","proxyRpc","directRpc","AbortController","proxyError?.status>=400","same-origin"]){
  if(!client.includes(token))throw new Error(`Client RPC học viên thiếu: ${token}`);
}
if(/directRpc[\s\S]*?Cache-Control/.test(client))throw new Error("Fallback trực tiếp không được gửi header Cache-Control qua CORS.");
for(const token of ["app_student_portal","app_student_me","app_student_logout","app_student_list_attendance","app_student_list_payments","app_list_training_sessions","app_public_site_config","Request too large","upstream unavailable"]){
  if(!api.includes(token))throw new Error(`Proxy RPC học viên thiếu: ${token}`);
}
for(const [name,source] of [["portal",portal],["điểm danh",attendance],["học phí",payments],["trợ lý",chat]]){
  if(!source.includes("student-rpc-client.js"))throw new Error(`Module ${name} chưa dùng kết nối cùng domain.`);
}
if(portal.includes("XMLHttpRequest")||portal.includes("Promise.race"))throw new Error("Portal iOS vẫn dùng fallback request dễ treo.");

const {default:handler}=await import(new URL("api/student-rpc.js",root));
const result=await new Promise(resolve=>{
  const response={
    statusCode:200,
    setHeader(){},
    status(code){this.statusCode=code;return this},
    json(payload){resolve({status:this.statusCode,payload});return this},
    send(payload){resolve({status:this.statusCode,payload});return this}
  };
  handler({method:"POST",body:{fn:"app_login",body:{}}},response);
});
if(result.status!==400||result.payload?.error!=="RPC not allowed")throw new Error("Whitelist RPC học viên chưa chặn hàm ngoài phạm vi.");

const {studentRpc}=await import(new URL("student-rpc-client.js",root));
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
