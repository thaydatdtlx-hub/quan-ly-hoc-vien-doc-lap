import "./student-training-actions.css";

const STUDENT_ROW_SELECTOR="#studentRows";
const ACTION_BUTTON_CLASS="student-training-row-btn";
let selectedStudent=null;

function studentIdFromRow(row){
  return row.querySelector("[data-edit]")?.dataset.edit||"";
}

function studentNameFromRow(row){
  return row.querySelector(".student-name")?.textContent?.trim()||"Học viên";
}

function ensureDialog(){
  let dialog=document.getElementById("studentTrainingActionDialog");
  if(dialog)return dialog;
  dialog=document.createElement("dialog");
  dialog.id="studentTrainingActionDialog";
  dialog.className="student-training-action-dialog";
  dialog.innerHTML=`<div class="student-training-action-shell">
    <div class="student-training-action-head">
      <div><p>LỊCH ĐÀO TẠO HỌC VIÊN</p><h2 id="studentTrainingActionTitle">Chọn thao tác</h2><span id="studentTrainingActionSubtitle">Mở đúng biểu mẫu và giữ sẵn học viên đang chọn.</span></div>
      <button class="student-training-action-close" type="button" aria-label="Đóng">×</button>
    </div>
    <div class="student-training-action-list">
      <a id="studentPrivateSessionLink" class="student-training-action-link" href="/lich-dao-tao.html?action=session">
        <span aria-hidden="true">🚘</span><span><strong>Tạo ca học riêng</strong><small>Lập một buổi thực hành riêng cho học viên này.</small></span><b aria-hidden="true">→</b>
      </a>
      <a id="studentMilestoneLink" class="student-training-action-link" href="/lich-dao-tao.html?action=milestone">
        <span aria-hidden="true">📅</span><span><strong>Lập mốc đào tạo</strong><small>Cập nhật Online, Cabin, DAT, tốt nghiệp và sát hạch.</small></span><b aria-hidden="true">→</b>
      </a>
    </div>
    <p class="student-training-action-note">Trang lịch đào tạo sẽ tự động chọn đúng học viên trước khi mở biểu mẫu.</p>
  </div>`;
  document.body.append(dialog);
  dialog.querySelector(".student-training-action-close").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
  return dialog;
}

function openActionDialog(studentId,studentName){
  selectedStudent={id:String(studentId),name:studentName||"Học viên"};
  const dialog=ensureDialog();
  dialog.querySelector("#studentTrainingActionTitle").textContent=selectedStudent.name;
  const params=new URLSearchParams({student:selectedStudent.id});
  dialog.querySelector("#studentPrivateSessionLink").href=`/lich-dao-tao.html?${params.toString()}&action=session`;
  dialog.querySelector("#studentMilestoneLink").href=`/lich-dao-tao.html?${params.toString()}&action=milestone`;
  dialog.showModal();
}

function enhanceStudentRows(){
  const body=document.querySelector(STUDENT_ROW_SELECTOR);
  if(!body)return;
  body.querySelectorAll("tr").forEach(row=>{
    const actions=row.querySelector(".row-actions");
    if(!actions||actions.querySelector(`.${ACTION_BUTTON_CLASS}`))return;
    const studentId=studentIdFromRow(row);
    if(!studentId)return;
    const button=document.createElement("button");
    button.type="button";
    button.className=ACTION_BUTTON_CLASS;
    button.dataset.trainingStudent=studentId;
    button.innerHTML='<span aria-hidden="true">📅</span> Lịch đào tạo';
    button.addEventListener("click",()=>openActionDialog(studentId,studentNameFromRow(row)));
    const editButton=actions.querySelector("[data-edit]");
    actions.insertBefore(button,editButton||null);
  });
}

function watchStudentRows(){
  const body=document.querySelector(STUDENT_ROW_SELECTOR);
  if(!body)return;
  enhanceStudentRows();
  const observer=new MutationObserver(enhanceStudentRows);
  observer.observe(body,{childList:true,subtree:true});
}

function openScheduleActionForStudent(studentId,action){
  const select=document.getElementById(action==="session"?"trainingStudent":"scheduleStudent");
  const button=document.getElementById(action==="session"?"openSessionBtn":"openEditorBtn");
  if(!select||!button||button.classList.contains("hidden"))return false;
  const option=[...select.options].find(item=>String(item.value)===String(studentId));
  if(!option)return false;

  if(action==="session"){
    button.click();
    requestAnimationFrame(()=>{
      select.value=String(studentId);
      select.dispatchEvent(new Event("change",{bubbles:true}));
      const dialog=document.getElementById("sessionDialog");
      dialog?.setAttribute("data-selected-student",String(studentId));
    });
  }else{
    select.value=String(studentId);
    select.dispatchEvent(new Event("change",{bubbles:true}));
    button.click();
  }
  return true;
}

function tryOpenScheduleAction(){
  if(!document.getElementById("scheduleMain"))return;
  const params=new URLSearchParams(location.search);
  const studentId=params.get("student"),action=params.get("action");
  if(!studentId||!["session","milestone"].includes(action))return;
  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(openScheduleActionForStudent(studentId,action)){
      clearInterval(timer);
      history.replaceState({},"",location.pathname+location.hash);
      return;
    }
    if(attempts>=80)clearInterval(timer);
  },100);
}

function boot(){
  watchStudentRows();
  tryOpenScheduleAction();
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
