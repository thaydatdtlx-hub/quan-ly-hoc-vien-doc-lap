import "./new-student-practice-link.css";

const PRACTICE_URL="https://daylaixesongtien.vn/tronghinh/";

function addPublicRegistrationLink(){
  if(document.getElementById("practiceReferenceSection"))return;
  const courseSection=document.getElementById("hang-bang");
  if(!courseSection)return;

  const section=document.createElement("section");
  section.id="practiceReferenceSection";
  section.className="practice-reference-section";
  section.innerHTML=`
    <div class="practice-reference-shell">
      <span class="practice-reference-icon" aria-hidden="true">🚘</span>
      <div class="practice-reference-copy">
        <p>GIAO DIỆN THỰC HÀNH TRONG HÌNH</p>
        <h2>Xem nội dung luyện tập trước khi đăng ký</h2>
        <span>Mở giao diện tham khảo về các bài thực hành trong hình để học viên hình dung nội dung học và chuẩn bị tốt hơn trước khóa đào tạo.</span>
      </div>
      <a class="practice-reference-link" href="${PRACTICE_URL}" target="_blank" rel="noopener noreferrer">Mở giao diện thực hành ↗</a>
    </div>
    <small class="practice-reference-note">Liên kết mở website bên ngoài trong tab mới. Thông tin đăng ký học vẫn được gửi và quản lý trên hệ thống học lái xe cùng Đạt.</small>`;
  courseSection.insertAdjacentElement("afterend",section);

  const heroActions=document.querySelector(".hero-actions");
  if(heroActions&&!heroActions.querySelector(".practice-reference-hero-link")){
    const link=document.createElement("a");
    link.className="btn btn-outline practice-reference-hero-link";
    link.href=PRACTICE_URL;
    link.target="_blank";
    link.rel="noopener noreferrer";
    link.textContent="Xem thực hành trong hình";
    heroActions.append(link);
  }
}

function addAdminRegistrationLink(){
  const dialog=document.getElementById("newStudentAdminDialog");
  if(!dialog||dialog.querySelector(".new-student-practice-admin-link"))return;
  const toolbar=dialog.querySelector(".new-student-admin-toolbar");
  if(!toolbar)return;

  const link=document.createElement("a");
  link.className="new-student-practice-admin-link";
  link.href=PRACTICE_URL;
  link.target="_blank";
  link.rel="noopener noreferrer";
  link.textContent="Thực hành trong hình ↗";
  toolbar.append(link);
}

function boot(){
  addPublicRegistrationLink();
  addAdminRegistrationLink();
  new MutationObserver(()=>addAdminRegistrationLink()).observe(document.body,{subtree:true,childList:true});
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
