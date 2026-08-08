import "./admin-site-config.css";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
let mounted=false,checkingRole=false,confirmedAdmin=false,currentConfig={};

const DEFAULTS={
  brand_name:"Học lái xe cùng Đạt",brand_tagline:"Rõ lộ trình · Vững tay lái",hotline:"0984811037",
  zalo_url:"https://zalo.me/0984811037",facebook_url:"https://www.facebook.com/profile.php?id=61579863779611",
  tiktok_url:"https://www.tiktok.com/@datdidaydo99?is_from_webapp=1&sender_device=pc",youtube_url:"",address:"",
  working_hours:"Liên hệ trước để được hướng dẫn đúng địa điểm và lịch tiếp nhận.",
  hero_eyebrow:"HỌC LÁI XE CÙNG ĐẠT · ĐÀO TẠO & ĐỒNG HÀNH",hero_title:"Đăng ký học lái xe",
  hero_subtitle:"Vững tay lái · Tự tin cầm vô lăng",hero_description:"Đào tạo A1, A, B số tự động, B số sàn và C1. Tư vấn lộ trình rõ ràng, lịch học linh hoạt và theo dõi tiến độ trên hệ thống riêng.",
  primary_cta:"Đăng ký ngay",secondary_cta:"Gọi tư vấn",
  video_1_url:"https://youtu.be/eBx6gAFa9a8?si=Heckare8yAd4omLJ",video_1_title:"Nội dung đào tạo thực tế cùng Thầy Đạt",
  video_2_url:"https://youtu.be/5YEjYy8a6NI?si=n49G52_z2fug3HDB",video_2_title:"Xem thêm nội dung hướng dẫn học lái xe",
  seo_title:"Học lái xe cùng Đạt",seo_description:"Đăng ký học lái xe A1, A, B số tự động, B số sàn và C1 cùng Đạt. Học phí rõ ràng, học 600 câu online và theo dõi tiến độ tập trung.",
  og_image:"/hero-vip-navy-champagne.webp?v=1",announcement:"",announcement_enabled:false,
  bank_name:"MB Bank (MBBank)",bank_bin:"970422",bank_account:"360556789999",bank_holder:"Trần Quốc Đạt",
  payment_note:"Học phí sẽ được cập nhật sau khi trung tâm đối soát giao dịch."
};

