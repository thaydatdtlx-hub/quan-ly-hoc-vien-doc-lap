function normalizeQuestion(value=""){
  return String(value??"").trim().replace(/\s+/g," ").toLowerCase();
}

function normalizeForIntent(value=""){
  return String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
}

const TRUSTED_EXPLANATIONS=[
  {
    question:"Phần của đường bộ được sử dụng cho phương tiện giao thông đường bộ đi lại là gì?",
    answer:2,
    text:"Phần đường xe chạy là phần của đường bộ được sử dụng cho phương tiện giao thông đi lại. Vì vậy đáp án 2 đúng; lề đường không đồng nghĩa với phần đường xe chạy."
  },
  {
    question:"Làn đường là gì?",
    answer:2,
    text:"Làn đường là một phần của phần đường xe chạy, được chia theo chiều dọc và phải có đủ chiều rộng để xe chạy an toàn. Vì vậy phương án 2 là định nghĩa đầy đủ nhất."
  },
  {
    question:"Khổ giới hạn của đường bộ được hiểu như thế nào là đúng?",
    answer:1,
    text:"Khổ giới hạn phải xét cả chiều rộng và chiều cao của khoảng trống để xe, kể cả hàng hóa xếp trên xe, có thể đi qua an toàn. Phương án 1 nêu đầy đủ các yếu tố này."
  },
  {
    question:"Dải phân cách được lắp đặt để làm gì?",
    answer:2,
    text:"Dải phân cách dùng để tách hai chiều xe chạy riêng biệt hoặc phân chia phần đường dành cho các nhóm phương tiện khác nhau. Vì vậy phương án 2 đúng và đầy đủ nhất."
  },
  {
    question:"Trong nhóm các phương tiện giao thông đường bộ dưới đây, nhóm phương tiện nào là xe cơ giới?",
    answer:2,
    text:"Nhóm xe cơ giới gồm ô tô, rơ moóc và sơ mi rơ moóc kéo bởi ô tô, xe bốn bánh gắn động cơ, mô tô, xe gắn máy và các loại xe tương tự. Xe máy chuyên dùng và xe thô sơ không được gộp vào nhóm này."
  },
  {
    question:"Đỗ xe được hiểu như thế nào là đúng?",
    answer:2,
    text:"Đỗ xe là trạng thái xe đứng yên không giới hạn thời gian. Khi rời xe phải thực hiện biện pháp bảo đảm an toàn; vì vậy phương án 2 mô tả đúng khái niệm đỗ xe."
  },
  {
    question:"Đường cao tốc được hiểu như thế nào là đúng?",
    answer:1,
    text:"Đường cao tốc có các đặc điểm đồng thời như phân chia hai chiều xe chạy riêng biệt, không giao nhau cùng mức, chỉ ra vào tại điểm nhất định và có hạ tầng bảo đảm giao thông liên tục, an toàn. Phương án 1 nêu đúng các đặc điểm này."
  },
  {
    question:"Nơi nào cấm quay đầu xe?",
    answer:3,
    text:"Các vị trí nêu ở cả phương án 1 và phương án 2 đều là nơi không được quay đầu xe. Vì vậy phải chọn phương án 3: Cả hai ý trên."
  },
  {
    question:"Người lái xe không được quay đầu xe trong các trường hợp nào dưới đây?",
    answer:1,
    text:"Các vị trí như phần đường dành cho người đi bộ qua đường, trên cầu, đầu cầu, đường cao tốc, nơi giao nhau cùng mức với đường sắt, đường hẹp và đường dốc đều thuộc nhóm không được quay đầu xe. Vì vậy phương án 1 đúng."
  },
  {
    question:"Trước khi cho xe chuyển hướng, người lái xe phải làm gì để bảo đảm an toàn giao thông?",
    answer:4,
    text:"Trước khi chuyển hướng phải quan sát và bảo đảm khoảng cách an toàn, giảm tốc độ và báo hướng rẽ, đồng thời chuyển dần sang làn phù hợp và chỉ chuyển hướng khi không gây trở ngại. Cả ba nội dung đều cần thiết nên đáp án 4 đúng."
  },
  {
    question:"Khi chuyển làn đường, người lái xe phải bật đèn tín hiệu báo rẽ như thế nào là đúng quy tắc giao thông?",
    answer:2,
    text:"Tín hiệu báo rẽ phải được bật trước khi thay đổi làn đường để các phương tiện xung quanh nhận biết ý định chuyển làn và có thời gian xử lý an toàn. Vì vậy đáp án 2 đúng."
  },
  {
    question:"Người lái xe không được lùi xe ở những khu vực nào dưới đây?",
    answer:4,
    text:"Các nhóm vị trí ở cả ba phương án đều là những nơi không được lùi xe, gồm đường một chiều hoặc nơi cấm dừng, khu vực giao nhau và đường sắt, nơi tầm nhìn bị che khuất, hầm và đường cao tốc. Vì vậy đáp án 4 đúng."
  },
  {
    question:"Người điều khiển phương tiện tham gia giao thông không được dừng xe, đỗ xe ở những vị trí nào sau đây?",
    answer:3,
    text:"Cả vị trí trên miệng cống, miệng hầm kỹ thuật, chỗ dành cho xe chữa cháy lấy nước và vị trí trong phạm vi an toàn của đường sắt đều thuộc nhóm không được dừng, đỗ xe. Vì vậy đáp án 3: Cả hai ý trên là đúng."
  },
  {
    question:"Trên đường phố, người điều khiển phương tiện tham gia giao thông đường bộ được dừng xe, đỗ xe sát theo lề đường, vỉa hè phía bên phải theo chiều đi của mình; bánh xe gần nhất không được cách xa lề đường, vỉa hè không quá bao nhiêu mét trong các trường hợp dưới đây và không gây cản trở, nguy hiểm cho người và phương tiện tham gia giao thông đường bộ?",
    answer:1,
    text:"Khi dừng, đỗ sát lề đường hoặc vỉa hè bên phải theo chiều đi, bánh xe gần nhất không được cách lề quá 0,25 mét và không được gây cản trở, nguy hiểm. Vì vậy đáp án 1 đúng."
  },
  {
    question:"Khi dừng, đỗ xe trên đường phố hẹp, người lái xe ô tô phải dừng, đỗ xe ở vị trí cách xe ô tô đang đỗ ngược chiều khoảng cách tối thiểu là bao nhiêu mét trong các trường hợp dưới đây để bảo đảm an toàn?",
    answer:3,
    text:"Trên đường phố hẹp, khi có xe ô tô đỗ ở phía đối diện, khoảng cách tối thiểu cần bảo đảm là 20 mét. Vì vậy chọn đáp án 3."
  }
];

