const TUITION_BANK_BIN="970422";
const TUITION_ACCOUNT_NUMBER="360556789999";
const TUITION_ACCOUNT_NAME="TRAN QUOC DAT";
const TUITION_ACCOUNT_DISPLAY_NAME="Trần Quốc Đạt";
const TUITION_BANK_NAME="MB Bank (MBBank)";
const TUITION_TRIGGER_SELECTOR="#tuitionPaymentLink,.tuition-card.debt,#tuitionQrOpen,.payment-qr-card,#paymentAmountBadge";
const TUITION_MOBILE_TRIGGER_SELECTOR='[data-mobile-scroll="#studentPayment"]';
let tuitionHashHandled=false;

function cleanStudentName(value){
  return String(value??"").replace(/\s+/g," ").trim()||"Học viên";
}

export function nextTuitionPaymentNumber(existingReceiptCount=0){
  return Math.max(0,Math.trunc(Number(existingReceiptCount)||0))+1;
}

export function tuitionTransferContent(studentName,existingReceiptCount=0){
  return `${cleanStudentName(studentName)} HPLX lần ${nextTuitionPaymentNumber(existingReceiptCount)}`;
}

export function tuitionTransferQrUrl(studentName,amount,existingReceiptCount=0){
  const params=new URLSearchParams();
  const normalizedAmount=Math.max(0,Math.round(Number(amount)||0));
  if(normalizedAmount)params.set("amount",String(normalizedAmount));
  params.set("addInfo",tuitionTransferContent(studentName,existingReceiptCount));
  return `/api/tuition-qr?${params.toString()}`;
}

function parseVnd(value){
  const digits=String(value??"").replace(/[^0-9]/g,"");
  return Math.max(0,Number(digits)||0);
}

function formatVnd(value){
  return new Intl.NumberFormat("vi-VN").format(Math.max(0,Number(value)||0))+" ₫";
}

function setText(id,value){
  const node=document.getElementById(id);
  if(node&&node.textContent!==String(value))node.textContent=String(value);
  return node;
}

function closestTarget(event,selector){
  return event.target instanceof Element?event.target.closest(selector):null;
}

function existingReceiptCount(){
  const rendered=document.querySelectorAll("#studentPaymentHistoryList .student-payment-item").length;
  const badge=Number(document.getElementById("studentPaymentHistoryCount")?.textContent?.match(/\d+/)?.[0]||0);
  return Math.max(rendered,badge);
}

function currentPaymentSnapshot(){
  const studentName=cleanStudentName(document.getElementById("studentName")?.textContent);
  const debt=parseVnd(document.getElementById("paymentDebt")?.textContent||document.getElementById("tuitionDebt")?.textContent);
  const receiptCount=existingReceiptCount();
  const paymentNumber=nextTuitionPaymentNumber(receiptCount);
  const content=tuitionTransferContent(studentName,receiptCount);
  const qrUrl=tuitionTransferQrUrl(studentName,debt,receiptCount);
  return{studentName,debt,existingReceiptCount:receiptCount,paymentNumber,content,qrUrl};
}

