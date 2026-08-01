export const ATTENDANCE_TYPES={
  theory:"Lý thuyết",
  cabin:"Cabin mô phỏng",
  dat_auto:"DAT số tự động",
  dat_manual:"DAT số cơ khí",
  dat_practice:"Thực hành DAT",
  practice:"Sa hình",
  familiar:"Làm quen xe",
  graduation:"Thi tốt nghiệp",
  other:"Nội dung khác"
};

export const ATTENDANCE_STATUSES={present:"Có mặt",absent:"Vắng",excused:"Vắng có phép"};

export const attendanceTypeLabel=value=>ATTENDANCE_TYPES[value]||ATTENDANCE_TYPES.other;
export const attendanceStatusLabel=value=>ATTENDANCE_STATUSES[value]||ATTENDANCE_STATUSES.absent;

export function calculateAttendanceMinutes(start,end){
  if(!start||!end)return 0;
  const [startHour,startMinute]=String(start).split(":").map(Number),[endHour,endMinute]=String(end).split(":").map(Number);
  if([startHour,startMinute,endHour,endMinute].some(Number.isNaN))return 0;
  return Math.max(0,(endHour*60+endMinute)-(startHour*60+startMinute));
}

export function formatAttendanceDuration(minutes){
  const value=Math.max(0,Number(minutes)||0),hours=Math.floor(value/60),rest=value%60;
  return [hours?`${hours} giờ`:"",rest?`${rest} phút`:""].filter(Boolean).join(" ")||"0 giờ";
}

export function attendanceSummary(records=[]){
  const summary={sessions:records.length,present:0,absent:0,excused:0,actualMinutes:0,rate:0};
  for(const record of records){
    if(record.status==="present"){summary.present++;summary.actualMinutes+=Math.max(0,Number(record.actual_minutes)||0)}
    else if(record.status==="excused")summary.excused++;
    else summary.absent++;
  }
  summary.rate=summary.sessions?Math.round(summary.present/summary.sessions*100):0;
  return summary;
}

export function buildAdminReport(students=[],records=[],theoryProgress=[]){
  return students.map(student=>{
    const attendance=attendanceSummary(records.filter(record=>String(record.student_id)===String(student.id)));
    const theory=theoryProgress.find(item=>String(item.student_id)===String(student.id))||{};
    return{
      student_id:student.id,student_code:student.student_code,name:student.name,
      license_class:student.license_class,course:student.course,
      ...attendance,theory_answered:Number(theory.answered_count)||0,theory_exams:Number(theory.exam_count)||0,
      tuition_total:Math.max(0,Number(student.tuition_total)||0),paid:Math.max(0,Number(student.paid)||0),
      debt:Math.max(0,Number(student.tuition_total||0)-Number(student.paid||0))
    };
  });
}
