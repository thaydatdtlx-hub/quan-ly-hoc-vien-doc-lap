import crypto from "node:crypto";

const TELEGRAM_BOT_TOKEN=process.env.TELEGRAM_BOT_TOKEN||"";
const SITE_URL=(process.env.PUBLIC_SITE_URL||"https://hoclaixecungdat.vercel.app").replace(/\/$/,"");
const secret=()=>crypto.createHash("sha256").update(TELEGRAM_BOT_TOKEN).digest("hex").slice(0,64);

export default async function handler(req,res){
  if(req.method!=="GET"&&req.method!=="POST")return res.status(405).json({ok:false});
  if(!TELEGRAM_BOT_TOKEN)return res.status(503).json({ok:false,error:"TELEGRAM_BOT_TOKEN is not configured"});
  const response=await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      url:`${SITE_URL}/api/telegram-webhook`,
      secret_token:secret(),
      allowed_updates:["message"],
      drop_pending_updates:true
    })
  });
  const data=await response.json().catch(()=>({ok:false}));
  return res.status(response.ok?200:502).json({ok:Boolean(data?.ok),webhook:`${SITE_URL}/api/telegram-webhook`,telegram:data});
}
