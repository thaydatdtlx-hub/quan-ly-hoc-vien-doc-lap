import {SCHEDULE_FIELDS,parseScheduleFromNotes} from "./schedule-data.js";
import "./schedule-stat-links.css";

const $=id=>document.getElementById(id);
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
let unscheduledView=false;

function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]))}

async function rpc(fn,body={}){
  const response=await fetch(`https://pkzxkvcncipfszeukpwu.supabase.co/rest/v1/rpc/${fn}`,{
    method:"POST",
    headers:{apikey:"sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo","Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||"Không thể tải danh sách học viên.");
  return data;
}

function setActive(card){
  document.querySelectorAll(".schedule-stats article").forEach(item=>item.classList.toggle("is-active",item===card));
}

function scrollToList(){
  document.querySelector(".schedule-panel")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function applyPeriod(card,period){
  unscheduledView=false;
  setActive(card);
  const select=$("periodFilter");
  if(select){
    select.value=period;
    select.dispatchEvent(new Event("change",{bubbles:true}));
  }
  scrollToList();
}

function hasSchedule(student,sessions){
  if(sessions.some(item=>String(item.student_id)===String(student.id)))return true;
  const schedule=parseScheduleFromNotes(student.notes)||{dates:{}};
  return SCHEDULE_FIELDS.some(field=>Boolean(schedule.dates?.[field.key]));
}

async function showUnscheduled(card){
  unscheduledView=true;
  setActive(card);
  card.classList.add("is-loading");
  try{
    const [students,sessions]=await Promise.all([
      rpc("app_list_students",{p_token:token,p_owner_id:null}),
      rpc("app_list_training_sessions",{p_token:token,p_student_id:null}).catch(()=>[])
    ]);
    if(!unscheduledView)return;
    const items=(students||[]).filter(student=>!hasSchedule(student,sessions||[]));
    $("listTitle").textContent="Học viên chưa có lịch";
    $("listNote").textContent="Chọn học viên để tạo ca học riêng hoặc lập mốc đào tạo";
    $("resultCount").textContent=`${items.length} học viên`;
    $("emptyState")?.classList.add("hidden");
    $("eventList").innerHTML=items.length?`<div class="schedule-unscheduled-list">${items.map(student=>`
      <article class="schedule-unscheduled-card">
        <div class="schedule-unscheduled-person"><span>${esc((student.name||"?").trim().charAt(0).toUpperCase())}</span><div><strong>${esc(student.name||"Chưa có tên")}</strong><small>${esc(student.student_code||"Chưa có mã học viên")}</small></div></div>
        <div class="schedule-unscheduled-meta"><b>${esc(student.license_class||"Chưa có hạng")}</b><span>${esc(student.course||"Chưa có khóa học")}</span></div>
        <div class="schedule-unscheduled-actions"><a href="/lich-dao-tao.html?student=${encodeURIComponent(student.id)}&action=session">Tạo ca học riêng</a><a href="/lich-dao-tao.html?student=${encodeURIComponent(student.id)}&action=milestone">Lập mốc đào tạo</a></div>
      </article>`).join("")}</div>`:'<div class="schedule-unscheduled-empty"><strong>Tất cả học viên đã có lịch</strong><span>Hiện không còn học viên nào chưa được lập lịch đào tạo.</span></div>';
    scrollToList();
  }catch(error){
    alert(error?.message||"Không thể mở danh sách học viên chưa có lịch.");
  }finally{
    card.classList.remove("is-loading");
  }
}

function boot(){
  if(!document.getElementById("scheduleMain"))return;
  const cards=[...document.querySelectorAll(".schedule-stats article")];
  if(cards.length<4)return;
  cards.forEach(card=>{
    card.classList.add("schedule-stat-link");
    card.tabIndex=0;
    card.setAttribute("role","button");
  });
  const actions=[
    ()=>applyPeriod(cards[0],"upcoming"),
    ()=>applyPeriod(cards[1],"week"),
    ()=>showUnscheduled(cards[2]),
    ()=>applyPeriod(cards[3],"today")
  ];
  cards.forEach((card,index)=>{
    card.addEventListener("click",actions[index]);
    card.addEventListener("keydown",event=>{
      if(event.key!=="Enter"&&event.key!==" ")return;
      event.preventDefault();actions[index]();
    });
  });
  $("periodFilter")?.addEventListener("change",()=>{
    if(!unscheduledView)document.querySelectorAll(".schedule-stats article").forEach(item=>item.classList.remove("is-active"));
  });
  $("scheduleSearch")?.addEventListener("input",()=>{unscheduledView=false});
  $("typeFilter")?.addEventListener("change",()=>{unscheduledView=false});
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
