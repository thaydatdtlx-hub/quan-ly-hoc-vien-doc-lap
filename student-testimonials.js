import {upload} from "@vercel/blob/client";
import "./student-testimonials-admin.css";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const TOKEN_KEY="hv_token";
const PREFIX="student-testimonials/";
const MAX_BYTES=10*1024*1024;
const ALLOWED_TYPES=new Set(["image/jpeg","image/png","image/webp"]);

const motorcycleOffers=[
  {icon:"id",title:"Nhận bằng thuận tiện",text:"Theo dõi tiến độ và nhận thông báo các mốc quan trọng trên hệ thống."},
  {icon:"book",title:"Hỗ trợ tài liệu học",text:"Ôn lý thuyết, bộ câu hỏi và tài liệu cần thiết trong quá trình học."},
  {icon:"bike",title:"Hướng dẫn hồ sơ rõ ràng",text:"Được hướng dẫn chuẩn bị hồ sơ và các bước đăng ký theo từng hạng bằng."}
];
const carOffers=[
  {icon:"id",title:"Theo dõi toàn bộ lộ trình",text:"Theo dõi hồ sơ, lý thuyết, DAT, cabin, lịch tốt nghiệp và sát hạch tập trung."},
  {icon:"book",title:"Học lý thuyết & thi thử online",text:"Ôn bộ câu hỏi lý thuyết và thi thử ngay trên hệ thống Học lái xe cùng Đạt."},
  {icon:"car",title:"Lịch thực hành linh hoạt",text:"Chủ động phối hợp thời gian học thực hành phù hợp với lịch cá nhân."}
];

function icon(name){
  if(name==="book")return `<svg viewBox="0 0 64 64" fill="none" stroke-width="3"><path d="M9 12h20a7 7 0 0 1 7 7v34a8 8 0 0 0-7-4H9z"/><path d="M55 12H35a7 7 0 0 0-7 7v34a8 8 0 0 1 7-4h20z"/><path d="M15 21h12M15 29h12M40 21h9M40 29h9"/></svg>`;
  if(name==="bike")return `<svg viewBox="0 0 64 64" fill="none" stroke-width="3"><circle cx="16" cy="47" r="9"/><circle cx="49" cy="47" r="9"/><path d="M16 47l10-21h11l12 21M26 26l10 21M23 35h22M38 22h9M45 22l4 7"/></svg>`;
  if(name==="car")return `<svg viewBox="0 0 64 64" fill="none" stroke-width="3"><path d="M10 39l5-14a6 6 0 0 1 6-4h22a6 6 0 0 1 6 4l5 14v10H10z"/><path d="M15 39h34M19 32h26"/><circle cx="19" cy="48" r="4"/><circle cx="45" cy="48" r="4"/></svg>`;
  return `<svg viewBox="0 0 64 64" fill="none" stroke-width="3"><rect x="10" y="13" width="44" height="38" rx="5"/><circle cx="24" cy="28" r="7"/><path d="M15 44c2-7 7-10 9-10s7 3 9 10M39 25h9M39 33h9M39 41h7"/></svg>`;
}

function offersHtml(items){
  return items.map(item=>`<article class="student-offers__item"><div class="student-offers__icon">${icon(item.icon)}</div><div><h3>${item.title}</h3><p>${item.text}</p></div></article>`).join("");
}

function getToken(){return localStorage.getItem(TOKEN_KEY)||sessionStorage.getItem(TOKEN_KEY)||""}

