const PROXY_URL="/api/student-rpc";
const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";

function apiError(data,status,fallback){
  const error=new Error(data?.message||data?.details||data?.error||fallback);
  error.status=status;
  return error;
}

async function requestJson(url,options,timeoutMs,fallback){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{...options,signal:controller.signal,cache:"no-store"});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw apiError(data,response.status,fallback);
    return data;
  }catch(error){
    if(error?.name==="AbortError")throw apiError(null,504,"Kết nối dữ liệu quá thời gian.");
    throw error;
  }finally{clearTimeout(timer)}
}

function proxyRpc(fn,body,timeoutMs){
  return requestJson(PROXY_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({fn,body})
  },timeoutMs,`Không tải được ${fn}`);
}

function directRpc(fn,body,timeoutMs){
  return requestJson(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  },timeoutMs,`Không tải được ${fn}`);
}

function canUseFallback(error){
  const status=Number(error?.status)||0;
  return !status||status===408||status===429||status>=500;
}

export async function studentRpc(fn,body={},options={}){
  const directTimeoutMs=Number(options.directTimeoutMs)||6000;
  const proxyTimeoutMs=Number(options.proxyTimeoutMs)||7500;
  try{
    return await directRpc(fn,body,directTimeoutMs);
  }catch(directError){
    if(!canUseFallback(directError))throw directError;
    console.warn(`[student-rpc] direct ${fn} failed; using same-origin fallback.`,directError);
    return proxyRpc(fn,body,proxyTimeoutMs);
  }
}
