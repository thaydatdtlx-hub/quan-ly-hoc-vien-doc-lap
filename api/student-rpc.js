const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const ALLOWED=new Set([
  "app_student_login",
  "app_login",
  "app_student_portal",
  "app_student_me",
  "app_student_logout",
  "app_student_list_attendance",
  "app_student_list_payments"
]);

function parsedBody(req){
  if(req.body&&typeof req.body==="object")return req.body;
  if(typeof req.body==="string"){
    try{return JSON.parse(req.body)}catch{return {}}
  }
  return {};
}

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("X-Student-RPC","same-origin-v1");
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const incoming=parsedBody(req);
  const fn=String(incoming.fn||"");
  if(!ALLOWED.has(fn))return res.status(400).json({error:"RPC not allowed"});
  const body=incoming.body&&typeof incoming.body==="object"?incoming.body:{};
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