async function isAdmin(){
  const token=getToken();
  if(!token)return false;
  try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/app_me`,{
      method:"POST",
      headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({p_token:token}),
      cache:"no-store"
    });
    if(!response.ok)return false;
    const me=await response.json();
    return me?.role==="admin";
  }catch{return false}
}

function safeBaseName(value="image"){
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/\.[a-z0-9]+$/i,"").replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,56)||"image";
}

function extension(type){
  if(type==="image/png")return"png";
  if(type==="image/webp")return"webp";
  return"jpg";
}

function uploadPath(file){
  return `${PREFIX}${Date.now()}-${safeBaseName(file.name)}.${extension(file.type)}`;
}

function createSection(){
  const section=document.createElement("section");
  section.className="student-social-proof";
  section.id="nhan-xet-hoc-vien";
  section.innerHTML=`
    <div class="student-social-proof__grid">
      <div class="student-social-proof__panel student-offers">
        <h2 class="student-social-proof__title">ƯU ĐÃI HỌC LÁI XE</h2>
        <div class="student-offers__box">
          <div class="student-offers__tabs" role="tablist" aria-label="Ưu đãi theo loại bằng">
            <button class="student-offers__tab" type="button" role="tab" aria-selected="true" data-offer-tab="motorcycle">Ưu đãi học lái xe máy</button>
            <button class="student-offers__tab" type="button" role="tab" aria-selected="false" data-offer-tab="car">Ưu đãi học lái xe ô tô</button>
          </div>
          <div class="student-offers__list" data-offer-list>${offersHtml(motorcycleOffers)}</div>
        </div>
      </div>
      <div class="student-social-proof__panel student-testimonials">
        <div class="student-testimonials__heading">
          <h2 class="student-social-proof__title">NHẬN XÉT CỦA HỌC VIÊN</h2>
          <button class="student-testimonials__add" type="button" data-testimonial-add aria-label="Thêm hình ảnh nhận xét học viên">＋ Thêm hình ảnh</button>
          <input type="file" hidden accept="image/jpeg,image/png,image/webp" data-testimonial-file>
        </div>
        <div class="student-testimonials__stage">
          <div class="student-testimonials__track" data-testimonial-track aria-live="polite"></div>
        </div>
        <div class="student-testimonials__nav" hidden data-testimonial-nav>
          <button type="button" aria-label="Ảnh trước" data-testimonial-prev>‹</button>
          <div class="student-testimonials__dots" data-testimonial-dots></div>
          <button type="button" aria-label="Ảnh sau" data-testimonial-next>›</button>
        </div>
        <p class="student-testimonials__admin-note" data-testimonial-admin-note>Chỉ Admin nhìn thấy nút thêm/xóa ảnh. Hỗ trợ JPG, PNG, WebP tối đa 10 MB/ảnh.</p>
        <p class="student-testimonials__status" data-testimonial-status></p>
      </div>
    </div>`;
  const anchor=document.querySelector(".stats-section")||document.querySelector("#thoi-gian")||document.querySelector("#dang-ky");
  if(anchor?.parentNode)anchor.parentNode.insertBefore(section,anchor);
  else document.querySelector("main")?.append(section);
  return section;
}

function createLightbox(){
  const dialog=document.createElement("dialog");
  dialog.className="student-testimonial-lightbox";
  dialog.innerHTML=`<button type="button" aria-label="Đóng">×</button><img alt="Nhận xét của học viên">`;
  dialog.querySelector("button").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
  document.body.append(dialog);
  return dialog;
}

async function deleteTestimonial(section,lightbox,image,button){
  if(!image?.pathname)return;
  if(!window.confirm("Xóa ảnh nhận xét này? Ảnh sẽ bị xóa khỏi website."))return;
  const status=section.querySelector("[data-testimonial-status]");
  button.disabled=true;
  status.textContent="Đang xóa ảnh…";
  try{
    const response=await fetch("/api/student-testimonials",{
      method:"DELETE",
      headers:{"Content-Type":"application/json","X-Admin-Token":getToken()},
      body:JSON.stringify({pathname:image.pathname})
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.error||"Không thể xóa ảnh.");
    if(lightbox.open)lightbox.close();
    await loadTestimonials(section,lightbox,true);
    status.textContent="Đã xóa ảnh nhận xét học viên.";
  }catch(error){
    status.textContent=error?.message||"Không thể xóa ảnh.";
    button.disabled=false;
  }
}

async function loadTestimonials(section,lightbox,admin=false){
  const track=section.querySelector("[data-testimonial-track]");
  const nav=section.querySelector("[data-testimonial-nav]");
  const dots=section.querySelector("[data-testimonial-dots]");
  const status=section.querySelector("[data-testimonial-status]");
  status.textContent="";
  try{
    const response=await fetch("/api/student-testimonials",{cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data?.error||"Không thể tải nhận xét học viên.");
    const images=Array.isArray(data?.images)?data.images:[];
    if(!images.length){
      track.innerHTML=`<div class="student-testimonials__empty"><span>💬</span><b>Nhận xét của học viên</b><p>Ảnh phản hồi sẽ được cập nhật tại đây.</p></div>`;
      nav.hidden=true;
      track.onscroll=null;
      return;
    }
    track.innerHTML=images.map((item,index)=>`<article class="student-testimonial-card"><button class="student-testimonial-card__open" type="button" data-testimonial-open="${index}" aria-label="Xem ảnh nhận xét ${index+1}"><img loading="lazy" decoding="async" src="${item.imageUrl}" alt="Nhận xét học viên ${index+1}"></button>${admin?`<button class="student-testimonial-card__delete" type="button" data-testimonial-delete="${index}" aria-label="Xóa ảnh nhận xét ${index+1}">🗑 Xóa ảnh</button>`:""}</article>`).join("");
    dots.innerHTML=images.map((_,index)=>`<button type="button" class="student-testimonials__dot" data-testimonial-dot="${index}" aria-label="Đến ảnh ${index+1}" aria-current="${index===0}"></button>`).join("");
    nav.hidden=images.length<2;
    const cards=[...track.children];
    let active=0;
    const setActive=index=>{
      active=Math.max(0,Math.min(index,cards.length-1));
      section.querySelectorAll("[data-testimonial-dot]").forEach((dot,i)=>dot.setAttribute("aria-current",String(i===active)));
    };
    section.querySelectorAll("[data-testimonial-open]").forEach(button=>button.addEventListener("click",()=>{
      const image=images[Number(button.dataset.testimonialOpen)];
      lightbox.querySelector("img").src=image.imageUrl;
      lightbox.showModal();
    }));
    section.querySelectorAll("[data-testimonial-delete]").forEach(button=>button.addEventListener("click",()=>{
      const image=images[Number(button.dataset.testimonialDelete)];
      deleteTestimonial(section,lightbox,image,button);
    }));
    section.querySelectorAll("[data-testimonial-dot]").forEach(button=>button.addEventListener("click",()=>{
      const index=Number(button.dataset.testimonialDot);setActive(index);cards[index]?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"start"});
    }));
    const prev=section.querySelector("[data-testimonial-prev]");
    const next=section.querySelector("[data-testimonial-next]");
    if(prev)prev.onclick=()=>{const index=(active-1+cards.length)%cards.length;setActive(index);cards[index].scrollIntoView({behavior:"smooth",block:"nearest",inline:"start"})};
    if(next)next.onclick=()=>{const index=(active+1)%cards.length;setActive(index);cards[index].scrollIntoView({behavior:"smooth",block:"nearest",inline:"start"})};
    track.onscroll=()=>{
      window.clearTimeout(track._dotTimer);
      track._dotTimer=window.setTimeout(()=>{
        const left=track.scrollLeft;let best=0,bestDistance=Infinity;
        cards.forEach((card,index)=>{const distance=Math.abs(card.offsetLeft-left);if(distance<bestDistance){best=index;bestDistance=distance}});setActive(best);
      },80);
    };
  }catch(error){
    track.innerHTML=`<div class="student-testimonials__empty"><span>💬</span><b>Nhận xét của học viên</b><p>Tạm thời chưa tải được hình ảnh.</p></div>`;
    nav.hidden=true;
    track.onscroll=null;
    status.textContent=error?.message||"Không thể tải hình ảnh.";
  }
}

function setupAdminUpload(section,lightbox,admin){
  const add=section.querySelector("[data-testimonial-add]");
  const input=section.querySelector("[data-testimonial-file]");
  const note=section.querySelector("[data-testimonial-admin-note]");
  const status=section.querySelector("[data-testimonial-status]");
  if(!admin)return;
  add.dataset.admin="true";
  note.dataset.admin="true";
  add.addEventListener("click",()=>input.click());
  input.addEventListener("change",async()=>{
    const file=input.files?.[0];if(!file)return;
    input.value="";
    if(!ALLOWED_TYPES.has(file.type)){status.textContent="Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.";return}
    if(file.size>MAX_BYTES){status.textContent="Ảnh vượt quá 10 MB. Vui lòng chọn ảnh nhỏ hơn.";return}
    add.disabled=true;status.textContent="Đang tải ảnh lên…";
    try{
      await upload(uploadPath(file),file,{
        access:"private",
        handleUploadUrl:"/api/student-testimonials-upload",
        clientPayload:JSON.stringify({token:getToken()}),
        contentType:file.type,
        multipart:file.size>4*1024*1024
      });
      await loadTestimonials(section,lightbox,true);
      status.textContent="Đã thêm ảnh nhận xét học viên.";
    }catch(error){status.textContent=error?.message||"Không thể tải ảnh lên."}
    finally{add.disabled=false}
  });
}

function setupOfferTabs(section){
  const list=section.querySelector("[data-offer-list]");
  section.querySelectorAll("[data-offer-tab]").forEach(button=>button.addEventListener("click",()=>{
    section.querySelectorAll("[data-offer-tab]").forEach(tab=>tab.setAttribute("aria-selected",String(tab===button)));
    list.innerHTML=offersHtml(button.dataset.offerTab==="car"?carOffers:motorcycleOffers);
  }));
}

async function init(){
  if(document.querySelector(".student-social-proof"))return;
  const section=createSection();if(!section)return;
  const lightbox=createLightbox();
  setupOfferTabs(section);
  const admin=await isAdmin();
  setupAdminUpload(section,lightbox,admin);
  await loadTestimonials(section,lightbox,admin);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
