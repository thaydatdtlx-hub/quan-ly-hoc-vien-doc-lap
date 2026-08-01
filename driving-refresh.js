import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
import "@fontsource/be-vietnam-pro/900.css";
import {calculateDrivingRefreshCost,formatVnd,MAX_DURATION_HOURS,MIN_DURATION_HOURS} from "./driving-refresh-pricing.js";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
const form=$("refreshForm"),button=$("refreshSubmit"),error=$("refreshError");
const heroTransmissionButtons=[...document.querySelectorAll("[data-hero-transmission]")];
const heroHourPresetButtons=[...document.querySelectorAll("[data-hero-hours]")];
const heroWeekendButtons=[...document.querySelectorAll("[data-hero-weekend]")];
const stageViews=[...document.querySelectorAll("[data-refresh-view]")];
const stageButtons=[...document.querySelectorAll("[data-refresh-step]")];
const stageConnectors=[...document.querySelectorAll(".refresh-flow>i")];
const mobileNext=document.querySelector("[data-refresh-mobile-next]");
const stageHashes={1:"#gioi-thieu",2:"#tinh-chi-phi",3:"#dang-ky"};
let currentStage=1;
let currentPricing=calculateDrivingRefreshCost({transmission:"Số tự động",durationHours:10});

function stageFromHash(){
  const hash=window.location.hash;
  if(["#tinh-chi-phi"].includes(hash))return 2;
  if(["#dang-ky","#refreshForm","#quy-trinh"].includes(hash))return 3;
  return 1;
}

function setStage(stage,{updateHistory=true,scroll=true}={}){
  currentStage=Math.min(3,Math.max(1,Number(stage)||1));
  stageViews.forEach(view=>{
    const active=Number(view.dataset.refreshView)===currentStage;
    view.hidden=!active;
    view.classList.toggle("active",active);
    view.setAttribute("aria-hidden",String(!active));
  });
  stageButtons.forEach(item=>{
    const itemStage=Number(item.dataset.refreshStep);
    const active=itemStage===currentStage;
    item.classList.toggle("active",active);
    item.classList.toggle("completed",itemStage<currentStage);
    if(active)item.setAttribute("aria-current","step");else item.removeAttribute("aria-current");
  });
  stageConnectors.forEach((item,index)=>item.classList.toggle("done",index<currentStage-1));
  document.body.dataset.refreshStage=String(currentStage);
  if(mobileNext){
    const label=currentStage===1?"Tiếp tục tính giá":currentStage===2?"Tiếp tục đăng ký":"Gửi đăng ký";
    mobileNext.querySelector("span").textContent=label;
    mobileNext.querySelector("b").textContent=currentStage===3?"✓":"→";
  }
  if(updateHistory&&window.location.hash!==stageHashes[currentStage])history.pushState({refreshStage:currentStage},"",stageHashes[currentStage]);
  if(scroll){
    requestAnimationFrame(()=>{
      const flow=document.querySelector(".refresh-flow"),header=document.querySelector(".refresh-header");
      const top=Math.max(0,flow.offsetTop-(header?.offsetHeight||0));
      window.scrollTo({top,behavior:"smooth"});
    });
  }
}

document.querySelectorAll("[data-refresh-go]").forEach(item=>item.addEventListener("click",event=>{
  event.preventDefault();
  setStage(item.dataset.refreshGo);
}));
stageButtons.forEach(item=>item.addEventListener("click",()=>setStage(item.dataset.refreshStep)));
mobileNext?.addEventListener("click",()=>{
  if(currentStage<3)setStage(currentStage+1);
  else form.requestSubmit();
});
window.addEventListener("popstate",()=>setStage(stageFromHash(),{updateHistory:false}));

function localIsoDate(date){
  const offset=date.getTimezoneOffset()*60000;
  return new Date(date.getTime()-offset).toISOString().slice(0,10);
}

function selectedGoals(){
  return [...form.querySelectorAll('input[name="goals"]:checked')].map(input=>input.value);
}

