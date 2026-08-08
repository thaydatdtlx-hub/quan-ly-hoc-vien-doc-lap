import "./tuition-details.css";

const tuitionAnchor=document.querySelector(".training-detail-section")||document.querySelector(".license-info-section");
const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const money=value=>new Intl.NumberFormat("vi-VN").format(Number(value)||0)+" VNĐ";

const basePlans=[
  {license:"A1",badge:"XE MÔ TÔ",title:"Hạng A1",description:"Học phí và hồ sơ đăng ký",tuition:800000,fees:[["Thi lý thuyết",60000],["Thi thực hành",70000],["Cấp giấy phép PET",135000]],included:["Tiếp nhận và hướng dẫn hồ sơ","Tài liệu ôn tập theo chương trình","Hướng dẫn lý thuyết và thực hành cơ bản"]},
  {license:"A",badge:"XE MÔ TÔ",title:"Hạng A",description:"Học phí và hồ sơ đăng ký",tuition:1800000,fees:[["Thi lý thuyết",60000],["Thi thực hành",70000],["Cấp giấy phép PET",135000]],included:["Tiếp nhận và hướng dẫn hồ sơ","Tài liệu ôn tập theo chương trình","Hướng dẫn lý thuyết và thực hành hạng A"]},
  {license:"B số tự động",badge:"Ô TÔ HẠNG B",title:"B số tự động",description:"Chương trình đào tạo giới hạn xe số tự động",tuition:22000000,fees:[],included:["Hồ sơ và thủ tục ghi danh","Học lý thuyết theo kế hoạch khóa","Thực hành, nhiên liệu, giáo viên và sân tập","Cabin điện tử theo chương trình hiện hành","DAT và quãng đường đào tạo theo quy định"]},
  {license:"B số sàn",badge:"Ô TÔ HẠNG B",title:"B số sàn",description:"Đào tạo xe số sàn và sử dụng được xe số tự động",tuition:22000000,fees:[],included:["Hồ sơ và thủ tục ghi danh","Học lý thuyết theo kế hoạch khóa","Thực hành, nhiên liệu, giáo viên và sân tập","Cabin điện tử theo chương trình hiện hành","DAT và quãng đường đào tạo theo quy định"]},
  {license:"C1",badge:"Ô TÔ HẠNG C1",title:"Hạng C1",description:"Chương trình đào tạo lái xe ô tô tải hạng C1",tuition:25000000,fees:[],included:["Hồ sơ và thủ tục ghi danh","Học lý thuyết theo kế hoạch khóa","Thực hành xe tải, nhiên liệu, giáo viên và sân tập","Cabin điện tử theo chương trình hiện hành","DAT và quãng đường đào tạo theo quy định","Theo dõi tiến độ học và lịch thi trên hệ thống"]}
];

function promotionActive(item){
  if(!(Number(item.discount_amount)>0||item.promotion_title||item.promotion_description))return false;
  if(!item.promotion_end)return true;
  const end=new Date(`${item.promotion_end}T23:59:59`);
  return !Number.isNaN(end.valueOf())&&end.valueOf()>=Date.now();
}

function normalizedFees(value,fallback){
  if(!Array.isArray(value))return fallback;
  return value.map(item=>Array.isArray(item)?[String(item[0]||"Khoản phí"),Number(item[1])||0]:[String(item?.name||"Khoản phí"),Number(item?.value)||0]);
}

function mergeConfig(config=[]){
  return basePlans.map(base=>{
    const saved=config.find(item=>item?.license_class===base.license&&item?.active!==false);
    if(!saved)return {...base,promotion_title:"",promotion_description:"",discount_amount:0,promotion_end:null};
    return {...base,tuition:Number(saved.tuition)||0,fees:normalizedFees(saved.fees,base.fees),promotion_title:saved.promotion_title||"",promotion_description:saved.promotion_description||"",discount_amount:Number(saved.discount_amount)||0,promotion_end:saved.promotion_end||null};
  });
}

