import "./tuition-details.css";

const tuitionAnchor=document.querySelector(".training-detail-section")||document.querySelector(".license-info-section");

const money=value=>new Intl.NumberFormat("vi-VN").format(value)+" VNĐ";

const plans=[
  {license:"A1",badge:"XE MÔ TÔ",title:"Hạng A1",description:"Học phí và hồ sơ đăng ký",tuition:800000,fees:[["Thi lý thuyết",60000],["Thi thực hành",70000],["Cấp giấy phép PET",135000]],included:["Tiếp nhận và hướng dẫn hồ sơ","Tài liệu ôn tập theo chương trình","Hướng dẫn lý thuyết và thực hành cơ bản"]},
  {license:"A",badge:"XE MÔ TÔ",title:"Hạng A",description:"Học phí và hồ sơ đăng ký",tuition:1800000,fees:[["Thi lý thuyết",60000],["Thi thực hành",70000],["Cấp giấy phép PET",135000]],included:["Tiếp nhận và hướng dẫn hồ sơ","Tài liệu ôn tập theo chương trình","Hướng dẫn lý thuyết và thực hành hạng A"]},
  {license:"B số tự động",badge:"Ô TÔ HẠNG B",title:"B số tự động",description:"Chương trình đào tạo giới hạn xe số tự động",tuition:22000000,fees:[],included:["Hồ sơ và thủ tục ghi danh","Học lý thuyết theo kế hoạch khóa","Thực hành, nhiên liệu, giáo viên và sân tập","Cabin điện tử theo chương trình hiện hành","DAT và quãng đường đào tạo theo quy định"]},
  {license:"B số sàn",badge:"Ô TÔ HẠNG B",title:"B số sàn",description:"Đào tạo xe số sàn và sử dụng được xe số tự động",tuition:22000000,fees:[],included:["Hồ sơ và thủ tục ghi danh","Học lý thuyết theo kế hoạch khóa","Thực hành, nhiên liệu, giáo viên và sân tập","Cabin điện tử theo chương trình hiện hành","DAT và quãng đường đào tạo theo quy định"]},
  {license:"C1",badge:"Ô TÔ HẠNG C1",title:"Hạng C1",description:"Chương trình đào tạo lái xe ô tô tải hạng C1",tuition:25000000,fees:[],included:["Hồ sơ và thủ tục ghi danh","Học lý thuyết theo kế hoạch khóa","Thực hành xe tải, nhiên liệu, giáo viên và sân tập","Cabin điện tử theo chương trình hiện hành","DAT và quãng đường đào tạo theo quy định","Theo dõi tiến độ học và lịch thi trên hệ thống"]}
];

function total(plan){return plan.tuition+plan.fees.reduce((sum,item)=>sum+item[1],0)}

function card(plan,index){
  const motorbike=plan.fees.length>0;
  return `<article class="tuition-card${index>1?' featured':''}">
    <div class="tuition-card__top"><div><span class="tuition-card__badge">${plan.badge}</span><h3>${plan.title}</h3><p>${plan.description}</p></div><div class="tuition-price"><small>Học phí & hồ sơ</small><strong>${money(plan.tuition)}</strong></div></div>
    <div class="tuition-card__body">
      ${motorbike?`<div class="tuition-fees">${plan.fees.map(([name,value])=>`<div><span>${name}</span><b>${money(value)}</b></div>`).join("")}</div><div class="tuition-total"><span>Tổng dự kiến gồm học phí, sát hạch và PET</span><strong>${money(total(plan))}</strong></div>`:`<div class="tuition-total"><span>Học phí trọn gói khóa đào tạo</span><strong>${money(plan.tuition)}</strong></div>`}
      <ul>${plan.included.map(item=>`<li>${item}</li>`).join("")}</ul>
      <button type="button" data-tuition-license="${plan.license}">Đăng ký tư vấn ${plan.title}</button>
    </div>
  </article>`;
}