function ensureModalStyle(){
  if(document.getElementById("tuitionPaymentModalStyle"))return;
  const style=document.createElement("style");
  style.id="tuitionPaymentModalStyle";
  style.textContent=`
    body.tuition-payment-modal-open{overflow:hidden}
    #tuitionDebtCard[aria-disabled="false"],.payment-qr-card[aria-disabled="false"],#paymentAmountBadge[aria-disabled="false"]{cursor:pointer}
    #tuitionDebtCard[aria-disabled="false"]:focus-visible,.payment-qr-card[aria-disabled="false"]:focus-visible,#paymentAmountBadge[aria-disabled="false"]:focus-visible{outline:3px solid #0b6bdc;outline-offset:4px}
    #tuitionPaymentDialog{width:min(94vw,520px);max-width:520px;max-height:calc(100dvh - 20px);margin:auto;padding:0;border:0;border-radius:22px;background:#fff;color:#17324d;box-shadow:0 28px 80px #001b3c55;overflow:auto;overscroll-behavior:contain}
    #tuitionPaymentDialog::backdrop{background:#071a2db8;backdrop-filter:blur(5px)}
    #tuitionPaymentDialog.is-fallback-open{display:block;position:fixed;inset:10px;z-index:2147483000;margin:auto}
    .tuition-payment-fallback-backdrop{position:fixed;inset:0;z-index:2147482999;background:#071a2dd9;backdrop-filter:blur(5px)}
    .tuition-payment-head{position:sticky;top:0;z-index:2;padding:22px 58px 18px 22px;background:linear-gradient(135deg,#073d7d,#0b6bdc);color:#fff}
    .tuition-payment-head small{display:block;margin-bottom:4px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.8}
    .tuition-payment-head h2{margin:0;font:900 24px/1.15 system-ui,sans-serif}
    .tuition-payment-head p{margin:8px 0 0;font:600 13px/1.5 system-ui,sans-serif;opacity:.88}
    .tuition-payment-close{position:absolute;right:15px;top:15px;width:38px;height:38px;border:2px solid #f4bd3c;border-radius:50%;background:#ffffff20;color:#fff;font-size:25px;line-height:1;cursor:pointer}
    .tuition-payment-body{padding:20px 22px 22px}
    .tuition-payment-qr-wrap{display:grid;justify-items:center;gap:8px;padding:14px;border:1px solid #d8e5f1;border-radius:18px;background:#f8fbff}
    .tuition-payment-qr-wrap img{display:block;width:min(68vw,255px);height:min(68vw,255px);max-width:255px;max-height:255px;object-fit:contain;border-radius:10px;background:#fff}
    .tuition-payment-qr-fallback{display:grid;place-items:center;width:min(68vw,255px);min-height:220px;padding:20px;border:1px dashed #c0d0df;border-radius:12px;background:#fff;text-align:center;color:#63778b;font:700 13px/1.5 system-ui,sans-serif}
    .tuition-payment-qr-fallback[hidden]{display:none!important}
    .tuition-payment-scan{margin:0;color:#0a4e9f;font:900 13px/1.4 system-ui,sans-serif}
    .tuition-payment-details{display:grid;gap:10px;margin-top:16px}
    .tuition-payment-row{display:grid;grid-template-columns:118px minmax(0,1fr);gap:12px;align-items:start;padding:10px 12px;border-radius:12px;background:#f4f7fa;font:13px/1.45 system-ui,sans-serif}
    .tuition-payment-row span{color:#63788c;font-weight:700}.tuition-payment-row strong{color:#17324d;overflow-wrap:anywhere}
    .tuition-payment-row.is-amount strong{color:#c43b3b;font-size:17px}
    .tuition-payment-content-line{display:flex;gap:8px;align-items:flex-start}.tuition-payment-content-line strong{flex:1}
    .tuition-payment-copy{flex:0 0 auto;border:0;border-radius:8px;padding:7px 9px;background:#dcecff;color:#0757ad;font-weight:900;cursor:pointer}
    .tuition-payment-note{margin:14px 0 0;padding:11px 13px;border-radius:11px;background:#fff8df;color:#735a13;font:700 12px/1.5 system-ui,sans-serif}
    #tuitionQrOpen{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border-radius:10px;background:#0b6bdc;color:#fff!important;font-weight:900;text-decoration:none}
    @media(max-width:520px){#tuitionPaymentDialog{width:calc(100vw - 20px);border-radius:18px}.tuition-payment-head{padding:19px 54px 16px 18px}.tuition-payment-head h2{font-size:21px}.tuition-payment-body{padding:16px}.tuition-payment-row{grid-template-columns:102px minmax(0,1fr);padding:9px 10px}}
  `;
  document.head.appendChild(style);
}

function closePaymentDialog(dialog=document.getElementById("tuitionPaymentDialog")){
  if(!dialog)return;
  try{if(typeof dialog.close==="function"&&dialog.open)dialog.close()}catch{}
  dialog.removeAttribute("open");
  dialog.classList.remove("is-fallback-open");
  document.getElementById("tuitionPaymentFallbackBackdrop")?.remove();
  document.body.classList.remove("tuition-payment-modal-open");
}

function showPaymentDialog(dialog){
  document.body.classList.add("tuition-payment-modal-open");
  try{
    if(typeof dialog.showModal==="function"){
      if(!dialog.open)dialog.showModal();
      return;
    }
  }catch{}
  dialog.setAttribute("open","");
  dialog.classList.add("is-fallback-open");
  let backdrop=document.getElementById("tuitionPaymentFallbackBackdrop");
  if(!backdrop){
    backdrop=document.createElement("div");
    backdrop.id="tuitionPaymentFallbackBackdrop";
    backdrop.className="tuition-payment-fallback-backdrop";
    backdrop.addEventListener("click",()=>closePaymentDialog(dialog));
    document.body.appendChild(backdrop);
  }
}

