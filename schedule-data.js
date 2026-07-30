export const SCHEDULE_FIELDS=[
  {key:"online_start",label:"Bắt đầu lý thuyết online",short:"BĐ Online",icon:"▶",tone:"blue",dateOnly:true},
  {key:"online_end",label:"Kết thúc lý thuyết online",short:"KT Online",icon:"■",tone:"green",dateOnly:true},
  {key:"familiar",label:"Thực hành làm quen xe",short:"Làm quen xe",icon:"🚘",tone:"cyan"},
  {key:"cabin",label:"Học cabin",short:"Cabin",icon:"🧭",tone:"violet"},
  {key:"practice",label:"Học sa hình",short:"Sa hình",icon:"🛣️",tone:"orange"},
  {key:"dat_auto_start",label:"Bắt đầu DAT số tự động",short:"BĐ DAT tự động",icon:"▶",tone:"cyan",onlyFor:"b_manual"},
  {key:"dat_auto_end",label:"Kết thúc DAT số tự động",short:"KT DAT tự động",icon:"■",tone:"green",onlyFor:"b_manual"},
  {key:"dat_manual_start",label:"Bắt đầu DAT số cơ khí",short:"BĐ DAT cơ khí",icon:"▶",tone:"orange",onlyFor:"b_manual"},
  {key:"dat_manual_end",label:"Kết thúc DAT số cơ khí",short:"KT DAT cơ khí",icon:"■",tone:"violet",onlyFor:"b_manual"},
  {key:"graduation",label:"Thi tốt nghiệp",short:"Tốt nghiệp",icon:"🎓",tone:"green"},
  {key:"exam",label:"Thi sát hạch",short:"Sát hạch",icon:"🏁",tone:"red"}
];

const TOKEN_RE=/(?:\n\n)?\[\[HV_SCHEDULE_V1:([A-Za-z0-9+/=]+)\]\]\s*$/;

function encode(value){
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  let binary="";
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary);
}

function decode(value){
  const binary=atob(value),bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function stripScheduleFromNotes(notes=""){
  return String(notes||"").replace(TOKEN_RE,"").trim();
}

export function parseScheduleFromNotes(notes=""){
  const match=String(notes||"").match(TOKEN_RE);
  if(!match)return null;
  try{
    const value=decode(match[1]);
    if(!value||typeof value!=="object")return null;
    value.dates=value.dates&&typeof value.dates==="object"?value.dates:{};
    value.locations=value.locations&&typeof value.locations==="object"?value.locations:{};
    if(value.dates.online&&!value.dates.online_start)value.dates.online_start=String(value.dates.online).slice(0,10);
    if(value.locations.online&&!value.locations.online_start)value.locations.online_start=value.locations.online;
    delete value.dates.online;
    delete value.locations.online;
    return value;
  }catch{return null}
}

export function embedScheduleInNotes(notes="",schedule=null){
  const clean=stripScheduleFromNotes(notes);
  if(!schedule)return clean;
  const token=`[[HV_SCHEDULE_V1:${encode(schedule)}]]`;
  return clean?`${clean}\n\n${token}`:token;
}
