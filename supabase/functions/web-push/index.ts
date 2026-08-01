import {createClient} from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")??"";
const SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const VAPID_PUBLIC_KEY=Deno.env.get("VAPID_PUBLIC_KEY")??"";
const VAPID_PRIVATE_KEY=Deno.env.get("VAPID_PRIVATE_KEY")??"";
const VAPID_SUBJECT=Deno.env.get("VAPID_SUBJECT")??"https://hoc-vien-thay-dat.vercel.app/";
const SITE_URL="https://hoc-vien-thay-dat.vercel.app";
const supabase=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false}});

function corsHeaders(request:Request){
  const origin=request.headers.get("origin")??"";
  const allowed=origin===SITE_URL||origin.startsWith("http://localhost:")?origin:SITE_URL;
  return{"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Vary":"Origin"};
}
function json(request:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders(request),"Content-Type":"application/json; charset=utf-8"}})}

Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders(request)});
  if(request.method==="GET")return json(request,{publicKey:VAPID_PUBLIC_KEY,configured:Boolean(VAPID_PUBLIC_KEY&&VAPID_PRIVATE_KEY)});
  if(request.method!=="POST")return json(request,{error:"Method not allowed"},405);

  const authorization=request.headers.get("authorization")??"";
  if(!SERVICE_ROLE_KEY||authorization!==`Bearer ${SERVICE_ROLE_KEY}`)return json(request,{error:"Unauthorized"},401);
  if(!VAPID_PUBLIC_KEY||!VAPID_PRIVATE_KEY)return json(request,{error:"VAPID secrets are not configured"},503);

  const payload=await request.json().catch(()=>null);
  const notice=payload?.record??payload;
  if(!notice?.id||!["manager","student"].includes(notice.recipient_kind)||!notice.recipient_id)return json(request,{error:"Invalid notification payload"},400);

  webpush.setVapidDetails(VAPID_SUBJECT,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY);
  const {data:subscriptions,error}=await supabase.from("app_push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("recipient_kind",notice.recipient_kind)
    .eq("recipient_id",notice.recipient_id)
    .eq("active",true);
  if(error)return json(request,{error:error.message},500);

  const message=JSON.stringify({
    id:notice.id,
    title:notice.title||"Thông báo từ Thầy Đạt",
    body:notice.body||"Bạn có một cập nhật mới.",
    url:notice.href|| (notice.recipient_kind==="student"?"/hoc-vien.html":"/"),
    tag:notice.notification_key||notice.id,
    category:notice.category||"general"
  });
  let sent=0,disabled=0;
  await Promise.all((subscriptions??[]).map(async subscription=>{
    try{
      await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},message,{TTL:86400,urgency:"normal"});
      sent++;
      await supabase.from("app_push_subscriptions").update({last_error:null,last_error_at:null,last_seen_at:new Date().toISOString()}).eq("endpoint",subscription.endpoint);
    }catch(cause){
      const statusCode=Number((cause as {statusCode?:number})?.statusCode||0);
      const expired=statusCode===404||statusCode===410;
      if(expired)disabled++;
      await supabase.from("app_push_subscriptions").update({active:!expired,last_error:String((cause as Error)?.message||cause).slice(0,500),last_error_at:new Date().toISOString()}).eq("endpoint",subscription.endpoint);
    }
  }));
  return json(request,{ok:true,sent,disabled});
});
