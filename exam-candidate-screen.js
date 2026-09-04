import"./exam-candidate-screen.css?v=3";
import{EXAMS,NUMBERED_EXAM_COUNTS}from"./exam-config.js";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
const authKind=localStorage.getItem("hv_auth_kind")||sessionStorage.getItem("hv_auth_kind")||"";
let candidateProfile=null;
let candidateLoaded=false;
let lockedExamKey="";

function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]))}
function normalize(value){return String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")}
function formatDate(value){if(!value)return"—";const text=String(value).trim(),match=text.match(/^(\d{4})-(\d{2})-(\d{2})/);if(match)return`${match[3]}/${match[2]}/${match[1]}`;const parsed=new Date(text);return Number.isNaN(parsed.valueOf())?text:new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"}).format(parsed)}
function candidateNumber(code){const match=String(code||"").match(/\d+/g);if(!match?.length)return"—";const value=parseInt(match.join(""),10);return Number.isFinite(value)?String(value):"—"}
function examKeyForLicense(value){
  const text=normalize(value).replace(/hang|gplx|giay phep lai xe/g,"").trim();
  if(/^a1(?:\b|$)/.test(text))return"A1";
  if(/^a(?:\b|$)/.test(text))return"A";
  if(/^c1(?:\b|$)/.test(text))return"C1";
  if(/^b(?:\b|$)/.test(text))return"B";
  return"";
}
function profileValue(profile,...keys){const sources=[profile,profile?.profile,profile?.student,profile?.data].filter(Boolean);for(const source of sources){for(const key of keys){const value=source?.[key];if(value!==undefined&&value!==null&&String(value).trim()!=="")return value}}return""}
async function rpc(fn,body={}){const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json","Cache-Control":"no-store"},cache:"no-store",body:JSON.stringify(body)});const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.message||data?.details||data?.error||"Không thể kết nối máy chủ");return data}
function setStatus(message,state=""){const status=document.getElementById("examCandidateStatus");if(!status)return;status.className=`exam-candidate-status ${state}`.trim();status.textContent=message}
function setCandidateText(id,value){const node=document.getElementById(id);if(node)node.textContent=String(value||"—")}
function theoryBankCount(key){return key==="A1"||key==="A"?250:600}
function fillExamOptions(examKey){const select=document.getElementById("examCandidateSet"),exam=EXAMS[examKey],total=NUMBERED_EXAM_COUNTS[examKey]||0;if(!select||!exam)return;select.innerHTML=`<option value="random">→ Ngẫu nhiên</option>${Array.from({length:total},(_,index)=>`<option value="${index+1}">Đề ${index+1}</option>`).join("")}`;select.value="random"}
function lockLicenseControl(key){
  const select=document.getElementById("examCandidateLicense");if(!select)return;
  select.innerHTML=`<option value="${key}">${EXAMS[key].vehicle}</option>`;
  select.value=key;select.disabled=true;select.setAttribute("aria-readonly","true");select.title=`Hạng ${key} được lấy từ hồ sơ học viên do Admin quản lý`;
}
function renderProfile(profile){
  const studentCode=profileValue(profile,"student_code","code","studentCode");
  const studentName=profileValue(profile,"student_name","name","full_name","fullName");
  const dateOfBirth=profileValue(profile,"date_of_birth","dob","birthday","birth_date");
  const cccd=profileValue(profile,"cccd","citizen_id","identity_number","id_number");
  const address=profileValue(profile,"address","permanent_address","current_address");
  const licenseClass=profileValue(profile,"license_class","licenseClass","gplx_class");
  const course=profileValue(profile,"course","course_name");
  const photoData=profileValue(profile,"photo_data","photo","avatar","avatar_url");
  const key=examKeyForLicense(licenseClass);
  if(!key)throw new Error("Hồ sơ học viên chưa có Hạng GPLX hợp lệ. Vui lòng yêu cầu Admin cập nhật A1, A, B hoặc C1.");
  lockedExamKey=key;
  document.getElementById("examCandidateNumber").value=candidateNumber(studentCode);
  lockLicenseControl(key);
  setCandidateText("examCandidateName",studentName);setCandidateText("examCandidateDob",formatDate(dateOfBirth));setCandidateText("examCandidateId",cccd);setCandidateText("examCandidateAddress",address);
  document.getElementById("examCandidateCourse").value=course||`Tự luyện lý thuyết ${theoryBankCount(key)} câu`;
  setCandidateText("examCandidateLicenseLabel",`HẠNG ${key}`);
  const photo=document.getElementById("examCandidatePhoto");photo.innerHTML=photoData?`<img src="${esc(photoData)}" alt="Ảnh học viên">`:'<span>👤</span>';
  fillExamOptions(key);candidateLoaded=true;document.getElementById("examCandidateStart").disabled=false;
  setStatus(`Đã xác nhận ${studentCode||"học viên"} · Hạng ${key} · Bộ ${theoryBankCount(key)} câu. Hạng GPLX được lấy từ dữ liệu Admin và đã khóa.`,"ok");
}
async function loadCandidate(){
  const start=document.getElementById("examCandidateStart");if(start)start.disabled=true;
  if(authKind!=="student"||!token){candidateLoaded=false;setStatus("Chưa có phiên đăng nhập học viên trên tên miền này. Hãy đăng nhập tài khoản học viên rồi mở lại phòng thi.","error");return}
  setStatus("Đang kiểm tra thông tin học viên…");
  try{candidateProfile=await rpc("app_student_exam_candidate",{p_token:token});renderProfile(candidateProfile)}catch(error){candidateLoaded=false;lockedExamKey="";setStatus(error?.message||"Không thể tải hồ sơ học viên.","error")}
}
function dialogMarkup(){
  return `<dialog id="examCandidateDialog" class="exam-candidate-dialog"><div class="exam-candidate-shell"><div class="exam-candidate-topline">PHẦN MỀM TỰ LUYỆN SÁT HẠCH LÝ THUYẾT</div><div class="exam-candidate-title"><h2>TỰ LUYỆN SÁT HẠCH LÝ THUYẾT</h2></div><div class="exam-candidate-body"><div class="exam-candidate-grid"><label for="examCandidateUnit">Đơn vị:</label><input id="examCandidateUnit" value="HỌC LÁI XE CÙNG ĐẠT" readonly><button id="examCandidateCheck" class="exam-candidate-check" type="button">Kiểm tra thông tin thí sinh</button><label for="examCandidateCourse">Khóa:</label><input id="examCandidateCourse" value="Tự luyện lý thuyết" readonly><span></span><label for="examCandidateNumber">Số báo danh:</label><input id="examCandidateNumber" value="—" readonly><span></span><label for="examCandidateLicense">Hạng GPLX:</label><select id="examCandidateLicense" disabled><option value="">Đang lấy từ hồ sơ Admin…</option></select><select id="examCandidateSet" aria-label="Lựa chọn đề"></select><p id="examCandidateStatus" class="exam-candidate-status">Bấm “Kiểm tra thông tin thí sinh” để xác nhận hồ sơ trước khi bắt đầu.</p></div><div class="exam-candidate-divider"></div><div class="exam-candidate-profile"><div id="examCandidatePhoto" class="exam-candidate-photo"><span>👤</span></div><div class="exam-candidate-info"><div class="exam-candidate-field"><b>Loại GPLX:</b><span id="examCandidateLicenseLabel" class="exam-candidate-value accent">—</span></div><div class="exam-candidate-field"><b>Họ tên:</b><span id="examCandidateName" class="exam-candidate-value candidate-name">—</span></div><div class="exam-candidate-field"><b>Ngày sinh:</b><span id="examCandidateDob" class="exam-candidate-value">—</span></div><div class="exam-candidate-field"><b>Số CCCD:</b><span id="examCandidateId" class="exam-candidate-value">—</span></div><div class="exam-candidate-field address"><b>Địa chỉ:</b><span id="examCandidateAddress" class="exam-candidate-value">—</span></div></div></div><p class="exam-candidate-note">Hạng GPLX và bộ câu hỏi được lấy tự động từ hồ sơ học viên do Admin nhập. A1/A dùng bộ 250 câu; B/C1 dùng bộ 600 câu.</p></div><div class="exam-candidate-actions"><button id="examCandidateStart" class="exam-candidate-start" type="button" disabled>» Bắt đầu thi</button><button id="examCandidateHelp" class="exam-candidate-help" type="button">ⓘ Hướng dẫn</button><button id="examCandidateClose" class="exam-candidate-close" type="button">✓ Đóng</button></div></div></dialog>`;
}
function startExam(){
  const key=lockedExamKey;
  if(!candidateLoaded||!key)return setStatus("Chưa xác nhận được Hạng GPLX từ hồ sơ Admin.","error");
  const set=document.getElementById("examCandidateSet")?.value||"random",classButton=document.querySelector(`[data-exam-class="${key}"]`);
  if(!classButton)return setStatus("Không tìm thấy cấu hình hạng thi.","error");
  classButton.click();delete globalThis.__THAY_DAT_B_EXAM_SET__;if(set==="random")delete globalThis.__THAY_DAT_NUMBERED_EXAM__;else globalThis.__THAY_DAT_NUMBERED_EXAM__={key,number:Number(set)};
  const ready=document.getElementById("examReadyCheck"),start=document.getElementById("startExamBtn");if(ready)ready.checked=true;if(start){start.disabled=false;document.getElementById("examCandidateDialog")?.close();start.click()}
}
function openCandidateDialog(){const dialog=document.getElementById("examCandidateDialog");if(!dialog)return;if(!dialog.open)dialog.showModal();if(authKind==="student"&&token&&!candidateLoaded)void loadCandidate();else if(authKind!=="student"||!token)setStatus("Chưa có phiên đăng nhập học viên trên tên miền này. Hãy đăng nhập để tự động lấy hồ sơ và số báo danh.","error")}
function mount(){
  if(location.pathname!=="/600-cau-hoi.html"||document.getElementById("examCandidateDialog"))return;
  document.body.insertAdjacentHTML("beforeend",dialogMarkup());const dialog=document.getElementById("examCandidateDialog");
  document.getElementById("examCandidateCheck").onclick=loadCandidate;document.getElementById("examCandidateClose").onclick=()=>dialog.close();document.getElementById("examCandidateHelp").onclick=()=>alert("Hạng GPLX được lấy tự động từ hồ sơ học viên do Admin nhập và không thể đổi tại phòng thi. A1/A dùng bộ 250 câu; B/C1 dùng bộ 600 câu.");document.getElementById("examCandidateStart").onclick=startExam;
  document.addEventListener("click",event=>{const trigger=event.target.closest?.('[data-start-mode="exam"]');if(!trigger||authKind!=="student"||!token)return;event.preventDefault();event.stopImmediatePropagation();openCandidateDialog()},true);
  window.__openExamCandidateDialog=openCandidateDialog;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();window.addEventListener("pageshow",mount);
