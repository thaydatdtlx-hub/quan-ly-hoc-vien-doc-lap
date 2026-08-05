export const DRIVING_REFRESH_RATES=Object.freeze({
  "Số tự động":300000,
  "Số sàn":290000
});

export const REFRESH_SERVICE_TYPES=Object.freeze({
  DRIVING:"Bổ túc tay lái",
  SA_HINH:"Bổ túc sa hình"
});

export const SA_HINH_REFRESH_RATES=Object.freeze({
  "Số tự động":250000,
  "Số sàn":200000
});

export const SA_HINH_TRACK_RATE_PER_HOUR=100000;
export const WEEKEND_SURCHARGE_PER_HOUR=50000;
export const MIN_DURATION_HOURS=1;
export const MAX_DURATION_HOURS=20;
export const DURATION_STEP_HOURS=0.5;

export function normalizeDurationHours(value){
  const requested=Number(value);
  if(!Number.isFinite(requested))return MIN_DURATION_HOURS;
  const stepped=Math.round(requested/DURATION_STEP_HOURS)*DURATION_STEP_HOURS;
  return Math.min(MAX_DURATION_HOURS,Math.max(MIN_DURATION_HOURS,stepped));
}

export function isWeekendDate(dateValue){
  const match=String(dateValue||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match)return false;
  const day=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]))).getUTCDay();
  return day===0||day===6;
}

export function calculateDrivingRefreshCost({serviceType=REFRESH_SERVICE_TYPES.DRIVING,transmission,durationHours,preferredDate,preferredTime}={}){
  const hours=normalizeDurationHours(durationHours);
  const normalizedServiceType=Object.values(REFRESH_SERVICE_TYPES).includes(serviceType)?serviceType:REFRESH_SERVICE_TYPES.DRIVING;
  const saHinh=normalizedServiceType===REFRESH_SERVICE_TYPES.SA_HINH;
  const vehicleHourlyRate=(saHinh?SA_HINH_REFRESH_RATES:DRIVING_REFRESH_RATES)[transmission]||0;
  const trackHourlyRate=saHinh&&vehicleHourlyRate?SA_HINH_TRACK_RATE_PER_HOUR:0;
  const baseHourlyRate=vehicleHourlyRate+trackHourlyRate;
  const weekend=isWeekendDate(preferredDate)||(!preferredDate&&String(preferredTime||"").includes("Cuối tuần"));
  const weekendSurchargePerHour=weekend&&baseHourlyRate?WEEKEND_SURCHARGE_PER_HOUR:0;
  const weekendSurchargeTotal=weekendSurchargePerHour*hours;
  const baseTotal=baseHourlyRate*hours;
  return{
    valid:baseHourlyRate>0,
    serviceType:normalizedServiceType,
    transmission:transmission||"",
    hours,
    weekend,
    vehicleHourlyRate,
    trackHourlyRate,
    baseHourlyRate,
    vehicleTotal:vehicleHourlyRate*hours,
    trackTotal:trackHourlyRate*hours,
    baseTotal,
    weekendSurchargePerHour,
    weekendSurchargeTotal,
    estimatedTotal:baseTotal+weekendSurchargeTotal
  };
}

export function formatVnd(value){
  return new Intl.NumberFormat("vi-VN").format(Number(value)||0)+" ₫";
}

function applyDurationUi(){
  if(typeof document==="undefined")return;
  const durationInput=document.getElementById("refreshDurationHours");
  if(durationInput){
    durationInput.min=String(MIN_DURATION_HOURS);
    durationInput.max=String(MAX_DURATION_HOURS);
    durationInput.step=String(DURATION_STEP_HOURS);
    const hint=durationInput.closest(".refresh-duration-field")?.querySelector("small");
    if(hint)hint.textContent="Tối thiểu 1 giờ, có thể chọn theo mỗi 30 phút, tối đa 20 giờ.";
  }
  const estimatorGroup=document.getElementById("refreshHeroHoursMinus")?.closest(".refresh-estimator-group");
  const estimatorHint=estimatorGroup?.querySelector("p small");
  if(estimatorHint)estimatorHint.textContent="· tối thiểu 1 giờ · bước 0,5 giờ";
  const presets=[1,1.5,2,5];
  estimatorGroup?.querySelectorAll("[data-hero-hours]").forEach((button,index)=>{
    const value=presets[index];
    if(value===undefined)return;
    button.dataset.heroHours=String(value);
    button.textContent=`${String(value).replace(".",",")} giờ`;
  });
}

if(typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",applyDurationUi,{once:true});
  else applyDurationUi();
}
