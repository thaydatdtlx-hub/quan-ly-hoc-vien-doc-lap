const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const BOOTSTRAP_KEY="hv_student_bootstrap_v1";
const nativeFetch=window.fetch.bind(window);

function clearBootstrap(){
  for(const store of [localStorage,sessionStorage])store.removeItem(BOOTSTRAP_KEY);
}
function saveBootstrap(profile,username=""){
  if(!profile?.id)return;
  clearBootstrap();
  const remember=document.getElementById("rememberLogin")?.checked;
  const store=remember?localStorage:sessionStorage;
  store.setItem(BOOTSTRAP_KEY,JSON.stringify({profile,username:String(username||"").trim(),saved_at:Date.now()}));
}
async function preloadStudentProfile(token,username){
  if(!token)return;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  try{
    const response=await nativeFetch(`${SUPABASE_URL}/rest/v1/rpc/app_student_portal`,{
      method:"POST",
      cache:"no-store",
      signal:controller.signal,
      headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json","Cache-Control":"no-store"},
      body:JSON.stringify({p_token:token})
    });
    if(!response.ok)return;
    const profile=await response.json().catch(()=>null);
    if(profile?.id)saveBootstrap(profile,username);
  }catch(error){
    console.warn("[student-bootstrap] Không tải trước được hồ sơ; Cổng học viên sẽ tự thử lại.",error);
  }finally{clearTimeout(timer)}
}

window.fetch=async(input,init)=>{
  const response=await nativeFetch(input,init);
  try{
    const url=typeof input==="string"?input:input?.url||"";
    if(/\/rest\/v1\/rpc\/app_student_login(?:\?|$)/.test(url)&&response.ok){
      const data=await response.clone().json().catch(()=>null);
      if(data?.role==="student"&&data?.token){
        const username=document.getElementById("username")?.value?.trim()||"";
        await preloadStudentProfile(data.token,username);
      }
    }
  }catch(error){
    console.warn("[student-bootstrap] Không tạo được dữ liệu khởi động.",error);
  }
  return response;
};
