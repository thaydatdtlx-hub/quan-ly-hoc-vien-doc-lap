import{EXAMS,buildExamPool}from"./exam-config.js";

const $=id=>document.getElementById(id);
const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const DEFAULT_STORAGE_KEY="thay_dat_600_progress_v1";
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
const authKind=localStorage.getItem("hv_auth_kind")||sessionStorage.getItem("hv_auth_kind")||"";
const TOPICS=[
  {id:1,icon:"§",short:"Quy tắc giao thông",name:"Quy định chung và quy tắc giao thông đường bộ",count:180,color:"#1673ce",soft:"#e3f1ff"},
  {id:2,icon:"♡",short:"Văn hóa giao thông",name:"Văn hóa, đạo đức, PCCC và cứu nạn",count:25,color:"#9a5ac8",soft:"#f0e7fa"},
  {id:3,icon:"⌁",short:"Kỹ thuật lái xe",name:"Kỹ thuật lái xe an toàn",count:58,color:"#07876f",soft:"#def7ee"},
  {id:4,icon:"⚙",short:"Cấu tạo và sửa chữa",name:"Cấu tạo và sửa chữa thông thường",count:37,color:"#b46e0c",soft:"#fff0d2"},
  {id:5,icon:"△",short:"Báo hiệu đường bộ",name:"Hệ thống báo hiệu đường bộ",count:185,color:"#d14b36",soft:"#ffe5df"},
  {id:6,icon:"⌖",short:"Sa hình và tình huống",name:"Giải thế sa hình và xử lý tình huống",count:115,color:"#1767b7",soft:"#e2effc"}
];
let questions=[],pool=[],currentIndex=0,currentMode="learn",activeTopic="all",examAnswers=new Map(),examStartedAt=0,examTimer=null,examPool=[],examResult=null;
let activeExamKey="B",storageKey=DEFAULT_STORAGE_KEY,remoteStudent=null,remoteSyncEnabled=false,remoteSyncTimer=null,remoteSyncing=false;
let progress=readProgress(storageKey);

