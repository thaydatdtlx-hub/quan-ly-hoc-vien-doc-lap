(()=>{
  const SUPABASE_ORIGIN="https://pkzxkvcncipfszeukpwu.supabase.co";
  const RPC_PREFIX=`${SUPABASE_ORIGIN}/rest/v1/rpc/`;
  const nativeFetch=window.fetch.bind(window);
  const PROXY_TIMEOUT_MS=7000;
  const DIRECT_TIMEOUT_MS=6500;

  async function timedFetch(input,init={},timeoutMs=7000){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{return await nativeFetch(input,{...init,signal:controller.signal})}
    finally{clearTimeout(timer)}
  }

  function timeoutResponse(){
    return new Response(JSON.stringify({message:"Kết nối dữ liệu quá thời gian. Vui lòng thử lại."}),{
      status:504,
      headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
    });
  }

  window.fetch=async function stableFetch(input,init={}){
    const rawUrl=typeof input==="string"?input:input?.url||"";
    const method=String(init?.method||(typeof input!=="string"?input?.method:"")||"GET").toUpperCase();
    if(method!=="POST"||!rawUrl.startsWith(RPC_PREFIX))return nativeFetch(input,init);

    const fn=decodeURIComponent(rawUrl.slice(RPC_PREFIX.length).split(/[?#]/)[0]||"");
    if(!/^app_[a-z0-9_]+$/i.test(fn))return nativeFetch(input,init);

    let body={};
    try{if(typeof init?.body==="string")body=JSON.parse(init.body)||{}}catch{}

    try{
      const proxy=await timedFetch("/api/student-rpc",{
        method:"POST",
        cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({fn,body})
      },PROXY_TIMEOUT_MS);
      if(proxy.status!==400)return proxy;
      try{
        const payload=await proxy.clone().json();
        if(payload?.error!=="RPC not allowed")return proxy;
      }catch{return proxy}
    }catch(error){
      console.warn(`[rpc-preflight] same-origin ${fn} unavailable; using direct fallback.`,error);
    }

    try{return await timedFetch(input,{...init,cache:"no-store"},DIRECT_TIMEOUT_MS)}
    catch(error){
      console.warn(`[rpc-preflight] direct ${fn} timed out.`,error);
      return timeoutResponse();
    }
  };

  window.__HOCLAIXECUNGDAT_RPC_PREFLIGHT__={version:"20260901-5",active:true};
})();
