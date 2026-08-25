import {buildReceiptHtml,paymentMethodLabel,paymentTotals,receiptDate,receiptMoney,receiptStudentProfile} from "../payment-receipt.js";
import {nextTuitionPaymentNumber,tuitionTransferContent,tuitionTransferQrUrl} from "../student-payment-modal.js";
import {readFileSync} from "node:fs";

const student={tuition_total:18_500_000,paid:8_500_000};
const payments=[
  {amount:5_000_000},
  {amount:3_500_000},
  {amount:1_000_000,voided_at:"2026-08-01T00:00:00Z"}
];
const totals=paymentTotals(student,payments);
if(totals.total!==18_500_000||totals.paid!==8_500_000||totals.debt!==10_000_000)throw new Error("Sai phép tính lịch sử học phí.");
if(paymentMethodLabel("bank_transfer")!=="Chuyển khoản")throw new Error("Sai nhãn phương thức thanh toán.");
if(receiptDate("2026-08-01")!=="01/08/2026")throw new Error("Sai định dạng ngày phiếu thu.");
if(receiptMoney(5_000_000)!=="5.000.000 ₫")throw new Error("Sai định dạng số tiền phiếu thu.");
const receipt=receiptStudentProfile(
  {receipt_no:"PT-20260801-ABC123",student_id:"student-1",student_name:"Nguyễn Văn An",student_code:"HV-0001",amount:5_000_000,payment_date:"2026-08-01",payment_method:"bank_transfer"},
  {date_of_birth:"2001-03-15",cccd:"079123456789",address:"An Phú Đông, Thành phố Hồ Chí Minh"}
);
const html=buildReceiptHtml(receipt);
for(const required of ["BIÊN LAI HỌC PHÍ","PT-20260801-ABC123","5.000.000 ₫","Trần Quốc Đạt","Ngày sinh:","15/03/2001","Số CCCD:","079123456789","Địa chỉ:","An Phú Đông, Thành phố Hồ Chí Minh"]){
  if(!html.includes(required))throw new Error(`Biên lai học phí thiếu nội dung bắt buộc: ${required}`);
}
for(const required of [
  '<figure class="transfer-qr">',
  "Quét mã để chuyển khoản",
  "/api/tuition-qr?",
  "amount=5000000",
  "addInfo=HP%20Van%20An%2001ABC123",
  "Mã QR chuyển khoản học phí MB Bank"
]){
  if(!html.includes(required))throw new Error(`Biên lai chuyển khoản thiếu mã QR hoặc dữ liệu QR: ${required}`);
}
if(html.includes("Mã học viên:")||html.includes("HV-0001"))throw new Error("Biên lai học phí vẫn còn hiển thị mã học viên.");
const cashHtml=buildReceiptHtml({...receipt,payment_method:"cash"});
if(cashHtml.includes('<figure class="transfer-qr">')||cashHtml.includes("/api/tuition-qr?"))throw new Error("Biên lai tiền mặt không được hiển thị mã QR chuyển khoản.");
const voidedHtml=buildReceiptHtml({...receipt,voided_at:"2026-08-02T00:00:00Z"});
if(voidedHtml.includes('<figure class="transfer-qr">')||voidedHtml.includes("/api/tuition-qr?"))throw new Error("Phiếu thu đã hủy không được hiển thị mã QR chuyển khoản.");

if(nextTuitionPaymentNumber(0)!==1||nextTuitionPaymentNumber(1)!==2||nextTuitionPaymentNumber(4)!==5)throw new Error("Sai số thứ tự lần đóng học phí.");
if(tuitionTransferContent("Nguyễn Văn An",0)!=="Nguyễn Văn An HPLX lần 1")throw new Error("Sai nội dung chuyển khoản lần 1.");
if(tuitionTransferContent("Nguyễn Văn An",1)!=="Nguyễn Văn An HPLX lần 2")throw new Error("Sai nội dung chuyển khoản lần 2.");
const tuitionQrUrl=tuitionTransferQrUrl("Nguyễn Văn An",5_000_000,1);
const decodedTuitionQrUrl=decodeURIComponent(tuitionQrUrl.replace(/\+/g," "));
for(const required of [
  "/api/tuition-qr?",
  "amount=5000000",
  "addInfo=Nguyễn Văn An HPLX lần 2"
]){
  if(!decodedTuitionQrUrl.includes(required))throw new Error(`Mã QR học phí thiếu dữ liệu: ${required}`);
}
if(decodedTuitionQrUrl.includes("img.vietqr.io"))throw new Error("Trình duyệt vẫn tải QR trực tiếp từ máy chủ ngoài thay vì API cùng tên miền.");

const tuitionQrApi=readFileSync(new URL("../api/tuition-qr.js",import.meta.url),"utf8");
for(const required of [
  'const BANK_BIN="970422"',
  'const ACCOUNT_NUMBER="360556789999"',
  "img.vietqr.io/image/",
  "AbortController",
  "s-maxage=300",
  "X-Tuition-QR-Fallback",
  "image/svg+xml"
]){
  if(!tuitionQrApi.includes(required))throw new Error(`API QR học phí thiếu cơ chế ổn định: ${required}`);
}

