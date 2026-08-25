import "./platform-professional.css";

const BRAND={
  name:"HỌC LÁI XE CÙNG ĐẠT",
  shortName:"HỌC LÁI XE CÙNG ĐẠT",
  descriptor:"Đào tạo và hỗ trợ học viên lái xe",
  studentPortal:"Cổng học viên",
  adminPortal:"Trung tâm điều hành đào tạo",
  phone:"0984 811 037",
  phoneHref:"tel:0984811037",
  zaloHref:"https://zalo.me/0984811037",
  website:"www.hoclaixecungdat.com"
};

const qs=(selector,root=document)=>root.querySelector(selector);
const qsa=(selector,root=document)=>[...root.querySelectorAll(selector)];
const byId=id=>document.getElementById(id);
const text=(selector,value,root=document)=>{const node=qs(selector,root);if(node&&node.textContent!==value)node.textContent=value;return node};
const attr=(selector,name,value,root=document)=>{const node=qs(selector,root);if(node&&node.getAttribute(name)!==value)node.setAttribute(name,value);return node};
const normalize=value=>String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
const initials=value=>String(value||"").trim().split(/\s+/).filter(Boolean).slice(-2).map(part=>part[0]).join("").toUpperCase()||"HV";
const isHidden=node=>!node||node.hidden||node.classList.contains("hidden")||getComputedStyle(node).display==="none";

