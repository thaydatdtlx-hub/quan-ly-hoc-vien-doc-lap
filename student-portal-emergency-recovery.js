const OPTIONAL_RPC_FALLBACKS={
  app_list_training_sessions:[],
  app_list_training_requests:[],
  app_list_training_slots:[],
  app_list_notifications:[],
  app_student_get_theory_progress:{},
  app_student_list_payments:[],
  app_student_list_attendance:[]
};

const STUDENT_RPC_URL="/api/student-rpc";
const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
let coreProfileRecovery=null;

function studentToken(){
  return localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
}

function formatMoney(value){
  return new Intl.NumberFormat("vi-VN").format(Math.max(0,Number(value)||0))+" ₫";
}

function formatDate(value){
  const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match?`${match[3]}/${match[2]}/${match[1]}`:(value||"Chưa cập nhật");
}

function setText(id,value){
  const node=document.getElementById(id);
  if(node)node.textContent=String(value??"");
}

async function fetchJson(url,options,timeoutMs=9000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{...options,cache:"no-store",signal:controller.signal});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.details||data?.error||`HTTP ${response.status}`);
    return data;
  }finally{
    clearTimeout(timer);
  }
}

async function loadStudentProfile(token){
  const body={p_token:token};
  try{
    return await fetchJson(STUDENT_RPC_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json","Cache-Control":"no-store"},
      body:JSON.stringify({fn:"app_student_portal",body})
    });
  }catch(proxyError){
    return fetchJson(`${SUPABASE_URL}/rest/v1/rpc/app_student_portal`,{
      method:"POST",
      headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json","Cache-Control":"no-store"},
      body:JSON.stringify(body)
    },6500);
  }
}

function renderCoreStudentProfile(student){
  if(!student?.id)return false;
  const name=student.name||"Học viên";
  const studentCode=student.student_code||"Chưa có mã";
  const course=student.course||"Chưa có khóa";
  const licenseClass=student.license_class||"Chưa có hạng";

  setText("studentName",name);
  setText("studentCode",studentCode);
  setText("studentCourse",course);
  setText("studentLicense",licenseClass);
  setText("mobileStudentOverviewTitle",`Xin chào, ${name}`);
  setText("mobileStudentClass",licenseClass);
  setText("mobileStudentAccountName",name);
  setText("mobileStudentActionTitle","Hồ sơ đã sẵn sàng");
  setText("mobileStudentActionDetail","Dữ liệu mới nhất từ Admin đã được đồng bộ.");

  const photo=document.getElementById("studentPhoto");
  const placeholder=document.getElementById("studentPhotoPlaceholder");
  if(student.photo_data&&photo){photo.src=student.photo_data;photo.classList.remove("hidden");placeholder?.classList.add("hidden")}

  const total=Math.max(0,Number(student.tuition_total)||0);
  const paid=Math.max(0,Number(student.paid)||0);
  const debt=Math.max(0,total-paid);
  const rate=total?Math.min(100,Math.round(paid/total*100)):0;
  setText("tuitionTotal",formatMoney(total));
  setText("tuitionPaid",formatMoney(paid));
  setText("tuitionDebt",formatMoney(debt));
  setText("tuitionRate",`Đã đóng ${rate}% tổng học phí`);
  setText("tuitionDebtNote",debt?"Vui lòng hoàn tất theo lịch hẹn":"Không còn công nợ");
  setText("paymentDebt",formatMoney(debt));
  const tuitionStatus=document.getElementById("tuitionStatus");
  if(tuitionStatus){tuitionStatus.textContent=debt?"Còn học phí cần hoàn tất":"Đã hoàn tất học phí";tuitionStatus.className=debt?"has-debt":"complete"}

  const progress=[
    ["▤","Hồ sơ",student.profile_status||"Chưa cập nhật"],
    ["◉","Lý thuyết online",student.online_status||"Chưa hoàn thành"],
    ["▣","Cabin",student.cabin_status||"Chưa hoàn thành"],
    ["⌖","DAT",student.dat_status||"Chưa thực hiện"],
    ["✓","Thi tốt nghiệp",student.graduation_status||"Chưa hoàn thành"],
    ["★","Thi sát hạch",student.exam_status||"Chưa thi sát hạch"]
  ];
  const progressNode=document.getElementById("studentProgress");
  if(progressNode)progressNode.innerHTML=progress.map(([icon,label,status])=>`<article class="progress-card"><span>${icon}</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(status)}</strong></div><i></i></article>`).join("");

  const profile=[
    ["Ngày sinh",formatDate(student.date_of_birth)],
    ["Số CCCD",student.cccd||"Chưa cập nhật"],
    ["Điện thoại",student.phone||"Chưa cập nhật"],
    ["Địa chỉ",student.address||"Chưa cập nhật"],
    ["Hạng đào tạo",licenseClass],
    ["Sát hạch / bằng lái",student.exam_status||"Chưa thi sát hạch"],
    ["Trạng thái hồ sơ",student.profile_status||"Chưa cập nhật"]
  ];
  const profileNode=document.getElementById("studentProfile");
  if(profileNode)profileNode.innerHTML=profile.map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");

  document.querySelectorAll("#studentRuntimeWarning").forEach(node=>node.remove());
  document.getElementById("studentPortal")?.classList.remove("hidden");
  document.getElementById("studentLoading")?.classList.add("hidden");
  document.documentElement.setAttribute("data-student-profile","ready");
  window.dispatchEvent(new CustomEvent("student-profile-ready"));
  return true;
}

function recoverCoreStudentProfile(){
  if(location.pathname!=="/hoc-vien.html"||document.documentElement.getAttribute("data-student-profile")==="ready")return Promise.resolve(false);
  const token=studentToken();
  if(!token)return Promise.resolve(false);
  if(!coreProfileRecovery)coreProfileRecovery=loadStudentProfile(token).then(renderCoreStudentProfile).catch(error=>{console.warn("[student-portal] Core profile recovery failed.",error);return false}).finally(()=>{coreProfileRecovery=null});
  return coreProfileRecovery;
}

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
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",recoverCoreStudentProfile,{once:true});else void recoverCoreStudentProfile();
window.addEventListener("pageshow",showStudentPortal);
window.addEventListener("pageshow",()=>void recoverCoreStudentProfile());
window.addEventListener("error",showStudentPortal);
window.addEventListener("unhandledrejection",showStudentPortal);
window.setTimeout(showStudentPortal,250);
window.setTimeout(showStudentPortal,1000);
window.setTimeout(()=>void recoverCoreStudentProfile(),1200);