function token(){return localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||""}
async function rpc(fn,body={}){
  const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json().catch(()=>null);
  if(!res.ok)throw new Error(data?.message||data?.details||"Không thể kết nối cấu hình website.");
  return data;
}
function escapeHtml(v=""){return String(v).replace(/[&<>"]/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[s]))}
function field(name,label,type="text",wide=false,placeholder=""){
  const value=currentConfig[name]??DEFAULTS[name]??"";
  if(type==="textarea")return `<label class="${wide?'wide':''}">${label}<textarea name="${name}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea></label>`;
  return `<label class="${wide?'wide':''}">${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"></label>`;
}
function panel(id,title,desc,content){return `<section class="admin-site-panel" data-site-panel="${id}"><h3>${title}</h3><p>${desc}</p><div class="admin-site-grid">${content}</div></section>`}
function renderPanels(){
  return [
    panel("brand","Thương hiệu & liên hệ","Tên hiển thị và các kênh liên hệ công khai.",
      field("brand_name","Tên thương hiệu")+field("brand_tagline","Slogan")+field("hotline","Hotline","tel")+field("zalo_url","Zalo URL","url")+field("facebook_url","Facebook URL","url")+field("tiktok_url","TikTok URL","url")+field("youtube_url","YouTube URL","url",true)+field("address","Địa chỉ tiếp nhận hồ sơ","textarea",true,"Để trống nếu chưa muốn công khai")+field("working_hours","Giờ làm việc / hướng dẫn liên hệ","textarea",true)),
    panel("home","Trang chủ & CTA","Nội dung chính khách hàng nhìn thấy đầu tiên.",
      field("hero_eyebrow","Dòng nhỏ phía trên","text",true)+field("hero_title","Tiêu đề chính")+field("hero_subtitle","Dòng nhấn")+field("hero_description","Mô tả hero","textarea",true)+field("primary_cta","Nút chính")+field("secondary_cta","Nút phụ")),
    panel("video","Video đào tạo","Thay video trực tiếp, không cần sửa code.",
      field("video_1_url","Video 1 URL","url",true)+field("video_1_title","Tiêu đề video 1","text",true)+field("video_2_url","Video 2 URL","url",true)+field("video_2_title","Tiêu đề video 2","text",true)),
    panel("payment","Thanh toán học viên","Thông tin này được dùng để tạo mã QR học phí trong Cổng học viên. Hãy kiểm tra thật kỹ trước khi lưu.",
      field("bank_name","Tên ngân hàng")+field("bank_bin","Mã BIN ngân hàng","text",false,"Ví dụ: 970422")+field("bank_account","Số tài khoản","text")+field("bank_holder","Chủ tài khoản")+field("payment_note","Ghi chú đối soát","textarea",true)),
    panel("seo","SEO & chia sẻ","Kiểm soát tiêu đề tab và preview khi chia sẻ link.",
      field("seo_title","SEO title","text",true)+field("seo_description","SEO description","textarea",true)+field("og_image","Ảnh chia sẻ (URL hoặc /path)","text",true)),
    panel("notice","Thông báo","Hiển thị một thông báo nổi ở đầu trang khi cần.",
      `<label class="admin-site-check"><input name="announcement_enabled" type="checkbox" ${currentConfig.announcement_enabled?'checked':''}><span>Bật thông báo công khai</span></label>`+field("announcement","Nội dung thông báo","textarea",true))
  ].join("");
}
function mountDialog(){
  if(document.getElementById("adminSiteConfigDialog"))return;
  const dialog=document.createElement("dialog");dialog.id="adminSiteConfigDialog";dialog.className="admin-site-dialog";
  dialog.innerHTML=`<form id="adminSiteConfigForm" method="dialog"><div class="admin-site-head"><div><p>QUẢN TRỊ NỘI DUNG CÔNG KHAI</p><h2>Cấu hình website</h2><span>Thay đổi thương hiệu, liên hệ, trang chủ, video, thanh toán học viên, SEO và thông báo mà không cần sửa mã nguồn.</span></div><button type="button" data-site-close aria-label="Đóng">×</button></div><div class="admin-site-body"><nav class="admin-site-tabs"><button type="button" data-site-tab="brand">Thương hiệu</button><button type="button" data-site-tab="home">Trang chủ</button><button type="button" data-site-tab="video">Video</button><button type="button" data-site-tab="payment">Thanh toán</button><button type="button" data-site-tab="seo">SEO</button><button type="button" data-site-tab="notice">Thông báo</button></nav><div id="adminSitePanels" class="admin-site-panels"></div></div><p id="adminSiteStatus" class="admin-site-status"></p><div class="admin-site-actions"><button type="button" data-site-reset>Khôi phục mặc định</button><div><button type="button" data-site-close>Đóng</button><button class="primary" type="submit">Lưu cấu hình</button></div></div></form>`;
  document.body.append(dialog);
  dialog.querySelectorAll("[data-site-close]").forEach(b=>b.onclick=()=>dialog.close());
  dialog.querySelector("[data-site-reset]").onclick=()=>{currentConfig={...DEFAULTS};renderForm();setStatus("Đã nạp cấu hình mặc định. Nhấn Lưu để áp dụng.")};
  dialog.querySelector("form").addEventListener("submit",saveConfig);
}
function activateTab(id="brand"){
  document.querySelectorAll("[data-site-tab]").forEach(b=>b.classList.toggle("active",b.dataset.siteTab===id));
  document.querySelectorAll("[data-site-panel]").forEach(p=>p.classList.toggle("active",p.dataset.sitePanel===id));
}
function renderForm(){
  const container=document.getElementById("adminSitePanels");if(!container)return;
  container.innerHTML=renderPanels();
  document.querySelectorAll("[data-site-tab]").forEach(b=>b.onclick=()=>activateTab(b.dataset.siteTab));
  activateTab("brand");
}
function setStatus(text,type=""){const el=document.getElementById("adminSiteStatus");if(!el)return;el.className=`admin-site-status ${type}`;el.textContent=text}
async function loadConfig(){currentConfig={...DEFAULTS,...await rpc("app_public_site_config",{})};renderForm()}
function collect(){
  const form=document.getElementById("adminSiteConfigForm"),data=new FormData(form),out={};
  Object.keys(DEFAULTS).forEach(key=>out[key]=key==="announcement_enabled"?form.elements[key]?.checked===true:String(data.get(key)??"").trim());
  return out;
}
async function saveConfig(event){
  event.preventDefault();setStatus("Đang lưu cấu hình…");
  try{
    const result=await rpc("app_admin_save_site_config",{p_token:token(),p_data:collect()});
    currentConfig={...DEFAULTS,...(result?.config||{})};renderForm();setStatus("Đã lưu. Trang công khai và Cổng học viên sẽ nhận cấu hình mới khi tải lại.","success");
  }catch(error){setStatus(error?.message||"Không thể lưu cấu hình.","error")}
}
async function openDialog(){mountDialog();setStatus("Đang tải cấu hình hiện tại…");document.getElementById("adminSiteConfigDialog").showModal();try{await loadConfig();setStatus("")}catch(e){setStatus(e?.message||"Không tải được cấu hình.","error")}}
function addButtons(){
  const account=document.querySelector(".topbar .account");
  if(account&&!document.getElementById("adminSiteConfigBtn")){
    const b=document.createElement("button");b.id="adminSiteConfigBtn";b.className="admin-site-open";b.type="button";b.textContent="Cấu hình website";b.onclick=openDialog;
    const tuition=document.getElementById("adminTuitionSettingsBtn"),password=document.getElementById("changePasswordBtn");
    tuition?tuition.insertAdjacentElement("afterend",b):password?account.insertBefore(b,password):account.append(b);
  }
  const menu=document.getElementById("mobileAdminAccountMenu");
  if(menu&&!document.getElementById("adminSiteConfigMobileBtn")){
    const b=document.createElement("button");b.id="adminSiteConfigMobileBtn";b.type="button";b.textContent="Cấu hình website";b.onclick=()=>{menu.classList.add("hidden");openDialog()};
    const danger=menu.querySelector(".danger");danger?menu.insertBefore(b,danger):menu.append(b);
  }
  if(!document.getElementById("adminSiteConfigFloatingBtn")){
    const b=document.createElement("button");b.id="adminSiteConfigFloatingBtn";b.className="admin-site-floating";b.type="button";b.textContent="⚙ Cấu hình website";b.onclick=openDialog;document.body.append(b);
  }
}
function mountAuthorized(){const app=document.getElementById("app");if(!app||app.classList.contains("hidden"))return false;mountDialog();addButtons();mounted=true;return true}
async function ensureAdmin(){
  if(mounted){addButtons();return}
  const t=token();if(!t||checkingRole)return;
  const name=document.getElementById("accountName");if(/\badmin\b/i.test(name?.textContent||"")){confirmedAdmin=true;mountAuthorized();return}
  if(confirmedAdmin){mountAuthorized();return}
  checkingRole=true;try{const me=await rpc("app_me",{p_token:t});confirmedAdmin=me?.role==="admin";if(confirmedAdmin)mountAuthorized()}catch{}finally{checkingRole=false}
}
const observer=new MutationObserver(ensureAdmin);observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true,attributeFilter:["class"]});
window.addEventListener("pageshow",ensureAdmin);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")ensureAdmin()});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensureAdmin,{once:true});else ensureAdmin();
let attempts=0;const timer=setInterval(()=>{attempts++;ensureAdmin();if(mounted||attempts>=30)clearInterval(timer)},1000);