function icon(name){
  const paths={
    home:'<path d="M3 11.5 12 4l9 7.5"></path><path d="M5.5 10.5V20h13v-9.5"></path><path d="M9.5 20v-5h5v5"></path>',
    users:'<circle cx="9" cy="8" r="3.5"></circle><path d="M3 20v-1.5A5.5 5.5 0 0 1 8.5 13h1A5.5 5.5 0 0 1 15 18.5V20"></path><path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 14a4.5 4.5 0 0 1 3.5 4.4V20"></path>',
    wallet:'<path d="M4 7.5V6a2 2 0 0 1 2-2h12v4"></path><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z"></path>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12A2.5 2.5 0 0 1 6.5 3Z"></path>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path>',
    check:'<circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L16 9"></path>',
    alert:'<path d="M12 3 2.8 20h18.4L12 3Z"></path><path d="M12 9v4M12 17h.01"></path>',
    user:'<circle cx="12" cy="8" r="4"></circle><path d="M4.5 21a7.5 7.5 0 0 1 15 0"></path>',
    clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"></rect><path d="M9 4V2h6v2M8.5 11h7M8.5 15h5"></path>',
    car:'<path d="m5 17-2-2v-4l2-5h14l2 5v4l-2 2Z"></path><path d="M5 11h14M7 17v2M17 17v2"></path><circle cx="7" cy="14" r="1"></circle><circle cx="17" cy="14" r="1"></circle>',
    settings:'<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V3h4v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"></path>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path>',
    shield:'<path d="M12 3 5 6v5c0 4.8 2.9 8.2 7 10 4.1-1.8 7-5.2 7-10V6l-7-3Z"></path><path d="m9 12 2 2 4-4"></path>',
    receipt:'<path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z"></path><path d="M9 8h6M9 12h6M9 16h4"></path>',
    phone:'<path d="M6.5 3h3l1.2 4-2 1.5a15 15 0 0 0 6.8 6.8l1.5-2 4 1.2v3A2.5 2.5 0 0 1 18.5 20C10.5 20 4 13.5 4 5.5A2.5 2.5 0 0 1 6.5 3Z"></path>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"></path>',
    arrow:'<path d="M5 12h14M14 7l5 5-5 5"></path>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name]||paths.home}</svg>`;
}

function pageKind(){
  if(byId("registrationForm"))return"public";
  if(byId("studentPortal"))return"student";
  if(byId("app"))return"admin";
  return"other";
}

function updateMeta(){
  const kind=pageKind();
  if(kind==="student"){
    document.title=`${BRAND.studentPortal} · ${BRAND.name}`;
    attr('meta[name="description"]',"content","Cổng học viên Học lái xe cùng Đạt: theo dõi hồ sơ, học phí, lịch đào tạo, điểm danh và tiến độ học tập.");
    attr('meta[name="apple-mobile-web-app-title"]',"content","Học lái xe cùng Đạt");
  }else if(kind==="admin"){
    document.title=`${BRAND.adminPortal} · ${BRAND.name}`;
    attr('meta[name="description"]',"content","Hệ thống quản lý học viên, học phí, lịch đào tạo và tiến độ học tập của Học lái xe cùng Đạt.");
    attr('meta[name="apple-mobile-web-app-title"]',"content","Học lái xe cùng Đạt");
  }else if(kind==="public"){
    attr('meta[property="og:title"]',"content",`${BRAND.name} · B tự động, B số sàn, C1`);
  }
}

function normalizeBrand(){
  document.documentElement.dataset.professionalUi="20260825";
  document.body.classList.add("professional-ui");
  updateMeta();

  text(".intro-brand strong",BRAND.name);
  text(".intro-brand small",BRAND.descriptor);
  text(".mobile-brand strong",BRAND.name);
  text(".mobile-brand span",BRAND.descriptor);
  text(".intro-vip-badge","CỔNG HỌC VIÊN & QUẢN LÝ");
  text(".login-heading .eyebrow","CỔNG HỌC LÁI XE CÙNG ĐẠT");

  text("#app .brand-copy .eyebrow",BRAND.name);
  text("#app .brand-copy .system-badge","HỆ THỐNG QUẢN LÝ ĐÀO TẠO");
  text("#app .brand-copy .brand-slogan","Rõ lộ trình · Minh bạch học phí · Đồng hành xuyên suốt");
  const legacyLink=qs("#app .brand-copy .brand-link");
  if(legacyLink){legacyLink.href="https://www.hoclaixecungdat.com";legacyLink.textContent=`🌐 ${BRAND.website}`}
  text("#app .mobile-app-brand strong",BRAND.name);
  text("#app .mobile-app-brand small","Quản lý đào tạo");

  text(".student-brand strong",BRAND.name);
  text(".student-brand small",BRAND.studentPortal);
  text(".mobile-app-brand strong",BRAND.name);

  text(".site-header .brand strong",BRAND.name);
  text(".site-header .brand small","Đào tạo rõ ràng · Đồng hành tận tâm");
  text(".hero .eyebrow",BRAND.name);
  text("footer .footer-brand strong",BRAND.name);
  text("footer .footer-brand small","Đồng hành cùng học viên trong toàn bộ lộ trình");

  qsa(".contact-footer__brand strong").forEach(node=>node.textContent=BRAND.name);
  qsa(".contact-footer__brand span").forEach(node=>node.textContent="Hỗ trợ trực tiếp qua Zalo và điện thoại");
  qsa(".contact-footer").forEach(footer=>footer.setAttribute("data-brand-consistent","true"));
}

function scrollToTarget(selector){
  const target=typeof selector==="string"?qs(selector):selector;
  if(!target)return false;
  target.scrollIntoView({behavior:"smooth",block:"start"});
  target.classList.add("professional-focus-ring");
  window.setTimeout(()=>target.classList.remove("professional-focus-ring"),1000);
  return true;
}

function clickProxy(id){
  const target=byId(id);
  if(!target||isHidden(target))return false;
  target.click();
  return true;
}

function openStudentFinance(){
  qs('[data-student-finance-tab="payment"]')?.click();
  return scrollToTarget(qs("#studentFinanceHub")||qs("#studentPayment"));
}

function sidebarItemMarkup(item){
  const tag=item.href?"a":"button";
  const href=item.href?` href="${item.href}"`:"";
  const target=item.target?` data-professional-target="${item.target}"`:"";
  const action=item.action?` data-professional-action="${item.action}"`:"";
  return `<${tag} class="professional-nav-item"${href}${target}${action}${item.external?' target="_blank" rel="noopener noreferrer"':""}><span>${icon(item.icon)}</span><strong>${item.label}</strong>${item.badge?`<b id="${item.badge}" class="professional-nav-badge" hidden>0</b>`:""}</${tag}>`;
}

function makeSidebar(kind){
  const id=kind==="student"?"studentProfessionalSidebar":"adminProfessionalSidebar";
  if(byId(id))return byId(id);
  const isStudent=kind==="student";
  const items=isStudent?[
    {label:"Tổng quan",icon:"home",target:".student-hero"},
    {label:"Học lý thuyết",icon:"book",href:"/600-cau-hoi.html"},
    {label:"Lịch đào tạo",icon:"calendar",href:"/lich-dao-tao.html"},
    {label:"Học phí",icon:"wallet",action:"student-finance"},
    {label:"Điểm danh",icon:"clipboard",target:"#studentAttendance"},
    {label:"Đăng ký lịch",icon:"car",target:"#trainingBooking"},
    {label:"Hồ sơ cá nhân",icon:"user",target:".profile-panel"},
    {label:"Thông báo",icon:"bell",action:"student-notifications",badge:"professionalStudentNoticeBadge"}
  ]:[
    {label:"Tổng quan",icon:"home",target:"#dashboardMain"},
    {label:"Học viên",icon:"users",target:"#dashboardMain > .panel"},
    {label:"Tài chính",icon:"wallet",target:"#financeDashboard"},
    {label:"Lý thuyết",icon:"book",target:"#theoryDashboard"},
    {label:"Điểm danh",icon:"clipboard",target:"#attendanceDashboard"},
    {label:"Cảnh báo sớm",icon:"alert",target:"#earlyWarningDashboard"},
    {label:"Lịch đào tạo",icon:"calendar",href:"/lich-dao-tao.html"},
    {label:"An toàn dữ liệu",icon:"shield",action:"admin-operations"}
  ];

  const sidebar=document.createElement("aside");
  sidebar.id=id;
  sidebar.className="professional-sidebar";
  sidebar.setAttribute("aria-label",isStudent?"Điều hướng cổng học viên":"Điều hướng quản trị");
  sidebar.innerHTML=`
    <div class="professional-sidebar-brand"><img src="/logo-thay-dat-compact.webp?v=15" alt=""><div><strong>${BRAND.name}</strong><small>${isStudent?BRAND.studentPortal:"Quản lý đào tạo"}</small></div></div>
    <div class="professional-sidebar-profile"><span id="${isStudent?"professionalStudentInitials":"professionalAdminInitials"}">${isStudent?"HV":"QT"}</span><div><strong id="${isStudent?"professionalStudentName":"professionalAdminName"}">${isStudent?"Học viên":"Tài khoản quản lý"}</strong><small id="${isStudent?"professionalStudentRole":"professionalAdminRole"}">${isStudent?"Đang học":"Quản trị hệ thống"}</small></div></div>
    <nav>${items.map(sidebarItemMarkup).join("")}</nav>
    <div class="professional-sidebar-support"><span>${icon("phone")}</span><div><small>Cần hỗ trợ?</small><a href="${BRAND.zaloHref}" target="_blank" rel="noopener noreferrer">Zalo ${BRAND.phone}</a></div></div>`;

  const host=isStudent?document.body:byId("app");
  host?.append(sidebar);
  document.body.classList.add(isStudent?"professional-student-shell":"professional-admin-shell");
  bindSidebar(sidebar,kind);
  updateSidebarProfile(kind);
  installSectionTracking(sidebar);
  return sidebar;
}

function bindSidebar(sidebar,kind){
  if(sidebar.dataset.bound==="1")return;
  sidebar.dataset.bound="1";
  sidebar.addEventListener("click",event=>{
    const control=event.target.closest("a,button");
    if(!control)return;
    const target=control.dataset.professionalTarget;
    const action=control.dataset.professionalAction;
    if(target){event.preventDefault();scrollToTarget(target)}
    if(action){
      event.preventDefault();
      if(action==="student-finance")openStudentFinance();
      if(action==="student-notifications")clickProxy("studentNotificationBtn");
      if(action==="admin-operations")clickProxy("operationsBtn");
    }
  });
}

function updateSidebarProfile(kind){
  if(kind==="student"){
    const name=byId("studentName")?.textContent?.trim()||"Học viên";
    const role=byId("studentLicense")?.textContent?.trim()||"Đang học";
    text("#professionalStudentName",name);
    text("#professionalStudentInitials",initials(name));
    text("#professionalStudentRole",role);
    const source=byId("studentNotificationBadge");
    const badge=byId("professionalStudentNoticeBadge");
    if(badge&&source){badge.textContent=source.textContent||"0";badge.hidden=source.classList.contains("hidden")||Number(source.textContent||0)<=0}
  }else{
    const raw=byId("accountName")?.textContent?.trim()||"Tài khoản quản lý";
    const name=raw.replace(/\s*·.*$/u,"");
    text("#professionalAdminName",name);
    text("#professionalAdminInitials",initials(name));
    text("#professionalAdminRole",/admin/i.test(raw)?"Quản trị hệ thống":"Tài khoản quản lý");
  }
}

function installSectionTracking(sidebar){
  if(sidebar.dataset.tracking==="1"||!("IntersectionObserver"in window))return;
  sidebar.dataset.tracking="1";
  const targets=qsa("[data-professional-target]",sidebar).map(item=>({item,target:qs(item.dataset.professionalTarget)})).filter(entry=>entry.target);
  if(!targets.length)return;
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    targets.forEach(({item,target})=>item.classList.toggle("active",target===visible.target));
  },{rootMargin:"-18% 0px -62% 0px",threshold:[.05,.25,.5]});
  targets.forEach(({target})=>observer.observe(target));
}

