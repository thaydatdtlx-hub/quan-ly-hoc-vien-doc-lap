import "./admin-assistant.css";

const HISTORY_KEY="thay_dat_admin_assistant_v1";
const MAX_HISTORY=12;
const SUGGESTIONS=["Tổng quan hôm nay","Ai còn nợ học phí?","Học viên cần cảnh báo","Ai chưa học 600 câu?","Ai có chuyên cần thấp?","Lịch học 30 ngày tới"];
const STOP_WORDS=new Set(["tim","kiem","tra","cuu","hoc","vien","thong","tin","cua","cho","toi","xem","ho","so","hoc","phi","ly","thuyet","diem","danh","so","dien","thoai","ma"]);

const normalize=value=>String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const money=value=>new Intl.NumberFormat("vi-VN").format(Number(value)||0)+" ₫";
const duration=minutes=>{const value=Math.max(0,Number(minutes)||0),hours=Math.floor(value/60),rest=value%60;return hours?`${hours} giờ${rest?` ${rest} phút`:""}`:`${rest} phút`};
const dateTime=value=>{const parsed=new Date(value);return Number.isNaN(parsed.valueOf())?"Chưa cập nhật":new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(parsed)};
const context=()=>typeof window.__THAY_DAT_ADMIN_ASSISTANT_CONTEXT__==="function"?window.__THAY_DAT_ADMIN_ASSISTANT_CONTEXT__():null;

