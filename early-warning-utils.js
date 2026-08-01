import {attendanceSummary} from "./attendance-utils.js";
import {parseScheduleFromNotes} from "./schedule-data.js";

export const EARLY_WARNING_RULES={attendanceMinSessions:3,attendanceRate:80,theoryAccuracy:70,theoryStaleDays:14};
export const EARLY_WARNING_LEVELS={critical:{label:"Khẩn cấp",rank:3},high:{label:"Ưu tiên cao",rank:2},medium:{label:"Cần theo dõi",rank:1}};

const normalize=value=>String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
const daysBetween=(older,newer)=>Math.floor((newer-older)/86400000);
const isCompleted=value=>normalize(value).includes("da hoan thanh");
const warningId=(student,type)=>`${student.id}-${type}`;

function makeWarning(student,type,severity,title,detail,action,label){
  return{id:warningId(student,type),student_id:student.id,student_name:student.name,student_code:student.student_code||"",course:student.course||"",license_class:student.license_class||"",type,severity,title,detail,action,action_label:label};
}

export function buildEarlyWarnings({students=[],attendanceRecords=[],theoryProgress=[],now=new Date()}={}){
  const warnings=[];
  for(const student of students){
    const records=attendanceRecords.filter(record=>String(record.student_id)===String(student.id));
    const attendance=attendanceSummary(records),theory=theoryProgress.find(item=>String(item.student_id)===String(student.id))||{};
    const answered=Number(theory.answered_count)||0,correct=Number(theory.correct_count)||0,exams=Number(theory.exam_count)||0,passed=Number(theory.passed_exam_count)||0;
    const accuracy=answered?Math.round(correct/answered*100):0;
    const total=Math.max(0,Number(student.tuition_total)||0),paid=Math.max(0,Number(student.paid)||0),debt=Math.max(0,total-paid),debtRate=total?Math.round(debt/total*100):0;

    if(attendance.sessions>=EARLY_WARNING_RULES.attendanceMinSessions&&attendance.rate<EARLY_WARNING_RULES.attendanceRate){
      const severity=attendance.rate<60||attendance.absent>=3?"critical":"high";
      warnings.push(makeWarning(student,"attendance",severity,"Chuyên cần thấp",`${attendance.present}/${attendance.sessions} buổi có mặt · Tỷ lệ ${attendance.rate}% · Vắng ${attendance.absent}, có phép ${attendance.excused}.`,"attendance","Mở điểm danh"));
    }
    if(exams>=3&&passed===0){
      warnings.push(makeWarning(student,"theory",exams>=5?"critical":"high","Thi thử nhiều lần chưa đạt",`Đã thi ${exams} bài nhưng chưa có bài đạt. Điểm tốt nhất ${Number(theory.best_score)||0}/${Number(theory.best_total)||0}.`,"theory","Xem học & thi"));
    }else if(answered>=100&&accuracy<EARLY_WARNING_RULES.theoryAccuracy){
      warnings.push(makeWarning(student,"theory","medium","Độ chính xác lý thuyết thấp",`Đã học ${answered}/600 câu, tỷ lệ trả lời đúng ${accuracy}%.`,"theory","Xem tiến độ"));
    }else if(answered>0&&answered<600&&passed===0&&theory.last_activity){
      const last=new Date(theory.last_activity),idle=Number.isNaN(last.valueOf())?0:daysBetween(last,now);
      if(idle>=EARLY_WARNING_RULES.theoryStaleDays)warnings.push(makeWarning(student,"theory","medium","Gián đoạn học lý thuyết",`Không có hoạt động 600 câu trong ${idle} ngày · Đã học ${answered}/600 câu.`,"theory","Nhắc học viên"));
    }
    if(debt>0){
      warnings.push(makeWarning(student,"finance",debtRate>=50?"high":"medium","Học phí chưa hoàn tất",`Còn nợ ${debt.toLocaleString("vi-VN")} ₫ · ${debtRate}% tổng học phí.`,"finance","Mở sổ học phí"));
    }
    if(normalize(student.profile_status).includes("thieu"))warnings.push(makeWarning(student,"profile","high","Hồ sơ cần bổ sung",student.profile_status||"Hồ sơ đang thiếu giấy tờ.","profile","Cập nhật hồ sơ"));

    const schedule=parseScheduleFromNotes(student.notes||"")||{dates:{}},examDate=schedule.dates?.exam;
    if(examDate){
      const exam=new Date(String(examDate).length===10?`${examDate}T00:00:00`:examDate),days=Number.isNaN(exam.valueOf())?99:Math.ceil((exam-now)/86400000);
      if(days>=0&&days<=7&&passed===0)warnings.push(makeWarning(student,"schedule",days<=2?"critical":"high","Sắp thi sát hạch nhưng chưa có bài thi thử đạt",`Lịch sát hạch còn ${days===0?"hôm nay":`${days} ngày`} · Cần kiểm tra mức độ sẵn sàng.`,"schedule","Mở lịch đào tạo"));
    }

    const cabinMinutes=records.filter(record=>record.status==="present"&&record.session_type==="cabin").reduce((sum,record)=>sum+(Number(record.actual_minutes)||0),0);
    const datMinutes=records.filter(record=>record.status==="present"&&["dat_auto","dat_manual","dat_practice"].includes(record.session_type)).reduce((sum,record)=>sum+(Number(record.actual_minutes)||0),0);
    if(isCompleted(student.cabin_status)&&records.length&&cabinMinutes===0)warnings.push(makeWarning(student,"training","medium","Cabin chưa có giờ thực học",`Trạng thái đã hoàn thành nhưng chưa có thời lượng Cabin được ghi nhận.`,"attendance","Bổ sung giờ Cabin"));
    if(isCompleted(student.dat_status)&&records.length&&datMinutes===0)warnings.push(makeWarning(student,"training","medium","DAT chưa có giờ thực học",`Trạng thái đã hoàn thành nhưng chưa có thời lượng DAT được ghi nhận.`,"attendance","Bổ sung giờ DAT"));
  }
  return warnings.sort((a,b)=>EARLY_WARNING_LEVELS[b.severity].rank-EARLY_WARNING_LEVELS[a.severity].rank||a.student_name.localeCompare(b.student_name,"vi"));
}

export function earlyWarningSummary(warnings=[]){
  return{total:warnings.length,critical:warnings.filter(item=>item.severity==="critical").length,high:warnings.filter(item=>item.severity==="high").length,students:new Set(warnings.map(item=>String(item.student_id))).size};
}
