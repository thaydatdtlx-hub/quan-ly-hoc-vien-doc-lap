import "./public-site-enhancements.css";

const $=id=>document.getElementById(id);
const VIDEO_URL="https://youtu.be/1Wwi5xkxd3k";
const ZALO_URL="https://zalo.me/0984811037";
const PHONE="0984811037";

function mountMobileMenu(){
  const header=document.querySelector(".site-header"),nav=header?.querySelector("nav");
  if(!header||!nav||document.querySelector(".site-mobile-menu-button"))return;
  const button=document.createElement("button");
  button.className="site-mobile-menu-button";button.type="button";button.setAttribute("aria-label","Mở menu");button.setAttribute("aria-controls","siteMobileDrawer");button.setAttribute("aria-expanded","false");button.textContent="☰";
  header.append(button);
  const drawer=document.createElement("div");
  drawer.id="siteMobileDrawer";drawer.className="site-mobile-drawer";drawer.setAttribute("aria-hidden","true");
  drawer.innerHTML=`<button class="site-mobile-drawer__backdrop" type="button" aria-label="Đóng menu"></button><aside class="site-mobile-drawer__panel"><div class="site-mobile-drawer__head"><div class="site-mobile-drawer__brand"><img src="/logo-thay-dat-compact.webp?v=15" alt=""><span><strong>THẦY ĐẠT</strong><small>Đào tạo lái xe trọn gói</small></span></div><button class="site-mobile-drawer__close" type="button" aria-label="Đóng menu">×</button></div><nav>${[...nav.querySelectorAll("a")].map(a=>`<a href="${a.getAttribute("href")}">${a.textContent}</a>`).join("")}<a href="#noi-dung-dao-tao">Nội dung đào tạo</a><a href="#thu-tuc-dang-ky">Thủ tục đăng ký</a><a href="#video-dao-tao">Video đào tạo</a></nav><div class="site-mobile-drawer__actions"><a href="tel:${PHONE}">Gọi tư vấn</a><a href="${ZALO_URL}" target="_blank" rel="noopener noreferrer">Nhắn Zalo</a></div></aside>`;
  document.body.append(drawer);
  const close=()=>{drawer.classList.remove("open");drawer.setAttribute("aria-hidden","true");document.body.classList.remove("site-menu-open");button.setAttribute("aria-expanded","false")};
  button.onclick=()=>{drawer.classList.add("open");drawer.setAttribute("aria-hidden","false");document.body.classList.add("site-menu-open");button.setAttribute("aria-expanded","true");drawer.querySelector(".site-mobile-drawer__close")?.focus()};
  drawer.querySelectorAll("button,a").forEach(el=>el.addEventListener("click",close));
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&drawer.classList.contains("open")){close();button.focus()}});
}

function section(className,id,html){const node=document.createElement("section");node.className=`site-upgrade-section ${className}`;node.id=id;node.innerHTML=`<div class="site-upgrade-shell">${html}</div>`;return node}
function heading(kicker,title,text){return `<div class="site-upgrade-heading"><p>${kicker}</p><h2>${title}</h2><span>${text}</span></div>`}
function goRegister(license=""){if(license){document.querySelector(`[data-license-card="${CSS.escape(license)}"]`)?.click()}$("registrationForm")?.scrollIntoView({behavior:"smooth",block:"start"})}

function mountPricing(){
  if($("hoc-phi-tu-van"))return;
  const anchor=document.querySelector(".training-detail-section")||document.querySelector(".license-info-section");if(!anchor)return;
  const node=section("site-pricing","hoc-phi-tu-van",`${heading("HỌC PHÍ & PHƯƠNG THỨC ĐÓNG","Nhận báo giá đúng theo hạng và nhu cầu học","Học phí chính thức được tư vấn theo khóa học, lịch học và hồ sơ thực tế. Website không tự công bố một mức giá chưa được xác nhận.")}<div class="site-pricing-grid">${[["A1","A1"],["A","A"],["B AT","B số tự động"],["B MT","B số sàn"],["C1","C1"]].map(([badge,name],i)=>`<article class="site-price-card${i===2?' featured':''}"><span>${badge}</span><h3>${name}</h3><div class="price">Nhận báo giá<small>Tư vấn trực tiếp, không phát sinh thông tin mơ hồ</small></div><ul><li>Kiểm tra điều kiện đăng ký</li><li>Tư vấn các khoản đã bao gồm</li><li>Thông tin khoản phí nộp riêng nếu có</li><li>Hướng dẫn phương thức và tiến độ đóng</li></ul><button type="button" data-price-license="${name}">Nhận báo giá hạng ${name}</button></article>`).join("")}</div><div class="site-pricing-details"><article><strong>Thông tin minh bạch</strong><p>Báo giá cần thể hiện rõ khoản đào tạo, hồ sơ, thực hành và các khoản nộp riêng theo từng trường hợp.</p></article><article><strong>Đóng theo lộ trình</strong><p>Phương án đóng học phí sẽ được xác nhận trực tiếp trong quá trình tư vấn, phù hợp với quy định của khóa.</p></article><article><strong>Có xác nhận</strong><p>Mỗi khoản thu trong hệ thống học viên có thể được theo dõi và đối chiếu với tiến độ đóng học phí.</p></article></div><p class="site-pricing-note">Không hiển thị giá giả định để tránh gây hiểu nhầm. Học viên nhận báo giá chính xác qua Zalo hoặc điện thoại.</p>`);
  anchor.insertAdjacentElement("afterend",node);node.querySelectorAll("[data-price-license]").forEach(b=>b.onclick=()=>goRegister(b.dataset.priceLicense));
}

