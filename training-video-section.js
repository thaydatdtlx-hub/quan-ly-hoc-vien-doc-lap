import "./training-video-section.css";

function mountTrainingVideo(){
  if(document.querySelector(".training-video-section"))return;
  const target=document.querySelector(".training-map-section")||document.querySelector(".gallery-section")||document.querySelector(".registration-section");
  if(!target)return;

  const section=document.createElement("section");
  section.className="training-video-section";
  section.id="video-dao-tao";
  section.innerHTML=`
    <div class="training-video-shell">
      <div class="training-video-heading">
        <div>
          <p>VIDEO ĐÀO TẠO THỰC TẾ</p>
          <h2>Xem trước nội dung học cùng Thầy Đạt</h2>
          <span>Video giúp học viên hình dung rõ hơn về quá trình học, cách hướng dẫn và những nội dung cần chuẩn bị trước khi bắt đầu khóa đào tạo.</span>
        </div>
        <a href="https://youtu.be/1Wwi5xkxd3k" target="_blank" rel="noopener noreferrer">Mở trên YouTube</a>
      </div>

      <div class="training-video-card">
        <div class="training-video-frame">
          <iframe
            src="https://www.youtube-nocookie.com/embed/1Wwi5xkxd3k?rel=0&modestbranding=1"
            title="Video đào tạo lái xe cùng Thầy Đạt"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen>
          </iframe>
        </div>
        <div class="training-video-info">
          <span>▶</span>
          <small>VIDEO NỔI BẬT</small>
          <h3>Nội dung hướng dẫn học lái xe</h3>
          <p>Học viên có thể xem trực tiếp trên website hoặc mở video trong YouTube để theo dõi toàn màn hình.</p>
          <ul>
            <li>Hiển thị tốt trên máy tính và điện thoại</li>
            <li>Không tự động phát âm thanh</li>
            <li>Có thể xem toàn màn hình</li>
            <li>Liên kết trực tiếp đến video gốc</li>
          </ul>
          <a href="#dang-ky">Đăng ký sau khi xem</a>
        </div>
      </div>
      <p class="training-video-note">Video được nhúng từ YouTube. Việc phát video phụ thuộc vào kết nối mạng và cài đặt quyền riêng tư của trình duyệt.</p>
    </div>`;

  target.insertAdjacentElement("afterend",section);
}

mountTrainingVideo();
