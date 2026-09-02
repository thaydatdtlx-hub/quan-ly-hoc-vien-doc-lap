const $=id=>document.getElementById(id);
const SUPABASE_URL='https://pkzxkvcncipfszeukpwu.supabase.co';
const SUPABASE_KEY='sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo';

function ensureCandidatePhotoStyle(){
  if(document.getElementById('theoryCandidatePhotoStyle'))return;
  const style=document.createElement('style');
  style.id='theoryCandidatePhotoStyle';
  style.textContent=`
    .theory-candidate-photo.has-photo:before,.theory-candidate-photo.has-photo:after{display:none!important;content:none!important}
    .theory-candidate-photo img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 22%}
  `;
  document.head.append(style);
}

function ensurePaletteLayoutStyle(){
  if(document.getElementById('theoryPaletteLayoutStyle'))return;
  const style=document.createElement('style');
  style.id='theoryPaletteLayoutStyle';
  style.textContent=`
    @supports selector(body:has(*)){
      body.theory-classic-ready:has(#studyWorkspace:not(.hidden)) .theory-rail-palette-host .question-palette.classic-exam-palette{
        grid-auto-flow:column!important;
        grid-template-rows:repeat(15,36px)!important;
        grid-template-columns:repeat(var(--classic-palette-columns,2),minmax(0,1fr))!important;
        grid-auto-columns:minmax(0,1fr)!important;
        align-content:start!important;
      }
      body.theory-classic-ready:has(#studyWorkspace:not(.hidden)) .theory-rail-palette-host .question-palette.classic-exam-palette button{
        height:36px!important;
        min-height:36px!important;
      }
    }
    @media(max-width:900px){
      @supports selector(body:has(*)){
        body.theory-classic-ready:has(#studyWorkspace:not(.hidden)) #paletteDialog[open] .question-palette.classic-exam-palette{
          grid-auto-flow:column!important;
          grid-template-rows:repeat(15,42px)!important;
          grid-template-columns:repeat(var(--classic-palette-columns,2),minmax(86px,1fr))!important;
          grid-auto-columns:minmax(86px,1fr)!important;
          align-content:start!important;
          max-height:70vh!important;
          overflow:auto!important;
        }
      }
    }
  `;
  document.head.append(style);
}

function ensureCandidateStrip(main){
  let strip=document.querySelector('.theory-candidate-strip');
  if(strip)return strip;
  strip=document.createElement('div');
  strip.className='theory-candidate-strip';
  strip.innerHTML=`
    <div class="theory-candidate-photo" data-candidate-photo aria-label="Ảnh học viên"></div>
    <div class="theory-candidate-info">
      <small>Thông tin thí sinh</small>
      <strong data-candidate-name>Học viên</strong>
      <span data-candidate-meta>SBD: Tự luyện · Hạng: theo tài khoản · Bộ 600 câu hỏi</span>
    </div>
    <div class="theory-candidate-brand">
      <img src="/logo-thay-dat-compact.webp?v=15" alt="">
      <div><strong>HỌC LÁI XE CÙNG ĐẠT</strong><span>MÔ PHỎNG SÁT HẠCH LÝ THUYẾT</span></div>
    </div>`;
  main.append(strip);
  return strip;
}

function currentToken(){
  return localStorage.getItem('hv_token')||sessionStorage.getItem('hv_token')||'';
}

function currentAuthKind(){
  return localStorage.getItem('hv_auth_kind')||sessionStorage.getItem('hv_auth_kind')||'';
}

async function candidateRpc(fn,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:'POST',
    headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify(body),
    cache:'no-store'
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||data?.error||'Không thể tải hồ sơ học viên');
  return data;
}

