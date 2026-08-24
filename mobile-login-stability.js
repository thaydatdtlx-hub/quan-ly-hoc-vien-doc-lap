const CANONICAL_ORIGIN="https://www.hoclaixecungdat.com";
const LEGACY_HOSTS=new Set(["hoc-vien-thay-dat.vercel.app","daotaolaixe-thaydat.vercel.app","daotaolaixetrongoi.com","www.daotaolaixetrongoi.com"]);
const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";

function canonicalizeLoginOrigin(){
  if(!LEGACY_HOSTS.has(location.hostname))return false;
  const isLoginPage=location.pathname==="/"||location.pathname==="/index.html"||location.pathname==="/dang-nhap.html";
  if(!isLoginPage)return false;
  location.replace(new URL("/?login=1",CANONICAL_ORIGIN).href);
  return true;
}

function requestError(data,status,fallback){
  const error=new Error(data?.message||data?.details||data?.error||fallback);
  error.status=status;
  return error;
}

async function request(url,options,timeoutMs){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    return await fetch(url,{...options,signal:controller.signal});
  }catch(error){
    if(error?.name==="AbortError")throw new Error("Kết nối mạng đang chậm. Vui lòng kiểm tra 4G/5G hoặc Wi-Fi rồi thử lại.");
    throw error;
  }finally{clearTimeout(timer)}
}

async function parseResponse(response){
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw requestError(data,response.status,"Không thể kết nối máy chủ");
  return data;
}

async function rpc(name,body={},timeoutMs=9000){
  try{
    const response=await request("/api/student-rpc",{
      method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({fn:name,body})
    },timeoutMs);
    return await parseResponse(response);
  }catch(proxyError){
    if(proxyError?.status>=400&&proxyError.status<500)throw proxyError;
    console.warn(`[mobile-login] same-origin ${name} failed; using direct fallback.`,proxyError);
    const response=await request(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{
      method:"POST",cache:"no-store",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
      body:JSON.stringify(body)
    },6500);
    return parseResponse(response);
  }
}

function clearAuth(){for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}}
function saveAuth(token,kind,remember){
  clearAuth();
  sessionStorage.setItem("hv_token",token);sessionStorage.setItem("hv_auth_kind",kind);
  if(remember){localStorage.setItem("hv_token",token);localStorage.setItem("hv_auth_kind",kind)}
}
function errorText(error){return error?.message||"Đăng nhập chưa thành công. Vui lòng thử lại."}

function mountMobileLoginStability(){
  if(canonicalizeLoginOrigin())return;
  const form=document.getElementById("loginForm");
  if(!form||form.dataset.mobileStableLogin==="1")return;
  const mobile=matchMedia("(max-width: 900px)").matches||matchMedia("(pointer: coarse)").matches;
  if(!mobile)return;
  form.dataset.mobileStableLogin="1";
  form.addEventListener("submit",async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const username=document.getElementById("username")?.value.trim()||"";
    const password=document.getElementById("password")?.value||"";
    const remember=Boolean(document.getElementById("rememberLogin")?.checked);
    const error=document.getElementById("loginError"),button=document.getElementById("loginBtn"),label=button?.querySelector("span");
    if(error)error.textContent="";if(button){button.disabled=true;button.setAttribute("aria-busy","true")}if(label)label.textContent="Đang đăng nhập…";
    try{
      let result=null,kind="student";
      try{result=await rpc("app_student_login",{p_username:username,p_password:password});kind=result?.role==="public_theory"?"public_theory":"student"}
      catch(studentError){
        try{result=await rpc("app_login",{p_username:username,p_password:password});kind="manager"}
        catch(managerError){throw studentError?.message&&!/app_student_login|schema cache|PGRST202/i.test(studentError.message)?studentError:managerError}
      }
      if(!result?.token)throw new Error("Máy chủ chưa trả phiên đăng nhập. Vui lòng thử lại.");
      saveAuth(result.token,kind,remember);
      if(remember)localStorage.setItem("hv_saved_user",username);else localStorage.removeItem("hv_saved_user");
      if(kind==="student")return location.replace("/hoc-vien.html?mobile=3");
      if(kind==="public_theory")return location.replace("/600-cau-hoi.html");
      location.replace("/?login=1");
    }catch(loginError){
      if(error)error.textContent=errorText(loginError);
      if(button){button.disabled=false;button.removeAttribute("aria-busy")}if(label)label.textContent="Đăng nhập";
    }
  },true);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountMobileLoginStability,{once:true});
else mountMobileLoginStability();
window.addEventListener("pageshow",mountMobileLoginStability);