function mountLocation(){
  if($("dia-diem-lien-he"))return;const anchor=document.querySelector(".registration-procedure-section")||document.querySelector(".condition-section");if(!anchor)return;
  const node=section("site-location","dia-diem-lien-he",`<div class="site-location-grid"><div class="site-location-info"><p>ĐỊA ĐIỂM & GIỜ LÀM VIỆC</p><h2>Liên hệ trước để được hướng dẫn đúng địa điểm</h2><span>Địa chỉ tiếp nhận hồ sơ, sân tập và lớp học có thể khác nhau theo khóa. Học viên nên xác nhận trước khi di chuyển.</span><div class="site-location-list"><div><b>📍</b><span><strong>Văn phòng tiếp nhận hồ sơ</strong><small>Liên hệ Zalo hoặc hotline để nhận địa chỉ đang áp dụng.</small></span></div><div><b>🚘</b><span><strong>Sân tập và địa điểm thực hành</strong><small>Được bố trí theo hạng bằng, nội dung và lịch học.</small></span></div><div><b>🕘</b><span><strong>Giờ hỗ trợ</strong><small>Tiếp nhận tư vấn qua điện thoại và Zalo; lịch làm việc trực tiếp cần xác nhận trước.</small></span></div></div><a href="${ZALO_URL}" target="_blank" rel="noopener noreferrer">Nhận địa chỉ qua Zalo</a></div><div class="site-location-map"><div><span>🗺️</span><h3>Chỉ đường chính xác trước buổi hẹn</h3><p>Do website chưa có địa chỉ chính thức được xác nhận, hệ thống không tự gắn một vị trí bản đồ có thể gây nhầm lẫn. Sau khi liên hệ, học viên sẽ nhận địa chỉ và hướng dẫn di chuyển phù hợp.</p><a href="tel:${PHONE}">Gọi xác nhận địa điểm</a></div></div>`);
  anchor.insertAdjacentElement("afterend",node);
}

function mountTrainer(){
  if($("giang-vien-co-so"))return;const anchor=document.querySelector(".intro-section");if(!anchor)return;
  const node=section("site-trainer","giang-vien-co-so",`<div class="site-trainer-grid"><div class="site-trainer-media"><img src="/hero-vip-navy-champagne.webp?v=1" alt="Hướng dẫn học lái xe cùng Thầy Đạt"><div><strong>Thầy Đạt · Hướng dẫn đào tạo lái xe</strong><small>Đồng hành từ hồ sơ, lý thuyết đến thực hành và các mốc đào tạo.</small></div></div><div class="site-trainer-copy"><p>NGƯỜI HƯỚNG DẪN & CƠ SỞ HỌC TẬP</p><h2>Học viên được hỗ trợ xuyên suốt trên một hệ thống</h2><span>Website tập trung vào trải nghiệm rõ ràng: biết cần chuẩn bị gì, học nội dung nào, theo dõi tiến độ ra sao và liên hệ ai khi cần hỗ trợ.</span><div class="site-facility-grid"><article><b>🚗</b><strong>Xe thực hành</strong><small>Lựa chọn số tự động hoặc số sàn theo chương trình đăng ký.</small></article><article><b>🛣️</b><strong>Sân tập</strong><small>Thực hành bài hình và kỹ năng theo từng giai đoạn.</small></article><article><b>🖥️</b><strong>Học lý thuyết online</strong><small>Ôn 600 câu, thi thử và lưu tiến độ cá nhân.</small></article><article><b>📱</b><strong>Quản lý trên điện thoại</strong><small>Xem lịch, thông báo và các mốc đào tạo tập trung.</small></article></div></div></div>`);
  anchor.insertAdjacentElement("afterend",node);
}

