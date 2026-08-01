import "./ai-chat.css";
import {SCHEDULE_FIELDS,parseScheduleFromNotes} from "./schedule-data.js";

const HISTORY_KEY="thay_dat_free_assistant_v2";
const MAX_HISTORY=8;
const QUESTION_DATA_URL="/data/600-cau-hoi-2025.json";
const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
let questionBankPromise=null;
let privateSchedulePromise=null;

const pageSuggestions=()=>{
  if(location.pathname.includes("600-cau-hoi"))return["Giải thích câu này dễ hiểu","Mẹo ghi nhớ đáp án","Tra cứu câu 1"];
  if(location.pathname.includes("lich-dao-tao"))return["Cách xem ca học của tôi?","DAT là gì?","Tôi muốn đổi lịch học"];
  if(location.pathname.includes("hoc-vien"))return["Lịch học Cabin","Lịch chạy DAT","Lịch thi tốt nghiệp","Lịch thi sát hạch","Tra cứu học phí của tôi","Lịch học sắp tới của tôi"];
  return["Hướng dẫn học 600 câu","Cách tạo tài khoản học","Liên hệ Thầy Đạt"];
};

function normalize(value){
  return String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
}
function textOf(selector){
  const element=document.querySelector(selector);
  if(!element||element.classList.contains("hidden"))return"";
  return element.textContent?.replace(/\s+/g," ").trim()||"";
}
function currentQuestion(){
  return typeof window.__THAY_DAT_AI_CONTEXT__==="function"?window.__THAY_DAT_AI_CONTEXT__():null;
}
async function studentRpc(name,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!response.ok)return null;
  return response.json().catch(()=>null);
}
async function loadPrivateSchedule(){
  const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
  const authKind=localStorage.getItem("hv_auth_kind")||sessionStorage.getItem("hv_auth_kind")||"";
  if(!token||authKind!=="student")return null;
  if(!privateSchedulePromise)privateSchedulePromise=(async()=>{
    const student=await studentRpc("app_student_portal",{p_token:token});
    if(!student?.id)return null;
    const sessions=await studentRpc("app_list_training_sessions",{p_token:token,p_student_id:student.id});
    return{student,sessions:Array.isArray(sessions)?sessions:[]};
  })();
  return privateSchedulePromise;
}
function formatScheduleDate(value){
  const parsed=new Date(value);if(Number.isNaN(parsed.valueOf()))return String(value||"Chưa cập nhật");
  return new Intl.DateTimeFormat("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric",...(/^\d{4}-\d{2}-\d{2}$/.test(String(value))?{}:{hour:"2-digit",minute:"2-digit"})}).format(parsed);
}
async function scheduleEventsForStudent(){
  const data=await loadPrivateSchedule();if(!data)return null;
  const schedule=parseScheduleFromNotes(data.student.notes||"")||{dates:{},locations:{}};
  const fixed=SCHEDULE_FIELDS.filter(field=>schedule.dates?.[field.key]).map(field=>({key:field.key,label:field.label,date:schedule.dates[field.key],location:schedule.locations?.[field.key]||""}));
  const repeat=data.sessions.map(session=>{const field=SCHEDULE_FIELDS.find(item=>item.key===session.session_type);return field?{key:field.key,label:field.label,date:session.starts_at,location:session.location||""}:null}).filter(Boolean);
  const today=new Date();today.setHours(0,0,0,0);
  return[...fixed,...repeat].filter(event=>new Date(event.date)>=today).sort((a,b)=>new Date(a.date)-new Date(b.date));
}
async function specificScheduleAnswer(keys,title){
  const events=await scheduleEventsForStudent();
  if(!events)return`Để bảo mật, ${title.toLowerCase()} chỉ được tra cứu khi học viên đăng nhập đúng tài khoản.`;
  const matches=events.filter(event=>keys.includes(event.key));
  if(!matches.length)return`Chưa có ${title.toLowerCase()} sắp tới trong tài khoản. Khi Admin cập nhật, lịch sẽ xuất hiện tại mục Thông báo và Lịch đào tạo.`;
  return[`${title} của bạn:`,...matches.map(event=>`• ${event.label}: ${formatScheduleDate(event.date)} · ${event.location||"Chưa cập nhật địa điểm"}`),"Lịch chính thức căn cứ theo thông báo đã được Admin cập nhật."].join("\n");
}
async function loadQuestionBank(){
  if(!questionBankPromise)questionBankPromise=fetch(QUESTION_DATA_URL).then(response=>{
    if(!response.ok)throw new Error("Không tải được bộ 600 câu.");
    return response.json();
  });
  return questionBankPromise;
}
async function questionFromQuery(query){
  const match=normalize(query).match(/(?:^|\s)cau\s*(\d{1,3})(?:\s|$)/);
  if(!match)return null;
  const id=Number(match[1]);if(id<1||id>600)return{invalid:true,id};
  const questions=await loadQuestionBank();
  return questions.find(item=>Number(item.id)===id)||null;
}

