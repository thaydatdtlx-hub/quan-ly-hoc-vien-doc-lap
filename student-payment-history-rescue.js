import {openPaymentReceipt,paymentMethodLabel} from "./payment-receipt.js";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
let paymentRecords=[];

const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const money=value=>new Intl.NumberFormat("vi-VN").format(Math.max(0,Number(value)||0))+" ₫";
function date(value){
  if(!value)return"Chưa cập nhật";
  const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match)return`${match[3]}/${match[2]}/${match[1]}`;
  const parsed=new Date(value);
  return Number.isNaN(parsed.valueOf())?String(value):new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"}).format(parsed);
}

function ensureStyles(){
  if(document.getElementById("student-payment-history-rescue-style"))return;
  const style=document.createElement("style");
  style.id="student-payment-history-rescue-style";
  style.textContent=`
    #studentPaymentHistoryList{display:grid;gap:10px}
    .student-payment-history-item{display:grid;grid-template-columns:52px minmax(0,1fr) auto;align-items:center;gap:12px;padding:13px 14px;border:1px solid #dce7f0;border-radius:14px;background:linear-gradient(180deg,#fff,#fbfdff)}
    .student-payment-history-icon{display:grid;width:48px;height:48px;place-items:center;border-radius:13px;background:#e8f3ff;color:#126bc7;font-weight:950}
    .student-payment-history-main{display:grid;gap:3px;min-width:0}.student-payment-history-main strong{color:#153f68;font-size:11px}.student-payment-history-main small{color:#72869a;font-size:9px;line-height:1.45}.student-payment-history-main em{color:#8a6a44;font-size:8px;font-style:normal;overflow-wrap:anywhere}
    .student-payment-history-amount{text-align:right;white-space:nowrap}.student-payment-history-amount>strong{display:block;color:#087b58;font-size:14px}.student-payment-history-amount>small{display:block;margin-top:4px;color:#72869a;font-size:8px}
    .student-receipt-actions{display:flex;justify-content:flex-end;margin-top:8px}.student-receipt-view{border:1px solid #c9ddee;border-radius:9px;background:#fff;color:#1263af;padding:7px 10px;font:800 10px/1 system-ui;cursor:pointer}.student-receipt-view:hover{background:#eef7ff}
    .student-payment-history-empty{display:grid;place-items:center;gap:5px;min-height:135px;padding:20px;border:1px dashed #cadce9;border-radius:15px;color:#74899d;text-align:center}.student-payment-history-empty span{font-size:25px;color:#9ab1c4}.student-payment-history-empty strong{font-size:11px}.student-payment-history-empty small{font-size:9px}
    @media(max-width:680px){.student-payment-history-item{grid-template-columns:44px minmax(0,1fr)}.student-payment-history-icon{width:42px;height:42px}.student-payment-history-amount{grid-column:2;text-align:left}.student-receipt-actions{justify-content:flex-start}.student-payment-history-amount>strong{font-size:13px}}
  `;
  document.head.appendChild(style);
}

async function loadPaymentHistory(){
  if(!token)return;
  ensureStyles();
  const count=$("studentPaymentHistoryCount"),list=$("studentPaymentHistoryList"),notice=$("studentPaymentHistoryNotice");
  if(count)count.textContent="Đang đồng bộ…";
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/app_student_list_payments`,{
      method:"POST",
      cache:"no-store",
      signal:controller.signal,
      headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json","Cache-Control":"no-store"},
      body:JSON.stringify({p_token:token})
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.details||data?.error||"Không tải được lịch sử học phí");
    paymentRecords=Array.isArray(data)?data:[];
    renderPaymentHistory(paymentRecords);
  }catch(error){
    console.warn("[student-payment-history] Không đồng bộ được lịch sử học phí",error);
    if(count)count.textContent="Chưa đồng bộ";
    if(notice){notice.textContent="Lịch sử học phí đang đồng bộ lại từ dữ liệu Admin. Vui lòng tải lại sau ít phút.";notice.classList.remove("hidden")}
    if(list)list.innerHTML='<div class="student-payment-history-empty"><span>₫</span><strong>Chưa đồng bộ được phiếu thu</strong><small>Các số liệu tổng học phí vẫn được giữ nguyên.</small></div>';
  }finally{clearTimeout(timer)}
}

function openAdminReceipt(index){
  const record=paymentRecords[index];
  if(!record)return;
  const opened=openPaymentReceipt(record);
  if(!opened)alert("Trình duyệt đang chặn cửa sổ phiếu thu. Vui lòng cho phép cửa sổ bật lên rồi thử lại.");
}

function renderPaymentHistory(records){
  const count=$("studentPaymentHistoryCount"),list=$("studentPaymentHistoryList"),notice=$("studentPaymentHistoryNotice");
  if(count)count.textContent=`${records.length} phiếu thu`;
  notice?.classList.add("hidden");
  if(!list)return;
  if(!records.length){
    list.innerHTML='<div class="student-payment-history-empty"><span>₫</span><strong>Chưa có phiếu thu</strong><small>Khi Admin ghi nhận khoản thanh toán, phiếu thu sẽ tự xuất hiện tại đây.</small></div>';
    return;
  }
  list.innerHTML=records.slice(0,50).map((record,index)=>{
    const method=paymentMethodLabel(record.payment_method);
    const receipt=record.receipt_no||"Phiếu thu";
    return `<article class="student-payment-history-item">
      <span class="student-payment-history-icon">₫</span>
      <div class="student-payment-history-main">
        <strong>${esc(receipt)}</strong>
        <small>${esc(date(record.payment_date))} · ${esc(method)}</small>
        ${record.note?`<em>${esc(record.note)}</em>`:""}
      </div>
      <div class="student-payment-history-amount">
        <strong>+${esc(money(record.amount))}</strong>
        <small>${record.created_by_username?`Ghi nhận bởi ${esc(record.created_by_username)}`:"Đã ghi nhận trên hệ thống"}</small>
        <div class="student-receipt-actions"><button type="button" class="student-receipt-view" data-receipt-index="${index}">Xem / In phiếu</button></div>
      </div>
    </article>`;
  }).join("");
  list.querySelectorAll("[data-receipt-index]").forEach(button=>button.addEventListener("click",()=>openAdminReceipt(Number(button.dataset.receiptIndex))));
}

loadPaymentHistory();
