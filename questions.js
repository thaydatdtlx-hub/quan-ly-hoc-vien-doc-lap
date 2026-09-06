import{EXAMS,MOTORCYCLE_QUESTION_IDS,MOTORCYCLE_CRITICAL_IDS,buildExamPool}from"./exam-config.js";
import"./ai-chat.js";

const $=id=>document.getElementById(id);
const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const DEFAULT_STORAGE_KEY="thay_dat_600_progress_v1";
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
const authKind=localStorage.getItem("hv_auth_kind")||sessionStorage.getItem("hv_auth_kind")||"";
const MOTORCYCLE_QUESTION_SET=new Set(MOTORCYCLE_QUESTION_IDS);
const MOTORCYCLE_CRITICAL_SET=new Set(MOTORCYCLE_CRITICAL_IDS);
const TOPICS=[
  {id:1,icon:"§",short:"Quy tắc giao thông",name:"Quy định chung và quy tắc giao thông đường bộ",count:180,color:"#1673ce",soft:"#e3f1ff"},
  {id:2,icon:"♡",short:"Văn hóa giao thông",name:"Văn hóa, đạo đức, PCCC và cứu nạn",count:25,color:"#9a5ac8",soft:"#f0e7fa"},
  {id:3,icon:"⌁",short:"Kỹ thuật lái xe",name:"Kỹ thuật lái xe an toàn",count:58,color:"#07876f",soft:"#def7ee"},
  {id:4,icon:"⚙",short:"Cấu tạo và sửa chữa",name:"Cấu tạo và sửa chữa thông thường",count:37,color:"#b46e0c",soft:"#fff0d2"},
  {id:5,icon:"△",short:"Báo hiệu đường bộ",name:"Hệ thống báo hiệu đường bộ",count:185,color:"#d14b36",soft:"#ffe5df"},
  {id:6,icon:"⌖",short:"Sa hình và tình huống",name:"Giải thế sa hình và xử lý tình huống",count:115,color:"#1767b7",soft:"#e2effc"}
];
let questions=[],pool=[],currentIndex=0,currentMode="learn",activeTopic="all",examAnswers=new Map(),examStartedAt=0,examTimer=null,examPool=[],examResult=null;
let activeExamKey=authKind==="student"?null:"B",storageKey=DEFAULT_STORAGE_KEY,remoteStudent=null,remoteSyncEnabled=false,remoteSyncTimer=null,remoteSyncing=false;
let progress=readProgress(storageKey);

