function replaceClass(node,from,to){
  if(!node)return null;
  if(from)node.classList.remove(from);
  if(to)node.classList.add(to);
  return node;
}

function normalizedLoginText(value){
  return String(value||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
}

function hideLegacyLoginInsertions(login){
  login.querySelectorAll(".system-status,.professional-login-trust,#professionalLoginTrust,.intro-new-student-cta,.intro-refresh-cta,.intro-vip-badge").forEach(node=>node.remove());
}

function buildFeatureCards(intro){
  const features=intro?.querySelector(".intro-features,.login-v20-features");
  if(!features)return;
  replaceClass(features,"intro-features","login-v20-features");
  if(features.dataset.v20Built==="1")return;
  features.dataset.v20Built="1";
  features.innerHTML=`
    <article class="login-v20-feature"><span class="login-v20-feature-icon" aria-hidden="true">▣</span><strong>Học tập<br>trực tuyến</strong></article>
    <article class="login-v20-feature"><span class="login-v20-feature-icon" aria-hidden="true">▥</span><strong>Theo dõi<br>tiến độ</strong></article>
    <article class="login-v20-feature"><span class="login-v20-feature-icon" aria-hidden="true">▦</span><strong>Lịch học<br>chủ động</strong></article>`;
}

function setFlatAction(node,{kind,icon,title,subtitle="",href=""}){
  if(!node)return;
  node.className=`login-v28-row login-v28-${kind}`;
  if(href&&node.tagName==="A")node.href=href;
  const next=`<span class="login-v28-icon" aria-hidden="true">${icon}</span><span class="login-v28-text">${title}${subtitle?`<small class="login-v28-sub">${subtitle}</small>`:""}</span><span class="login-v28-arrow" aria-hidden="true">→</span>`;
  if(node.dataset.v28Markup!==next){
    node.innerHTML=next;
    node.dataset.v28Markup=next;
  }
}

function normalizePublicTheoryRegister(card){
  const register=card?.querySelector("#openPublicRegisterBtn");
  if(!register)return;
  setFlatAction(register,{
    kind:"theory",
    icon:"＋",
    title:"Tạo tài khoản học 600 câu",
    subtitle:"Dành cho người học chưa phải học viên Thầy Đạt"
  });
}

function courseRegistrationCandidates(card){
  if(!card)return[];
  return [...card.querySelectorAll("a,button")].filter(node=>{
    if(node.id==="openPublicRegisterBtn")return false;
    const href=node.getAttribute?.("href")||"";
    const text=normalizedLoginText(node.textContent);
    return href.includes("dang-ky-hoc-lai-xe")||text.includes("dang ky hoc lai xe moi");
  });
}

function ensureCourseRegistration(card){
  if(!card)return;
  let link=card.querySelector("#loginCourseRegistrationBtn");
  if(!link)link=courseRegistrationCandidates(card).find(node=>node.tagName==="A")||null;
  if(!link)link=document.createElement("a");
  link.id="loginCourseRegistrationBtn";
  setFlatAction(link,{
    kind:"course",
    icon:"🚘",
    title:"Đăng ký học lái xe mới",
    subtitle:"B tự động · B số sàn · C1 · nhận tư vấn lộ trình",
    href:"/dang-ky-hoc-lai-xe.html"
  });
  courseRegistrationCandidates(card).forEach(node=>{if(node!==link)node.remove()});
  const publicRegister=card.querySelector("#openPublicRegisterBtn");
  const zalo=card.querySelector(".zalo-contact,.login-v20-zalo,.login-v27-zalo,.login-v28-zalo");
  if(publicRegister&&link.nextElementSibling!==publicRegister)publicRegister.insertAdjacentElement("beforebegin",link);
  else if(!publicRegister&&zalo&&link.nextElementSibling!==zalo)zalo.insertAdjacentElement("beforebegin",link);
  else if(!publicRegister&&!zalo&&!link.isConnected)card.append(link);
}

function normalizeZalo(card){
  const zalo=card?.querySelector(".zalo-contact,.login-v20-zalo,.login-v27-zalo,.login-v28-zalo");
  if(!zalo)return;
  setFlatAction(zalo,{kind:"zalo",icon:"Z",title:"Cần hỗ trợ? Liên hệ qua Zalo"});
}

function sanitizeDynamicLogin(login){
  if(!login)return;
  hideLegacyLoginInsertions(login);
  const card=document.getElementById("loginForm");
  normalizePublicTheoryRegister(card);
  ensureCourseRegistration(card);
  normalizeZalo(card);
}

function isolateLogin(){
  const login=document.getElementById("login");
  if(!login)return;
  login.classList.remove("login-page");
  login.classList.add("login-v20");
  const syncBody=()=>document.body.classList.toggle("login-v20-active",!login.classList.contains("hidden"));
  syncBody();
  replaceClass(login.querySelector(".skip-link,.login-v20-skip"),"skip-link","login-v20-skip");
  replaceClass(login.querySelector(".login-shell,.login-v20-shell"),"login-shell","login-v20-shell");
  replaceClass(login.querySelector(".login-layout,.login-v20-layout"),"login-layout","login-v20-layout");
  const intro=replaceClass(login.querySelector(".login-intro,.login-v20-intro"),"login-intro","login-v20-intro");
  const brand=replaceClass(intro?.querySelector(".intro-brand,.login-v20-brand"),"intro-brand","login-v20-brand");
  replaceClass(brand?.querySelector(".intro-mark,.login-v20-mark"),"intro-mark","login-v20-mark");
  const brandCopy=brand?.querySelector(":scope > div,.login-v20-brand-copy");
  if(brandCopy){brandCopy.className="login-v20-brand-copy";brandCopy.innerHTML="<strong>HỌC LÁI XE CÙNG ĐẠT</strong><small>ĐÀO TẠO VÀ HỖ TRỢ HỌC VIÊN LÁI XE</small>"}
  buildFeatureCards(intro);
  replaceClass(intro?.querySelector(".intro-hero-visual,.login-v20-car-stage"),"intro-hero-visual","login-v20-car-stage");
  const card=document.getElementById("loginForm");
  if(card){card.classList.remove("login-card");card.classList.add("login-v20-card")}
  replaceClass(card?.querySelector(".login-lock,.login-v20-logo"),"login-lock","login-v20-logo");
  replaceClass(card?.querySelector(".mobile-brand,.login-v20-mobile-brand"),"mobile-brand","login-v20-mobile-brand");
  const heading=replaceClass(card?.querySelector(".login-heading,.login-v20-heading"),"login-heading","login-v20-heading");
  if(heading){replaceClass(heading.querySelector(".eyebrow,.login-v20-eyebrow"),"eyebrow","login-v20-eyebrow");const muted=heading.querySelector(".muted");if(muted){muted.classList.remove("muted");muted.textContent="Chào mừng bạn trở lại!"}}
  card?.querySelectorAll(".login-label,.login-v20-label").forEach(node=>replaceClass(node,"login-label","login-v20-label"));
  card?.querySelectorAll(".input-shell,.login-v20-input").forEach(node=>replaceClass(node,"input-shell","login-v20-input"));
  replaceClass(card?.querySelector(".password-toggle,.login-v20-eye"),"password-toggle","login-v20-eye");
  replaceClass(card?.querySelector(".login-options,.login-v20-options"),"login-options","login-v20-options");
  replaceClass(card?.querySelector(".remember-option,.login-v20-remember"),"remember-option","login-v20-remember");
  const error=document.getElementById("loginError");if(error){error.classList.remove("error","login-error");error.classList.add("login-v20-error")}
  const submit=document.getElementById("loginBtn");if(submit){submit.classList.remove("primary","login-submit");submit.classList.add("login-v20-submit")}
  replaceClass(card?.querySelector(".login-divider,.login-v20-divider"),"login-divider","login-v20-divider");
  replaceClass(card?.querySelector(".login-register,.login-v20-register-note"),"login-register","login-v20-register-note");
  replaceClass(card?.querySelector(".login-security,.login-v20-security"),"login-security","login-v20-security");
  sanitizeDynamicLogin(login);
  if(login.dataset.v20Observed!=="1"){
    login.dataset.v20Observed="1";
    const observer=new MutationObserver(records=>{
      if(records.some(record=>record.type==="attributes"&&record.target===login))syncBody();
      if(records.some(record=>record.type==="childList"&&record.addedNodes.length))sanitizeDynamicLogin(login);
    });
    observer.observe(login,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  }
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",isolateLogin,{once:true});
else isolateLogin();
window.addEventListener("pageshow",isolateLogin);