function mountAdminCommandCenter(){
  const main=byId("dashboardMain"),toolbar=qs("#dashboardMain > .toolbar");
  if(!main||!toolbar||byId("professionalAdminCommandCenter"))return;
  const section=document.createElement("section");
  section.id="professionalAdminCommandCenter";
  section.className="professional-command-center";
  section.innerHTML=`<div><p>TRUNG TÂM ĐIỀU HÀNH</p><h2>Quản lý đào tạo tập trung</h2><span>Theo dõi học viên, học phí, lịch học và cảnh báo trên một giao diện thống nhất.</span></div><div class="professional-command-actions"><button type="button" data-command="add"><span>${icon("users")}</span>Thêm học viên</button><button type="button" data-command="tools" aria-expanded="false"><span>${icon("settings")}</span>Công cụ quản trị</button></div>`;
  main.insertBefore(section,toolbar);
  section.addEventListener("click",event=>{
    const command=event.target.closest("[data-command]")?.dataset.command;
    if(command==="add")clickProxy("addStudentBtn");
    if(command==="tools"){
      const open=document.body.classList.toggle("professional-tools-open");
      event.target.closest("[data-command]")?.setAttribute("aria-expanded",String(open));
      if(open)toolbar.scrollIntoView({behavior:"smooth",block:"nearest"});
    }
  });
}

