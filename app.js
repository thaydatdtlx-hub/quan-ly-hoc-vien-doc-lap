import * as XLSX from "xlsx";
import {embedScheduleInNotes,parseScheduleFromNotes,stripScheduleFromNotes} from "./schedule-data.js";
import {managerNotifications,markNoticesRead,readNoticeIds} from "./account-notifications.js";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
let token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"",authKind=localStorage.getItem("hv_auth_kind")||sessionStorage.getItem("hv_auth_kind")||"",me=null,students=[],users=[],studentAccounts=[],trainingRequests=[],accountNotices=[],serverNotices=[],studentAccountsReady=false,selectedStudentAccount=null,forcePasswordChange=false,currentPhoto="",statFilter="all",notificationTimer=null,excelPreviewFile=null,excelPreviewUrl="",excelImportResolve=null;

async function rpc(fn,body={}){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw new Error(data?.message||data?.details||data?.error||"Không thể kết nối máy chủ");
  return data;
}
function busy(on){$("loading").classList.toggle("hidden",!on)}
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>$("toast").classList.remove("show"),2800)}
function errText(err){return err?.message||"Có lỗi xảy ra. Vui lòng thử lại."}
function normalize(s){return String(s??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function money(n){return new Intl.NumberFormat("vi-VN").format(Number(n||0))+" ₫"}
function toNumber(v){return Number(String(v??0).replace(/[^0-9-]/g,""))||0}
function progressTone(v){const n=normalize(v);if(n.includes("thi rot"))return"fail";if(n.includes("dang"))return"doing";if(n.includes("da hoan thanh")||n==="da dau")return"done";return"pending"}
function progressHtml(s){return `<div class="progress-list"><span class="progress-chip ${progressTone(s.online_status)}"><b>Online</b>${esc(s.online_status||"Chưa hoàn thành")}</span><span class="progress-chip ${progressTone(s.cabin_status)}"><b>Cabin</b>${esc(s.cabin_status||"Chưa hoàn thành")}</span><span class="progress-chip ${progressTone(s.dat_status)}"><b>DAT</b>${esc(s.dat_status||"Chưa thực hiện")}</span><span class="progress-chip ${progressTone(s.graduation_status)}"><b>Tốt nghiệp</b>${esc(s.graduation_status||"Chưa hoàn thành")}</span><span class="progress-chip ${progressTone(s.exam_status)}"><b>Sát hạch</b>${esc(s.exam_status||"Chưa thi sát hạch")}</span></div>`}

async function boot(){
  if(!token)return showLogin();
  try{
    if(authKind==="student"){
      me=await rpc("app_student_me",{p_token:token});
      return location.replace("/hoc-vien.html");
    }
    try{me=await rpc("app_me",{p_token:token})}
    catch{
      me=await rpc("app_student_me",{p_token:token});
      authKind="student";
      return location.replace("/hoc-vien.html");
    }
    if(!me?.id)throw new Error("Phiên đăng nhập hết hạn");
    authKind="manager";
    showApp();
    if(me.role==="admin"){await loadUsers();await loadStudentAccounts()}
    await loadStudents();
    notificationTimer=setInterval(async()=>{
      if(document.visibilityState!=="visible")return;
      await loadServerNotifications();renderAccountNotifications();
    },60000);
    if(me.force_change_password)openForcedPassword();
  }catch(err){clearAuth();showLogin();if(err?.message)$("loginError").textContent=err.message}
}
function clearAuth(){for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}token="";authKind=""}
function saveAuth(remember){for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}const store=remember?localStorage:sessionStorage;store.setItem("hv_token",token);store.setItem("hv_auth_kind",authKind)}
function showLogin(){$("login").classList.remove("hidden");$("app").classList.add("hidden")}
function showApp(){
  $("login").classList.add("hidden");$("app").classList.remove("hidden");
  $("accountName").textContent=me.role==="admin"?`${me.username} · Admin`:me.username;
  document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",me.role!=="admin"));
  $("ownerFilter").classList.toggle("hidden",me.role!=="admin");
  $("studentOwnerWrap").classList.toggle("hidden",me.role!=="admin");
}

$("loginForm").onsubmit=async e=>{
  e.preventDefault();$("loginError").textContent="";$("loginBtn").disabled=true;$("loginBtn").setAttribute("aria-busy","true");$("loginBtn").querySelector("span").textContent="Đang đăng nhập…";
  try{
    const username=$("username").value.trim(),remember=$("rememberLogin").checked;
    let x;
    try{x=await rpc("app_login",{p_username:username,p_password:$("password").value});authKind="manager"}
    catch(managerError){
      try{x=await rpc("app_student_login",{p_username:username,p_password:$("password").value});authKind="student"}
      catch(studentError){
        if(/app_student_login|schema cache|PGRST202/i.test(errText(studentError)))throw managerError;
        throw studentError;
      }
    }
    token=x.token;saveAuth(remember);
    if(remember)localStorage.setItem("hv_saved_user",username);else localStorage.removeItem("hv_saved_user");
    await boot();
  }
  catch(err){$("loginError").textContent=errText(err)}
  finally{$("loginBtn").disabled=false;$("loginBtn").removeAttribute("aria-busy");$("loginBtn").querySelector("span").textContent="Đăng nhập"}
};
$("logoutBtn").onclick=async()=>{busy(true);try{await rpc("app_logout",{p_token:token})}catch{}clearAuth();location.reload()};

