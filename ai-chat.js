import "./ai-chat.css";

const CHAT_ENDPOINT="/api/chat";
const HISTORY_KEY="thay_dat_ai_chat_v1";
const MAX_HISTORY=8;

const pageSuggestions=()=>{
  if(location.pathname.includes("600-cau-hoi"))return["Giải thích câu này dễ hiểu","Mẹo ghi nhớ đáp án","Vì sao các đáp án khác sai?"];
  if(location.pathname.includes("lich-dao-tao"))return["Cách xem ca học của tôi?","DAT là gì?","Tôi muốn đổi lịch học"];
  if(location.pathname.includes("hoc-vien"))return["Lịch học sắp tới của tôi","Cách đăng ký thực hành DAT","Xem tiến độ 600 câu"];
  return["Hướng dẫn học 600 câu","Cách tạo tài khoản học","Liên hệ Thầy Đạt"];
};

function textOf(selector){
  const element=document.querySelector(selector);
  if(!element||element.classList.contains("hidden"))return"";
  return element.textContent?.replace(/\s+/g," ").trim()||"";
}

function collectPageContext(){
  const details=[`Trang hiện tại: ${document.title}`];
  const question=typeof window.__THAY_DAT_AI_CONTEXT__==="function"?window.__THAY_DAT_AI_CONTEXT__():null;
  if(question)details.push(`Câu hỏi đang xem: ${JSON.stringify(question)}`);
  else{
    const questionText=textOf("#questionText");
    if(questionText)details.push(`${textOf("#questionNumber")}: ${questionText}`,`Các lựa chọn: ${textOf("#answerOptions")}`,`Phản hồi: ${textOf("#answerFeedback")}`);
  }
  const studentName=textOf("#studentName");
  if(studentName)details.push(`Tên hiển thị: ${studentName}`);
  const upcoming=textOf("#studentUpcoming");
  if(upcoming)details.push(`Lịch sắp tới đang hiển thị: ${upcoming}`);
  const schedule=textOf("#scheduleList")||textOf("#scheduleTimeline");
  if(schedule)details.push(`Lịch đang hiển thị: ${schedule}`);
  return details.join("\n").slice(0,3500);
}

function readHistory(){
  try{return JSON.parse(sessionStorage.getItem(HISTORY_KEY)||"[]").filter(item=>["user","assistant"].includes(item.role)&&typeof item.content==="string").slice(-MAX_HISTORY)}catch{return[]}
}
function writeHistory(messages){
  try{sessionStorage.setItem(HISTORY_KEY,JSON.stringify(messages.slice(-MAX_HISTORY)))}catch{}
}

function buildChat(){
  const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
  if(!token)return;
  const launcher=document.createElement("button");
  launcher.type="button";launcher.className="ai-chat-launcher";launcher.setAttribute("aria-label","Mở trợ lý AI Thầy Đạt");launcher.setAttribute("aria-expanded","false");
  launcher.innerHTML='<span class="ai-chat-launcher__mark" aria-hidden="true">✦</span><span class="ai-chat-launcher__label">Hỏi trợ lý AI<small>HỖ TRỢ HỌC LÁI XE</small></span><i class="ai-chat-launcher__dot" aria-hidden="true"></i>';

  const panel=document.createElement("section");
  panel.className="ai-chat-panel";panel.setAttribute("aria-label","Trợ lý AI Thầy Đạt");panel.setAttribute("aria-hidden","true");
  panel.innerHTML=`
    <header class="ai-chat-header">
      <span class="ai-chat-avatar" aria-hidden="true">✦</span>
      <div class="ai-chat-title"><strong>Trợ lý AI Thầy Đạt</strong><span><i></i> Sẵn sàng hỗ trợ học lái xe</span></div>
      <div class="ai-chat-header-actions"><button class="ai-chat-icon-btn ai-chat-clear" type="button" aria-label="Xóa cuộc trò chuyện" title="Xóa cuộc trò chuyện">↻</button><button class="ai-chat-icon-btn ai-chat-close" type="button" aria-label="Đóng">×</button></div>
    </header>
    <div class="ai-chat-messages" aria-live="polite"></div>
    <div class="ai-chat-suggestions"></div>
    <form class="ai-chat-form"><textarea rows="1" maxlength="1200" placeholder="Hỏi về 600 câu, lịch học, DAT…" aria-label="Nội dung câu hỏi"></textarea><button class="ai-chat-send" type="submit" aria-label="Gửi câu hỏi">↑</button></form>
    <p class="ai-chat-note">AI hỗ trợ học tập, có thể nhầm lẫn. Nội dung lịch học chính thức theo thông báo của Thầy Đạt.</p>`;
  document.body.append(launcher,panel);

  const messagesEl=panel.querySelector(".ai-chat-messages"),suggestionsEl=panel.querySelector(".ai-chat-suggestions"),form=panel.querySelector("form"),input=panel.querySelector("textarea"),send=panel.querySelector(".ai-chat-send");
  let messages=readHistory(),busy=false;

  function appendMessage(role,content,{temporary=false,error=false}={}){
    const row=document.createElement("div");row.className=`ai-chat-message ${role}`;
    if(role==="assistant"){const avatar=document.createElement("span");avatar.className="ai-chat-mini-avatar";avatar.textContent="AI";row.append(avatar)}
    const bubble=document.createElement("div");bubble.className=`ai-chat-bubble${error?" ai-chat-error":""}`;
    if(temporary)bubble.innerHTML='<span class="ai-chat-typing" aria-label="AI đang trả lời"><i></i><i></i><i></i></span>';else bubble.textContent=content;
    row.append(bubble);messagesEl.append(row);messagesEl.scrollTop=messagesEl.scrollHeight;return row;
  }
  function render(){
    messagesEl.textContent="";
    if(!messages.length)appendMessage("assistant","Chào anh/chị! Tôi có thể giải thích 600 câu lý thuyết, hướng dẫn đăng ký lịch học và hỗ trợ về DAT. Anh/chị cần hỏi gì?");
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
      const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
      const authKind=localStorage.getItem("hv_auth_kind")||sessionStorage.getItem("hv_auth_kind")||"";
      const response=await fetch(CHAT_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,authKind,messages,context:collectPageContext()})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.error||"Trợ lý AI chưa thể trả lời lúc này.");
      const answer=String(data.answer||"").trim()||"Tôi chưa có câu trả lời phù hợp. Anh/chị thử hỏi rõ hơn nhé.";
      typing.remove();messages.push({role:"assistant",content:answer});messages=messages.slice(-MAX_HISTORY);writeHistory(messages);appendMessage("assistant",answer);
    }catch(error){typing.remove();appendMessage("assistant",error?.message||"Không thể kết nối trợ lý AI.",{error:true})}
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
