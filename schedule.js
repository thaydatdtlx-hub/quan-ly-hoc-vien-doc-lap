import {SCHEDULE_FIELDS,embedScheduleInNotes,parseScheduleFromNotes} from "./schedule-data.js";

const SUPABASE_URL="https://ainrsticcgpoqadiaivj.supabase.co";
const SUPABASE_KEY="sb_publishable_e3yowYg73Lcrkx6WU5StHw_telwpp1z";
const $=id=>document.getElementById(id);
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
const authKind=localStorage.getItem("hv_auth_kind")||sessionStorage.getItem("hv_auth_kind")||"";
let me=null,students=[],events=[];

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
  events=students.flatMap(student=>{
    const schedule=studentSchedule(student);
    return SCHEDULE_FIELDS.filter(field=>schedule.dates?.[field.key]).map(field=>({
      id:`${student.id}-${field.key}`,
      student,
      field,
      date:schedule.dates[field.key],
      location:schedule.locations?.[field.key]||"",
      note:schedule.note||""
    }));
  }).sort((a,b)=>new Date(a.date)-new Date(b.date));
}

function renderStats(){
  const today=todayKey(),start=startOfToday(),weekEnd=endOfWeek();
  $("upcomingCount").textContent=events.filter(event=>new Date(event.date)>=start).length;
  $("weekCount").textContent=events.filter(event=>new Date(event.date)>=start&&new Date(event.date)<=weekEnd).length;
  $("todayCount").textContent=events.filter(event=>dayKey(event.date)===today).length;
  $("unscheduledCount").textContent=students.filter(student=>!SCHEDULE_FIELDS.some(field=>studentSchedule(student).dates?.[field.key])).length;
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
      <div class="event-detail"><span>◷ ${esc(formatDate(event.date))}</span><span>⌖ ${esc(event.location||"Chưa nhập địa điểm")}</span>${event.note?`<span>ⓘ ${esc(event.note)}</span>`:""}</div>
      ${me.role==="admin"?`<div class="event-actions"><button class="edit-event" type="button" data-edit-student="${event.student.id}">Sửa lịch</button><button class="delete-event" type="button" data-delete-student="${event.student.id}" data-delete-key="${event.field.key}">Xóa lịch</button></div>`:""}
    </article>`;
  }).join("");
}

function renderAll(){createEvents();renderStats();renderEvents()}

function renderEditorFields(){
  $("scheduleFields").innerHTML=SCHEDULE_FIELDS.map(field=>`
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
  for(const field of SCHEDULE_FIELDS){
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
  const schedule={version:1,dates:{},locations:{},note:$("scheduleNote").value.trim(),updatedAt:new Date().toISOString()};
  for(const field of SCHEDULE_FIELDS){
    const date=$(`date-${field.key}`).value,location=$(`location-${field.key}`).value.trim();
    if(date)schedule.dates[field.key]=date;
    if(location)schedule.locations[field.key]=location;
  }
  if(!Object.keys(schedule.dates).length)return $("scheduleError").textContent="Vui lòng nhập ít nhất một ngày đào tạo.";
  $("saveScheduleBtn").disabled=true;busy(true);
  try{
    const notes=embedScheduleInNotes(student.notes,schedule);
    await saveScheduleNotes(student,notes,true);
    student.notes=notes;$("scheduleDialog").close();renderAll();toast("Đã lưu lịch đào tạo");
  }catch(error){$("scheduleError").textContent=error?.message||"Không thể lưu lịch đào tạo."}
  finally{$("saveScheduleBtn").disabled=false;busy(false)}
};

$("scheduleStudent").onchange=event=>fillEditor(event.target.value);
$("openEditorBtn").onclick=()=>openEditor();
$("scheduleSearch").oninput=renderEvents;
$("typeFilter").onchange=renderEvents;
$("periodFilter").onchange=renderEvents;
$("eventList").onclick=event=>{
  const editId=event.target.dataset.editStudent,deleteId=event.target.dataset.deleteStudent,fieldKey=event.target.dataset.deleteKey;
  if(editId)return openEditor(editId);
  if(deleteId&&fieldKey)return deleteOneSchedule(deleteId,fieldKey);
};
$("deleteAllScheduleBtn").onclick=async()=>{
  if(me.role!=="admin")return;
  const student=students.find(item=>String(item.id)===String($("scheduleStudent").value));
  if(!student||!confirm(`Xóa toàn bộ lịch đào tạo của học viên ${student.name}? Hành động này không thể hoàn tác.`))return;
  const notes=embedScheduleInNotes(student.notes,null);
  $("deleteAllScheduleBtn").disabled=true;busy(true);$("scheduleError").textContent="";
  try{
    await saveScheduleNotes(student,notes,true);
    student.notes=notes;$("scheduleDialog").close();renderAll();toast("Đã xóa toàn bộ lịch đào tạo");
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
    $("typeFilter").innerHTML+=[...SCHEDULE_FIELDS].map(field=>`<option value="${field.key}">${field.label}</option>`).join("");
    renderEditorFields();renderAll();
  }catch(error){
    for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}
    alert(error?.message||"Không thể mở lịch đào tạo.");
    location.replace("/");
  }finally{busy(false)}
}

boot();
