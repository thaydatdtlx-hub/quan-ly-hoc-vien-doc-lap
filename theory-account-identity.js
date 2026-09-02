import "./theory-account-identity.css";
import {studentRpc} from "./student-rpc-client.js";

const PAGE_PATH="/600-cau-hoi.html";
const TOKEN_KEY="hv_token";
const KIND_KEY="hv_auth_kind";

function getSession(){
  const localToken=localStorage.getItem(TOKEN_KEY)||"";
  const sessionToken=sessionStorage.getItem(TOKEN_KEY)||"";
  const token=localToken||sessionToken;
  const store=localToken?localStorage:sessionStorage;
  return{token,store,kind:store.getItem(KIND_KEY)||""};
}

function clearSession(){
  for(const store of [localStorage,sessionStorage]){
    store.removeItem(TOKEN_KEY);
    store.removeItem(KIND_KEY);
  }
}

async function rpc(fn,body={}){
  // Dùng đường trực tiếp trước để vẫn xác minh được các hàm hồ sơ chưa có trong proxy.
  return studentRpc(fn,body,{proxyTimeoutMs:6500,directTimeoutMs:4500});
}

function esc(value){
  return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
}

function initials(value){
  const words=String(value||"HV").trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).map(word=>word[0]||"").join("").toUpperCase()||"HV";
}

function shortName(value){
  const words=String(value||"Học viên").trim().split(/\s+/).filter(Boolean);
  return words.length>2?words.slice(-2).join(" "):words.join(" ");
}

function invalidSessionError(error){
  return /phiên đăng nhập.*(?:không hợp lệ|hết hạn)|invalid.*session|session.*expired/i.test(error?.message||"");
}

async function resolveIdentity(token){
  let studentError=null;
  try{
    const me=await rpc("app_student_me",{p_token:token});
    if(me?.role==="student"){
      let profile=null;
      try{profile=await rpc("app_student_portal",{p_token:token})}catch{}
      return{
        kind:"student",
        role:"Học viên",
        name:profile?.name||me.full_name||me.username||"Học viên",
        username:me.username||"",
        studentCode:profile?.student_code||"",
        course:profile?.course||"",
        licenseClass:profile?.license_class||"",
        photo:profile?.photo_data||"",
        href:"/hoc-vien.html",
        action:"Mở hồ sơ học viên",
        logoutFn:"app_student_logout",
        syncText:"Tiến độ học và kết quả thi được lưu vào tài khoản này."
      };
    }
    if(me?.role==="public_theory"){
      return{
        kind:"public_theory",
        role:"Tài khoản tự học 600 câu",
        name:me.full_name||me.username||"Người học",
        username:me.username||"",
        studentCode:"",
        course:"",
        licenseClass:"",
        photo:"",
        href:"#studyHome",
        action:"Tiếp tục học",
        logoutFn:"app_student_logout",
        syncText:"Tiến độ học và lịch sử thi thử được đồng bộ với tài khoản này."
      };
    }
  }catch(error){studentError=error}

  try{
    const me=await rpc("app_me",{p_token:token});
    const admin=me?.role==="admin";
    return{
      kind:"manager",
      role:admin?"Quản trị viên":"Tài khoản quản lý",
      name:me?.username||"Tài khoản quản lý",
      username:me?.username||"",
      studentCode:"",
      course:"",
      licenseClass:"",
      photo:"",
      href:"/?login=1",
      action:"Về Dashboard",
      logoutFn:"app_logout",
      syncText:admin?"Bạn đang xem trang học lý thuyết bằng tài khoản quản trị.":"Bạn đang xem trang học lý thuyết bằng tài khoản quản lý."
    };
  }catch(managerError){
    if(invalidSessionError(studentError)&&invalidSessionError(managerError))clearSession();
    throw managerError||studentError;
  }
}

