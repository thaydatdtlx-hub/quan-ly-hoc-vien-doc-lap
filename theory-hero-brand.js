import "./theory-hero-brand.css";

function ensureTheoryHeroPolish(){
  if(document.querySelector('link[data-theory-hero-polish-v2]'))return;
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href="/theory-hero-polish-v2.css?v=20260902-1";
  link.dataset.theoryHeroPolishV2="1";
  document.head.append(link);
}

function enhanceTheoryHero(){
  if(location.pathname!=="/600-cau-hoi.html")return;
  ensureTheoryHeroPolish();
  const hero=document.querySelector(".study-hero");
  const copy=hero?.querySelector(".hero-copy");
  const visual=hero?.querySelector(".hero-visual");
  const title=copy?.querySelector("h1");
  if(!hero||!copy||!visual||!title||hero.dataset.brandRefresh==="1")return;

  hero.dataset.brandRefresh="1";
  hero.classList.add("theory-brand-hero");

  const brand=document.createElement("div");
  brand.className="theory-hero-brandline";
  brand.innerHTML=`
    <img src="/logo-thay-dat-compact.webp?v=15" alt="Học lái xe cùng Đạt">
    <div><strong>Học lái xe</strong><span>cùng <b>Đạt</b></span></div>
    <i></i>`;
  copy.prepend(brand);

  title.innerHTML=`<span class="theory-title-blue"><b>600</b> câu hỏi</span><span class="theory-title-green">sát hạch lái xe</span>`;

  visual.innerHTML=`
    <div class="theory-visual-brand"><img src="/logo-thay-dat-compact.webp?v=15" alt=""></div>
    <div class="theory-round-sign"><strong>600</strong><small>CÂU HỎI</small></div>
    <div class="theory-pass-dot">✓</div>
    <div class="theory-license-card"><strong>A1&nbsp;&nbsp;A&nbsp;&nbsp;B&nbsp;&nbsp;C1</strong><span>✓</span><i></i><span>✓</span><i></i><span>✓</span><i></i></div>
    <div class="theory-road-label">TẬP LÁI</div>`;
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",enhanceTheoryHero,{once:true});
else enhanceTheoryHero();
window.addEventListener("pageshow",enhanceTheoryHero);
