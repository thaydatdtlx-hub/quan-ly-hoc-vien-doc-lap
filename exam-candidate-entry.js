function mountExamCandidateEntry(){
  if(location.pathname!=="/600-cau-hoi.html"||document.getElementById("examCandidateEntry"))return;
  const anchor=document.querySelector(".current-rule")||document.querySelector(".study-hero");
  if(!anchor)return;

  const section=document.createElement("section");
  section.id="examCandidateEntry";
  section.className="exam-candidate-entry";
  section.innerHTML=`
    <div class="exam-candidate-entry__badge">PHÒNG THI THỬ</div>
    <div class="exam-candidate-entry__copy">
      <small>TỰ LUYỆN SÁT HẠCH LÝ THUYẾT 600 CÂU</small>
      <h2>Vào phòng thi theo hồ sơ học viên</h2>
      <p>Học viên đã đăng nhập sẽ tự động lấy họ tên, hạng GPLX và <strong>số báo danh từ mã học viên</strong>. Ví dụ <b>HV-0001 → SBD 1</b>.</p>
      <div class="exam-candidate-entry__meta">
        <span>A1 · 15 đề + ngẫu nhiên</span>
        <span>A · 15 đề + ngẫu nhiên</span>
        <span>B · 32 đề + ngẫu nhiên</span>
        <span>C1 · 29 đề + ngẫu nhiên</span>
      </div>
    </div>
    <button class="exam-candidate-entry__button" type="button">Mở phòng thi <span>→</span></button>`;

  const style=document.createElement("style");
  style.id="examCandidateEntryStyle";
  style.textContent=`
    .exam-candidate-entry{display:grid;grid-template-columns:auto 1fr auto;gap:22px;align-items:center;margin:22px 0;padding:22px 24px;border:1px solid #c7dff4;border-radius:24px;background:linear-gradient(135deg,#f7fbff 0%,#edf7ff 55%,#effcf6 100%);box-shadow:0 14px 36px rgba(22,86,139,.09)}
    .exam-candidate-entry__badge{align-self:stretch;display:flex;align-items:center;justify-content:center;min-width:110px;padding:16px;border-radius:18px;background:linear-gradient(145deg,#075fce,#0c8edc);color:#fff;font-size:12px;font-weight:900;letter-spacing:.08em;text-align:center}
    .exam-candidate-entry__copy small{display:block;color:#0b6fca;font-size:10px;font-weight:900;letter-spacing:.13em}.exam-candidate-entry__copy h2{margin:5px 0 7px;color:#123e68;font-size:23px}.exam-candidate-entry__copy p{margin:0;color:#58728a;line-height:1.6}.exam-candidate-entry__copy p strong,.exam-candidate-entry__copy p b{color:#173e64}.exam-candidate-entry__meta{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.exam-candidate-entry__meta span{padding:6px 9px;border:1px solid #d3e6f5;border-radius:999px;background:#fff;color:#315d82;font-size:10px;font-weight:800}
    .exam-candidate-entry__button{min-height:54px;padding:0 20px;border:0;border-radius:16px;background:linear-gradient(135deg,#0b6bdc,#078ccf);color:#fff;font-weight:900;box-shadow:0 10px 22px rgba(11,107,220,.22);cursor:pointer;white-space:nowrap}.exam-candidate-entry__button span{margin-left:8px}.exam-candidate-entry__button:hover{transform:translateY(-1px)}
    @media(max-width:760px){.exam-candidate-entry{grid-template-columns:1fr;padding:18px;border-radius:20px}.exam-candidate-entry__badge{min-width:0;min-height:48px;padding:9px 12px}.exam-candidate-entry__copy h2{font-size:20px}.exam-candidate-entry__button{width:100%}}
  `;
  document.head.append(style);
  anchor.insertAdjacentElement("afterend",section);

  section.querySelector(".exam-candidate-entry__button")?.addEventListener("click",()=>{
    const examTrigger=document.querySelector('[data-start-mode="exam"]');
    examTrigger?.click();
  });
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountExamCandidateEntry,{once:true});
else mountExamCandidateEntry();
window.addEventListener("pageshow",mountExamCandidateEntry);