if(tuitionAnchor&&!document.getElementById("hoc-phi-tu-van")){
  const section=document.createElement("section");
  section.id="hoc-phi-tu-van";
  section.className="site-upgrade-section site-pricing tuition-section";
  section.innerHTML=`<div class="tuition-shell">
    <div class="tuition-heading"><p>HỌC PHÍ & CÁC KHOẢN NỘP RIÊNG</p><h2>Bảng học phí theo từng hạng đào tạo</h2><span>Trình bày riêng học phí của khóa học và các khoản nộp tại cơ quan sát hạch để học viên dễ theo dõi.</span></div>
    <div class="tuition-alert"><b>!</b><span><strong>Lưu ý:</strong> A1 và A có lệ phí sát hạch, cấp PET nộp riêng tại sân thi. Với hạng B và C1, lệ phí khám sức khỏe, sát hạch, cấp giấy phép và tập xe cảm biến không nằm trong học phí trọn gói, trừ khi có xác nhận khác bằng văn bản.</span></div>
    <div class="tuition-grid">${plans.map(card).join("")}</div>
    <div class="tuition-package">
      <div class="tuition-package__head"><div><p>GÓI HỌC PHÍ Ô TÔ</p><h3>Các nội dung thuộc chương trình đào tạo</h3></div><span>Hạng B hiện hành không còn phân loại B1 và B2 theo mục đích kinh doanh vận tải. Website dùng tên “B số tự động”, “B số sàn” và “C1” để học viên dễ lựa chọn chương trình phù hợp.</span></div>
      <div class="tuition-package-grid"><article><b>01</b><strong>Hồ sơ và thủ tục</strong><small>Ghi danh, kiểm tra thông tin và hướng dẫn giấy tờ.</small></article><article><b>02</b><strong>Lý thuyết</strong><small>Học theo lịch và chương trình của cơ sở đào tạo.</small></article><article><b>03</b><strong>Thực hành</strong><small>Xe tập lái, nhiên liệu, giáo viên và sân tập theo gói.</small></article><article><b>04</b><strong>Cabin điện tử</strong><small>Thực hiện theo thời lượng của chương trình đang áp dụng.</small></article><article><b>05</b><strong>Đào tạo DAT</strong><small>Ghi nhận thời gian và quãng đường thực hành theo quy định.</small></article><article><b>06</b><strong>Quản lý tiến độ</strong><small>Theo dõi lịch học, cabin, DAT và lịch thi trên hệ thống.</small></article></div>
      <div class="tuition-extra"><article><strong>Khoản nộp riêng</strong><p>Khám sức khỏe, lệ phí sát hạch, cấp giấy phép PET và thi lại nếu phát sinh được thông báo theo mức áp dụng tại thời điểm thực hiện.</p></article><article><strong>Tập xe cảm biến</strong><p>Chi phí tập thử xe sát hạch không nằm trong học phí. Mức tham khảo do sân thi hoặc đơn vị cung cấp xe thông báo trước khi đăng ký.</p></article></div>
      <div class="tuition-legal-note"><span><strong>Căn cứ lệ phí:</strong> Thông tư 154/2025/TT-BTC có hiệu lực từ 01/01/2026. Mức thu thực tế được đối chiếu tại thời điểm nộp.</span><div><a href="https://vanban.chinhphu.vn/?classid=1&docid=216544&pageid=27160" target="_blank" rel="noopener noreferrer">Xem văn bản lệ phí</a><a href="#dang-ky">Đăng ký tư vấn</a></div></div>
    </div>
  </div>`;
  tuitionAnchor.insertAdjacentElement("afterend",section);
  section.querySelectorAll("[data-tuition-license]").forEach(button=>button.addEventListener("click",()=>{
    document.querySelector(`[data-license-card="${CSS.escape(button.dataset.tuitionLicense)}"]`)?.click();
    document.getElementById("registrationForm")?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
}
