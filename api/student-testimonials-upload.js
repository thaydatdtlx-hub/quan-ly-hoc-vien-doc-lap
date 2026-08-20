import {handleUpload} from "@vercel/blob/client";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const PREFIX="student-testimonials/";
const MAX_BYTES=10*1024*1024;
const ALLOWED_TYPES=["image/jpeg","image/png","image/webp"];

async function verifyAdmin(token){
  if(!token)return false;
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/app_me`,{
    method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({p_token:token})
  });
  if(!response.ok)return false;
  const me=await response.json().catch(()=>null);
  return me?.role==="admin";
}

function validPathname(pathname){
  return typeof pathname==="string"&&pathname.startsWith(PREFIX)&&/\.(?:jpe?g|png|webp)$/i.test(pathname);
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

  try{
    const response=await handleUpload({
      body:req.body,
      request:req,
      onBeforeGenerateToken:async(pathname,clientPayload)=>{
        if(!validPathname(pathname))throw new Error("Đường dẫn hình ảnh không hợp lệ.");
        let payload={};
        try{payload=JSON.parse(clientPayload||"{}")}catch{}
        if(!(await verifyAdmin(String(payload?.token||"")))){
          throw new Error("Chỉ tài khoản Admin mới được thêm hình ảnh.");
        }
        return{
          allowedContentTypes:ALLOWED_TYPES,
          maximumSizeInBytes:MAX_BYTES,
          addRandomSuffix:true,
          allowOverwrite:false,
          tokenPayload:JSON.stringify({scope:"student-testimonials"})
        };
      },
      onUploadCompleted:async({blob,tokenPayload})=>{
        let payload={};
        try{payload=JSON.parse(tokenPayload||"{}")}catch{}
        if(payload?.scope!=="student-testimonials"||!validPathname(blob?.pathname)){
          throw new Error("Ảnh tải lên không thuộc khu nhận xét học viên.");
        }
      }
    });
    return res.status(200).json(response);
  }catch(error){
    console.error("testimonial client upload failed",error);
    return res.status(400).json({error:error?.message||"Không thể tải ảnh lên."});
  }
}