function configureMobileNavigation(){
  const kind=pageKind();
  if(kind==="student"){
    const nav=qs("body > .mobile-bottom-nav");
    const items=nav?[...nav.children]:[];
    if(items[3]){
      const item=items[3];
      item.removeAttribute("data-mobile-click");
      item.dataset.professionalAction="student-finance";
      item.innerHTML=`<span class="professional-mobile-icon">${icon("wallet")}</span><small>Học phí</small>`;
    }
    if(items[4]){
      const item=items[4];
      item.dataset.mobileAction="student-more";
      item.innerHTML=`<span class="professional-mobile-icon">${icon("user")}</span><small>Tài khoản</small>`;
    }
    if(nav&&nav.dataset.professionalBound!=="1"){
      nav.dataset.professionalBound="1";
      nav.addEventListener("click",event=>{
        const action=event.target.closest("[data-professional-action]")?.dataset.professionalAction;
        if(action==="student-finance"){event.preventDefault();openStudentFinance()}
      });
    }
  }
  if(kind==="admin"){
    const nav=qs("#app > .mobile-bottom-nav");
    const items=nav?[...nav.children]:[];
    if(items[4]){
      items[4].dataset.mobileAction="admin-more";
      items[4].innerHTML=`<span class="professional-mobile-icon">${icon("user")}</span><small>Tài khoản</small>`;
    }
  }
}

