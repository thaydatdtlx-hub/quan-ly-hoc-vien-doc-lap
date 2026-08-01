const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));

export const paymentMethodLabel=method=>({
  cash:"Tiền mặt",
  bank_transfer:"Chuyển khoản",
  card:"Thẻ",
  other:"Khác"
}[method]||"Khác");

export function receiptDate(value){
  if(!value)return"—";
  const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match)return`${match[3]}/${match[2]}/${match[1]}`;
  const parsed=new Date(value);
  return Number.isNaN(parsed.valueOf())?String(value):new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"}).format(parsed);
}

export function receiptMoney(value){
  return new Intl.NumberFormat("vi-VN").format(Math.max(0,Number(value)||0))+" ₫";
}

export function paymentTotals(student,payments=[]){
  const total=Math.max(0,Number(student?.tuition_total)||0);
  const activePaid=payments.filter(item=>!item.voided_at).reduce((sum,item)=>sum+Math.max(0,Number(item.amount)||0),0);
  const paid=payments.length?activePaid:Math.max(0,Number(student?.paid)||0);
  return{total,paid,debt:Math.max(0,total-paid)};
}

export function buildReceiptHtml(payment){
  const amount=receiptMoney(payment.amount),date=receiptDate(payment.payment_date);
  return `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phiếu thu ${escapeHtml(payment.receipt_no)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#eef3f8;color:#102b48;font:15px/1.5 Arial,sans-serif}.sheet{width:760px;max-width:calc(100% - 24px);margin:24px auto;background:#fff;border:1px solid #d6e1ec;border-radius:18px;padding:42px 48px;box-shadow:0 18px 50px #0b27421c}.brand{text-align:center;border-bottom:2px solid #d9b75d;padding-bottom:18px}.brand strong{display:block;font-size:22px;letter-spacing:.08em}.brand span{color:#62758a}.title{text-align:center;margin:28px 0}.title h1{margin:0;font-size:30px}.title p{margin:6px 0;color:#62758a}.info{display:grid;grid-template-columns:1fr 1fr;gap:12px 28px}.info div{border-bottom:1px dashed #ced9e4;padding:9px 0}.info b{display:block;color:#62758a;font-size:12px;text-transform:uppercase}.amount{margin:26px 0;border:2px solid #d9b75d;background:#fffaf0;border-radius:14px;padding:20px;text-align:center}.amount small{display:block;color:#62758a}.amount strong{font-size:32px;color:#0b6bdc}.note{min-height:58px;border:1px solid #d6e1ec;border-radius:12px;padding:13px}.signature{display:grid;grid-template-columns:1fr 1fr;text-align:center;gap:60px;margin-top:34px}.signature strong{display:block}.signature span{display:block;color:#74879a;font-size:13px;margin-top:58px}.footer{text-align:center;color:#74879a;font-size:12px;margin-top:30px}.actions{text-align:center;margin:18px}.actions button{border:0;border-radius:10px;background:#0b6bdc;color:#fff;padding:12px 22px;font-weight:700;cursor:pointer}@media print{body{background:#fff}.sheet{width:100%;max-width:none;margin:0;border:0;box-shadow:none;border-radius:0}.actions{display:none}}@media(max-width:600px){.sheet{padding:28px 22px}.info{grid-template-columns:1fr}.signature{gap:20px}.amount strong{font-size:26px}}
  </style></head><body><main class="sheet"><div class="brand"><strong>THẦY ĐẠT</strong><span>ĐÀO TẠO LÁI XE TRỌN GÓI · 0984 811 037</span></div><div class="title"><h1>PHIẾU THU HỌC PHÍ</h1><p>Số phiếu: <b>${escapeHtml(payment.receipt_no||"—")}</b></p></div><section class="info"><div><b>Học viên</b>${escapeHtml(payment.student_name||"—")}</div><div><b>Mã học viên</b>${escapeHtml(payment.student_code||"—")}</div><div><b>Khóa / Hạng</b>${escapeHtml([payment.course,payment.license_class].filter(Boolean).join(" · ")||"—")}</div><div><b>Ngày thu</b>${escapeHtml(date)}</div><div><b>Phương thức</b>${escapeHtml(paymentMethodLabel(payment.payment_method))}</div><div><b>Người ghi nhận</b>Trần Quốc Đạt</div></section><section class="amount"><small>SỐ TIỀN ĐÃ THU</small><strong>${escapeHtml(amount)}</strong></section><section><b>Ghi chú</b><div class="note">${escapeHtml(payment.note||"Thu học phí")}</div></section><div class="signature"><div><strong>Người nộp tiền</strong><span>Ký và ghi rõ họ tên</span></div><div><strong>Người thu tiền</strong><span>Ký và ghi rõ họ tên</span></div></div><p class="footer">Phiếu thu điện tử được xuất từ Hệ thống quản lý đào tạo học viên lái xe Thầy Đạt.</p></main><div class="actions"><button onclick="window.print()">In / Lưu PDF</button></div></body></html>`;
}

export function openPaymentReceipt(payment){
  const receiptWindow=window.open("","_blank");
  if(!receiptWindow)return false;
  receiptWindow.opener=null;
  receiptWindow.document.open();
  receiptWindow.document.write(buildReceiptHtml(payment));
  receiptWindow.document.close();
  return true;
}
