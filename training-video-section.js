import "./training-video-section.css";

const TRAINING_VIDEOS=[
  {
    id:"eBx6gAFa9a8",
    url:"https://youtu.be/eBx6gAFa9a8?si=Heckare8yAd4omLJ",
    label:"VIDEO ĐÀO TẠO 01",
    title:"Nội dung đào tạo thực tế cùng Thầy Đạt"
  },
  {
    id:"5YEjYy8a6NI",
    url:"https://youtu.be/5YEjYy8a6NI?si=n49G52_z2fug3HDB",
    label:"VIDEO ĐÀO TẠO 02",
    title:"Xem thêm nội dung hướng dẫn học lái xe"
  }
];

function videoCard(video,index){
  return `
    <article class="training-video-card">
      <div class="training-video-frame">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1"
          title="${video.title}"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen>
        </iframe>
      </div>
      <div class="training-video-info">
        <span>▶</span>
        <small>${video.label}</small>
        <h3>${video.title}</h3>
        <p>Học viên có thể xem trực tiếp trên website hoặc mở video trong YouTube để theo dõi toàn màn hình.</p>
        <ul>
          <li>Hiển thị tốt trên máy tính và điện thoại</li>
          <li>Không tự động phát âm thanh</li>
          <li>Có thể xem toàn màn hình</li>
          <li>Liên kết trực tiếp đến video gốc</li>
        </ul>
        <div class="training-video-info-actions">
          <a href="${video.url}" target="_blank" rel="noopener noreferrer">Mở video ${index+1} trên YouTube</a>
          <a class="training-video-register" href="#dang-ky">Đăng ký sau khi xem</a>
        </div>
      </div>
    </article>`;
}

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
          <span>Hai video giúp học viên hình dung rõ hơn về quá trình học, cách hướng dẫn và những nội dung cần chuẩn bị trước khi bắt đầu khóa đào tạo.</span>
        </div>
        <div class="training-video-heading-actions">
          ${TRAINING_VIDEOS.map((video,index)=>`<a href="${video.url}" target="_blank" rel="noopener noreferrer">Video ${index+1} trên YouTube</a>`).join("")}
        </div>
      </div>

      <div class="training-video-list">
        ${TRAINING_VIDEOS.map(videoCard).join("")}
      </div>
      <p class="training-video-note">Video được nhúng từ YouTube. Việc phát video phụ thuộc vào kết nối mạng và cài đặt quyền riêng tư của trình duyệt.</p>
    </div>`;

  target.insertAdjacentElement("afterend",section);
}

mountTrainingVideo();
