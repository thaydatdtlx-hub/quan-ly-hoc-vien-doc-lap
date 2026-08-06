import "./new-student-practice-link.css";

const MODES={
  auto:{
    label:"B số tự động",
    short:"B AT",
    note:"Tập trung kiểm soát chân phanh, chọn đúng vị trí cần số và quan sát liên tục.",
    duration:"11 bài · thời gian sát hạch theo hệ thống",
    tips:["Giữ chân phanh khi chuyển P/R/N/D.","Không chuyển về P khi xe còn di chuyển.","Dùng phanh để kiểm soát tốc độ thật chậm trong bài hẹp."]
  },
  manual:{
    label:"B số sàn",
    short:"B MT",
    note:"Tập trung phối hợp côn, ga, phanh và chọn số phù hợp ở từng bài.",
    duration:"11 bài · thời gian sát hạch theo hệ thống",
    tips:["Nhả côn từ từ và giữ vòng tua ổn định.","Không rà côn kéo dài khi không cần thiết.","Chọn số phù hợp trước khi vào bài và hạn chế đổi số đột ngột."]
  },
  c1:{
    label:"Hạng C1",
    short:"C1",
    note:"Tập trung quan sát góc khuất xe tải, lấy lái rộng và kiểm soát tốc độ thấp.",
    duration:"10 bài · thời gian sát hạch theo hệ thống",
    tips:["Quan sát đồng thời gương chính và gương phụ.","Lấy lái rộng hơn xe con khi vào cua.","Giữ khoảng trống an toàn cho đuôi xe khi chuyển hướng."]
  }
};