function ensurePaymentDialog(){
  let dialog=document.getElementById("tuitionPaymentDialog");
  if(dialog)return dialog;
  ensureModalStyle();
  dialog=document.createElement("dialog");
  dialog.id="tuitionPaymentDialog";
  dialog.setAttribute("aria-labelledby","tuitionPaymentDialogTitle");
  dialog.innerHTML=`
    <header class="tuition-payment-head">
      <small>Thanh toán học phí</small>
      <h2 id="tuitionPaymentDialogTitle">Quét mã QR chuyển khoản</h2>
      <p>Mã QR tự điền số tiền còn nợ và nội dung chuyển khoản của học viên.</p>
      <button class="tuition-payment-close" type="button" data-tuition-payment-close aria-label="Đóng">×</button>
    </header>
    <div class="tuition-payment-body">
      <div class="tuition-payment-qr-wrap">
        <img id="tuitionPaymentModalQr" alt="Mã QR chuyển khoản học phí MB Bank" loading="eager" decoding="sync">
        <div id="tuitionPaymentModalQrFallback" class="tuition-payment-qr-fallback" hidden>Không tải được mã QR. Vui lòng chuyển khoản theo thông tin bên dưới.</div>
        <p class="tuition-payment-scan">Mở ứng dụng ngân hàng và quét mã</p>
      </div>
      <div class="tuition-payment-details">
        <div class="tuition-payment-row"><span>Ngân hàng</span><strong>${TUITION_BANK_NAME}</strong></div>
        <div class="tuition-payment-row"><span>Chủ tài khoản</span><strong>${TUITION_ACCOUNT_DISPLAY_NAME}</strong></div>
        <div class="tuition-payment-row"><span>Số tài khoản</span><div class="tuition-payment-content-line"><strong>${TUITION_ACCOUNT_NUMBER}</strong><button class="tuition-payment-copy" type="button" data-copy-tuition-account>Sao chép</button></div></div>
        <div class="tuition-payment-row is-amount"><span>Số tiền</span><strong id="tuitionPaymentModalAmount">0 ₫</strong></div>
        <div class="tuition-payment-row"><span>Nội dung</span><div class="tuition-payment-content-line"><strong id="tuitionPaymentModalContent"></strong><button class="tuition-payment-copy" type="button" data-copy-tuition-content>Sao chép</button></div></div>
      </div>
      <p class="tuition-payment-note">Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống đối chiếu đúng lần đóng học phí.</p>
    </div>`;
  document.body.appendChild(dialog);
  dialog.addEventListener("click",event=>{
    if(event.target===dialog||closestTarget(event,"[data-tuition-payment-close]"))closePaymentDialog(dialog);
  });
  dialog.addEventListener("cancel",event=>{event.preventDefault();closePaymentDialog(dialog)});
  dialog.querySelector("[data-copy-tuition-account]").addEventListener("click",event=>copyValue(TUITION_ACCOUNT_NUMBER,event.currentTarget));
  dialog.querySelector("[data-copy-tuition-content]").addEventListener("click",event=>copyValue(document.getElementById("tuitionPaymentModalContent")?.textContent||"",event.currentTarget));
  return dialog;
}

async function copyValue(value,button){
  const original=button.textContent;
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);
    else{
      const textarea=document.createElement("textarea");
      textarea.value=value;textarea.setAttribute("readonly","");textarea.style.cssText="position:fixed;opacity:0";
      document.body.appendChild(textarea);textarea.select();document.execCommand("copy");textarea.remove();
    }
    button.textContent="Đã chép";
  }catch{button.textContent="Nhấn giữ để chép"}
  setTimeout(()=>button.textContent=original,1500);
}

