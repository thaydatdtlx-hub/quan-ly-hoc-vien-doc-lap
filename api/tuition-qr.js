const BANK_BIN="970422";
const ACCOUNT_NUMBER="360556789999";
const ACCOUNT_NAME="TRAN QUOC DAT";

function cleanAmount(value){
  const amount=Math.max(0,Math.round(Number(value)||0));
  return Number.isSafeInteger(amount)&&amount<=9_999_999_999_999?amount:0;
}

function cleanInfo(value){
  return String(value??"HOC PHI")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[đĐ]/g,char=>char==="đ"?"d":"D")
    .replace(/[^a-zA-Z0-9 ]+/g," ")
    .replace(/\s+/g," ")
    .trim()
    .slice(0,50)||"HOC PHI";
}

function escapeXml(value){
  return String(value).replace(/[&<>\"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[char]));
}

function fallbackSvg(){
  const account=escapeXml(ACCOUNT_NUMBER);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" role="img" aria-label="Thông tin chuyển khoản học phí"><rect width="480" height="480" fill="#fff"/><rect x="16" y="16" width="448" height="448" rx="24" fill="#f6f9fc" stroke="#cfdae5" stroke-width="4"/><text x="240" y="185" text-anchor="middle" font-family="Arial,sans-serif" font-size="29" font-weight="700" fill="#082f63">QR tạm thời chưa tải được</text><text x="240" y="242" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" fill="#52697f">MB Bank · Trần Quốc Đạt</text><text x="240" y="298" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" font-weight="700" fill="#172b42">${account}</text><text x="240" y="350" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="#63788f">Vui lòng chuyển khoản theo thông tin trên</text></svg>`;
}

export default async function handler(req,res){
  if(req.method!=="GET"){
    res.setHeader("Allow","GET");
    return res.status(405).json({error:"Method not allowed"});
  }

  const amount=cleanAmount(req.query?.amount);
  const addInfo=cleanInfo(req.query?.addInfo);
  const upstreamUrl=new URL(`https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NUMBER}-qr_only.png`);
  if(amount)upstreamUrl.searchParams.set("amount",String(amount));
  upstreamUrl.searchParams.set("addInfo",addInfo);
  upstreamUrl.searchParams.set("accountName",ACCOUNT_NAME);

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const upstream=await fetch(upstreamUrl,{
      headers:{accept:"image/png,image/*;q=0.9,*/*;q=0.8"},
      signal:controller.signal
    });
    if(!upstream.ok)throw new Error(`VietQR ${upstream.status}`);
    const buffer=Buffer.from(await upstream.arrayBuffer());
    if(!buffer.length)throw new Error("VietQR empty response");
    res.setHeader("Content-Type",upstream.headers.get("content-type")||"image/png");
    res.setHeader("Cache-Control","public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
    res.setHeader("X-Content-Type-Options","nosniff");
    return res.status(200).send(buffer);
  }catch{
    res.setHeader("Content-Type","image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control","no-store");
    res.setHeader("X-Tuition-QR-Fallback","1");
    return res.status(200).send(fallbackSvg());
  }finally{
    clearTimeout(timeout);
  }
}
