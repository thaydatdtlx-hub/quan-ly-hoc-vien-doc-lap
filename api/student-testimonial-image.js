import {get} from "@vercel/blob";

const PREFIX="student-testimonials/";

export default async function handler(req,res){
  if(req.method!=="GET")return res.status(405).end();
  const pathname=String(req.query?.pathname||"");
  if(!pathname.startsWith(PREFIX)||pathname.includes(".."))return res.status(400).end();
  try{
    const result=await get(pathname,{access:"private",useCache:true});
    if(!result||result.statusCode!==200)return res.status(404).end();
    res.setHeader("Content-Type",result.blob.contentType||"application/octet-stream");
    res.setHeader("Cache-Control","public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
    res.setHeader("X-Content-Type-Options","nosniff");
    const reader=result.stream.getReader();
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      res.write(Buffer.from(value));
    }
    res.end();
  }catch(error){
    console.error("testimonial image read failed",error);
    if(!res.headersSent)res.status(500).end();else res.end();
  }
}
