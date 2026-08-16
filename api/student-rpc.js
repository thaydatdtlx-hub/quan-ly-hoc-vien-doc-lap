const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const ALLOWED=new Set([
  "app_student_portal",
  "app_student_me",
  "app_student_logout",
  "app_student_list_attendance",
  "app_student_list_payments"
]);

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const fn=String(req.body?.fn||"");
  if(!ALLOWED.has(fn))return res.status(400).json({error:"RPC not allowed"});
  const body=req.body?.body&&typeof req.body.body==="object"?req.body.body:{};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
      method:"POST",
      signal:controller.signal,
      headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json","Cache-Control":"no-store"},
      body:JSON.stringify(body)
    });
    const text=await response.text();
    res.status(response.status);
    try{return res.json(text?JSON.parse(text):null)}catch{return res.send(text)}
  }catch(error){
    const timeout=error?.name==="AbortError";
    return res.status(timeout?504:502).json({error:timeout?"Upstream timeout":"Upstream unavailable"});
  }finally{clearTimeout(timer)}
}