async function loadStudents(){
  try{
    students=await rpc("app_list_students",{p_token:token,p_owner_id:me.role==="admin"?($("ownerFilter").value||null):null})||[];
    try{trainingRequests=await rpc("app_list_training_requests",{p_token:token,p_student_id:null})||[]}
    catch(error){if(!/app_list_training_requests|schema cache|PGRST202/i.test(error?.message||""))throw error;trainingRequests=[]}
    const requestsByStudent=new Map();
    for(const request of trainingRequests){
      const key=String(request.student_id),items=requestsByStudent.get(key)||[];
      items.push(request);requestsByStudent.set(key,items);
    }
    students.forEach(student=>student.training_requests=requestsByStudent.get(String(student.id))||[]);
    await loadServerNotifications();
    renderStudents();
    if(students.length&&!Object.prototype.hasOwnProperty.call(students[0],"online_status")&&!sessionStorage.getItem("progress_sql_warning")){sessionStorage.setItem("progress_sql_warning","1");alert("Cơ sở dữ liệu chưa có đủ các mục tiến độ. Admin cần chạy file CAP-NHAT-TIEN-DO.sql trong Supabase SQL Editor.")}
  }
  catch(err){toast(errText(err))}
}
async function loadServerNotifications(){
  try{
    const rows=await rpc("app_list_notifications",{p_token:token})||[];
    serverNotices=rows.map(notice=>({...notice,id:`server-${notice.id}`,server_id:String(notice.id)}));
  }catch(error){
    serverNotices=[];
  }
}
function isNoticeRead(notice,read){return notice.server_id?Boolean(notice.read_at):read.has(notice.id)}
function mergedAccountNotices(){
  const local=managerNotifications(students,me?.role||"user"),serverKeys=new Set(serverNotices.map(notice=>`${notice.title}|${notice.body}`));
  return [...serverNotices,...local.filter(notice=>!serverKeys.has(`${notice.title}|${notice.body}`))];
}
function renderStudents(){
  const q=normalize($("search").value);
  const inStat=s=>statFilter==="all"||(statFilter==="learning"&&!normalize(s.exam_status).includes("da dau"))||(statFilter==="debt"&&(Number(s.tuition_total)||0)>(Number(s.paid)||0));
  const rows=students.filter(s=>inStat(s)&&normalize([s.name,s.cccd,s.phone,s.student_code,s.course].join(" ")).includes(q));
  $("studentRows").innerHTML=rows.map(s=>{
    const account=studentAccounts.find(item=>item.student_id===String(s.id));
    const accountButton=me.role==="admin"&&studentAccountsReady?`<button class="student-account-btn ${account?.active?"is-active":""}" data-student-account="${s.id}">${account?`Tài khoản: ${esc(account.username)}`:"＋ Tạo tài khoản"}</button>`:"";
    return `<tr><td><div class="student-cell">${s.photo_data?`<img class="student-photo" src="${s.photo_data}" alt="Ảnh ${esc(s.name)}">`:`<span class="student-photo empty-photo">Ảnh<br>3×4</span>`}<div><span class="student-name">${esc(s.name)}</span><span class="sub">${esc(s.student_code)}${s.owner_username?` · ${esc(s.owner_username)}`:""}</span>${account?`<span class="student-login-state ${account.active?"active":"locked"}">${account.active?"Có tài khoản học viên":"Tài khoản đang khóa"}</span>`:""}</div></div></td><td>${esc(s.license_class||"—")}<span class="sub">${esc(s.course||"Chưa có khóa")}</span></td><td>${esc(s.phone||"—")}</td><td>${progressHtml(s)}</td><td>${money(s.tuition_total)}<span class="sub">Đã thu ${money(s.paid)} · Còn ${money(Math.max(0,(s.tuition_total||0)-(s.paid||0)))}</span></td><td><div class="row-actions">${accountButton}<button data-edit="${s.id}">Sửa</button>${me.role==="admin"&&s.photo_data?`<button data-download-photo="${s.id}">Tải ảnh</button>`:""}<button class="danger" data-delete="${s.id}">Xóa</button></div></td></tr>`;
  }).join("");
  $("empty").classList.toggle("hidden",rows.length>0);$("resultCount").textContent=`${rows.length} học viên`;
  $("totalStudents").textContent=students.length;
  $("learningStudents").textContent=students.filter(s=>!normalize(s.exam_status).includes("da dau")).length;
  $("debtStudents").textContent=students.filter(s=>(s.tuition_total||0)>(s.paid||0)).length;
  renderFinanceDashboard();
  const labels={all:["Danh sách tất cả học viên","Toàn bộ hồ sơ đang quản lý"],learning:["Học viên đang học","Các học viên chưa đậu kỳ thi sát hạch"],debt:["Học viên còn nợ học phí","Các hồ sơ có số tiền đã thu thấp hơn tổng học phí"]};
  $("studentListTitle").textContent=labels[statFilter][0];$("studentListNote").textContent=labels[statFilter][1];
  document.querySelectorAll("[data-stat-filter]").forEach(card=>{const active=card.dataset.statFilter===statFilter;card.classList.toggle("active",active);card.setAttribute("aria-pressed",String(active))});
  renderAccountNotifications();
}
function renderAccountNotifications(){
  accountNotices=mergedAccountNotices();
  const read=readNoticeIds(me),unread=accountNotices.filter(notice=>!isNoticeRead(notice,read)).length;
  $("notificationBadge").textContent=unread;$("notificationBadge").classList.toggle("hidden",unread===0);
  $("notificationTitle").textContent=me?.role==="admin"?"Thông báo Admin":"Thông báo tài khoản quản lý";
  $("notificationSummary").textContent=`${accountNotices.length} thông báo · ${unread} chưa đọc`;
  $("notificationList").innerHTML=accountNotices.length?accountNotices.map(notice=>`
    <article class="notification-item tone-${esc(notice.tone||"blue")} ${isNoticeRead(notice,read)?"is-read":""}">
      <span class="notification-icon">${esc(notice.icon||"•")}</span>
      <div><strong>${esc(notice.title)}</strong><p>${esc(notice.body)}</p>${notice.href?`<a href="${esc(notice.href)}">${esc(notice.action||"Xem chi tiết")} →</a>`:""}</div>
    </article>`).join(""):`<div class="notification-empty"><span>🔔</span><strong>Chưa có thông báo</strong><p>Các thay đổi quan trọng sẽ hiển thị tại đây.</p></div>`;
}
$("notificationBtn").onclick=async()=>{
  await loadServerNotifications();renderAccountNotifications();
  $("notificationDialog").showModal();
};
$("markNotificationsRead").onclick=async()=>{
  const serverIds=serverNotices.filter(notice=>!notice.read_at).map(notice=>notice.server_id);
  try{
    if(serverIds.length)await rpc("app_mark_notifications_read",{p_token:token,p_ids:serverIds});
    const now=new Date().toISOString();serverNotices.forEach(notice=>notice.read_at=notice.read_at||now);
    markNoticesRead(me,accountNotices.filter(notice=>!notice.server_id));
    renderAccountNotifications();toast("Đã đánh dấu tất cả thông báo là đã đọc");
  }catch(error){toast(errText(error))}
};
function renderFinanceDashboard(){
  if(me?.role!=="admin")return;
  const total=students.reduce((sum,s)=>sum+Math.max(0,Number(s.tuition_total)||0),0);
  const paid=students.reduce((sum,s)=>sum+Math.max(0,Number(s.paid)||0),0);
  const debt=students.reduce((sum,s)=>sum+Math.max(0,(Number(s.tuition_total)||0)-(Number(s.paid)||0)),0);
  const debtCount=students.filter(s=>(Number(s.tuition_total)||0)>(Number(s.paid)||0)).length;
  const rate=total?Math.min(100,Math.round(paid/total*100)):0;
  const selected=$("ownerFilter").selectedOptions[0];
  $("financeTotal").textContent=money(total);
  $("financePaid").textContent=money(paid);
  $("financeDebt").textContent=money(debt);
  $("financeRate").textContent=`Đã thu ${rate}% tổng học phí`;
  $("financeDebtCount").textContent=`${debtCount} học viên còn nợ`;
  $("financeScope").textContent=$("ownerFilter").value?`Tài khoản: ${selected?.textContent||"đang chọn"}`:"Toàn bộ học viên";
}
$("search").oninput=renderStudents;
$("ownerFilter").onchange=loadStudents;
function selectStat(card){statFilter=card.dataset.statFilter;$("search").value="";renderStudents();document.querySelector(".panel").scrollIntoView({behavior:"smooth",block:"start"})}
document.querySelectorAll("[data-stat-filter]").forEach(card=>{card.onclick=()=>selectStat(card);card.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectStat(card)}}});

