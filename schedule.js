import {SCHEDULE_FIELDS,embedScheduleInNotes,parseScheduleFromNotes} from "./schedule-data.js";
import "./ai-chat.js";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
const authKind=localStorage.getItem("hv_auth_kind")||sessionStorage.getItem("hv_auth_kind")||"";
const REPEATABLE_KEYS=new Set(["familiar","dat_practice","practice"]);
const MILESTONE_FIELDS=SCHEDULE_FIELDS.filter(field=>!REPEATABLE_KEYS.has(field.key));
const ONLINE_RANGE_PAIRS=[
  ["online_start","online_end","lý thuyết online"]
];
const DAT_RANGE_PAIRS=[
  ["dat_auto_start","dat_auto_end","DAT số tự động"],
  ["dat_manual_start","dat_manual_end","DAT số cơ khí"]
];
let me=null,students=[],trainingSessions=[],trainingRequests=[],trainingSlots=[],events=[],sessionFeatureAvailable=true,requestFeatureAvailable=true,slotFeatureAvailable=true;

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
async function recordAudit(action,entityType="schedule",entityId="",entityLabel="",details={}){
  try{await rpc("app_record_audit",{p_token:token,p_action:action,p_entity_type:entityType,p_entity_id:String(entityId||""),p_entity_label:entityLabel||"",p_details:details})}catch{}
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
  const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(String(value));
  return new Intl.DateTimeFormat("vi-VN",dateOnly?{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}:{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
}
function formatDuration(minutes){
  const value=Number(minutes)||0,hours=Math.floor(value/60),rest=value%60;
  return [hours?`${hours} giờ`:"",rest?`${rest} phút`:""].filter(Boolean).join(" ")||"Chưa xác định";
}
function formatTimeRange(value,minutes){
  const start=new Date(value);
  if(Number.isNaN(start.valueOf()))return"Chưa chọn khung giờ";
  const end=new Date(start.getTime()+(Number(minutes)||120)*60000);
  const formatter=new Intl.DateTimeFormat("vi-VN",{hour:"2-digit",minute:"2-digit"});
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}
function renderSlotTimePreview(){
  const startsAt=$("slotStartsAt").value,duration=Number($("slotDuration").value)||120;
  $("slotTimePreview").textContent=startsAt
    ?`Khung giờ đã chọn: ${formatTimeRange(startsAt,duration)} · ${formatDuration(duration)}`
    :"Khung giờ sẽ hiển thị sau khi chọn ngày, giờ bắt đầu và thời lượng.";
}
function dateParts(value){
  const date=new Date(value);
  const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(String(value));
  return{day:String(date.getDate()).padStart(2,"0"),month:`THÁNG ${date.getMonth()+1}`,time:dateOnly?"CẢ NGÀY":new Intl.DateTimeFormat("vi-VN",{hour:"2-digit",minute:"2-digit"}).format(date)};
}
function studentSchedule(student){return parseScheduleFromNotes(student.notes)||{version:1,dates:{},locations:{},note:""}}
function isManualBStudent(student){return normalize(student?.license_class).includes("b so co khi")}
function editorFieldsFor(student){return MILESTONE_FIELDS.filter(field=>field.onlyFor!=="b_manual"||isManualBStudent(student))}
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
    instructorName:session.instructor_name||"",
    vehiclePlate:session.vehicle_plate||"",
    durationMinutes:Number(session.duration_minutes)||120,
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
      <div class="event-detail">${event.source==="session"?`<span class="repeat-label">${event.session?.slot_id?"Ca học đã duyệt":"Buổi thực hành riêng"}</span>`:""}<span>◷ ${esc(formatDate(event.date))}${event.source==="session"?` · ${esc(formatDuration(event.durationMinutes))}`:""}</span><span>⌖ ${esc(event.location||"Chưa nhập địa điểm")}</span>${event.instructorName?`<span>👤 Giáo viên: ${esc(event.instructorName)}</span>`:""}${event.vehiclePlate?`<span>🚘 Xe: ${esc(event.vehiclePlate)}</span>`:""}${event.note?`<span>ⓘ ${esc(event.note)}</span>`:""}</div>
      ${me.role==="admin"?event.source==="session"
        ?event.session?.slot_id
          ?`<div class="event-actions"><button class="edit-event" type="button" data-edit-slot="${event.session.slot_id}">Sửa ca</button><button class="delete-event" type="button" data-delete-session="${event.id}">Xóa khỏi ca</button></div>`
          :`<div class="event-actions"><button class="edit-event" type="button" data-edit-session="${event.id}">Sửa buổi</button><button class="delete-event" type="button" data-delete-session="${event.id}">Xóa buổi</button></div>`
        :`<div class="event-actions"><button class="edit-event" type="button" data-edit-student="${event.student.id}">Sửa mốc</button><button class="delete-event" type="button" data-delete-student="${event.student.id}" data-delete-key="${event.field.key}">Xóa mốc</button></div>`:""}
    </article>`;
  }).join("");
}

function renderAll(){createEvents();renderStats();renderEvents()}

function renderEditorFields(student){
  $("scheduleFields").innerHTML=editorFieldsFor(student).map(field=>`
    <section class="schedule-field tone-${field.tone}">
      <div class="field-title"><span>${field.icon}</span><strong>${field.label}</strong></div>
      <label>${field.dateOnly?"Ngày":"Ngày và giờ"}<input id="date-${field.key}" type="${field.dateOnly?"date":"datetime-local"}"></label>
      <label>Địa điểm / hình thức<input id="location-${field.key}" placeholder="${field.key.startsWith("online_")?"Link hoặc nền tảng học":"Nhập địa điểm"}"></label>
    </section>`).join("");
  $("scheduleFields").insertAdjacentHTML("afterbegin",`
    <div class="dat-range-note">
      <strong>Thời gian lý thuyết online</strong>
      <span>Nhập đủ ngày bắt đầu và ngày kết thúc của khóa học online.</span>
    </div>`);
  if(isManualBStudent(student))$("scheduleFields").insertAdjacentHTML("afterbegin",`
    <div class="dat-range-note">
      <strong>DAT dành cho học viên B số cơ khí</strong>
      <span>Nhập đủ ngày bắt đầu và kết thúc cho DAT số tự động, DAT số cơ khí.</span>
    </div>`);
}

function fillEditor(studentId){
  const student=students.find(item=>item.id===studentId)||students[0];
  if(!student)return;
  $("scheduleStudent").value=student.id;
  renderEditorFields(student);
  const schedule=studentSchedule(student);
  for(const field of editorFieldsFor(student)){
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
async function loadTrainingRequests(){
  try{
    trainingRequests=await rpc("app_list_training_requests",{p_token:token,p_student_id:null})||[];
    requestFeatureAvailable=true;
  }catch(error){
    trainingRequests=[];
    requestFeatureAvailable=false;
    if(!/app_list_training_requests|schema cache|PGRST202/i.test(error?.message||""))throw error;
  }
}
async function loadTrainingSlots(){
  try{
    trainingSlots=await rpc("app_list_training_slots",{p_token:token,p_session_type:null})||[];
    slotFeatureAvailable=true;
  }catch(error){
    trainingSlots=[];
    slotFeatureAvailable=false;
    if(!/app_list_training_slots|schema cache|PGRST202/i.test(error?.message||""))throw error;
  }
}
function slotStatusLabel(status){
  return{open:"Đang mở",closed:"Đã đóng",cancelled:"Đã hủy"}[status]||status;
}
function renderTrainingSlots(){
  if(me.role!=="admin")return;
  const openSlots=trainingSlots.filter(slot=>slot.status==="open"&&new Date(slot.starts_at)>new Date());
  $("openSlotCount").textContent=`${openSlots.length} ca đang mở`;
  $("trainingSlotList").innerHTML=trainingSlots.length?trainingSlots.map(slot=>{
    const field=SCHEDULE_FIELDS.find(item=>item.key===slot.session_type)||{icon:"▣",label:"Buổi thực hành"};
    const booked=Number(slot.booked_count)||0,capacity=Math.max(1,Number(slot.capacity)||1),percent=Math.min(100,Math.round(booked/capacity*100));
    return `<article class="training-slot-card ${slot.status!=="open"?"is-closed":""}">
      <div class="training-slot-head">
        <div><span>${field.icon}</span><div><small>${esc(formatDate(slot.starts_at))} · ${esc(formatTimeRange(slot.starts_at,slot.duration_minutes))}</small><strong>${esc(field.label)}</strong></div></div>
        <span class="slot-status ${esc(slot.status)}">${esc(slotStatusLabel(slot.status))}</span>
      </div>
      <div class="training-slot-info">
        <span>◷ ${esc(formatDuration(slot.duration_minutes))}</span>
        <span>⌖ ${esc(slot.location||"Chưa nhập địa điểm")}</span>
        <span>👤 ${esc(slot.instructor_name||"Chưa gán giáo viên")}</span>
        <span>🚘 ${esc(slot.vehicle_plate||"Chưa gán xe")}</span>
      </div>
      <div class="training-slot-capacity"><div class="capacity-bar"><i style="width:${percent}%"></i></div><strong>${booked}/${capacity} học viên${Number(slot.pending_count)?` · ${Number(slot.pending_count)} chờ duyệt`:""}</strong></div>
      <div class="training-slot-actions"><button class="edit-slot" type="button" data-edit-slot="${slot.id}">Sửa ca học</button>${slot.status==="open"?`<button class="close-slot" type="button" data-close-slot="${slot.id}">Đóng đăng ký</button>`:""}</div>
    </article>`;
  }).join(""):`<div class="slot-empty">Chưa có ca học thực hành. Bấm “Tạo ca học” để mở lịch cho học viên đăng ký.</div>`;
}
function openSlotEditor(slotId=""){
  if(me.role!=="admin")return;
  if(!slotFeatureAvailable){
    return alert("Admin cần chạy file CAP-NHAT-CA-HOC-CHONG-TRUNG-LICH.sql trong Supabase trước khi tạo ca học.");
  }
  const slot=trainingSlots.find(item=>String(item.id)===String(slotId));
  $("slotForm").reset();
  $("slotError").textContent="";
  $("trainingSlotId").value=slot?.id||"";
  $("slotType").value=slot?.session_type||"familiar";
  $("slotStartsAt").value=toDatetimeLocal(slot?.starts_at);
  $("slotDuration").value=String(slot?.duration_minutes||120);
  $("slotCapacity").value=String(slot?.capacity||1);
  $("slotInstructor").value=slot?.instructor_name||"";
  $("slotVehicle").value=slot?.vehicle_plate||"";
  $("slotLocation").value=slot?.location||"";
  $("slotStatus").value=slot?.status||"open";
  $("slotNote").value=slot?.note||"";
  renderSlotTimePreview();
  $("slotDialogTitle").textContent=slot?"Sửa ca học thực hành":"Tạo ca học thực hành";
  $("saveSlotBtn").textContent=slot?"Lưu thay đổi":"Tạo ca học";
  $("deleteSlotBtn").classList.toggle("hidden",!slot);
  $("slotDialog").showModal();
}
async function closeTrainingSlot(slotId){
  const slot=trainingSlots.find(item=>String(item.id)===String(slotId));
  if(!slot||!confirm(`Đóng đăng ký ca ${formatDate(slot.starts_at)}?`))return;
  busy(true);
  try{
    await rpc("app_admin_save_training_slot",{
      p_token:token,p_slot_id:slot.id,p_session_type:slot.session_type,p_starts_at:slot.starts_at,
      p_duration_minutes:Number(slot.duration_minutes),p_location:slot.location||"",
      p_instructor_name:slot.instructor_name||"",p_vehicle_plate:slot.vehicle_plate||"",
      p_capacity:Number(slot.capacity),p_note:slot.note||"",p_status:"closed"
    });
    await loadTrainingSlots();renderTrainingSlots();toast("Đã đóng đăng ký ca học");
  }catch(error){alert(error?.message||"Không thể đóng ca học.")}
  finally{busy(false)}
}
function renderTrainingRequests(){
  if(me.role!=="admin")return;
  const pending=trainingRequests.filter(request=>request.status==="pending");
  $("requestCountBadge").textContent=pending.length;
  $("pendingRequestCount").textContent=`${pending.length} chờ duyệt`;
  $("adminRequestList").innerHTML=pending.length?pending.map(request=>{
    const student=students.find(item=>String(item.id)===String(request.student_id));
    const field=SCHEDULE_FIELDS.find(item=>item.key===request.request_type)||{icon:"▣",label:"Buổi thực hành"};
    return `<article class="admin-request">
      <span>${field.icon}</span>
      <div><small>HỌC VIÊN</small><strong>${esc(student?.name||request.student_name||"Học viên")}</strong><em>${esc(student?.student_code||request.student_code||"Chưa có mã")}</em></div>
      <div><small>NỘI DUNG</small><strong>${esc(field.label)}</strong><em>${esc(formatDate(request.slot_starts_at||request.requested_at))}</em></div>
      <div><small>CHI TIẾT CA HỌC</small><em class="${request.slot_id?"request-slot-summary":""}">${request.slot_id?`⌖ ${esc(request.slot_location||"Chưa nhập địa điểm")} · 👤 ${esc(request.slot_instructor_name||"Chưa gán giáo viên")} · 🚘 ${esc(request.slot_vehicle_plate||"Chưa gán xe")}`:esc(request.note||"Yêu cầu lịch cũ, chưa gắn ca học")}</em>${request.note&&request.slot_id?`<em>Học viên: ${esc(request.note)}</em>`:""}</div>
      <div class="request-actions"><button class="approve-request" type="button" data-approve-request="${request.id}">Duyệt</button><button class="reject-request" type="button" data-reject-request="${request.id}">Từ chối</button></div>
    </article>`;
  }).join(""):`<div class="request-empty">Không có yêu cầu đăng ký nào đang chờ duyệt.</div>`;
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
  $("trainingRequestId").value="";
  $("trainingStudent").disabled=false;
  $("trainingType").disabled=false;
  $("trainingStudent").value=session?.student_id||students[0]?.id||"";
  $("trainingType").value=session?.session_type||"familiar";
  $("trainingStartsAt").value=toDatetimeLocal(session?.starts_at);
  $("trainingLocation").value=session?.location||"";
  $("trainingNote").value=session?.note||"";
  $("sessionDialogTitle").textContent=session?"Sửa ca học riêng":"Tạo ca học riêng";
  $("saveSessionBtn").textContent=session?"Lưu thay đổi":"Lưu ca học riêng";
  $("sessionDialog").showModal();
}
function openRequestApproval(requestId){
  if(me.role!=="admin"||!requestFeatureAvailable)return;
  const request=trainingRequests.find(item=>String(item.id)===String(requestId));
  if(!request||request.status!=="pending")return;
  if(request.slot_id)return approveTrainingRequest(request);
  openSessionEditor();
  $("trainingRequestId").value=request.id;
  $("trainingStudent").value=request.student_id;
  $("trainingType").value=request.request_type;
  $("trainingStudent").disabled=true;
  $("trainingType").disabled=true;
  $("trainingStartsAt").value=toDatetimeLocal(request.requested_at);
  $("trainingNote").value="";
  $("sessionDialogTitle").textContent="Duyệt yêu cầu đăng ký";
  $("saveSessionBtn").textContent="Duyệt và tạo lịch";
}
async function approveTrainingRequest(request){
  const slot=trainingSlots.find(item=>String(item.id)===String(request.slot_id));
  const detail=slot?`${formatDate(slot.starts_at)} · ${slot.location||"Chưa có địa điểm"}`:formatDate(request.slot_starts_at||request.requested_at);
  if(!confirm(`Duyệt yêu cầu của ${request.student_name||"học viên"} vào ca ${detail}?`))return;
  busy(true);
  try{
    await rpc("app_admin_review_training_request_slot",{
      p_token:token,p_request_id:request.id,p_decision:"approved",
      p_slot_id:request.slot_id,p_admin_note:""
    });
    await recordAudit("schedule_changed","training_request",request.id,request.student_name||"Học viên",{decision:"approved",slot_id:request.slot_id});
    await Promise.all([loadTrainingSessions(),loadTrainingRequests(),loadTrainingSlots()]);
    renderAll();renderTrainingRequests();renderTrainingSlots();toast("Đã duyệt học viên vào ca học");
  }catch(error){
    const missing=/app_admin_review_training_request_slot|schema cache|PGRST202/i.test(error?.message||"");
    alert(missing?"Admin cần chạy file CAP-NHAT-CA-HOC-CHONG-TRUNG-LICH.sql trong Supabase.":error?.message||"Không thể duyệt yêu cầu.");
  }finally{busy(false)}
}
async function rejectTrainingRequest(requestId){
  if(me.role!=="admin")return;
  const request=trainingRequests.find(item=>String(item.id)===String(requestId));
  if(!request)return;
  const reason=prompt("Nhập lý do từ chối để học viên biết (có thể để trống):","");
  if(reason===null)return;
  busy(true);
  try{
    if(request.slot_id){
      await rpc("app_admin_review_training_request_slot",{
        p_token:token,p_request_id:request.id,p_decision:"rejected",
        p_slot_id:request.slot_id,p_admin_note:reason.trim()
      });
    }else{
      await rpc("app_admin_review_training_request",{
        p_token:token,p_request_id:request.id,p_decision:"rejected",
        p_starts_at:null,p_location:"",p_admin_note:reason.trim()
      });
    }
    await recordAudit("schedule_changed","training_request",request.id,request.student_name||"Học viên",{decision:"rejected",reason:reason.trim()});
    await Promise.all([loadTrainingRequests(),loadTrainingSlots()]);
    renderTrainingRequests();renderTrainingSlots();toast("Đã từ chối yêu cầu");
  }catch(error){alert(error?.message||"Không thể từ chối yêu cầu.")}
  finally{busy(false)}
}
async function deleteTrainingSession(sessionId){
  if(me.role!=="admin")return;
  const session=trainingSessions.find(item=>String(item.id)===String(sessionId));
  const student=students.find(item=>String(item.id)===String(session?.student_id));
  const field=SCHEDULE_FIELDS.find(item=>item.key===session?.session_type);
  if(!session||!student||!field)return;
  if(!confirm(`${session.slot_id?"Xóa học viên khỏi ca":"Xóa buổi"} “${field.label}” của ${student.name} vào ${formatDate(session.starts_at)}?`))return;
  busy(true);
  try{
    await rpc("app_admin_delete_training_session",{p_token:token,p_session_id:session.id});
    await recordAudit("schedule_changed","training_session",session.id,student.name,{operation:"deleted",session_type:session.session_type,starts_at:session.starts_at});
    trainingSessions=trainingSessions.filter(item=>String(item.id)!==String(session.id));
    await loadTrainingSlots();renderAll();renderTrainingSlots();toast(session.slot_id?"Đã xóa học viên khỏi ca":"Đã xóa buổi thực hành");
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
    await recordAudit("schedule_changed","student",student.id,student.name,{operation:"milestone_deleted",field:fieldKey});
    student.notes=notes;renderAll();toast(`Đã xóa lịch ${field.label}`);
  }catch(error){alert(error?.message||"Không thể xóa lịch đào tạo.")}
  finally{busy(false)}
}

$("slotForm").onsubmit=async event=>{
  event.preventDefault();$("slotError").textContent="";
  const startsAt=$("slotStartsAt").value;
  if(!startsAt)return $("slotError").textContent="Vui lòng chọn ngày và giờ bắt đầu.";
  $("saveSlotBtn").disabled=true;busy(true);
  try{
    await rpc("app_admin_save_training_slot",{
      p_token:token,
      p_slot_id:$("trainingSlotId").value||null,
      p_session_type:$("slotType").value,
      p_starts_at:new Date(startsAt).toISOString(),
      p_duration_minutes:Number($("slotDuration").value),
      p_location:$("slotLocation").value.trim(),
      p_instructor_name:$("slotInstructor").value.trim(),
      p_vehicle_plate:$("slotVehicle").value.trim(),
      p_capacity:Number($("slotCapacity").value),
      p_note:$("slotNote").value.trim(),
      p_status:$("slotStatus").value
    });
    await recordAudit("schedule_changed","training_slot",$("trainingSlotId").value||"",$("slotLocation").value.trim()||"Ca học",{operation:$("trainingSlotId").value?"updated":"created",session_type:$("slotType").value,starts_at:new Date(startsAt).toISOString()});
    await Promise.all([loadTrainingSlots(),loadTrainingSessions(),loadTrainingRequests()]);
    $("slotDialog").close();renderTrainingSlots();renderTrainingRequests();renderAll();
    toast($("trainingSlotId").value?"Đã cập nhật ca học":"Đã tạo ca học");
  }catch(error){$("slotError").textContent=error?.message||"Không thể lưu ca học."}
  finally{$("saveSlotBtn").disabled=false;busy(false)}
};
$("slotStartsAt").oninput=renderSlotTimePreview;
$("slotDuration").onchange=renderSlotTimePreview;

$("deleteSlotBtn").onclick=async()=>{
  const slot=trainingSlots.find(item=>String(item.id)===String($("trainingSlotId").value));
  if(!slot||!confirm(`Xóa ca học ${formatDate(slot.starts_at)}?`))return;
  $("deleteSlotBtn").disabled=true;busy(true);$("slotError").textContent="";
  try{
    await rpc("app_admin_delete_training_slot",{p_token:token,p_slot_id:slot.id});
    await recordAudit("schedule_changed","training_slot",slot.id,slot.location||"Ca học",{operation:"deleted",starts_at:slot.starts_at});
    await loadTrainingSlots();$("slotDialog").close();renderTrainingSlots();toast("Đã xóa ca học");
  }catch(error){$("slotError").textContent=error?.message||"Không thể xóa ca học."}
  finally{$("deleteSlotBtn").disabled=false;busy(false)}
};

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
  for(const field of editorFieldsFor(student)){
    const date=$(`date-${field.key}`).value,location=$(`location-${field.key}`).value.trim();
    if(date)schedule.dates[field.key]=date;
    if(location)schedule.locations[field.key]=location;
  }
  const rangePairs=[...ONLINE_RANGE_PAIRS,...(isManualBStudent(student)?DAT_RANGE_PAIRS:[])];
  for(const [startKey,endKey,label] of rangePairs){
      const start=schedule.dates[startKey],end=schedule.dates[endKey];
      if(Boolean(start)!==Boolean(end))return $("scheduleError").textContent=`Vui lòng nhập đủ ngày bắt đầu và kết thúc ${label}.`;
      if(start&&new Date(end)<new Date(start))return $("scheduleError").textContent=`Ngày kết thúc ${label} không được trước ngày bắt đầu.`;
  }
  if(!Object.keys(schedule.dates).length)return $("scheduleError").textContent="Vui lòng nhập ít nhất một mốc đào tạo.";
  $("saveScheduleBtn").disabled=true;busy(true);
  try{
    const notes=embedScheduleInNotes(student.notes,schedule);
    await saveScheduleNotes(student,notes,true);
    await recordAudit("schedule_changed","student",student.id,student.name,{operation:"milestones_updated"});
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
    const requestId=$("trainingRequestId").value;
    if(requestId){
      await rpc("app_admin_review_training_request",{
        p_token:token,p_request_id:requestId,p_decision:"approved",
        p_starts_at:new Date(startsAt).toISOString(),
        p_location:$("trainingLocation").value.trim(),
        p_admin_note:$("trainingNote").value.trim()
      });
      const request=trainingRequests.find(item=>String(item.id)===String(requestId));
      await recordAudit("schedule_changed","training_request",requestId,request?.student_name||"Học viên",{decision:"approved",starts_at:new Date(startsAt).toISOString()});
      await Promise.all([loadTrainingSessions(),loadTrainingRequests()]);
      $("sessionDialog").close();renderAll();renderTrainingRequests();toast("Đã duyệt và tạo lịch chính thức");
    }else{
      await rpc("app_admin_save_training_session",{
        p_token:token,
        p_session_id:$("trainingSessionId").value||null,
        p_student_id:$("trainingStudent").value,
        p_session_type:$("trainingType").value,
        p_starts_at:new Date(startsAt).toISOString(),
        p_location:$("trainingLocation").value.trim(),
        p_note:$("trainingNote").value.trim()
      });
      const student=students.find(item=>String(item.id)===String($("trainingStudent").value));
      await recordAudit("schedule_changed","training_session",$("trainingSessionId").value||"",student?.name||"Học viên",{operation:$("trainingSessionId").value?"updated":"created",session_type:$("trainingType").value,starts_at:new Date(startsAt).toISOString()});
      await loadTrainingSessions();
      $("sessionDialog").close();renderAll();toast($("trainingSessionId").value?"Đã cập nhật ca học riêng":"Đã tạo ca học riêng");
    }
  }catch(error){$("sessionError").textContent=error?.message||"Không thể lưu buổi thực hành."}
  finally{$("saveSessionBtn").disabled=false;busy(false)}
};

$("scheduleStudent").onchange=event=>fillEditor(event.target.value);
$("openEditorBtn").onclick=()=>openEditor();
$("openSlotBtn").onclick=()=>openSlotEditor();
$("openSessionBtn").onclick=()=>openSessionEditor();
$("openRequestsBtn").onclick=()=>{$("trainingRequests").scrollIntoView({behavior:"smooth",block:"start"})};
$("scheduleSearch").oninput=renderEvents;
$("typeFilter").onchange=renderEvents;
$("periodFilter").onchange=renderEvents;
$("eventList").onclick=event=>{
  const editId=event.target.dataset.editStudent,deleteId=event.target.dataset.deleteStudent,fieldKey=event.target.dataset.deleteKey;
  const editSessionId=event.target.dataset.editSession,deleteSessionId=event.target.dataset.deleteSession,editSlotId=event.target.dataset.editSlot;
  if(editSlotId)return openSlotEditor(editSlotId);
  if(editSessionId)return openSessionEditor(editSessionId);
  if(deleteSessionId)return deleteTrainingSession(deleteSessionId);
  if(editId)return openEditor(editId);
  if(deleteId&&fieldKey)return deleteOneSchedule(deleteId,fieldKey);
};
$("trainingSlotList").onclick=event=>{
  const editSlotId=event.target.dataset.editSlot,closeSlotId=event.target.dataset.closeSlot;
  if(editSlotId)return openSlotEditor(editSlotId);
  if(closeSlotId)return closeTrainingSlot(closeSlotId);
};
$("adminRequestList").onclick=event=>{
  const approveId=event.target.dataset.approveRequest,rejectId=event.target.dataset.rejectRequest;
  if(approveId)return openRequestApproval(approveId);
  if(rejectId)return rejectTrainingRequest(rejectId);
};
$("deleteAllScheduleBtn").onclick=async()=>{
  if(me.role!=="admin")return;
  const student=students.find(item=>String(item.id)===String($("scheduleStudent").value));
  if(!student||!confirm(`Xóa toàn bộ mốc Online, Cabin, DAT và kỳ thi của học viên ${student.name}? Các buổi thực hành riêng không bị xóa.`))return;
  const notes=embedScheduleInNotes(student.notes,null);
  $("deleteAllScheduleBtn").disabled=true;busy(true);$("scheduleError").textContent="";
  try{
    await saveScheduleNotes(student,notes,true);
    await recordAudit("schedule_changed","student",student.id,student.name,{operation:"all_milestones_deleted"});
    student.notes=notes;$("scheduleDialog").close();renderAll();toast("Đã xóa toàn bộ mốc đào tạo");
  }catch(error){$("scheduleError").textContent=error?.message||"Không thể xóa lịch đào tạo."}
  finally{$("deleteAllScheduleBtn").disabled=false;busy(false)}
};
document.querySelectorAll(".dialog-close").forEach(button=>button.onclick=()=>button.closest("dialog").close());

async function boot(){
  if(!token)return location.replace("/?login=1");
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
      document.querySelectorAll('a[href="/?login=1"]').forEach(link=>link.href="/hoc-vien.html");
      document.querySelector(".topbar-actions a").textContent="← Về cổng học viên";
      $("emptyState").querySelector("p").textContent="Lịch mới sẽ hiển thị tại đây khi được trung tâm cập nhật.";
    }
    document.querySelectorAll(".admin-only").forEach(element=>element.classList.toggle("hidden",me.role!=="admin"));
    $("scheduleStudent").innerHTML=students.map(student=>`<option value="${student.id}">${esc(student.name)} · ${esc(student.student_code||student.course||"Chưa có mã")}</option>`).join("");
    $("trainingStudent").innerHTML=$("scheduleStudent").innerHTML;
    $("typeFilter").innerHTML+=[...SCHEDULE_FIELDS].map(field=>`<option value="${field.key}">${field.label}</option>`).join("");
    await loadTrainingSessions();
    if(me.role==="admin")await Promise.all([loadTrainingRequests(),loadTrainingSlots()]);
    renderEditorFields(students[0]);renderAll();renderTrainingRequests();renderTrainingSlots();
    if(me.role==="admin"&&!sessionFeatureAvailable)toast("Cần chạy file SQL cập nhật để mở chức năng nhiều buổi");
    if(me.role==="admin"&&!requestFeatureAvailable)toast("Cần chạy file SQL đăng ký lịch để nhận yêu cầu từ học viên");
    if(me.role==="admin"&&!slotFeatureAvailable)toast("Cần chạy file SQL ca học để bật chống trùng lịch");
  }catch(error){
    for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}
    alert(error?.message||"Không thể mở lịch đào tạo.");
    location.replace("/?login=1");
  }finally{busy(false)}
}

boot();
