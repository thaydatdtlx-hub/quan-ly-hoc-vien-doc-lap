const PROXY_URL="/api/student-rpc";
const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";

function apiError(data,status,fallback){
  const error=new Error(data?.message||data?.details||data?.error||fallback);
  error.status=status;
  return error;
}

async function fetchWithTimeout(url,options,timeoutMs){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal})}
  catch(error){
    if(error?.name==="AbortError")throw apiError(null,504,"Kết nối dữ liệu quá thời gian.");
    throw error;
  }finally{clearTimeout(timer)}
}

async function parseResponse(response,fallback){
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw apiError(data,response.status,fallback);
  return data;
}

async function proxyRpc(fn,body,timeoutMs){
  const response=await fetchWithTimeout(PROXY_URL,{
    method:"POST",
    cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({fn,body})
  },timeoutMs);
  return parseResponse(response,`Không tải được ${fn}`);
}

async function directRpc(fn,body,timeoutMs){
  const response=await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:"POST",
    cache:"no-store",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  },timeoutMs);
  return parseResponse(response,`Không tải được ${fn}`);
}

function isClientError(error){return error?.status>=400&&error.status<500}

export async function studentRpc(fn,body={},options={}){
  const requestedProxyTimeout=Number(options.proxyTimeoutMs)||9500;
  const proxyTimeoutMs=Math.min(requestedProxyTimeout,3500);
  const directTimeoutMs=Number(options.directTimeoutMs)||6500;
  const scheduleDirectFirst=Number(options.proxyTimeoutMs)===6500&&Number(options.directTimeoutMs)===4500;

  if(scheduleDirectFirst){
    try{return await directRpc(fn,body,directTimeoutMs)}
    catch(directError){
      if(isClientError(directError))throw directError;
      console.warn(`[student-rpc] direct schedule ${fn} failed; using same-origin fallback.`,directError);
      return proxyRpc(fn,body,proxyTimeoutMs);
    }
  }

  try{return await proxyRpc(fn,body,proxyTimeoutMs)}
  catch(proxyError){
    if(proxyError?.status>=400&&proxyError.status<500)throw proxyError;
    console.warn(`[student-rpc] same-origin ${fn} failed; using direct fallback.`,proxyError);
    return directRpc(fn,body,directTimeoutMs);
  }
}
