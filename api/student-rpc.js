const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const ALLOWED=new Set([
  "app_student_portal",
  "app_student_me",
  "app_student_logout",
  "app_student_list_attendance",
  "app_student_list_payments",
  "app_list_training_sessions"
]);

async function upstream(fn,body,timeoutMs=8000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:"POST",
    signal:controller.signal,
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  })}finally{clearTimeout(timer)}
}

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  if(req.method==="GET"){
    try{
      const response=await upstream("app_public_site_config",{},5000);
      return res.status(response.ok?200:502).json({ok:response.ok,upstreamStatus:response.status});
    }catch(error){
      console.error("[student-rpc] health failed",{timeout:error?.name==="AbortError"});
      return res.status(error?.name==="AbortError"?504:502).json({ok:false});
    }
  }
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const fn=String(req.body?.fn||"");
  if(!ALLOWED.has(fn))return res.status(400).json({error:"RPC not allowed"});
  const body=req.body?.body&&typeof req.body.body==="object"?req.body.body:{};
  if(JSON.stringify(body).length>20000)return res.status(413).json({error:"Request too large"});
  try{
    const response=await upstream(fn,body);
    const text=await response.text();
    if(!response.ok)console.warn("[student-rpc] upstream rejected",{fn,status:response.status});
    res.status(response.status);
    try{return res.json(text?JSON.parse(text):null)}catch{return res.send(text)}
  }catch(error){
    const timeout=error?.name==="AbortError";
    console.error("[student-rpc] upstream unavailable",{fn,timeout});
    return res.status(timeout?504:502).json({error:timeout?"Upstream timeout":"Upstream unavailable"});
  }
}
