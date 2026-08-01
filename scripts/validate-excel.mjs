import ExcelJS from "exceljs";

const source=new ExcelJS.Workbook();
const sheet=source.addWorksheet("DATA HỌC VIÊN");
sheet.addRows([
  ["Họ và tên","Hạng","Tổng học phí","Đã thu"],
  ["Nguyễn Văn An","B số tự động",18_500_000,5_000_000]
]);

const bytes=await source.xlsx.writeBuffer();
if(bytes.byteLength<1000)throw new Error("File Excel tạo ra không hợp lệ.");

const restored=new ExcelJS.Workbook();
await restored.xlsx.load(bytes);
const restoredSheet=restored.getWorksheet("DATA HỌC VIÊN");

if(!restoredSheet)throw new Error("Không đọc lại được trang DATA HỌC VIÊN.");
if(restoredSheet.getCell("A2").value!=="Nguyễn Văn An")throw new Error("Sai dữ liệu họ tên sau khi đọc lại.");
if(restoredSheet.getCell("C2").value!==18_500_000)throw new Error("Sai dữ liệu học phí sau khi đọc lại.");

console.log(`Excel hợp lệ: tạo và đọc lại ${bytes.byteLength.toLocaleString("vi-VN")} byte dữ liệu .xlsx.`);