function studentScore(student,query){
  const q=normalize(query),fields=[student.studentCode,student.phone,student.cccd].map(normalize).filter(Boolean),name=normalize(student.name);
  if(fields.some(value=>q.includes(value)))return 120;
  if(name.length>=4&&q.includes(name))return 110;
  const tokens=q.split(" ").filter(token=>token.length>=2&&!STOP_WORDS.has(token));
  if(!tokens.length)return 0;
  const haystack=normalize(`${student.name} ${student.studentCode} ${student.phone} ${student.cccd}`),matched=tokens.filter(token=>haystack.includes(token)).length;
  return matched===tokens.length?60+matched:matched>=2?30+matched:0;
}
function matchedStudents(data,query){return data.students.map(student=>({student,score:studentScore(student,query)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.student.name.localeCompare(b.student.name,"vi")).map(item=>item.student)}
function card(student,note=""){
  return{student,note:note||`${student.phone||"Chưa có SĐT"} · ${student.course||"Chưa có khóa"} · Hạng ${student.licenseClass||"—"}`};
}
function studentDetail(student){
  const warnings=student.warnings.length?`${student.warnings.length} cảnh báo (${student.warnings.map(item=>item.title).slice(0,2).join("; ")})`:"Không có cảnh báo";
  const best=student.theory.bestTotal?`${student.theory.bestScore}/${student.theory.bestTotal}`:"Chưa thi";
  const next=student.upcoming[0]?`${dateTime(student.upcoming[0].date)}${student.upcoming[0].location?` · ${student.upcoming[0].location}`:""}`:"Chưa có lịch sắp tới";
  return{
    text:[
      `${student.name} · ${student.studentCode||"Chưa có mã"}`,
      `Điện thoại: ${student.phone||"Chưa cập nhật"} · CCCD: ${student.cccd||"Chưa cập nhật"}`,
      `Khóa: ${student.course||"Chưa cập nhật"} · Hạng ${student.licenseClass||"—"}`,
      `Học phí: ${money(student.tuitionTotal)} · Đã đóng ${money(student.paid)} · Còn ${money(student.debt)}`,
      `Lý thuyết: ${student.theory.answered}/600 câu · ${student.theory.exams} bài thi · Tốt nhất ${best}`,
      `Chuyên cần: ${student.attendance.present}/${student.attendance.sessions} buổi · ${duration(student.attendance.actualMinutes)} · ${student.attendance.rate}%`,
      `Tiến độ: Online ${student.onlineStatus||"—"} · Cabin ${student.cabinStatus||"—"} · DAT ${student.datStatus||"—"}`,
      `Cảnh báo: ${warnings}`,
      `Lịch gần nhất: ${next}`
    ].join("\n"),cards:[card(student)]
  };
}
function overview(data){
  const total=data.students.length,learning=data.students.filter(item=>!/da dau|da nhan bang/.test(normalize(item.examStatus))).length,debtStudents=data.students.filter(item=>item.debt>0),debt=debtStudents.reduce((sum,item)=>sum+item.debt,0),activeTheory=data.students.filter(item=>item.theory.answered>0||item.theory.exams>0).length,lowAttendance=data.students.filter(item=>item.attendance.sessions>=2&&item.attendance.rate<80).length;
  return{text:`Tổng quan hiện tại: ${total} học viên; ${learning} đang học; ${debtStudents.length} học viên còn nợ ${money(debt)}; ${data.warnings.length} cảnh báo; ${activeTheory} học viên đã bắt đầu 600 câu; ${lowAttendance} học viên có chuyên cần dưới 80%.`,metrics:[{label:"Học viên",value:total},{label:"Còn nợ",value:debtStudents.length},{label:"Cảnh báo",value:data.warnings.length},{label:"Đã học 600 câu",value:activeTheory}]};
}
function listResult(text,students,note){return{text,cards:students.slice(0,8).map(student=>card(student,typeof note==="function"?note(student):note)),truncated:students.length>8}}
function answer(query){
  const data=context();if(!data?.students)return{text:"Dữ liệu Admin đang được tải. Vui lòng chờ vài giây rồi hỏi lại."};
  const q=normalize(query),matches=matchedStudents(data,query);
  if(matches.length===1&&studentScore(matches[0],query)>=60)return studentDetail(matches[0]);
  if(matches.length>1&&studentScore(matches[0],query)>=60)return listResult(`Tìm thấy ${matches.length} học viên phù hợp.`,matches,student=>`${student.studentCode||"Chưa có mã"} · ${student.phone||"Chưa có SĐT"}`);
  if(/tong quan|hom nay|bao cao nhanh|tinh hinh/.test(q))return overview(data);
  if(/con no|no hoc phi|hoc phi chua|chua dong|con thieu/.test(q)){
    const items=data.students.filter(item=>item.debt>0).sort((a,b)=>b.debt-a.debt),total=items.reduce((sum,item)=>sum+item.debt,0);
    return listResult(`${items.length} học viên còn nợ tổng cộng ${money(total)}.`,items,student=>`Còn ${money(student.debt)} · Đã đóng ${money(student.paid)}`);
  }
  if(/canh bao|can ho tro|khẩn|khan|uu tien/.test(q)){
    const ids=[...new Set(data.warnings.map(item=>item.studentId))],items=ids.map(id=>data.students.find(student=>student.id===id)).filter(Boolean).sort((a,b)=>b.warnings.length-a.warnings.length);
    return listResult(`${data.warnings.length} cảnh báo đang liên quan đến ${items.length} học viên.`,items,student=>student.warnings.map(item=>item.title).slice(0,2).join(" · "));
  }
  if(/chua hoc 600|chua bat dau.*600|ly thuyet.*chua|chua thi thu/.test(q)){
    const items=data.students.filter(item=>item.theory.answered===0&&item.theory.exams===0);
    return listResult(`${items.length} học viên chưa bắt đầu học hoặc thi thử 600 câu.`,items,"Chưa có dữ liệu học và thi thử");
  }
  if(/600 cau|ly thuyet|thi thu|ket qua thi/.test(q)){
    const items=data.students.filter(item=>item.theory.answered>0||item.theory.exams>0).sort((a,b)=>b.theory.answered-a.theory.answered);
    return listResult(`${items.length} học viên đã có hoạt động lý thuyết.`,items,student=>`${student.theory.answered}/600 câu · ${student.theory.exams} bài thi · ${student.theory.passedExams} bài đạt`);
  }
  if(/chuyen can thap|vang|diem danh|gio hoc|thuc hoc/.test(q)){
    const items=data.students.filter(item=>item.attendance.absent>0||item.attendance.excused>0||(item.attendance.sessions>=2&&item.attendance.rate<80)).sort((a,b)=>a.attendance.rate-b.attendance.rate);
    return listResult(`${items.length} học viên cần kiểm tra chuyên cần hoặc giờ thực học.`,items,student=>`${student.attendance.rate}% · ${student.attendance.absent} vắng · ${duration(student.attendance.actualMinutes)}`);
  }
  if(/ho so thieu|thieu ho so|ho so chua/.test(q)){
    const items=data.students.filter(item=>item.warnings.some(warning=>warning.type==="profile")||/chua|thieu/.test(normalize(item.profileStatus)));
    return listResult(`${items.length} học viên có hồ sơ cần kiểm tra.`,items,student=>student.profileStatus||"Hồ sơ chưa hoàn tất");
  }
  if(/lich|ca hoc|sap toi|30 ngay/.test(q)){
    const limit=Date.now()+30*86400000,items=data.students.map(student=>({student,event:student.upcoming.find(event=>new Date(event.date).valueOf()<=limit)})).filter(item=>item.event).sort((a,b)=>new Date(a.event.date)-new Date(b.event.date));
    return{text:`Có ${items.length} học viên có lịch trong 30 ngày tới.`,cards:items.slice(0,8).map(item=>card(item.student,`${dateTime(item.event.date)}${item.event.location?` · ${item.event.location}`:""}`)),truncated:items.length>8,globalAction:"schedule"};
  }
  if(matches.length)return listResult(`Tìm thấy ${matches.length} học viên có thông tin gần giống.`,matches,student=>`${student.studentCode||"Chưa có mã"} · ${student.phone||"Chưa có SĐT"}`);
  if(/tim|kiem|tra cuu|hoc vien|so dien thoai|ma hoc vien/.test(q))return{text:"Hãy nhập thêm họ tên, mã học viên, số điện thoại hoặc CCCD cần tìm. Ví dụ: “Tra cứu Nguyễn Văn An” hoặc “Tìm 0984…”."};
  return{text:"Tôi chưa xác định được yêu cầu. Admin có thể hỏi về tổng quan, công nợ, cảnh báo, hồ sơ thiếu, 600 câu, điểm danh, lịch học hoặc nhập trực tiếp tên/SĐT/mã học viên."};
}

function readHistory(){try{return JSON.parse(sessionStorage.getItem(HISTORY_KEY)||"[]").filter(item=>["user","assistant"].includes(item.role)&&typeof item.text==="string").slice(-MAX_HISTORY)}catch{return[]}}
function writeHistory(items){try{sessionStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(-MAX_HISTORY)))}catch{}}

