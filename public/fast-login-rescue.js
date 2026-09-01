(()=>{
  const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
  const SUPABASE_RPC_PREFIX=`${SUPABASE_URL}/rest/v1/rpc/`;
  const BOOTSTRAP_KEY="hv_manager_bootstrap_v1";
  const BOOTSTRAP_TTL_MS=30000;
  const upstreamFetch=window.fetch.bind(window);

  function readBootstrap(){
    try{
      const raw=sessionStorage.getItem(BOOTSTRAP_KEY);
      if(!raw)return null;
      const value=JSON.parse(raw);
      if(!value?.token||!value?.me||Date.now()-Number(value.createdAt||0)>BOOTSTRAP_TTL_MS){
        sessionStorage.removeItem(BOOTSTRAP_KEY);
        return null;
      }
      return value;
    }catch{
      sessionStorage.removeItem(BOOTSTRAP_KEY);
      return null;
    }
  }

  function saveBootstrap(result){
    if(!result?.token||!result?.id||!result?.username||!result?.role)return;
    try{
      sessionStorage.setItem(BOOTSTRAP_KEY,JSON.stringify({
        token:result.token,
        createdAt:Date.now(),
        me:{
          id:result.id,
          username:result.username,
          role:result.role,
          active:result.active!==false,
          force_change_password:Boolean(result.force_change_password)
        }
      }));
    }catch{}
  }

  function syntheticJson(value){
    return new Response(JSON.stringify(value),{
      status:200,
      headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
    });
  }

  // On the first page load after a successful manager login, app.js normally
  // asks the server who the current user is. app_login already returned that
  // verified identity, so reuse it once and show the dashboard immediately.
  window.fetch=async function fastLoginFetch(input,init={}){
    const rawUrl=typeof input==="string"?input:input?.url||"";
    const method=String(init?.method||(typeof input!=="string"?input?.method:"")||"GET").toUpperCase();
    if(method==="POST"&&rawUrl.startsWith(`${SUPABASE_RPC_PREFIX}app_me`)){
      let body={};
      try{if(typeof init?.body==="string")body=JSON.parse(init.body)||{}}catch{}
      const bootstrap=readBootstrap();
      if(bootstrap&&String(body?.p_token||"")===String(bootstrap.token)){
        sessionStorage.removeItem(BOOTSTRAP_KEY);
        return syntheticJson(bootstrap.me);
      }
    }
    return upstreamFetch(input,init);
  };

  function requestError(data,status,fallback){
    const error=new Error(data?.message||data?.details||data?.error||fallback);
    error.status=status;
    return error;
  }

  async function timedFetch(input,init={},timeoutMs=6000){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{return await fetch(input,{...init,signal:controller.signal})}
    finally{clearTimeout(timer)}
  }

  async function rpc(name,body={}){
    try{
      const response=await timedFetch("/api/student-rpc",{
        method:"POST",
        cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({fn:name,body})
      },6000);
      const data=await response.json().catch(()=>null);
      if(!response.ok)throw requestError(data,response.status,"Không thể kết nối máy chủ");
      return data;
    }catch(proxyError){
      if(proxyError?.status>=400&&proxyError.status<500)throw proxyError;
      const response=await timedFetch(`${SUPABASE_RPC_PREFIX}${name}`,{
        method:"POST",
        cache:"no-store",
        headers:{apikey:"sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo","Content-Type":"application/json"},
        body:JSON.stringify(body)
      },5000);
      const data=await response.json().catch(()=>null);
      if(!response.ok)throw requestError(data,response.status,"Không thể kết nối máy chủ");
      return data;
    }
  }

  function clearAuth(){
    for(const store of [localStorage,sessionStorage]){
      store.removeItem("hv_token");
      store.removeItem("hv_auth_kind");
    }
  }

  function saveAuth(token,kind,remember){
    clearAuth();
    sessionStorage.setItem("hv_token",token);
    sessionStorage.setItem("hv_auth_kind",kind);
    if(remember){
      localStorage.setItem("hv_token",token);
      localStorage.setItem("hv_auth_kind",kind);
    }
  }

  function errorText(error){return error?.message||"Đăng nhập chưa thành công. Vui lòng thử lại."}

  function mountFastLogin(){
    const form=document.getElementById("loginForm");
    if(!form||form.dataset.fastLoginRescue==="1")return;
    form.dataset.fastLoginRescue="1";
    form.addEventListener("submit",async event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      const username=document.getElementById("username")?.value.trim()||"";
      const password=document.getElementById("password")?.value||"";
      const remember=Boolean(document.getElementById("rememberLogin")?.checked);
      const error=document.getElementById("loginError");
      const button=document.getElementById("loginBtn");
      const label=button?.querySelector("span");
      if(error)error.textContent="";
      if(button){button.disabled=true;button.setAttribute("aria-busy","true")}
      if(label)label.textContent="Đang đăng nhập…";

      try{
        let result=null,kind="manager";
        try{
          result=await rpc("app_login",{p_username:username,p_password:password});
        }catch(managerError){
          try{
            result=await rpc("app_student_login",{p_username:username,p_password:password});
            kind=result?.role==="public_theory"?"public_theory":"student";
          }catch(studentError){
            if(/app_student_login|schema cache|PGRST202/i.test(errorText(studentError)))throw managerError;
            throw studentError;
          }
        }

        if(!result?.token)throw new Error("Máy chủ chưa trả phiên đăng nhập. Vui lòng thử lại.");
        saveAuth(result.token,kind,remember);
        if(remember)localStorage.setItem("hv_saved_user",username);else localStorage.removeItem("hv_saved_user");

        if(kind==="student")return location.replace("/hoc-vien.html?fast=1");
        if(kind==="public_theory")return location.replace("/600-cau-hoi.html");

        saveBootstrap(result);
        location.replace("/?login=1&fast=1");
      }catch(loginError){
        if(error)error.textContent=errorText(loginError);
        if(button){button.disabled=false;button.removeAttribute("aria-busy")}
        if(label)label.textContent="Đăng nhập";
      }
    },true);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountFastLogin,{once:true});
  else mountFastLogin();
  window.addEventListener("pageshow",mountFastLogin);
  window.__HOCLAIXECUNGDAT_FAST_LOGIN_RESCUE__={version:"20260901-1",active:true};
})();
