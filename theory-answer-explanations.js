import "./theory-answer-explanations.css";

const TAPLAI_URL="https://taplai.com/hoc-ly-thuyet-600-cau-lai-xe-o-to-truc-tuyen-moi-nhat.html";
const CURATED_EXPLANATIONS={
  1:{text:"Phần đường xe chạy là phần của đường bộ dành cho phương tiện giao thông qua lại. Vì vậy chọn đáp án 2; lề đường không được tính là toàn bộ phần dành cho xe chạy."},
  2:{text:"Đây là câu hỏi về khái niệm làn đường. Một làn đường phải nằm trong phần đường xe chạy, được chia theo chiều dọc và có đủ bề rộng để xe chạy an toàn, nên đáp án 2 đầy đủ nhất."},
  3:{text:"Khổ giới hạn phải xét cả chiều rộng và chiều cao để xe, kể cả hàng hóa xếp trên xe, đi qua an toàn.",legal:"Tham khảo Khoản 2 Điều 27 Luật Đường bộ."},
  5:{text:"Dải phân cách dùng để tách hai chiều xe chạy hoặc phân chia phần đường dành cho các nhóm phương tiện khác nhau. Đáp án 2 nêu đúng và đầy đủ chức năng này.",legal:"Tham khảo Khoản 7 Điều 24 Luật Đường bộ."},
  8:{text:"Nhóm xe cơ giới gồm ô tô, rơ moóc và sơ mi rơ moóc, xe bốn bánh gắn động cơ, mô tô, xe gắn máy và loại tương tự; xe máy chuyên dùng là nhóm riêng.",legal:"Tham khảo điểm a Khoản 1 Điều 34 Luật Trật tự, an toàn giao thông đường bộ."},
  15:{text:"Dừng xe chỉ mang tính tạm thời, còn đỗ xe là trạng thái đứng yên không giới hạn thời gian. Vì câu hỏi hỏi về đỗ xe nên chọn phương án nêu đặc điểm không giới hạn thời gian.",legal:"Tham khảo Điều 18 Luật Trật tự, an toàn giao thông đường bộ."},
  16:{text:"Đường cao tốc phải đồng thời có nhiều đặc điểm: giới hạn loại phương tiện, hai chiều tách riêng, không giao cùng mức, có điểm ra vào xác định và hạ tầng bảo đảm an toàn. Vì vậy phương án “Tất cả các ý trên” là đúng.",legal:"Tham khảo Khoản 1 Điều 44 Luật Đường bộ."},
  29:{text:"Phương tiện chạy chậm hơn phải đi về phía bên phải theo chiều đi của mình để không cản trở dòng xe nhanh hơn và giúp việc chuyển làn an toàn hơn.",legal:"Tham khảo Điều 13 Luật Trật tự, an toàn giao thông đường bộ."},
  54:{text:"Xe hạng B kéo rơ moóc có khối lượng toàn bộ theo thiết kế trên 750 kg thuộc phạm vi hạng BE; mốc tuổi tối thiểu cần nhớ cho BE là 21 tuổi.",legal:"Tham khảo Điều 59 Luật Trật tự, an toàn giao thông đường bộ."},
  55:{text:"Xe mô tô hai bánh đến 125 cm³ hoặc động cơ điện đến 11 kW thuộc phạm vi hạng A1; người được cấp hạng A1 phải đủ 18 tuổi.",legal:"Tham khảo Điều 59 Luật Trật tự, an toàn giao thông đường bộ."},
  56:{text:"Ô tô chở người trên 29 chỗ thuộc nhóm giấy phép hạng D; mốc tuổi tối thiểu của hạng D là 27 tuổi.",legal:"Tham khảo Điều 59 Luật Trật tự, an toàn giao thông đường bộ."},
  57:{text:"Với người lái ô tô chở người trên 29 chỗ hoặc xe giường nằm, giới hạn tuổi tối đa khác nhau theo giới tính: 57 tuổi đối với nam và 55 tuổi đối với nữ.",legal:"Tham khảo Điều 59 Luật Trật tự, an toàn giao thông đường bộ."},
  58:{text:"Các hạng D1, D2, C1E và CE có cùng mốc tuổi tối thiểu là 24 tuổi; đây là nhóm cần ghi nhớ riêng so với C/BE và D.",legal:"Tham khảo Điều 59 Luật Trật tự, an toàn giao thông đường bộ."},
  59:{text:"Người đủ 16 tuổi trở lên được điều khiển xe gắn máy. Đây là mốc tuổi thấp hơn so với tuổi cấp giấy phép A1/A/B/C1.",legal:"Tham khảo quy định về độ tuổi người điều khiển phương tiện."},
  60:{text:"Hạng A1 chỉ áp dụng cho mô tô hai bánh đến 125 cm³ hoặc công suất điện đến 11 kW. Vì vậy xe có dung tích lớn hơn phạm vi này không thuộc quyền điều khiển của A1.",legal:"Tham khảo Điều 57 Luật Trật tự, an toàn giao thông đường bộ."},
  61:{text:"Phạm vi hạng A1 là mô tô hai bánh đến 125 cm³ hoặc động cơ điện đến 11 kW. Hãy nhớ cặp mốc 125 cm³ và 11 kW để tránh nhầm với hạng A.",legal:"Tham khảo Điều 57 Luật Trật tự, an toàn giao thông đường bộ."}
};

