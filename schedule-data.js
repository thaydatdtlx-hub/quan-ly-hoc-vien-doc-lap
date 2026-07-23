export const SCHEDULE_FIELDS=[
  {key:"online",label:"Lý thuyết online",short:"Online",icon:"💻",tone:"blue"},
  {key:"familiar",label:"Thực hành làm quen xe",short:"Làm quen xe",icon:"🚘",tone:"cyan"},
  {key:"cabin",label:"Học cabin",short:"Cabin",icon:"🧭",tone:"violet"},
  {key:"practice",label:"Học sa hình",short:"Sa hình",icon:"🛣️",tone:"orange"},
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
    return value&&typeof value==="object"?value:null;
  }catch{return null}
}

export function embedScheduleInNotes(notes="",schedule=null){
  const clean=stripScheduleFromNotes(notes);
  if(!schedule)return clean;
  const token=`[[HV_SCHEDULE_V1:${encode(schedule)}]]`;
  return clean?`${clean}\n\n${token}`:token;
}