function readProgress(key=storageKey){
  try{
    const saved=JSON.parse(localStorage.getItem(key)||"{}");
    return{answers:saved.answers||{},bookmarks:Array.isArray(saved.bookmarks)?saved.bookmarks:[],lastId:Number(saved.lastId)||1,exams:Array.isArray(saved.exams)?saved.exams:[]};
  }catch{return{answers:{},bookmarks:[],lastId:1,exams:[]}}
}
async function rpc(fn,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||data?.error||"Không thể kết nối máy chủ");
  return data;
}
function setSyncStatus(state,message){
  const badge=$("theoryAccountStatus");if(!badge)return;
  badge.className=`theory-sync-status ${state}`;
  badge.textContent=message;
}
function localProgressSummary(){
  const answered=questions.filter(question=>Number(progress.answers[question.id])>0);
  return{answered:answered.length,correct:answered.filter(question=>Number(progress.answers[question.id])===question.answer).length};
}
function remoteProgressPayload(){
  const summary=localProgressSummary();
  return{answers:progress.answers,bookmarks:progress.bookmarks,lastId:progress.lastId,correct_count:summary.correct};
}
function scheduleRemoteSync(){
  if(!remoteSyncEnabled||!questions.length)return;
  clearTimeout(remoteSyncTimer);
  setSyncStatus("syncing","Đang đồng bộ…");
  remoteSyncTimer=setTimeout(()=>flushRemoteProgress(),900);
}
async function flushRemoteProgress(keepalive=false){
  if(!remoteSyncEnabled||remoteSyncing||!questions.length)return;
  remoteSyncing=true;
  try{
    const body=JSON.stringify({p_token:token,p_progress:remoteProgressPayload()});
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/app_student_save_theory_progress`,{
      method:"POST",
      headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
      body,
      keepalive
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.details||"Không thể đồng bộ tiến độ");
    setSyncStatus("synced",`Đã đồng bộ · ${remoteStudent?.student_name||"Học viên"}`);
  }catch(error){
    setSyncStatus("error","Chưa đồng bộ · vẫn lưu trên máy");
    if(!keepalive)toast(error?.message||"Không thể đồng bộ tiến độ.");
  }finally{remoteSyncing=false}
}
function saveProgress(){
  localStorage.setItem(storageKey,JSON.stringify(progress));
  scheduleRemoteSync();
}
function mergeProgress(remote,local){
  const saved=remote?.progress_data||{};
  const remoteAnswers=saved.answers&&typeof saved.answers==="object"?saved.answers:{};
  const remoteBookmarks=Array.isArray(saved.bookmarks)?saved.bookmarks:[];
  return{
    answers:{...remoteAnswers,...local.answers},
    bookmarks:[...new Set([...remoteBookmarks,...local.bookmarks].map(Number).filter(id=>id>=1&&id<=600))],
    lastId:Number(local.lastId||saved.lastId||remote?.last_question_id)||1,
    exams:local.exams
  };
}
function examKeyForLicense(value){
  const text=normalize(value);
  if(text.startsWith("a1"))return"A1";
  if(text==="a"||text.startsWith("a "))return"A";
  if(text.startsWith("c1"))return"C1";
  return"B";
}
async function initStudentSync(){
  if(!token||authKind!=="student"){
    setSyncStatus("local","Lưu trên thiết bị");
    return;
  }
  try{
    const me=await rpc("app_student_me",{p_token:token});
    const studentId=String(me.student_id||"");
    if(!studentId)throw new Error("Tài khoản chưa liên kết hồ sơ học viên.");
    storageKey=`thay_dat_600_progress_v2_${studentId}`;
    let accountLocal=readProgress(storageKey);
    const hasAccountLocal=Boolean(localStorage.getItem(storageKey));
    const legacyClaim=localStorage.getItem("thay_dat_600_progress_v1_claimed_by");
    if(!hasAccountLocal&&!legacyClaim&&localStorage.getItem(DEFAULT_STORAGE_KEY)){
      accountLocal=readProgress(DEFAULT_STORAGE_KEY);
      localStorage.setItem("thay_dat_600_progress_v1_claimed_by",studentId);
    }
    progress=accountLocal;
    $("studentPortalLink").classList.remove("hidden");
    $("studentPortalLink").textContent="Tài khoản học viên";
    remoteStudent=await rpc("app_student_get_theory_progress",{p_token:token});
    progress=mergeProgress(remoteStudent,accountLocal);
    activeExamKey=examKeyForLicense(remoteStudent.license_class);
    remoteSyncEnabled=true;
    $("studentPortalLink").textContent=`${remoteStudent.student_name||"Học viên"} · Tài khoản`;
    localStorage.setItem(storageKey,JSON.stringify(progress));
    await questionsReady;
    renderHome();
    scheduleRemoteSync();
  }catch(error){
    setSyncStatus("error","Chưa đồng bộ · vẫn lưu trên máy");
    if(questions.length)renderHome();
    if(!/app_student_get_theory_progress|schema cache|PGRST202/i.test(error?.message||""))toast(error?.message||"Không thể mở tiến độ tài khoản.");
  }
}
function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]))}
function normalize(value){return String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")}
function shuffle(items){
  const result=[...items];
  for(let index=result.length-1;index>0;index--){const swap=Math.floor(Math.random()*(index+1));[result[index],result[swap]]=[result[swap],result[index]]}
  return result;
}
function toast(message){$("questionToast").textContent=message;$("questionToast").classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>$("questionToast").classList.remove("show"),2600)}
function closeDialog(dialog){if(dialog?.open)dialog.close()}
function topic(id){return TOPICS.find(item=>item.id===Number(id))||TOPICS[0]}
function bookmarked(id){return progress.bookmarks.includes(Number(id))}
function learnedAnswer(id){return Number(progress.answers[id])||0}
function answerIsCorrect(question){return learnedAnswer(question.id)===question.answer}
function answerIsWrong(question){return learnedAnswer(question.id)>0&&!answerIsCorrect(question)}
function displayedCritical(question){
  return currentMode==="exam"||currentMode==="exam-review"?Boolean(question.examCritical):Boolean(question.critical);
}

async function loadQuestions(){
  const response=await fetch("/data/600-cau-hoi-2025.json");
  if(!response.ok)throw new Error("Không thể tải bộ 600 câu hỏi.");
  const data=await response.json();
  if(!Array.isArray(data)||data.length!==600)throw new Error("Dữ liệu câu hỏi chưa đầy đủ.");
  questions=data;
  renderHome();
  populateFilters();
}
const questionsReady=loadQuestions().catch(error=>{
  $("topicCards").innerHTML=`<div class="empty-questions"><strong>${esc(error.message)}</strong><p>Vui lòng tải lại trang.</p></div>`;
  toast(error.message);
  throw error;
});

function renderHome(){
  const answered=questions.filter(question=>learnedAnswer(question.id));
  const correct=answered.filter(answerIsCorrect).length;
  const wrong=answered.length-correct;
  const percent=Math.round(answered.length/questions.length*100)||0;
  $("learnedCount").textContent=answered.length;
  $("correctCount").textContent=correct;
  $("wrongCount").textContent=wrong;
  $("bookmarkCount").textContent=progress.bookmarks.length;
  $("progressPercent").textContent=`${percent}%`;
  $("progressRing").style.background=`conic-gradient(#0a83de ${percent*3.6}deg,#e8f1f7 0deg)`;
  $("topicCards").innerHTML=TOPICS.map(item=>{
    const done=questions.filter(question=>question.topicId===item.id&&learnedAnswer(question.id)).length;
    const rate=Math.round(done/item.count*100)||0;
    return `<button class="topic-card" type="button" data-topic="${item.id}" style="--topic-color:${item.color};--topic-soft:${item.soft}">
      <span>${item.icon}</span><div><small>CHƯƠNG ${item.id} · ${item.count} CÂU</small><strong>${esc(item.name)}</strong></div><b>→</b>
      <em><i style="width:${rate}%"></i></em>
    </button>`;
  }).join("");
  document.querySelectorAll("[data-topic]").forEach(button=>button.onclick=()=>startLearning("learn",Number(button.dataset.topic)));
}
function populateFilters(){
  $("topicFilter").innerHTML=`<option value="all">Tất cả 6 chương</option>${TOPICS.map(item=>`<option value="${item.id}">Chương ${item.id} · ${esc(item.short)}</option>`).join("")}`;
}

async function startFromButton(mode){
  await questionsReady;
  if(mode==="exam")return openExamIntro();
  if(mode==="continue"){
    const lastQuestion=questions.find(question=>question.id===progress.lastId);
    return startLearning("learn",lastQuestion?.topicId||"all",progress.lastId);
  }
  startLearning(mode);
}
function startLearning(mode="learn",topicId="all",preferredId=null){
  clearInterval(examTimer);
  currentMode=mode;
  activeTopic=topicId;
  $("topicFilter").value=String(topicId);
  $("statusFilter").value=mode==="critical"?"critical":mode==="wrong"?"wrong":mode==="bookmarked"?"bookmarked":"all";
  $("questionSearch").value="";
  const titles={
    learn:["ÔN TẬP CÓ HƯỚNG DẪN",topicId==="all"?"Bộ 600 câu hỏi":`Chương ${topicId} · ${topic(topicId).short}`],
    critical:["CÂU HỎI ĐIỂM LIỆT","60 tình huống nghiêm trọng"],
    wrong:["ÔN TẬP CÁ NHÂN","Những câu cần học lại"],
    bookmarked:["DANH SÁCH ĐÃ LƯU","Câu hỏi đã đánh dấu"]
  };
  [$("workspaceKicker").textContent,$("workspaceTitle").textContent]=titles[mode]||titles.learn;
  $("studySidebar").classList.remove("hidden");
  $("examTimer").classList.add("hidden");
  $("finishExamBtn").classList.add("hidden");
  applyFilters(preferredId);
  showWorkspace();
}
function showWorkspace(){
  $("studyHome").classList.add("hidden");
  $("studyWorkspace").classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
}
function returnHome(){
  if(currentMode==="exam"&&examStartedAt&&!examResult&&!confirm("Bạn muốn thoát và hủy bài thi đang làm?"))return;
  clearInterval(examTimer);
  examStartedAt=0;
  $("studyWorkspace").classList.add("hidden");
  $("studyHome").classList.remove("hidden");
  $("studySidebar").classList.remove("open");
  renderHome();
  window.scrollTo({top:0,behavior:"smooth"});
}
function baseQuestions(){
  if(currentMode==="critical")return questions.filter(question=>question.critical);
  if(currentMode==="wrong")return questions.filter(answerIsWrong);
  if(currentMode==="bookmarked")return questions.filter(question=>bookmarked(question.id));
  return questions;
}
function applyFilters(preferredId=null){
  const query=normalize($("questionSearch").value);
  const topicValue=$("topicFilter").value;
  const status=$("statusFilter").value;
  const oldId=preferredId||pool[currentIndex]?.id;
  pool=baseQuestions().filter(question=>{
    if(topicValue!=="all"&&question.topicId!==Number(topicValue))return false;
    if(query&&!normalize(`${question.id} ${question.question} ${question.options.map(option=>option.text).join(" ")}`).includes(query))return false;
    if(status==="unanswered"&&learnedAnswer(question.id))return false;
    if(status==="correct"&&!answerIsCorrect(question))return false;
    if(status==="wrong"&&!answerIsWrong(question))return false;
    if(status==="bookmarked"&&!bookmarked(question.id))return false;
    if(status==="critical"&&!question.critical)return false;
    return true;
  });
  currentIndex=Math.max(0,pool.findIndex(question=>question.id===Number(oldId)));
  if(currentIndex<0)currentIndex=0;
  renderQuestion();
  $("studySidebar").classList.remove("open");
}

function currentQuestion(){return pool[currentIndex]}
function renderQuestion(){
  const question=currentQuestion();
  const empty=!question;
  $("questionCard").classList.toggle("hidden",empty);
  $("emptyQuestions").classList.toggle("hidden",!empty);
  $("questionProgressBar").style.width=empty?"0%":`${(currentIndex+1)/pool.length*100}%`;
  $("prevQuestionBtn").disabled=empty||currentIndex===0;
  $("nextQuestionBtn").disabled=empty||currentIndex>=pool.length-1;
  $("bookmarkBtn").disabled=empty;
  if(empty){renderPalette();return}

  const itemTopic=topic(question.topicId);
  const selected=currentMode==="exam"||currentMode==="exam-review"?examAnswers.get(question.id):learnedAnswer(question.id);
  const reveal=currentMode!=="exam"&&Boolean(selected);
  $("topicBadge").textContent=`Chương ${question.topicId} · ${itemTopic.short}`;
  $("criticalBadge").classList.toggle("hidden",!displayedCritical(question));
  $("questionNumber").textContent=`CÂU ${question.id} · ${currentIndex+1} / ${pool.length}`;
  $("questionText").textContent=question.question;
  $("bookmarkBtn").classList.toggle("active",bookmarked(question.id));
  $("bookmarkBtn").setAttribute("aria-pressed",bookmarked(question.id)?"true":"false");
  $("bookmarkBtn").innerHTML=`${bookmarked(question.id)?"★":"☆"} <span>${bookmarked(question.id)?"Đã đánh dấu":"Đánh dấu"}</span>`;
  $("questionFigure").classList.toggle("hidden",!question.image);
  if(question.image&&question.imageAtlas){
    const atlas=question.imageAtlas;
    const image=$("questionImage");
    image.style.width=`min(100%, ${atlas.w}px)`;
    image.style.aspectRatio=`${atlas.w}/${atlas.h}`;
    image.style.backgroundImage=`url("/questions/${atlas.file}")`;
    image.style.backgroundSize=`${atlas.atlasW/atlas.w*100}% ${atlas.atlasH/atlas.h*100}%`;
    image.style.backgroundPosition=`${atlas.x/(atlas.atlasW-atlas.w)*100}% ${atlas.y/(atlas.atlasH-atlas.h)*100}%`;
    image.setAttribute("aria-label",`Hình minh họa câu ${question.id}`);
  }
  $("answerOptions").innerHTML=question.options.map(option=>{
    const isSelected=Number(selected)===option.n;
    const isCorrect=reveal&&option.n===question.answer;
    const isIncorrect=reveal&&isSelected&&option.n!==question.answer;
    return `<button class="answer-option ${isSelected?"selected":""} ${isCorrect?"correct":""} ${isIncorrect?"incorrect":""}" type="button" data-answer="${option.n}" ${reveal?"disabled":""}>
      <span>${option.n}</span><strong>${esc(option.text)}</strong><i>${isCorrect?"✓":isIncorrect?"×":""}</i>
    </button>`;
  }).join("");
  document.querySelectorAll("[data-answer]").forEach(button=>button.onclick=()=>chooseAnswer(Number(button.dataset.answer)));
  renderFeedback(question,selected,reveal);
  progress.lastId=question.id;
  saveProgress();
  renderPalette();
}
function renderFeedback(question,selected,reveal){
  if(!reveal){$("answerFeedback").classList.add("hidden");return}
  const correct=Number(selected)===question.answer;
  const answerText=question.options.find(option=>option.n===question.answer)?.text||"";
  $("answerFeedback").className=`answer-feedback ${correct?"":"wrong"}`;
  $("answerFeedback").innerHTML=`<span>${correct?"✓":"!"}</span><div><strong>${correct?"Chính xác!":"Chưa chính xác"}</strong><p>Đáp án đúng: <b>${question.answer}. ${esc(answerText)}</b>${displayedCritical(question)?" Đây là câu điểm liệt, hãy ghi nhớ kỹ.":""}</p></div>`;
}
function chooseAnswer(answer){
  const question=currentQuestion();if(!question)return;
  if(currentMode==="exam"){
    examAnswers.set(question.id,answer);
    renderQuestion();
    if(currentIndex<pool.length-1)setTimeout(()=>goToQuestion(currentIndex+1),130);
    return;
  }
  if(currentMode==="exam-review")return;
  progress.answers[question.id]=answer;
  saveProgress();
  renderQuestion();
}
function goToQuestion(index){
  if(!pool.length)return;
  currentIndex=Math.max(0,Math.min(pool.length-1,index));
  renderQuestion();
  window.scrollTo({top:Math.max(0,$("studyWorkspace").offsetTop-80),behavior:"smooth"});
}
function toggleBookmark(){
  const question=currentQuestion();if(!question)return;
  if(bookmarked(question.id))progress.bookmarks=progress.bookmarks.filter(id=>id!==question.id);
  else progress.bookmarks.push(question.id);
  saveProgress();
  renderQuestion();
  toast(bookmarked(question.id)?"Đã đánh dấu câu hỏi":"Đã bỏ đánh dấu");
}
function renderPalette(){
  $("questionPalette").innerHTML=pool.map((question,index)=>{
    const selected=currentMode==="exam"||currentMode==="exam-review"?examAnswers.has(question.id):Boolean(learnedAnswer(question.id));
    const incorrect=currentMode==="exam-review"&&examAnswers.get(question.id)!==question.answer;
    return `<button type="button" data-palette-index="${index}" class="${selected?"answered":""} ${index===currentIndex?"current":""} ${bookmarked(question.id)?"flagged":""} ${incorrect?"incorrect":""}">${question.id}</button>`;
  }).join("");
  document.querySelectorAll("[data-palette-index]").forEach(button=>button.onclick=()=>{goToQuestion(Number(button.dataset.paletteIndex));closeDialog($("paletteDialog"))});
}

function openExamIntro(){
  renderExamIntro();
  $("examReadyCheck").checked=false;
  $("startExamBtn").disabled=true;
  $("examIntroDialog").showModal();
}
function renderExamIntro(){
  const exam=EXAMS[activeExamKey];
  $("examDialogTitle").textContent=`Giấy phép lái xe hạng ${exam.label}`;
  $("examDialogVehicle").textContent=exam.vehicle;
  $("examQuestionCount").textContent=exam.count;
  $("examMinutes").textContent=`${exam.minutes}'`;
  $("examPassScore").textContent=exam.pass;
  $("examDescription").textContent=`Đề được chọn ngẫu nhiên từ ${exam.questionIds?"nhóm 250 câu dành cho mô tô":"bộ 600 câu chính thức"}. Bài thi không đạt nếu trả lời sai câu điểm liệt, kể cả khi đủ điểm.`;
  document.querySelectorAll("[data-exam-class]").forEach(button=>{
    const selected=button.dataset.examClass===activeExamKey;
    button.classList.toggle("active",selected);
    button.setAttribute("aria-pressed",selected?"true":"false");
  });
}
function beginExam(){
  closeDialog($("examIntroDialog"));
  const exam=EXAMS[activeExamKey];
  examPool=buildExamPool(questions,activeExamKey,shuffle);
  pool=examPool;
  examAnswers=new Map();
  examResult=null;
  examStartedAt=Date.now();
  currentMode="exam";
  currentIndex=0;
  $("workspaceKicker").textContent=`THI THỬ HẠNG ${exam.label}`;
  $("workspaceTitle").textContent=`${exam.count} câu · đạt từ ${exam.pass} điểm`;
  $("studySidebar").classList.add("hidden");
  $("examTimer").classList.remove("hidden");
  $("finishExamBtn").classList.remove("hidden");
  showWorkspace();
  updateExamTimer();
  clearInterval(examTimer);
  examTimer=setInterval(updateExamTimer,1000);
  renderQuestion();
}
function updateExamTimer(){
  const exam=EXAMS[activeExamKey];
  const elapsed=Math.floor((Date.now()-examStartedAt)/1000);
  const remaining=Math.max(0,exam.minutes*60-elapsed);
  const minutes=Math.floor(remaining/60),seconds=remaining%60;
  $("examTimer").textContent=`${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  $("examTimer").classList.toggle("warning",remaining<=60);
  if(remaining===0)finishExam(true);
}
async function saveRemoteExamAttempt(result){
  if(!remoteSyncEnabled)return;
  try{
    await rpc("app_student_save_exam_attempt",{
      p_token:token,
      p_license_class:result.examKey,
      p_score:result.correct,
      p_total:EXAMS[result.examKey].count,
      p_critical_correct:result.criticalCorrect,
      p_elapsed_seconds:result.elapsed
    });
    setSyncStatus("synced",`Đã lưu bài thi · ${remoteStudent?.student_name||"Học viên"}`);
  }catch(error){
    setSyncStatus("error","Bài thi chưa đồng bộ");
    toast(error?.message||"Không thể lưu kết quả thi vào tài khoản.");
  }
}
function finishExam(auto=false){
  if(currentMode!=="exam"||examResult)return;
  const unanswered=pool.length-examAnswers.size;
  if(!auto&&!confirm(unanswered?`Bạn còn ${unanswered} câu chưa trả lời. Vẫn nộp bài?`:"Bạn muốn nộp bài và xem kết quả?"))return;
  clearInterval(examTimer);
  const exam=EXAMS[activeExamKey];
  const correct=pool.filter(question=>examAnswers.get(question.id)===question.answer).length;
  const criticalQuestion=pool.find(question=>question.examCritical);
  const criticalCorrect=examAnswers.get(criticalQuestion.id)===criticalQuestion.answer;
  const elapsed=Math.min(exam.minutes*60,Math.floor((Date.now()-examStartedAt)/1000));
  const passed=correct>=exam.pass&&criticalCorrect;
  examResult={correct,wrong:pool.length-correct,criticalCorrect,elapsed,passed,examKey:activeExamKey};
  progress.exams.unshift({date:new Date().toISOString(),licenseClass:activeExamKey,score:correct,total:exam.count,passed,criticalCorrect,elapsed});
  progress.exams=progress.exams.slice(0,20);
  saveProgress();
  void saveRemoteExamAttempt(examResult);
  showExamResult();
}
function showExamResult(){
  const result=examResult,exam=EXAMS[result.examKey],rate=Math.round(result.correct/exam.count*100);
  $("resultKicker").textContent=`KẾT QUẢ THI THỬ HẠNG ${exam.label}`;
  $("resultIcon").textContent=result.passed?"✓":"×";
  $("resultIcon").classList.toggle("fail",!result.passed);
  $("resultTitle").textContent=result.passed?"Bạn đã đạt!":"Bạn chưa đạt";
  $("resultSummary").textContent=!result.criticalCorrect?"Bạn đã trả lời sai câu điểm liệt. Hãy xem lại bài trước khi thi đề tiếp theo.":result.passed?"Kết quả rất tốt. Hãy duy trì luyện tập để giữ phong độ.":`Bạn cần đúng ít nhất ${exam.pass}/${exam.count} câu để đạt.`;
  $("resultScore").textContent=`${result.correct}/${exam.count}`;
  $("resultRate").textContent=`${rate}% chính xác`;
  $("resultCorrect").textContent=result.correct;
  $("resultWrong").textContent=result.wrong;
  $("resultTime").textContent=`${Math.floor(result.elapsed/60)}:${String(result.elapsed%60).padStart(2,"0")}`;
  $("examResultDialog").showModal();
}
function reviewExam(){
  closeDialog($("examResultDialog"));
  currentMode="exam-review";
  currentIndex=0;
  const exam=EXAMS[examResult.examKey];
  $("workspaceKicker").textContent=`XEM LẠI BÀI THI HẠNG ${exam.label}`;
  $("workspaceTitle").textContent=`Kết quả ${examResult.correct}/${exam.count}`;
  $("examTimer").classList.add("hidden");
  $("finishExamBtn").classList.add("hidden");
  renderQuestion();
}

document.querySelectorAll("[data-start-mode]").forEach(button=>button.onclick=()=>startFromButton(button.dataset.startMode));
document.querySelectorAll(".dialog-close").forEach(button=>button.onclick=()=>closeDialog(button.closest("dialog")));
$("backHomeBtn").onclick=returnHome;
$("prevQuestionBtn").onclick=()=>goToQuestion(currentIndex-1);
$("nextQuestionBtn").onclick=()=>goToQuestion(currentIndex+1);
$("bookmarkBtn").onclick=toggleBookmark;
$("applyFilterBtn").onclick=()=>applyFilters();
$("questionSearch").onkeydown=event=>{if(event.key==="Enter"){event.preventDefault();applyFilters()}};
$("openPaletteBtn").onclick=()=>{$("paletteDialog").showModal();renderPalette()};
$("mobileFilterBtn").onclick=()=>$("studySidebar").classList.add("open");
$("closeSidebarBtn").onclick=()=>$("studySidebar").classList.remove("open");
$("examReadyCheck").onchange=event=>$("startExamBtn").disabled=!event.target.checked;
document.querySelectorAll("[data-exam-class]").forEach(button=>button.onclick=()=>{
  activeExamKey=button.dataset.examClass;
  renderExamIntro();
  $("examReadyCheck").checked=false;
  $("startExamBtn").disabled=true;
});
$("startExamBtn").onclick=beginExam;
$("finishExamBtn").onclick=()=>finishExam(false);
$("reviewExamBtn").onclick=reviewExam;
$("retryExamBtn").onclick=()=>{closeDialog($("examResultDialog"));openExamIntro()};
$("resetProgressBtn").onclick=()=>{
  const message=remoteSyncEnabled
    ?"Làm mới tiến độ học và câu đã đánh dấu của tài khoản này? Lịch sử thi đã gửi cho Admin vẫn được giữ lại."
    :"Xóa toàn bộ tiến độ học, câu đã đánh dấu và lịch sử thi thử trên thiết bị này?";
  if(!confirm(message))return;
  progress={answers:{},bookmarks:[],lastId:1,exams:[]};saveProgress();renderHome();toast("Đã làm mới tiến độ học");
};
document.addEventListener("keydown",event=>{
  if(["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName)||document.querySelector("dialog[open]"))return;
  if($("studyWorkspace").classList.contains("hidden"))return;
  if(event.key==="ArrowLeft")goToQuestion(currentIndex-1);
  if(event.key==="ArrowRight")goToQuestion(currentIndex+1);
  if(/^[1-4]$/.test(event.key)){
    const option=currentQuestion()?.options.find(item=>item.n===Number(event.key));
    if(option)chooseAnswer(option.n);
  }
});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")void flushRemoteProgress(true)});
initStudentSync();