function memoryTip(question){
  const source=normalize(`${question.question} ${question.options?.find(option=>Number(option.n)===Number(question.answer))?.text||""}`);
  if(source.includes("nong do con")||source.includes("ruou")||source.includes("bia"))return"Mẹo nhớ: đã uống rượu bia thì không lái xe; chú ý các từ “nghiêm cấm” và “không được”.";
  if(source.includes("toc do"))return"Mẹo nhớ: câu tốc độ phải đọc đủ 3 yếu tố — loại xe, loại đường và khu vực đông dân cư hay ngoài khu vực.";
  if(source.includes("bien bao")||source.includes("bao hieu"))return"Mẹo nhớ: nhận diện theo thứ tự hình dạng → màu nền → ký hiệu rồi mới chọn ý nghĩa biển.";
  if(source.includes("nhuong duong")||source.includes("uu tien"))return"Mẹo nhớ: gạch chân từ “ưu tiên”, “nhường đường” và xác định đúng tình huống trước khi chọn.";
  if(source.includes("dung xe")||source.includes("do xe"))return"Mẹo nhớ: phân biệt rõ dừng xe là tạm thời, còn đỗ xe là đứng không giới hạn thời gian.";
  if(source.includes("vuot xe"))return"Mẹo nhớ: câu vượt xe phải kiểm tra nơi được phép vượt, tín hiệu và điều kiện an toàn.";
  const answer=question.options?.find(option=>Number(option.n)===Number(question.answer))?.text||"đáp án đúng";
  return`Mẹo nhớ: ghép từ khóa chính của câu với cụm “${answer.slice(0,90)}${answer.length>90?"…":""}”.`;
}
function explainQuestion(question,query=""){
  const options=(question.options||[]).map(option=>({n:Number(option.n),text:String(option.text||"")}));
  const correct=options.find(option=>option.n===Number(question.answer));
  if(!correct)return"Câu hỏi này chưa có dữ liệu đáp án hoàn chỉnh.";
  const selected=Number(question.selectedAnswer||0),selectedText=options.find(option=>option.n===selected)?.text;
  const lines=[`Câu ${question.id}: Đáp án đúng là ${correct.n}. ${correct.text}`];
  if(selected&&selected!==correct.n)lines.push(`Bạn đã chọn ${selected}${selectedText?`. ${selectedText}`:""}; hãy xem lại từ khóa trong đề.`);
  else if(selected===correct.n)lines.push("Bạn đã chọn chính xác.");
  if(question.critical)lines.push("⚠ Đây là câu điểm liệt, cần ghi nhớ kỹ.");
  lines.push(memoryTip(question));
  if(/vi sao|dap an khac|giai thich/.test(normalize(query)))lines.push("Các phương án còn lại không khớp khái niệm hoặc tình huống mà đề bài đang hỏi. Hãy bám đúng từ khóa, không suy rộng sang trường hợp khác.");
  return lines.join("\n");
}