function ensureBanner(){
  let wrapper=document.getElementById("theoryAccountIdentityWrap");
  if(wrapper)return wrapper;
  const header=document.querySelector(".quiz-topbar");
  if(!header)return null;

  wrapper=document.createElement("div");
  wrapper.id="theoryAccountIdentityWrap";
  wrapper.className="theory-account-identity-wrap";
  wrapper.hidden=true;
  wrapper.innerHTML=`
    <section id="theoryAccountIdentity" class="theory-account-identity" aria-live="polite" aria-label="Thông tin tài khoản đang đăng nhập">
      <div class="theory-account-avatar" aria-hidden="true">
        <span id="theoryAccountAvatarText">HV</span>
        <img id="theoryAccountAvatarImage" alt="" hidden>
        <i></i>
      </div>
      <div class="theory-account-copy">
        <small class="theory-account-kicker"><b></b>BẠN ĐANG ĐĂNG NHẬP</small>
        <strong id="theoryAccountName">Đang kiểm tra tài khoản…</strong>
        <span id="theoryAccountMeta"></span>
        <em id="theoryAccountSync"></em>
      </div>
      <div class="theory-account-actions">
        <a id="theoryAccountOpen" href="#studyHome">Tiếp tục học</a>
        <button id="theoryAccountLogout" type="button">Đăng xuất</button>
      </div>
    </section>`;
  header.insertAdjacentElement("afterend",wrapper);
  return wrapper;
}

function setStoredKind(session,kind){
  if(!session.token)return;
  session.store.setItem(KIND_KEY,kind);
  const other=session.store===localStorage?sessionStorage:localStorage;
  if(other.getItem(TOKEN_KEY)===session.token)other.setItem(KIND_KEY,kind);
}

function hideGenericLogin(){
  document.querySelectorAll('.quiz-topbar nav a[href="/?login=1"],.quiz-topbar nav a[href="/dang-nhap.html"]').forEach(link=>{
    link.hidden=true;
    link.classList.add("theory-login-link-hidden");
  });
}

function updateNativeStatus(identity){
  const status=document.getElementById("theoryAccountStatus");
  if(!status)return;
  if(status.classList.contains("local")||/lưu trên thiết bị|chưa đồng bộ/i.test(status.textContent||"")){
    status.className="theory-sync-status synced";
    status.textContent=`Đã đăng nhập · ${shortName(identity.name)}`;
  }
  status.title=`Đang đăng nhập: ${identity.name}`;
}

function renderIdentity(identity,session){
  const wrapper=ensureBanner();
  if(!wrapper)return;
  const meta=[identity.role];
  if(identity.studentCode)meta.push(identity.studentCode);
  if(identity.course)meta.push(identity.course);
  if(identity.licenseClass)meta.push(`Hạng ${identity.licenseClass}`);
  if(identity.username&&identity.kind!=="student")meta.push(`@${identity.username}`);

  const avatarText=document.getElementById("theoryAccountAvatarText");
  const avatarImage=document.getElementById("theoryAccountAvatarImage");
  avatarText.textContent=initials(identity.name);
  if(identity.photo){
    avatarImage.src=identity.photo;
    avatarImage.hidden=false;
    avatarText.hidden=true;
  }else{
    avatarImage.removeAttribute("src");
    avatarImage.hidden=true;
    avatarText.hidden=false;
  }

  document.getElementById("theoryAccountName").textContent=identity.name;
  document.getElementById("theoryAccountMeta").textContent=meta.filter(Boolean).join(" · ");
  document.getElementById("theoryAccountSync").textContent=identity.syncText;
  const open=document.getElementById("theoryAccountOpen");
  open.href=identity.href;
  open.textContent=identity.action;

  const logout=document.getElementById("theoryAccountLogout");
  logout.onclick=async()=>{
    logout.disabled=true;
    logout.textContent="Đang đăng xuất…";
    try{await rpc(identity.logoutFn,{p_token:session.token})}catch{}
    clearSession();
    location.replace("/?login=1");
  };

  setStoredKind(session,identity.kind);
  document.body.dataset.theorySession="active";
  document.body.dataset.theorySessionKind=identity.kind;
  hideGenericLogin();
  updateNativeStatus(identity);
  wrapper.hidden=false;
}

async function bootTheoryIdentity(){
  if(location.pathname!==PAGE_PATH)return;
  const session=getSession();
  if(!session.token)return;
  const wrapper=ensureBanner();
  if(wrapper){
    wrapper.hidden=false;
    wrapper.classList.add("is-checking");
  }
  try{
    const identity=await resolveIdentity(session.token);
    renderIdentity(identity,session);
  }catch(error){
    console.warn("[theory-account-identity] Không thể xác minh phiên đăng nhập.",error);
    if(wrapper)wrapper.hidden=true;
  }finally{
    wrapper?.classList.remove("is-checking");
  }
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootTheoryIdentity,{once:true});
else void bootTheoryIdentity();
window.addEventListener("pageshow",()=>void bootTheoryIdentity());
