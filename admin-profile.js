const PROFILE_KEY="thaydat_admin_profile_v1";
const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";

const defaults={
  display_name:"Trần Quốc Đạt",
  title:"Admin",
  phone:"0984811037",
  email:"thaydat.dtlx@gmail.com",
  zalo:"0984811037",
  website:"https://daotaolaixe-thaydat.vercel.app/",
  bio:"Quản trị hệ thống đào tạo lái xe Thầy Đạt.",
  avatar:"",
  cover:"",
  cover_position:"center"
};

const getToken=()=>localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));

async function rpc(fn,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||data?.error||"Không thể kết nối máy chủ");
  return data;
}

function localProfile(){
  try{return {...defaults,...JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}")}}
  catch{return {...defaults}}
}

function saveLocal(profile){localStorage.setItem(PROFILE_KEY,JSON.stringify(profile))}

function initials(name){
  return String(name||"Admin").trim().split(/\s+/).slice(-2).map(part=>part[0]||"").join("").toUpperCase()||"AD";
}

function ensureStyle(){
  if(document.querySelector('link[href*="admin-profile.css"]'))return;
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href="/admin-profile.css?v=1";
  document.head.append(link);
}

function dialogMarkup(){
  return `<dialog id="adminProfileDialog" class="admin-profile-dialog">
    <form id="adminProfileForm" method="dialog">
      <header class="admin-profile-head">
        <div class="admin-profile-head-copy">
          <span class="admin-profile-head-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0M18 3v4M16 5h4"/></svg></span>
          <div><p>TÀI KHOẢN HỆ THỐNG</p><h2>Chỉnh sửa thông tin Admin</h2></div>
        </div>
        <button class="admin-profile-close" type="button" aria-label="Đóng">×</button>
      </header>
      <div class="admin-profile-body">
        <aside class="admin-profile-media">
          <section class="admin-profile-preview-card">
            <small>Ảnh đại diện</small>
            <div id="adminAvatarPreview" class="admin-avatar-preview">AD</div>
            <div class="admin-profile-upload">
              <label for="adminAvatarFile">Chọn ảnh JPG, PNG hoặc WebP</label>
              <input id="adminAvatarFile" type="file" accept="image/jpeg,image/png,image/webp">
              <div class="admin-profile-image-actions"><button id="removeAdminAvatar" type="button">Xóa ảnh</button></div>
            </div>
          </section>
          <section class="admin-profile-preview-card">
            <small>Ảnh nền đầu trang</small>
            <div id="adminCoverPreview" class="admin-cover-preview">Ảnh nền khu vực tài khoản Admin</div>
            <div class="admin-profile-upload">
              <label for="adminCoverFile">Ảnh ngang, tối thiểu 1200 × 360 px</label>
              <input id="adminCoverFile" type="file" accept="image/jpeg,image/png,image/webp">
              <div class="admin-profile-image-actions"><button id="removeAdminCover" type="button">Khôi phục mặc định</button></div>
            </div>
          </section>
          <div id="adminProfileSync" class="admin-profile-sync"><strong>Đang kiểm tra đồng bộ…</strong><span>Dữ liệu sẽ được lưu an toàn cho tài khoản Admin.</span></div>
        </aside>
        <section class="admin-profile-fields">
          <label>Họ và tên hiển thị<input id="adminDisplayName" maxlength="80" required></label>
          <label>Chức danh<input id="adminTitle" maxlength="80" placeholder="Admin · Giảng viên"></label>
          <label>Số điện thoại<input id="adminPhone" inputmode="tel" maxlength="20"></label>
          <label>Email<input id="adminEmail" type="email" maxlength="120"></label>
          <label>Zalo<input id="adminZalo" maxlength="30"></label>
          <label>Website<input id="adminWebsite" type="url" maxlength="200"></label>
          <label>Vị trí ảnh nền<select id="adminCoverPosition"><option value="center">Ở giữa</option><option value="top">Phía trên</option><option value="bottom">Phía dưới</option></select></label>
          <label class="wide">Giới thiệu ngắn<textarea id="adminBio" maxlength="300" placeholder="Thông tin giới thiệu về Admin"></textarea></label>
          <div class="admin-profile-help">Ảnh được tự động nén để tải nhanh. Thông tin hiển thị tại khu vực tài khoản và phần đầu trang quản trị.</div>
          <p id="adminProfileError" class="admin-profile-error" role="alert"></p>
          <div class="admin-profile-actions"><button class="admin-profile-cancel" type="button">Hủy</button><button id="saveAdminProfile" class="primary" type="submit">Lưu thông tin Admin</button></div>
        </section>
      </div>
    </form>
  </dialog>`;
}

async function compressImage(file,maxWidth,maxHeight,quality=.82){
  if(!file)return"";
  if(file.size>8*1024*1024)throw new Error("Ảnh phải nhỏ hơn 8 MB.");
  const bitmap=await createImageBitmap(file);
  const ratio=Math.min(1,maxWidth/bitmap.width,maxHeight/bitmap.height);
  const width=Math.max(1,Math.round(bitmap.width*ratio));
  const height=Math.max(1,Math.round(bitmap.height*ratio));
  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  canvas.getContext("2d").drawImage(bitmap,0,0,width,height);
  bitmap.close?.();
  return canvas.toDataURL("image/webp",quality);
}

function setPreview(id,image,fallback){
  const host=document.getElementById(id);
  if(!host)return;
  host.innerHTML=image?`<img src="${esc(image)}" alt="">`:esc(fallback);
}

function applyProfile(profile){
  const topbar=document.querySelector(".topbar");
  if(topbar){
    topbar.classList.toggle("admin-profile-cover",Boolean(profile.cover));
    if(profile.cover)topbar.style.setProperty("--admin-cover-image",`url("${profile.cover.replace(/"/g,"%22")}")`);
    else topbar.style.removeProperty("--admin-cover-image");
    topbar.style.setProperty("--admin-cover-position",profile.cover_position||"center");
  }
  const summary=document.getElementById("adminProfileSummary");
  if(summary){
    summary.querySelector(".admin-profile-avatar").innerHTML=profile.avatar?`<img src="${esc(profile.avatar)}" alt="Ảnh Admin">`:esc(initials(profile.display_name));
    summary.querySelector("strong").textContent=profile.display_name||defaults.display_name;
    summary.querySelector("small").textContent=profile.title||"Admin";
  }
  const mobileName=document.getElementById("mobileAdminAccountName");
  if(mobileName)mobileName.textContent=profile.display_name||defaults.display_name;
}

function fillForm(profile){
  const values={adminDisplayName:profile.display_name,adminTitle:profile.title,adminPhone:profile.phone,adminEmail:profile.email,adminZalo:profile.zalo,adminWebsite:profile.website,adminCoverPosition:profile.cover_position,adminBio:profile.bio};
  Object.entries(values).forEach(([id,value])=>{const node=document.getElementById(id);if(node)node.value=value||""});
  setPreview("adminAvatarPreview",profile.avatar,initials(profile.display_name));
  setPreview("adminCoverPreview",profile.cover,"Ảnh nền khu vực tài khoản Admin");
}

async function loadRemote(){
  const token=getToken();
  if(!token)throw new Error("Không có phiên đăng nhập");
  const result=await rpc("app_admin_get_profile",{p_token:token});
  return {...defaults,...(result||{})};
}

async function saveRemote(profile){
  const token=getToken();
  if(!token)throw new Error("Không có phiên đăng nhập");
  return await rpc("app_admin_save_profile",{p_token:token,p_profile:profile});
}

function profileFromForm(current){
  return {
    ...current,
    display_name:document.getElementById("adminDisplayName").value.trim(),
    title:document.getElementById("adminTitle").value.trim(),
    phone:document.getElementById("adminPhone").value.trim(),
    email:document.getElementById("adminEmail").value.trim(),
    zalo:document.getElementById("adminZalo").value.trim(),
    website:document.getElementById("adminWebsite").value.trim(),
    cover_position:document.getElementById("adminCoverPosition").value,
    bio:document.getElementById("adminBio").value.trim()
  };
}

function waitForAdmin(){
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const account=document.querySelector(".topbar .account");
    const name=document.getElementById("accountName");
    const isAdmin=name?.textContent.includes("Admin");
    if(account&&isAdmin){clearInterval(timer);mount(account,name)}
    else if(attempts>100)clearInterval(timer);
  },150);
}