function readProgress(key=storageKey){
  try{
    const saved=JSON.parse(localStorage.getItem(key)||"{}");
    return{answers:saved.answers||{},bookmarks:Array.isArray(saved.bookmarks)?saved.bookmarks:[],lastId:Number(saved.lastId)||1,exams:Array.isArray(saved.exams)?saved.exams:[]};
  }catch{return{answers:{},bookmarks:[],lastId:1,exams:[]}}
}
async function fetchJson(url,options={},timeoutMs=12000){
  const controller=new AbortController();
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{
    reject(new Error("Kết nối quá thời gian. Vui lòng bấm lại để thử lại."));
    controller.abort();
  },timeoutMs)});
  try{
    return await Promise.race([timeout,(async()=>{
      const response=await fetch(url,{...options,signal:controller.signal});
      const data=await response.json();
      if(!response.ok)throw new Error(data?.message||data?.details||data?.error||"Không thể kết nối máy chủ");
      return data;
    })()]);
  }finally{clearTimeout(timer)}
}
async function rpc(fn,body={}){
  return fetchJson(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
}
function setSyncStatus(state,message){
  const badge=$("theoryAccountStatus");if(!badge)return;
  badge.className=`theory-sync-status ${state}`;
  badge.textContent=message;
}
function normalize(value){return String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")}
function examKeyForLicense(value){
  const text=normalize(value).replace(/hang|gplx|giay phep lai xe/g,"").trim();
  if(/^a1(?:\b|$)/.test(text))return"A1";
  if(/^a(?:\b|$)/.test(text))return"A";
  if(/^c1(?:\b|$)/.test(text))return"C1";
  if(/^b(?:\b|$)/.test(text))return"B";
  return null;
}
function isMotorcycleClass(){return activeExamKey==="A1"||activeExamKey==="A"}
function practiceCritical(question){return isMotorcycleClass()?MOTORCYCLE_CRITICAL_SET.has(question.id):Boolean(question.critical)}
function scopedQuestions(){
  if(authKind==="student"&&!activeExamKey)return[];
  if(isMotorcycleClass())return questions.filter(question=>MOTORCYCLE_QUESTION_SET.has(question.id));
  return questions;
}
function scopedQuestionCount(){return isMotorcycleClass()?250:600}
function syncTheoryCopy(){
  const total=scopedQuestionCount();
  const critical=scopedQuestions().filter(practiceCritical).length;
  const heroCount=document.querySelector(".study-hero h1 b");if(heroCount)heroCount.textContent=String(total);
  const trust=document.querySelectorAll(".hero-trust span");
  if(trust[0])trust[0].textContent=`✓ ${total} câu đầy đủ`;
  if(trust[1])trust[1].textContent=`✓ ${critical} câu điểm liệt`;
  const criticalCard=document.querySelector('[data-start-mode="critical"] strong');if(criticalCard)criticalCard.textContent=`${critical} câu điểm liệt`;
  const topicSummary=document.querySelector(".topic-section .section-title>span");if(topicSummary)topicSummary.textContent=`${total} câu · áp dụng từ 01/06/2025`;
  if(authKind==="student"&&activeExamKey)document.title=`${total} câu hỏi sát hạch hạng ${activeExamKey} · Thầy Đạt`;
}
function localProgressSummary(){
  const answered=scopedQuestions().filter(question=>Number(progress.answers[question.id])>0);
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
    const syncFunction=authKind==="public_theory"?"app_public_theory_save_progress":"app_student_save_theory_progress";
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${syncFunction}`,{
      method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body,keepalive
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.details||"Không thể đồng bộ tiến độ");
    setSyncStatus("synced",`Đã đồng bộ · ${remoteStudent?.student_name||remoteStudent?.account_name||"Người học"}`);
  }catch(error){
    setSyncStatus("error","Chưa đồng bộ · vẫn lưu trên máy");
    if(!keepalive)toast(error?.message||"Không thể đồng bộ tiến độ.");
  }finally{remoteSyncing=false}
}
function persistProgress(){
  try{localStorage.setItem(storageKey,JSON.stringify(progress));return true}
  catch{setSyncStatus("error","Thiết bị chưa lưu được tiến độ");return false}
}
function saveProgress(){persistProgress();scheduleRemoteSync()}
function mergeProgress(remote,local){
  const saved=remote?.progress_data||{};
  const remoteAnswers=saved.answers&&typeof saved.answers==="object"?saved.answers:{};
  const remoteBookmarks=Array.isArray(saved.bookmarks)?saved.bookmarks:[];
  return{answers:{...remoteAnswers,...local.answers},bookmarks:[...new Set([...remoteBookmarks,...local.bookmarks].map(Number).filter(id=>id>=1&&id<=600))],lastId:Number(local.lastId||saved.lastId||remote?.last_question_id)||1,exams:local.exams};
}
async function initStudentSync(){
  if(!token||!["student","public_theory"].includes(authKind)){setSyncStatus("local","Lưu trên thiết bị");syncTheoryCopy();return}
  try{
    const me=await rpc("app_student_me",{p_token:token});
    const isPublic=me.role==="public_theory";
    const accountKey=isPublic?String(me.id||""):String(me.student_id||"");
    if(!accountKey)throw new Error(isPublic?"Không tìm thấy tài khoản người học.":"Tài khoản chưa liên kết hồ sơ học viên.");
    storageKey=isPublic?`thay_dat_600_progress_public_${accountKey}`:`thay_dat_600_progress_v2_${accountKey}`;
    let accountLocal=readProgress(storageKey);
    const hasAccountLocal=Boolean(localStorage.getItem(storageKey));
    const legacyClaim=localStorage.getItem("thay_dat_600_progress_v1_claimed_by");
    if(!hasAccountLocal&&!legacyClaim&&localStorage.getItem(DEFAULT_STORAGE_KEY)){accountLocal=readProgress(DEFAULT_STORAGE_KEY);localStorage.setItem("thay_dat_600_progress_v1_claimed_by",accountKey)}
    progress=accountLocal;
    $("studentPortalLink").classList.remove("hidden");
    $("studentPortalLink").textContent=isPublic?"Đang tải tài khoản…":"Tài khoản học viên";
    remoteStudent=await rpc(isPublic?"app_public_theory_get_progress":"app_student_get_theory_progress",{p_token:token});
    progress=mergeProgress(remoteStudent,accountLocal);
    activeExamKey=isPublic?"B":examKeyForLicense(remoteStudent.license_class);
    if(!isPublic&&!activeExamKey)throw new Error("Hồ sơ học viên chưa có Hạng GPLX hợp lệ. Vui lòng yêu cầu Admin cập nhật A1, A, B hoặc C1 trước khi học lý thuyết.");
    remoteSyncEnabled=true;
    $("studentPortalLink").textContent=isPublic?`${remoteStudent.account_name||me.full_name||"Người học"} · Đăng xuất`:`${remoteStudent.student_name||"Học viên"} · Tài khoản`;
    if(isPublic){
      $("studentPortalLink").href="#";
      $("studentPortalLink").onclick=async event=>{event.preventDefault();try{await rpc("app_student_logout",{p_token:token})}catch{}for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}location.replace("/?login=1")};
    }
    persistProgress();
    await ensureQuestions();
    syncTheoryCopy();renderHome();populateFilters();scheduleRemoteSync();
  }catch(error){
    setSyncStatus("error","Chưa xác định đúng hạng GPLX");
    if(questions.length){syncTheoryCopy();renderHome()}
    toast(error?.message||"Không thể mở tiến độ tài khoản.");
  }
}
function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]))}
function shuffle(items){const result=[...items];for(let index=result.length-1;index>0;index--){const swap=Math.floor(Math.random()*(index+1));[result[index],result[swap]]=[result[swap],result[index]]}return result}
function toast(message){$("questionToast").textContent=message;$("questionToast").classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>$("questionToast").classList.remove("show"),2600)}
function closeDialog(dialog){if(dialog?.open)dialog.close()}
function topic(id){return TOPICS.find(item=>item.id===Number(id))||TOPICS[0]}
function bookmarked(id){return progress.bookmarks.includes(Number(id))}
function learnedAnswer(id){return Number(progress.answers[id])||0}
function answerIsCorrect(question){return learnedAnswer(question.id)===question.answer}
function answerIsWrong(question){return learnedAnswer(question.id)>0&&!answerIsCorrect(question)}
function displayedCritical(question){return currentMode==="exam"||currentMode==="exam-review"?Boolean(question.examCritical):practiceCritical(question)}

async function loadQuestions(){
  const data=await fetchJson("/data/600-cau-hoi-2025.json");
  if(!Array.isArray(data)||data.length!==600)throw new Error("Dữ liệu câu hỏi chưa đầy đủ.");
  questions=data;syncTheoryCopy();renderHome();populateFilters();
}
let questionsReady=null;
function ensureQuestions(){
  if(questions.length)return Promise.resolve();
  if(!questionsReady)questionsReady=loadQuestions().catch(error=>{
    questionsReady=null;
    $("topicCards").innerHTML=`<div class="empty-questions"><strong>${esc(error.message)}</strong><p>Bấm Tiếp tục học để tải lại bộ câu hỏi.</p></div>`;
    throw error;
  });
  return questionsReady;
}
void ensureQuestions().catch(error=>toast(error.message));

function renderHome(){
  const source=scopedQuestions();
  const answered=source.filter(question=>learnedAnswer(question.id));
  const correct=answered.filter(answerIsCorrect).length;
  const wrong=answered.length-correct;
  const percent=Math.round(answered.length/Math.max(1,source.length)*100)||0;
  $("learnedCount").textContent=answered.length;$("correctCount").textContent=correct;$("wrongCount").textContent=wrong;
  $("bookmarkCount").textContent=source.filter(question=>bookmarked(question.id)).length;
  $("progressPercent").textContent=`${percent}%`;$("progressRing").style.background=`conic-gradient(#0a83de ${percent*3.6}deg,#e8f1f7 0deg)`;
  $("topicCards").innerHTML=TOPICS.map(item=>{
    const topicQuestions=source.filter(question=>question.topicId===item.id);
    const done=topicQuestions.filter(question=>learnedAnswer(question.id)).length;
    const rate=Math.round(done/Math.max(1,topicQuestions.length)*100)||0;
    return `<button class="topic-card" type="button" data-topic="${item.id}" style="--topic-color:${item.color};--topic-soft:${item.soft}" ${topicQuestions.length?"":"disabled"}><span>${item.icon}</span><div><small>CHƯƠNG ${item.id} · ${topicQuestions.length} CÂU</small><strong>${esc(item.name)}</strong></div><b>→</b><em><i style="width:${rate}%"></i></em></button>`;
  }).join("");
  document.querySelectorAll("[data-topic]").forEach(button=>button.onclick=()=>startLearning("learn",Number(button.dataset.topic)));
}
function populateFilters(){
  const source=scopedQuestions();
  $("topicFilter").innerHTML=`<option value="all">Tất cả 6 chương · ${source.length} câu</option>${TOPICS.map(item=>{const count=source.filter(question=>question.topicId===item.id).length;return`<option value="${item.id}" ${count?"":"disabled"}>Chương ${item.id} · ${esc(item.short)} · ${count} câu</option>`}).join("")}`;
}
async function startFromButton(mode){
  if(startFromButton.busy)return;
  startFromButton.busy=true;
  const buttons=[...document.querySelectorAll('[data-start-mode]')];
  buttons.forEach(button=>{button.disabled=true;button.setAttribute("aria-busy","true")});
  toast("Đang mở bài học…");
  try{
  await ensureQuestions();
  if(token&&["student","public_theory"].includes(authKind)&&!remoteSyncEnabled){
    await ensureStudentSync();
  }
  if(authKind==="student"&&!activeExamKey)return toast("Chưa xác định Hạng GPLX từ hồ sơ Admin. Không thể mở bộ câu hỏi để tránh hiển thị nhầm hạng.");
  if(mode==="exam")return openExamIntro();
  if(mode==="continue"){
    const source=scopedQuestions();
    const lastQuestion=source.find(question=>question.id===progress.lastId)||source[0];
    return startLearning("learn",lastQuestion?.topicId||"all",lastQuestion?.id||null);
  }
  startLearning(mode);
  }catch(error){toast(error?.message||"Chưa mở được bài học. Vui lòng thử lại.")}
  finally{
    startFromButton.busy=false;
    buttons.forEach(button=>{button.disabled=false;button.removeAttribute("aria-busy")});
  }
}
function startLearning(mode="learn",topicId="all",preferredId=null){
  clearInterval(examTimer);currentMode=mode;activeTopic=topicId;$("topicFilter").value=String(topicId);
  $("statusFilter").value=mode==="critical"?"critical":mode==="wrong"?"wrong":mode==="bookmarked"?"bookmarked":"all";$("questionSearch").value="";
  const source=scopedQuestions(),criticalCount=source.filter(practiceCritical).length,total=source.length||scopedQuestionCount();
  const titles={learn:["ÔN TẬP CÓ HƯỚNG DẪN",topicId==="all"?`Bộ ${total} câu hỏi · Hạng ${activeExamKey||"B/C1"}`:`Chương ${topicId} · ${topic(topicId).short}`],critical:["CÂU HỎI ĐIỂM LIỆT",`${criticalCount} tình huống nghiêm trọng`],wrong:["ÔN TẬP CÁ NHÂN","Những câu cần học lại"],bookmarked:["DANH SÁCH ĐÃ LƯU","Câu hỏi đã đánh dấu"]};
  [$("workspaceKicker").textContent,$("workspaceTitle").textContent]=titles[mode]||titles.learn;
  $("studySidebar").classList.remove("hidden");$("examTimer").classList.add("hidden");$("finishExamBtn").classList.add("hidden");applyFilters(preferredId);showWorkspace();
}
function showWorkspace(){$("studyHome").classList.add("hidden");$("studyWorkspace").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})}
function returnHome(){if(currentMode==="exam"&&examStartedAt&&!examResult&&!confirm("Bạn muốn thoát và hủy bài thi đang làm?"))return;clearInterval(examTimer);examStartedAt=0;$("studyWorkspace").classList.add("hidden");$("studyHome").classList.remove("hidden");$("studySidebar").classList.remove("open");renderHome();window.scrollTo({top:0,behavior:"smooth"})}
function baseQuestions(){
  const source=scopedQuestions();
  if(currentMode==="critical")return source.filter(practiceCritical);
  if(currentMode==="wrong")return source.filter(answerIsWrong);
  if(currentMode==="bookmarked")return source.filter(question=>bookmarked(question.id));
  return source;
}
function applyFilters(preferredId=null){
  const query=normalize($("questionSearch").value),topicValue=$("topicFilter").value,status=$("statusFilter").value,oldId=preferredId||pool[currentIndex]?.id;
  pool=baseQuestions().filter(question=>{
    if(topicValue!=="all"&&question.topicId!==Number(topicValue))return false;
    if(query&&!normalize(`${question.id} ${question.question} ${question.options.map(option=>option.text).join(" ")}`).includes(query))return false;
    if(status==="unanswered"&&learnedAnswer(question.id))return false;if(status==="correct"&&!answerIsCorrect(question))return false;if(status==="wrong"&&!answerIsWrong(question))return false;if(status==="bookmarked"&&!bookmarked(question.id))return false;if(status==="critical"&&!practiceCritical(question))return false;return true;
  });
  currentIndex=Math.max(0,pool.findIndex(question=>question.id===Number(oldId)));if(currentIndex<0)currentIndex=0;renderQuestion();$("studySidebar").classList.remove("open");
}
function currentQuestion(){return pool[currentIndex]}
window.__THAY_DAT_AI_CONTEXT__=()=>{const question=currentQuestion();if(!question)return null;const selected=currentMode==="exam"||currentMode==="exam-review"?examAnswers.get(question.id):learnedAnswer(question.id);return{mode:currentMode,id:question.id,question:question.question,options:question.options.map(option=>`${option.n}. ${option.text}`),correctAnswer:question.answer,selectedAnswer:selected||null,critical:displayedCritical(question)}};
function renderQuestion(){
  const question=currentQuestion(),empty=!question;
  $("questionCard").classList.toggle("hidden",empty);$("emptyQuestions").classList.toggle("hidden",!empty);$("questionProgressBar").style.width=empty?"0%":`${(currentIndex+1)/pool.length*100}%`;$("prevQuestionBtn").disabled=empty||currentIndex===0;$("nextQuestionBtn").disabled=empty||currentIndex>=pool.length-1;$("bookmarkBtn").disabled=empty;if(empty){renderPalette();return}
  const itemTopic=topic(question.topicId),selected=currentMode==="exam"||currentMode==="exam-review"?examAnswers.get(question.id):learnedAnswer(question.id),reveal=currentMode!=="exam"&&Boolean(selected);
  $("topicBadge").textContent=`Chương ${question.topicId} · ${itemTopic.short}`;$("criticalBadge").classList.toggle("hidden",!displayedCritical(question));$("questionNumber").textContent=`CÂU ${question.id} · ${currentIndex+1} / ${pool.length}`;$("questionText").textContent=question.question;$("bookmarkBtn").classList.toggle("active",bookmarked(question.id));$("bookmarkBtn").setAttribute("aria-pressed",bookmarked(question.id)?"true":"false");$("bookmarkBtn").innerHTML=`${bookmarked(question.id)?"★":"☆"} <span>${bookmarked(question.id)?"Đã đánh dấu":"Đánh dấu"}</span>`;$("questionFigure").classList.toggle("hidden",!question.image);
  if(question.image&&question.imageAtlas){const atlas=question.imageAtlas,image=$("questionImage"),displayWidth=Math.min(720,Math.max(atlas.w,Math.round(atlas.w*1.75)));image.style.width=`min(100%, ${displayWidth}px)`;image.style.aspectRatio=`${atlas.w}/${atlas.h}`;image.style.backgroundImage=`url("/questions/${atlas.file}")`;image.style.backgroundSize=`${atlas.atlasW/atlas.w*100}% ${atlas.atlasH/atlas.h*100}%`;image.style.backgroundPosition=`${atlas.x/(atlas.atlasW-atlas.w)*100}% ${atlas.y/(atlas.atlasH-atlas.h)*100}%`;image.setAttribute("aria-label",`Hình minh họa câu ${question.id}`)}
  $("answerOptions").innerHTML=question.options.map(option=>{const isSelected=Number(selected)===option.n,isCorrect=reveal&&option.n===question.answer,isIncorrect=reveal&&isSelected&&option.n!==question.answer;return `<button class="answer-option ${isSelected?"selected":""} ${isCorrect?"correct":""} ${isIncorrect?"incorrect":""}" type="button" data-answer="${option.n}" ${reveal?"disabled":""}><span>${option.n}</span><strong>${esc(option.text)}</strong><i>${isCorrect?"✓":isIncorrect?"×":""}</i></button>`}).join("");
  document.querySelectorAll("[data-answer]").forEach(button=>button.onclick=()=>chooseAnswer(Number(button.dataset.answer)));renderFeedback(question,selected,reveal);progress.lastId=question.id;saveProgress();renderPalette();
}
function renderFeedback(question,selected,reveal){if(!reveal){$("answerFeedback").classList.add("hidden");return}const correct=Number(selected)===question.answer,answerText=question.options.find(option=>option.n===question.answer)?.text||"";$("answerFeedback").className=`answer-feedback ${correct?"":"wrong"}`;$("answerFeedback").innerHTML=`<span>${correct?"✓":"!"}</span><div><strong>${correct?"Chính xác!":"Chưa chính xác"}</strong><p>Đáp án đúng: <b>${question.answer}. ${esc(answerText)}</b>${displayedCritical(question)?" Đây là câu điểm liệt, hãy ghi nhớ kỹ.":""}</p></div>`}
function chooseAnswer(answer){const question=currentQuestion();if(!question)return;if(currentMode==="exam"){examAnswers.set(question.id,answer);renderQuestion();if(currentIndex<pool.length-1)setTimeout(()=>goToQuestion(currentIndex+1),130);return}if(currentMode==="exam-review")return;progress.answers[question.id]=answer;saveProgress();renderQuestion()}
function goToQuestion(index){if(!pool.length)return;currentIndex=Math.max(0,Math.min(pool.length-1,index));renderQuestion();window.scrollTo({top:Math.max(0,$("studyWorkspace").offsetTop-80),behavior:"smooth"})}
function toggleBookmark(){const question=currentQuestion();if(!question)return;if(bookmarked(question.id))progress.bookmarks=progress.bookmarks.filter(id=>id!==question.id);else progress.bookmarks.push(question.id);saveProgress();renderQuestion();toast(bookmarked(question.id)?"Đã đánh dấu câu hỏi":"Đã bỏ đánh dấu")}
function renderPalette(){$("questionPalette").innerHTML=pool.map((question,index)=>{const selected=currentMode==="exam"||currentMode==="exam-review"?examAnswers.has(question.id):Boolean(learnedAnswer(question.id)),incorrect=currentMode==="exam-review"&&examAnswers.get(question.id)!==question.answer;return `<button type="button" data-palette-index="${index}" class="${selected?"answered":""} ${index===currentIndex?"current":""} ${bookmarked(question.id)?"flagged":""} ${incorrect?"incorrect":""}">${question.id}</button>`}).join("");document.querySelectorAll("[data-palette-index]").forEach(button=>button.onclick=()=>{goToQuestion(Number(button.dataset.paletteIndex));closeDialog($("paletteDialog"))})}
function openExamIntro(){if(authKind==="student"&&!activeExamKey)return toast("Hồ sơ chưa có Hạng GPLX hợp lệ.");renderExamIntro();$("examReadyCheck").checked=false;$("startExamBtn").disabled=true;$("examIntroDialog").showModal()}
function renderExamIntro(){
  const exam=EXAMS[activeExamKey];if(!exam)return;
  $("examDialogTitle").textContent=`Giấy phép lái xe hạng ${exam.label}`;$("examDialogVehicle").textContent=exam.vehicle;$("examQuestionCount").textContent=exam.count;$("examMinutes").textContent=`${exam.minutes}'`;$("examPassScore").textContent=exam.pass;$("examDescription").textContent=`Đề được chọn ngẫu nhiên từ ${exam.questionIds?"nhóm 250 câu dành cho mô tô":"bộ 600 câu chính thức"}. Bài thi không đạt nếu trả lời sai câu điểm liệt, kể cả khi đủ điểm.`;
  document.querySelectorAll("[data-exam-class]").forEach(button=>{const selected=button.dataset.examClass===activeExamKey;button.classList.toggle("active",selected);button.setAttribute("aria-pressed",selected?"true":"false")});
}
function beginExam(){
  closeDialog($("examIntroDialog"));const exam=EXAMS[activeExamKey];if(!exam)return toast("Không xác định được hạng thi từ hồ sơ.");examPool=buildExamPool(questions,activeExamKey,shuffle);pool=examPool;examAnswers=new Map();examResult=null;examStartedAt=Date.now();currentMode="exam";currentIndex=0;$("workspaceKicker").textContent=`THI THỬ HẠNG ${exam.label}`;$("workspaceTitle").textContent=`${exam.count} câu · đạt từ ${exam.pass} điểm`;$("studySidebar").classList.add("hidden");$("examTimer").classList.remove("hidden");$("finishExamBtn").classList.remove("hidden");showWorkspace();updateExamTimer();clearInterval(examTimer);examTimer=setInterval(updateExamTimer,1000);renderQuestion();
}
function updateExamTimer(){const exam=EXAMS[activeExamKey];if(!exam)return;const elapsed=Math.floor((Date.now()-examStartedAt)/1000),remaining=Math.max(0,exam.minutes*60-elapsed),minutes=Math.floor(remaining/60),seconds=remaining%60;$("examTimer").textContent=`${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;$("examTimer").classList.toggle("warning",remaining<=60);if(remaining===0)finishExam(true)}
async function saveRemoteExamAttempt(result){if(!remoteSyncEnabled)return;try{await rpc(authKind==="public_theory"?"app_public_theory_save_exam_attempt":"app_student_save_exam_attempt",{p_token:token,p_license_class:result.examKey,p_score:result.correct,p_total:EXAMS[result.examKey].count,p_critical_correct:result.criticalCorrect,p_elapsed_seconds:result.elapsed});setSyncStatus("synced",`Đã lưu bài thi · ${remoteStudent?.student_name||remoteStudent?.account_name||"Người học"}`)}catch(error){setSyncStatus("error","Bài thi chưa đồng bộ");toast(error?.message||"Không thể lưu kết quả thi vào tài khoản.")}}
function finishExam(auto=false){if(currentMode!=="exam"||examResult)return;const unanswered=pool.length-examAnswers.size;if(!auto&&!confirm(unanswered?`Bạn còn ${unanswered} câu chưa trả lời. Vẫn nộp bài?`:"Bạn muốn nộp bài và xem kết quả?"))return;clearInterval(examTimer);const exam=EXAMS[activeExamKey],correct=pool.filter(question=>examAnswers.get(question.id)===question.answer).length,criticalQuestion=pool.find(question=>question.examCritical),criticalCorrect=Boolean(criticalQuestion)&&examAnswers.get(criticalQuestion.id)===criticalQuestion.answer,elapsed=Math.min(exam.minutes*60,Math.floor((Date.now()-examStartedAt)/1000)),passed=correct>=exam.pass&&criticalCorrect;examResult={correct,wrong:pool.length-correct,criticalCorrect,elapsed,passed,examKey:activeExamKey};progress.exams.unshift({date:new Date().toISOString(),licenseClass:activeExamKey,score:correct,total:exam.count,passed,criticalCorrect,elapsed});progress.exams=progress.exams.slice(0,20);saveProgress();void saveRemoteExamAttempt(examResult);showExamResult()}
function showExamResult(){const result=examResult,exam=EXAMS[result.examKey],rate=Math.round(result.correct/exam.count*100);$("resultKicker").textContent=`KẾT QUẢ THI THỬ HẠNG ${exam.label}`;$("resultIcon").textContent=result.passed?"✓":"×";$("resultIcon").classList.toggle("fail",!result.passed);$("resultTitle").textContent=result.passed?"Bạn đã đạt!":"Bạn chưa đạt";$("resultSummary").textContent=!result.criticalCorrect?"Bạn đã trả lời sai câu điểm liệt. Hãy xem lại bài trước khi thi đề tiếp theo.":result.passed?"Kết quả rất tốt. Hãy duy trì luyện tập để giữ phong độ.":`Bạn cần đúng ít nhất ${exam.pass}/${exam.count} câu để đạt.`;$("resultScore").textContent=`${result.correct}/${exam.count}`;$("resultRate").textContent=`${rate}% chính xác`;$("resultCorrect").textContent=result.correct;$("resultWrong").textContent=result.wrong;$("resultTime").textContent=`${Math.floor(result.elapsed/60)}:${String(result.elapsed%60).padStart(2,"0")}`;$("examResultDialog").showModal()}
function reviewExam(){closeDialog($("examResultDialog"));currentMode="exam-review";currentIndex=0;const exam=EXAMS[examResult.examKey];$("workspaceKicker").textContent=`XEM LẠI BÀI THI HẠNG ${exam.label}`;$("workspaceTitle").textContent=`Kết quả ${examResult.correct}/${exam.count}`;$("examTimer").classList.add("hidden");$("finishExamBtn").classList.add("hidden");renderQuestion()}

document.querySelectorAll("[data-start-mode]").forEach(button=>button.onclick=()=>startFromButton(button.dataset.startMode));
document.querySelectorAll(".dialog-close").forEach(button=>button.onclick=()=>closeDialog(button.closest("dialog")));
$("backHomeBtn").onclick=returnHome;$("prevQuestionBtn").onclick=()=>goToQuestion(currentIndex-1);$("nextQuestionBtn").onclick=()=>goToQuestion(currentIndex+1);$("bookmarkBtn").onclick=toggleBookmark;$("applyFilterBtn").onclick=()=>applyFilters();$("questionSearch").onkeydown=event=>{if(event.key==="Enter"){event.preventDefault();applyFilters()}};$("openPaletteBtn").onclick=()=>{$("paletteDialog").showModal();renderPalette()};$("mobileFilterBtn").onclick=()=>$("studySidebar").classList.add("open");$("closeSidebarBtn").onclick=()=>$("studySidebar").classList.remove("open");$("examReadyCheck").onchange=event=>$("startExamBtn").disabled=!event.target.checked;
document.querySelectorAll("[data-exam-class]").forEach(button=>button.onclick=()=>{const requested=button.dataset.examClass;if(authKind==="student"&&remoteStudent&&requested!==activeExamKey){toast(`Tài khoản này được Admin xếp hạng ${activeExamKey}. Không thể chuyển sang hạng ${requested}.`);return}activeExamKey=requested;syncTheoryCopy();renderExamIntro();$("examReadyCheck").checked=false;$("startExamBtn").disabled=true});
$("startExamBtn").onclick=beginExam;$("finishExamBtn").onclick=()=>finishExam(false);$("reviewExamBtn").onclick=reviewExam;$("retryExamBtn").onclick=()=>{closeDialog($("examResultDialog"));openExamIntro()};
$("resetProgressBtn").onclick=()=>{const message=remoteSyncEnabled?"Làm mới tiến độ học và câu đã đánh dấu của tài khoản này? Lịch sử thi đã gửi cho Admin vẫn được giữ lại.":"Xóa toàn bộ tiến độ học, câu đã đánh dấu và lịch sử thi thử trên thiết bị này?";if(!confirm(message))return;progress={answers:{},bookmarks:[],lastId:1,exams:[]};saveProgress();renderHome();toast("Đã làm mới tiến độ học")};
document.addEventListener("keydown",event=>{if(["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName)||document.querySelector("dialog[open]"))return;if($("studyWorkspace").classList.contains("hidden"))return;if(event.key==="ArrowLeft")goToQuestion(currentIndex-1);if(event.key==="ArrowRight")goToQuestion(currentIndex+1);if(/^[1-4]$/.test(event.key)){const option=currentQuestion()?.options.find(item=>item.n===Number(event.key));if(option)chooseAnswer(option.n)}});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")void flushRemoteProgress(true)});
let studentSyncPromise=null;
function ensureStudentSync(){
  if(!studentSyncPromise)studentSyncPromise=initStudentSync().finally(()=>{studentSyncPromise=null});
  return studentSyncPromise;
}
void ensureStudentSync();
