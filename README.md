# Quản lý học viên lái xe

Website quản lý hồ sơ, tiến độ đào tạo và học phí học viên lái xe.

## Học lý thuyết 600 câu

Trang `/600-cau-hoi.html` cung cấp:

- Đủ 600 câu hỏi, 60 câu điểm liệt và 318 hình minh họa.
- Ôn theo 6 chương, tìm kiếm, đánh dấu và tự lưu tiến độ trên thiết bị.
- Thi thử A1, A, B và C1 theo cấu trúc đề hiện hành; A1/A dùng đúng nhóm 250 câu dành cho mô tô.
- A1: 25 câu, 19 phút, đạt 21; A: 25 câu, 19 phút, đạt 23; B: 30 câu, 20 phút, đạt 27; C1: 35 câu, 22 phút, đạt 32.
- Tiến độ học và lịch sử thi thử được đồng bộ theo tài khoản học viên; Admin xem được số câu đã học, tỷ lệ đúng và từng lần thi.

Nội dung được đối chiếu với [bộ câu hỏi của Cục Cảnh sát giao thông](https://csgt.bocongan.gov.vn/van-ban/bo-600-cau-hoi-dung-cho-sat-hach-lai-xe-co-gioi-duong-bo) và Công văn số 2262/CSGT-P5 ngày 07/05/2025.

Ngày 30/07/2026, toàn bộ 600 câu và phần đáp án gạch chân trong PDF 186 trang của Cục CSGT đã được kiểm tra tự động. Có thể chạy lại kiểm tra tính toàn vẹn bằng lệnh `npm run check:questions`.

Để bật đồng bộ tài khoản trên cơ sở dữ liệu hiện có, chạy file `CAP-NHAT-TIEN-DO-600-CAU.sql` trong Supabase SQL Editor.

## Thùng rác và nhật ký thao tác

Chạy file `CAP-NHAT-THUNG-RAC-NHAT-KY.sql` trong Supabase SQL Editor để bật:

- Xóa mềm học viên và khôi phục nguyên hồ sơ, lịch học, tiến độ 600 câu.
- Chỉ Admin được xóa vĩnh viễn hồ sơ đang nằm trong thùng rác.
- Ghi nhật ký người thực hiện, nội dung và thời gian của các thao tác quản trị quan trọng.

## Chống trùng khi nhập Excel

Trước khi nhập dữ liệu, hệ thống tự đối chiếu mã học viên, CCCD và số điện thoại với toàn bộ hồ sơ đang hoạt động và Thùng rác. Admin được xem trước từng dòng rồi chọn cập nhật hồ sơ trùng, bỏ qua hồ sơ trùng hoặc dừng toàn bộ lần nhập. Các dòng lặp trong cùng file, hồ sơ đang ở Thùng rác và trường hợp cần đối chiếu thủ công luôn được bỏ qua để tránh mất dữ liệu.

## Lịch sử học phí và phiếu thu

Chạy file `CAP-NHAT-LICH-SU-HOC-PHI-PHIEU-THU.sql` trong Supabase SQL Editor để bật:

- Sổ giao dịch học phí theo từng học viên, ngày thu và phương thức thanh toán.
- Phiếu thu điện tử có mã riêng, xem lại, in hoặc lưu PDF.
- Hủy phiếu có lý do và tự tính lại công nợ; giao dịch không bị xóa khỏi lịch sử.
- Học viên tự xem các lần đã đóng và phiếu thu trong tài khoản của mình.
- Số tiền “Đã thu” hiện có được bảo toàn dưới dạng số dư ban đầu.

## Điểm danh, giờ thực học và báo cáo Admin

Chạy file `CAP-NHAT-DIEM-DANH-BAO-CAO.sql` trong Supabase SQL Editor để bật:

- Admin ghi nhận từng buổi học theo ngày, nội dung, trạng thái có mặt/vắng/vắng có phép và giờ bắt đầu–kết thúc.
- Hệ thống tự tính số giờ học thực tế, tỷ lệ chuyên cần và lưu nhật ký khi thêm, sửa hoặc xóa bản điểm danh.
- Học viên tự xem tổng số buổi, giờ thực học và lịch sử điểm danh trong tài khoản cá nhân.
- Báo cáo Admin lọc theo khoảng ngày và tài khoản phụ trách, kết hợp chuyên cần, tiến độ 600 câu, học phí và công nợ.
- Xuất báo cáo tổng hợp ra Excel để lưu trữ hoặc đối soát.

## Cảnh báo sớm học viên

Dashboard Admin tự động ưu tiên học viên cần hỗ trợ dựa trên dữ liệu hiện có:

- Chuyên cần dưới 80% sau tối thiểu 3 buổi hoặc có nhiều buổi vắng.
- Thi thử từ 3 lần chưa đạt, độ chính xác lý thuyết thấp hoặc gián đoạn học 600 câu từ 14 ngày.
- Học phí chưa hoàn tất, hồ sơ còn thiếu hoặc sắp thi nhưng chưa có bài thi thử đạt.
- Trạng thái Cabin/DAT đã hoàn thành nhưng chưa có giờ thực học tương ứng.

Mỗi cảnh báo liên kết trực tiếp đến điểm danh, tiến độ học, sổ học phí, hồ sơ hoặc lịch đào tạo của đúng học viên. Chức năng dùng dữ liệu sẵn có và không cần chạy thêm SQL.

## Chạy thử

```bash
npm install
npm run dev
```

## Triển khai

Dự án là website tĩnh dùng Vite và có thể triển khai trực tiếp trên Vercel.