const trustedByQuestion=new Map(TRUSTED_EXPLANATIONS.map(item=>[normalizeQuestion(item.question),item]));

function correctOption(question){
  return question?.options?.find(option=>Number(option.n)===Number(question.answer));
}

function joinedSupportingOptions(question){
  const answer=Number(question?.answer)||0;
  const parts=(question?.options||[])
    .filter(option=>Number(option.n)<answer)
    .map(option=>`${option.n}. ${String(option.text||"").trim()}`)
    .filter(Boolean);
  return parts.join("; ");
}

function genericExplanation(question){
  const answer=correctOption(question);
  const answerText=String(answer?.text||"").trim();
  if(!answerText){
    return{text:"Hãy đọc lại câu hỏi và đối chiếu với phương án đúng trước khi chuyển sang câu tiếp theo.",source:"generated"};
  }

  const prompt=normalizeForIntent(question?.question||"");
  const normalizedAnswer=normalizeForIntent(answerText);
  const isCombined=/^(ca|tat ca).*(y tren|phuong an tren|dap an tren)/.test(normalizedAnswer)||/^(ca hai|ca ba|tat ca)/.test(normalizedAnswer);

  if(isCombined){
    const supporting=joinedSupportingOptions(question);
    if(/khong duoc|bi cam|nghiem cam|cam /.test(prompt)){
      return{text:`Câu hỏi yêu cầu nhận diện các trường hợp bị cấm hoặc không được phép. Các nội dung ở những phương án phía trên đều thuộc phạm vi câu hỏi${supporting?`: ${supporting}`:""}. Vì vậy đáp án ${question.answer}: ${answerText} là đúng.`,source:"generated"};
    }
    return{text:`Các nội dung ở những phương án phía trên đều phù hợp với yêu cầu của câu hỏi${supporting?`: ${supporting}`:""}. Vì vậy đáp án ${question.answer}: ${answerText} là đúng.`,source:"generated"};
  }

  if(/la gi|duoc hieu|khai niem/.test(prompt)){
    return{text:`Đây là câu hỏi về khái niệm. Định nghĩa đúng cần nhớ là phương án ${question.answer}: ${answerText} Hãy tập trung vào các từ khóa phân biệt khái niệm này với những khái niệm gần giống.`,source:"generated"};
  }
  if(/bao nhieu tuoi|do tuoi/.test(prompt)){
    return{text:`Câu hỏi kiểm tra mốc tuổi. Mốc đúng cần nhớ là phương án ${question.answer}: ${answerText} Hãy gắn mốc tuổi với đúng loại phương tiện hoặc hạng giấy phép được hỏi.`,source:"generated"};
  }
  if(/khong duoc|bi nghiem cam|bi cam|khong duoc phep|cam /.test(prompt)){
    return{text:`Câu hỏi yêu cầu xác định hành vi hoặc trường hợp không được phép. Nội dung đúng là phương án ${question.answer}: ${answerText} Khi làm dạng câu này, cần đọc kỹ từ khóa “không”, “cấm” hoặc “không được phép”.`,source:"generated"};
  }
  if(/phai lam gi|nhu the nao|thuc hien|xu ly/.test(prompt)){
    return{text:`Câu hỏi yêu cầu chọn cách xử lý đúng. Theo bộ câu hỏi hiện hành, hành động đúng là phương án ${question.answer}: ${answerText} Hãy ghi nhớ nội dung hành động thay vì chỉ học số thứ tự đáp án.`,source:"generated"};
  }
  if(Number(question?.topicId)===5){
    return{text:`Với câu báo hiệu đường bộ, cần nhận diện hình dạng, màu sắc, ký hiệu và phạm vi tác dụng. Ở câu này đáp án đúng là phương án ${question.answer}: ${answerText}`,source:"generated"};
  }
  if(Number(question?.topicId)===6){
    return{text:`Với câu sa hình hoặc tình huống, cần xác định thứ tự ưu tiên và hướng di chuyển trước khi chọn. Kết quả đúng của câu này là phương án ${question.answer}: ${answerText}`,source:"generated"};
  }
  return{text:`Đáp án đúng là phương án ${question.answer}: ${answerText} Nội dung của phương án này trả lời trực tiếp yêu cầu của câu hỏi; hãy ghi nhớ ý nghĩa của đáp án thay vì chỉ học số thứ tự.`,source:"generated"};
}