async function scheduleAnswer(){
  const events=await scheduleEventsForStudent();
  if(events?.length)return["Các lịch sắp tới của bạn:",...events.slice(0,8).map(event=>`• ${event.label}: ${formatScheduleDate(event.date)} · ${event.location||"Chưa cập nhật địa điểm"}`),"Lịch chính thức căn cứ theo thông báo đã được Admin cập nhật."].join("\n");
  const upcoming=textOf("#studentUpcoming");
  if(upcoming&&!/chua co|dang tai/i.test(normalize(upcoming)))return`Lịch đang hiển thị trong tài khoản của bạn:\n${upcoming}\n\nLịch chính thức vẫn căn cứ theo mục Thông báo và lịch đã được Admin duyệt.`;
  return events?"Chưa có lịch sắp tới trong tài khoản. Khi Admin cập nhật, lịch sẽ xuất hiện tại mục Thông báo và Lịch đào tạo.":"Để bảo mật, lịch cá nhân chỉ được tra cứu khi học viên đăng nhập đúng tài khoản.";
}
function progressAnswer(){
  const learned=textOf("#theoryLearned"),correct=textOf("#theoryCorrect"),exams=textOf("#theoryExamCount"),best=textOf("#theoryBestScore");
  if(learned)return`Tiến độ hiện tại: đã học ${learned}, trả lời đúng ${correct||"đang cập nhật"}, thi thử ${exams||"0 lần"}, kết quả tốt nhất ${best||"chưa thi"}.`;
  return"Mở trang “Học lý thuyết 600 câu”. Tiến độ được lưu theo tài khoản và Admin có thể theo dõi số câu đã học cùng kết quả thi thử.";
}
function tuitionAnswer(){
  const portal=document.getElementById("studentPortal");
  if(!portal||portal.classList.contains("hidden"))return"Để bảo mật, học phí chỉ được tra cứu sau khi học viên đăng nhập đúng tài khoản và mở Cổng học viên.";
  const total=textOf("#tuitionTotal"),paid=textOf("#tuitionPaid"),debt=textOf("#tuitionDebt"),status=textOf("#tuitionStatus"),note=textOf("#tuitionDebtNote");
  if(!total)return"Dữ liệu học phí đang được tải. Vui lòng chờ vài giây rồi hỏi lại.";
  return[
    "Học phí của tài khoản đang đăng nhập:",
    `• Tổng học phí: ${total}`,
    `• Đã đóng: ${paid||"Đang cập nhật"}`,
    `• Còn lại: ${debt||"Đang cập nhật"}`,
    `• Trạng thái: ${status||note||"Đang cập nhật"}`,
    "Số liệu được cập nhật sau khi Thầy Đạt đối soát thanh toán."
  ].join("\n");
}
async function faqAnswer(query){
  const value=normalize(query);
  if(/^(xin chao|chao|hello|hi)\b/.test(value))return"Chào anh/chị! Tôi hỗ trợ tra cứu miễn phí bộ 600 câu, lịch học, DAT và cách sử dụng website.";
  if(/cam on|thank/.test(value))return"Rất vui được hỗ trợ anh/chị. Hãy tiếp tục hỏi về 600 câu, DAT hoặc lịch học nhé.";
  if(/lich.*cabin|cabin.*lich/.test(value))return specificScheduleAnswer(["cabin"],"Lịch học Cabin");
  if(/lich.*(chay|hoc|thuc hanh)?\s*dat|dat.*lich/.test(value))return specificScheduleAnswer(["dat_practice","dat_auto_start","dat_auto_end","dat_manual_start","dat_manual_end"],"Lịch chạy DAT");
  if(/lich.*(thi)?\s*tot nghiep|tot nghiep.*lich/.test(value))return specificScheduleAnswer(["graduation"],"Lịch thi tốt nghiệp");
  if(/lich.*(thi)?\s*sat hach|sat hach.*lich/.test(value))return specificScheduleAnswer(["exam"],"Lịch thi sát hạch");
  if(/dang ky.*dat|dat.*dang ky/.test(value))return"Vào Cổng học viên → mục “Thực hành theo nhu cầu” → chọn “Đăng ký thực hành DAT” → chọn khung giờ còn chỗ → gửi yêu cầu. Ca chỉ có hiệu lực sau khi Admin duyệt và gửi thông báo.";
  if(/dat la gi|thuc hanh dat|hoc dat/.test(value))return"DAT là nội dung thực hành có thiết bị giám sát thời gian và quãng đường học lái trên xe. Học viên cần học đúng ca được xếp, mang giấy tờ theo hướng dẫn và thực hiện đủ nội dung của giáo viên. Muốn đăng ký, vào Cổng học viên → Thực hành theo nhu cầu → Đăng ký thực hành DAT.";
  if(/lich.*sap toi|ca hoc cua toi|xem.*lich|lich hoc/.test(value))return scheduleAnswer();
  if(/doi lich|huy lich|khong hoc duoc/.test(value))return"Bạn hãy mở ca học trong “Lịch đào tạo”, sau đó liên hệ Thầy Đạt để xin điều chỉnh. Không tự xem yêu cầu là đã đổi lịch cho đến khi có thông báo xác nhận của Admin.";
  if(/tien do|da hoc bao nhieu|ket qua hoc/.test(value))return progressAnswer();
  if(/diem liet/.test(value))return"Câu điểm liệt là câu bắt buộc không được trả lời sai trong bài thi thử. Bạn có thể chọn riêng mục “Câu điểm liệt” trong trang 600 câu để luyện tập.";
  if(/thi thu|hang a1|hang a\b|hang b\b|hang c1/.test(value))return"Vào trang 600 câu → chọn “Thi thử theo hạng” → chọn A1, A, B hoặc C1. Hệ thống chấm điểm, báo câu sai và kiểm tra câu điểm liệt.";
  if(/600 cau|ly thuyet|hoc cau hoi/.test(value))return"Bạn vào mục “Học lý thuyết” để học theo 6 chương, luyện câu sai, câu đã đánh dấu và câu điểm liệt. Có thể gõ “Tra cứu câu 123” để xem nhanh đáp án một câu cụ thể.";
  if(/tao tai khoan|dang ky tai khoan/.test(value))return"Tại trang đăng nhập, bấm “Tạo tài khoản học 600 câu”, nhập họ tên, số điện thoại, tên đăng nhập và mật khẩu. Tài khoản bên ngoài chỉ truy cập phần học lý thuyết.";
  if(/mat khau|khong dang nhap|quen.*khau/.test(value))return"Nếu đã đăng nhập, chọn “Đổi mật khẩu”. Nếu quên mật khẩu hoặc không đăng nhập được, liên hệ Thầy Đạt qua Zalo để được đặt lại tài khoản.";
  if(/hoc phi|da dong bao nhieu|con no bao nhieu|con thieu bao nhieu|dong tien|thanh toan|qr/.test(value))return tuitionAnswer();
  if(/lien he|zalo|so dien thoai|thay dat/.test(value))return"Liên hệ Thầy Đạt qua Zalo: 0984 811 037. Khi cần hỗ trợ tài khoản, hãy gửi họ tên và tên đăng nhập; không gửi mật khẩu hoặc mã OTP.";
  if(/ca hoc rieng/.test(value))return"“Tạo ca học riêng” là chức năng của Admin để xếp trực tiếp một buổi học cho một học viên. Khi lưu, ca sẽ xuất hiện trong lịch và thông báo của học viên.";
  return"Tôi chưa nhận ra nội dung này. Anh/chị có thể hỏi theo mẫu: “Tra cứu câu 125”, “DAT là gì?”, “Lịch học sắp tới” hoặc “Cách thi thử”. Nếu cần hỗ trợ riêng, liên hệ Zalo Thầy Đạt: 0984 811 037.";
}
async function localReply(query){
  const value=normalize(query),shown=currentQuestion();
  const asksCurrent=/cau nay|dap an|giai thich|meo ghi nho|vi sao/.test(value);
  if(shown&&asksCurrent)return explainQuestion(shown,query);
  const requested=await questionFromQuery(query);
  if(requested?.invalid)return`Số câu hợp lệ từ 1 đến 600. Không có câu ${requested.id}.`;
  if(requested)return explainQuestion(requested,query);
  if(asksCurrent&&!shown)return"Hãy mở một câu trong trang “600 câu hỏi”, sau đó bấm “Giải thích câu này dễ hiểu”.";
  return faqAnswer(query);
}

