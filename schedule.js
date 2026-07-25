import {SCHEDULE_FIELDS,embedScheduleInNotes,parseScheduleFromNotes} from "./schedule-data.js";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
const authKind=localStorage.getItem("hv_auth_kind")||sessionStorage.getItem("hv_auth_kind")||"";
const REPEATABLE_KEYS=new Set(["familiar","practice"]);
const MILESTONE_FIELDS=SCHEDULE_FIELDS.filter(field=>!REPEATABLE_KEYS.has(field.key));
let me=null,students=[],trainingSessions=[],events=[],sessionFeatureAvailable=true;

async function rpc(fn,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||data?.error||"Không thể kết nối máy chủ");
  return data;
}

function normalize(value){
  return String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
}
function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]))}
function busy(on){$("loading").classList.toggle("hidden",!on)}
function toast(message){$("toast").textContent=message;$("toast").classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>$("toast").classList.remove("show"),2800)}
function dayKey(value){const date=new Date(value);return Number.isNaN(date.valueOf())?"":`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
function todayKey(){return dayKey(new Date())}
function startOfToday(){const date=new Date();date.setHours(0,0,0,0);return date}
function endOfWeek(){const date=startOfToday();date.setDate(date.getDate()+7);date.setHours(23,59,59,999);return date}
function formatDate(value){
  const date=new Date(value);
  if(Number.isNaN(date.valueOf()))return"Chưa xác định";
  return new Intl.DateTimeFormat("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
}
function dateParts(value){
  const date=new Date(value);
  return{day:String(date.getDate()).padStart(2,"0"),month:`THÁNG ${date.getMonth()+1}`,time:new Intl.DateTimeFormat("vi-VN",{hour:"2-digit",minute:"2-digit"}).format(date)};
}
function studentSchedule(student){return parseScheduleFromNotes(student.notes)||{version:1,dates:{},locations:{},note:""}}
function createEvents(){
  const fixedEvents=students.flatMap(student=>{
    const schedule=studentSchedule(student);
    return SCHEDULE_FIELDS.filter(field=>schedule.dates?.[field.key]).map(field=>({
      id:`${student.id}-${field.key}`,
      student,
      field,
      date:schedule.dates[field.key],
      location:schedule.locations?.[field.key]||"",
      note:schedule.note||"",
      source:"milestone"
    }));
  });
  const studentMap=new Map(students.map(student=>[String(student.id),student]));
  const repeatEvents=trainingSessions.map(session=>({
    id:String(session.id),
    student:studentMap.get(String(session.student_id)),
    field:SCHEDULE_FIELDS.find(field=>field.key===session.session_type),
    date:session.starts_at,
    location:session.location||"",
    note:session.note||"",
    source:"session",
    session
  })).filter(event=>event.student&&event.field);
  events=[...fixedEvents,...repeatEvents].sort((a,b)=>new Date(a.date)-new Date(b.date));
}

function renderStats(){
  const today=todayKey(),start=startOfToday(),weekEnd=endOfWeek();
  $("upcomingCount").textContent=events.filter(event=>new Date(event.date)>=start).length;
  $("weekCount").textContent=events.filter(event=>new Date(event.date)>=start&&new Date(event.date)<=weekEnd).length;
  $("todayCount").textContent=events.filter(event=>dayKey(event.date)===today).length;
  const scheduledIds=new Set(trainingSessions.map(session=>String(session.student_id)));
  $("unscheduledCount").textContent=students.filter(student=>!scheduledIds.has(String(student.id))&&!SCHEDULE_FIELDS.some(field=>studentSchedule(student).dates?.[field.key])).length;
}

function renderEvents(){
  const query=normalize($("scheduleSearch").value),type=$("typeFilter").value,period=$("periodFilter").value;
  const today=todayKey(),start=startOfToday(),weekEnd=endOfWeek();
  const filtered=events.filter(event=>{
    const eventDate=new Date(event.date),haystack=normalize([event.student.name,event.student.student_code,event.student.course,event.student.owner_username].join(" "));
    if(query&&!haystack.includes(query))return false;
    if(type&&event.field.key!==type)return false;
    if(period==="upcoming"&&eventDate<start)return false;
    if(period==="today"&&dayKey(event.date)!==today)return false;
    if(period==="week"&&(eventDate<start||eventDate>weekEnd))return false;
    if(period==="past"&&eventDate>=start)return false;
    return true;
  });
  if(period==="past")filtered.sort((a,b)=>new Date(b.date)-new Date(a.date));
  const titles={upcoming:["Lịch sắp tới","Sắp xếp theo thời gian gần nhất"],today:["Lịch hôm nay","Các nội dung đào tạo diễn ra trong ngày"],week:["Lịch trong 7 ngày tới","Những lịch cần chuẩn bị trong tuần"],past:["Lịch đã qua","Các nội dung đào tạo đã diễn ra"],all:["Toàn bộ lịch đào tạo","Tất cả mốc lịch đã được cập nhật"]};
  $("listTitle").textContent=titles[period][0];$("listNote").textContent=titles[period][1];$("resultCount").textContent=`${filtered.length} sự kiện`;
  $("emptyState").classList.toggle("hidden",filtered.length>0);
  $("eventList").innerHTML=filtered.map(event=>{
    const part=dateParts(event.date),past=new Date(event.date)<start;
    return `<article class="event-card ${past?"is-past":""}">
      <div class="event-date"><strong>${part.day}</strong><span>${part.month}</span><em>${part.time}</em></div>
      <div class="event-type tone-${event.field.tone}"><span>${event.field.icon}</span><div><small>NỘI DUNG ĐÀO TẠO</small><strong>${esc(event.field.label)}</strong></div></div>
      <div class="event-student"><small>HỌC VIÊN</small><strong>${esc(event.student.name)}</strong><span>${esc(event.student.student_code||"Chưa có mã")} · ${esc(event.student.course||"Chưa có khóa")}</span></div>
      <div class="event-detail">${event.source==="session"?'<span class="repeat-label">Buổi thực hành riêng</span>':""}<span>◷ ${esc(formatDate(event.date))}</span><span>⌖ ${esc(event.location||"Chưa nhập địa điểm")}</span>${event.note?`<span>ⓘ ${esc(event.note)}</span>`:""}</div>
      ${me.role==="admin"?event.source==="session"
        ?`<div class="event-actions"><button class="edit-event" type="button" data-edit-session="${event.id}">Sửa buổi</button><button class="delete-event" type="button" data-delete-session="${event.id}">Xóa buổi</button></div>`
        :`<div class="event-actions"><button class="edit-event" type="button" data-edit-student="${event.student.id}">Sửa mốc</button><button class="delete-event" type="button" data-delete-student="${event.student.id}" data-delete-key="${event.field.key}">Xóa mốc</button></div>`:""}
    </article>`;
  }).join("");
}

function renderAll(){createEvents();renderStats();renderEvents()}

function renderEditorFields(){
  $("scheduleFields").innerHTML=MILESTONE_FIELDS.map(field=>`
    <section class="schedule-field tone-${field.tone}">
      <div class="field-title"><span>${field.icon}</span><strong>${field.label}</strong></div>
      <label>Ngày và giờ<input id="date-${field.key}" type="datetime-local"></label>
      <label>Địa điểm / hình thức<input id="location-${field.key}" placeholder="${field.key==="online"?"Link hoặc nền tảng học":"Nhập địa điểm"}"></label>
    </section>`).join("");
}

function fillEditor(studentId){
  const student=students.find(item=>item.id===studentId)||students[0];
  if(!student)return;
  $("scheduleStudent").value=student.id;
  const schedule=studentSchedule(student);
  for(const field of MILESTONE_FIELDS){
    $(`date-${field.key}`).value=schedule.dates?.[field.key]||"";
    $(`location-${field.key}`).value=schedule.locations?.[field.key]||"";
  }
  $("scheduleNote").value=schedule.note||"";
  $("deleteAllScheduleBtn").classList.toggle("hidden",me.role!=="admin"||!SCHEDULE_FIELDS.some(field=>schedule.dates?.[field.key]));
}

function openEditor(studentId=""){
  if(me.role!=="admin")return;
  $("scheduleError").textContent="";
  fillEditor(studentId||$("scheduleStudent").value);
  $("scheduleDialog").showModal();
}

function toDatetimeLocal(value){
  if(!value)return"";
  const date=new Date(value);
  if(Number.isNaN(date.valueOf()))return"";
  const offset=date.getTimezoneOffset()*60000;
  return new Date(date-offset).toISOString().slice(0,16);
}
async function loadTrainingSessions(){
  try{
    trainingSessions=await rpc("app_list_training_sessions",{p_token:token,p_student_id:null})||[];
    sessionFeatureAvailable=true;
  }catch(error){
    trainingSessions=[];
    sessionFeatureAvailable=false;
    if(!/app_list_training_sessions|schema cache|PGRST202/i.test(error?.message||""))throw error;
  }
}
function openSessionEditor(sessionId=""){
  if(me.role!=="admin")return;
  if(!sessionFeatureAvailable){
    return alert("Admin cần chạy file CAP-NHAT-NHIEU-BUOI-THUC-HANH.sql trong Supabase trước khi thêm nhiều buổi thực hành.");
  }
  const session=trainingSessions.find(item=>String(item.id)===String(sessionId));
  $("sessionForm").reset();
  $("sessionError").textContent="";
  $("trainingSessionId").value=session?.id||"";
  $("trainingStudent").value=session?.student_id||students[0]?.id||"";
  $("trainingType").value=session?.session_type||"familiar";
  $("trainingStartsAt").value=toDatetimeLocal(session?.starts_at);
  $("trainingLocation").value=session?.location||"";
  $("trainingNote").value=session?.note||"";
  $("sessionDialogTitle").textContent=session?"Sửa buổi thực hành":"Thêm buổi thực hành";
  $("saveSessionBtn").textContent=session?"Lưu thay đổi":"Lưu buổi thực hành";
  $("sessionDialog").showModal();
}
async function deleteTrainingSession(sessionId){
  if(me.role!=="admin")return;
  const session=trainingSessions.find(item=>String(item.id)===String(sessionId));
  const student=students.find(item=>String(item.id)===String(session?.student_id));
  const field=SCHEDULE_FIELDS.find(item=>item.key===session?.session_type);
  if(!session||!student||!field)return;
  if(!confirm(`Xóa buổi “${field.label}” của học viên ${student.name} vào ${formatDate(session.starts_at)}?`))return;
  busy(true);
  try{
    await rpc("app_admin_delete_training_session",{p_token:token,p_session_id:session.id});
    trainingSessions=trainingSessions.filter(item=>String(item.id)!==String(session.id));
    renderAll();toast("Đã xóa buổi thực hành");
  }catch(error){alert(error?.message||"Không thể xóa buổi thực hành.")}
  finally{busy(false)}
}

function studentPayload(student,notes){
  return{
    name:student.name||"",date_of_birth:student.date_of_birth||null,cccd:student.cccd||"",phone:student.phone||"",
    license_class:student.license_class||"B số tự động",course:student.course||"",profile_status:student.profile_status||"Đã ghi nhận",
    online_status:student.online_status||"Chưa hoàn thành",cabin_status:student.cabin_status||"Chưa hoàn thành",
    dat_status:student.dat_status||"Chưa thực hiện",graduation_status:student.graduation_status||"Chưa hoàn thành",
    exam_status:student.exam_status||"Chưa thi sát hạch",tuition_total:Number(student.tuition_total||0),paid:Number(student.paid||0),
    address:student.address||"",notes,photo_data:student.photo_data||""
  };
}
async function saveScheduleNotes(student,notes,allowLegacyFallback=false){
  if(me.role!=="admin")throw new Error("Chỉ tài khoản admin được phép cập nhật hoặc xóa lịch đào tạo.");
  try{
    await rpc("app_admin_save_student_schedule",{p_token:token,p_student_id:student.id,p_notes:notes});
  }catch(error){
    const missing=/app_admin_save_student_schedule|schema cache|PGRST202/i.test(error?.message||"");
    if(missing&&allowLegacyFallback){
      await rpc("app_save_student",{p_token:token,p_student_id:student.id,p_data:studentPayload(student,notes),p_owner_id:student.owner_id||me.id});
      return;
    }
    if(missing)throw new Error("Admin cần chạy file CAP-NHAT-XOA-LICH-DAO-TAO.sql trong Supabase trước khi xóa lịch.");
    throw error;
  }
}
async function deleteOneSchedule(studentId,fieldKey){
  if(me.role!=="admin")return;
  const student=students.find(item=>String(item.id)===String(studentId)),field=SCHEDULE_FIELDS.find(item=>item.key===fieldKey);
  if(!student||!field)return;
  if(!confirm(`Xóa lịch “${field.label}” của học viên ${student.name}?`))return;
  const schedule=studentSchedule(student);
  delete schedule.dates?.[fieldKey];delete schedule.locations?.[fieldKey];
  schedule.updatedAt=new Date().toISOString();
  const hasSchedule=Object.keys(schedule.dates||{}).length||Object.keys(schedule.locations||{}).length||schedule.note;
  const notes=embedScheduleInNotes(student.notes,hasSchedule?schedule:null);
  busy(true);
  try{
    await saveScheduleNotes(student,notes,true);
    student.notes=notes;renderAll();toast(`Đã xóa lịch ${field.label}`);
  }catch(error){alert(error?.message||"Không thể xóa lịch đào tạo.")}
  finally{busy(false)}
}

$("scheduleForm").onsubmit=async event=>{
  event.preventDefault();$("scheduleError").textContent="";
  const student=students.find(item=>item.id===$("scheduleStudent").value);
  if(!student)return $("scheduleError").textContent="Vui lòng chọn học viên.";
  const previous=studentSchedule(student);
  const schedule={version:1,dates:{},locations:{},note:$("scheduleNote").value.trim(),updatedAt:new Date().toISOString()};
  for(const key of REPEATABLE_KEYS){
    if(previous.dates?.[key])schedule.dates[key]=previous.dates[key];
    if(previous.locations?.[key])schedule.locations[key]=previous.locations[key];
  }
  for(const field of MILESTONE_FIELDS){
    const date=$(`date-${field.key}`).value,location=$(`location-${field.key}`).value.trim();
    if(date)schedule.dates[field.key]=date;
    if(location)schedule.locations[field.key]=location;
  }
  if(!Object.keys(schedule.dates).length)return $("scheduleError").textContent="Vui lòng nhập ít nhất một mốc đào tạo.";
  $("saveScheduleBtn").disabled=true;busy(true);
  try{
    const notes=embedScheduleInNotes(student.notes,schedule);
    await saveScheduleNotes(student,notes,true);
    student.notes=notes;$("scheduleDialog").close();renderAll();toast("Đã lưu lịch đào tạo");
  }catch(error){$("scheduleError").textContent=error?.message||"Không thể lưu lịch đào tạo."}
  finally{$("saveScheduleBtn").disabled=false;busy(false)}
};

$("sessionForm").onsubmit=async event=>{
  event.preventDefault();$("sessionError").textContent="";
  if(!sessionFeatureAvailable)return $("sessionError").textContent="Cơ sở dữ liệu chưa được cập nhật chức năng nhiều buổi.";
  const startsAt=$("trainingStartsAt").value;
  if(!startsAt)return $("sessionError").textContent="Vui lòng chọn ngày và giờ đào tạo.";
  $("saveSessionBtn").disabled=true;busy(true);
  try{
    await rpc("app_admin_save_training_session",{
      p_token:token,
      p_session_id:$("trainingSessionId").value||null,
      p_student_id:$("trainingStudent").value,
      p_session_type:$("trainingType").value,
      p_starts_at:new Date(startsAt).toISOString(),
      p_location:$("trainingLocation").value.trim(),
      p_note:$("trainingNote").value.trim()
    });
    await loadTrainingSessions();
    $("sessionDialog").close();renderAll();toast($("trainingSessionId").value?"Đã cập nhật buổi thực hành":"Đã thêm buổi thực hành");
  }catch(error){$("sessionError").textContent=error?.message||"Không thể lưu buổi thực hành."}
  finally{$("saveSessionBtn").disabled=false;busy(false)}
};

$("scheduleStudent").onchange=event=>fillEditor(event.target.value);
$("openEditorBtn").onclick=()=>openEditor();
$("openSessionBtn").onclick=()=>openSessionEditor();
$("scheduleSearch").oninput=renderEvents;
$("typeFilter").onchange=renderEvents;
$("periodFilter").onchange=renderEvents;
$("eventList").onclick=event=>{
  const editId=event.target.dataset.editStudent,deleteId=event.target.dataset.deleteStudent,fieldKey=event.target.dataset.deleteKey;
  const editSessionId=event.target.dataset.editSession,deleteSessionId=event.target.dataset.deleteSession;
  if(editSessionId)return openSessionEditor(editSessionId);
  if(deleteSessionId)return deleteTrainingSession(deleteSessionId);
  if(editId)return openEditor(editId);
  if(deleteId&&fieldKey)return deleteOneSchedule(deleteId,fieldKey);
};
$("deleteAllScheduleBtn").onclick=async()=>{
  if(me.role!=="admin")return;
  const student=students.find(item=>String(item.id)===String($("scheduleStudent").value));
  if(!student||!confirm(`Xóa toàn bộ mốc Online, Cabin và kỳ thi của học viên ${student.name}? Các buổi thực hành riêng không bị xóa.`))return;
  const notes=embedScheduleInNotes(student.notes,null);
  $("deleteAllScheduleBtn").disabled=true;busy(true);$("scheduleError").textContent="";
  try{
    await saveScheduleNotes(student,notes,true);
    student.notes=notes;$("scheduleDialog").close();renderAll();toast("Đã xóa toàn bộ mốc đào tạo");
  }catch(error){$("scheduleError").textContent=error?.message||"Không thể xóa lịch đào tạo."}
  finally{$("deleteAllScheduleBtn").disabled=false;busy(false)}
};
document.querySelectorAll(".dialog-close").forEach(button=>button.onclick=()=>button.closest("dialog").close());

async function boot(){
  if(!token)return location.replace("/");
  busy(true);
  try{
    if(authKind==="student"){
      me=await rpc("app_student_me",{p_token:token});
      students=[await rpc("app_student_portal",{p_token:token})];
    }else{
      try{
        me=await rpc("app_me",{p_token:token});
        students=await rpc("app_list_students",{p_token:token,p_owner_id:null})||[];
      }catch{
        me=await rpc("app_student_me",{p_token:token});
        students=[await rpc("app_student_portal",{p_token:token})];
      }
    }
    if(!me?.id)throw new Error("Phiên đăng nhập đã hết hạn");
    $("accountName").textContent=me.role==="admin"?`${me.username} · Admin`:me.role==="student"?`${me.username} · Học viên`:me.username;
    if(me.role==="student"){
      document.querySelectorAll('a[href="/"]').forEach(link=>link.href="/hoc-vien.html");
      document.querySelector(".topbar-actions a").textContent="← Về cổng học viên";
      $("emptyState").querySelector("p").textContent="Lịch mới sẽ hiển thị tại đây khi được trung tâm cập nhật.";
    }
    document.querySelectorAll(".admin-only").forEach(element=>element.classList.toggle("hidden",me.role!=="admin"));
    $("scheduleStudent").innerHTML=students.map(student=>`<option value="${student.id}">${esc(student.name)} · ${esc(student.student_code||student.course||"Chưa có mã")}</option>`).join("");
    $("trainingStudent").innerHTML=$("scheduleStudent").innerHTML;
    $("typeFilter").innerHTML+=[...SCHEDULE_FIELDS].map(field=>`<option value="${field.key}">${field.label}</option>`).join("");
    await loadTrainingSessions();
    renderEditorFields();renderAll();
    if(me.role==="admin"&&!sessionFeatureAvailable)toast("Cần chạy file SQL cập nhật để mở chức năng nhiều buổi");
  }catch(error){
    for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}
    alert(error?.message||"Không thể mở lịch đào tạo.");
    location.replace("/");
  }finally{busy(false)}
}

boot();
