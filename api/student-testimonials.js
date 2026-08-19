import {get,list,put} from "@vercel/blob";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const PREFIX="student-testimonials/";
const ALLOWED_TYPES=new Set(["image/jpeg","image/png","image/webp"]);
const MAX_BYTES=7*1024*1024;

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

function extension(type){
  if(type==="image/png")return"png";
  if(type==="image/webp")return"webp";
  return"jpg";
}

function safeName(value="image"){
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"image";
}

function publicImageUrl(pathname){return `/api/student-testimonial-image?pathname=${encodeURIComponent(pathname)}`}

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

  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

  const token=String(req.headers["x-admin-token"]||"");
  if(!(await verifyAdmin(token)))return res.status(403).json({error:"Chỉ tài khoản Admin mới được thêm hình ảnh."});

  const type=String(req.body?.type||"");
  const name=safeName(req.body?.name||"image");
  const data=String(req.body?.data||"");
  if(!ALLOWED_TYPES.has(type))return res.status(400).json({error:"Chỉ hỗ trợ JPG, PNG hoặc WebP."});
  const expectedPrefix=`data:${type};base64,`;
  if(!data.startsWith(expectedPrefix))return res.status(400).json({error:"Dữ liệu hình ảnh không hợp lệ."});
  let bytes;
  try{bytes=Buffer.from(data.slice(expectedPrefix.length),"base64")}catch{return res.status(400).json({error:"Không đọc được dữ liệu hình ảnh."})}
  if(!bytes.length||bytes.length>MAX_BYTES)return res.status(400).json({error:"Ảnh phải nhỏ hơn 7 MB."});

  try{
    const pathname=`${PREFIX}${Date.now()}-${name.replace(/\.[a-z0-9]+$/i,"")}.${extension(type)}`;
    const blob=await put(pathname,bytes,{access:"private",contentType:type,addRandomSuffix:true});
    return res.status(201).json({ok:true,pathname:blob.pathname,imageUrl:publicImageUrl(blob.pathname)});
  }catch(error){
    console.error("testimonial upload failed",error);
    return res.status(500).json({error:"Không thể lưu hình ảnh. Vui lòng thử lại."});
  }
}
