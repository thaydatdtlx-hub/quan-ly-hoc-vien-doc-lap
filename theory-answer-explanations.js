import "./theory-answer-explanations.css";
import {explanationForQuestion} from "./theory-explanation-engine.js";

let questionMap=new Map();
let loading=null;
let applying=false;

function esc(value=""){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function currentQuestionId(){
  const value=document.getElementById("questionNumber")?.textContent||"";
  return Number(value.match(/CÂU\s+(\d+)/i)?.[1])||0;
}
function correctOption(question){
  return question?.options?.find(option=>Number(option.n)===Number(question.answer));
}
function selectedOption(question){
  const selected=document.querySelector("#answerOptions .answer-option.selected");
  const n=Number(selected?.dataset.answer)||0;
  return question?.options?.find(option=>Number(option.n)===n);
}
function enhanceFeedback(){
  if(applying||location.pathname!=="/600-cau-hoi.html")return;
  const feedback=document.getElementById("answerFeedback");
  if(!feedback||feedback.classList.contains("hidden"))return;
  const id=currentQuestionId(),question=questionMap.get(id);
  if(!question)return;
  if(feedback.dataset.explanationQuestion===String(id)&&feedback.querySelector(".answer-explanation-box"))return;
  const selected=selectedOption(question),correct=Number(selected?.n)===Number(question.answer),answer=correctOption(question),explanation=explanationForQuestion(question);
  applying=true;
  feedback.dataset.explanationQuestion=String(id);
  feedback.classList.add("answer-feedback-explained");
  feedback.setAttribute("role","status");
  feedback.setAttribute("aria-live","polite");
  feedback.innerHTML=`
    <div class="answer-result-icon" aria-hidden="true">${correct?"✓":"×"}</div>
    <div class="answer-result-copy">
      <strong>${correct?"Bạn trả lời đúng":"Bạn trả lời chưa đúng"}</strong>
      ${!correct&&selected?`<p class="answer-selected-line">Bạn đã chọn: <b>${selected.n}. ${esc(selected.text)}</b></p>`:""}
      <p class="answer-correct-line">Đáp án đúng: <b>${question.answer}. ${esc(answer?.text||"")}</b></p>
      <div class="answer-explanation-box">
        <span>GIẢI THÍCH</span>
        <p>${esc(explanation.text)}</p>
        ${explanation.legal?`<small class="answer-legal-note">${esc(explanation.legal)}</small>`:""}
        ${question.critical?'<small>⚠ Đây là câu điểm liệt. Nếu gặp trong bài thi, cần đặc biệt ghi nhớ đáp án này.</small>':""}
      </div>
    </div>`;
  applying=false;
}
async function loadQuestions(){
  if(loading)return loading;
  loading=fetch("/data/600-cau-hoi-2025.json")
    .then(response=>response.ok?response.json():[])
    .then(data=>{if(Array.isArray(data))questionMap=new Map(data.map(item=>[Number(item.id),item]));return data})
    .catch(()=>[]);
  return loading;
}
async function init(){
  if(location.pathname!=="/600-cau-hoi.html")return;
  await loadQuestions();
  enhanceFeedback();
  const target=document.getElementById("questionCard")||document.body;
  const observer=new MutationObserver(()=>enhanceFeedback());
  observer.observe(target,{subtree:true,childList:true,attributes:true,characterData:true,attributeFilter:["class"]});
  window.addEventListener("pageshow",enhanceFeedback);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