function buildAssistant(){
  if(document.querySelector(".admin-assistant-launcher"))return;
  const launcher=document.createElement("button");launcher.type="button";launcher.className="admin-assistant-launcher";launcher.hidden=true;launcher.setAttribute("aria-label","Mở Trợ lý Admin");launcher.setAttribute("aria-expanded","false");
  launcher.innerHTML='<span class="admin-assistant-launcher__mark"><img src="/tro-ly-cua-dat.png?v=1" alt=""></span><span class="admin-assistant-launcher__copy"><strong>Trợ lý Admin</strong><small>Tra cứu dữ liệu nhanh</small></span><i></i>';
  const panel=document.createElement("section");panel.className="admin-assistant-panel";panel.hidden=true;panel.setAttribute("aria-label","Trợ lý tra cứu dành cho Admin");panel.setAttribute("aria-hidden","true");
  panel.innerHTML=`<header class="admin-assistant-header"><span class="admin-assistant-avatar"><img src="/tro-ly-cua-dat.png?v=1" alt=""></span><div><strong>Trợ lý Admin</strong><small><i></i> Tra cứu dữ liệu hệ thống</small></div><button class="admin-assistant-clear" type="button" aria-label="Xóa lịch sử" title="Xóa lịch sử">↻</button><button class="admin-assistant-close" type="button" aria-label="Đóng">×</button></header><div class="admin-assistant-privacy"><span>ADMIN</span>Dữ liệu chỉ hiển thị trong phiên quản trị đang đăng nhập.</div><div class="admin-assistant-messages" aria-live="polite"></div><div class="admin-assistant-suggestions"></div><form class="admin-assistant-form"><textarea rows="1" maxlength="240" placeholder="Tên, SĐT, mã học viên hoặc câu hỏi…" aria-label="Nội dung tra cứu"></textarea><button type="submit" aria-label="Tra cứu"><svg viewBox="0 0 24 24"><path d="m5 12 14-7-4 14-3-6Z"></path></svg></button></form>`;
  document.body.append(launcher,panel);
  const messagesEl=panel.querySelector(".admin-assistant-messages"),suggestionsEl=panel.querySelector(".admin-assistant-suggestions"),form=panel.querySelector("form"),input=panel.querySelector("textarea"),send=form.querySelector("button");let history=readHistory(),busy=false;
  function resultCard(item){
    const student=item.student,article=document.createElement("article");article.className="admin-assistant-result";const main=document.createElement("div"),title=document.createElement("strong"),meta=document.createElement("small"),note=document.createElement("p"),actions=document.createElement("div");title.textContent=student.name;meta.textContent=`${student.studentCode||"Chưa có mã"} · ${student.phone||"Chưa có SĐT"}`;note.textContent=item.note||"";main.append(title,meta,note);for(const [action,label] of [["profile","Hồ sơ"],["payment","Học phí"],["theory","600 câu"],["attendance","Điểm danh"]]){const button=document.createElement("button");button.type="button";button.dataset.adminAssistantAction=action;button.dataset.studentId=student.id;button.textContent=label;actions.append(button)}article.append(main,actions);return article;
  }
  function append(role,payload,{temporary=false}={}){
    const row=document.createElement("div");row.className=`admin-assistant-message ${role}`;if(role==="assistant"){const mark=document.createElement("span");mark.className="admin-assistant-mini";mark.innerHTML='<img src="/tro-ly-cua-dat.png?v=1" alt="">';row.append(mark)}const content=document.createElement("div");content.className="admin-assistant-bubble";
    if(temporary)content.innerHTML='<span class="admin-assistant-loading"><i></i><i></i><i></i></span>';else{const copy=document.createElement("p");copy.textContent=payload.text;content.append(copy);if(payload.metrics){const metrics=document.createElement("div");metrics.className="admin-assistant-metrics";for(const item of payload.metrics){const cell=document.createElement("span"),value=document.createElement("b"),label=document.createElement("small");value.textContent=item.value;label.textContent=item.label;cell.append(value,label);metrics.append(cell)}content.append(metrics)}if(payload.cards?.length){const list=document.createElement("div");list.className="admin-assistant-results";payload.cards.forEach(item=>list.append(resultCard(item)));content.append(list);if(payload.truncated){const more=document.createElement("small");more.className="admin-assistant-more";more.textContent="Đang hiển thị 8 kết quả đầu tiên. Hãy nhập tên hoặc mã để thu hẹp.";content.append(more)}}if(payload.globalAction){const button=document.createElement("button");button.type="button";button.className="admin-assistant-global-action";button.dataset.adminAssistantAction=payload.globalAction;button.textContent="Mở lịch đào tạo";content.append(button)}}row.append(content);messagesEl.append(row);messagesEl.scrollTop=messagesEl.scrollHeight;return row;
  }
  function render(){messagesEl.textContent="";if(!history.length)append("assistant",{text:"Chào Admin! Tôi có thể tìm nhanh học viên và tổng hợp học phí, 600 câu, điểm danh, lịch học hoặc cảnh báo. Hãy nhập tên, số điện thoại, mã học viên hoặc chọn câu hỏi bên dưới."});else history.forEach(item=>append(item.role,{text:item.text}))}
  function setOpen(open){panel.classList.toggle("is-open",open);panel.setAttribute("aria-hidden",String(!open));launcher.setAttribute("aria-expanded",String(open));if(open)setTimeout(()=>input.focus(),160)}
  function resize(){input.style.height="auto";input.style.height=`${Math.min(input.scrollHeight,104)}px`}
  async function ask(value){const query=value.trim();if(!query||busy)return;busy=true;send.disabled=true;input.value="";resize();history.push({role:"user",text:query});history=history.slice(-MAX_HISTORY);writeHistory(history);append("user",{text:query});const loading=append("assistant",{text:""},{temporary:true});await new Promise(resolve=>setTimeout(resolve,180));const reply=answer(query);loading.remove();history.push({role:"assistant",text:reply.text});history=history.slice(-MAX_HISTORY);writeHistory(history);append("assistant",reply);busy=false;send.disabled=false;input.focus()}
  suggestionsEl.innerHTML=SUGGESTIONS.map(text=>`<button type="button">${text}</button>`).join("");suggestionsEl.addEventListener("click",event=>{const button=event.target.closest("button");if(button)ask(button.textContent)});
  panel.addEventListener("click",event=>{const button=event.target.closest("[data-admin-assistant-action]");if(!button)return;const worked=window.__THAY_DAT_ADMIN_ASSISTANT_ACTION__?.(button.dataset.adminAssistantAction,button.dataset.studentId||"");if(worked&&button.dataset.adminAssistantAction!=="schedule")setOpen(false)});
  launcher.addEventListener("click",()=>setOpen(!panel.classList.contains("is-open")));panel.querySelector(".admin-assistant-close").addEventListener("click",()=>setOpen(false));panel.querySelector(".admin-assistant-clear").addEventListener("click",()=>{history=[];writeHistory(history);render()});form.addEventListener("submit",event=>{event.preventDefault();ask(input.value)});input.addEventListener("input",resize);input.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();form.requestSubmit()}});document.addEventListener("keydown",event=>{if(event.key==="Escape"&&panel.classList.contains("is-open"))setOpen(false)});
  function enable(){const data=context(),allowed=data?.role==="admin";launcher.hidden=!allowed;panel.hidden=!allowed;if(allowed)document.querySelectorAll(".ai-chat-launcher,.ai-chat-panel").forEach(node=>node.remove());else setOpen(false)}window.addEventListener("thaydat:admin-context",enable);enable();render();
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",buildAssistant);else buildAssistant();
