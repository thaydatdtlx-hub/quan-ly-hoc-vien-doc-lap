import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {explanationForQuestion,validateExplanationCoverage,trustedExplanationCount} from "../theory-explanation-engine.js";

const root=resolve(import.meta.dirname,"..");
const questions=JSON.parse(await readFile(resolve(root,"public/data/600-cau-hoi-2025.json"),"utf8"));
const errors=validateExplanationCoverage(questions);

function normalize(value=""){
  return String(value??"")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/đ/g,"d")
    .replace(/[^a-z0-9]+/g," ")
    .trim();
}

if(questions.length!==600)errors.push(`Cần đúng 600 câu để kiểm tra lời giải, hiện có ${questions.length}.`);

for(const id of [57,59]){
  const question=questions.find(item=>Number(item.id)===id);
  if(!question){errors.push(`Thiếu câu hồi quy ${id}.`);continue}
  const answer=question.options.find(option=>Number(option.n)===Number(question.answer));
  const result=explanationForQuestion(question);
  if(!normalize(result.text).includes(normalize(answer?.text)))errors.push(`Câu ${id}: lời giải không bám đáp án đúng hiện hành.`);
  if(/\b(16|18|21|24|27|55|57)\s*tuổi\b/iu.test(result.text||""))errors.push(`Câu ${id}: phát hiện lời giải độ tuổi bị gắn nhầm vào câu quy tắc giao thông.`);
}

if(errors.length){
  console.error(`Lời giải 600 câu chưa đồng bộ (${errors.length} lỗi):`);
  errors.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Hợp lệ: ${questions.length}/600 câu đều tạo được lời giải đồng bộ; ${trustedExplanationCount} lời giải biên soạn được ràng buộc theo nội dung câu hỏi + đáp án.`);
