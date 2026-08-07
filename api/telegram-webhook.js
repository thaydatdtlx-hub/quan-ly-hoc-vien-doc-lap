import crypto from "node:crypto";
import { put } from "@vercel/blob";

const TELEGRAM_BOT_TOKEN=process.env.TELEGRAM_BOT_TOKEN||"";
const CHAT_BLOB_PATH="telegram/admin-chat.json";
const secret=()=>crypto.createHash("sha256").update(TELEGRAM_BOT_TOKEN).digest("hex").slice(0,64);

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
  const payload={
    chat_id:chat.id,
    telegram_user_id:from?.id||null,
    telegram_username:from?.username||null,
    first_name:from?.first_name||null,
    connected_at:new Date().toISOString()
  };
  await put(CHAT_BLOB_PATH,JSON.stringify(payload),{
    access:"private",
    contentType:"application/json",
    addRandomSuffix:false,
    allowOverwrite:true
  });
  return true;
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({ok:false});
  if(!TELEGRAM_BOT_TOKEN)return res.status(503).json({ok:false,error:"TELEGRAM_BOT_TOKEN is not configured"});
  if(req.headers["x-telegram-bot-api-secret-token"]!==secret())return res.status(401).json({ok:false});

  const message=req.body?.message;
  const text=String(message?.text||"").trim();
  if(text.startsWith("/start")){
    try{
      await saveChat(message);
      await telegram("sendMessage",{
        chat_id:message.chat.id,
        text:"✅ Đã kết nối thông báo Học lái xe cùng Đạt.\nTừ bây giờ, khi có đăng ký học mới, bot sẽ báo ngay tại đây."
      });
    }catch(error){
      console.error("telegram save chat failed",error);
      await telegram("sendMessage",{chat_id:message.chat.id,text:"⚠️ Chưa thể lưu kết nối. Vui lòng thử lại sau."});
    }
  }
  return res.status(200).json({ok:true});
}
