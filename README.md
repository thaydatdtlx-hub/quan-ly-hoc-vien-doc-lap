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

Để bật đồng bộ tài khoản trên cơ sở dữ liệu hiện có, chạy file `CAP-NHAT-TIEN-DO-600-CAU.sql` trong Supabase SQL Editor.

## Chạy thử

```bash
npm install
npm run dev
```

## Triển khai

Dự án là website tĩnh dùng Vite và có thể triển khai trực tiếp trên Vercel.