function setSelect(id,value){const el=$(id),v=value??"";if(v&&![...el.options].some(o=>o.value===v))el.add(new Option(v,v));el.value=v||el.options[0]?.value||""}
function showPhoto(value=""){currentPhoto=value||"";$("photoPreview").src=currentPhoto;$("photoPreview").classList.toggle("hidden",!currentPhoto);$("photoPlaceholder").classList.toggle("hidden",Boolean(currentPhoto))}
async function compressPhoto(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const ratio=img.width/img.height;if(Math.abs(ratio-.75)>.045){URL.revokeObjectURL(url);return reject(new Error("Ảnh không đúng tỷ lệ 3×4. Vui lòng chọn ảnh dọc 3×4 nền trắng."))}const check=document.createElement("canvas"),cw=180,ch=240;check.width=cw;check.height=ch;const cx=check.getContext("2d",{willReadFrequently:true});cx.drawImage(img,0,0,cw,ch);const p=cx.getImageData(0,0,cw,ch).data;let white=0,total=0;for(let y=0;y<ch*.72;y+=3)for(let x=0;x<cw;x+=3)if(y<ch*.18||x<cw*.1||x>cw*.9){const i=(y*cw+x)*4,totalPixel=p[i]+p[i+1]+p[i+2];total++;if(totalPixel>690&&Math.max(p[i],p[i+1],p[i+2])-Math.min(p[i],p[i+1],p[i+2])<32)white++}if(!total||white/total<.58){URL.revokeObjectURL(url);return reject(new Error("Ảnh chưa đạt yêu cầu nền trắng. Vui lòng chọn ảnh thẻ 3×4 có nền trắng rõ ràng."))}const canvas=document.createElement("canvas");canvas.width=450;canvas.height=600;canvas.getContext("2d").drawImage(img,0,0,450,600);URL.revokeObjectURL(url);resolve(canvas.toDataURL("image/jpeg",.82))};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Không đọc được file ảnh"))};img.src=url})}
function openStudent(s=null){
  $("studentForm").reset();$("studentError").textContent="";$("studentId").value=s?.id||"";$("studentTitle").textContent=s?"Sửa thông tin học viên":"Thêm học viên";
  $("name").value=s?.name||"";$("dob").value=s?.date_of_birth||"";$("cccd").value=s?.cccd||"";$("phone").value=s?.phone||"";$("course").value=s?.course||"";$("tuitionTotal").value=s?.tuition_total||"";$("paid").value=s?.paid||"";$("address").value=s?.address||"";$("notes").value=stripScheduleFromNotes(s?.notes||"");$("photoFile").value="";showPhoto(s?.photo_data||"");
  setSelect("licenseClass",s?.license_class||"B số tự động");setSelect("profileStatus",s?.profile_status||"Đã ghi nhận");setSelect("onlineStatus",s?.online_status||"Chưa hoàn thành");setSelect("cabinStatus",s?.cabin_status||"Chưa hoàn thành");setSelect("datStatus",s?.dat_status||"Chưa thực hiện");setSelect("graduationStatus",s?.graduation_status||"Chưa hoàn thành");setSelect("examStatus",s?.exam_status||"Chưa thi sát hạch");
  if(me.role==="admin"){$("studentOwner").value=s?.owner_id||$("ownerFilter").value||me.id;$("studentOwner").disabled=Boolean(s)}
  $("studentDialog").showModal();setTimeout(()=>$("name").focus(),50);
}
$("addStudentBtn").onclick=()=>openStudent();
$("photoFile").onchange=async e=>{const file=e.target.files[0];if(!file)return;const ext=file.name.toLowerCase().split(".").pop(),validType=["image/jpeg","image/png"].includes(file.type)&&["jpg","jpeg","png"].includes(ext);if(!validType){e.target.value="";return $("studentError").textContent="Chỉ chấp nhận file ảnh JPG, JPEG hoặc PNG."}if(file.size>10*1024*1024){e.target.value="";return $("studentError").textContent="Ảnh gốc không được lớn hơn 10 MB."}try{$("studentError").textContent="Đang kiểm tra ảnh 3×4 nền trắng…";showPhoto(await compressPhoto(file));$("studentError").textContent=""}catch(err){e.target.value="";$("studentError").textContent=errText(err)}};
$("removePhotoBtn").onclick=()=>{$("photoFile").value="";showPhoto("")};
$("studentRows").onclick=async e=>{
  const edit=e.target.dataset.edit,del=e.target.dataset.delete,download=e.target.dataset.downloadPhoto,account=e.target.dataset.studentAccount;
  if(account)return openStudentAccount(students.find(s=>String(s.id)===account));
  if(download&&me.role==="admin"){const s=students.find(x=>x.id===download);if(!s?.photo_data)return toast("Học viên chưa có ảnh thẻ");const a=document.createElement("a"),safe=normalize(s.name).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"hoc-vien";a.href=s.photo_data;a.download=`anh-the-3x4-${safe}.jpg`;document.body.appendChild(a);a.click();a.remove();return}
  if(edit)return openStudent(students.find(s=>s.id===edit));
  if(del&&confirm("Anh có chắc muốn xóa học viên này? Dữ liệu đã xóa không thể khôi phục.")){
    busy(true);try{await rpc("app_delete_student",{p_token:token,p_student_id:del});toast("Đã xóa học viên");await loadStudents()}catch(err){toast(errText(err))}finally{busy(false)}
  }
};
$("studentForm").onsubmit=async e=>{
  e.preventDefault();$("studentError").textContent="";
  if(!$("name").value.trim())return $("studentError").textContent="Vui lòng nhập họ và tên.";
  if($("paid").value&&Number($("paid").value)>Number($("tuitionTotal").value||0))return $("studentError").textContent="Số tiền đã thu không được lớn hơn tổng học phí.";
  const current=students.find(s=>s.id===$("studentId").value),schedule=parseScheduleFromNotes(current?.notes||"");
  const data={name:$("name").value.trim(),date_of_birth:$("dob").value||null,cccd:$("cccd").value.trim(),phone:$("phone").value.trim(),license_class:$("licenseClass").value,course:$("course").value.trim(),profile_status:$("profileStatus").value,online_status:$("onlineStatus").value,cabin_status:$("cabinStatus").value,dat_status:$("datStatus").value,graduation_status:$("graduationStatus").value,exam_status:$("examStatus").value,tuition_total:Number($("tuitionTotal").value||0),paid:Number($("paid").value||0),address:$("address").value.trim(),notes:embedScheduleInNotes($("notes").value.trim(),schedule),photo_data:currentPhoto};
  $("saveStudentBtn").disabled=true;
  try{const savedId=await rpc("app_save_student",{p_token:token,p_student_id:$("studentId").value||null,p_data:data,p_owner_id:me.role==="admin"?$("studentOwner").value:null});$("studentDialog").close();await loadStudents();const saved=students.find(s=>s.id===savedId);if(currentPhoto&&(!saved||!saved.photo_data)){alert("Thông tin đã lưu nhưng ảnh chưa được cơ sở dữ liệu ghi nhận. Hãy chạy file CAP-NHAT-ANH-3X4.sql trong Supabase rồi tải ảnh lại.")}else toast("Đã lưu thông tin học viên")}
  catch(err){$("studentError").textContent=errText(err)}finally{$("saveStudentBtn").disabled=false}
};

