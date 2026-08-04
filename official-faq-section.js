import "./official-faq-section.css";

const faqSection=document.getElementById("faq");

if(faqSection){
  const items=[
    ["PHÁP LÝ","Làm sao biết cơ sở đào tạo lái xe hoạt động hợp pháp?","Cơ sở đào tạo phải có giấy phép phù hợp với hạng xe tuyển sinh và đáp ứng điều kiện về giáo viên, xe tập lái, sân tập cùng hệ thống quản lý đào tạo. Học viên nên yêu cầu tên pháp nhân, đơn vị đào tạo và thông tin khóa học trước khi nộp hồ sơ."],
    ["HỌC PHÍ","Học phí hạng A1 là bao nhiêu?","Học phí và hồ sơ hạng A1 là 800.000 VNĐ. Lệ phí nộp riêng tại sân thi gồm: lý thuyết 60.000 VNĐ, thực hành 70.000 VNĐ và cấp giấy phép PET 135.000 VNĐ. Tổng dự kiến: 1.065.000 VNĐ."],
    ["HỌC PHÍ","Học phí hạng A là bao nhiêu?","Học phí và hồ sơ hạng A là 1.800.000 VNĐ. Lệ phí nộp riêng tại sân thi gồm: lý thuyết 60.000 VNĐ, thực hành 70.000 VNĐ và cấp giấy phép PET 135.000 VNĐ. Tổng dự kiến: 2.065.000 VNĐ."],
    ["HỌC PHÍ","Học phí hạng B số tự động và B số sàn là bao nhiêu?","Học phí hạng B số tự động là 22.000.000 VNĐ; học phí hạng B số sàn cũng là 22.000.000 VNĐ. Các khoản khám sức khỏe, lệ phí sát hạch, cấp giấy phép PET, thi lại hoặc tập xe cảm biến được nộp riêng nếu phát sinh."],
    ["HỌC PHÍ","Gói học phí hạng B bao gồm những nội dung nào?","Gói học phí gồm hồ sơ và thủ tục ghi danh, học lý thuyết theo kế hoạch, thực hành với xe tập lái, nhiên liệu, giáo viên, sân tập, cabin điện tử, đào tạo DAT và theo dõi tiến độ trên hệ thống. Nội dung cụ thể được xác nhận theo khóa học."],
    ["HỒ SƠ","Đăng ký học lái xe thường cần chuẩn bị giấy tờ gì?","Hồ sơ thường gồm giấy tờ định danh, ảnh theo yêu cầu, giấy khám sức khỏe phù hợp với hạng đăng ký và giấy phép lái xe hiện có nếu học nâng hạng. Danh mục chính xác được kiểm tra khi tiếp nhận hồ sơ."],
    ["ĐÀO TẠO","Quá trình học lái xe ô tô gồm những giai đoạn nào?","Lộ trình thông thường gồm hoàn thiện hồ sơ, học lý thuyết, thực hành trên sân và đường, hoàn thành cabin và DAT theo chương trình áp dụng, kiểm tra hoàn thành khóa học, sau đó tham dự kỳ sát hạch."],
    ["LỊCH HỌC","Có thể sắp xếp lịch học linh hoạt không?","Có thể sắp xếp ca học theo lịch giáo viên và xe tập lái. Tuy nhiên, học viên vẫn phải hoàn thành đủ nội dung, thời lượng, quãng đường và dữ liệu đào tạo theo hạng đăng ký."],
    ["DAT · CABIN","DAT và cabin có ý nghĩa gì?","DAT là nội dung thực hành có ghi nhận dữ liệu quãng đường và thời gian học. Cabin điện tử là nội dung đào tạo đối với hạng áp dụng; cabin đào tạo không đồng nghĩa với bài thi mô phỏng trên máy tính."],
    ["SÁT HẠCH","Nếu không đạt một phần sát hạch thì xử lý thế nào?","Học viên đăng ký dự sát hạch lại nội dung chưa đạt theo lịch và thủ tục hiện hành. Đơn vị tiếp nhận cần thông báo rõ thời gian, hồ sơ và khoản phí liên quan trước khi đăng ký."],
    ["THEO DÕI","Theo dõi lịch học, DAT, cabin và lịch thi ở đâu?","Sau khi được cấp tài khoản, học viên đăng nhập hệ thống Thầy Đạt để xem các mốc đào tạo, lịch học, thông báo DAT, cabin, thi tốt nghiệp, sát hạch và tình trạng học phí."]
  ];

  faqSection.innerHTML=`
    <div class="section-heading"><p class="section-kicker">GIẢI ĐÁP TRƯỚC KHI ĐĂNG KÝ</p><h2>Những vấn đề học viên thường quan tâm</h2><span>Thông tin về pháp lý, học phí, hồ sơ, quá trình đào tạo, sát hạch và theo dõi tiến độ.</span></div>
    <div class="official-faq-source"><span class="official-faq-source__mark">⚖️</span><div><strong>Thông tin học phí được công khai theo từng hạng</strong><small>Học phí của trung tâm được tách riêng với lệ phí nộp tại sân thi và các khoản phát sinh để học viên dễ đối chiếu.</small></div><div class="official-faq-source__links"><a href="#hoc-phi-tu-van">Xem bảng học phí</a><a href="https://vanban.chinhphu.vn/?classid=1&docid=216544&pageid=27160" target="_blank" rel="noopener noreferrer">Xem văn bản lệ phí</a></div></div>
    <div class="faq-list official-faq-list">${items.map((item,index)=>`<details ${index===0?"open":""}><summary><span>${item[0]}</span>${item[1]}</summary><p>${item[2]}</p></details>`).join("")}</div>
    <p class="official-faq-note"><b>ℹ️</b><span>Mức lệ phí nhà nước có thể được điều chỉnh theo văn bản áp dụng tại thời điểm nộp. Trung tâm sẽ thông báo lại trước kỳ sát hạch.</span></p>`;
}
