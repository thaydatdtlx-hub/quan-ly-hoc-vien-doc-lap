import crypto from "node:crypto";

const SUPABASE_URL=process.env.SUPABASE_URL||"https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_ADMIN_KEY=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"";
const TELEGRAM_BOT_TOKEN=process.env.TELEGRAM_BOT_TOKEN||"";

const secret=()=>crypto.createHash("sha256").update(TELEGRAM_BOT_TOKEN).digest("hex").slice(0,64);

function supabaseHeaders(extra={}){
  const base={apikey:SUPABASE_ADMIN_KEY,"Content-Type":"application/json",...extra};
  if(SUPABASE_ADMIN_KEY&&!SUPABASE_ADMIN_KEY.startsWith("sb_secret_")){
    base.Authorization=`Bearer ${SUPABASE_ADMIN_KEY}`;
  }
  return base;
}

async function telegram(method,body){
  const response=await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  return response.json().catch(()=>({ok:false}));
}

async function saveChat(message){
  const chat=message?.chat;
  const from=message?.from;
  if(!chat?.id||chat.type!=="private")return false;
  const response=await fetch(`${SUPABASE_URL}/rest/v1/app_telegram_admin_chats?on_conflict=slot`,{
    method:"POST",
    headers:supabaseHeaders({Prefer:"resolution=merge-duplicates,return=minimal"}),
    body:JSON.stringify({
      slot:"primary",
      chat_id:chat.id,
      telegram_user_id:from?.id||null,
      telegram_username:from?.username||null,
      first_name:from?.first_name||null,
      active:true,
      connected_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    })
  });
  return response.ok;
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({ok:false});
  if(!TELEGRAM_BOT_TOKEN)return res.status(503).json({ok:false,error:"TELEGRAM_BOT_TOKEN is not configured"});
  if(!SUPABASE_ADMIN_KEY)return res.status(503).json({ok:false,error:"SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is not configured"});
  if(req.headers["x-telegram-bot-api-secret-token"]!==secret())return res.status(401).json({ok:false});

  const message=req.body?.message;
  const text=String(message?.text||"").trim();
  if(text.startsWith("/start")){
    const saved=await saveChat(message);
    if(saved){
      await telegram("sendMessage",{
        chat_id:message.chat.id,
        text:"✅ Đã kết nối thông báo Học lái xe cùng Đạt.\nTừ bây giờ, khi có đăng ký học mới, bot sẽ báo ngay tại đây."
      });
    }else{
      await telegram("sendMessage",{chat_id:message.chat.id,text:"⚠️ Chưa thể lưu kết nối. Vui lòng thử lại sau."});
    }
  }
  return res.status(200).json({ok:true});
}