async function loadPublicConfig(){
  try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/app_public_tuition_config`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:"{}"});
    if(!response.ok)throw new Error("tuition config unavailable");
    const data=await response.json();
    return Array.isArray(data)?data:[];
  }catch{return []}
}

function total(plan,tuitionValue=plan.tuition){return tuitionValue+plan.fees.reduce((sum,item)=>sum+(Number(item[1])||0),0)}
function dateLabel(value){
  if(!value)return"";
  const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match?`${match[3]}/${match[2]}/${match[1]}`:value;
}

function card(plan,index){
  const motorbike=plan.fees.length>0;
  const promo=promotionActive(plan);
  const discount=promo?Math.min(Number(plan.discount_amount)||0,Number(plan.tuition)||0):0;
  const finalTuition=Math.max(0,(Number(plan.tuition)||0)-discount);
  const promoHtml=promo?`<div class="tuition-promotion"><b>${plan.promotion_title||"Ưu đãi hiện tại"}</b>${plan.promotion_description?`<span>${plan.promotion_description}</span>`:""}${discount?`<strong>Giảm ${money(discount)}</strong>`:""}${plan.promotion_end?`<small>Áp dụng đến ${dateLabel(plan.promotion_end)}</small>`:""}</div>`:"";
  const priceHtml=discount?`<small>Học phí ưu đãi</small><del>${money(plan.tuition)}</del><strong>${money(finalTuition)}</strong>`:`<small>Học phí & hồ sơ</small><strong>${money(plan.tuition)}</strong>`;
  return `<article class="tuition-card${index>1?' featured':''}${promo?' has-promotion':''}">
    <div class="tuition-card__top"><div><span class="tuition-card__badge">${plan.badge}</span><h3>${plan.title}</h3><p>${plan.description}</p></div><div class="tuition-price">${priceHtml}</div></div>
    <div class="tuition-card__body">
      ${promoHtml}
      ${motorbike?`<div class="tuition-fees">${plan.fees.map(([name,value])=>`<div><span>${name}</span><b>${money(value)}</b></div>`).join("")}</div><div class="tuition-total"><span>Tổng dự kiến gồm học phí, sát hạch và PET${discount?' sau ưu đãi':''}</span><strong>${money(total(plan,finalTuition))}</strong></div>`:`<div class="tuition-total"><span>Học phí trọn gói khóa đào tạo${discount?' sau ưu đãi':''}</span><strong>${money(finalTuition)}</strong></div>`}
      <ul>${plan.included.map(item=>`<li>${item}</li>`).join("")}</ul>
      <button type="button" data-tuition-license="${plan.license}">Đăng ký tư vấn ${plan.title}</button>
    </div>
  </article>`;
}

function bindButtons(section){
  section.querySelectorAll("[data-tuition-license]").forEach(button=>button.addEventListener("click",()=>{
    document.querySelector(`[data-license-card="${CSS.escape(button.dataset.tuitionLicense)}"]`)?.click();
    document.getElementById("registrationForm")?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
}

async function mountTuition(){
  if(!tuitionAnchor||document.getElementById("hoc-phi-tu-van"))return;
  const config=await loadPublicConfig();
  const plans=mergeConfig(config);
  const section=document.createElement("section");
  section.id="hoc-phi-tu-van";
  section.className="site-upgrade-section site-pricing tuition-section";
  section.innerHTML=`<div class="tuition-shell">
    <div class="tuition-heading"><p>HỌC PHÍ & CÁC KHOẢN NỘP RIÊNG</p><h2>Bảng học phí theo từng hạng đào tạo</h2><span>Học phí và ưu đãi được cập nhật từ hệ thống quản trị Thầy Đạt. Các khoản nộp riêng được trình bày tách biệt để học viên dễ theo dõi.</span></div>
    <div class="tuition-alert"><b>!</b><span><strong>Lưu ý:</strong> A1 và A có lệ phí sát hạch, cấp PET nộp riêng tại sân thi. Với hạng B và C1, lệ phí khám sức khỏe, sát hạch, cấp giấy phép và tập xe cảm biến không nằm trong học phí trọn gói, trừ khi có xác nhận khác bằng văn bản.</span></div>
    <div class="tuition-grid">${plans.map(card).join("")}</div>
    <div class="tuition-package">
      <div class="tuition-package__head"><div><p>GÓI HỌC PHÍ Ô TÔ</p><h3>Các nội dung thuộc chương trình đào tạo</h3></div><span>Hạng B hiện hành dùng tên “B số tự động”, “B số sàn” và “C1” để học viên dễ lựa chọn chương trình phù hợp.</span></div>
      <div class="tuition-package-grid"><article><b>01</b><strong>Hồ sơ và thủ tục</strong><small>Ghi danh, kiểm tra thông tin và hướng dẫn giấy tờ.</small></article><article><b>02</b><strong>Lý thuyết</strong><small>Học theo lịch và chương trình của cơ sở đào tạo.</small></article><article><b>03</b><strong>Thực hành</strong><small>Xe tập lái, nhiên liệu, giáo viên và sân tập theo gói.</small></article><article><b>04</b><strong>Cabin điện tử</strong><small>Thực hiện theo thời lượng của chương trình đang áp dụng.</small></article><article><b>05</b><strong>Đào tạo DAT</strong><small>Ghi nhận thời gian và quãng đường thực hành theo quy định.</small></article><article><b>06</b><strong>Quản lý tiến độ</strong><small>Theo dõi lịch học, cabin, DAT và lịch thi trên hệ thống.</small></article></div>
      <div class="tuition-extra"><article><strong>Khoản nộp riêng</strong><p>Khám sức khỏe, lệ phí sát hạch, cấp giấy phép PET và thi lại nếu phát sinh được thông báo theo mức áp dụng tại thời điểm thực hiện.</p></article><article><strong>Tập xe cảm biến</strong><p>Chi phí tập thử xe sát hạch không nằm trong học phí. Mức tham khảo do sân thi hoặc đơn vị cung cấp xe thông báo trước khi đăng ký.</p></article></div>
      <div class="tuition-legal-note"><span><strong>Thông tin học phí:</strong> Giá và ưu đãi trên các thẻ phía trên được quản trị viên cập nhật từ hệ thống. Lệ phí nhà nước được đối chiếu tại thời điểm nộp.</span><div><a href="#dang-ky">Đăng ký tư vấn</a></div></div>
    </div>
  </div>`;
  tuitionAnchor.insertAdjacentElement("afterend",section);
  bindButtons(section);
}

mountTuition();
