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
  "img.vietqr.io/image/970422-360556789999-qr_only.png",
  "amount=5000000",
  "addInfo=HP%20Van%20An%2001ABC123",
  "accountName=TRAN%20QUOC%20DAT",
  "Mã QR chuyển khoản học phí MB Bank"
]){
  if(!html.includes(required))throw new Error(`Biên lai chuyển khoản thiếu mã QR hoặc dữ liệu QR: ${required}`);
}
if(html.includes("Mã học viên:")||html.includes("HV-0001"))throw new Error("Biên lai học phí vẫn còn hiển thị mã học viên.");
const cashHtml=buildReceiptHtml({...receipt,payment_method:"cash"});
if(cashHtml.includes('<figure class="transfer-qr">')||cashHtml.includes("img.vietqr.io/image/"))throw new Error("Biên lai tiền mặt không được hiển thị mã QR chuyển khoản.");
const voidedHtml=buildReceiptHtml({...receipt,voided_at:"2026-08-02T00:00:00Z"});
if(voidedHtml.includes('<figure class="transfer-qr">')||voidedHtml.includes("img.vietqr.io/image/"))throw new Error("Phiếu thu đã hủy không được hiển thị mã QR chuyển khoản.");

if(nextTuitionPaymentNumber(0)!==1||nextTuitionPaymentNumber(1)!==2||nextTuitionPaymentNumber(4)!==5)throw new Error("Sai số thứ tự lần đóng học phí.");
if(tuitionTransferContent("Nguyễn Văn An",0)!=="Nguyễn Văn An HPLX lần 1")throw new Error("Sai nội dung chuyển khoản lần 1.");
if(tuitionTransferContent("Nguyễn Văn An",1)!=="Nguyễn Văn An HPLX lần 2")throw new Error("Sai nội dung chuyển khoản lần 2.");
const tuitionQrUrl=tuitionTransferQrUrl("Nguyễn Văn An",5_000_000,1);
const decodedTuitionQrUrl=decodeURIComponent(tuitionQrUrl.replace(/\+/g," "));
for(const required of [
  "img.vietqr.io/image/970422-360556789999-qr_only.png",
  "amount=5000000",
  "addInfo=Nguyễn Văn An HPLX lần 2",
  "accountName=TRAN QUOC DAT"
]){
  if(!decodedTuitionQrUrl.includes(required))throw new Error(`Mã QR học phí thiếu dữ liệu: ${required}`);
}

const modalSource=readFileSync(new URL("../student-payment-modal.js",import.meta.url),"utf8");
for(const required of [
  ".tuition-payment-qr-fallback[hidden]{display:none!important}",
  "max-height:calc(100dvh - 20px)",
  '#tuitionPaymentLink,.tuition-card.debt'
]){
  if(!modalSource.includes(required))throw new Error(`Popup QR học phí thiếu bảo vệ giao diện: ${required}`);
}

const portalHtml=readFileSync(new URL("../hoc-vien.html",import.meta.url),"utf8");
if(!portalHtml.includes('/student-payment-modal.js?v=20260825-1'))throw new Error("Cổng học viên chưa tải popup QR học phí.");
if(!portalHtml.includes('id="tuitionPaymentLink"'))throw new Error("Cổng học viên thiếu nút mở popup QR học phí.");

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

console.log("Học phí hợp lệ: công nợ, QR biên lai, popup QR, nội dung HPLX theo lần đóng và phiếu thu điện tử.");
