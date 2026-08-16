const STUDENT_RPC_PATH="/api/student-rpc";
const SUPABASE_RPC=/^https:\/\/pkzxkvcncipfszeukpwu\.supabase\.co\/rest\/v1\/rpc\/([a-z0-9_]+)(?:\?.*)?$/i;
const ALLOWED=new Set([
  "app_student_login","app_login","app_student_portal","app_student_me","app_student_logout",
  "app_student_list_attendance","app_student_list_payments"
]);
const nativeFetch=window.fetch.bind(window);

function parseBody(body){
  if(!body)return{};
  if(typeof body==="string"){try{return JSON.parse(body)}catch{return{}}}
  return body&&typeof body==="object"?body:{};
}

window.fetch=function studentSameOriginFetch(input,init={}){
  const raw=typeof input==="string"?input:input?.url||"";
  const match=raw.match(SUPABASE_RPC);
  if(!match||!ALLOWED.has(match[1]))return nativeFetch(input,init);
  const fn=match[1];
  const headers=new Headers(init.headers||{});
  headers.delete("apikey");
  headers.set("Content-Type","application/json");
  headers.set("Cache-Control","no-store");
  return nativeFetch(STUDENT_RPC_PATH,{
    ...init,
    method:"POST",
    cache:"no-store",
    headers,
    body:JSON.stringify({fn,body:parseBody(init.body)})
  });
};

window.__studentRpcSameOrigin=true;