async function mount(account,nameNode){
  ensureStyle();
  if(document.getElementById("adminProfileDialog"))return;
  document.body.insertAdjacentHTML("beforeend",dialogMarkup());
  const summary=document.createElement("button");
  summary.id="adminProfileSummary";
  summary.type="button";
  summary.className="admin-profile-summary";
  summary.innerHTML=`<span class="admin-profile-avatar">AD</span><span class="admin-profile-summary-copy"><strong>Admin</strong><small>Hồ sơ quản trị</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>`;
  nameNode.classList.add("hidden");
  account.insertBefore(summary,document.getElementById("notificationBtn"));

  const dialog=document.getElementById("adminProfileDialog");
  const form=document.getElementById("adminProfileForm");
  const error=document.getElementById("adminProfileError");
  const sync=document.getElementById("adminProfileSync");
  let profile=localProfile();
  let remoteAvailable=false;
  applyProfile(profile);fillForm(profile);

  try{
    profile=await loadRemote();
    saveLocal(profile);remoteAvailable=true;
    sync.classList.remove("is-local");
    sync.innerHTML="<strong>Đồng bộ nhiều thiết bị</strong><span>Thông tin được lưu trong hệ thống và dùng chung cho tài khoản Admin.</span>";
  }catch{
    sync.classList.add("is-local");
    sync.innerHTML="<strong>Đang lưu trên thiết bị này</strong><span>Chạy file SQL hồ sơ Admin để bật đồng bộ giữa các thiết bị.</span>";
  }
  applyProfile(profile);fillForm(profile);

  summary.onclick=()=>{error.textContent="";fillForm(profile);dialog.showModal()};
  dialog.querySelector(".admin-profile-close").onclick=()=>dialog.close();
  dialog.querySelector(".admin-profile-cancel").onclick=()=>dialog.close();

  document.getElementById("adminAvatarFile").onchange=async event=>{
    try{profile.avatar=await compressImage(event.target.files[0],600,600,.84);setPreview("adminAvatarPreview",profile.avatar,initials(profile.display_name))}
    catch(err){error.textContent=err.message}
  };
  document.getElementById("adminCoverFile").onchange=async event=>{
    try{profile.cover=await compressImage(event.target.files[0],1800,700,.82);setPreview("adminCoverPreview",profile.cover,"Ảnh nền khu vực tài khoản Admin")}
    catch(err){error.textContent=err.message}
  };
  document.getElementById("removeAdminAvatar").onclick=()=>{profile.avatar="";setPreview("adminAvatarPreview","",initials(document.getElementById("adminDisplayName").value))};
  document.getElementById("removeAdminCover").onclick=()=>{profile.cover="";setPreview("adminCoverPreview","","Ảnh nền khu vực tài khoản Admin")};
  document.getElementById("adminDisplayName").oninput=()=>{if(!profile.avatar)setPreview("adminAvatarPreview","",initials(document.getElementById("adminDisplayName").value))};

  form.onsubmit=async event=>{
    event.preventDefault();error.textContent="";
    const button=document.getElementById("saveAdminProfile");
    profile=profileFromForm(profile);
    if(!profile.display_name){error.textContent="Vui lòng nhập họ và tên hiển thị.";return}
    button.disabled=true;button.textContent="Đang lưu…";
    try{
      saveLocal(profile);
      if(remoteAvailable)await saveRemote(profile);
      else{try{await saveRemote(profile);remoteAvailable=true}catch{}}
      applyProfile(profile);
      dialog.close();
      document.getElementById("toast")&&(document.getElementById("toast").textContent="Đã cập nhật thông tin Admin",document.getElementById("toast").classList.add("show"),setTimeout(()=>document.getElementById("toast")?.classList.remove("show"),2500));
    }catch(err){error.textContent=err.message||"Không thể lưu thông tin Admin."}
    finally{button.disabled=false;button.textContent="Lưu thông tin Admin"}
  };
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",waitForAdmin,{once:true});
else waitForAdmin();
