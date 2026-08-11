import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {NUMBERED_EXAM_COUNTS,EXAMS,buildNumberedExamPool} from "../exam-config.js";

const root=resolve(import.meta.dirname,"..");
const questions=JSON.parse(await readFile(resolve(root,"public/data/600-cau-hoi-2025.json"),"utf8"));
const errors=[];
const coverageMinimum={A1:240,A:240,B:570,C1:565};

for(const [examKey,totalSets] of Object.entries(NUMBERED_EXAM_COUNTS)){
  const exam=EXAMS[examKey];
  const allIds=new Set();
  const criticalIds=new Set();
  const allowed=exam.questionIds?new Set(exam.questionIds):null;

  for(let examNumber=1;examNumber<=totalSets;examNumber++){
    const pool=buildNumberedExamPool(questions,examKey,examNumber);
    const replay=buildNumberedExamPool(questions,examKey,examNumber);
    const ids=pool.map(question=>question.id);
    const replayIds=replay.map(question=>question.id);
    const unique=new Set(ids);
    const critical=pool.filter(question=>question.examCritical);
    const prefix=`Hạng ${exam.label} · Đề ${examNumber}`;

    if(pool.length!==exam.count)errors.push(`${prefix}: có ${pool.length} câu, cần ${exam.count}.`);
    if(unique.size!==pool.length)errors.push(`${prefix}: có câu bị lặp trong cùng đề.`);
    if(critical.length!==1)errors.push(`${prefix}: cần đúng 1 câu điểm liệt, hiện có ${critical.length}.`);
    if(ids.join(",")!==replayIds.join(","))errors.push(`${prefix}: đề cố định nhưng kết quả sinh đề không ổn định.`);
    if(allowed&&ids.some(id=>!allowed.has(id)))errors.push(`${prefix}: chứa câu ngoài phạm vi câu hỏi của hạng ${exam.label}.`);

    ids.forEach(id=>allIds.add(id));
    critical.forEach(question=>criticalIds.add(question.id));
  }

  if(criticalIds.size!==totalSets){
    errors.push(`Hạng ${exam.label}: ${totalSets} đề cần ${totalSets} câu điểm liệt khác nhau, hiện có ${criticalIds.size}.`);
  }
  const minimum=coverageMinimum[examKey]||0;
  if(allIds.size<minimum){
    errors.push(`Hạng ${exam.label}: phân bổ chưa đủ rộng, mới phủ ${allIds.size} câu; yêu cầu tối thiểu ${minimum}.`);
  }

  console.log(`Hạng ${exam.label}: ${totalSets} đề cố định + 1 ngẫu nhiên, mỗi đề ${exam.count} câu; phủ ${allIds.size} câu.`);
}

if(errors.length){
  console.error(`Bộ đề đánh số chưa hợp lệ (${errors.length} lỗi):`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}

console.log("Hợp lệ: A1 15 đề, A 15 đề, B 32 đề, C1 29 đề; mỗi hạng có thêm đề ngẫu nhiên.");