export function explanationForQuestion(question){
  const detailed=String(question?.explanation||question?.hint||"").trim();
  if(detailed)return{text:detailed,legal:"",source:"question-data"};

  const trusted=trustedByQuestion.get(normalizeQuestion(question?.question||""));
  if(trusted&&Number(trusted.answer)===Number(question?.answer)){
    return{text:trusted.text,legal:trusted.legal||"",source:"trusted"};
  }
  return genericExplanation(question);
}

export function validateExplanationCoverage(questions){
  const errors=[];
  if(!Array.isArray(questions))return["Dữ liệu câu hỏi không phải là mảng."];

  const currentByQuestion=new Map();
  for(const question of questions){
    const key=normalizeQuestion(question?.question||"");
    if(currentByQuestion.has(key))errors.push(`Câu ${question.id}: nội dung câu hỏi bị trùng, không thể ràng buộc lời giải an toàn.`);
    currentByQuestion.set(key,question);

    const result=explanationForQuestion(question);
    if(!String(result?.text||"").trim())errors.push(`Câu ${question.id}: không tạo được lời giải.`);
    if(result?.source==="generated"){
      const answerText=String(correctOption(question)?.text||"").trim();
      if(answerText&&!String(result.text).includes(answerText))errors.push(`Câu ${question.id}: lời giải tự động không chứa nội dung đáp án đúng.`);
    }
  }

  for(const trusted of TRUSTED_EXPLANATIONS){
    const question=currentByQuestion.get(normalizeQuestion(trusted.question));
    if(!question){
      errors.push(`Lời giải biên soạn không còn khớp câu hỏi hiện hành: ${trusted.question}`);
      continue;
    }
    if(Number(question.answer)!==Number(trusted.answer)){
      errors.push(`Câu ${question.id}: đáp án hiện hành là ${question.answer} nhưng lời giải biên soạn đang ràng buộc đáp án ${trusted.answer}.`);
    }
  }
  return errors;
}

export const trustedExplanationCount=TRUSTED_EXPLANATIONS.length;
