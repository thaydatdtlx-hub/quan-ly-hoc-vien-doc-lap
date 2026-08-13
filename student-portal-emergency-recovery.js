const OPTIONAL_RPC_FALLBACKS={
  app_list_training_sessions:[],
  app_list_training_requests:[],
  app_list_training_slots:[],
  app_list_notifications:[],
  app_student_get_theory_progress:{},
  app_student_list_payments:[],
  app_student_list_attendance:[]
};

function cloneFallback(value){
  return Array.isArray(value)?[]:{...value};
}

function installOptionalRpcFallback(){
  if(window.__studentOptionalRpcFallbackInstalled||typeof window.fetch!=="function")return;
  window.__studentOptionalRpcFallbackInstalled=true;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const url=typeof input==="string"?input:input?.url||"";
    const match=String(url).match(/\/rest\/v1\/rpc\/([^?/#]+)/);
    const rpcName=match?.[1]||"";
    const hasFallback=Object.prototype.hasOwnProperty.call(OPTIONAL_RPC_FALLBACKS,rpcName);
    if(!hasFallback)return nativeFetch(input,init);
    try{
      const response=await nativeFetch(input,init);
      if(response.ok)return response;
      console.warn(`[student-portal] Optional RPC ${rpcName} returned ${response.status}; using fallback.`);
    }catch(error){
      console.warn(`[student-portal] Optional RPC ${rpcName} failed; using fallback.`,error);
    }
    return new Response(JSON.stringify(cloneFallback(OPTIONAL_RPC_FALLBACKS[rpcName])),{
      status:200,
      headers:{"Content-Type":"application/json"}
    });
  };
}

function showStudentPortal(){
  if(location.pathname!=="/hoc-vien.html")return;
  const portal=document.getElementById("studentPortal");
  const loading=document.getElementById("studentLoading");
  if(portal)portal.classList.remove("hidden");
  if(loading)loading.classList.add("hidden");
  const view=new URLSearchParams(location.search).get("view");
  if(view==="payment"){
    window.setTimeout(()=>{
      document.querySelector('[data-student-finance-tab="payment"]')?.click();
      (document.getElementById("studentFinanceHub")||document.getElementById("studentPayment"))?.scrollIntoView({block:"start"});
    },500);
  }
}

installOptionalRpcFallback();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",showStudentPortal,{once:true});else showStudentPortal();
window.addEventListener("pageshow",showStudentPortal);
window.addEventListener("error",showStudentPortal);
window.addEventListener("unhandledrejection",showStudentPortal);
window.setTimeout(showStudentPortal,250);
window.setTimeout(showStudentPortal,1000);