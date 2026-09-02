import {SCHEDULE_FIELDS} from "./schedule-data.js";
import {studentRpc} from "./student-rpc-client.js";
import "./course-schedule-sync.css";

const $=id=>document.getElementById(id);
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
const SUCCESS_KEY="hoclaixecungdat_course_schedule_success";
const FIXED_KEYS=new Set([
  "online_start","online_end","cabin",
  "dat_auto_start","dat_auto_end",
  "dat_manual_start","dat_manual_end",
  "graduation","exam"
]);
const BASE_KEYS=new Set(["online_start","online_end","cabin","graduation","exam"]);
const AUTO_DAT_KEYS=new Set(["dat_auto_start","dat_auto_end"]);
const MANUAL_DAT_KEYS=new Set(["dat_manual_start","dat_manual_end"]);
const RANGE_PAIRS=[
  ["online_start","online_end","lý thuyết online"],
  ["dat_auto_start","dat_auto_end","DAT số tự động"],
  ["dat_manual_start","dat_manual_end","DAT số cơ khí"]
];

let me=null;
let students=[];
let courseRows=[];
let mounted=false;
let refreshPromise=null;

function normalize(value){
  return String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/\s+/g," ");
}
function esc(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
}
function errorText(error){return error?.message||"Không thể cập nhật lịch đào tạo theo khóa học."}
function isManualB(student){return normalize(student?.license_class).includes("b so co khi")}
function isAutomaticB(student){return normalize(student?.license_class).includes("b so tu dong")}
function courseKey(value){return normalize(value)}
function courseMembers(key){return students.filter(student=>courseKey(student.course)===key&&student.deleted_at==null)}
function courseRow(key){return courseRows.find(item=>String(item.course_key)===String(key))||null}
function clone(value){return value?JSON.parse(JSON.stringify(value)):null}

async function rpc(fn,body={}){
  return studentRpc(fn,body,{proxyTimeoutMs:6500,directTimeoutMs:4500});
}
async function recordAudit(action,course,result,extra={}){
  try{
    await rpc("app_record_audit",{
      p_token:token,
      p_action:action,
      p_entity_type:"course",
      p_entity_id:String(course.course_key||""),
      p_entity_label:course.course||"Khóa học",
      p_details:{student_count:Number(result?.student_count)||Number(course.student_count)||0,...extra}
    });
  }catch{}
}
function busy(on){$("loading")?.classList.toggle("hidden",!on)}
function showFormError(message){const node=$("scheduleError");if(node)node.textContent=message||""}
function toast(message){
  const node=$("toast");
  if(!node)return;
  node.textContent=message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>node.classList.remove("show"),3500);
}
function reloadWithMessage(message){
  sessionStorage.setItem(SUCCESS_KEY,message);
  location.reload();
}
function restoreMessage(){
  const message=sessionStorage.getItem(SUCCESS_KEY);
  if(!message)return;
  sessionStorage.removeItem(SUCCESS_KEY);
  setTimeout(()=>toast(message),450);
}

async function refreshData(force=false){
  if(refreshPromise&&!force)return refreshPromise;
  refreshPromise=Promise.all([
    rpc("app_list_students",{p_token:token,p_owner_id:null}),
    rpc("app_admin_list_course_schedules",{p_token:token})
  ]).then(([studentData,courseData])=>{
    students=Array.isArray(studentData)?studentData:[];
    courseRows=Array.isArray(courseData)?courseData:[];
    return{students,courseRows};
  }).finally(()=>{refreshPromise=null});
  return refreshPromise;
}

