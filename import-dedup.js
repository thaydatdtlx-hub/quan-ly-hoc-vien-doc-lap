function normalized(value){
  return String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
}

function digits(value){return String(value??"").replace(/\D/g,"")}
function phoneDigits(value){
  let valueDigits=digits(value);
  if(valueDigits.startsWith("84")&&valueDigits.length===11)valueDigits=`0${valueDigits.slice(2)}`;
  if(valueDigits.length===9&&/^[35789]/.test(valueDigits))valueDigits=`0${valueDigits}`;
  return valueDigits;
}

export function studentIdentityKeys(student){
  const code=normalized(student?.student_code),cccd=digits(student?.cccd),phone=phoneDigits(student?.phone),keys=[];
  if(code)keys.push(`code:${code}`);
  if(cccd.length>=9)keys.push(`cccd:${cccd}`);
  if(phone.length>=9)keys.push(`phone:${phone}`);
  return keys;
}

function possibleKey(student){
  const name=normalized(student?.name),dob=String(student?.date_of_birth||"").slice(0,10);
  return name&&dob?`${name}|${dob}`:"";
}

function buildIndex(list){
  const strong=new Map(),possible=new Map();
  for(const item of list||[]){
    for(const key of studentIdentityKeys(item))if(!strong.has(key))strong.set(key,item);
    const weak=possibleKey(item);if(weak&&!possible.has(weak))possible.set(weak,item);
  }
  return{strong,possible};
}

export function analyzeStudentImport(records,activeStudents=[],deletedStudents=[]){
  const active=buildIndex(activeStudents),deleted=buildIndex(deletedStudents),seen=new Map();
  return records.map((record,index)=>{
    const keys=studentIdentityKeys(record),fileDuplicateKey=keys.find(key=>seen.has(key));
    const activeKey=keys.find(key=>active.strong.has(key)),deletedKey=keys.find(key=>deleted.strong.has(key));
    const activeMatch=activeKey?active.strong.get(activeKey):null,deletedMatch=deletedKey?deleted.strong.get(deletedKey):null;
    let status="new",match=null,reason="Hồ sơ mới";
    if(fileDuplicateKey){status="duplicate_file";match=records[seen.get(fileDuplicateKey)];reason="Trùng với một dòng phía trên trong cùng file"}
    else if(activeMatch){status="existing";match=activeMatch;reason=activeKey.startsWith("code:")?"Trùng mã học viên":activeKey.startsWith("cccd:")?"Trùng CCCD":"Trùng số điện thoại"}
    else if(deletedMatch){status="deleted";match=deletedMatch;reason="Hồ sơ đang nằm trong Thùng rác"}
    else{
      const weak=possibleKey(record),possibleMatch=weak?active.possible.get(weak)||deleted.possible.get(weak):null;
      if(possibleMatch){status="review";match=possibleMatch;reason="Trùng họ tên và ngày sinh – cần kiểm tra"}
    }
    if(!fileDuplicateKey)for(const key of keys)if(!seen.has(key))seen.set(key,index);
    return{...record,_import:{status,match,reason,keys,rowNumber:record._rowNumber||index+2}};
  });
}

export function importSummary(analysis){
  const summary={new:0,existing:0,deleted:0,duplicate_file:0,review:0};
  for(const item of analysis||[])summary[item?._import?.status]++;
  return summary;
}