async function loadUsers(){
  const old=$("ownerFilter").value;
  users=await rpc("app_list_users",{p_token:token})||[];
  const options=users.map(u=>`<option value="${u.id}">${esc(u.username)}${u.role==="admin"?" (Admin)":""}</option>`).join("");
  $("ownerFilter").innerHTML='<option value="">Tất cả tài khoản</option>'+options;$("studentOwner").innerHTML=options;
  if([...$("ownerFilter").options].some(o=>o.value===old))$("ownerFilter").value=old;
  $("userList").innerHTML=users.filter(u=>u.role!=="admin").map(u=>`<div class="user-item"><div><strong>${esc(u.username)}</strong><span class="sub">${u.active?"Đang hoạt động":"Đã khóa"}</span></div><div><button data-reset="${u.id}">Đặt lại mật khẩu</button><button data-toggle="${u.id}" data-active="${u.active}">${u.active?"Khóa":"Mở khóa"}</button></div></div>`).join("");
}
async function loadStudentAccounts(){
  try{
    studentAccounts=await rpc("app_list_student_accounts",{p_token:token})||[];
    studentAccountsReady=true;
  }catch(error){
    studentAccounts=[];studentAccountsReady=false;
    const missing=/app_list_student_accounts|schema cache|PGRST202/i.test(errText(error));
    if(!missing)toast(errText(error));
  }
}
function suggestedStudentUsername(student){
  const source=student.student_code||student.phone||student.name||"hocvien";
  const cleaned=normalize(source).replace(/[^a-z0-9]+/g,".").replace(/^\.+|\.+$/g,"").slice(0,35);
  return `hv.${cleaned||"hocvien"}`;
}
function openStudentAccount(student){
  if(me?.role!=="admin"||!studentAccountsReady)return;
  selectedStudentAccount={student,account:studentAccounts.find(item=>item.student_id===String(student.id))||null};
  const {account}=selectedStudentAccount;
  $("studentAccountError").textContent="";
  $("studentAccountSummary").innerHTML=`<div class="student-account-avatar">${student.photo_data?`<img src="${student.photo_data}" alt="">`:"HV"}</div><div><strong>${esc(student.name)}</strong><span>${esc(student.student_code||"Chưa có mã")} · ${esc(student.course||"Chưa có khóa")}</span></div>`;
  $("studentAccountStudentId").value=student.id;
  $("studentAccountForm").classList.toggle("hidden",Boolean(account));
  $("studentAccountActions").classList.toggle("hidden",!account);
  if(account){
    $("studentAccountStatus").innerHTML=`Tên đăng nhập: <strong>${esc(account.username)}</strong><span class="student-login-state ${account.active?"active":"locked"}">${account.active?"Đang hoạt động":"Đã khóa"}</span>${account.force_change_password?"<small>Học viên cần đổi mật khẩu ở lần đăng nhập tiếp theo.</small>":""}`;
    $("toggleStudentAccountBtn").textContent=account.active?"Khóa tài khoản":"Mở khóa tài khoản";
    $("toggleStudentAccountBtn").classList.toggle("danger",account.active);
  }else{
    $("studentAccountUsername").value=suggestedStudentUsername(student);
    $("studentAccountPassword").value="";
  }
  $("studentAccountDialog").showModal();
  if(!account)setTimeout(()=>$("studentAccountUsername").focus(),50);
}
$("studentAccountForm").onsubmit=async event=>{
  event.preventDefault();$("studentAccountError").textContent="";
  const username=$("studentAccountUsername").value.trim().toLowerCase();
  $("createStudentAccountBtn").disabled=true;
  try{
    await rpc("app_create_student_account",{p_token:token,p_student_id:$("studentAccountStudentId").value,p_username:username,p_password:$("studentAccountPassword").value});
    await loadStudentAccounts();renderStudents();$("studentAccountDialog").close();
    toast(`Đã tạo tài khoản học viên ${username}`);
  }catch(error){$("studentAccountError").textContent=errText(error)}
  finally{$("createStudentAccountBtn").disabled=false}
};
$("resetStudentPasswordBtn").onclick=async()=>{
  const account=selectedStudentAccount?.account;if(!account)return;
  const password=prompt(`Nhập mật khẩu tạm mới cho ${account.username} (ít nhất 8 ký tự):`);
  if(!password)return;
  try{
    await rpc("app_admin_reset_student_password",{p_token:token,p_account_id:account.id,p_password:password});
    await loadStudentAccounts();renderStudents();$("studentAccountDialog").close();toast("Đã đặt lại mật khẩu học viên");
  }catch(error){$("studentAccountError").textContent=errText(error)}
};
$("toggleStudentAccountBtn").onclick=async()=>{
  const account=selectedStudentAccount?.account;if(!account)return;
  try{
    await rpc("app_set_student_account_active",{p_token:token,p_account_id:account.id,p_active:!account.active});
    await loadStudentAccounts();renderStudents();$("studentAccountDialog").close();toast(account.active?"Đã khóa tài khoản học viên":"Đã mở khóa tài khoản học viên");
  }catch(error){$("studentAccountError").textContent=errText(error)}
};
$("usersBtn").onclick=()=>{$("userError").textContent="";$("usersDialog").showModal()};
$("userForm").onsubmit=async e=>{e.preventDefault();$("userError").textContent="";$("createUserBtn").disabled=true;try{await rpc("app_create_user",{p_token:token,p_username:$("newUsername").value.trim(),p_password:$("newPassword").value});e.target.reset();toast("Đã tạo tài khoản quản lý");await loadUsers()}catch(err){$("userError").textContent=errText(err)}finally{$("createUserBtn").disabled=false}};
$("userList").onclick=async e=>{try{if(e.target.dataset.toggle){await rpc("app_set_user_active",{p_token:token,p_user_id:e.target.dataset.toggle,p_active:e.target.dataset.active!=="true"});await loadUsers();toast("Đã cập nhật tài khoản")}if(e.target.dataset.reset){const p=prompt("Nhập mật khẩu tạm mới (ít nhất 8 ký tự):");if(p){await rpc("app_admin_reset_password",{p_token:token,p_user_id:e.target.dataset.reset,p_password:p});toast("Đã đặt lại mật khẩu")}}}catch(err){$("userError").textContent=errText(err)}};