function fieldsForMembers(members){
  const keys=new Set(BASE_KEYS);
  if(members.some(student=>isAutomaticB(student)||isManualB(student))){
    for(const key of AUTO_DAT_KEYS)keys.add(key);
  }
  if(members.some(isManualB)){
    for(const key of MANUAL_DAT_KEYS)keys.add(key);
  }
  return SCHEDULE_FIELDS.filter(field=>FIXED_KEYS.has(field.key)&&keys.has(field.key));
}
function inputValue(field,value){
  if(!value)return"";
  if(field.dateOnly)return String(value).slice(0,10);
  const text=String(value);
  if(!/[zZ]|[+-]\d\d:?\d\d$/.test(text))return text.slice(0,16);
  const date=new Date(text);
  if(Number.isNaN(date.valueOf()))return text.slice(0,16);
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}
function renderFields(row){
  const host=$("scheduleFields");
  const members=courseMembers(row.course_key);
  const fields=fieldsForMembers(members);
  const schedule=row.schedule&&typeof row.schedule==="object"?row.schedule:{dates:{},locations:{},note:""};
  const dates=schedule.dates&&typeof schedule.dates==="object"?schedule.dates:{};
  const locations=schedule.locations&&typeof schedule.locations==="object"?schedule.locations:{};

  host.innerHTML=fields.map(field=>`
    <section class="schedule-field tone-${esc(field.tone)}">
      <div class="field-title"><span>${field.icon}</span><strong>${esc(field.label)}</strong></div>
      <label>${field.dateOnly?"Ngày":"Ngày và giờ"}<input id="date-${field.key}" type="${field.dateOnly?"date":"datetime-local"}" value="${esc(inputValue(field,dates[field.key]))}"></label>
      <label>Địa điểm / hình thức<input id="location-${field.key}" value="${esc(locations[field.key]||"")}" placeholder="${field.key.startsWith("online_")?"Link hoặc nền tảng học":"Nhập địa điểm"}"></label>
    </section>`).join("");

  host.insertAdjacentHTML("afterbegin",`
    <div class="course-schedule-scope">
      <strong>Áp dụng đồng bộ cho toàn khóa</strong>
      <span>Mọi thay đổi bên dưới sẽ cập nhật cùng lúc cho ${members.length} học viên. Các ca học riêng và buổi thực hành cá nhân vẫn được giữ nguyên.</span>
    </div>
    <div class="dat-range-note">
      <strong>Thời gian lý thuyết online</strong>
      <span>Nhập đủ ngày bắt đầu và ngày kết thúc của khóa học online.</span>
    </div>`);

  if(members.some(isAutomaticB)||members.some(isManualB)){
    host.insertAdjacentHTML("beforeend",`
      <div class="dat-range-note course-dat-note">
        <strong>Lịch DAT theo hạng bằng</strong>
        <span>DAT số tự động áp dụng cho học viên B; DAT số cơ khí chỉ áp dụng cho học viên B số cơ khí trong khóa.</span>
      </div>`);
  }

  $("scheduleNote").value=schedule.note||"";
  $("scheduleNote").maxLength=1000;
}

function setRepresentative(members){
  const hidden=$("scheduleStudent");
  const representative=members[0];
  if(!hidden||!representative)return;
  if(![...hidden.options].some(option=>String(option.value)===String(representative.id))){
    hidden.add(new Option(representative.name||"Học viên",representative.id));
  }
  hidden.value=representative.id;
  hidden.dispatchEvent(new Event("change",{bubbles:true}));
}
function updateCourseSummary(row){
  const members=courseMembers(row.course_key);
  const licenses=[...new Set(members.map(student=>student.license_class).filter(Boolean))];
  const names=members.slice(0,5).map(student=>student.name).filter(Boolean);
  const remaining=Math.max(0,members.length-names.length);
  const summary=$("courseScheduleSummary");
  if(summary){
    summary.innerHTML=`<strong>${members.length} học viên</strong><span>${licenses.length?esc(licenses.join(" · ")):"Chưa xác định hạng bằng"}</span><small>${names.length?esc(names.join(", ")):"Chưa có học viên"}${remaining?` và ${remaining} học viên khác`:""}</small>`;
  }
  const status=$("courseScheduleStatus");
  if(status){
    status.className=`course-schedule-status ${row.has_schedule?"synced":"new"}`;
    status.textContent=row.has_schedule
      ?`Đã có lịch chung${row.updated_at?` · cập nhật ${new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(row.updated_at))}`:""}`
      :"Chưa lập lịch chung cho khóa";
  }
}
function updateCourseOptions(preferredKey=""){
  const select=$("scheduleCourse");
  if(!select)return null;
  const current=preferredKey||select.value;
  if(!courseRows.length){
    select.innerHTML='<option value="">Chưa có khóa học</option>';
    select.disabled=true;
    return null;
  }
  select.disabled=false;
  select.innerHTML=courseRows.map(row=>`<option value="${esc(row.course_key)}">${esc(row.course)} · ${Number(row.student_count)||0} học viên${row.has_schedule?" · Đã có lịch":""}</option>`).join("");
  const selected=courseRows.some(row=>row.course_key===current)?current:courseRows[0].course_key;
  select.value=selected;
  return courseRow(selected);
}
function prepareCourse(row){
  if(!row)return;
  const members=courseMembers(row.course_key);
  const select=$("scheduleCourse");
  if(select)select.value=row.course_key;
  setRepresentative(members);
  renderFields(row);
  updateCourseSummary(row);
  showFormError("");
  const deleteButton=$("deleteAllScheduleBtn");
  if(deleteButton){
    deleteButton.textContent="Xóa lịch chung của khóa";
    deleteButton.classList.toggle("hidden",!row.has_schedule);
  }
  const saveButton=$("saveScheduleBtn");
  if(saveButton)saveButton.textContent=row.has_schedule?"Cập nhật toàn khóa":"Lưu cho toàn khóa";
}