function mountLoginTrust(){
  const card=qs(".login-card"),heading=qs(".login-heading");
  if(!card||!heading||byId("professionalLoginTrust"))return;
  const trust=document.createElement("div");
  trust.id="professionalLoginTrust";
  trust.className="professional-login-trust";
  trust.innerHTML=`<span>${icon("lock")} Tài khoản riêng</span><span>${icon("shield")} Bảo vệ dữ liệu</span><span>${icon("phone")} Hỗ trợ Zalo</span>`;
  heading.insertAdjacentElement("afterend",trust);
}

function mountPublicTrust(){
  const hero=qs(".hero"),form=byId("registrationForm");
  if(!hero||!form)return;
  document.body.classList.add("professional-public-shell");

  if(!byId("professionalTrustStrip")){
    const strip=document.createElement("section");
    strip.id="professionalTrustStrip";
    strip.className="professional-trust-strip";
    strip.setAttribute("aria-label","Cam kết hỗ trợ học viên");
    strip.innerHTML=`
      <article><span>${icon("phone")}</span><div><strong>Liên hệ chính thức</strong><small>Hotline/Zalo ${BRAND.phone}</small></div></article>
      <article><span>${icon("receipt")}</span><div><strong>Thông tin học phí rõ ràng</strong><small>Khoản thu và phiếu thu được theo dõi tập trung</small></div></article>
      <article><span>${icon("calendar")}</span><div><strong>Theo dõi toàn bộ lộ trình</strong><small>Lịch học, DAT, cabin và lịch thi trên tài khoản</small></div></article>
      <article><span>${icon("shield")}</span><div><strong>Tôn trọng dữ liệu cá nhân</strong><small>Thông tin đăng ký chỉ dùng để tư vấn và hỗ trợ</small></div></article>`;
    hero.insertAdjacentElement("afterend",strip);
  }

  const registrationSection=form.closest(".registration-section")||form.parentElement;
  if(registrationSection&&!byId("professionalTrustEvidence")){
    const section=document.createElement("section");
    section.id="professionalTrustEvidence";
    section.className="professional-trust-evidence";
    section.innerHTML=`<div class="professional-trust-heading"><p>AN TÂM TRƯỚC KHI ĐĂNG KÝ</p><h2>Thông tin rõ ràng, hỗ trợ xuyên suốt</h2><span>Học viên có thể kiểm tra tiến độ, lịch đào tạo, công nợ và phiếu thu trên hệ thống sau khi được tạo tài khoản.</span></div><div class="professional-evidence-grid">
      <article><span>${icon("receipt")}</span><strong>Phiếu thu điện tử</strong><small>Lưu lịch sử các lần đóng học phí để thuận tiện đối chiếu.</small></article>
      <article><span>${icon("calendar")}</span><strong>Lịch đào tạo tập trung</strong><small>Theo dõi các mốc lý thuyết, thực hành, DAT, cabin và lịch thi.</small></article>
      <article><span>${icon("phone")}</span><strong>Hỗ trợ trực tiếp</strong><small>Liên hệ qua Zalo hoặc điện thoại khi cần tư vấn hồ sơ và lịch học.</small></article>
      <article><span>${icon("shield")}</span><strong>Chính sách dữ liệu</strong><small>Có thể yêu cầu chỉnh sửa hoặc xóa thông tin đã cung cấp.</small></article>
    </div><div class="professional-trust-actions"><a href="${BRAND.zaloHref}" target="_blank" rel="noopener noreferrer">Nhắn Zalo tư vấn</a><a href="/chinh-sach-bao-mat.html" target="_blank" rel="noopener noreferrer">Xem chính sách dữ liệu</a></div>`;
    registrationSection.insertAdjacentElement("beforebegin",section);
  }

  const formCard=qs(".registration-form-card",form)||qs(".registration-form-card")||form;
  if(formCard&&!byId("professionalFormAssurance")){
    const note=document.createElement("div");
    note.id="professionalFormAssurance";
    note.className="professional-form-assurance";
    note.innerHTML=`<span>${icon("shield")}</span><p><strong>Thông tin của bạn được sử dụng đúng mục đích</strong><small>Chỉ phục vụ liên hệ tư vấn khóa học. Không yêu cầu mật khẩu, mã OTP hoặc thông tin ngân hàng.</small></p>`;
    const firstField=qs(".registration-grid",form)||form.firstElementChild;
    firstField?.insertAdjacentElement("beforebegin",note);
  }
}

