import {SCHEDULE_FIELDS,parseScheduleFromNotes} from "./schedule-data.js";
import "./ai-chat.js";

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
function formatDuration(minutes){
  const value=Number(minutes)||0,hours=Math.floor(value/60),rest=value%60;
  return [hours?`${hours} giờ`:"",rest?`${rest} phút`:""].filter(Boolean).join(" ")||"Chưa xác định";
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

  notices.push({
    id:"new-student-registration-professional-20260804",
    category:"general",
    tone:"blue",
    icon:"🚘",
    title:"Kênh đăng ký học lái xe trực tuyến",
    body:"Trang tuyển sinh đã sẵn sàng để tư vấn và tiếp nhận đăng ký B số tự động, B số sàn và C1.",
    href:"/dang-ky-hoc-lai-xe.html",
    action:"Xem trang tuyển sinh"
  });

  const trainingRequests=students.flatMap(student=>(student.training_requests||[]).map(request=>({student,request})));
  const pendingRequests=trainingRequests.filter(item=>item.request.status==="pending");
  if(role==="admin"&&pendingRequests.length)notices.push({
    id:`training-requests-${pendingRequests.map(item=>item.request.id).join("-")}`,category:"schedule",tone:"cyan",icon:"✋",
    title:`${pendingRequests.length} yêu cầu đăng ký lịch đang chờ duyệt`,
    body:`Mới nhất: ${pendingRequests[0].student.name} đăng ký ${SCHEDULE_FIELDS.find(field=>field.key===pendingRequests[0].request.request_type)?.short||"buổi thực hành"}.`,
    href:"/lich-dao-tao.html#trainingRequests",action:"Duyệt yêu cầu"
  });
  const debtStudents=students.filter(student=>(Number(student.tuition_total)||0)>(Number(student.paid)||0));
  const debt=debtStudents.reduce((sum,student)=>sum+Math.max(0,(Number(student.tuition_total)||0)-(Number(student.paid)||0)),0);
  if(debtStudents.length)notices.push({
    id:`debt-${debtStudents.length}-${debt}`,category:"finance",tone:"orange",icon:"₫",title:`${debtStudents.length} học viên còn nợ học phí`,
    body:`Tổng số tiền cần thu: ${money(debt)}.`,action:"Xem danh sách công nợ"
  });

  const upcoming=scheduleEvents(students).filter(event=>new Date(event.date)>=today&&new Date(event.date)<=weekEnd);
  if(upcoming.length)notices.push({
    id:`week-${upcoming.map(event=>`${event.student.id}-${event.field.key}-${event.date}`).join("-")}`,category:"schedule",tone:"blue",icon:"▣",
    title:`${upcoming.length} lịch đào tạo trong 7 ngày tới`,
    body:`Gần nhất: ${upcoming[0].field.label} của ${upcoming[0].student.name} · ${formatDate(upcoming[0].date)}.`,
    href:"/lich-dao-tao.html",action:"Mở lịch đào tạo"
  });

  const unscheduled=students.filter(student=>!SCHEDULE_FIELDS.some(field=>scheduleOf(student).dates?.[field.key]));
  if(unscheduled.length)notices.push({
    id:`unscheduled-${unscheduled.map(student=>student.id).join("-")}`,category:"schedule",tone:"violet",icon:"◷",
    title:`${unscheduled.length} học viên chưa có lịch đào tạo`,
    body:"Cần bổ sung ít nhất một mốc lịch học hoặc lịch thi.",href:"/lich-dao-tao.html",action:"Lập lịch ngay"
  });

  const incomplete=students.filter(student=>normalize(student.profile_status).includes("thieu"));
  if(incomplete.length)notices.push({
    id:`profiles-${incomplete.map(student=>student.id).join("-")}`,category:"profile",tone:"red",icon:"!",title:`${incomplete.length} hồ sơ đang thiếu`,
    body:`${incomplete.slice(0,3).map(student=>student.name).join(", ")}${incomplete.length>3?"…":""}.`,action:"Kiểm tra hồ sơ"
  });

  if(role==="admin")notices.unshift({
    id:`admin-summary-${students.length}`,category:"general",tone:"green",icon:"✓",title:"Tổng quan hệ thống",
    body:`Hệ thống đang quản lý ${students.length} học viên. Các thông báo được cập nhật tự động theo dữ liệu mới.`
  });
  return notices;
}