function setCandidatePhoto(photoData,name='Học viên'){
  const photo=document.querySelector('[data-candidate-photo]');
  if(!photo)return;
  const validPhoto=typeof photoData==='string'&&(/^data:image\//i.test(photoData)||/^https?:\/\//i.test(photoData));
  photo.replaceChildren();
  photo.classList.toggle('has-photo',validPhoto);
  photo.setAttribute('aria-label',validPhoto?`Ảnh học viên ${name}`:'Chưa có ảnh học viên');
  if(!validPhoto)return;
  const image=document.createElement('img');
  image.src=photoData;
  image.alt=`Ảnh học viên ${name}`;
  image.loading='eager';
  image.decoding='async';
  photo.append(image);
}

function renderCandidateInfo(candidate={}){
  const name=document.querySelector('[data-candidate-name]');
  const meta=document.querySelector('[data-candidate-meta]');
  const studentName=String(candidate.student_name||candidate.full_name||candidate.account_name||'Học viên').trim()||'Học viên';
  const studentCode=String(candidate.student_code||candidate.username||'Tự luyện').trim()||'Tự luyện';
  const licenseClass=String(candidate.license_class||'Chưa cập nhật').trim()||'Chưa cập nhật';
  const course=String(candidate.course||'').trim();
  if(name)name.textContent=studentName.toUpperCase();
  if(meta){
    const parts=[`SBD: ${studentCode}`,`Hạng: ${licenseClass}`];
    if(course)parts.push(`Khóa: ${course}`);
    parts.push('Bộ 600 câu hỏi');
    meta.textContent=parts.join(' · ');
  }
  setCandidatePhoto(candidate.photo_data,studentName);
}

async function loadCandidateInfo(){
  ensureCandidatePhotoStyle();
  const token=currentToken();
  if(!token){
    renderCandidateInfo({student_name:'Học viên',student_code:'Tự luyện',license_class:'Chưa đăng nhập'});
    return;
  }

  const authKind=currentAuthKind();
  try{
    if(authKind==='public_theory'){
      const me=await candidateRpc('app_student_me',{p_token:token});
      renderCandidateInfo({
        student_name:me.full_name||'Người học',
        student_code:me.username||'Tự luyện',
        license_class:'Tự luyện'
      });
      return;
    }

    const candidate=await candidateRpc('app_student_exam_candidate',{p_token:token});
    renderCandidateInfo(candidate);
  }catch(error){
    try{
      const me=await candidateRpc('app_student_me',{p_token:token});
      renderCandidateInfo({
        student_name:me.full_name||'Học viên',
        student_code:me.username||'Tự luyện',
        license_class:me.role==='student'?'Theo hồ sơ học viên':'Tự luyện'
      });
    }catch{
      renderCandidateInfo({student_name:'Học viên',student_code:'Tự luyện',license_class:'Chưa xác định'});
    }
  }
}

function isClassicExamMode(){
  const kicker=String($('workspaceKicker')?.textContent||'').toUpperCase();
  return kicker.includes('THI THỬ')||kicker.includes('XEM LẠI BÀI THI');
}

function syncPaletteLayout(){
  const palette=$('questionPalette');
  if(!palette)return;
  const buttons=[...palette.querySelectorAll('[data-palette-index]')];
  const examMode=isClassicExamMode()&&buttons.length>0;
  palette.classList.toggle('classic-exam-palette',examMode);
  if(!examMode){
    palette.style.removeProperty('--classic-palette-columns');
    return;
  }

  const columns=Math.max(1,Math.ceil(buttons.length/15));
  palette.style.setProperty('--classic-palette-columns',String(columns));
  buttons.forEach((button,index)=>{
    const label=String(index+1);
    if(button.textContent.trim()!==label)button.textContent=label;
    button.setAttribute('aria-label',`Câu ${label}`);
    button.title=`Câu ${label}`;
  });

  const activeIndex=buttons.findIndex(button=>button.classList.contains('current'));
  const questionNumber=$('questionNumber');
  if(questionNumber&&activeIndex>=0){
    const label=`CÂU ${activeIndex+1} / ${buttons.length}`;
    if(questionNumber.textContent!==label)questionNumber.textContent=label;
  }
}

function observePalette(){
  const palette=$('questionPalette');
  if(!palette||palette.dataset.classicPaletteObserved==='1')return;
  palette.dataset.classicPaletteObserved='1';
  let queued=false;
  const queueSync=()=>{
    if(queued)return;
    queued=true;
    queueMicrotask(()=>{
      queued=false;
      syncPaletteLayout();
    });
  };
  const observer=new MutationObserver(queueSync);
  observer.observe(palette,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  syncPaletteLayout();
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
  syncPaletteLayout();
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
  syncPaletteLayout();
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
    syncPaletteLayout();
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
  syncPaletteLayout();
}

function handleResize(){
  syncResponsiveControls();
  syncMode();
  restoreDesktopPalette();
}

function boot(){
  document.body.classList.add('theory-classic-ready');
  ensurePaletteLayoutStyle();
  buildClassicShell();
  observePalette();
  makeMobilePaletteWork();
  handleResize();
  void loadCandidateInfo();

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
  window.addEventListener('storage',event=>{
    if(event.key==='hv_token'||event.key==='hv_auth_kind')void loadCandidateInfo();
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