async function openCourseDialog(preferredKey=""){
  busy(true);
  try{
    await refreshData(true);
    const row=updateCourseOptions(preferredKey);
    if(!row){
      alert("Chưa có khóa học nào. Hãy nhập mục “Khóa học” trong hồ sơ học viên trước.");
      return;
    }
    prepareCourse(row);
    const dialog=$("scheduleDialog");
    if(dialog&&!dialog.open)dialog.showModal();
  }catch(error){
    alert(errorText(error));
  }finally{busy(false)}
}
async function openCourseForStudent(studentId){
  busy(true);
  try{
    await refreshData(true);
    const student=students.find(item=>String(item.id)===String(studentId));
    const key=courseKey(student?.course);
    if(!student||!key){
      alert("Học viên này chưa được gán Khóa học. Hãy cập nhật Khóa học trong hồ sơ trước.");
      return;
    }
    updateCourseOptions(key);
    const row=courseRow(key);
    if(!row)throw new Error("Không tìm thấy khóa học của học viên.");
    prepareCourse(row);
    const dialog=$("scheduleDialog");
    if(dialog&&!dialog.open)dialog.showModal();
  }catch(error){alert(errorText(error))}
  finally{busy(false)}
}

function readScheduleFromForm(row){
  const members=courseMembers(row.course_key);
  const fields=fieldsForMembers(members);
  const schedule={version:2,dates:{},locations:{},note:$("scheduleNote").value.trim()};
  for(const field of fields){
    const date=$(`date-${field.key}`)?.value||"";
    const location=$(`location-${field.key}`)?.value.trim()||"";
    if(date)schedule.dates[field.key]=date;
    if(date&&location)schedule.locations[field.key]=location;
  }
  for(const [startKey,endKey,label] of RANGE_PAIRS){
    const fieldVisible=fields.some(field=>field.key===startKey||field.key===endKey);
    if(!fieldVisible)continue;
    const start=schedule.dates[startKey],end=schedule.dates[endKey];
    if(Boolean(start)!==Boolean(end))throw new Error(`Vui lòng nhập đủ ngày bắt đầu và kết thúc ${label}.`);
    if(start&&new Date(end)<new Date(start))throw new Error(`Ngày kết thúc ${label} không được trước ngày bắt đầu.`);
  }
  if(!Object.keys(schedule.dates).length)throw new Error("Vui lòng nhập ít nhất một mốc đào tạo.");
  return schedule;
}
async function saveCourseSchedule(event){
  event.preventDefault();
  event.stopImmediatePropagation();
  const row=courseRow($("scheduleCourse")?.value||"");
  if(!row)return showFormError("Vui lòng chọn khóa học.");
  let schedule;
  try{schedule=readScheduleFromForm(row)}catch(error){return showFormError(errorText(error))}
  const button=$("saveScheduleBtn");
  button.disabled=true;
  busy(true);
  showFormError("");
  try{
    const result=await rpc("app_admin_save_course_schedule",{
      p_token:token,
      p_course:row.course,
      p_schedule:schedule
    });
    await recordAudit("course_schedule_updated",row,result,{operation:"course_milestones_updated"});
    reloadWithMessage(`Đã cập nhật lịch cho ${Number(result?.student_count)||row.student_count} học viên khóa ${row.course}.`);
  }catch(error){showFormError(errorText(error));button.disabled=false;busy(false)}
}

function pairKeys(key){
  for(const [start,end] of RANGE_PAIRS)if(key===start||key===end)return[start,end];
  return[key];
}
async function deleteCourseField(studentId,fieldKey){
  busy(true);
  try{
    await refreshData(true);
    const student=students.find(item=>String(item.id)===String(studentId));
    const row=courseRow(courseKey(student?.course));
    if(!student||!row?.schedule)throw new Error("Khóa học này chưa có lịch chung để chỉnh sửa.");
    const field=SCHEDULE_FIELDS.find(item=>item.key===fieldKey);
    const keys=pairKeys(fieldKey);
    const affected=keys.length>1?`khoảng “${fieldKey.startsWith("online_")?"Lý thuyết online":fieldKey.includes("manual")?"DAT số cơ khí":"DAT số tự động"}”`:`mốc “${field?.label||"đào tạo"}”`;
    if(!confirm(`Xóa ${affected} khỏi khóa ${row.course}? Thay đổi sẽ áp dụng cho toàn bộ ${row.student_count} học viên.`))return;
    const schedule=clone(row.schedule)||{dates:{},locations:{},note:""};
    schedule.dates=schedule.dates||{};
    schedule.locations=schedule.locations||{};
    for(const key of keys){delete schedule.dates[key];delete schedule.locations[key]}
    let result;
    if(!Object.keys(schedule.dates).some(key=>FIXED_KEYS.has(key))){
      result=await rpc("app_admin_delete_course_schedule",{p_token:token,p_course:row.course});
      await recordAudit("course_schedule_deleted",row,result,{operation:"course_schedule_deleted"});
    }else{
      result=await rpc("app_admin_save_course_schedule",{p_token:token,p_course:row.course,p_schedule:schedule});
      await recordAudit("course_schedule_updated",row,result,{operation:"course_milestone_deleted",field_keys:keys});
    }
    reloadWithMessage(`Đã cập nhật lịch chung của khóa ${row.course}.`);
  }catch(error){alert(errorText(error));busy(false)}
}
async function deleteWholeCourseSchedule(){
  const row=courseRow($("scheduleCourse")?.value||"");
  if(!row)return;
  if(!confirm(`Xóa toàn bộ lịch chung của khóa ${row.course}? ${row.student_count} học viên trong khóa sẽ được cập nhật; các ca học riêng vẫn được giữ nguyên.`))return;
  const button=$("deleteAllScheduleBtn");
  button.disabled=true;
  busy(true);
  showFormError("");
  try{
    const result=await rpc("app_admin_delete_course_schedule",{p_token:token,p_course:row.course});
    await recordAudit("course_schedule_deleted",row,result,{operation:"course_schedule_deleted"});
    reloadWithMessage(`Đã xóa lịch chung của khóa ${row.course}.`);
  }catch(error){showFormError(errorText(error));button.disabled=false;busy(false)}
}