export function studentNotifications(student,trainingSlots=[]){
  const notices=[],today=startOfToday(),total=Math.max(0,Number(student.tuition_total)||0),paid=Math.max(0,Number(student.paid)||0),debt=Math.max(0,total-paid);

  notices.push({
    id:"student-new-license-registration-professional-20260804",
    category:"general",
    tone:"blue",
    icon:"🚘",
    title:"Giới thiệu chương trình học lái xe Thầy Đạt",
    body:"Thông tin khóa học B số tự động, B số sàn và C1 đã được tổng hợp đầy đủ. Anh/chị có thể xem hoặc chia sẻ cho người thân đang có nhu cầu.",
    href:"/dang-ky-hoc-lai-xe.html",
    action:"Xem chương trình đào tạo"
  });

  const datSlots=trainingSlots
    .filter(slot=>slot.session_type==="dat_practice"&&slot.status==="open"&&new Date(slot.starts_at)>=today&&Number(slot.available_count)>0)
    .sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
  if(datSlots.length){
    const nearest=datSlots[0];
    notices.push({
      id:`student-dat-slots-${datSlots.map(slot=>`${slot.id}-${slot.updated_at||slot.starts_at}`).join("-")}`,
      category:"schedule",tone:"blue",icon:"🛰️",title:`Có ${datSlots.length} ca Thực hành DAT đang mở`,
      body:`Ca gần nhất: ${formatDate(nearest.starts_at)} · ${formatDuration(nearest.duration_minutes)}${nearest.location?` · ${nearest.location}`:" · Chưa cập nhật địa điểm"}.`,
      href:"/hoc-vien.html#trainingBooking",action:"Chọn khung giờ DAT"
    });
  }
  if(debt)notices.push({
    id:`student-debt-${debt}`,category:"finance",tone:"orange",icon:"₫",title:"Học phí chưa hoàn tất",
    body:`Anh/chị còn ${money(debt)} cần hoàn tất. Đã đóng ${money(paid)} trên tổng ${money(total)}.`
  });
  else if(total)notices.push({id:`student-paid-${total}`,category:"finance",tone:"green",icon:"✓",title:"Đã hoàn tất học phí",body:`Hệ thống đã ghi nhận đủ ${money(total)}.`});

  const requests=student.training_requests||[];
  for(const request of requests.slice(0,3)){
    const field=SCHEDULE_FIELDS.find(item=>item.key===request.request_type),label=field?.label||"Buổi thực hành";
    if(request.status==="pending")notices.push({
      id:`request-pending-${request.id}`,category:"schedule",tone:"orange",icon:"◷",title:`Đang chờ duyệt: ${label}`,
      body:`Thời gian mong muốn: ${formatDate(request.requested_at)}.`
    });
    if(request.status==="approved")notices.push({
      id:`request-approved-${request.id}`,category:"schedule",tone:"green",icon:"✓",title:`Đã duyệt: ${label}`,
      body:`Yêu cầu đăng ký đã được Admin duyệt${request.admin_note?` · ${request.admin_note}`:""}.`,
      href:"/lich-dao-tao.html",action:"Xem lịch chính thức"
    });
    if(request.status==="rejected")notices.push({
      id:`request-rejected-${request.id}`,category:"schedule",tone:"red",icon:"!",title:`Chưa duyệt: ${label}`,
      body:request.admin_note||"Vui lòng chọn thời gian khác hoặc liên hệ Admin."
    });
  }

  const events=scheduleEvents([student]).filter(event=>new Date(event.date)>=today).slice(0,3);
  if(events.length){
    for(const event of events)notices.push({
      id:`student-event-${event.id||`${event.field.key}-${event.date}`}`,category:"schedule",tone:event.field.tone||"blue",icon:event.field.icon,
      title:event.field.label,body:`${formatDate(event.date)}${event.location?` · ${event.location}`:" · Chưa cập nhật địa điểm"}`,
      href:"/lich-dao-tao.html",action:"Xem lịch chi tiết"
    });
  }else notices.push({
    id:"student-no-schedule",category:"schedule",tone:"violet",icon:"◷",title:"Chưa có lịch đào tạo sắp tới",
    body:"Lịch học và lịch thi mới sẽ xuất hiện tại đây khi trung tâm cập nhật."
  });

  if(normalize(student.profile_status).includes("thieu"))notices.push({
    id:"student-profile-missing",category:"profile",tone:"red",icon:"!",title:"Hồ sơ cần bổ sung",
    body:"Vui lòng liên hệ quản lý để biết giấy tờ còn thiếu."
  });
  const examStatus=normalize(student.exam_status),licenseReceived=examStatus.includes("da nhan bang");
  if(licenseReceived)notices.push({
    id:"student-license-received",category:"general",tone:"green",icon:"✓",title:"Đăng ký bổ túc tay lái đã mở",
    body:"Hệ thống đã ghi nhận bạn nhận bằng lái. Bạn có thể tính chi phí và đăng ký luyện thêm kỹ năng.",
    href:"/bo-tuc-tay-lai.html#tinh-chi-phi",action:"Đăng ký bổ túc tay lái"
  });
  else if(examStatus==="da dau")notices.push({
    id:"student-exam-passed",category:"theory",tone:"green",icon:"★",title:"Đã đậu kỳ thi sát hạch",
    body:"Chúc mừng anh/chị đã hoàn thành kỳ thi sát hạch. Chức năng bổ túc tay lái sẽ mở sau khi Admin ghi nhận đã nhận bằng."
  });
  return notices;
}

export function noticeReadKey(me){return `hv_notice_read_${me?.role||"account"}_${me?.id||me?.username||"unknown"}`}
export function readNoticeIds(me){
  try{return new Set(JSON.parse(localStorage.getItem(noticeReadKey(me))||"[]"))}catch{return new Set()}
}
export function markNoticesRead(me,notices){localStorage.setItem(noticeReadKey(me),JSON.stringify(notices.map(notice=>notice.id)))}
import "./ai-chat.js";