function mountProof(){
  if($("minh-chung-hoc-vien"))return;const anchor=document.querySelector(".gallery-section");if(!anchor)return;
  const node=section("site-proof","minh-chung-hoc-vien",`${heading("MINH CHỨNG & KÊNH CHÍNH THỨC","Theo dõi hoạt động đào tạo thực tế","Website không tự tạo đánh giá học viên. Các nội dung công khai được dẫn đến kênh chính thức để người học tự kiểm chứng.")}<div class="site-proof-grid"><article class="site-proof-card"><span>▶️</span><strong>Video đào tạo</strong><p>Xem nội dung hướng dẫn thực tế và cách triển khai buổi học.</p><a href="${VIDEO_URL}" target="_blank" rel="noopener noreferrer">Xem trên YouTube</a></article><article class="site-proof-card"><span>♪</span><strong>TikTok Thầy Đạt</strong><p>Theo dõi video ngắn, hoạt động học viên và nội dung chia sẻ kỹ năng.</p><a href="https://www.tiktok.com/@datdidaydo99?is_from_webapp=1&sender_device=pc" target="_blank" rel="noopener noreferrer">Mở TikTok</a></article><article class="site-proof-card"><span>f</span><strong>Facebook chính thức</strong><p>Liên hệ, xem bài đăng và cập nhật hoạt động đào tạo.</p><a href="https://www.facebook.com/profile.php?id=61579863779611" target="_blank" rel="noopener noreferrer">Mở Facebook</a></article></div><p class="site-proof-note">Đánh giá, tỷ lệ đậu và kết quả học viên chỉ nên công bố khi có dữ liệu xác thực và sự đồng ý phù hợp.</p>`);
  anchor.insertAdjacentElement("afterend",node);
}

function mountIntakes(){
  if($("lich-khai-giang"))return;const anchor=document.querySelector(".schedule-section");if(!anchor)return;
  const node=section("site-intakes","lich-khai-giang",`${heading("LỊCH TIẾP NHẬN HỒ SƠ","Đăng ký trước để được xếp khóa phù hợp","Ngày khai giảng và số chỗ còn lại cần được xác nhận theo từng hạng; website không hiển thị số lượng giả định.")}<div class="site-intakes-grid">${[["A1 · A","Mô tô","Tư vấn lịch tiếp nhận hồ sơ và kế hoạch ôn thi."],["B tự động · B số sàn","Ô tô hạng B","Tư vấn lựa chọn loại xe, lịch lý thuyết và thực hành."],["C1","Ô tô tải","Kiểm tra điều kiện hồ sơ và kế hoạch đào tạo hạng C1."]].map(([tag,title,text])=>`<article class="site-intake-card"><span>ĐANG NHẬN TƯ VẤN</span><h3>${tag}</h3><p>${text}</p><ul><li>Ngày bắt đầu: xác nhận khi tư vấn</li><li>Hạn hồ sơ: theo kế hoạch khóa</li><li>Số chỗ: cập nhật trực tiếp</li></ul><button type="button" data-intake-license="${title.includes('hạng B')?'B số tự động':title==='Mô tô'?'A1':'C1'}">Đăng ký giữ thông tin</button></article>`).join("")}</div>`);
  anchor.insertAdjacentElement("afterend",node);node.querySelectorAll("[data-intake-license]").forEach(b=>b.onclick=()=>goRegister(b.dataset.intakeLicense));
}

function enhancePrivacy(){
  const consent=$("consent")?.closest("label");if(!consent)return;const text=consent.querySelector("span");if(text&&!text.querySelector("a"))text.innerHTML='Tôi đồng ý để Thầy Đạt liên hệ tư vấn và xác nhận đã đọc <a class="site-privacy-link" href="/chinh-sach-bao-mat.html" target="_blank" rel="noopener noreferrer">Chính sách bảo mật dữ liệu cá nhân</a>.';
}

function captureSource(){
  const params=new URLSearchParams(location.search);const source=params.get("utm_source")||params.get("source")||document.referrer||"Truy cập trực tiếp";sessionStorage.setItem("new_student_source",source.slice(0,180));
}

