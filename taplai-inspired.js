function mountOnlineBanner(){
  if(document.querySelector('.td-online-banner'))return;
  const anchor=document.querySelector('.stats-section')||document.querySelector('.schedule-section');
  if(!anchor)return;
  const section=document.createElement('section');
  section.className='td-online-banner';
  section.innerHTML=`
    <div class="td-online-banner__copy">
      <div class="td-online-banner__icon">600</div>
      <div>
        <p>HỌC LÝ THUYẾT ONLINE</p>
        <h2>Ôn 600 câu và thi thử ngay trên hệ thống Thầy Đạt</h2>
        <span>Học miễn phí, lưu tiến độ khi đăng nhập và theo dõi kết quả trên cùng một hệ thống đào tạo.</span>
      </div>
    </div>
    <div class="td-online-banner__actions">
      <a href="/600-cau-hoi.html">Học 600 câu</a>
      <a href="/dang-nhap.html">Đăng nhập học viên</a>
    </div>`;
  anchor.insertAdjacentElement('afterend',section);
}

function mountMobileActions(){
  if(document.querySelector('.td-mobile-actionbar'))return;
  const bar=document.createElement('div');
  bar.className='td-mobile-actionbar';
  bar.setAttribute('aria-label','Liên hệ nhanh');
  bar.innerHTML=`<a href="https://zalo.me/0984811037" target="_blank" rel="noopener noreferrer">Nhắn Zalo</a><a href="#dang-ky">Đăng ký ngay</a>`;
  document.body.append(bar);
}

function stabilizeMobileControls(){
  const update=()=>{
    const active=document.activeElement;
    const editing=active&&/^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName);
    document.body.classList.toggle('td-mobile-input-active',Boolean(editing));
  };
  document.addEventListener('focusin',update);
  document.addEventListener('focusout',()=>window.setTimeout(update,0));
}

function improveHeaderLabels(){
  const brand=document.querySelector('.site-header .brand span');
  if(brand){
    const strong=brand.querySelector('strong');
    const small=brand.querySelector('small');
    if(strong)strong.textContent='HỌC LÁI XE CÙNG ĐẠT';
    if(small)small.textContent='Rõ lộ trình · Vững tay lái';
  }
  const eyebrow=document.querySelector('.hero .eyebrow');
  if(eyebrow)eyebrow.textContent='HỌC LÁI XE CÙNG ĐẠT · ĐÀO TẠO & ĐỒNG HÀNH';
}

function addTheoryNav(){
  const nav=document.querySelector('.site-header nav');
  if(!nav||nav.querySelector('[data-td-theory-link]'))return;
  const link=document.createElement('a');
  link.href='/600-cau-hoi.html';
  link.dataset.tdTheoryLink='true';
  link.textContent='Học 600 câu';
  const contact=nav.querySelector('a[href="#dang-ky"]');
  contact?nav.insertBefore(link,contact):nav.append(link);
}

function initTaplaiInspired(){
  if(location.pathname!=='/dang-ky-hoc-lai-xe.html')return;
  document.body.classList.add('td-taplai-inspired');
  improveHeaderLabels();
  addTheoryNav();
  mountOnlineBanner();
  mountMobileActions();
  stabilizeMobileControls();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initTaplaiInspired,{once:true});
else initTaplaiInspired();