function updatePricing(){
  const hoursInput=$("refreshDurationHours"),rawHours=Number(hoursInput.value);
  const normalizedHours=Number.isInteger(rawHours)?Math.min(MAX_DURATION_HOURS,Math.max(MIN_DURATION_HOURS,rawHours)):MIN_DURATION_HOURS;
  currentPricing=calculateDrivingRefreshCost({
    transmission:$("refreshTransmission").value,
    durationHours:normalizedHours,
    preferredDate:$("refreshPreferredDate").value,
    preferredTime:$("refreshPreferredTime").value
  });
  $("refreshHoursSummary").textContent=`${currentPricing.hours} giờ`;
  $("refreshBaseRate").textContent=currentPricing.valid?`${formatVnd(currentPricing.baseHourlyRate)}/giờ`:"—";
  $("refreshWeekendFee").textContent=currentPricing.weekendSurchargeTotal?`${formatVnd(currentPricing.weekendSurchargeTotal)} (${formatVnd(currentPricing.weekendSurchargePerHour)}/giờ)`:"0 ₫";
  $("refreshWeekendRow").classList.toggle("is-active",currentPricing.weekendSurchargeTotal>0);
  $("refreshEstimatedTotal").textContent=currentPricing.valid?formatVnd(currentPricing.estimatedTotal):"—";
  $("refreshPricingBadge").textContent=!currentPricing.valid?"Chọn loại xe":currentPricing.weekend?"Giá cuối tuần":"Giá ngày thường";
  $("refreshPricingBadge").classList.toggle("is-weekend",currentPricing.weekend&&currentPricing.valid);
  $("refreshPricingNote").textContent=!currentPricing.valid?"Chọn loại xe để hệ thống tính chi phí.":currentPricing.weekend?`Đã gồm phụ thu Thứ 7/Chủ nhật cho ${currentPricing.hours} giờ.`:`Đơn giá ngày thường cho ${currentPricing.hours} giờ.`;
  if($("refreshHeroTotal"))$("refreshHeroTotal").textContent=currentPricing.valid?formatVnd(currentPricing.estimatedTotal):"—";
  if($("refreshHeroHours"))$("refreshHeroHours").innerHTML=`${currentPricing.hours} <small>giờ</small>`;
  heroTransmissionButtons.forEach(item=>{
    const active=item.dataset.heroTransmission===currentPricing.transmission;
    item.classList.toggle("active",active);
    item.setAttribute("aria-pressed",String(active));
  });
  heroHourPresetButtons.forEach(item=>{
    const active=Number(item.dataset.heroHours)===currentPricing.hours;
    item.classList.toggle("active",active);
    item.setAttribute("aria-pressed",String(active));
  });
  heroWeekendButtons.forEach(item=>{
    const active=(item.dataset.heroWeekend==="true")===currentPricing.weekend;
    item.classList.toggle("active",active);
    item.setAttribute("aria-pressed",String(active));
  });
}

function setHeroHours(value){
  $("refreshDurationHours").value=Math.min(MAX_DURATION_HOURS,Math.max(MIN_DURATION_HOURS,Number(value)||MIN_DURATION_HOURS));
  updatePricing();
}

async function rpc(fn,body){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||"Không thể gửi đăng ký lúc này.");
  return data;
}

function applyStudentPrefill(){
  const key="driving_refresh_student_prefill",raw=sessionStorage.getItem(key);
  if(!raw)return;
  sessionStorage.removeItem(key);
  try{
    const data=JSON.parse(raw);
    if(data.fullName)$("refreshFullName").value=String(data.fullName).slice(0,80);
    if(data.phone)$("refreshPhone").value=String(data.phone).slice(0,15);
    $("refreshLicenseStatus").value="Đã có bằng lái";
  }catch{}
}

