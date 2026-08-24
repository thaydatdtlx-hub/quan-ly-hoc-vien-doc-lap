import { get } from "@vercel/blob";

const TELEGRAM_BOT_TOKEN=process.env.TELEGRAM_BOT_TOKEN||"";
const SITE_URL=(process.env.PUBLIC_SITE_URL||"https://www.hoclaixecungdat.com").replace(/\/$/,"");
const CHAT_BLOB_PATH="telegram/admin-chat.json";

async function telegram(body){
  const response=await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>({ok:false}));
  if(!response.ok||!data?.ok)throw new Error(data?.description||"Telegram send failed");
  return data;
}

async function readChatId(){
  const result=await get(CHAT_BLOB_PATH,{access:"private",useCache:false});
  if(!result||result.statusCode!==200)return null;
  const text=await new Response(result.stream).text();
  const data=JSON.parse(text);
  return data?.chat_id||null;
}

const clean=(value,max=500)=>String(value??"").trim().slice(0,max);

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({ok:false});
  if(!TELEGRAM_BOT_TOKEN)return res.status(503).json({ok:false,error:"Telegram is not configured"});

  const r=req.body?.registration||{};
  const registrationId=clean(r.id,80);
  const fullName=clean(r.full_name,120);
  const phone=clean(r.phone,40);
  const licenseClass=clean(r.license_class,20);
  if(!registrationId||!fullName||!phone||!licenseClass){
    return res.status(400).json({ok:false,error:"Invalid registration payload"});
  }

  let chatId;
  try{chatId=await readChatId()}catch(error){
    console.error("telegram read chat failed",error);
    return res.status(500).json({ok:false,error:"Telegram chat lookup failed"});
  }
  if(!chatId)return res.status(409).json({ok:false,error:"Telegram chat is not connected"});

  const lines=[
    "🔔 ĐĂNG KÝ HỌC LÁI XE MỚI",
    `👤 ${fullName}`,
    `📞 ${phone}`,
    `🚘 Hạng: ${licenseClass}`,
    clean(r.area,120)?`📍 Khu vực: ${clean(r.area,120)}`:null,
    clean(r.preferred_start_date,40)?`📅 Dự kiến học: ${clean(r.preferred_start_date,40)}`:null,
    clean(r.preferred_contact_time,80)?`⏰ Liên hệ: ${clean(r.preferred_contact_time,80)}`:null,
    clean(r.consultation_channel,80)?`💬 Kênh tư vấn: ${clean(r.consultation_channel,80)}`:null,
    clean(r.note,500)?`📝 ${clean(r.note,500)}`:null,
    clean(r.registration_code,80)?`🆔 ${clean(r.registration_code,80)}`:null
  ].filter(Boolean);

  try{
    await telegram({
      chat_id:chatId,
      text:lines.join("\n"),
      reply_markup:{inline_keyboard:[[{text:"Mở Admin",url:`${SITE_URL}/?open=new-student&registration=${encodeURIComponent(registrationId)}`}]]}
    });
    return res.status(200).json({ok:true});
  }catch(error){
    console.error("telegram send failed",error);
    return res.status(502).json({ok:false,error:"Telegram send failed"});
  }
}