function mountRuntimeGuard(){
  const kind=pageKind();
  if(kind!=="student"||byId("professionalRuntimeGuard"))return;
  const guard=document.createElement("div");
  guard.id="professionalRuntimeGuard";
  guard.className="professional-runtime-guard";
  guard.hidden=true;
  guard.innerHTML=`<span>${icon("alert")}</span><div><strong>Dữ liệu đang tải lâu hơn dự kiến</strong><small>Phiên đăng nhập vẫn được giữ. Hãy thử tải lại nếu nội dung chưa xuất hiện.</small></div><button type="button">Tải lại</button>`;
  document.body.append(guard);
  guard.querySelector("button").addEventListener("click",()=>location.reload());
  window.setTimeout(()=>{
    const portal=byId("studentPortal"),loading=byId("studentLoading");
    guard.hidden=!(portal?.classList.contains("hidden")&&!loading?.classList.contains("hidden"));
  },12000);
  window.addEventListener("student-profile-ready",()=>{guard.hidden=true});
}

function mountAdminWhenVisible(){
  const app=byId("app");
  if(!app)return;
  const mount=()=>{
    if(app.classList.contains("hidden"))return;
    makeSidebar("admin");
    mountAdminCommandCenter();
    configureMobileNavigation();
    updateSidebarProfile("admin");
  };
  mount();
  if(app.dataset.professionalObserver!=="1"){
    app.dataset.professionalObserver="1";
    const observer=new MutationObserver(mount);
    observer.observe(app,{attributes:true,attributeFilter:["class"]});
  }
}

function mountStudent(){
  makeSidebar("student");
  configureMobileNavigation();
  updateSidebarProfile("student");
  window.setTimeout(()=>{updateSidebarProfile("student");makeSidebar("student")},500);
}

function syncOnlineState(){document.body.classList.toggle("professional-offline",!navigator.onLine)}

function mountAll(){
  normalizeBrand();
  mountLoginTrust();
  mountPublicTrust();
  mountRuntimeGuard();
  const kind=pageKind();
  if(kind==="student")mountStudent();
  if(kind==="admin")mountAdminWhenVisible();
  configureMobileNavigation();
  syncOnlineState();
}

let mountTimer=0;
function scheduleMount(delay=0){clearTimeout(mountTimer);mountTimer=window.setTimeout(mountAll,delay)}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>scheduleMount(0),{once:true});
else scheduleMount(0);
window.addEventListener("student-profile-ready",()=>scheduleMount(0));
window.addEventListener("student-functions-ready",()=>scheduleMount(0));
window.addEventListener("pageshow",()=>scheduleMount(50));
window.addEventListener("online",syncOnlineState);
window.addEventListener("offline",syncOnlineState);
[350,1200,2600].forEach(delay=>window.setTimeout(()=>scheduleMount(0),delay));
