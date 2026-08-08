const PRIMARY_ORIGIN="https://hoclaixecungdat.vercel.app";

function currentCanonicalPath(){
  return location.pathname==="/index.html"?"/":location.pathname;
}

function ensureMetaConsistency(){
  const canonicalUrl=`${PRIMARY_ORIGIN}${currentCanonicalPath()}`;
  let canonical=document.querySelector('link[rel="canonical"]');
  if(!canonical){
    canonical=document.createElement("link");
    canonical.rel="canonical";
    document.head.append(canonical);
  }
  canonical.href=canonicalUrl;

  let ogUrl=document.querySelector('meta[property="og:url"]');
  if(!ogUrl){
    ogUrl=document.createElement("meta");
    ogUrl.setAttribute("property","og:url");
    document.head.append(ogUrl);
  }
  ogUrl.content=canonicalUrl;

  const ogImage=document.querySelector('meta[property="og:image"]');
  if(ogImage?.content){
    try{
      const imageUrl=new URL(ogImage.content,location.origin);
      ogImage.content=`${PRIMARY_ORIGIN}${imageUrl.pathname}${imageUrl.search}`;
    }catch{}
  }
}

function ensureUnifiedStyles(){
  if(document.getElementById("siteUnifiedStyles"))return;
  const style=document.createElement("style");
  style.id="siteUnifiedStyles";
  style.textContent=`
    .site-unified-nav-link{font-weight:800!important}
    .quiz-topbar nav .site-unified-nav-link{border:1px solid rgba(7,95,206,.18);border-radius:999px;padding:.55rem .85rem;text-decoration:none}
    .site-header nav .site-unified-nav-link{font-weight:800}
    .site-unified-registration-cta{text-decoration:none;margin-top:.7rem}
    .site-unified-registration-cta>span:first-child{display:grid;place-items:center}
    .site-unified-footer-link{text-decoration:none}
    @media(max-width:720px){
      .quiz-topbar nav .site-unified-nav-link{padding:.45rem .65rem;font-size:.82rem}
    }
  `;
  document.head.append(style);
}

function footerLink({href,icon,label,key}){
  const link=document.createElement("a");
  link.className="contact-footer__link site-unified-footer-link";
  link.href=href;
  link.dataset.siteUnified=key;
  link.innerHTML=`<span class="contact-footer__icon">${icon}</span><span>${label}</span>`;
  return link;
}

function addFooterLinks(){
  document.querySelectorAll(".contact-footer__links").forEach(nav=>{
    if(!nav.querySelector('[data-site-unified="register"]')){
      nav.prepend(footerLink({href:"/dang-ky-hoc-lai-xe.html",icon:"✎",label:"Đăng ký học lái xe",key:"register"}));
    }
    if(!nav.querySelector('[data-site-unified="theory"]')){
      nav.prepend(footerLink({href:"/600-cau-hoi.html",icon:"600",label:"Học 600 câu",key:"theory"}));
    }
  });
}

function enhanceLoginPage(){
  if(!["/","/index.html"].includes(location.pathname))return;
  const publicRegister=document.getElementById("openPublicRegisterBtn");
  if(publicRegister&&!document.querySelector('[data-site-unified="new-student-cta"]')){
    const link=document.createElement("a");
    link.className="public-register-cta site-unified-registration-cta";
    link.href="/dang-ky-hoc-lai-xe.html";
    link.dataset.siteUnified="new-student-cta";
    link.innerHTML='<span>🚘</span><div><strong>Đăng ký học lái xe mới</strong><small>A1 · A · B · C1 · nhận tư vấn lộ trình</small></div><b>→</b>';
    publicRegister.insertAdjacentElement("afterend",link);
  }
  addFooterLinks();
}

function enhanceTheoryPage(){
  if(location.pathname!=="/600-cau-hoi.html")return;
  const nav=document.querySelector(".quiz-topbar nav");
  if(nav&&!nav.querySelector('[data-site-unified="register-nav"]')){
    const link=document.createElement("a");
    link.href="/dang-ky-hoc-lai-xe.html";
    link.className="site-unified-nav-link";
    link.dataset.siteUnified="register-nav";
    link.textContent="Đăng ký học lái xe";
    const loginLink=[...nav.querySelectorAll('a[href="/"]')].find(item=>item.id!=="studentPortalLink");
    loginLink?nav.insertBefore(link,loginLink):nav.append(link);
  }
  addFooterLinks();
}

function addRegistrationNavLinks(nav){
  if(!nav)return;
  if(!nav.querySelector('[data-site-unified="theory-nav"]')){
    const theory=document.createElement("a");
    theory.href="/600-cau-hoi.html";
    theory.className="site-unified-nav-link";
    theory.dataset.siteUnified="theory-nav";
    theory.textContent="Học 600 câu";
    nav.append(theory);
  }
  if(!nav.querySelector('[data-site-unified="login-nav"]')){
    const login=document.createElement("a");
    login.href="/";
    login.className="site-unified-nav-link";
    login.dataset.siteUnified="login-nav";
    login.textContent="Đăng nhập";
    nav.append(login);
  }
}

function enhanceRegistrationPage(){
  if(location.pathname!=="/dang-ky-hoc-lai-xe.html")return;
  addRegistrationNavLinks(document.querySelector(".site-header nav"));
  addRegistrationNavLinks(document.querySelector(".site-mobile-drawer nav"));
  window.setTimeout(()=>addRegistrationNavLinks(document.querySelector(".site-mobile-drawer nav")),120);
}

function initSiteUnification(){
  ensureMetaConsistency();
  ensureUnifiedStyles();
  enhanceLoginPage();
  enhanceTheoryPage();
  enhanceRegistrationPage();
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initSiteUnification,{once:true});
else initSiteUnification();
