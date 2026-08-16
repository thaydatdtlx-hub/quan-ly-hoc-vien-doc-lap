import {studentRpc} from "./student-rpc-client.js";

const $=id=>document.getElementById(id);
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";

const TYPE_LABELS={
  theory:"Lý thuyết",
  cabin:"Cabin mô phỏng",
  dat_auto:"DAT số tự động",
  dat_manual:"DAT số cơ khí",
  dat_practice:"Thực hành DAT",
  practice:"Sa hình",
  familiar:"Làm quen xe",
  graduation:"Thi tốt nghiệp",
  other:"Nội dung khác"
};
const STATUS_LABELS={present:"Có mặt",absent:"Vắng",excused:"Vắng có phép"};
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function date(value){
  if(!value)return"Chưa cập nhật";
  const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match)return`${match[3]}/${match[2]}/${match[1]}`;
  const parsed=new Date(value);
  return Number.isNaN(parsed.valueOf())?String(value):new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"}).format(parsed);
}
function duration(minutes){
  const value=Math.max(0,Number(minutes)||0),hours=Math.floor(value/60),rest=value%60;
  return [hours?`${hours} giờ`:"",rest?`${rest} phút`:""].filter(Boolean).join(" ")||"0 giờ";
}
function summary(records){
  const result={sessions:records.length,present:0,absent:0,excused:0,actualMinutes:0,rate:0};
  for(const record of records){
    if(record.status==="present"){
      result.present++;
      result.actualMinutes+=Math.max(0,Number(record.actual_minutes)||0);
    }else if(record.status==="excused")result.excused++;
    else result.absent++;
  }
  result.rate=result.sessions?Math.round(result.present/result.sessions*100):0;
  return result;
}
async function loadAttendance(){
  if(!token)return;
  try{
    const data=await studentRpc("app_student_list_attendance",{p_token:token});
    const records=Array.isArray(data)?data:[];
    renderAttendance(records);
  }catch(error){
    console.warn("[student-attendance] Không đồng bộ được dữ liệu điểm danh",error);
    const notice=$("studentAttendanceNotice");
    if(notice){notice.textContent="Dữ liệu điểm danh đang đồng bộ lại. Vui lòng tải lại sau ít phút.";notice.classList.remove("hidden")}
    const list=$("studentAttendanceList");
    if(list)list.innerHTML='<div class="student-attendance-empty"><span>◷</span><strong>Chưa đồng bộ được dữ liệu điểm danh</strong><small>Cổng học viên vẫn hoạt động bình thường.</small></div>';
  }
}
function renderAttendance(records){
  const result=summary(records);
  if($("studentAttendanceRate"))$("studentAttendanceRate").textContent=`${result.rate}% chuyên cần`;
  if($("studentAttendanceSessions"))$("studentAttendanceSessions").textContent=result.sessions;
  if($("studentAttendancePresent"))$("studentAttendancePresent").textContent=result.present;
  if($("studentAttendanceHours"))$("studentAttendanceHours").textContent=duration(result.actualMinutes);
  if($("studentAttendanceAbsent"))$("studentAttendanceAbsent").textContent=`${result.absent} / ${result.excused}`;
  $("studentAttendanceNotice")?.classList.add("hidden");
  const list=$("studentAttendanceList");
  if(!list)return;
  list.innerHTML=records.length?records.slice(0,30).map(record=>`
    <article class="student-attendance-item status-${esc(record.status||"absent")}">
      <span class="student-attendance-date"><b>${esc(date(record.session_date))}</b><small>${esc(TYPE_LABELS[record.session_type]||TYPE_LABELS.other)}</small></span>
      <div><strong>${esc(STATUS_LABELS[record.status]||STATUS_LABELS.absent)}</strong><small>${record.started_at&&record.ended_at?`${esc(String(record.started_at).slice(0,5))} – ${esc(String(record.ended_at).slice(0,5))}`:"Không ghi khung giờ"}</small>${record.note?`<em>${esc(record.note)}</em>`:""}</div>
      <b>${esc(duration(record.actual_minutes))}</b>
    </article>`).join(""):'<div class="student-attendance-empty"><span>◷</span><strong>Chưa có dữ liệu điểm danh</strong><small>Buổi học được Admin ghi nhận sẽ hiển thị tại đây.</small></div>';
}

loadAttendance();
