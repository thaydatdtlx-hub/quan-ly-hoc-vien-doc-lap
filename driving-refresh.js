const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
const form=$("refreshForm"),button=$("refreshSubmit"),error=$("refreshError");

function localIsoDate(date){
  const offset=date.getTimezoneOffset()*60000;
  return new Date(date.getTime()-offset).toISOString().slice(0,10);
}

function selectedGoals(){
  return [...form.querySelectorAll('input[name="goals"]:checked')].map(input=>input.value);
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

form.addEventListener("submit",async event=>{
  event.preventDefault();
  error.textContent="";
  if(!form.reportValidity())return;
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
      goals,
      preferred_date:$("refreshPreferredDate").value||null,
      preferred_time:$("refreshPreferredTime").value||"Linh hoạt",
      area:$("refreshArea").value.trim(),
      note:$("refreshNote").value.trim(),
      consent:true,
      website:$("refreshWebsite").value
    }});
    $("refreshSuccessCode").textContent=result?.registration_code||result?.code||"Đã ghi nhận";
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
  $("refreshSuccess").hidden=true;
  $("refreshFormFields").hidden=false;
  error.textContent="";
  $("refreshFullName").focus();
});

