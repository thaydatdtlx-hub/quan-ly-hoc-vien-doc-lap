const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const OPENAI_ENDPOINT="https://api.openai.com/v1/responses";
const MAX_MESSAGES=8;
const MAX_MESSAGE_LENGTH=1200;

const SYSTEM_PROMPT=`Bạn là Trợ lý AI Thầy Đạt, trợ giảng lái xe bằng tiếng Việt Nam.
Mục tiêu: giải thích ngắn gọn, chính xác, dễ nhớ về bộ 600 câu lý thuyết; hướng dẫn dùng website; giải thích DAT, lịch học và quy trình đào tạo.
Quy tắc:
- Trả lời thân thiện, chuyên nghiệp, ưu tiên 3-7 câu; có thể dùng gạch đầu dòng khi hữu ích.
- Khi ngữ cảnh có câu hỏi 600 câu và đáp án chính xác, phải dựa vào ngữ cảnh đó, giải thích vì sao đúng và vì sao phương án dễ nhầm là sai.
- Không tự bịa đáp án, luật, lịch học, học phí hay thông tin cá nhân. Nếu thiếu dữ liệu, nói rõ và hướng dẫn người học mở đúng mục hoặc liên hệ Thầy Đạt.
- Lịch học chính thức chỉ là lịch hiển thị trong tài khoản/thông báo đã được Admin duyệt.
- Không yêu cầu CCCD, mật khẩu, mã OTP, thông tin ngân hàng hoặc dữ liệu nhạy cảm.
- Không tuyên bố thay thế giáo viên hay quy định sát hạch chính thức.
- Nếu câu hỏi không liên quan đến học lái xe hoặc website, lịch sự đưa cuộc trò chuyện về đúng phạm vi.`;

function send(res,status,payload){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  res.end(JSON.stringify(payload));
}

async function validateAccount(token,authKind){
  if(!token||typeof token!=="string"||token.length>500)return null;
  const preferred=["student","public_theory"].includes(authKind)?"app_student_me":"app_me";
  const functions=[preferred,preferred==="app_me"?"app_student_me":"app_me"];
  for(const name of functions){
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({p_token:token})});
    if(response.ok){const account=await response.json().catch(()=>null);if(account?.id)return account}
  }
  return null;
}

function extractAnswer(data){
  if(typeof data?.output_text==="string")return data.output_text;
  return (data?.output||[]).flatMap(item=>item?.content||[]).filter(item=>item?.type==="output_text").map(item=>item.text||"").join("\n");
}

export default async function handler(req,res){
  if(req.method!=="POST")return send(res,405,{error:"Phương thức không được hỗ trợ."});
  if(!process.env.OPENAI_API_KEY)return send(res,503,{error:"Trợ lý AI đang được cấu hình. Vui lòng thử lại sau hoặc liên hệ Thầy Đạt."});
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body):req.body||{};
    const account=await validateAccount(body.token,body.authKind);
    if(!account)return send(res,401,{error:"Vui lòng đăng nhập để sử dụng Trợ lý AI."});
    const messages=Array.isArray(body.messages)?body.messages.slice(-MAX_MESSAGES).filter(item=>["user","assistant"].includes(item?.role)&&typeof item?.content==="string").map(item=>({role:item.role,content:item.content.trim().slice(0,MAX_MESSAGE_LENGTH)})).filter(item=>item.content):[];
    if(!messages.length||messages[messages.length-1].role!=="user")return send(res,400,{error:"Vui lòng nhập câu hỏi."});
    const context=String(body.context||"").trim().slice(0,3500);
    const identity=`Vai trò người dùng: ${account.role||body.authKind||"người học"}. Không tiết lộ hoặc suy đoán thêm thông tin tài khoản.`;
    const response=await fetch(OPENAI_ENDPOINT,{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-5.6",store:false,max_output_tokens:700,instructions:`${SYSTEM_PROMPT}\n\n${identity}\n\nNgữ cảnh trang web hiện tại:\n${context||"Không có ngữ cảnh bổ sung."}`,input:messages})});
    const data=await response.json().catch(()=>null);
    if(!response.ok){console.error("OpenAI response error",response.status,data?.error?.code||data?.error?.type||"unknown");return send(res,502,{error:"Trợ lý AI đang bận. Vui lòng thử lại sau."})}
    const answer=extractAnswer(data).trim();
    if(!answer)return send(res,502,{error:"Trợ lý AI chưa tạo được câu trả lời. Vui lòng thử lại."});
    return send(res,200,{answer});
  }catch(error){console.error("AI chat error",error?.message||error);return send(res,500,{error:"Không thể kết nối Trợ lý AI lúc này."})}
}
