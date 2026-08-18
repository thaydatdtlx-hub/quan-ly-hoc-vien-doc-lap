export function normalizeCoreRpcPayload(payload){
  let value=payload;
  for(let depth=0;depth<6;depth++){
    if(typeof value==="string"){
      try{value=JSON.parse(value);continue}catch{return null}
    }
    if(Array.isArray(value)){
      if(!value.length)return null;
      value=value[0];
      continue;
    }
    if(value&&typeof value==="object"){
      if(value.id!=null||value.student_id!=null||value.username!=null)return value;
      const nested=value.data??value.result??value.student??value.profile??value.account;
      if(nested!==undefined&&nested!==value){value=nested;continue}
    }
    break;
  }
  return value&&typeof value==="object"&&!Array.isArray(value)?value:null;
}

export function isStudentAuthError(error){
  const status=Number(error?.status)||0;
  const message=String(error?.message||"");
  return status===401||status===403||/phiên đăng nhập.*(?:không hợp lệ|hết hạn)|invalid.*session|session.*expired|không phải tài khoản học viên/i.test(message);
}
