import {buildReceiptHtml,paymentMethodLabel,paymentTotals,receiptDate,receiptMoney} from "../payment-receipt.js";
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
const html=buildReceiptHtml({receipt_no:"PT-20260801-ABC123",student_name:"Nguyễn Văn An",student_code:"HV-0001",amount:5_000_000,payment_date:"2026-08-01",payment_method:"bank_transfer"});
if(!html.includes("PHIẾU THU HỌC PHÍ")||!html.includes("PT-20260801-ABC123")||!html.includes("5.000.000 ₫")||!html.includes("Trần Quốc Đạt"))throw new Error("Phiếu thu thiếu nội dung bắt buộc.");

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

console.log("Học phí hợp lệ: phép tính công nợ, phương thức, ngày và phiếu thu điện tử.");
