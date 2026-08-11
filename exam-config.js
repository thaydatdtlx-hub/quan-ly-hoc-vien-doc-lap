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

export const NUMBERED_EXAM_COUNTS=Object.freeze({A1:15,A:15,B:32,C1:29});
export const B_NUMBERED_EXAM_COUNT=NUMBERED_EXAM_COUNTS.B;

export const EXAMS=Object.freeze({
  A1:Object.freeze({key:"A1",label:"A1",vehicle:"Xe mô tô đến 125 cm³",count:25,minutes:19,pass:21,questionIds:MOTORCYCLE_QUESTION_IDS,criticalIds:MOTORCYCLE_CRITICAL_IDS}),
  A:Object.freeze({key:"A",label:"A",vehicle:"Xe mô tô trên 125 cm³",count:25,minutes:19,pass:23,questionIds:MOTORCYCLE_QUESTION_IDS,criticalIds:MOTORCYCLE_CRITICAL_IDS}),
  B:Object.freeze({key:"B",label:"B",vehicle:"Xe ô tô hạng B",count:30,minutes:20,pass:27,questionIds:null,criticalIds:null}),
  C1:Object.freeze({key:"C1",label:"C1",vehicle:"Xe tải từ trên 3.500 kg đến 7.500 kg",count:35,minutes:22,pass:32,questionIds:null,criticalIds:null})
});

function seedFromText(value=""){
  let hash=2166136261;
  for(const char of String(value)){
    hash^=char.charCodeAt(0);
    hash=Math.imul(hash,16777619);
  }
  return hash>>>0;
}

function seededRandom(seedText){
  let state=seedFromText(seedText)||1;
  return()=>{
    state+=0x6D2B79F5;
    let value=state;
    value=Math.imul(value^(value>>>15),value|1);
    value^=value+Math.imul(value^(value>>>7),value|61);
    return((value^(value>>>14))>>>0)/4294967296;
  };
}

function seededShuffle(items,seedText){
  const result=[...items],random=seededRandom(seedText);
  for(let index=result.length-1;index>0;index--){
    const swap=Math.floor(random()*(index+1));
    [result[index],result[swap]]=[result[swap],result[index]];
  }
  return result;
}

function examQuestionGroups(questions,examKey){
  const config=EXAMS[examKey];
  if(!config)throw new Error(`Hạng thi không hợp lệ: ${examKey}`);
  const allowed=config.questionIds?new Set(config.questionIds):null;
  const eligible=allowed?questions.filter(question=>allowed.has(question.id)):questions;
  const criticalIds=config.criticalIds?new Set(config.criticalIds):null;
  const isCritical=question=>criticalIds?criticalIds.has(question.id):Boolean(question.critical);
  return{
    config,
    eligible,
    critical:eligible.filter(isCritical),
    regular:eligible.filter(question=>!isCritical(question)),
    isCritical
  };
}

export function buildNumberedExamPool(questions,examKey,examNumber){
  const totalSets=NUMBERED_EXAM_COUNTS[examKey];
  if(!totalSets)throw new Error(`Hạng ${examKey} chưa hỗ trợ đề đánh số.`);
  const {config,critical,regular}=examQuestionGroups(questions,examKey);
  const number=Math.trunc(Number(examNumber));
  if(number<1||number>totalSets)throw new Error(`Đề hạng ${config.label} phải từ 1 đến ${totalSets}.`);

  const criticalOrder=seededShuffle(critical,`${examKey}-numbered-critical-v2`);
  const regularOrder=seededShuffle(regular,`${examKey}-numbered-regular-v2`);
  if(criticalOrder.length<totalSets||regularOrder.length<config.count-1){
    throw new Error(`Không đủ câu hỏi để tạo ${totalSets} đề hạng ${config.label}.`);
  }

  const criticalQuestion=criticalOrder[number-1];
  const regularCount=config.count-1;
  const start=((number-1)*regularCount)%regularOrder.length;
  const selectedRegular=Array.from({length:regularCount},(_,offset)=>regularOrder[(start+offset)%regularOrder.length]);
  const selected=[criticalQuestion,...selectedRegular];

  return seededShuffle(selected,`${examKey}-numbered-set-${number}-v2`).map(question=>({
    ...question,
    examCritical:question.id===criticalQuestion.id,
    examSet:number,
    examSetKey:examKey
  }));
}

export function buildExamPool(questions,examKey,shuffle){
  const {config,eligible,isCritical}=examQuestionGroups(questions,examKey);

  const numbered=globalThis.__THAY_DAT_NUMBERED_EXAM__;
  if(numbered?.key===examKey){
    const number=Math.trunc(Number(numbered.number));
    const totalSets=NUMBERED_EXAM_COUNTS[examKey];
    if(number>=1&&number<=totalSets)return buildNumberedExamPool(questions,examKey,number);
  }

  // Compatibility with older cached hạng B picker while Service Worker updates.
  if(examKey==="B"){
    const legacySet=Math.trunc(Number(globalThis.__THAY_DAT_B_EXAM_SET__));
    if(legacySet>=1&&legacySet<=NUMBERED_EXAM_COUNTS.B)return buildNumberedExamPool(questions,"B",legacySet);
  }

  const critical=shuffle(eligible.filter(isCritical)).slice(0,1);
  const regular=shuffle(eligible.filter(question=>!isCritical(question))).slice(0,config.count-1);
  if(critical.length!==1||regular.length!==config.count-1)throw new Error(`Không đủ câu hỏi để tạo đề hạng ${config.label}.`);
  return shuffle([...critical,...regular]).map(question=>({...question,examCritical:isCritical(question)}));
}
