export const MOTORCYCLE_QUESTION_IDS=Object.freeze([
  1,2,3,4,5,6,7,8,9,10,11,12,13,19,20,21,22,24,26,27,
  28,29,30,31,32,33,34,35,36,37,38,39,40,41,43,44,45,46,47,48,
  49,51,52,53,54,56,57,59,63,64,65,66,67,68,69,70,71,72,73,74,
  75,76,77,80,81,87,88,90,91,92,93,94,96,97,98,99,100,102,103,107,
  109,110,111,119,123,124,125,126,137,138,140,141,142,145,146,151,155,163,167,178,
  182,185,187,189,191,192,193,194,195,200,
  206,215,219,232,233,240,241,242,254,255,257,258,259,260,261,
  303,304,305,306,307,313,314,315,317,318,322,323,324,325,326,329,330,335,345,346,
  347,348,349,350,351,354,360,362,364,366,367,368,369,370,371,372,373,374,375,376,
  377,380,381,382,386,387,389,390,391,393,394,395,397,398,400,401,411,412,413,415,
  419,422,427,430,431,432,433,434,435,437,438,439,440,441,442,445,450,451,452,454,
  455,457,458,459,460,461,474,475,476,478,
  486,487,490,492,495,499,500,503,504,505,507,508,509,517,520,525,527,528,
  529,538,539,540,543,548,553,556,559,560,562,565,567,568,583,592,600
]);

export const MOTORCYCLE_CRITICAL_IDS=Object.freeze([
  19,20,21,22,24,26,27,28,30,47,48,52,53,63,64,65,68,70,71,72
]);

export const EXAMS=Object.freeze({
  A1:Object.freeze({key:"A1",label:"A1",vehicle:"Xe mô tô đến 125 cm³",count:40,minutes:27,pass:36,questionIds:MOTORCYCLE_QUESTION_IDS,criticalIds:MOTORCYCLE_CRITICAL_IDS}),
  A:Object.freeze({key:"A",label:"A",vehicle:"Xe mô tô trên 125 cm³",count:40,minutes:27,pass:36,questionIds:MOTORCYCLE_QUESTION_IDS,criticalIds:MOTORCYCLE_CRITICAL_IDS}),
  B:Object.freeze({key:"B",label:"B",vehicle:"Xe ô tô hạng B",count:50,minutes:33,pass:45,questionIds:null,criticalIds:null}),
  C1:Object.freeze({key:"C1",label:"C1",vehicle:"Xe tải từ trên 3.500 kg đến 7.500 kg",count:60,minutes:40,pass:54,questionIds:null,criticalIds:null})
});

export function buildExamPool(questions,examKey,shuffle){
  const config=EXAMS[examKey];
  if(!config)throw new Error(`Hạng thi không hợp lệ: ${examKey}`);
  const allowed=config.questionIds?new Set(config.questionIds):null;
  const eligible=allowed?questions.filter(question=>allowed.has(question.id)):questions;
  const criticalIds=config.criticalIds?new Set(config.criticalIds):null;
  const isCritical=question=>criticalIds?criticalIds.has(question.id):question.critical;
  const critical=shuffle(eligible.filter(isCritical)).slice(0,1);
  const regular=shuffle(eligible.filter(question=>!isCritical(question))).slice(0,config.count-1);
  if(critical.length!==1||regular.length!==config.count-1)throw new Error(`Không đủ câu hỏi để tạo đề hạng ${config.label}.`);
  return shuffle([...critical,...regular]).map(question=>({...question,examCritical:isCritical(question)}));
}