let questionMap=new Map();
let loading=null;
let applying=false;

function esc(value=""){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function normalize(value=""){
  return String(value).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
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
function genericExplanation(question){
  const answer=correctOption(question);
  const answerText=String(answer?.text||"").trim();
  if(!answerText)return{ text:"Hãy đọc lại câu hỏi, xác định từ khóa chính rồi đối chiếu với đáp án đúng trước khi chuyển sang câu tiếp theo." };
  const prompt=normalize(question?.question||"");
  if(/la gi|duoc hieu|khai niem/.test(prompt)){
    return{text:`Đây là câu hỏi khái niệm. Phương án ${question.answer} nêu đúng định nghĩa cần nhớ: ${answerText} Khi ôn, hãy tập trung vào các từ khóa phân biệt khái niệm này với những khái niệm gần giống.`};
  }
  if(/bao nhieu tuoi|do tuoi/.test(prompt)){
    return{text:`Câu hỏi kiểm tra mốc tuổi. Đáp án cần nhớ là: ${answerText} Nên gắn mốc tuổi với đúng hạng giấy phép hoặc loại phương tiện để tránh nhầm giữa các nhóm.`};
  }
  if(/khong duoc|bi nghiem cam|khong duoc phep/.test(prompt)){
    return{text:`Đây là câu nhận diện hành vi hoặc phạm vi không được phép. Ghi nhớ phương án đúng: ${answerText} Khi gặp dạng này, đọc kỹ các từ “không”, “cấm”, “không được phép” trước khi chọn.`};
  }
  if(/phai lam gi|nhu the nao|thuc hien/.test(prompt)){
    return{text:`Đây là câu về quy tắc xử lý. Hành động đúng là: ${answerText} Ưu tiên phương án thể hiện đầy đủ quan sát, tín hiệu, nhường đường và bảo đảm an toàn khi các yếu tố này xuất hiện trong tình huống.`};
  }
  if(Number(question?.topicId)===5){
    return{text:`Với câu biển báo, hãy nhận diện hình dạng, màu sắc, ký hiệu và phạm vi tác dụng trước khi chọn. Ở câu này phương án đúng là ${question.answer}: ${answerText}`};
  }
  if(Number(question?.topicId)===6){
    return{text:`Với câu sa hình hoặc tình huống, hãy xác định thứ tự ưu tiên và hướng di chuyển của từng xe trước. Kết quả đúng của tình huống này là phương án ${question.answer}: ${answerText}`};
  }
  return{text:`Điểm cần nhớ của câu này nằm ở nội dung của phương án ${question.answer}: ${answerText} Hãy đọc lại từ khóa trong câu hỏi và liên hệ trực tiếp với ý chính của đáp án thay vì học thuộc số thứ tự.`};
}
function explanationFor(question){
  const detailed=String(question?.explanation||question?.hint||"").trim();
  if(detailed)return{text:detailed,legal:""};
  return CURATED_EXPLANATIONS[Number(question?.id)]||genericExplanation(question);
}
function enhanceFeedback(){
  if(applying||location.pathname!=="/600-cau-hoi.html")return;
  const feedback=document.getElementById("answerFeedback");
  if(!feedback||feedback.classList.contains("hidden"))return;
  const id=currentQuestionId(),question=questionMap.get(id);
  if(!question)return;
  if(feedback.dataset.explanationQuestion===String(id)&&feedback.querySelector(".answer-explanation-box"))return;
  const selected=selectedOption(question),correct=Number(selected?.n)===Number(question.answer),answer=correctOption(question),explanation=explanationFor(question);
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
        <a class="answer-reference-link" href="${TAPLAI_URL}" target="_blank" rel="noopener noreferrer">Đối chiếu cách giải trên TapLai ↗</a>
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