const BASE_LESSONS=[
  {
    id:"start",icon:"🚦",title:"Xuất phát",summary:"Chuẩn bị tư thế, thiết bị an toàn và đưa xe qua vạch xuất phát đúng hiệu lệnh.",
    steps:["Chỉnh ghế, vô lăng và gương để quan sát rõ hai bên xe.","Thắt dây an toàn, kiểm tra cần số và phanh đỗ.","Chờ hiệu lệnh, bật xi nhan trái, quan sát rồi cho xe di chuyển êm.","Ổn định hướng xe và tắt xi nhan sau khi rời khu vực xuất phát."],
    remember:["Không vội di chuyển trước hiệu lệnh.","Quan sát gương trước khi cho xe lăn bánh.","Giữ xe đi thẳng, tốc độ thấp và ổn định."],
    errors:["Quên dây an toàn hoặc xi nhan.","Để xe tắt máy hay giật mạnh.","Xuất phát chậm hoặc sai hướng."]
  },
  {
    id:"pedestrian",icon:"🚶",title:"Dừng xe nhường đường cho người đi bộ",summary:"Giảm tốc sớm, dừng đúng khu vực và tiếp tục di chuyển sau khi hoàn thành bài.",
    steps:["Quan sát biển báo và giảm tốc từ xa.","Canh vị trí đầu xe với vạch dừng bằng góc nhìn đã được giáo viên hướng dẫn.","Dừng hẳn, giữ xe ổn định và chờ tín hiệu hoàn thành.","Quan sát phía trước rồi cho xe đi tiếp nhẹ nhàng."],
    remember:["Dừng dứt khoát nhưng êm.","Không để bánh xe vượt vạch.","Không tăng ga đột ngột khi rời bài."],
    errors:["Dừng quá xa hoặc quá vạch.","Xe trôi khi đang dừng.","Không giảm tốc trước khu vực bài thi."]
  },
  {
    id:"slope",icon:"⛰️",title:"Dừng và khởi hành ngang dốc",summary:"Dừng đúng vị trí trên dốc, giữ xe không trôi và khởi hành ổn định.",
    steps:["Tiếp cận dốc bằng tốc độ thấp, giữ xe thẳng.","Dừng đúng vùng quy định và giữ xe đứng yên.","Chuẩn bị lực kéo phù hợp trước khi nhả phanh.","Cho xe lên dốc liên tục, không tăng ga quá mạnh."],
    remember:["Giữ khoảng cách an toàn với vạch dừng.","Phối hợp chân điều khiển từ tốn.","Nhìn hướng đi, không chỉ nhìn đầu xe."],
    errors:["Xe tụt dốc.","Dừng sai vị trí.","Khởi hành gấp, tắt máy hoặc tăng ga quá mạnh."]
  },
  {
    id:"wheel-track",icon:"🛞",title:"Qua vệt bánh xe và đường vòng vuông góc",summary:"Đưa bánh xe qua đúng vùng giới hạn và xử lý hai góc cua hẹp bằng tốc độ rất chậm.",
    steps:["Căn hướng xe trước khi vào vệt bánh xe.","Giữ tốc độ chậm và quan sát điểm chuẩn qua gương.","Sau khi qua vệt bánh xe, chuẩn bị vị trí lấy lái cho góc vuông thứ nhất.","Trả lái đúng lúc, tiếp tục căn góc vuông thứ hai rồi ra khỏi bài."],
    remember:["Vào bài đúng hướng quan trọng hơn sửa lái nhiều lần.","Quan sát bánh sau qua gương.","Đánh lái dứt khoát nhưng trả lái đúng thời điểm."],
    errors:["Bánh xe chạm hoặc đè vạch.","Lấy lái quá sớm hay quá muộn.","Đi quá nhanh nên không kịp sửa hướng."]
  },
  {
    id:"traffic-light",icon:"🚥",title:"Qua ngã tư có tín hiệu giao thông",summary:"Quan sát đèn, dừng đúng vạch và chỉ di chuyển khi tín hiệu cho phép.",
    steps:["Giảm tốc khi đến gần ngã tư và xác định trạng thái đèn.","Nếu phải dừng, dừng trước vạch và giữ xe ổn định.","Quan sát thời gian tín hiệu, chỉ khởi hành khi đủ an toàn.","Đi thẳng theo làn và thoát khỏi giao lộ dứt khoát."],
    remember:["Không cố vượt khi tín hiệu sắp chuyển.","Giữ khoảng cách với vạch dừng.","Quan sát cả tín hiệu lẫn hướng xe."],
    errors:["Vượt đèn hoặc dừng quá vạch.","Khởi hành khi chưa đủ an toàn.","Đi sai làn qua giao lộ."]
  },
  {
    id:"winding",icon:"〰️",title:"Qua đường vòng quanh co",summary:"Đi đúng quỹ đạo qua các đoạn cong liên tiếp mà không chạm vạch giới hạn.",
    steps:["Giảm tốc trước khi vào bài.","Quan sát hướng cong đầu tiên và chọn điểm lấy lái phù hợp.","Trả lái sớm để chuẩn bị cho hướng cong tiếp theo.","Giữ nhịp lái đều đến khi toàn bộ xe ra khỏi bài."],
    remember:["Nhìn xa theo hướng cua, không nhìn sát đầu xe.","Tốc độ càng ổn định càng dễ giữ quỹ đạo.","Chú ý bánh sau khi chuyển hướng."],
    errors:["Cắt cua làm bánh sau chạm vạch.","Trả lái chậm.","Tăng tốc trong đoạn cua hẹp."]
  },
  {
    id:"parallel",icon:"🅿️",title:"Ghép xe dọc vào nơi đỗ",summary:"Đưa toàn bộ thân xe vào ô đỗ dọc, nhận tín hiệu hoàn thành rồi đưa xe ra an toàn.",
    steps:["Đưa xe song song với khu vực đỗ và giữ khoảng cách đều.","Chọn điểm dừng chuẩn bị, đánh lái để tạo góc lùi.","Quan sát hai gương, lùi chậm và điều chỉnh để thân xe song song ô đỗ.","Lùi đủ vị trí, chờ tín hiệu rồi cho xe ra khỏi ô theo đúng hướng."],
    remember:["Ưu tiên quan sát gương và tốc độ thật chậm.","Mỗi lần chỉnh lái phải biết bánh xe đang hướng về đâu.","Chỉ ra khỏi bài sau khi đã nhận tín hiệu hoàn thành."],
    errors:["Thân xe chưa nằm hoàn toàn trong ô.","Bánh xe chạm vạch giới hạn.","Ra khỏi ô khi chưa nhận bài."]
  },
  {
    id:"perpendicular",icon:"↔️",title:"Ghép xe ngang vào nơi đỗ",summary:"Lùi xe vào ô ngang bằng các điểm chuẩn, giữ thân xe nằm trọn trong khu vực đỗ.",
    steps:["Chạy song song với ô đỗ và chọn vị trí bắt đầu phù hợp.","Tạo góc lùi, quan sát gương phía ô đỗ.","Lùi chậm, trả lái và chỉnh thân xe song song với vạch.","Nhận tín hiệu hoàn thành rồi đưa xe ra khỏi ô an toàn."],
    remember:["Quan sát luân phiên hai gương.","Không đánh lái liên tục khi chưa xác định vị trí xe.","Chừa khoảng trống cho đầu và đuôi xe."],
    errors:["Đuôi xe vào quá sâu hoặc chưa đủ sâu.","Thân xe chéo trong ô.","Bánh xe chạm vạch khi vào hoặc ra."]
  },
  {
    id:"railway",icon:"🚆",title:"Tạm dừng ở chỗ có đường sắt chạy qua",summary:"Giảm tốc, dừng đúng khu vực trước đường sắt và tiếp tục khi bảo đảm an toàn.",
    steps:["Quan sát biển báo và giảm tốc sớm.","Căn xe dừng trước vạch theo điểm chuẩn đã luyện.","Giữ xe đứng yên, kiểm tra hai phía đường sắt.","Khi được phép, cho xe đi qua đều và không dừng trên đường ray."],
    remember:["Không dừng trên khu vực đường ray.","Giữ xe thẳng và ổn định.","Quan sát hai phía trước khi đi tiếp."],
    errors:["Dừng quá vạch hoặc quá xa.","Xe trôi khi dừng.","Tăng tốc đột ngột khi qua đường ray."]
  },
  {
    id:"gear-change",icon:"⚙️",title:"Thay đổi số trên đường bằng",summary:"Điều chỉnh số và tốc độ đúng yêu cầu của bài, sau đó giảm về trạng thái phù hợp.",
    steps:["Đi vào đoạn đường bằng với xe thẳng và tốc độ ổn định.","Khi có hiệu lệnh, thực hiện tăng số hoặc tăng tốc theo loại xe.","Duy trì hướng xe, không nhìn xuống cần số quá lâu.","Giảm tốc và đưa xe về trạng thái phù hợp trước khi ra khỏi bài."],
    remember:["Quan sát đường là ưu tiên chính.","Thao tác số dứt khoát, không vội.","Giữ xe trong làn và kiểm soát tốc độ."],
    errors:["Không thực hiện đúng hiệu lệnh.","Mất hướng xe khi thao tác số.","Tăng hoặc giảm tốc quá đột ngột."]
  },
  {
    id:"finish",icon:"🏁",title:"Kết thúc",summary:"Bật tín hiệu, đưa xe qua vạch kết thúc và hoàn thành bài thi đúng quy trình.",
    steps:["Quan sát biển báo khu vực kết thúc.","Bật xi nhan phải trước khi đưa xe qua vạch.","Giữ xe đi đúng hướng và qua vạch dứt khoát.","Dừng xe tại vị trí hướng dẫn, về số an toàn và kéo phanh đỗ."],
    remember:["Không quên xi nhan phải.","Chỉ dừng sau khi xe đã qua khu vực kết thúc.","Thực hiện đầy đủ thao tác an toàn trước khi rời xe."],
    errors:["Quên hoặc bật xi nhan quá muộn.","Dừng trước vạch kết thúc.","Rời xe khi chưa đưa cần số và phanh đỗ về trạng thái an toàn."]
  }
];