function openForcedPassword(){forcePasswordChange=true;$("passwordNotice").textContent="Đây là lần đăng nhập đầu tiên. Anh cần đổi mật khẩu trước khi tiếp tục.";$("passwordClose").classList.add("hidden");$("passwordCancel").classList.add("hidden");$("passwordDialog").showModal()}
$("changePasswordBtn").onclick=()=>{forcePasswordChange=false;$("passwordNotice").textContent="Mật khẩu mới phải có ít nhất 8 ký tự.";$("passwordClose").classList.remove("hidden");$("passwordCancel").classList.remove("hidden");$("passwordError").textContent="";$("passwordDialog").showModal()};
$("passwordForm").onsubmit=async e=>{e.preventDefault();$("passwordError").textContent="";if($("newOwnPassword").value!==$("confirmOwnPassword").value)return $("passwordError").textContent="Hai lần nhập mật khẩu mới không giống nhau.";$("savePasswordBtn").disabled=true;try{await rpc("app_change_password",{p_token:token,p_old_password:$("oldPassword").value,p_new_password:$("newOwnPassword").value});forcePasswordChange=false;me.force_change_password=false;$("passwordDialog").close();e.target.reset();toast("Đã đổi mật khẩu thành công")}catch(err){$("passwordError").textContent=errText(err)}finally{$("savePasswordBtn").disabled=false}};
document.querySelectorAll("dialog .close").forEach(b=>b.onclick=()=>{const d=b.closest("dialog");if(d===$("passwordDialog")&&forcePasswordChange)return;d.close()});
document.querySelectorAll("dialog").forEach(d=>d.addEventListener("cancel",e=>{if(d===$("passwordDialog")&&forcePasswordChange)e.preventDefault()}));

