import {del,list} from "@vercel/blob";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const PREFIX="student-testimonials/";
const ALLOWED_TYPES=new Set(["image/jpeg","image/png","image/webp"]);

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

function publicImageUrl(pathname){return `/api/student-testimonial-image?pathname=${encodeURIComponent(pathname)}`}

function validPathname(pathname){
  return typeof pathname==="string"&&pathname.startsWith(PREFIX)&&/\.(?:jpe?g|png|webp)$/i.test(pathname);
}

async function listImages(){
  const result=await list({prefix:PREFIX,limit:100});
  return [...(result.blobs||[])]
    .filter(item=>ALLOWED_TYPES.has(item.contentType||"")||/\.(?:jpe?g|png|webp)$/i.test(item.pathname||""))
    .sort((a,b)=>new Date(b.uploadedAt||0)-new Date(a.uploadedAt||0))
    .map(item=>({pathname:item.pathname,imageUrl:publicImageUrl(item.pathname),uploadedAt:item.uploadedAt||null}));
}

export default async function handler(req,res){
  if(req.method==="GET"){
    try{
      const images=await listImages();
      res.setHeader("Cache-Control","no-store");
      return res.status(200).json({images});
    }catch(error){
      console.error("testimonial list failed",error);
      return res.status(500).json({error:"Không thể tải danh sách ảnh nhận xét."});
    }
  }

  if(req.method==="DELETE"){
    const token=String(req.headers["x-admin-token"]||"");
    if(!(await verifyAdmin(token)))return res.status(403).json({error:"Chỉ tài khoản Admin mới được xóa hình ảnh."});
    const pathname=String(req.body?.pathname||"");
    if(!validPathname(pathname))return res.status(400).json({error:"Đường dẫn hình ảnh không hợp lệ."});
    try{
      await del(pathname);
      return res.status(200).json({ok:true,pathname});
    }catch(error){
      console.error("testimonial delete failed",error);
      return res.status(500).json({error:"Không thể xóa hình ảnh. Vui lòng thử lại."});
    }
  }

  return res.status(405).json({error:"Method not allowed"});
}