function lessonsFor(mode){
  if(mode!=="c1")return BASE_LESSONS;
  return BASE_LESSONS.filter(lesson=>lesson.id!=="perpendicular");
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function list(items){
  return items.map(item=>`<li>${escapeHtml(item)}</li>`).join("");
}

function createSection(){
  if(document.getElementById("thuc-hanh-trong-hinh"))return null;
  const courseSection=document.getElementById("hang-bang");
  if(!courseSection)return null;

  const section=document.createElement("section");
  section.id="thuc-hanh-trong-hinh";
  section.className="practice-learning-section";
  section.innerHTML=`
    <div class="practice-learning-shell">
      <div class="practice-learning-heading">
        <div><p>GÓC ÔN TẬP SÁT HẠCH Ô TÔ</p><h2>Hướng dẫn thực hành trong hình</h2><span>Chọn hạng xe, xem trình tự bài thi và mở hướng dẫn từng bài ngay trên website học lái xe cùng Đạt.</span></div>
        <a href="#dang-ky">Đăng ký khóa học →</a>
      </div>
      <div class="practice-mode-tabs" role="tablist" aria-label="Chọn hạng xe ôn tập">
        ${Object.entries(MODES).map(([key,mode],index)=>`<button type="button" role="tab" data-practice-mode="${key}" aria-selected="${index===0}" class="${index===0?'active':''}"><b>${mode.short}</b><span>${mode.label}</span></button>`).join("")}
      </div>
      <div class="practice-overview">
        <div><small id="practiceModeShort">B AT</small><h3 id="practiceModeTitle">B số tự động</h3><p id="practiceModeNote"></p></div>
        <div class="practice-overview-meta"><span id="practiceModeDuration"></span><strong id="practiceLessonCount"></strong></div>
      </div>
      <div class="practice-alert"><b>!</b><span><strong>Lưu ý khi ôn tập:</strong> thứ tự các bài ở giữa có thể được bố trí khác nhau tùy sân sát hạch. Học viên phải tuân theo biển báo, hiệu lệnh và hướng dẫn trực tiếp tại sân.</span></div>
      <div id="practiceLessonGrid" class="practice-lesson-grid" aria-live="polite"></div>
      <article id="practiceLessonDetail" class="practice-lesson-detail" tabindex="-1" aria-live="polite"></article>
      <div class="practice-mode-tip"><div><span>🎯</span><strong>Mẹo riêng theo loại xe</strong></div><ul id="practiceModeTips"></ul></div>
      <p class="practice-disclaimer">Nội dung là tài liệu ôn tập hỗ trợ, không thay thế buổi hướng dẫn thực hành với giáo viên và quy định tại sân sát hạch.</p>
    </div>`;
  courseSection.insertAdjacentElement("afterend",section);
  return section;
}

function initPracticeSection(){
  const section=createSection()||document.getElementById("thuc-hanh-trong-hinh");
  if(!section||section.dataset.ready)return;
  section.dataset.ready="true";

  let activeMode="auto";
  let activeLesson=0;
  const grid=section.querySelector("#practiceLessonGrid");
  const detail=section.querySelector("#practiceLessonDetail");

  function renderDetail(){
    const lessons=lessonsFor(activeMode);
    const lesson=lessons[activeLesson]||lessons[0];
    detail.innerHTML=`
      <div class="practice-detail-head"><span>${lesson.icon}</span><div><small>BÀI ${activeLesson+1}</small><h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.summary)}</p></div></div>
      <div class="practice-detail-columns">
        <section><h4>Các bước luyện tập</h4><ol>${list(lesson.steps)}</ol></section>
        <section><h4>Điểm cần nhớ</h4><ul class="practice-good-list">${list(lesson.remember)}</ul></section>
        <section><h4>Lỗi thường gặp</h4><ul class="practice-error-list">${list(lesson.errors)}</ul></section>
      </div>`;
  }

  function render(){
    const mode=MODES[activeMode];
    const lessons=lessonsFor(activeMode);
    if(activeLesson>=lessons.length)activeLesson=0;
    section.querySelector("#practiceModeShort").textContent=mode.short;
    section.querySelector("#practiceModeTitle").textContent=mode.label;
    section.querySelector("#practiceModeNote").textContent=mode.note;
    section.querySelector("#practiceModeDuration").textContent=mode.duration;
    section.querySelector("#practiceLessonCount").textContent=`${lessons.length} bài thực hành`;
    section.querySelector("#practiceModeTips").innerHTML=list(mode.tips);
    section.querySelectorAll("[data-practice-mode]").forEach(button=>{
      const selected=button.dataset.practiceMode===activeMode;
      button.classList.toggle("active",selected);
      button.setAttribute("aria-selected",String(selected));
    });
    grid.innerHTML=lessons.map((lesson,index)=>`<button type="button" class="practice-lesson-card${index===activeLesson?' active':''}" data-practice-lesson="${index}" aria-pressed="${index===activeLesson}"><span>${lesson.icon}</span><div><small>Bài ${index+1}</small><strong>${escapeHtml(lesson.title)}</strong><p>${escapeHtml(lesson.summary)}</p></div><b aria-hidden="true">›</b></button>`).join("");
    renderDetail();
  }

  section.addEventListener("click",event=>{
    const modeButton=event.target.closest("[data-practice-mode]");
    if(modeButton){
      activeMode=modeButton.dataset.practiceMode;
      activeLesson=0;
      render();
      return;
    }
    const lessonButton=event.target.closest("[data-practice-lesson]");
    if(lessonButton){
      activeLesson=Number(lessonButton.dataset.practiceLesson)||0;
      render();
      detail.scrollIntoView({behavior:"smooth",block:"center"});
      detail.focus({preventScroll:true});
    }
  });

  render();

  const heroActions=document.querySelector(".hero-actions");
  if(heroActions&&!heroActions.querySelector(".practice-reference-hero-link")){
    const link=document.createElement("a");
    link.className="btn btn-outline practice-reference-hero-link";
    link.href="#thuc-hanh-trong-hinh";
    link.textContent="Ôn thực hành trong hình";
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
  link.href="/dang-ky-hoc-lai-xe.html#thuc-hanh-trong-hinh";
  link.target="_blank";
  link.rel="noopener";
  link.textContent="Mở góc ôn tập trong hình ↗";
  toolbar.append(link);
}

function boot(){
  initPracticeSection();
  addAdminRegistrationLink();
  new MutationObserver(addAdminRegistrationLink).observe(document.body,{subtree:true,childList:true});
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
