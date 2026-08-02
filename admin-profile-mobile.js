const PROFILE_KEY="thaydat_admin_profile_v1";

function ensureMobileAdminProfileStyle(){
  if(document.querySelector('link[data-admin-profile-mobile]'))return;
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href="/admin-profile-mobile.css?v=1";
  link.dataset.adminProfileMobile="true";
  document.head.append(link);
}

function initials(name){
  return String(name||"Admin").trim().split(/\s+/).slice(-2).map(part=>part[0]||"").join("").toUpperCase()||"AD";
}

function readProfile(){
  try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}")}
  catch{return{}}
}

function syncMobileAdminIdentity(){
  const avatar=document.getElementById("mobileAdminAccountBtn");
  const name=document.getElementById("mobileAdminAccountName");
  if(!avatar&&!name)return;

  const profile=readProfile();
  const displayName=profile.display_name||"Trần Quốc Đạt";
  if(name)name.textContent=displayName;
  if(avatar){
    avatar.setAttribute("aria-label","Mở tài khoản và cài đặt Admin");
    avatar.innerHTML=profile.avatar
      ?`<img src="${String(profile.avatar).replace(/"/g,"&quot;")}" alt="Ảnh Admin">`
      :initials(displayName);
  }
}

function openAdminProfile(){
  const menu=document.getElementById("mobileAdminAccountMenu");
  menu?.classList.add("hidden");

  const summary=document.getElementById("adminProfileSummary");
  if(summary){summary.click();return}

  const dialog=document.getElementById("adminProfileDialog");
  if(dialog&&!dialog.open)dialog.showModal();
}

function mountMobileAdminSettings(){
  const menu=document.getElementById("mobileAdminAccountMenu");
  if(!menu||document.getElementById("mobileAdminProfileBtn"))return false;

  const button=document.createElement("button");
  button.id="mobileAdminProfileBtn";
  button.type="button";
  button.className="mobile-admin-profile-btn";
  button.innerHTML='<span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0M18 3v4M16 5h4"/></svg></span><span><strong>Cài đặt Admin</strong><small>Thông tin, ảnh đại diện và ảnh nền</small></span>';
  button.addEventListener("click",openAdminProfile);

  const changePassword=menu.querySelector('[data-mobile-click="changePasswordBtn"]');
  menu.insertBefore(button,changePassword||menu.querySelector("button"));
  syncMobileAdminIdentity();
  return true;
}

function bootMobileAdminProfile(){
  ensureMobileAdminProfileStyle();
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const mounted=mountMobileAdminSettings();
    if(mounted||attempts>120)clearInterval(timer);
  },150);

  const observer=new MutationObserver(()=>{
    mountMobileAdminSettings();
    syncMobileAdminIdentity();
  });
  observer.observe(document.body,{childList:true,subtree:true});

  window.addEventListener("storage",event=>{
    if(event.key===PROFILE_KEY)syncMobileAdminIdentity();
  });

  document.addEventListener("click",event=>{
    if(event.target.closest("#saveAdminProfile"))setTimeout(syncMobileAdminIdentity,250);
  });
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootMobileAdminProfile,{once:true});
else bootMobileAdminProfile();