function installUi(){
  if(mounted)return;
  const form=$("scheduleForm"),originalLabel=form?.querySelector(".student-select"),originalSelect=$("scheduleStudent");
  if(!form||!originalLabel||!originalSelect)return;
  mounted=true;

  originalLabel.hidden=true;
  originalLabel.dataset.courseSyncHidden="1";
  originalSelect.required=false;
  originalSelect.tabIndex=-1;
  originalSelect.setAttribute("aria-hidden","true");

  const picker=document.createElement("section");
  picker.id="courseSchedulePicker";
  picker.className="course-schedule-picker";
  picker.innerHTML=`
    <label>Chọn khóa học
      <select id="scheduleCourse" required></select>
    </label>
    <div id="courseScheduleSummary" class="course-schedule-summary"></div>
    <span id="courseScheduleStatus" class="course-schedule-status new">Chưa lập lịch chung cho khóa</span>
    <p>Admin chỉ nhập lịch một lần. Hệ thống tự cập nhật cho mọi học viên hiện tại và những học viên được thêm vào khóa sau này.</p>`;
  originalLabel.insertAdjacentElement("afterend",picker);

  const heading=form.querySelector(".dialog-head h2");
  if(heading)heading.textContent="Lập lịch đào tạo theo khóa học";
  const kicker=form.querySelector(".dialog-head p");
  if(kicker)kicker.textContent="LỊCH CHUNG TOÀN KHÓA";
  const openButton=$("openEditorBtn");
  if(openButton)openButton.textContent="＋ Lập lịch theo khóa học";
  const emptyText=$("emptyState")?.querySelector("p");
  if(emptyText)emptyText.textContent="Admin có thể bấm “Lập lịch theo khóa học” để cập nhật đồng thời cho toàn bộ học viên trong khóa.";

  $("scheduleCourse").addEventListener("change",event=>{
    const row=courseRow(event.target.value);
    if(row)prepareCourse(row);
  });
  form.addEventListener("submit",saveCourseSchedule,true);

  document.addEventListener("click",event=>{
    const open=event.target.closest("#openEditorBtn");
    if(open){
      event.preventDefault();event.stopImmediatePropagation();
      void openCourseDialog($("scheduleCourse")?.value||"");
      return;
    }
    const deleteAll=event.target.closest("#deleteAllScheduleBtn");
    if(deleteAll){
      event.preventDefault();event.stopImmediatePropagation();
      void deleteWholeCourseSchedule();
      return;
    }
    const edit=event.target.closest("#eventList [data-edit-student]");
    if(edit){
      event.preventDefault();event.stopImmediatePropagation();
      void openCourseForStudent(edit.dataset.editStudent);
      return;
    }
    const remove=event.target.closest("#eventList [data-delete-student][data-delete-key]");
    if(remove){
      event.preventDefault();event.stopImmediatePropagation();
      void deleteCourseField(remove.dataset.deleteStudent,remove.dataset.deleteKey);
    }
  },true);
}

async function boot(){
  if(location.pathname!=="/lich-dao-tao.html"||!token)return;
  try{
    me=await rpc("app_me",{p_token:token});
    if(me?.role!=="admin")return;
    installUi();
    await refreshData(true);
    updateCourseOptions();
    restoreMessage();
  }catch(error){
    console.error("[course-schedule-sync]",error);
  }
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else void boot();
