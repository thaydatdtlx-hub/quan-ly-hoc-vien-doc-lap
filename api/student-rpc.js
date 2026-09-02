const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const DEFAULT_MAX_BODY_CHARS=20000;
const LARGE_BODY_LIMITS=new Map([
  ["app_save_student",1200000],
  ["app_student_update_profile",1000000]
]);
const ALLOWED=new Set([
  "app_student_login",
  "app_login",
  "app_me",
  "app_list_students",
  "app_list_users",
  "app_list_student_accounts",
  "app_admin_list_public_theory_accounts",
  "app_admin_list_course_schedules",
  "app_admin_save_course_schedule",
  "app_admin_delete_course_schedule",
  "app_list_deleted_students",
  "app_list_audit_logs",
  "app_list_student_payments",
  "app_list_attendance_records",
  "app_admin_list_theory_progress",
  "app_list_training_hour_targets",
  "app_student_portal",
  "app_student_me",
  "app_student_update_profile",
  "app_student_logout",
  "app_logout",
  "app_student_list_attendance",
  "app_student_list_payments",
  "app_list_training_sessions",
  "app_list_training_requests",
  "app_list_training_slots",
  "app_list_notifications",
  "app_mark_notifications_read",
  "app_student_get_theory_progress",
  "app_student_cancel_training_request",
  "app_student_create_training_request",
  "app_student_create_training_request_slot",
  "app_student_change_password",
  "app_record_audit",
  "app_save_student",
  "app_admin_set_student_tuition_total",
  "app_admin_save_student_schedule",
  "app_admin_save_training_session",
  "app_admin_delete_training_session",
  "app_admin_save_training_slot",
  "app_admin_delete_training_slot",
  "app_admin_review_training_request",
  "app_admin_review_training_request_slot"
]);

async function upstream(fn,serializedBody,timeoutMs=8000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:"POST",
    signal:controller.signal,
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:serializedBody
  })}finally{clearTimeout(timer)}
}

function parsedBody(req){
  if(req.body&&typeof req.body==="object")return req.body;
  if(typeof req.body==="string"){
    try{return JSON.parse(req.body)}catch{return {}}
  }
  return {};
}

function bodyLimit(fn){return LARGE_BODY_LIMITS.get(fn)||DEFAULT_MAX_BODY_CHARS}
function largeRequestMessage(fn){
  return LARGE_BODY_LIMITS.has(fn)
    ?"Ảnh sau khi nén vẫn quá lớn. Vui lòng chọn ảnh khác hoặc giảm kích thước ảnh."
    :"Dữ liệu gửi lên quá lớn.";
}

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("X-Student-RPC","same-origin-v4");
  if(req.method==="GET"){
    try{
      const response=await upstream("app_public_site_config","{}",5000);
      return res.status(response.ok?200:502).json({ok:response.ok,upstreamStatus:response.status});
    }catch(error){
      console.error("[student-rpc] health failed",{timeout:error?.name==="AbortError"});
      return res.status(error?.name==="AbortError"?504:502).json({ok:false});
    }
  }
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const incoming=parsedBody(req);
  const fn=String(incoming.fn||"");
  if(!ALLOWED.has(fn))return res.status(400).json({error:"RPC not allowed"});
  const body=incoming.body&&typeof incoming.body==="object"?incoming.body:{};
  const serializedBody=JSON.stringify(body);
  const limit=bodyLimit(fn);
  if(serializedBody.length>limit){
    return res.status(413).json({
      error:"Request too large",
      message:largeRequestMessage(fn),
      maxChars:limit
    });
  }
  try{
    const timeoutMs=serializedBody.length>DEFAULT_MAX_BODY_CHARS?15000:8000;
    const response=await upstream(fn,serializedBody,timeoutMs);
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