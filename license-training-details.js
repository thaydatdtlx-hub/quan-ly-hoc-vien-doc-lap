import "./license-training-details.css";

const trainingPrograms={
  "B số tự động":{
    short:"Ô tô hạng B · Số tự động",
    title:"Chương trình B số tự động",
    description:"Phù hợp với học viên lựa chọn xe chuyển số tự động hoặc xe điện; thời gian đào tạo dự kiến 2,5–3 tháng, tùy kế hoạch khóa và tiến độ hoàn thành của học viên.",
    metrics:[
      ["203 giờ","Tổng thời gian tối thiểu"],
      ["136 giờ","Đào tạo lý thuyết"],
      ["67 giờ","Đào tạo thực hành"],
      ["1.000 km","Quãng đường thực hành"]
    ],
    modules:[
      ["⚖️","Pháp luật giao thông · 90 giờ","Luật trật tự an toàn giao thông, quy tắc, báo hiệu đường bộ và xử lý vi phạm."],
      ["🔧","Cấu tạo ô tô · 8 giờ","Kiến thức cơ bản về các hệ thống ô tô, sử dụng, kiểm tra và bảo dưỡng thông thường."],
      ["🤝","Văn hóa và an toàn · 14 giờ","Đạo đức, văn hóa giao thông, phòng chống rượu bia, phòng cháy chữa cháy và cứu nạn."],
      ["🛡️","Kỹ thuật và xử lý tình huống · 24 giờ","Kỹ thuật lái xe, nhận diện tình huống và phương pháp xử lý nguy cơ giao thông."]
    ],
    practice:["41 giờ thực hành trên sân tập","24 giờ thực hành trên đường","2 giờ học cabin ô tô","Bài tập sa hình liên hoàn","Lái đường dốc, đường vòng, đường phức tạp","Lái ban đêm và đường cao tốc","Kỹ năng chuyển làn, quay đầu, dừng đỗ","Ôn luyện nội dung sát hạch"]
  },
  "B số sàn":{
    short:"Ô tô hạng B · Số sàn",
    title:"Chương trình B số sàn",
    description:"Đào tạo đầy đủ kỹ năng phối hợp côn, ga, phanh và chuyển số; thời gian dự kiến 2,5–3 tháng, tùy kế hoạch khóa và tiến độ hoàn thành.",
    metrics:[
      ["235 giờ","Tổng thời gian tối thiểu"],
      ["152 giờ","Đào tạo lý thuyết"],
      ["83 giờ","Đào tạo thực hành"],
      ["1.100 km","Quãng đường thực hành"]
    ],
    modules:[
      ["⚖️","Pháp luật giao thông · 90 giờ","Quy tắc giao thông, báo hiệu đường bộ, xử lý tình huống và trách nhiệm người lái xe."],
      ["🔧","Cấu tạo ô tô · 18 giờ","Động cơ, hệ thống truyền lực, phanh, lái, điện và bảo dưỡng thông thường."],
      ["🤝","Văn hóa và an toàn · 20 giờ","Đạo đức, văn hóa giao thông, phòng chống rượu bia, phòng cháy chữa cháy và cứu hộ."],
      ["🛡️","Kỹ thuật và xử lý tình huống · 24 giờ","Kỹ thuật sử dụng xe số sàn, lái an toàn chủ động và xử lý tình huống giao thông."]
    ],
    practice:["41 giờ thực hành trên sân tập","40 giờ thực hành trên đường","2 giờ học cabin ô tô","Phối hợp côn, ga, phanh và chuyển số","Khởi hành ngang dốc và ghép xe","Lái đường phức tạp, ban đêm, cao tốc","Thực hành với xe số tự động theo chương trình","Ôn luyện nội dung sát hạch"]
  },
  "C1":{
    short:"Ô tô tải hạng C1",
    title:"Chương trình đào tạo hạng C1",
    description:"Chú trọng kỹ năng điều khiển xe tải, quan sát điểm mù và thực hành trên sân, cabin, đường giao thông; thời gian dự kiến 3,5–4 tháng.",
    metrics:[
      ["245 giờ","Tổng thời gian tối thiểu"],
      ["152 giờ","Đào tạo lý thuyết"],
      ["93 giờ","Đào tạo thực hành"],
      ["1.100 km","Quãng đường thực hành"]
    ],
    modules:[
      ["⚖️","Pháp luật giao thông · 90 giờ","Quy tắc, báo hiệu, trách nhiệm người lái xe và kiến thức liên quan đến vận tải, xếp hàng hóa."],
      ["🔧","Cấu tạo ô tô · 18 giờ","Cấu tạo xe tải, hệ thống truyền động, phanh, lái, kiểm tra và bảo dưỡng thông thường."],
      ["🤝","Văn hóa và an toàn · 20 giờ","Đạo đức nghề nghiệp, rượu bia, phòng cháy chữa cháy, cứu nạn và an toàn hàng hóa."],
      ["🛡️","Kỹ thuật và xử lý tình huống · 24 giờ","Kỹ thuật điều khiển xe tải, lái xe chở hàng và xử lý tình huống giao thông."]
    ],
    practice:["43 giờ thực hành trên sân tập","48 giờ thực hành trên đường","2 giờ học cabin ô tô","Kỹ thuật lái xe có tải","Quan sát điểm mù và căn chỉnh thân xe","Lái đường dốc, vòng quanh co, đường phức tạp","Lái ban đêm, cao tốc và xử lý tình huống","Ôn luyện nội dung sát hạch"]
  }
};

