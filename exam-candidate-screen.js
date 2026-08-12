import"./exam-candidate-screen.css";
import{EXAMS,NUMBERED_EXAM_COUNTS}from"./exam-config.js";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
const authKind=localStorage.getItem("hv_auth_kind")||sessionStorage.getItem("hv_auth_kind")||"";
let candidateProfile=null;
let candidateLoaded=false;

function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]))}
function normalize(value){return String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")}
function formatDate(value){
  if(!value)return"—";
  const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match?`${match[3]}/${match[2]}/${match[1]}`:String(value);
}
function candidateNumber(code){
  const match=String(code||"").match(/\d+/g);
  if(!match?.length)return"—";
  const value=parseInt(match.join(""),10);
  return Number.isFinite(value)?String(value):"—";
}
function examKeyForLicense(value){
  const text=normalize(value);
  if(text.startsWith("a1"))return"A1";
  if(text==="a"||text.startsWith("a "))return"A";
  if(text.startsWith("c1"))return"C1";
  return"B";
}
async function rpc(fn,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||data?.error||"Không thể kết nối máy chủ");
  return data;
}
function setStatus(message,state=""){
  const status=document.getElementById("examCandidateStatus");
  if(!status)return;
  status.className=`exam-candidate-status ${state}`.trim();
  status.textContent=message;
}
function fillExamOptions(examKey){
  const select=document.getElementById("examCandidateSet");
  const exam=EXAMS[examKey];
  const total=NUMBERED_EXAM_COUNTS[examKey]||0;
  if(!select||!exam)return;
  select.innerHTML=`<option value="random">→ Ngẫu nhiên</option>${Array.from({length:total},(_,index)=>`<option value="${index+1}">Đề ${index+1}</option>`).join("")}`;
  select.value="random";
}
function renderProfile(profile){
  const key=examKeyForLicense(profile?.license_class);
  document.getElementById("examCandidateNumber").value=candidateNumber(profile?.student_code);
  document.getElementById("examCandidateLicense").value=key;
  document.getElementById("examCandidateName").textContent=profile?.student_name||"—";
  document.getElementById("examCandidateDob").textContent=formatDate(profile?.date_of_birth);
  document.getElementById("examCandidateId").textContent=profile?.cccd||"—";
  document.getElementById("examCandidateAddress").textContent=profile?.address||"—";
  document.getElementById("examCandidateCourse").value=profile?.course||"Tự luyện lý thuyết";
  document.getElementById("examCandidateLicenseLabel").textContent=`HẠNG ${key}`;
  const photo=document.getElementById("examCandidatePhoto");
  photo.innerHTML=profile?.photo_data?`<img src="${esc(profile.photo_data)}" alt="Ảnh học viên">`:'<span>👤</span>';
  fillExamOptions(key);
  candidateLoaded=true;
  document.getElementById("examCandidateStart").disabled=false;
  setStatus(`Đã xác nhận hồ sơ ${profile?.student_code||"học viên"}. Số báo danh được sinh tự động từ mã học viên.`,"ok");
}
async function loadCandidate(){
  const start=document.getElementById("examCandidateStart");
  if(start)start.disabled=true;
  if(authKind!=="student"||!token){
    candidateLoaded=false;
    candidateProfile=null;
    document.getElementById("examCandidateNumber").value="—";
    setStatus("Bạn đang ở chế độ khách. Đăng nhập tài khoản học viên để tự động lấy số báo danh và hồ sơ.","error");
    return;
  }
  setStatus("Đang kiểm tra thông tin học viên…");
  try{
    candidateProfile=await rpc("app_student_exam_candidate",{p_token:token});
    renderProfile(candidateProfile);
  }catch(error){
    candidateLoaded=false;
    setStatus(error?.message||"Không thể tải hồ sơ học viên.","error");
  }
}
function dialogMarkup(){
  return `<dialog id="examCandidateDialog" class="exam-candidate-dialog">
    <div class="exam-candidate-shell">
      <div class="exam-candidate-topline">PHẦN MỀM TỰ LUYỆN SÁT HẠCH LÝ THUYẾT 600 CÂU</div>
      <div class="exam-candidate-title"><h2>TỰ LUYỆN SÁT HẠCH LÝ THUYẾT 600 CÂU</h2></div>
      <div class="exam-candidate-body">
        <div class="exam-candidate-grid">
          <label for="examCandidateUnit">Đơn vị:</label>
          <input id="examCandidateUnit" value="HỌC LÁI XE CÙNG ĐẠT" readonly>
          <button id="examCandidateCheck" class="exam-candidate-check" type="button">Kiểm tra thông tin thí sinh</button>
          <label for="examCandidateCourse">Khóa:</label>
          <input id="examCandidateCourse" value="Tự luyện lý thuyết" readonly>
          <span></span>
          <label for="examCandidateNumber">Số báo danh:</label>
          <input id="examCandidateNumber" value="—" readonly>
          <span></span>
          <label for="examCandidateLicense">Hạng GPLX:</label>
          <select id="examCandidateLicense">${Object.keys(EXAMS).map(key=>`<option value="${key}">${EXAMS[key].vehicle}</option>`).join("")}</select>
          <select id="examCandidateSet" aria-label="Lựa chọn đề"></select>
          <p id="examCandidateStatus" class="exam-candidate-status">Bấm “Kiểm tra thông tin thí sinh” để xác nhận hồ sơ trước khi bắt đầu.</p>
        </div>
        <div class="exam-candidate-divider"></div>
        <div class="exam-candidate-profile">
          <div id="examCandidatePhoto" class="exam-candidate-photo"><span>👤</span></div>
          <div class="exam-candidate-info">
            <b>Loại GPLX:</b><strong id="examCandidateLicenseLabel">HẠNG B</strong>
            <b>Họ tên:</b><strong id="examCandidateName" class="candidate-name">—</strong>
            <b>Ngày sinh:</b><strong id="examCandidateDob">—</strong>
            <b>Số CCCD:</b><strong id="examCandidateId">—</strong>
            <b>Địa chỉ:</b><strong id="examCandidateAddress">—</strong>
          </div>
        </div>
        <p class="exam-candidate-note">Số báo danh được lấy tự động từ phần số của mã học viên. Ví dụ HV-0001 → Số báo danh 1.</p>
      </div>
      <div class="exam-candidate-actions">
        <button id="examCandidateStart" class="exam-candidate-start" type="button" disabled>» Bắt đầu thi</button>
        <button id="examCandidateHelp" class="exam-candidate-help" type="button">ⓘ Hướng dẫn</button>
        <button id="examCandidateClose" class="exam-candidate-close" type="button">✓ Đóng</button>
      </div>
    </div>
  </dialog>`;
}
function syncLicense(){
  const key=document.getElementById("examCandidateLicense")?.value||"B";
  fillExamOptions(key);
  document.getElementById("examCandidateLicenseLabel").textContent=`HẠNG ${key}`;
}
function startExam(){
  const key=document.getElementById("examCandidateLicense")?.value||"B";
  const set=document.getElementById("examCandidateSet")?.value||"random";
  const classButton=document.querySelector(`[data-exam-class="${key}"]`);
  if(!classButton)return setStatus("Không tìm thấy cấu hình hạng thi.","error");
  classButton.click();
  delete globalThis.__THAY_DAT_B_EXAM_SET__;
  if(set==="random")delete globalThis.__THAY_DAT_NUMBERED_EXAM__;
  else globalThis.__THAY_DAT_NUMBERED_EXAM__={key,number:Number(set)};
  const ready=document.getElementById("examReadyCheck"),start=document.getElementById("startExamBtn");
  if(ready)ready.checked=true;
  if(start){start.disabled=false;document.getElementById("examCandidateDialog")?.close();start.click()}
}
function mount(){
  if(location.pathname!=="/600-cau-hoi.html"||document.getElementById("examCandidateDialog"))return;
  document.body.insertAdjacentHTML("beforeend",dialogMarkup());
  const dialog=document.getElementById("examCandidateDialog");
  document.getElementById("examCandidateCheck").onclick=loadCandidate;
  document.getElementById("examCandidateClose").onclick=()=>dialog.close();
  document.getElementById("examCandidateHelp").onclick=()=>alert("Chọn đúng hạng GPLX và đề muốn thi. Số báo danh được tạo tự động từ mã học viên. Khi bắt đầu, bài thi sẽ tính giờ theo đúng cấu trúc từng hạng.");
  document.getElementById("examCandidateLicense").onchange=syncLicense;
  document.getElementById("examCandidateStart").onclick=startExam;
  fillExamOptions("B");

  document.addEventListener("click",event=>{
    const trigger=event.target.closest?.('[data-start-mode="exam"]');
    if(!trigger)return;
    event.preventDefault();event.stopImmediatePropagation();
    dialog.showModal();
    if(authKind==="student"&&token&&!candidateLoaded)void loadCandidate();
  },true);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
window.addEventListener("pageshow",mount);