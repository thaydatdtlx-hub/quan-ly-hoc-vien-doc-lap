const SUPABASE_URL=process.env.SUPABASE_URL||"https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
const TELEGRAM_BOT_TOKEN=process.env.TELEGRAM_BOT_TOKEN||"";
const SITE_URL=(process.env.PUBLIC_SITE_URL||"https://hoclaixecungdat.vercel.app").replace(/\/$/,"");

const headers=()=>({
  apikey:SUPABASE_SERVICE_ROLE_KEY,
  Authorization:`Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type":"application/json"
});

async function telegram(body){
  const response=await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>({ok:false}));
  if(!response.ok||!data?.ok)throw new Error(data?.description||"Telegram send failed");
  return data;
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({ok:false});
  if(!SUPABASE_SERVICE_ROLE_KEY||!TELEGRAM_BOT_TOKEN)return res.status(503).json({ok:false,error:"Telegram is not configured"});
  const registrationId=String(req.body?.registration_id||"").trim();
  if(!/^[0-9a-f-]{36}$/i.test(registrationId))return res.status(400).json({ok:false,error:"Invalid registration id"});

  const key=`new-student-registration:${registrationId}`;
  const existing=await fetch(`${SUPABASE_URL}/rest/v1/app_telegram_delivery_log?notification_key=eq.${encodeURIComponent(key)}&select=status&limit=1`,{headers:headers()});
  if(existing.ok){
    const rows=await existing.json().catch(()=>[]);
    if(rows?.[0]?.status==="sent"||rows?.[0]?.status==="processing")return res.status(200).json({ok:true,deduplicated:true});
  }

  const [registrationResponse,chatResponse]=await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/new_student_registrations?id=eq.${registrationId}&select=id,registration_code,full_name,phone,license_class,area,preferred_start_date,preferred_contact_time,consultation_channel,note,created_at&limit=1`,{headers:headers()}),
    fetch(`${SUPABASE_URL}/rest/v1/app_telegram_admin_chats?slot=eq.primary&active=eq.true&select=chat_id&limit=1`,{headers:headers()})
  ]);
  if(!registrationResponse.ok||!chatResponse.ok)return res.status(500).json({ok:false,error:"Database lookup failed"});
  const [registrationRows,chatRows]=await Promise.all([registrationResponse.json(),chatResponse.json()]);
  const r=registrationRows?.[0];
  const chatId=chatRows?.[0]?.chat_id;
  if(!r)return res.status(404).json({ok:false,error:"Registration not found"});
  if(!chatId)return res.status(409).json({ok:false,error:"Telegram chat is not connected"});

  await fetch(`${SUPABASE_URL}/rest/v1/app_telegram_delivery_log?on_conflict=notification_key`,{
    method:"POST",headers:{...headers(),Prefer:"resolution=merge-duplicates,return=minimal"},
    body:JSON.stringify({notification_key:key,registration_id:r.id,chat_id:chatId,status:"processing",updated_at:new Date().toISOString()})
  });

  const lines=[
    "🔔 ĐĂNG KÝ HỌC LÁI XE MỚI",
    `👤 ${r.full_name}`,
    `📞 ${r.phone}`,
    `🚘 Hạng: ${r.license_class}`,
    `📍 Khu vực: ${r.area}`,
    r.preferred_start_date?`📅 Dự kiến học: ${r.preferred_start_date}`:null,
    r.preferred_contact_time?`⏰ Liên hệ: ${r.preferred_contact_time}`:null,
    r.consultation_channel?`💬 Kênh tư vấn: ${r.consultation_channel}`:null,
    r.note?`📝 ${String(r.note).slice(0,500)}`:null,
    `🆔 ${r.registration_code}`
  ].filter(Boolean);

  try{
    const data=await telegram({
      chat_id:chatId,
      text:lines.join("\n"),
      reply_markup:{inline_keyboard:[[{text:"Mở Admin",url:`${SITE_URL}/?open=new-student&registration=${r.id}`}]]}
    });
    await fetch(`${SUPABASE_URL}/rest/v1/app_telegram_delivery_log?notification_key=eq.${encodeURIComponent(key)}`,{
      method:"PATCH",headers:headers(),body:JSON.stringify({status:"sent",provider_response:data,updated_at:new Date().toISOString()})
    });
    return res.status(200).json({ok:true});
  }catch(error){
    await fetch(`${SUPABASE_URL}/rest/v1/app_telegram_delivery_log?notification_key=eq.${encodeURIComponent(key)}`,{
      method:"PATCH",headers:headers(),body:JSON.stringify({status:"failed",last_error:String(error?.message||error),updated_at:new Date().toISOString()})
    });
    return res.status(502).json({ok:false,error:"Telegram send failed"});
  }
}