function dataDate(v){if(v instanceof Date&&!Number.isNaN(v.valueOf()))return v.toISOString().slice(0,10);const s=String(v||"").trim();const m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:s}
function findCol(headers,names){return headers.findIndex(h=>names.some(n=>h===n||h.includes(n)))}
function requireXLSX(){if(!XLSX?.utils)throw new Error("Không tải được bộ xử lý Excel. Vui lòng tải lại trang.");return XLSX}
function excelDate(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Ho_Chi_Minh"}).format(new Date())}
function localDatetime(value){
  if(!value)return"";
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.valueOf()))return String(value);
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function excelDatetime(value){
  if(!value)return"";
  const local=localDatetime(value),match=local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  return match?`${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`:String(value);
}
function dataDatetime(value){
  if(value instanceof Date&&!Number.isNaN(value.valueOf()))return localDatetime(value);
  const text=String(value||"").trim();
  if(!text)return"";
  const match=text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if(match)return `${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}T${(match[4]||"00").padStart(2,"0")}:${match[5]||"00"}`;
  const parsed=new Date(text);
  return Number.isNaN(parsed.valueOf())?"":localDatetime(parsed);
}
function buildExcelFile(X,workbook,filename){
  const bytes=X.write(workbook,{bookType:"xlsx",type:"array",compression:true});
  return new File([bytes],filename,{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
function releaseExcelPreview(){
  if(excelPreviewUrl)URL.revokeObjectURL(excelPreviewUrl);
  excelPreviewUrl="";excelPreviewFile=null;
}
function renderExcelPreview({title,file,headers,rows,note,mode}){
  releaseExcelPreview();
  excelPreviewFile=file||null;
  if(file)excelPreviewUrl=URL.createObjectURL(file);
  $("excelPreviewTitle").textContent=title;
  $("excelPreviewMeta").innerHTML=[
    file?.name&&`<span>${esc(file.name)}</span>`,
    file&&`<span>${new Intl.NumberFormat("vi-VN").format(Math.max(1,Math.ceil(file.size/1024)))} KB</span>`,
    `<span>${rows.length} dòng xem trước</span>`
  ].filter(Boolean).join("");
  $("excelPreviewHead").innerHTML=`<tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr>`;
  $("excelPreviewBody").innerHTML=rows.length?rows.map(row=>`<tr>${row.map(value=>`<td>${esc(value)}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${headers.length}">Không có dữ liệu để xem trước</td></tr>`;
  $("excelPreviewNote").textContent=note||"";
  const exporting=mode==="export";
  $("excelOpenBtn").classList.toggle("hidden",!exporting);
  $("excelDownloadBtn").classList.toggle("hidden",!exporting);
  $("excelShareBtn").classList.toggle("hidden",!exporting);
  $("excelImportConfirmBtn").classList.toggle("hidden",exporting);
  if(exporting){
    $("excelOpenBtn").href=excelPreviewUrl;$("excelOpenBtn").download="";
    $("excelDownloadBtn").href=excelPreviewUrl;$("excelDownloadBtn").download=file.name;
  }else{
    $("excelOpenBtn").removeAttribute("href");$("excelDownloadBtn").removeAttribute("href");
  }
  $("excelPreviewDialog").showModal();
}
function closeExcelPreview(accepted=false){
  if(excelImportResolve){const resolve=excelImportResolve;excelImportResolve=null;resolve(accepted)}
  if($("excelPreviewDialog").open)$("excelPreviewDialog").close();
  releaseExcelPreview();
}
function previewExportFile(file,list){
  const headers=["Họ và tên","Hạng","DAT","BĐ DAT tự động","KT DAT tự động","BĐ DAT cơ khí","KT DAT cơ khí","Tổng học phí","Đã thu"];
  const rows=list.slice(0,20).map(s=>{
    const dates=(parseScheduleFromNotes(s.notes)||{}).dates||{};
    return[s.name,s.license_class,s.dat_status,excelDatetime(dates.dat_auto_start),excelDatetime(dates.dat_auto_end),excelDatetime(dates.dat_manual_start),excelDatetime(dates.dat_manual_end),money(s.tuition_total),money(s.paid)];
  });
  renderExcelPreview({title:"File xuất đã sẵn sàng",file,headers,rows,note:`File có ${list.length} học viên và 23 cột dữ liệu. Bảng đang hiển thị tối đa 20 học viên để kiểm tra nhanh.`,mode:"export"});
}
function confirmExcelImport(file,records){
  renderExcelPreview({
    title:"Kiểm tra trước khi nhập",
    file,
    headers:["Họ và tên","Hạng","Khóa","Tổng học phí","Đã thu","Ghi chú"],
    rows:records.slice(0,20).map(r=>[r.name,r.license_class,r.course,money(r.tuition_total),money(r.paid),stripScheduleFromNotes(r.notes)]),
    note:`Tìm thấy ${records.length} học viên. Kiểm tra dữ liệu rồi bấm “Xác nhận nhập dữ liệu”. Bảng hiển thị tối đa 20 dòng.`,
    mode:"import"
  });
  return new Promise(resolve=>{excelImportResolve=resolve});
}
function financialSummary(list){
  const total=list.reduce((sum,s)=>sum+Math.max(0,Number(s.tuition_total)||0),0);
  const paid=list.reduce((sum,s)=>sum+Math.max(0,Number(s.paid)||0),0);
  return{total,paid,debt:list.reduce((sum,s)=>sum+Math.max(0,(Number(s.tuition_total)||0)-(Number(s.paid)||0)),0),debtCount:list.filter(s=>(Number(s.tuition_total)||0)>(Number(s.paid)||0)).length};
}
$("exportBtn").onclick=async()=>{
  $("exportBtn").disabled=true;
  try{
    const X=requireXLSX(),head=["Mã học viên","Họ và tên","Ngày sinh","CCCD","Điện thoại","Địa chỉ","Hạng","Khóa","Hồ sơ","Lý thuyết online","Cabin","DAT","Bắt đầu DAT số tự động","Kết thúc DAT số tự động","Bắt đầu DAT số cơ khí","Kết thúc DAT số cơ khí","Thi tốt nghiệp","Thi sát hạch","Tổng học phí","Đã thu","Còn lại","Tài khoản","Ghi chú"];
    const rows=[head,...students.map(s=>{
      const schedule=parseScheduleFromNotes(s.notes)||{dates:{}};
      return[s.student_code,s.name,s.date_of_birth,s.cccd,s.phone,s.address,s.license_class,s.course,s.profile_status,s.online_status,s.cabin_status,s.dat_status,excelDatetime(schedule.dates?.dat_auto_start),excelDatetime(schedule.dates?.dat_auto_end),excelDatetime(schedule.dates?.dat_manual_start),excelDatetime(schedule.dates?.dat_manual_end),s.graduation_status,s.exam_status,Math.max(0,Number(s.tuition_total)||0),Math.max(0,Number(s.paid)||0),Math.max(0,Number(s.tuition_total||0)-Number(s.paid||0)),s.owner_username,stripScheduleFromNotes(s.notes)];
    })];
    const ws=X.utils.aoa_to_sheet(rows,{cellDates:true});
    ws["!cols"]=[14,24,13,16,15,28,16,16,18,20,18,18,22,22,22,22,20,22,16,16,16,16,28].map(w=>({wch:w}));
    ws["!autofilter"]={ref:`A1:W${Math.max(1,rows.length)}`};
    ws["!freeze"]={xSplit:0,ySplit:1,topLeftCell:"A2",activePane:"bottomLeft",state:"frozen"};
    for(let r=2;r<=rows.length;r++){
      if(ws[`C${r}`])ws[`C${r}`].z="dd/mm/yyyy";
      for(const c of ["M","N","O","P"])if(ws[`${c}${r}`])ws[`${c}${r}`].z="dd/mm/yyyy hh:mm";
      for(const c of ["S","T","U"])if(ws[`${c}${r}`]){ws[`${c}${r}`].t="n";ws[`${c}${r}`].z="#,##0 [$₫-vi-VN]"}
    }
    const summary=financialSummary(students),summaryRows=[
      ["TỔNG HỢP TÀI CHÍNH","GIÁ TRỊ"],
      ["Phạm vi",$("ownerFilter")?.value?$("ownerFilter").selectedOptions[0]?.textContent:"Toàn bộ học viên"],
      ["Số học viên",students.length],
      ["Tổng tiền học phí",summary.total],
      ["Số tiền đã đóng",summary.paid],
      ["Số tiền học phí còn nợ",summary.debt],
      ["Số học viên còn nợ",summary.debtCount],
      ["Ngày xuất dữ liệu",excelDate()]
    ];
    const summarySheet=X.utils.aoa_to_sheet(summaryRows);
    summarySheet["!cols"]=[{wch:30},{wch:24}];
    for(const r of [4,5,6])if(summarySheet[`B${r}`]){summarySheet[`B${r}`].t="n";summarySheet[`B${r}`].z="#,##0 [$₫-vi-VN]"}
    const wb=X.utils.book_new();
    wb.Props={Title:"DATA học viên Thầy Đạt",Subject:"Dữ liệu quản lý học viên lái xe",Author:"Hệ thống quản lý học viên Thầy Đạt",CreatedDate:new Date()};
    X.utils.book_append_sheet(wb,ws,"DATA HỌC VIÊN");
    X.utils.book_append_sheet(wb,summarySheet,"TỔNG HỢP");
    const file=buildExcelFile(X,wb,`DATA-hoc-vien-${excelDate()}.xlsx`);
    previewExportFile(file,students);
    toast(`Đã tạo file .xlsx gồm ${students.length} học viên`);
  }catch(err){alert(errText(err))}
  finally{$("exportBtn").disabled=false}
};
$("importBtn").onclick=()=>{$("dataFile").value="";$("dataFile").click()};
$("dataFile").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;busy(true);
  try{
    if(me?.role!=="admin")throw new Error("Chỉ tài khoản admin được phép nhập dữ liệu.");
    if(!file.name.toLowerCase().endsWith(".xlsx"))throw new Error("Chỉ chấp nhận file Excel định dạng .xlsx. Không nhận .xls hoặc .csv.");
    if(file.size>20*1024*1024)throw new Error("File Excel .xlsx không được lớn hơn 20 MB.");
    const buffer=await file.arrayBuffer(),signature=new Uint8Array(buffer,0,Math.min(4,buffer.byteLength));
    if(signature[0]!==0x50||signature[1]!==0x4b)throw new Error("File không phải Excel .xlsx hợp lệ hoặc đã bị đổi đuôi.");
    const X=requireXLSX(),workbook=X.read(buffer,{type:"array",cellDates:true}),sheet=workbook.Sheets["DATA HỌC VIÊN"]||workbook.Sheets[workbook.SheetNames[0]];
    if(!sheet)throw new Error("File Excel không có trang tính.");
    const rows=X.utils.sheet_to_json(sheet,{header:1,defval:"",raw:false,dateNF:"dd/mm/yyyy"});
    if(rows.length<2)throw new Error("File Excel không có dữ liệu.");
    const h=rows[0].map(normalize),idx={name:findCol(h,["ho va ten","ho ten","hoc vien"]),dob:findCol(h,["ngay sinh"]),cccd:findCol(h,["cccd","cmnd"]),phone:findCol(h,["dien thoai","so dien thoai","sdt"]),address:findCol(h,["dia chi"]),license:findCol(h,["hang dao tao","hang lai xe","hang"]),course:findCol(h,["khoa hoc","khoa"]),profile:findCol(h,["trang thai ho so","ho so"]),online:findCol(h,["ly thuyet online","online"]),cabin:findCol(h,["cabin"]),dat:findCol(h,["dat"]),datAutoStart:findCol(h,["bat dau dat so tu dong"]),datAutoEnd:findCol(h,["ket thuc dat so tu dong"]),datManualStart:findCol(h,["bat dau dat so co khi"]),datManualEnd:findCol(h,["ket thuc dat so co khi"]),graduation:findCol(h,["thi tot nghiep","tot nghiep"]),exam:findCol(h,["thi sat hach","sat hach"]),total:findCol(h,["tong hoc phi"]),paid:findCol(h,["da thu"]),paid1:findCol(h,["hoc phi lan 1"]),paid2:findCol(h,["hoc phi lan 2"]),paid3:findCol(h,["hoc phi lan 3"]),notes:findCol(h,["ghi chu"])};
    if(idx.name<0)throw new Error("Không tìm thấy cột HỌ VÀ TÊN trong file Excel.");
    if(idx.total<0)throw new Error("Không tìm thấy cột TỔNG HỌC PHÍ trong file Excel.");
    if(idx.paid<0&&idx.paid1<0&&idx.paid2<0&&idx.paid3<0)throw new Error("Không tìm thấy cột ĐÃ THU hoặc các cột HỌC PHÍ LẦN 1, 2, 3.");
    const validRows=rows.slice(1).map((r,i)=>({r,rowNumber:i+2})).filter(({r})=>String(r[idx.name]||"").trim());
    if(!validRows.length)throw new Error("File Excel không có dòng học viên hợp lệ.");
    const records=validRows.map(({r,rowNumber})=>{
      const get=k=>idx[k]>=0?String(r[idx[k]]??"").trim():"",total=toNumber(get("total")),paid=get("paid")?toNumber(get("paid")):toNumber(get("paid1"))+toNumber(get("paid2"))+toNumber(get("paid3"));
      if(total<0||paid<0)throw new Error(`Dòng ${rowNumber}: Học phí không được là số âm.`);
      if(paid>total)throw new Error(`Dòng ${rowNumber}: Số tiền đã thu lớn hơn tổng học phí.`);
      const dates={
        dat_auto_start:dataDatetime(get("datAutoStart")),dat_auto_end:dataDatetime(get("datAutoEnd")),
        dat_manual_start:dataDatetime(get("datManualStart")),dat_manual_end:dataDatetime(get("datManualEnd"))
      };
      for(const [startKey,endKey,label] of [["dat_auto_start","dat_auto_end","DAT số tự động"],["dat_manual_start","dat_manual_end","DAT số cơ khí"]]){
        if(Boolean(dates[startKey])!==Boolean(dates[endKey]))throw new Error(`Dòng ${rowNumber}: Vui lòng nhập đủ ngày bắt đầu và kết thúc ${label}.`);
        if(dates[startKey]&&new Date(dates[endKey])<new Date(dates[startKey]))throw new Error(`Dòng ${rowNumber}: Ngày kết thúc ${label} không được trước ngày bắt đầu.`);
      }
      const scheduleDates=Object.fromEntries(Object.entries(dates).filter(([,value])=>value));
      const notes=embedScheduleInNotes(get("notes"),Object.keys(scheduleDates).length?{version:1,dates:scheduleDates,locations:{},note:"",updatedAt:new Date().toISOString()}:null);
      return{name:get("name"),date_of_birth:dataDate(get("dob"))||null,cccd:get("cccd"),phone:get("phone"),address:get("address"),license_class:get("license")||"B số tự động",course:get("course"),profile_status:get("profile")||"Đã ghi nhận",online_status:get("online")||"Chưa hoàn thành",cabin_status:get("cabin")||"Chưa hoàn thành",dat_status:get("dat")||"Chưa thực hiện",graduation_status:get("graduation")||"Chưa hoàn thành",exam_status:get("exam")||"Chưa thi sát hạch",tuition_total:total,paid,notes};
    });
    busy(false);
    if(!await confirmExcelImport(file,records))return;
    busy(true);
    let done=0;
    for(const data of records){
      await rpc("app_save_student",{p_token:token,p_student_id:null,p_data:data,p_owner_id:$("ownerFilter").value||me.id});done++;
    }
    await loadStudents();toast(`Đã nhập thành công ${done} học viên từ file .xlsx`);
  }catch(err){alert(errText(err))}finally{busy(false);e.target.value=""}
};

$("excelPreviewClose").onclick=()=>closeExcelPreview(false);
$("excelPreviewCancel").onclick=()=>closeExcelPreview(false);
$("excelImportConfirmBtn").onclick=()=>closeExcelPreview(true);
$("excelPreviewDialog").addEventListener("cancel",e=>{e.preventDefault();closeExcelPreview(false)});
$("excelShareBtn").onclick=async()=>{
  if(!excelPreviewFile)return;
  if(navigator.share&&navigator.canShare?.({files:[excelPreviewFile]})){
    try{await navigator.share({files:[excelPreviewFile],title:"DATA học viên Thầy Đạt"});toast("Đã mở tùy chọn chia sẻ / lưu file");return}
    catch(error){if(error?.name==="AbortError")return}
  }
  $("excelDownloadBtn").click();toast("Đã lưu file .xlsx vào thiết bị");
};

const savedUsername=localStorage.getItem("hv_saved_user")||"";
if(savedUsername){$("username").value=savedUsername;$("rememberLogin").checked=true}
$("togglePassword").onclick=()=>{
  const show=$("password").type==="password";
  $("password").type=show?"text":"password";
  $("togglePassword").setAttribute("aria-pressed",String(show));
  $("togglePassword").setAttribute("aria-label",show?"Ẩn mật khẩu":"Hiện mật khẩu");
};

boot();