function syncInlinePaymentDetails(snapshot){
  setText("paymentBankName",TUITION_BANK_NAME);
  setText("paymentAccountNumber",TUITION_ACCOUNT_NUMBER);
  setText("paymentAccountOwner",TUITION_ACCOUNT_DISPLAY_NAME);
  setText("paymentContent",snapshot.content);

  const accountCopy=document.getElementById("copyPaymentAccount");
  if(accountCopy){
    accountCopy.dataset.copy=TUITION_ACCOUNT_NUMBER;
    if(accountCopy.dataset.tuitionCopyBound!=="1"){
      accountCopy.dataset.tuitionCopyBound="1";
      accountCopy.addEventListener("click",event=>{event.preventDefault();copyValue(TUITION_ACCOUNT_NUMBER,event.currentTarget)});
    }
  }

  const tuitionQr=document.getElementById("tuitionQr");
  const tuitionQrOpen=document.getElementById("tuitionQrOpen");
  if(snapshot.debt>0){
    if(tuitionQr){
      tuitionQr.src=snapshot.qrUrl;
      tuitionQr.alt=`Mã QR chuyển khoản ${snapshot.content}`;
      tuitionQr.loading="eager";
    }
    if(tuitionQrOpen){
      tuitionQrOpen.href=snapshot.qrUrl;
      tuitionQrOpen.target="_blank";
      tuitionQrOpen.rel="noopener";
      tuitionQrOpen.textContent="Mở cửa sổ thanh toán QR";
      tuitionQrOpen.setAttribute("aria-haspopup","dialog");
      tuitionQrOpen.setAttribute("aria-controls","tuitionPaymentDialog");
    }
  }else{
    tuitionQr?.removeAttribute("src");
    tuitionQrOpen?.removeAttribute("href");
  }

  const trigger=document.getElementById("tuitionPaymentLink");
  if(trigger){
    trigger.setAttribute("aria-haspopup","dialog");
    trigger.setAttribute("aria-controls","tuitionPaymentDialog");
  }

  const card=document.getElementById("tuitionDebtCard")||trigger?.closest(".tuition-card.debt");
  if(card){
    if(!card.id)card.id="tuitionDebtCard";
    card.setAttribute("role","button");
    card.setAttribute("aria-label","Mở mã QR thanh toán học phí");
    card.setAttribute("aria-haspopup","dialog");
    card.setAttribute("aria-controls","tuitionPaymentDialog");
    card.setAttribute("aria-disabled",String(snapshot.debt<=0));
    card.tabIndex=snapshot.debt>0?0:-1;
  }

  const qrCard=document.querySelector(".payment-qr-card");
  if(qrCard){
    qrCard.setAttribute("role","button");
    qrCard.setAttribute("aria-label","Mở mã QR thanh toán học phí");
    qrCard.setAttribute("aria-haspopup","dialog");
    qrCard.setAttribute("aria-controls","tuitionPaymentDialog");
    qrCard.setAttribute("aria-disabled",String(snapshot.debt<=0));
    qrCard.tabIndex=snapshot.debt>0?0:-1;
  }

  const amountBadge=document.getElementById("paymentAmountBadge");
  if(amountBadge){
    amountBadge.setAttribute("role","button");
    amountBadge.setAttribute("aria-haspopup","dialog");
    amountBadge.setAttribute("aria-controls","tuitionPaymentDialog");
    amountBadge.setAttribute("aria-disabled",String(snapshot.debt<=0));
    amountBadge.tabIndex=snapshot.debt>0?0:-1;
  }
}

export function refreshTuitionPaymentQr(){
  if(typeof document==="undefined")return null;
  const snapshot=currentPaymentSnapshot();
  syncInlinePaymentDetails(snapshot);
  document.documentElement.setAttribute("data-tuition-payment-qr",snapshot.debt>0?"ready":"complete");
  return snapshot;
}

export function openTuitionPaymentModal(){
  const snapshot=refreshTuitionPaymentQr();
  if(!snapshot||snapshot.debt<=0)return false;
  const dialog=ensurePaymentDialog();
  const qr=document.getElementById("tuitionPaymentModalQr");
  const fallback=document.getElementById("tuitionPaymentModalQrFallback");
  qr.hidden=false;fallback.hidden=true;
  qr.onload=()=>{qr.hidden=false;fallback.hidden=true};
  qr.onerror=()=>{qr.hidden=true;fallback.hidden=false};
  qr.src=snapshot.qrUrl;
  setText("tuitionPaymentModalAmount",formatVnd(snapshot.debt));
  setText("tuitionPaymentModalContent",snapshot.content);
  showPaymentDialog(dialog);
  return true;
}

function maybeOpenFromHash(){
  if(tuitionHashHandled||location.hash!=="#studentPayment")return;
  tuitionHashHandled=openTuitionPaymentModal();
}

function installTuitionPaymentModal(){
  ensureModalStyle();
  const refresh=()=>setTimeout(()=>{refreshTuitionPaymentQr();maybeOpenFromHash()},0);
  window.addEventListener("student-profile-ready",refresh);
  window.addEventListener("student-functions-ready",refresh);
  window.addEventListener("hashchange",refresh);

  document.addEventListener("click",event=>{
    const shortcut=closestTarget(event,TUITION_MOBILE_TRIGGER_SELECTOR);
    if(!shortcut)return;
    if(openTuitionPaymentModal()){
      event.preventDefault();
      event.stopPropagation();
    }
  },true);

  document.addEventListener("click",event=>{
    const trigger=closestTarget(event,TUITION_TRIGGER_SELECTOR);
    if(!trigger||trigger.classList.contains("hidden"))return;
    event.preventDefault();
    openTuitionPaymentModal();
  });

  document.addEventListener("keydown",event=>{
    if(!["Enter"," "].includes(event.key))return;
    const trigger=closestTarget(event,"#tuitionDebtCard,.payment-qr-card,#paymentAmountBadge");
    if(!trigger)return;
    event.preventDefault();
    openTuitionPaymentModal();
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",refresh,{once:true});else refresh();
  setTimeout(refresh,1200);
}

if(typeof window!=="undefined"&&typeof document!=="undefined")installTuitionPaymentModal();