function mountLookup(){
  if($("tra-cuu-dang-ky"))return;const anchor=document.querySelector(".faq-section")||document.querySelector(".registration-section");if(!anchor)return;
  const node=section("site-status-lookup","tra-cuu-dang-ky",`${heading("TRA CỨU ĐĂNG KÝ","Giữ lại mã đăng ký để được hỗ trợ nhanh","Vì dữ liệu cá nhân không được mở công khai, trạng thái chi tiết chỉ được xác nhận qua kênh hỗ trợ.")}<div class="site-status-card"><div><h3>Tra cứu bằng mã đăng ký</h3><p>Nhập mã và số điện thoại. Hệ thống sẽ chuẩn bị nội dung liên hệ để Thầy Đạt kiểm tra đúng hồ sơ.</p></div><form class="site-status-form"><input name="code" placeholder="Ví dụ: DK-260804-ABC123" required><input name="phone" inputmode="tel" placeholder="Số điện thoại đăng ký" required><button type="submit">Tra cứu</button><div class="site-status-result" role="status"></div></form></div>`);
  anchor.insertAdjacentElement("beforebegin",node);const form=node.querySelector("form"),result=node.querySelector(".site-status-result");form.onsubmit=e=>{e.preventDefault();const data=new FormData(form),code=String(data.get("code")||"").trim(),phone=String(data.get("phone")||"").trim();if(!code||phone.replace(/\D/g,"").length<9){result.className="site-status-result error";result.textContent="Vui lòng nhập đúng mã đăng ký và số điện thoại.";return}const message=encodeURIComponent(`Nhờ kiểm tra trạng thái đăng ký ${code}, số điện thoại ${phone}.`);result.className="site-status-result success";result.innerHTML=`Để bảo vệ thông tin cá nhân, trạng thái được xác nhận trực tiếp. <a href="${ZALO_URL}?text=${message}" target="_blank" rel="noopener noreferrer"><strong>Nhắn Zalo kiểm tra hồ sơ →</strong></a>`};
}

function receiptText(code,license){return `PHIẾU XÁC NHẬN ĐĂNG KÝ HỌC LÁI XE\n\nMã đăng ký: ${code}\nHạng đăng ký: ${license}\nHotline: ${PHONE}\nZalo: ${ZALO_URL}\n\nHỒ SƠ CẦN CHUẨN BỊ\n- 01 CMND/CCCD photo, không cần công chứng; được hỗ trợ photo.\n- 12 hình 3x4 nền trắng; được chụp và rửa hình miễn phí khi đăng ký.\n- Bản photo tất cả bằng lái hiện có; được hỗ trợ photo.\n- Giấy khám sức khỏe theo hướng dẫn.\n\nVui lòng giữ mã đăng ký để được hỗ trợ nhanh.`}
function enhanceSuccess(){
  const success=$("registrationSuccess");if(!success||success.querySelector(".site-confirmation-tools"))return;const box=document.createElement("div");box.className="site-confirmation-tools";box.innerHTML=`<h4>Lưu thông tin đăng ký</h4><ul><li>Giữ mã đăng ký để tra cứu và làm việc với tư vấn viên.</li><li>Chuẩn bị CMND/CCCD, bằng lái hiện có và giấy khám sức khỏe.</li><li>Ảnh 3×4 được hỗ trợ chụp và rửa khi đăng ký.</li></ul><div class="site-confirmation-actions"><button type="button" data-receipt-download>Tải phiếu xác nhận</button><button type="button" data-receipt-copy>Sao chép thông tin</button><button type="button" data-receipt-share>Chia sẻ</button></div><p class="site-confirmation-note">Phiếu được tạo ngay trên thiết bị và không gửi dữ liệu sang dịch vụ khác.</p>`;success.append(box);const getText=()=>receiptText($("successCode")?.textContent||"Đã ghi nhận",$("successLicense")?.textContent||"");box.querySelector("[data-receipt-download]").onclick=()=>{const blob=new Blob([getText()],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`xac-nhan-${($("successCode")?.textContent||"dang-ky").replace(/[^a-z0-9-]/gi,"-")}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)};box.querySelector("[data-receipt-copy]").onclick=async()=>{await navigator.clipboard.writeText(getText());toast("Đã sao chép thông tin đăng ký")};box.querySelector("[data-receipt-share]").onclick=async()=>{if(navigator.share)await navigator.share({title:"Xác nhận đăng ký học lái xe",text:getText()});else{await navigator.clipboard.writeText(getText());toast("Thiết bị không hỗ trợ chia sẻ; đã sao chép nội dung")}};
}
function toast(text){let el=document.querySelector(".site-upgrade-toast");if(!el){el=document.createElement("div");el.className="site-upgrade-toast";document.body.append(el)}el.innerHTML=`<strong>${text}</strong><small>Thầy Đạt · Hệ thống tuyển sinh</small>`;el.classList.add("show");clearTimeout(el.timer);el.timer=setTimeout(()=>el.classList.remove("show"),2600)}

function boot(){mountMobileMenu();mountTrainer();mountPricing();mountLocation();mountProof();mountIntakes();enhancePrivacy();captureSource();mountLookup();enhanceSuccess()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
