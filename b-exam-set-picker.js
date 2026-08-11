import "./b-exam-set-picker.css";
import{EXAMS,NUMBERED_EXAM_COUNTS}from"./exam-config.js";

function activeExamKey(){
  return document.querySelector('[data-exam-class].active')?.dataset.examClass||"B";
}

function startSelectedSet(setNumber){
  const examKey=activeExamKey();
  delete globalThis.__THAY_DAT_B_EXAM_SET__;
  if(setNumber==="random")delete globalThis.__THAY_DAT_NUMBERED_EXAM__;
  else globalThis.__THAY_DAT_NUMBERED_EXAM__={key:examKey,number:Number(setNumber)};

  const ready=document.getElementById("examReadyCheck");
  const start=document.getElementById("startExamBtn");
  if(ready)ready.checked=true;
  if(start){
    start.disabled=false;
    start.click();
  }
}

function pickerMarkup(examKey){
  const exam=EXAMS[examKey];
  const totalSets=NUMBERED_EXAM_COUNTS[examKey];
  if(!exam||!totalSets)return"";
  return `
    <div class="b-exam-set-heading">
      <div>
        <small>OTOMOTO - ${exam.label}</small>
        <h3>Chọn đề thi thử</h3>
        <p>${totalSets} đề cố định và 1 đề câu hỏi ngẫu nhiên.</p>
      </div>
      <span>${exam.count} câu · ${exam.minutes} phút</span>
    </div>
    <div class="b-exam-set-grid">
      <button class="b-exam-random" type="button" data-numbered-exam-set="random">
        <span class="b-exam-random-icon">⤨</span>
        <strong>Câu hỏi<br>ngẫu nhiên</strong>
        <small>Tạo đề mới mỗi lần</small>
      </button>
      ${Array.from({length:totalSets},(_,index)=>`<button type="button" data-numbered-exam-set="${index+1}"><strong>Đề ${index+1}</strong><small>${exam.count} câu</small></button>`).join("")}
    </div>
    <p class="b-exam-set-note">Đạt từ ${exam.pass}/${exam.count} câu. Mỗi đề có 01 câu điểm liệt; sai câu điểm liệt thì bài thi không đạt.</p>`;
}

function bindSetButtons(picker){
  picker.querySelectorAll("[data-numbered-exam-set]").forEach(button=>{
    button.addEventListener("click",()=>startSelectedSet(button.dataset.numberedExamSet));
  });
}

function syncMode(){
  const dialog=document.getElementById("examIntroDialog");
  const picker=dialog?.querySelector(".b-exam-set-picker");
  if(!dialog||!picker)return;
  const examKey=activeExamKey();
  const supported=Boolean(NUMBERED_EXAM_COUNTS[examKey]);
  dialog.classList.toggle("b-exam-set-mode",supported);
  delete globalThis.__THAY_DAT_NUMBERED_EXAM__;
  delete globalThis.__THAY_DAT_B_EXAM_SET__;
  picker.innerHTML=supported?pickerMarkup(examKey):"";
  if(supported)bindSetButtons(picker);
}

function mountPicker(){
  if(location.pathname!=="/600-cau-hoi.html")return;
  const dialog=document.getElementById("examIntroDialog");
  const classPicker=dialog?.querySelector(".exam-class-picker");
  if(!dialog||!classPicker)return;

  if(!dialog.querySelector(".b-exam-set-picker")){
    classPicker.insertAdjacentHTML("afterend",'<section class="b-exam-set-picker" aria-label="Chọn đề thi thử"></section>');
  }

  dialog.querySelectorAll("[data-exam-class]").forEach(button=>{
    if(button.dataset.numberedPickerBound)return;
    button.dataset.numberedPickerBound="1";
    button.addEventListener("click",()=>setTimeout(syncMode,0));
  });
  syncMode();
}

function init(){
  mountPicker();
  const dialog=document.getElementById("examIntroDialog");
  if(dialog){
    const observer=new MutationObserver(records=>{
      if(records.some(record=>record.target.matches?.("[data-exam-class]")))syncMode();
    });
    observer.observe(dialog,{subtree:true,attributes:true,attributeFilter:["class","aria-pressed"]});
  }
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
window.addEventListener("pageshow",mountPicker);
