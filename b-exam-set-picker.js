import "./b-exam-set-picker.css";

const TOTAL_B_SETS=32;

function startSelectedSet(setNumber){
  if(setNumber==="random")delete globalThis.__THAY_DAT_B_EXAM_SET__;
  else globalThis.__THAY_DAT_B_EXAM_SET__=Number(setNumber);

  const ready=document.getElementById("examReadyCheck");
  const start=document.getElementById("startExamBtn");
  if(ready)ready.checked=true;
  if(start){
    start.disabled=false;
    start.click();
  }
}

function pickerMarkup(){
  return `
    <section class="b-exam-set-picker" aria-labelledby="bExamSetTitle">
      <div class="b-exam-set-heading">
        <div>
          <small>OTOMOTO · HẠNG B</small>
          <h3 id="bExamSetTitle">Chọn đề thi thử</h3>
          <p>32 đề cố định được phân bổ đều từ bộ 600 câu và 1 đề ngẫu nhiên.</p>
        </div>
        <span>30 câu · 20 phút</span>
      </div>
      <div class="b-exam-set-grid">
        <button class="b-exam-random" type="button" data-b-exam-set="random">
          <span class="b-exam-random-icon">⤨</span>
          <strong>Câu hỏi<br>ngẫu nhiên</strong>
          <small>Tạo đề mới mỗi lần</small>
        </button>
        ${Array.from({length:TOTAL_B_SETS},(_,index)=>`<button type="button" data-b-exam-set="${index+1}"><strong>Đề ${index+1}</strong><small>30 câu</small></button>`).join("")}
      </div>
      <p class="b-exam-set-note">Mỗi đề có 01 câu điểm liệt. Sai câu điểm liệt thì bài thi không đạt dù đủ điểm.</p>
    </section>`;
}

function syncMode(){
  const dialog=document.getElementById("examIntroDialog");
  if(!dialog)return;
  const selected=document.querySelector('[data-exam-class].active')?.dataset.examClass;
  const isB=selected==="B";
  dialog.classList.toggle("b-exam-set-mode",isB);
  if(!isB)delete globalThis.__THAY_DAT_B_EXAM_SET__;
}

function mountPicker(){
  if(location.pathname!=="/600-cau-hoi.html")return;
  const dialog=document.getElementById("examIntroDialog");
  const classPicker=dialog?.querySelector(".exam-class-picker");
  if(!dialog||!classPicker)return;

  if(!dialog.querySelector(".b-exam-set-picker")){
    classPicker.insertAdjacentHTML("afterend",pickerMarkup());
    dialog.querySelectorAll("[data-b-exam-set]").forEach(button=>{
      button.addEventListener("click",()=>startSelectedSet(button.dataset.bExamSet));
    });
  }

  dialog.querySelectorAll("[data-exam-class]").forEach(button=>{
    if(button.dataset.bPickerBound)return;
    button.dataset.bPickerBound="1";
    button.addEventListener("click",()=>setTimeout(syncMode,0));
  });
  syncMode();
}

function init(){
  mountPicker();
  const dialog=document.getElementById("examIntroDialog");
  if(dialog){
    const observer=new MutationObserver(syncMode);
    observer.observe(dialog,{subtree:true,attributes:true,attributeFilter:["class","aria-pressed"]});
  }
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
window.addEventListener("pageshow",mountPicker);
