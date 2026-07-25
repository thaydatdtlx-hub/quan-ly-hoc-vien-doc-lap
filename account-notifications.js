import {SCHEDULE_FIELDS,parseScheduleFromNotes} from "./schedule-data.js";

function normalize(value){
  return String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
}
function money(value){return new Intl.NumberFormat("vi-VN").format(Number(value||0))+" ₫"}
function scheduleOf(student){return parseScheduleFromNotes(student.notes||"")||{dates:{},locations:{},note:""}}
function startOfToday(){const value=new Date();value.setHours(0,0,0,0);return value}
function formatDate(value){
  const date=new Date(value);
  return new Intl.DateTimeFormat("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(date);
}
function scheduleEvents(students){
  return students.flatMap(student=>{
    const schedule=scheduleOf(student);
    const fixed=SCHEDULE_FIELDS.filter(field=>schedule.dates?.[field.key]).map(field=>({
      id:`${student.id}-${field.key}-${schedule.dates[field.key]}`,
      student,field,date:schedule.dates[field.key],location:schedule.locations?.[field.key]||""
    }));
    const repeat=(student.training_sessions||[]).map(session=>({
      id:String(session.id),
      student,
      field:SCHEDULE_FIELDS.find(field=>field.key===session.session_type),
      date:session.starts_at,
      location:session.location||""
    })).filter(event=>event.field);
    return[...fixed,...repeat];
  }).filter(event=>!Number.isNaN(new Date(event.date).valueOf())).sort((a,b)=>new Date(a.date)-new Date(b.date));
}

export function managerNotifications(students,role="user"){
  const notices=[],today=startOfToday(),weekEnd=new Date(today);weekEnd.setDate(weekEnd.getDate()+7);weekEnd.setHours(23,59,59,999);
  const debtStudents=students.filter(student=>(Number(student.tuition_total)||0)>(Number(student.paid)||0));
  const debt=debtStudents.reduce((sum,student)=>sum+Math.max(0,(Number(student.tuition_total)||0)-(Number(student.paid)||0)),0);
  if(debtStudents.length)notices.push({
    id:`debt-${debtStudents.length}-${debt}`,tone:"orange",icon:"₫",title:`${debtStudents.length} học viên còn nợ học phí`,
    body:`Tổng số tiền cần thu: ${money(debt)}.`,action:"Xem danh sách công nợ"
  });

  const upcoming=scheduleEvents(students).filter(event=>new Date(event.date)>=today&&new Date(event.date)<=weekEnd);
  if(upcoming.length)notices.push({
    id:`week-${upcoming.map(event=>`${event.student.id}-${event.field.key}-${event.date}`).join("-")}`,tone:"blue",icon:"▣",
    title:`${upcoming.length} lịch đào tạo trong 7 ngày tới`,
    body:`Gần nhất: ${upcoming[0].field.label} của ${upcoming[0].student.name} · ${formatDate(upcoming[0].date)}.`,
    href:"/lich-dao-tao.html",action:"Mở lịch đào tạo"
  });

  const unscheduled=students.filter(student=>!SCHEDULE_FIELDS.some(field=>scheduleOf(student).dates?.[field.key]));
  if(unscheduled.length)notices.push({
    id:`unscheduled-${unscheduled.map(student=>student.id).join("-")}`,tone:"violet",icon:"◷",
    title:`${unscheduled.length} học viên chưa có lịch đào tạo`,
    body:"Cần bổ sung ít nhất một mốc lịch học hoặc lịch thi.",href:"/lich-dao-tao.html",action:"Lập lịch ngay"
  });

  const incomplete=students.filter(student=>normalize(student.profile_status).includes("thieu"));
  if(incomplete.length)notices.push({
    id:`profiles-${incomplete.map(student=>student.id).join("-")}`,tone:"red",icon:"!",title:`${incomplete.length} hồ sơ đang thiếu`,
    body:`${incomplete.slice(0,3).map(student=>student.name).join(", ")}${incomplete.length>3?"…":""}.`,action:"Kiểm tra hồ sơ"
  });

  if(role==="admin")notices.unshift({
    id:`admin-summary-${students.length}`,tone:"green",icon:"✓",title:"Tổng quan hệ thống",
    body:`Hệ thống đang quản lý ${students.length} học viên. Các thông báo được cập nhật tự động theo dữ liệu mới.`
  });
  return notices;
}

export function studentNotifications(student){
  const notices=[],today=startOfToday(),total=Math.max(0,Number(student.tuition_total)||0),paid=Math.max(0,Number(student.paid)||0),debt=Math.max(0,total-paid);
  if(debt)notices.push({
    id:`student-debt-${debt}`,tone:"orange",icon:"₫",title:"Học phí chưa hoàn tất",
    body:`Anh/chị còn ${money(debt)} cần hoàn tất. Đã đóng ${money(paid)} trên tổng ${money(total)}.`
  });
  else if(total)notices.push({id:`student-paid-${total}`,tone:"green",icon:"✓",title:"Đã hoàn tất học phí",body:`Hệ thống đã ghi nhận đủ ${money(total)}.`});

  const events=scheduleEvents([student]).filter(event=>new Date(event.date)>=today).slice(0,3);
  if(events.length){
    for(const event of events)notices.push({
      id:`student-event-${event.id||`${event.field.key}-${event.date}`}`,tone:event.field.tone||"blue",icon:event.field.icon,
      title:event.field.label,body:`${formatDate(event.date)}${event.location?` · ${event.location}`:" · Chưa cập nhật địa điểm"}`,
      href:"/lich-dao-tao.html",action:"Xem lịch chi tiết"
    });
  }else notices.push({
    id:"student-no-schedule",tone:"violet",icon:"◷",title:"Chưa có lịch đào tạo sắp tới",
    body:"Lịch học và lịch thi mới sẽ xuất hiện tại đây khi trung tâm cập nhật."
  });

  if(normalize(student.profile_status).includes("thieu"))notices.push({
    id:"student-profile-missing",tone:"red",icon:"!",title:"Hồ sơ cần bổ sung",
    body:"Vui lòng liên hệ quản lý để biết giấy tờ còn thiếu."
  });
  if(normalize(student.exam_status)==="da dau")notices.push({
    id:"student-exam-passed",tone:"green",icon:"★",title:"Đã đậu kỳ thi sát hạch",
    body:"Chúc mừng anh/chị đã hoàn thành kỳ thi sát hạch."
  });
  return notices;
}

export function noticeReadKey(me){return `hv_notice_read_${me?.role||"account"}_${me?.id||me?.username||"unknown"}`}
export function readNoticeIds(me){
  try{return new Set(JSON.parse(localStorage.getItem(noticeReadKey(me))||"[]"))}catch{return new Set()}
}
export function markNoticesRead(me,notices){localStorage.setItem(noticeReadKey(me),JSON.stringify(notices.map(notice=>notice.id)))}
