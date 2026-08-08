import "./professional-public-polish.css";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const money=value=>new Intl.NumberFormat("vi-VN").format(Number(value)||0)+" VNĐ";

async function rpc(fn){
  try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:"{}"});
    if(!response.ok)return null;return await response.json();
  }catch{return null}
}
function uniqueNav(){
  const nav=document.querySelector(".site-header nav");if(!nav)return;
  const seen=new Set();[...nav.querySelectorAll("a")].forEach(a=>{const key=`${a.getAttribute("href")}|${a.textContent.trim().toLowerCase()}`;if(seen.has(key))a.remove();else seen.add(key)});
  document.querySelectorAll(".site-unified-area-badge").forEach(n=>n.remove());
}
function addTrust(){
  if(location.pathname!=="/dang-ky-hoc-lai-xe.html"||document.querySelector(".site-professional-trust"))return;
  const anchor=document.querySelector(".quick-features");if(!anchor)return;
  const node=document.createElement("div");node.className="site-professional-trust";
  node.innerHTML=`<article><b>✓</b><div><strong>Học phí rõ ràng</strong><small>Giá và ưu đãi lấy trực tiếp từ hệ thống Admin.</small></div></article><article><b>600</b><div><strong>Học lý thuyết online</strong><small>Ôn câu hỏi, thi thử và lưu tiến độ cá nhân.</small></div></article><article><b>↻</b><div><strong>Theo dõi tập trung</strong><small>Lịch học, DAT, cabin và lịch thi trong cùng hệ thống.</small></div></article><article><b>☎</b><div><strong>Hỗ trợ trực tiếp</strong><small>Hotline và Zalo luôn hiển thị rõ ràng khi cần.</small></div></article>`;
  anchor.insertAdjacentElement("afterend",node);
}
function pricingCard(plan,index){
  const fees=Array.isArray(plan.fees)?plan.fees:[];
  const discount=Math.min(Number(plan.discount_amount)||0,Number(plan.tuition)||0);
  const final=Math.max(0,(Number(plan.tuition)||0)-discount);
  const promo=Boolean(plan.promotion_title||plan.promotion_description||discount);
  const feeRows=fees.map(item=>{const name=Array.isArray(item)?item[0]:item?.name;const value=Array.isArray(item)?item[1]:item?.value;return `<div><span>${name||"Khoản phí"}</span><b>${money(value)}</b></div>`}).join("");
  return `<article class="tuition-card${index>1?' featured':''}${promo?' has-promotion':''}"><div class="tuition-card__top"><div><span class="tuition-card__badge">${plan.license_class||"KHÓA HỌC"}</span><h3>${plan.license_class}</h3><p>Thông tin học phí cập nhật từ hệ thống quản trị</p></div><div class="tuition-price"><small>${discount?'Học phí ưu đãi':'Học phí & hồ sơ'}</small>${discount?`<del>${money(plan.tuition)}</del>`:''}<strong>${money(final||plan.tuition)}</strong></div></div><div class="tuition-card__body">${promo?`<div class="tuition-promotion"><b>${plan.promotion_title||"Ưu đãi hiện tại"}</b>${plan.promotion_description?`<span>${plan.promotion_description}</span>`:''}${discount?`<strong>Giảm ${money(discount)}</strong>`:''}${plan.promotion_end?`<small>Áp dụng đến ${plan.promotion_end.split('-').reverse().join('/')}</small>`:''}</div>`:''}${feeRows?`<div class="tuition-fees">${feeRows}</div>`:''}<div class="tuition-total"><span>Học phí đang áp dụng${fees.length?' (chưa gồm các khoản nộp riêng)':''}</span><strong>${money(final||plan.tuition)}</strong></div><button type="button" data-polish-license="${plan.license_class}">Đăng ký tư vấn ${plan.license_class}</button></div></article>`;
}
async function repairPricing(){
  if(location.pathname!=="/dang-ky-hoc-lai-xe.html")return;
  const config=await rpc("app_public_tuition_config");if(!Array.isArray(config)||!config.length)return;
  const existing=document.getElementById("hoc-phi-tu-van");
  if(existing&&!/Nhận báo giá/.test(existing.textContent||""))return;
  existing?.remove();
  const anchor=document.querySelector(".training-detail-section")||document.querySelector(".license-info-section");if(!anchor)return;
  const section=document.createElement("section");section.id="hoc-phi-tu-van";section.className="site-upgrade-section site-pricing tuition-section";
  section.innerHTML=`<div class="tuition-shell"><div class="tuition-heading"><p>HỌC PHÍ & ƯU ĐÃI</p><h2>Bảng học phí đang áp dụng</h2><span>Dữ liệu này được quản trị viên cập nhật trực tiếp. Các khoản lệ phí nộp riêng được tách biệt để dễ đối chiếu.</span></div><div class="tuition-grid">${config.filter(x=>x.active!==false).map(pricingCard).join("")}</div></div>`;
  anchor.insertAdjacentElement("afterend",section);
  section.querySelectorAll("[data-polish-license]").forEach(b=>b.onclick=()=>{document.querySelector(`[data-license-card="${CSS.escape(b.dataset.polishLicense)}"]`)?.click();document.getElementById("registrationForm")?.scrollIntoView({behavior:"smooth",block:"start"})});
  syncFaq(config);
}
function syncFaq(config){
  const byClass=Object.fromEntries(config.map(x=>[x.license_class,x]));
  document.querySelectorAll("#faq details").forEach(item=>{
    const q=item.querySelector("summary")?.textContent||"",p=item.querySelector("p");if(!p)return;
    if(q.includes("Học phí hạng A1")&&byClass.A1)p.textContent=`Học phí A1 hiện tại là ${money(byClass.A1.tuition)}. Các lệ phí sát hạch và cấp giấy phép được trình bày riêng trong bảng học phí để học viên dễ đối chiếu.`;
    if(q.includes("Học phí hạng A là")&&byClass.A)p.textContent=`Học phí hạng A hiện tại là ${money(byClass.A.tuition)}. Các lệ phí nộp riêng được cập nhật tại bảng học phí.`;
    if(q.includes("B số tự động")&&q.includes("B số sàn")&&byClass["B số tự động"]&&byClass["B số sàn"])p.textContent=`Học phí B số tự động hiện tại là ${money(byClass["B số tự động"].tuition)}; B số sàn là ${money(byClass["B số sàn"].tuition)}. Giá và ưu đãi được lấy trực tiếp từ hệ thống Admin.`;
  });
}
function updateProofVideo(){
  const proof=document.querySelector("#minh-chung-hoc-vien a[href*='youtu']");if(proof)proof.href="https://youtu.be/eBx6gAFa9a8?si=Heckare8yAd4omLJ";
}
function init(){uniqueNav();addTrust();updateProofVideo();setTimeout(uniqueNav,250);setTimeout(repairPricing,350)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