function programTemplate(key,program){
  return `
    <div class="training-overview">
      <div class="training-overview-head">
        <div><small>HẠNG ĐÀO TẠO ĐANG XEM</small><h3>${program.title}</h3></div>
        <span class="training-overview-badge">${key==='B số tự động'?'B AT':key==='B số sàn'?'B MT':key}</span>
      </div>
      <p>${program.description}</p>
      <div class="training-metrics">
        ${program.metrics.map(([value,label])=>`<div class="training-metric"><strong>${value}</strong><span>${label}</span></div>`).join("")}
      </div>
      <div class="training-overview-note">Thời lượng thể hiện theo chương trình đào tạo tối thiểu. Kế hoạch học thực tế được cơ sở đào tạo sắp xếp theo khóa học và quy định hiện hành.</div>
    </div>
    <div class="training-content">
      <div class="training-content-head">
        <div><small>NỘI DUNG CHÍNH</small><h3>Học những gì trong khóa?</h3></div>
        <button type="button" data-training-register>Đăng ký hạng ${key}</button>
      </div>
      <div class="training-modules">
        ${program.modules.map(([icon,title,text])=>`<article class="training-module"><span>${icon}</span><div><strong>${title}</strong><p>${text}</p></div></article>`).join("")}
      </div>
      <div class="training-practice"><strong>Nội dung thực hành nổi bật</strong><ul>${program.practice.map(item=>`<li>${item}</li>`).join("")}</ul></div>
    </div>`;
}

function mountTrainingDetails(){
  if(document.querySelector(".training-detail-section"))return;
  const anchor=document.querySelector(".license-info-section")||document.querySelector(".course-section");
  if(!anchor)return;

  const section=document.createElement("section");
  section.className="training-detail-section";
  section.id="noi-dung-dao-tao";
  section.innerHTML=`
    <div class="training-detail-shell">
      <div class="training-detail-intro">
        <p>CHƯƠNG TRÌNH ĐÀO TẠO TỪNG HẠNG</p>
        <h2>Nội dung học được trình bày rõ ràng trước khi đăng ký</h2>
        <span>Chọn từng hạng để xem thời lượng, các môn lý thuyết và nội dung thực hành chính.</span>
      </div>
      <div class="training-detail-tabs" role="tablist" aria-label="Nội dung đào tạo theo hạng">
        ${Object.entries(trainingPrograms).map(([key,program],index)=>`<button type="button" class="training-detail-tab${index===0?' active':''}" data-training-tab="${key}" role="tab" aria-selected="${index===0?'true':'false'}">${key}<small>${program.short}</small></button>`).join("")}
      </div>
      <div class="training-detail-panel" role="tabpanel"></div>
      <p class="training-detail-footnote">Nội dung trên được tóm tắt từ chương trình khung đào tạo lái xe hiện hành. Thời khóa biểu, thứ tự môn học và lịch thực hành cụ thể có thể được điều chỉnh theo kế hoạch từng khóa.</p>
    </div>`;
  anchor.insertAdjacentElement("afterend",section);

  const panel=section.querySelector(".training-detail-panel");
  const tabs=[...section.querySelectorAll("[data-training-tab]")];

  const showProgram=key=>{
    const program=trainingPrograms[key]||trainingPrograms["B số tự động"];
    tabs.forEach(tab=>{
      const active=tab.dataset.trainingTab===key;
      tab.classList.toggle("active",active);
      tab.setAttribute("aria-selected",String(active));
    });
    panel.innerHTML=programTemplate(key,program);
    panel.querySelector("[data-training-register]")?.addEventListener("click",()=>{
      const matchingCard=[...document.querySelectorAll("[data-license-card]")].find(card=>card.dataset.licenseCard===key);
      matchingCard?.click();
      document.getElementById("registrationForm")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
  };

  tabs.forEach(tab=>tab.addEventListener("click",()=>{
    const key=tab.dataset.trainingTab;
    showProgram(key);
    const matchingCard=[...document.querySelectorAll("[data-license-card]")].find(card=>card.dataset.licenseCard===key);
    matchingCard?.click();
  }));

  document.querySelectorAll("[data-license-card]").forEach(card=>card.addEventListener("click",()=>showProgram(card.dataset.licenseCard)));
  showProgram("B số tự động");
}

mountTrainingDetails();
