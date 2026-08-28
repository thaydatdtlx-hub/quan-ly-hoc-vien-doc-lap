const SITE_CONFIG_URL="https://pkzxkvcncipfszeukpwu.supabase.co/rest/v1/rpc/app_public_site_config";
const SITE_CONFIG_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const PRIMARY_ORIGIN="https://www.hoclaixecungdat.com";
const REGISTRATION_SEO_TITLE="Học lái xe hạng A1,A,B,C1 cùng Đạt";

function isRegistrationPage(){
  return location.pathname==="/dang-ky-hoc-lai-xe.html"||
    (location.pathname==="/"&&Boolean(document.getElementById("registrationForm")));
}

function youtubeId(value=""){
  try{
    const url=new URL(value);
    if(url.hostname.includes("youtu.be"))return url.pathname.replace(/^\//,"").split("/")[0];
    return url.searchParams.get("v")||url.pathname.match(/\/embed\/([^/?]+)/)?.[1]||"";
  }catch{return""}
}

function absolute(value=""){
  if(!value)return"";
  try{return new URL(value,location.origin).href}catch{return value}
}

function setMeta(selector,content,attribute="content"){
  if(!content)return;
  const node=document.querySelector(selector);
  if(node)node.setAttribute(attribute,content);
}

function replaceContactLinks(config){
  const phone=String(config.hotline||"").replace(/\s+/g,"");
  if(phone){
    document.querySelectorAll('a[href^="tel:"]').forEach(a=>a.href=`tel:${phone}`);
    document.querySelectorAll('a[href^="tel:"]').forEach(a=>{if(/0984\s*811\s*037/.test(a.textContent||""))a.textContent=(config.hotline||phone)});
  }
  if(config.zalo_url)document.querySelectorAll('a[href*="zalo.me"]').forEach(a=>a.href=config.zalo_url);
  if(config.facebook_url)document.querySelectorAll('a[href*="facebook.com"]').forEach(a=>a.href=config.facebook_url);
  if(config.tiktok_url)document.querySelectorAll('a[href*="tiktok.com"]').forEach(a=>a.href=config.tiktok_url);
}

function applyRegistrationConfig(config){
  if(!isRegistrationPage())return;
  const brandStrong=document.querySelector(".site-header .brand strong");
  const brandSmall=document.querySelector(".site-header .brand small");
  if(brandStrong&&config.brand_name)brandStrong.textContent=String(config.brand_name).toUpperCase();
  if(brandSmall&&config.brand_tagline)brandSmall.textContent=config.brand_tagline;

  const eyebrow=document.querySelector(".hero .eyebrow");
  const heroTitle=document.getElementById("heroTitle");
  const heroText=document.querySelector(".hero .hero-text");
  if(eyebrow&&config.hero_eyebrow)eyebrow.textContent=config.hero_eyebrow;
  if(heroTitle&&config.hero_title){
    const subtitle=config.hero_subtitle?`<span>${config.hero_subtitle}</span>`:"";
    heroTitle.innerHTML=`${config.hero_title}<br>${subtitle}`;
  }
  if(heroText&&config.hero_description)heroText.textContent=config.hero_description;

  const primary=document.querySelector('.hero-actions a[href="#dang-ky"]');
  const secondary=document.querySelector('.hero-actions a[href^="tel:"]');
  if(primary&&config.primary_cta)primary.textContent=config.primary_cta;
  if(secondary&&config.secondary_cta)secondary.textContent=config.secondary_cta;

  document.title=REGISTRATION_SEO_TITLE;
  setMeta('meta[property="og:title"]',REGISTRATION_SEO_TITLE);
  setMeta('meta[name="description"]',config.seo_description);
  setMeta('meta[property="og:description"]',config.seo_description);
  if(config.og_image)setMeta('meta[property="og:image"]',absolute(config.og_image));

  const canonical=document.querySelector('link[rel="canonical"]');
  if(canonical)canonical.href=`${PRIMARY_ORIGIN}/`;
  setMeta('meta[property="og:url"]',`${PRIMARY_ORIGIN}/`);

  const nav=document.querySelector(".site-header nav");
  if(nav){
    const theory=[...nav.querySelectorAll('a[href="/600-cau-hoi.html"]')];
    theory.slice(1).forEach(node=>node.remove());
    document.querySelectorAll(".site-unified-area-badge").forEach(node=>node.remove());
  }

  const announcement=String(config.announcement||"").trim();
  let bar=document.querySelector(".site-admin-announcement");
  if(config.announcement_enabled&&announcement){
    if(!bar){bar=document.createElement("div");bar.className="site-admin-announcement";document.body.prepend(bar)}
    bar.textContent=announcement;
  }else bar?.remove();

  const videos=[
    {url:config.video_1_url,title:config.video_1_title},
    {url:config.video_2_url,title:config.video_2_title}
  ];
  document.querySelectorAll(".training-video-card").forEach((card,index)=>{
    const item=videos[index];if(!item?.url)return;
    const id=youtubeId(item.url);
    const iframe=card.querySelector("iframe");
    const title=card.querySelector("h3");
    if(iframe&&id)iframe.src=`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
    if(iframe&&item.title)iframe.title=item.title;
    if(title&&item.title)title.textContent=item.title;
    card.querySelectorAll('a[target="_blank"]').forEach(a=>a.href=item.url);
  });

  const location=document.querySelector("#dia-diem-lien-he .site-location-list");
  if(location){
    const items=location.querySelectorAll("small");
    if(config.address&&items[0])items[0].textContent=config.address;
    if(config.working_hours&&items[2])items[2].textContent=config.working_hours;
  }
  replaceContactLinks(config);
}

async function loadSiteConfig(){
  try{
    const response=await fetch(SITE_CONFIG_URL,{method:"POST",headers:{apikey:SITE_CONFIG_KEY,"Content-Type":"application/json"},body:"{}"});
    if(!response.ok)return;
    const config=await response.json();
    if(config&&typeof config==="object")applyRegistrationConfig(config);
  }catch{}
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(loadSiteConfig,0),{once:true});
else setTimeout(loadSiteConfig,0);
