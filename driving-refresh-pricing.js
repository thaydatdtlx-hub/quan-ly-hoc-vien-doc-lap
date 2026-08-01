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
export const MIN_DURATION_HOURS=2;
export const MAX_DURATION_HOURS=20;

export function isWeekendDate(dateValue){
  const match=String(dateValue||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match)return false;
  const day=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]))).getUTCDay();
  return day===0||day===6;
}

export function calculateDrivingRefreshCost({serviceType=REFRESH_SERVICE_TYPES.DRIVING,transmission,durationHours,preferredDate,preferredTime}={}){
  const requestedHours=Number(durationHours);
  const hours=Number.isInteger(requestedHours)?Math.min(MAX_DURATION_HOURS,Math.max(MIN_DURATION_HOURS,requestedHours)):MIN_DURATION_HOURS;
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
