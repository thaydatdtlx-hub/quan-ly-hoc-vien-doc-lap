import {calculateDrivingRefreshCost,formatVnd,MAX_DURATION_HOURS,MIN_DURATION_HOURS} from "./driving-refresh-pricing.js";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
const form=$("refreshForm"),button=$("refreshSubmit"),error=$("refreshError");
const heroTransmissionButtons=[...document.querySelectorAll("[data-hero-transmission]")];
const heroHourPresetButtons=[...document.querySelectorAll("[data-hero-hours]")];
const heroWeekendButtons=[...document.querySelectorAll("[data-hero-weekend]")];
let currentPricing=calculateDrivingRefreshCost({transmission:"Số tự động",durationHours:10});

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
$("refreshDurationHours").addEventListener("blur",()=>{
  const value=Number($("refreshDurationHours").value);
  if(!Number.isInteger(value)||value<MIN_DURATION_HOURS)$("refreshDurationHours").value=MIN_DURATION_HOURS;
  else if(value>MAX_DURATION_HOURS)$("refreshDurationHours").value=MAX_DURATION_HOURS;
  updatePricing();
});
updatePricing();

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
  error.textContent="";
  updatePricing();
  $("refreshFullName").focus();
});