const modalSource=readFileSync(new URL("../student-payment-modal.js",import.meta.url),"utf8");
for(const required of [
  ".tuition-payment-qr-fallback[hidden]{display:none!important}",
  "max-height:calc(100dvh - 20px)",
  "TUITION_MOBILE_TRIGGER_SELECTOR",
  "#tuitionQrOpen,.payment-qr-card,#paymentAmountBadge",
  'setText("paymentBankName",TUITION_BANK_NAME)',
  'setText("paymentAccountNumber",TUITION_ACCOUNT_NUMBER)',
  'setText("paymentAccountOwner",TUITION_ACCOUNT_DISPLAY_NAME)',
  'setText("paymentContent",snapshot.content)',
  "copyPaymentAccount",
  "data-tuition-payment-qr",
  "Mở cửa sổ thanh toán QR",
  "/api/tuition-qr?"
]){
  if(!modalSource.includes(required))throw new Error(`Popup QR học phí thiếu nội dung hiển thị: ${required}`);
}

const navigationSource=readFileSync(new URL("../student-payment-navigation.js",import.meta.url),"utf8");
for(const required of [
  'import {openTuitionPaymentModal} from "./student-payment-modal.js"',
  'const PAYMENT_HASH="#studentPayment"',
  'url.searchParams.delete("view")',
  "history.replaceState",
  "paymentLink.href=PAYMENT_HASH",
  "Đóng học phí bằng QR →",
  "scheduleLegacyPaymentOpen"
]){
  if(!navigationSource.includes(required))throw new Error(`Điều hướng thanh toán chưa mở popup an toàn: ${required}`);
}
if(navigationSource.includes("const PAYMENT_URL=")||navigationSource.includes("function buildPaymentView"))throw new Error("Điều hướng học phí vẫn còn tạo trang thanh toán riêng dễ bị trắng.");
const navigationCss=readFileSync(new URL("../student-payment-navigation.css",import.meta.url),"utf8");
if(!navigationCss.includes("#studentPortal > #studentPayment{display:none!important}"))throw new Error("CSS học phí chưa giới hạn quy tắc ẩn cho phần tử con trực tiếp.");
if(navigationCss.includes("#studentPortal #studentPayment{display:none!important}"))throw new Error("CSS học phí vẫn ẩn toàn bộ khu vực thanh toán sau khi được chuyển vào hub.");
if(!navigationCss.includes("#studentFinanceHub #studentPayment.student-finance-panel.active{display:block!important}"))throw new Error("Tab thanh toán trong hub chưa được bảo đảm hiển thị.");

const pwaSource=readFileSync(new URL("../pwa-install.js",import.meta.url),"utf8");
for(const required of ["hoclaixecungdat_sw_refresh_v50","registration.update()","SKIP_WAITING","controllerchange"]){
  if(!pwaSource.includes(required))throw new Error(`PWA chưa buộc nhận bản sửa thanh toán mới: ${required}`);
}
const serviceWorkerSource=readFileSync(new URL("../public/sw.js",import.meta.url),"utf8");
for(const required of ["hoclaixecungdat-pwa-v50",'/student-payment-modal.js','/student-payment-navigation.js','/student-payment-navigation.css','/api/tuition-qr',"SKIP_WAITING"]){
  if(!serviceWorkerSource.includes(required))throw new Error(`Service worker chưa làm mới trang thanh toán: ${required}`);
}

const portalHtml=readFileSync(new URL("../hoc-vien.html",import.meta.url),"utf8");
if(!portalHtml.includes('/student-payment-modal.js?v=20260825-1'))throw new Error("Cổng học viên chưa tải popup QR học phí.");
if(!portalHtml.includes('id="tuitionPaymentLink"'))throw new Error("Cổng học viên thiếu nút mở popup QR học phí.");
if(!portalHtml.includes('data-mobile-scroll="#studentPayment"'))throw new Error("Cổng học viên thiếu lối mở thanh toán trên mobile.");

const sql=readFileSync(new URL("../CAP-NHAT-LICH-SU-HOC-PHI-PHIEU-THU.sql",import.meta.url),"utf8");
for(const required of [
  "create table if not exists public.app_student_payments",
  "public.app_list_student_payments",
  "public.app_student_list_payments",
  "public.app_save_student_payment",
  "public.app_void_student_payment",
  "public.app_sync_student_payment_balance",
  "enable row level security"
])if(!sql.toLowerCase().includes(required.toLowerCase()))throw new Error(`SQL học phí thiếu: ${required}`);
for(const field of ["student.date_of_birth","student.cccd","student.address"]){
  if(sql.split(field).length-1<2)throw new Error(`Hai truy vấn phiếu thu chưa trả đủ trường: ${field}`);
}

const admin=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const portal=readFileSync(new URL("../student.js",import.meta.url),"utf8");
if(!admin.includes("openPaymentReceipt(item,student)"))throw new Error("Admin chưa truyền hồ sơ học viên vào biên lai.");
if(!portal.includes("openPaymentReceipt(payment,student)"))throw new Error("Cổng học viên chưa truyền hồ sơ vào biên lai.");

console.log("Học phí hợp lệ: QR cùng tên miền, popup và biên lai ổn định, cache PWA v50.");
