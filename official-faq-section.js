import "./official-faq-section.css";

const faqSection=document.getElementById("faq");

if(faqSection){
  const items=[
    ["PHÁP LÝ","Làm sao biết cơ sở đào tạo lái xe hoạt động hợp pháp?","Cơ sở đào tạo phải có giấy phép phù hợp với hạng xe tuyển sinh và đáp ứng điều kiện về giáo viên, xe tập lái, sân tập cùng hệ thống quản lý đào tạo. Học viên nên yêu cầu tên pháp nhân, đơn vị đào tạo và thông tin khóa học trước khi nộp hồ sơ."],
    ["HỌC PHÍ","Học phí có phải là mức do Bộ Công an quy định không?","Không. Bộ Công an quy định về sát hạch và cấp giấy phép lái xe, không ban hành một mức học phí đào tạo chung cho mọi cơ sở. Học phí cụ thể phải được đơn vị đào tạo báo giá rõ theo hạng bằng, chương trình và dịch vụ thực tế."],
    ["HỌC PHÍ","Trước khi đóng tiền cần hỏi rõ những khoản nào?","Học viên nên yêu cầu bảng kê gồm học phí đào tạo, chi phí xe và thực hành, cabin hoặc DAT nếu áp dụng, tài liệu, khám sức khỏe, lệ phí sát hạch, phí thi lại, đưa đón và các khoản phát sinh. Khoản chưa bao gồm phải được ghi rõ trước khi đăng ký."],
    ["HỒ SƠ","Đăng ký học lái xe thường cần chuẩn bị giấy tờ gì?","Hồ sơ thường gồm giấy tờ định danh, ảnh theo yêu cầu, giấy khám sức khỏe phù hợp với hạng đăng ký và giấy phép lái xe hiện có nếu học nâng hạng. Danh mục chính xác được kiểm tra khi tiếp nhận hồ sơ."],
    ["ĐÀO TẠO","Quá trình học lái xe ô tô gồm những giai đoạn nào?","Lộ trình thông thường gồm hoàn thiện hồ sơ, học lý thuyết, thực hành trên sân và đường, hoàn thành cabin và DAT theo chương trình áp dụng, kiểm tra hoàn thành khóa học, sau đó tham dự kỳ sát hạch."],
    ["LỊCH HỌC","Có thể sắp xếp lịch học linh hoạt không?","Có thể sắp xếp ca học theo lịch giáo viên và xe tập lái. Tuy nhiên, học viên vẫn phải hoàn thành đủ nội dung, thời lượng, quãng đường và dữ liệu đào tạo theo hạng đăng ký."],
    ["DAT · CABIN","DAT và cabin có ý nghĩa gì?","DAT là nội dung thực hành có ghi nhận dữ liệu quãng đường và thời gian học. Cabin điện tử là nội dung đào tạo đối với hạng áp dụng; cabin đào tạo không đồng nghĩa với bài thi mô phỏng trên máy tính."],
    ["SÁT HẠCH","Từ ngày 01/07/2026, thi sát hạch ô tô gồm những phần nào?","Thí sinh thi tuần tự lý thuyết, thực hành trong hình và lái xe trên đường; phải đạt phần trước mới được thi phần tiếp theo. Bài thi mô phỏng trên máy tính đã được bỏ khỏi kỳ sát hạch từ ngày 01/07/2026."],
    ["THI LẠI","Nếu không đạt một phần sát hạch thì xử lý thế nào?","Học viên đăng ký dự sát hạch lại nội dung chưa đạt theo lịch và thủ tục hiện hành. Đơn vị tiếp nhận cần thông báo rõ thời gian, hồ sơ và khoản phí liên quan trước khi đăng ký."],
    ["GIẤY PHÉP","Sau khi thi đạt, khi nào có giấy phép lái xe điện tử?","Theo quy định áp dụng từ ngày 01/07/2026, dữ liệu điện tử của người thi đạt có tài khoản VNeTraffic mức độ 2 được tích hợp trong thời gian rút ngắn, có thể trong vòng 02 giờ. Bản vật lý phụ thuộc quy trình và hình thức trả kết quả."],
    ["THEO DÕI","Theo dõi lịch học, DAT, cabin và lịch thi ở đâu?","Sau khi được cấp tài khoản, học viên đăng nhập hệ thống Thầy Đạt để xem các mốc đào tạo, lịch học, thông báo DAT, cabin, thi tốt nghiệp, sát hạch và tình trạng học phí."]
  ];

  faqSection.innerHTML=`
    <div class="section-heading"><p class="section-kicker">GIẢI ĐÁP TRƯỚC KHI ĐĂNG KÝ</p><h2>Những vấn đề học viên thường quan tâm</h2><span>Thông tin về pháp lý, học phí, hồ sơ, quá trình đào tạo, sát hạch và nhận giấy phép lái xe.</span></div>
    <div class="official-faq-source"><span class="official-faq-source__mark">⚖️</span><div><strong>Đối chiếu quy định chính thức đang áp dụng</strong><small>Sát hạch và cấp giấy phép: Thông tư 108/2026/TT-BCA. Hoạt động, chương trình đào tạo: Nghị định 94/2026/NĐ-CP và quy định của Bộ Xây dựng.</small></div><div class="official-faq-source__links"><a href="https://mps.gov.vn/chinh-sach-phap-luat" target="_blank" rel="noopener noreferrer">Bộ Công an</a><a href="https://moc.gov.vn/vn/Pages/ChiTietVanBan.aspx?TypeVB=2&vID=4968" target="_blank" rel="noopener noreferrer">Bộ Xây dựng</a></div></div>
    <div class="faq-list official-faq-list">${items.map((item,index)=>`<details ${index===0?"open":""}><summary><span>${item[0]}</span>${item[1]}</summary><p>${item[2]}</p></details>`).join("")}</div>
    <p class="official-faq-note"><b>ℹ️</b><span>Nội dung pháp lý được tóm tắt để dễ hiểu. Học phí và lịch học cụ thể căn cứ bảng báo giá, hồ sơ và kế hoạch được xác nhận cho từng khóa.</span></p>`;
}
