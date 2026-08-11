import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {B_NUMBERED_EXAM_COUNT,EXAMS,buildNumberedExamPool} from "../exam-config.js";

const root=resolve(import.meta.dirname,"..");
const questions=JSON.parse(await readFile(resolve(root,"public/data/600-cau-hoi-2025.json"),"utf8"));
const errors=[];
const allIds=new Set();
const criticalIds=new Set();

for(let examNumber=1;examNumber<=B_NUMBERED_EXAM_COUNT;examNumber++){
  const pool=buildNumberedExamPool(questions,"B",examNumber);
  const ids=pool.map(question=>question.id);
  const unique=new Set(ids);
  const critical=pool.filter(question=>question.examCritical);

  if(pool.length!==EXAMS.B.count)errors.push(`Đề ${examNumber}: có ${pool.length} câu, cần ${EXAMS.B.count}.`);
  if(unique.size!==pool.length)errors.push(`Đề ${examNumber}: có câu bị lặp trong cùng đề.`);
  if(critical.length!==1)errors.push(`Đề ${examNumber}: cần đúng 1 câu điểm liệt, hiện có ${critical.length}.`);

  ids.forEach(id=>allIds.add(id));
  critical.forEach(question=>criticalIds.add(question.id));
}

if(criticalIds.size!==B_NUMBERED_EXAM_COUNT)errors.push(`32 đề cần 32 câu điểm liệt khác nhau, hiện có ${criticalIds.size}.`);
if(allIds.size<540)errors.push(`Phân bổ chưa đủ rộng trên bộ 600 câu: mới phủ ${allIds.size} câu.`);

if(errors.length){
  console.error(`Bộ 32 đề hạng B chưa hợp lệ (${errors.length} lỗi):`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Hợp lệ: ${B_NUMBERED_EXAM_COUNT} đề hạng B, mỗi đề ${EXAMS.B.count} câu, 1 câu điểm liệt; phủ ${allIds.size}/600 câu.`);