function readHistory(){
  try{return JSON.parse(sessionStorage.getItem(HISTORY_KEY)||"[]").filter(item=>["user","assistant"].includes(item.role)&&typeof item.content==="string").slice(-MAX_HISTORY)}catch{return[]}
}
function writeHistory(messages){
  try{sessionStorage.setItem(HISTORY_KEY,JSON.stringify(messages.slice(-MAX_HISTORY)))}catch{}
}

function buildChat(){
  const launcher=document.createElement("button");
  launcher.type="button";launcher.className="ai-chat-launcher";launcher.setAttribute("aria-label","Mở Trợ lý của Đạt");launcher.setAttribute("aria-expanded","false");
  launcher.innerHTML='<span class="ai-chat-launcher__mark" aria-hidden="true"><img src="/tro-ly-cua-dat.png?v=1" alt=""></span><span class="ai-chat-launcher__label">Trợ lý của Đạt</span><i class="ai-chat-launcher__dot" aria-hidden="true"></i>';

  const panel=document.createElement("section");
  panel.className="ai-chat-panel";panel.setAttribute("aria-label","Trợ lý của Đạt");panel.setAttribute("aria-hidden","true");
  panel.innerHTML=`
    <header class="ai-chat-header">
      <span class="ai-chat-avatar" aria-hidden="true"><img src="/tro-ly-cua-dat.png?v=1" alt=""></span>
      <div class="ai-chat-title"><strong>Trợ lý của Đạt</strong><span><i></i> Tra cứu tự động miễn phí</span></div>
      <div class="ai-chat-header-actions"><button class="ai-chat-icon-btn ai-chat-clear" type="button" aria-label="Xóa cuộc trò chuyện" title="Xóa cuộc trò chuyện">↻</button><button class="ai-chat-icon-btn ai-chat-close" type="button" aria-label="Đóng">×</button></div>
    </header>
    <div class="ai-chat-messages" aria-live="polite"></div>
    <div class="ai-chat-suggestions"></div>
    <form class="ai-chat-form"><textarea rows="1" maxlength="500" placeholder="Hỏi về 600 câu, lịch học, DAT…" aria-label="Nội dung câu hỏi"></textarea><button class="ai-chat-send" type="submit" aria-label="Gửi câu hỏi">↑</button></form>
    <p class="ai-chat-note">Trợ lý tra cứu dữ liệu có sẵn, không dùng API trả phí. Lịch chính thức theo thông báo của Thầy Đạt.</p>`;
  document.body.append(launcher,panel);

  const messagesEl=panel.querySelector(".ai-chat-messages"),suggestionsEl=panel.querySelector(".ai-chat-suggestions"),form=panel.querySelector("form"),input=panel.querySelector("textarea"),send=panel.querySelector(".ai-chat-send");
  let messages=readHistory(),busy=false;

  function appendMessage(role,content,{temporary=false,error=false}={}){
    const row=document.createElement("div");row.className=`ai-chat-message ${role}`;
    if(role==="assistant"){const avatar=document.createElement("span");avatar.className="ai-chat-mini-avatar";avatar.innerHTML='<img src="/tro-ly-cua-dat.png?v=1" alt="">';row.append(avatar)}
    const bubble=document.createElement("div");bubble.className=`ai-chat-bubble${error?" ai-chat-error":""}`;
    if(temporary)bubble.innerHTML='<span class="ai-chat-typing" aria-label="Đang tra cứu"><i></i><i></i><i></i></span>';else bubble.textContent=content;
    row.append(bubble);messagesEl.append(row);messagesEl.scrollTop=messagesEl.scrollHeight;return row;
  }
  function render(){
    messagesEl.textContent="";
    if(!messages.length)appendMessage("assistant","Chào anh/chị! Tôi hỗ trợ miễn phí việc tra cứu 600 câu, lịch học, DAT và cách sử dụng website. Anh/chị cần hỏi gì?");
    else messages.forEach(item=>appendMessage(item.role,item.content));
  }
  function setOpen(open){panel.classList.toggle("is-open",open);panel.setAttribute("aria-hidden",String(!open));launcher.setAttribute("aria-expanded",String(open));if(open)setTimeout(()=>input.focus(),180)}
  function resizeInput(){input.style.height="auto";input.style.height=`${Math.min(input.scrollHeight,112)}px`}
  async function ask(content){
    const question=content.trim();if(!question||busy)return;
    busy=true;send.disabled=true;input.value="";resizeInput();suggestionsEl.hidden=true;
    messages.push({role:"user",content:question});messages=messages.slice(-MAX_HISTORY);writeHistory(messages);appendMessage("user",question);
    const typing=appendMessage("assistant","",{temporary:true});
    try{
      const answer=await localReply(question);
      await new Promise(resolve=>setTimeout(resolve,260));
      typing.remove();messages.push({role:"assistant",content:answer});messages=messages.slice(-MAX_HISTORY);writeHistory(messages);appendMessage("assistant",answer);
    }catch(error){typing.remove();appendMessage("assistant",error?.message||"Không thể tra cứu lúc này.",{error:true})}
    finally{busy=false;send.disabled=false;suggestionsEl.hidden=false;input.focus()}
  }

  suggestionsEl.innerHTML=pageSuggestions().map(text=>`<button class="ai-chat-suggestion" type="button">${text}</button>`).join("");
  suggestionsEl.addEventListener("click",event=>{const button=event.target.closest("button");if(button)ask(button.textContent)});
  launcher.addEventListener("click",()=>setOpen(!panel.classList.contains("is-open")));
  panel.querySelector(".ai-chat-close").addEventListener("click",()=>setOpen(false));
  panel.querySelector(".ai-chat-clear").addEventListener("click",()=>{messages=[];writeHistory(messages);render();suggestionsEl.hidden=false});
  form.addEventListener("submit",event=>{event.preventDefault();ask(input.value)});
  input.addEventListener("input",resizeInput);
  input.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();form.requestSubmit()}});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&panel.classList.contains("is-open"))setOpen(false)});
  render();
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",buildChat);else buildChat();
