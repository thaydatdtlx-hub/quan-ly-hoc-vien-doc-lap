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

export function receiptStudentProfile(payment={},student={}){
  return{
    ...payment,
    date_of_birth:payment.date_of_birth||student?.date_of_birth||null,
    cccd:String(payment.cccd||student?.cccd||"").trim(),
    address:String(payment.address||student?.address||"").trim()
  };
}

export function paymentTotals(student,payments=[]){
  const total=Math.max(0,Number(student?.tuition_total)||0);
  const activePaid=payments.filter(item=>!item.voided_at).reduce((sum,item)=>sum+Math.max(0,Number(item.amount)||0),0);
  const paid=payments.length?activePaid:Math.max(0,Number(student?.paid)||0);
  return{total,paid,debt:Math.max(0,total-paid)};
}

function numberToVietnamese(value){
  const number=Math.max(0,Math.round(Number(value)||0));
  if(number===0)return"Không đồng";
  const digits=["không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];
  const units=["","nghìn","triệu","tỷ","nghìn tỷ","triệu tỷ"];
  const readThree=value=>{
    const hundred=Math.floor(value/100),tens=Math.floor(value%100/10),ones=value%10;
    const parts=[];
    if(hundred){parts.push(digits[hundred],"trăm")}
    if(tens>1){parts.push(digits[tens],"mươi");if(ones===1)parts.push("mốt");else if(ones===5)parts.push("lăm");else if(ones)parts.push(digits[ones])}
    else if(tens===1){parts.push("mười");if(ones===5)parts.push("lăm");else if(ones)parts.push(digits[ones])}
    else if(ones){if(hundred)parts.push("lẻ");parts.push(digits[ones])}
    return parts.join(" ");
  };
  const groups=[];let rest=number;
  while(rest>0){groups.push(rest%1000);rest=Math.floor(rest/1000)}
  const parts=[];
  for(let index=groups.length-1;index>=0;index--){
    const group=groups[index];if(!group)continue;
    parts.push(readThree(group));
    if(units[index])parts.push(units[index]);
  }
  const text=parts.join(" ").replace(/\s+/g," ").trim();
  return text.charAt(0).toUpperCase()+text.slice(1)+" đồng";
}

function receiptCourseDescription(payment){
  const course=String(payment.course||"").trim();
  const license=String(payment.license_class||"").trim();
  if(course&&license&&!course.toLowerCase().includes(license.toLowerCase()))return`${course} · Hạng ${license}`;
  return course||license?`${course||"Khóa đào tạo"}${license&&!course?` · Hạng ${license}`:""}`:"Học phí khóa đào tạo";
}

export function buildReceiptHtml(payment){
  const rawAmount=Math.max(0,Number(payment.amount)||0);
  const amount=receiptMoney(rawAmount),date=receiptDate(payment.payment_date);
  const birthDate=receiptDate(payment.date_of_birth);
  const method=paymentMethodLabel(payment.payment_method);
  const courseDescription=receiptCourseDescription(payment);
  const receiptNo=payment.receipt_no||"—";
  const isBankTransfer=payment.payment_method==="bank_transfer";
  const isVoided=Boolean(payment.voided_at);
  const statusLabel=isVoided?"ĐÃ HỦY":"ĐÃ THANH TOÁN";
  const statusClass=isVoided?"is-voided":"is-paid";
  const paymentInfo=isBankTransfer?`
    <div><span>Tên tài khoản</span><strong>Trần Quốc Đạt</strong></div>
    <div><span>Số tài khoản</span><strong>360556789999</strong></div>
    <div><span>Ngân hàng</span><strong>MB Bank (MBBank)</strong></div>`:`
    <div><span>Phương thức</span><strong>${escapeHtml(method)}</strong></div>
    <div><span>Người ghi nhận</span><strong>Trần Quốc Đạt</strong></div>
    <div><span>Trạng thái</span><strong>${escapeHtml(isVoided?"Đã hủy":"Đã xác nhận")}</strong></div>`;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <base href="https://www.hoclaixecungdat.com/">
  <title>Biên lai học phí ${escapeHtml(receiptNo)}</title>
  <style>
    :root{--navy:#082f63;--blue:#0b6bdc;--blue2:#0f7fe5;--gold:#f4b928;--ink:#172b42;--muted:#63788f;--line:#d8e1ea;--soft:#f6f9fc;--paid:#18895b;--danger:#bd3d47}
    *{box-sizing:border-box}html,body{margin:0;padding:0}body{background:#edf2f7;color:var(--ink);font:14px/1.45 Arial,"Helvetica Neue",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .toolbar{position:sticky;top:0;z-index:20;display:flex;justify-content:flex-end;gap:10px;padding:10px max(18px,calc((100% - 210mm)/2));background:#263442e8;backdrop-filter:blur(10px);box-shadow:0 4px 18px #06192b25}
    .toolbar button{min-height:42px;border:1px solid #ffffff35;border-radius:9px;padding:0 22px;color:#fff;font-weight:800;font-size:14px;cursor:pointer;box-shadow:inset 0 1px #ffffff40,0 3px 10px #0002}.toolbar .close{background:linear-gradient(#f8fafc,#cfd8e1);color:#263544}.toolbar .save{background:linear-gradient(#36c76d,#16964a)}.toolbar .print{background:linear-gradient(#4389ff,#1559d4)}.toolbar button:disabled{opacity:.6;cursor:wait}
    .paper{position:relative;width:210mm;min-height:297mm;margin:22px auto 40px;background:#fff;padding:15mm 14mm 13mm;box-shadow:0 16px 46px #16334f26;overflow:hidden}
    .paper:before{content:"";position:absolute;left:0;top:0;width:100%;height:7px;background:linear-gradient(90deg,var(--navy),var(--blue),var(--gold))}
    .invoice-head{display:grid;grid-template-columns:minmax(0,1fr) 245px;gap:30px;align-items:start;padding-bottom:20px;border-bottom:1.5px solid var(--line)}
    .brand-block{display:flex;gap:16px;align-items:flex-start}.brand-logo{width:122px;height:68px;display:flex;align-items:center;justify-content:center;border:1px solid #dce6ef;border-radius:14px;background:#fff;overflow:hidden}.brand-logo img{width:100%;height:100%;object-fit:contain}.brand-copy strong{display:block;color:var(--navy);font-size:17px;letter-spacing:.02em}.brand-copy>span{display:block;margin:3px 0 8px;color:var(--blue);font-size:12px;font-weight:800}.brand-meta{display:grid;gap:3px;color:#4d6278;font-size:12px}.brand-meta a{color:inherit;text-decoration:none}
    .invoice-title{text-align:right}.invoice-title h1{margin:0;color:#111;font-size:31px;line-height:1;font-weight:900;letter-spacing:.015em}.invoice-title .receipt-number{margin:14px 0 6px;color:#b7293c;font-size:15px;font-weight:900}.invoice-title .receipt-date{font-size:15px;font-weight:800;color:#293a4d}
    .party-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:34px;padding:22px 0;border-bottom:1.5px solid var(--line)}.party h2{margin:0 0 12px;font-size:16px;color:#111}.party dl{margin:0;display:grid;gap:7px}.party dl div{display:grid;grid-template-columns:130px 1fr;gap:8px}.party dt{font-weight:800;color:#283d52}.party dd{margin:0;color:#26394c}.party .address-row dd{overflow-wrap:anywhere}.payment-info{padding-left:18px;border-left:4px solid #dbeafa}.payment-info h2{color:var(--navy)}.payment-lines{display:grid;gap:8px}.payment-lines>div{display:grid;grid-template-columns:112px 1fr;gap:8px}.payment-lines span{color:#52697f}.payment-lines strong{color:#1f3348}
    .course-table{width:100%;margin-top:26px;border-collapse:collapse;border-spacing:0}.course-table thead th{background:#f2e6cb;color:#263748;text-align:left;padding:13px 12px;font-size:13px}.course-table th:nth-child(n+3),.course-table td:nth-child(n+3){text-align:right}.course-table tbody td{padding:14px 12px;border-bottom:1px solid #e7ddd0;background:#fffaf0}.course-table .course-code{font-weight:800;color:var(--blue)}
    .summary{width:48%;margin:14px 0 0 auto}.summary-row{display:grid;grid-template-columns:1fr auto;gap:20px;padding:8px 0;border-bottom:1px solid #e3e8ee}.summary-row span{font-size:15px}.summary-row strong{font-size:15px}.summary-row.tax strong{font-size:13px;color:#44596d}.summary-row.total{margin-top:3px;padding-top:12px;border-bottom:0;color:#b22f3e}.summary-row.total span,.summary-row.total strong{font-size:18px;font-weight:900}.amount-words{width:65%;margin:10px 0 0 auto;font-size:13px;color:#354b61}.amount-words strong{font-style:italic;color:#172b42}
    .signatures{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:42px;text-align:center;min-height:150px}.signature strong{display:block;font-size:14px}.signature small{display:block;margin-top:2px;color:#586e82}.signature .sign-space{display:block;height:80px}.signature em{font-style:normal;font-weight:800;color:#1e3449}.stamp{position:absolute;left:50%;top:40px;transform:translateX(-50%) rotate(-1.5deg);padding:9px 15px;border:2px solid currentColor;border-radius:8px;font-weight:900;letter-spacing:.03em;background:#fff9}.stamp.is-paid{color:var(--paid)}.stamp.is-voided{color:var(--danger)}
    .receipt-note{margin-top:22px;padding-top:14px;border-top:1px solid var(--line);font-size:11.5px;color:#3f5266}.receipt-note p{margin:4px 0}.receipt-note strong{color:var(--navy)}
    .receipt-footer{display:flex;justify-content:space-between;gap:20px;margin-top:18px;padding:11px 14px;border-radius:10px;background:linear-gradient(90deg,#edf6ff,#fff9e6);color:#40576c;font-size:11px}.receipt-footer b{color:var(--navy)}
    @media(max-width:820px){.toolbar{position:static;justify-content:center;flex-wrap:wrap;padding:10px}.toolbar button{flex:1;min-width:120px;padding:0 12px}.paper{width:100%;min-height:0;margin:0;padding:24px 18px;box-shadow:none}.invoice-head{grid-template-columns:1fr;gap:18px}.invoice-title{text-align:left}.party-grid{grid-template-columns:1fr;gap:20px}.payment-info{padding-left:0;border-left:0;border-top:4px solid #dbeafa;padding-top:16px}.summary,.amount-words{width:100%}.course-table{font-size:12px}.course-table th,.course-table td{padding:10px 7px}.brand-logo{width:100px}.signatures{gap:20px}}
    @media print{@page{size:A4;margin:0}body{background:#fff}.toolbar{display:none!important}.paper{width:210mm;min-height:297mm;margin:0;padding:15mm 14mm 13mm;box-shadow:none}.receipt-footer{break-inside:avoid}.signatures{break-inside:avoid}}
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="close" type="button" id="closeReceipt">Đóng</button>
    <button class="save" type="button" id="saveReceiptPng">Lưu Hóa đơn (PNG)</button>
    <button class="print" type="button" id="printReceipt">In / PDF nhanh</button>
  </div>

  <main class="paper" id="receiptPaper">
    <header class="invoice-head">
      <div class="brand-block">
        <div class="brand-logo"><img src="/logo-thay-dat-compact.webp?v=15" alt="Học lái xe cùng Đạt"></div>
        <div class="brand-copy">
          <strong>HỌC LÁI XE CÙNG ĐẠT</strong>
          <span>Rõ lộ trình · Vững tay lái</span>
          <div class="brand-meta">
            <span>Điện thoại / Zalo: <b>0984 811 037</b></span>
            <span>Website: <b>www.hoclaixecungdat.com</b></span>
          </div>
        </div>
      </div>
      <div class="invoice-title">
        <h1>BIÊN LAI HỌC PHÍ</h1>
        <p class="receipt-number">Số phiếu: ${escapeHtml(receiptNo)}</p>
        <p class="receipt-date">Ngày: ${escapeHtml(date)}</p>
      </div>
    </header>

    <section class="party-grid">
      <div class="party">
        <h2>BIÊN LAI CHO:</h2>
        <dl>
          <div><dt>Học viên:</dt><dd><strong>${escapeHtml(payment.student_name||"—")}</strong></dd></div>
          <div><dt>Mã học viên:</dt><dd>${escapeHtml(payment.student_code||"—")}</dd></div>
          <div><dt>Ngày sinh:</dt><dd>${escapeHtml(birthDate)}</dd></div>
          <div><dt>Số CCCD:</dt><dd>${escapeHtml(payment.cccd||"—")}</dd></div>
          <div class="address-row"><dt>Địa chỉ:</dt><dd>${escapeHtml(payment.address||"—")}</dd></div>
          <div><dt>Khóa / Hạng:</dt><dd>${escapeHtml([payment.course,payment.license_class].filter(Boolean).join(" · ")||"—")}</dd></div>
          <div><dt>Hình thức:</dt><dd><strong>${escapeHtml(method)}</strong></dd></div>
        </dl>
      </div>
      <div class="party payment-info">
        <h2>${isBankTransfer?"Thông tin chuyển khoản":"Thông tin thanh toán"}</h2>
        <div class="payment-lines">${paymentInfo}</div>
      </div>
    </section>

    <table class="course-table" aria-label="Chi tiết khoản thu">
      <thead><tr><th>Mã lớp</th><th>Mô tả khóa học</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
      <tbody><tr>
        <td class="course-code">${escapeHtml(payment.course||payment.license_class||"HỌC PHÍ")}</td>
        <td>${escapeHtml(courseDescription)}</td>
        <td>1</td>
        <td>${escapeHtml(amount)}</td>
        <td><strong>${escapeHtml(amount)}</strong></td>
      </tr></tbody>
    </table>

    <section class="summary">
      <div class="summary-row"><span>Tổng thu</span><strong>${escapeHtml(amount)}</strong></div>
      <div class="summary-row tax"><span>Thuế GTGT</span><strong>Không thể hiện trên phiếu thu</strong></div>
      <div class="summary-row total"><span>TỔNG CỘNG</span><strong>${escapeHtml(amount)}</strong></div>
    </section>
    <p class="amount-words">Số tiền bằng chữ: <strong>${escapeHtml(numberToVietnamese(rawAmount))}.</strong></p>

    ${payment.note?`<section class="receipt-note"><p><strong>Nội dung ghi nhận:</strong> ${escapeHtml(payment.note)}</p></section>`:""}

    <section class="signatures">
      <div class="signature"><strong>Khách hàng</strong><small>(Ký, ghi rõ họ tên)</small><span class="sign-space"></span><em>${escapeHtml(payment.student_name||"")}</em></div>
      <div class="stamp ${statusClass}">${statusLabel}</div>
      <div class="signature"><strong>Người thu tiền</strong><small>(Ký, ghi rõ họ tên)</small><span class="sign-space"></span><em>Trần Quốc Đạt</em></div>
    </section>

    <section class="receipt-note">
      <p>• Biên lai ghi nhận khoản học phí đã được xác nhận trên hệ thống <strong>Học lái xe cùng Đạt</strong>.</p>
      <p>• Vui lòng lưu biên lai để đối chiếu. Nếu thông tin chưa chính xác, liên hệ <strong>0984 811 037</strong> để được hỗ trợ.</p>
      <p>• Các khoản lệ phí nhà nước hoặc chi phí phát sinh ngoài học phí được thông báo riêng theo từng hạng đào tạo.</p>
    </section>

    <footer class="receipt-footer"><span><b>Học lái xe cùng Đạt</b> · Rõ lộ trình · Vững tay lái</span><span>www.hoclaixecungdat.com</span></footer>
  </main>

  <script>
    const receiptNo=${JSON.stringify(String(receiptNo))};
    const closeButton=document.getElementById("closeReceipt");
    const saveButton=document.getElementById("saveReceiptPng");
    const printButton=document.getElementById("printReceipt");
    closeButton.addEventListener("click",()=>window.close());
    printButton.addEventListener("click",()=>window.print());
    function safeFileName(value){return String(value||"bien-lai-hoc-phi").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-+|-+$/g,"")||"bien-lai-hoc-phi"}
    function loadHtml2Canvas(){
      if(window.html2canvas)return Promise.resolve(window.html2canvas);
      return new Promise((resolve,reject)=>{
        const script=document.createElement("script");
        script.src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
        script.onload=()=>resolve(window.html2canvas);
        script.onerror=()=>reject(new Error("Không tải được công cụ lưu PNG"));
        document.head.appendChild(script);
      });
    }
    saveButton.addEventListener("click",async()=>{
      const original=saveButton.textContent;saveButton.disabled=true;saveButton.textContent="Đang lưu PNG…";
      try{
        const html2canvas=await loadHtml2Canvas();
        await Promise.all([...document.images].filter(image=>!image.complete).map(image=>new Promise(resolve=>{image.onload=image.onerror=resolve})));
        const canvas=await html2canvas(document.getElementById("receiptPaper"),{scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false});
        const link=document.createElement("a");link.download=safeFileName("bien-lai-"+receiptNo)+".png";link.href=canvas.toDataURL("image/png");link.click();
      }catch(error){alert("Chưa thể lưu PNG. Bạn vẫn có thể dùng nút In / PDF nhanh để lưu PDF.")}
      finally{saveButton.disabled=false;saveButton.textContent=original}
    });
  </script>
</body>
</html>`;
}

export function openPaymentReceipt(payment,studentProfile={}){
  const receiptWindow=window.open("","_blank");
  if(!receiptWindow)return false;
  receiptWindow.opener=null;
  receiptWindow.document.open();
  receiptWindow.document.write(buildReceiptHtml(receiptStudentProfile(payment,studentProfile)));
  receiptWindow.document.close();
  return true;
}
