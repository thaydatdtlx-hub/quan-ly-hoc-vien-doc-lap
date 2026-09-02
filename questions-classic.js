const $=id=>document.getElementById(id);

function ensureCandidateStrip(main){
  let strip=document.querySelector('.theory-candidate-strip');
  if(strip)return strip;
  strip=document.createElement('div');
  strip.className='theory-candidate-strip';
  strip.innerHTML=`
    <div class="theory-candidate-photo" aria-hidden="true"></div>
    <div class="theory-candidate-info">
      <small>Thông tin thí sinh</small>
      <strong>Học viên</strong>
      <span>SBD: Tự luyện · Hạng: theo tài khoản · Bộ 600 câu hỏi</span>
    </div>
    <div class="theory-candidate-brand">
      <img src="/logo-thay-dat-compact.webp?v=15" alt="">
      <div><strong>HỌC LÁI XE CÙNG ĐẠT</strong><span>MÔ PHỎNG SÁT HẠCH LÝ THUYẾT</span></div>
    </div>`;
  main.append(strip);
  return strip;
}

function buildClassicShell(){
  const workspace=$('studyWorkspace');
  if(!workspace||workspace.dataset.classicReady==='1')return;
  const head=workspace.querySelector('.workspace-head');
  const body=workspace.querySelector('.workspace-body');
  const paletteDialog=$('paletteDialog');
  const palette=$('questionPalette');
  const timer=$('examTimer');
  const finish=$('finishExamBtn');
  if(!head||!body||!paletteDialog||!palette)return;

  const shell=document.createElement('div');
  shell.className='theory-classic-shell';
  const main=document.createElement('div');
  main.className='theory-classic-main';
  const rail=document.createElement('aside');
  rail.className='theory-classic-rail';
  rail.setAttribute('aria-label','Bảng điều hướng câu hỏi');
  rail.innerHTML=`
    <div class="theory-rail-clock">
      <span>THỜI GIAN CÒN LẠI:</span>
      <div class="theory-practice-mode">TỰ LUYỆN</div>
    </div>
    <div class="theory-rail-legend">
      <span><i class="is-done"></i>Đã trả lời</span>
      <span><i class="is-current"></i>Hiện tại</span>
      <span><i class="is-flagged"></i>Đánh dấu</span>
    </div>
    <div class="theory-rail-palette-host"></div>
    <div class="theory-rail-actions"></div>`;

  body.parentNode.insertBefore(shell,body);
  shell.append(main,rail);
  main.append(body);
  ensureCandidateStrip(main);

  const paletteHost=rail.querySelector('.theory-rail-palette-host');
  const actions=rail.querySelector('.theory-rail-actions');
  paletteHost.append(palette);

  const practiceEnd=document.createElement('button');
  practiceEnd.type='button';
  practiceEnd.className='theory-practice-end';
  practiceEnd.textContent='Kết thúc';
  practiceEnd.onclick=()=>$('backHomeBtn')?.click();
  actions.append(practiceEnd);

  paletteDialog.dataset.paletteDetached='1';
  workspace.dataset.classicReady='1';
  syncResponsiveControls();
  syncMode();
}

function syncResponsiveControls(){
  const tools=document.querySelector('.workspace-tools');
  const clock=document.querySelector('.theory-rail-clock');
  const actions=document.querySelector('.theory-rail-actions');
  const timer=$('examTimer');
  const finish=$('finishExamBtn');
  const paletteBtn=$('openPaletteBtn');
  const practiceEnd=document.querySelector('.theory-practice-end');
  if(!tools||!clock||!actions)return;

  if(window.innerWidth<=900){
    if(timer&&timer.parentElement!==tools)tools.insertBefore(timer,paletteBtn||tools.firstChild);
    if(finish&&finish.parentElement!==tools)tools.append(finish);
  }else{
    if(timer&&timer.parentElement!==clock)clock.append(timer);
    if(finish&&finish.parentElement!==actions)actions.insertBefore(finish,practiceEnd||actions.firstChild);
  }
}

function syncMode(){
  const timer=$('examTimer');
  const finish=$('finishExamBtn');
  const mode=document.querySelector('.theory-practice-mode');
  const practiceEnd=document.querySelector('.theory-practice-end');
  if(mode&&timer)mode.classList.toggle('hidden',!timer.classList.contains('hidden'));
  if(practiceEnd&&finish)practiceEnd.classList.toggle('hidden',!finish.classList.contains('hidden'));
}

function makeMobilePaletteWork(){
  const open=$('openPaletteBtn');
  const dialog=$('paletteDialog');
  const palette=$('questionPalette');
  if(!open||!dialog||!palette||open.dataset.classicBound==='1')return;
  open.dataset.classicBound='1';
  open.addEventListener('click',()=>{
    if(window.innerWidth>900)return;
    if(palette.parentElement!==dialog){
      const target=dialog.querySelector('.palette-legend');
      if(target)target.insertAdjacentElement('afterend',palette);
      else dialog.append(palette);
    }
  },true);
  dialog.addEventListener('close',()=>{
    if(window.innerWidth>900)restoreDesktopPalette();
  });
}

function restoreDesktopPalette(){
  if(window.innerWidth<=900)return;
  const palette=$('questionPalette');
  const host=document.querySelector('.theory-rail-palette-host');
  if(host&&palette&&palette.parentElement!==host)host.append(palette);
}

function handleResize(){
  syncResponsiveControls();
  syncMode();
  restoreDesktopPalette();
}

function boot(){
  document.body.classList.add('theory-classic-ready');
  buildClassicShell();
  makeMobilePaletteWork();
  handleResize();

  const workspace=$('studyWorkspace');
  if(workspace){
    const observer=new MutationObserver(()=>{
      syncResponsiveControls();
      syncMode();
      if(!workspace.classList.contains('hidden'))restoreDesktopPalette();
    });
    observer.observe(workspace,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  window.addEventListener('resize',handleResize,{passive:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
