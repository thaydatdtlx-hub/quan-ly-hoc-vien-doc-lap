import "./license-training-details.js";
import "./license-eligibility-section.js";
import "./training-video-section.js";
import "./registration-procedure-section.js";
import "./public-site-enhancements.js";
import "./official-faq-section.js";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
const cards=[...document.querySelectorAll("[data-license-card]")];
const form=$("registrationForm"),submit=$("registrationSubmit"),error=$("registrationError");
let selectedLicense="A1";

function localIsoDate(date){
  const offset=date.getTimezoneOffset()*60000;
  return new Date(date.getTime()-offset).toISOString().slice(0,10);
}

function setLicense(value){
  selectedLicense=value;
  $("licenseClass").value=value;
  $("selectedLicenseSummary").textContent=value;
  $("selectedLicenseCard").textContent=value;
  $("formLicenseBadge").textContent=value;
  cards.forEach(card=>{
    const active=card.dataset.licenseCard===value;
    card.classList.toggle("active",active);
    card.setAttribute("aria-pressed",String(active));
    const state=card.querySelector("i");
    if(state)state.textContent=active?"Đã chọn":"Chọn hạng";
  });
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

cards.forEach(card=>card.addEventListener("click",()=>setLicense(card.dataset.licenseCard)));
document.querySelectorAll("[data-scroll-form]").forEach(button=>button.addEventListener("click",()=>$("registrationForm").scrollIntoView({behavior:"smooth",block:"start"})));
document.querySelectorAll("[data-scroll-license]").forEach(button=>button.addEventListener("click",()=>$("hang-bang").scrollIntoView({behavior:"smooth",block:"start"})));

const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
$("preferredStartDate").min=localIsoDate(tomorrow);
setLicense("A1");

form.addEventListener("submit",async event=>{
  event.preventDefault();
  error.textContent="";
  if(!form.reportValidity())return;
  if(!$("consent").checked){error.textContent="Vui lòng đồng ý để Thầy Đạt liên hệ tư vấn.";return}

  submit.disabled=true;
  submit.querySelector("span").textContent="Đang gửi đăng ký…";
  try{
    const source=sessionStorage.getItem("new_student_source")||"Truy cập trực tiếp";
    const originalNote=$("note").value.trim();
    const trackedNote=[originalNote,`Nguồn đăng ký: ${source}`].filter(Boolean).join("\n").slice(0,800);
    const result=await rpc("app_create_new_student_registration",{p_data:{
      full_name:$("fullName").value.trim(),
      phone:$("phone").value.trim(),
      license_class:selectedLicense,
      date_of_birth:$("dateOfBirth").value||null,
      area:$("area").value.trim(),
      preferred_start_date:$("preferredStartDate").value||null,
      preferred_contact_time:$("preferredContactTime").value,
      consultation_channel:$("consultationChannel").value,
      learning_history:$("learningHistory").value,
      note:trackedNote,
      consent:true,
      website:$("website").value
    }});
    $("successLicense").textContent=selectedLicense;
    $("successCode").textContent=result?.registration_code||"Đã ghi nhận";
    $("registrationFields").hidden=true;
    $("registrationSuccess").hidden=false;
    $("registrationSuccess").scrollIntoView({behavior:"smooth",block:"center"});
  }catch(reason){
    const message=String(reason?.message||"");
    error.innerHTML=/app_create_new_student_registration|schema cache|PGRST202|Could not find/i.test(message)
      ?'Tính năng nhận đăng ký đang được kích hoạt. Vui lòng <a href="https://zalo.me/0984811037" target="_blank" rel="noopener noreferrer">gửi thông tin qua Zalo</a> để được hỗ trợ ngay.'
      :message||"Chưa thể gửi đăng ký. Vui lòng kiểm tra kết nối và thử lại.";
  }finally{
    submit.disabled=false;
    submit.querySelector("span").textContent="Gửi đăng ký học lái xe";
  }
});

$("newRegistration").addEventListener("click",()=>{
  form.reset();
  setLicense("A1");
  $("preferredStartDate").min=localIsoDate(tomorrow);
  $("registrationSuccess").hidden=true;
  $("registrationFields").hidden=false;
  error.textContent="";
  $("fullName").focus();
});
