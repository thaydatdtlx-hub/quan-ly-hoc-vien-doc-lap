import "./license-eligibility-section.css";

function mountEligibility(){
  if(document.querySelector(".license-eligibility-section"))return;
  const anchor=document.querySelector(".training-detail-section")||document.querySelector(".license-info-section");
  if(!anchor)return;
  const data=[
    {badge:"B",title:"Hạng B",vehicle:"Ô tô chở người đến 8 chỗ không kể chỗ lái xe; ô tô tải, chuyên dùng đến 3.500 kg và rơ moóc đến 750 kg.",age:"Từ đủ 18 tuổi.",term:"10 năm kể từ ngày cấp.",exam:"Lý thuyết, mô phỏng, thực hành trong hình và trên đường."},
    {badge:"C1",title:"Hạng C1",vehicle:"Ô tô tải, chuyên dùng trên 3.500 kg đến 7.500 kg; rơ moóc đến 750 kg và các xe thuộc hạng B.",age:"Từ đủ 18 tuổi.",term:"10 năm kể từ ngày cấp.",exam:"Lý thuyết, mô phỏng, thực hành trong hình và trên đường."}
  ];
  const section=document.createElement("section");
  section.className="license-eligibility-section";
  section.id="dieu-kien-tung-hang";
  section.innerHTML=`<div class="license-eligibility-shell"><div class="license-eligibility-heading"><p>ĐIỀU KIỆN & PHẠM VI SỬ DỤNG</p><h2>Biết rõ mỗi hạng bằng được lái xe gì</h2><span>Thông tin được tóm tắt theo Luật Trật tự, an toàn giao thông đường bộ có hiệu lực từ ngày 01/01/2025.</span></div><div class="license-eligibility-grid">${data.map(item=>`<article class="license-eligibility-card"><span>${item.badge}</span><h3>${item.title}</h3><dl><div><dt>Phạm vi điều khiển</dt><dd>${item.vehicle}</dd></div><div><dt>Độ tuổi tối thiểu</dt><dd>${item.age}</dd></div><div><dt>Thời hạn giấy phép</dt><dd>${item.term}</dd></div><div><dt>Nội dung sát hạch chính</dt><dd>${item.exam}</dd></div></dl><button type="button" data-eligibility-license="${item.title==='Hạng B'?'B số tự động':item.badge}">Đăng ký ${item.title}</button></article>`).join("")}</div><p class="license-eligibility-note"><strong>Lưu ý:</strong> Điều kiện sức khỏe, hồ sơ và quy trình sát hạch được kiểm tra theo quy định đang áp dụng tại thời điểm đăng ký. Người học B số tự động không được điều khiển ô tô số cơ khí. <a href="https://xaydungchinhsach.chinhphu.vn/tu-1-1-2025-co-nhung-hang-giay-phep-lai-xe-nao-119240812165630751.htm" target="_blank" rel="noopener noreferrer">Xem nguồn Chính phủ</a>.</p></div>`;
  anchor.insertAdjacentElement("afterend",section);
  section.querySelectorAll("[data-eligibility-license]").forEach(button=>button.addEventListener("click",()=>{
    const value=button.dataset.eligibilityLicense;
    document.querySelector(`[data-license-card="${CSS.escape(value)}"]`)?.click();
    document.getElementById("registrationForm")?.scrollIntoView({behavior:"smooth",block:"start"});
  }));

  document.querySelectorAll(".procedure-card>div span").forEach(span=>{
    if(/giấy khám sức khỏe khi cần/i.test(span.textContent))span.textContent="Giấy khám sức khỏe theo hướng dẫn hồ sơ";
  });
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountEligibility,{once:true});else mountEligibility();
