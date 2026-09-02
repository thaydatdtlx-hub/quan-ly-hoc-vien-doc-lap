(()=>{
  if(window.__HOCLAIXECUNGDAT_STABLE_LOGIN__?.active)return;

  const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
  const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
  const PROXY_URL="/api/student-rpc";
  const LOGIN_TIMEOUT_MS=9000;

  function requestError(data,status,fallback){
    const error=new Error(data?.message||data?.details||data?.error||fallback);
    error.status=status;
    return error;
  }

  async function timedFetch(input,init={},timeoutMs=LOGIN_TIMEOUT_MS){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      return await fetch(input,{...init,cache:"no-store",signal:controller.signal});
    }catch(error){
      if(error?.name==="AbortError")throw new Error("Kết nối máy chủ quá thời gian. Vui lòng kiểm tra mạng rồi thử lại.");
      throw error;
    }finally{
      clearTimeout(timer);
    }
  }

  async function readResponse(response){
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw requestError(data,response.status,"Không thể kết nối máy chủ");
    return data;
  }

  async function rpc(name,body={}){
    try{
      const proxy=await timedFetch(PROXY_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({fn:name,body})
      },LOGIN_TIMEOUT_MS);
      const data=await proxy.json().catch(()=>null);
      if(proxy.ok)return data;
      if(!(proxy.status===400&&data?.error==="RPC not allowed")){
        throw requestError(data,proxy.status,"Không thể kết nối máy chủ");
      }
    }catch(error){
      if(error?.status>=400&&error.status<500)throw error;
      console.warn(`[stable-login] same-origin ${name} unavailable; using direct fallback.`,error);
    }

    const direct=await timedFetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{
      method:"POST",
      headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
      body:JSON.stringify(body)
    },7500);
    return readResponse(direct);
  }

  function clearStoredAuth(){
    for(const store of [localStorage,sessionStorage]){
      store.removeItem("hv_token");
      store.removeItem("hv_auth_kind");
    }
  }

  function saveAuth(token,kind,remember){
    clearStoredAuth();
    sessionStorage.setItem("hv_token",token);
    sessionStorage.setItem("hv_auth_kind",kind);
    if(remember){
      localStorage.setItem("hv_token",token);
      localStorage.setItem("hv_auth_kind",kind);
    }
  }

  async function clearOldPwaRuntime(){
    try{
      if("serviceWorker" in navigator){
        const registrations=await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(registrations.map(registration=>registration.unregister()));
      }
    }catch(error){
      console.warn("[stable-login] service worker cleanup skipped",error);
    }
    try{
      if("caches" in window){
        const keys=await caches.keys();
        const stale=keys.filter(key=>key.startsWith("thay-dat-pwa-")||key.startsWith("hoclaixecungdat-pwa-"));
        await Promise.allSettled(stale.map(key=>caches.delete(key)));
      }
    }catch(error){
      console.warn("[stable-login] cache cleanup skipped",error);
    }
  }

  function errorText(error){
    return error?.message||"Đăng nhập chưa thành công. Vui lòng thử lại.";
  }

  function destination(kind){
    const stamp=Date.now();
    if(kind==="student")return `/hoc-vien.html?login=${stamp}`;
    if(kind==="public_theory")return `/600-cau-hoi.html?login=${stamp}`;
    return `/?login=1&session=${stamp}`;
  }

  function mount(){
    const form=document.getElementById("loginForm");
    if(!form||form.dataset.stableLoginRuntime==="1")return;
    form.dataset.stableLoginRuntime="1";

    form.addEventListener("submit",async event=>{
      event.preventDefault();
      event.stopImmediatePropagation();

      const username=document.getElementById("username")?.value.trim()||"";
      const password=document.getElementById("password")?.value||"";
      const remember=Boolean(document.getElementById("rememberLogin")?.checked);
      const errorBox=document.getElementById("loginError");
      const button=document.getElementById("loginBtn");
      const label=button?.querySelector("span");

      if(errorBox)errorBox.textContent="";
      if(button){button.disabled=true;button.setAttribute("aria-busy","true")}
      if(label)label.textContent="Đang đăng nhập…";

      try{
        let result=null;
        let kind="manager";
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
        if(remember)localStorage.setItem("hv_saved_user",username);
        else localStorage.removeItem("hv_saved_user");

        await clearOldPwaRuntime();
        location.replace(destination(kind));
      }catch(error){
        if(errorBox)errorBox.textContent=errorText(error);
        if(button){button.disabled=false;button.removeAttribute("aria-busy")}
        if(label)label.textContent="Đăng nhập";
      }
    },true);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
  window.addEventListener("pageshow",mount);
  window.__HOCLAIXECUNGDAT_STABLE_LOGIN__={version:"20260902-1",active:true};
})();
