import "./official-faq-section.css";

const faqSection=document.getElementById("faq");

if(faqSection){
  faqSection.innerHTML=`
    <div class="section-heading">
      <p class="section-kicker">KIẾN THỨC AN TOÀN GIAO THÔNG</p>
      <h2>Câu hỏi thường gặp từ bộ đề chính thức</h2>
      <span>Nội dung được chọn lọc từ Bộ 600 câu hỏi dùng cho sát hạch lái xe cơ giới đường bộ do Cục Cảnh sát giao thông biên soạn, áp dụng từ ngày 01/06/2025.</span>
    </div>

    <div class="official-faq-source">
      <span class="official-faq-source__mark" aria-hidden="true">🛡️</span>
      <div>
        <strong>Nguồn: Cục Cảnh sát giao thông · Bộ Công an</strong>
        <small>Các câu trả lời bên dưới được trình bày theo đáp án đúng trong tài liệu chính thức, giúp học viên ghi nhớ kiến thức an toàn trước khi học và thi sát hạch.</small>
      </div>
      <a href="/600-cau-hoi.html">Ôn bộ 600 câu</a>
    </div>

    <div class="faq-list official-faq-list">
      <details open>
        <summary><span>Câu 239</span>Khi lái xe ô tô số tự động, sử dụng chân như thế nào là đúng?</summary>
        <p><strong>Đáp án đúng:</strong> Không sử dụng chân trái; chân phải điều khiển cả bàn đạp phanh và bàn đạp ga.</p>
      </details>

      <details>
        <summary><span>Câu 240</span>Khi tầm nhìn bị hạn chế bởi sương mù hoặc mưa to, cần xử lý thế nào?</summary>
        <p><strong>Đáp án đúng:</strong> Giảm tốc độ, giữ khoảng cách an toàn với xe phía trước, bật đèn sương mù và đèn chiếu gần.</p>
      </details>

      <details>
        <summary><span>Câu 245</span>Khi điều khiển ô tô trong trời mưa, cần làm gì để bảo đảm an toàn?</summary>
        <p><strong>Đáp án đúng:</strong> Giảm tốc độ, tăng cường quan sát, không phanh gấp, không tăng ga hoặc đánh vô lăng đột ngột; bật đèn chiếu gần và sử dụng gạt nước phù hợp.</p>
      </details>

      <details>
        <summary><span>Câu 246</span>Khi lùi xe, người lái xe phải thực hiện thế nào?</summary>
        <p><strong>Đáp án đúng:</strong> Quan sát bên trái, bên phải và phía sau xe, phát tín hiệu cần thiết rồi lùi với tốc độ phù hợp.</p>
      </details>

      <details>
        <summary><span>Câu 247</span>Lái xe trong khu vực đông dân cư cần lưu ý điều gì?</summary>
        <p><strong>Đáp án đúng:</strong> Giảm tốc độ đến mức an toàn, quan sát, nhường đường cho người đi bộ, giữ khoảng cách với xe phía trước; đi đúng làn và chỉ chuyển làn tại nơi được phép khi bảo đảm an toàn.</p>
      </details>

      <details>
        <summary><span>Câu 248</span>Khi nhập vào đường cao tốc, người lái xe cần thực hiện thế nào?</summary>
        <p><strong>Đáp án đúng:</strong> Quan sát, phát tín hiệu, nhường đường cho xe đang chạy trên cao tốc; khi đủ điều kiện an toàn thì tăng tốc trên làn tăng tốc trước khi nhập vào làn chính.</p>
      </details>

      <details>
        <summary><span>Câu 250</span>Khi nào được dừng hoặc đỗ trên làn dừng khẩn cấp của đường cao tốc?</summary>
        <p><strong>Đáp án đúng:</strong> Chỉ khi xe gặp sự cố, tai nạn hoặc tình huống khẩn cấp khiến xe không thể tiếp tục di chuyển bình thường.</p>
      </details>

      <details>
        <summary><span>Câu 253</span>Khi đi từ đường nhánh ra đường chính, phải xử lý thế nào?</summary>
        <p><strong>Đáp án đúng:</strong> Quan sát, giảm tốc độ, phát tín hiệu và nhường đường cho các xe đang đi trên đường chính từ mọi hướng.</p>
      </details>

      <details>
        <summary><span>Câu 254</span>Khi đang lái xe mà cần sử dụng điện thoại, phải làm gì?</summary>
        <p><strong>Đáp án đúng:</strong> Giảm tốc độ và dừng xe tại nơi được phép, sau đó mới sử dụng điện thoại để nhắn tin hoặc gọi điện.</p>
      </details>
    </div>

    <p class="official-faq-note"><b aria-hidden="true">ℹ️</b><span>Đây là nội dung học tập trích chọn từ bộ câu hỏi sát hạch, không thay thế phần tư vấn hồ sơ, học phí hoặc lịch đào tạo riêng của từng học viên.</span></p>`;
}