const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
$("refreshPreferredDate").min=localIsoDate(tomorrow);
for(const id of ["refreshTransmission","refreshDurationHours","refreshPreferredDate","refreshPreferredTime"]){
  $(id).addEventListener(id==="refreshDurationHours"?"input":"change",updatePricing);
}
heroTransmissionButtons.forEach(item=>item.addEventListener("click",()=>{
  $("refreshTransmission").value=item.dataset.heroTransmission;
  updatePricing();
}));
heroHourPresetButtons.forEach(item=>item.addEventListener("click",()=>setHeroHours(item.dataset.heroHours)));
$("refreshHeroHoursMinus")?.addEventListener("click",()=>setHeroHours(currentPricing.hours-1));
$("refreshHeroHoursPlus")?.addEventListener("click",()=>setHeroHours(currentPricing.hours+1));
heroWeekendButtons.forEach(item=>item.addEventListener("click",()=>{
  const weekend=item.dataset.heroWeekend==="true";
  $("refreshPreferredDate").value="";
  $("refreshPreferredTime").value=weekend?"Cuối tuần":"";
  updatePricing();
}));
applyStudentPrefill();
$("refreshDurationHours").addEventListener("blur",()=>{
  const value=Number($("refreshDurationHours").value);
  if(!Number.isInteger(value)||value<MIN_DURATION_HOURS)$("refreshDurationHours").value=MIN_DURATION_HOURS;
  else if(value>MAX_DURATION_HOURS)$("refreshDurationHours").value=MAX_DURATION_HOURS;
  updatePricing();
});
updatePricing();
setStage(stageFromHash(),{updateHistory:false,scroll:false});

form.addEventListener("submit",async event=>{
  event.preventDefault();
  error.textContent="";
  if(!form.reportValidity())return;
  updatePricing();
  if(!currentPricing.valid){error.textContent="Vui lòng chọn loại xe để hệ thống tính chi phí.";$("refreshTransmission").focus();return}
  const goals=selectedGoals();
  if(!goals.length){error.textContent="Vui lòng chọn ít nhất một kỹ năng muốn luyện.";form.querySelector(".refresh-goals").scrollIntoView({behavior:"smooth",block:"center"});return}
  if(!$("refreshConsent").checked){error.textContent="Vui lòng xác nhận đồng ý để Thầy Đạt liên hệ tư vấn.";return}

  button.disabled=true;
  button.querySelector("span").textContent="Đang gửi đăng ký…";
  try{
    const result=await rpc("app_create_driving_refresh_registration",{p_data:{
      full_name:$("refreshFullName").value.trim(),
      phone:$("refreshPhone").value.trim(),
      license_status:$("refreshLicenseStatus").value,
      transmission:$("refreshTransmission").value,
      duration_hours:currentPricing.hours,
      base_hourly_rate:currentPricing.baseHourlyRate,
      weekend_surcharge_per_hour:currentPricing.weekendSurchargePerHour,
      estimated_total:currentPricing.estimatedTotal,
      goals,
      preferred_date:$("refreshPreferredDate").value||null,
      preferred_time:$("refreshPreferredTime").value||"Linh hoạt",
      area:$("refreshArea").value.trim(),
      note:$("refreshNote").value.trim(),
      consent:true,
      website:$("refreshWebsite").value
    }});
    $("refreshSuccessCode").textContent=result?.registration_code||result?.code||"Đã ghi nhận";
    $("refreshSuccessTotal").textContent=formatVnd(result?.estimated_total??currentPricing.estimatedTotal);
    $("refreshFormFields").hidden=true;
    $("refreshSuccess").hidden=false;
    if(mobileNext)mobileNext.hidden=true;
    $("refreshSuccess").scrollIntoView({behavior:"smooth",block:"center"});
  }catch(reason){
    const message=String(reason?.message||"");
    error.innerHTML=/app_create_driving_refresh_registration|schema cache|PGRST202|Could not find/i.test(message)
      ?'Tính năng nhận đăng ký đang được kích hoạt. Bạn có thể <a href="https://zalo.me/0984811037" target="_blank" rel="noopener noreferrer">gửi nhu cầu qua Zalo</a> để được hỗ trợ ngay.'
      :message||"Chưa thể gửi đăng ký. Vui lòng kiểm tra kết nối và thử lại.";
  }finally{
    button.disabled=false;
    button.querySelector("span").textContent="Gửi đăng ký";
  }
});

$("refreshNewRegistration").addEventListener("click",()=>{
  form.reset();
  $("refreshPreferredDate").min=localIsoDate(tomorrow);
  $("refreshTransmission").value="Số tự động";
  $("refreshDurationHours").value=10;
  $("refreshSuccess").hidden=true;
  $("refreshFormFields").hidden=false;
  if(mobileNext)mobileNext.hidden=false;
  error.textContent="";
  updatePricing();
  setStage(3,{updateHistory:true,scroll:false});
  $("refreshFullName").focus();
});
