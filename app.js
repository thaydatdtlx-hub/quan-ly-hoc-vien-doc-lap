import * as XLSX from "xlsx";
import {embedScheduleInNotes,parseScheduleFromNotes,stripScheduleFromNotes} from "./schedule-data.js";

const SUPABASE_URL="https://ainrsticcgpoqadiaivj.supabase.co";
const SUPABASE_KEY="sb_publishable_e3yowYg73Lcrkx6WU5StHw_telwpp1z";
const $=id=>document.getElementById(id);
let token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"",authKind=localStorage.getItem("hv_auth_kind")||sessionStorage.getItem("hv_auth_kind")||"",me=null,students=[],users=[],studentAccounts=[],studentAccountsReady=false,selectedStudentAccount=null,forcePasswordChange=false,currentPhoto="",statFilter="all";

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
  try{students=await rpc("app_list_students",{p_token:token,p_owner_id:me.role==="admin"?($("ownerFilter").value||null):null})||[];renderStudents();if(students.length&&!Object.prototype.hasOwnProperty.call(students[0],"online_status")&&!sessionStorage.getItem("progress_sql_warning")){sessionStorage.setItem("progress_sql_warning","1");alert("Cơ sở dữ liệu chưa có đủ các mục tiến độ. Admin cần chạy file CAP-NHAT-TIEN-DO.sql trong Supabase SQL Editor.")}}
  catch(err){toast(errText(err))}
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
}
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
function financialSummary(list){
  const total=list.reduce((sum,s)=>sum+Math.max(0,Number(s.tuition_total)||0),0);
  const paid=list.reduce((sum,s)=>sum+Math.max(0,Number(s.paid)||0),0);
  return{total,paid,debt:list.reduce((sum,s)=>sum+Math.max(0,(Number(s.tuition_total)||0)-(Number(s.paid)||0)),0),debtCount:list.filter(s=>(Number(s.tuition_total)||0)>(Number(s.paid)||0)).length};
}
$("exportBtn").onclick=()=>{
  try{
    const X=requireXLSX(),head=["Mã học viên","Họ và tên","Ngày sinh","CCCD","Điện thoại","Địa chỉ","Hạng","Khóa","Hồ sơ","Lý thuyết online","Cabin","DAT","Thi tốt nghiệp","Thi sát hạch","Tổng học phí","Đã thu","Còn lại","Tài khoản","Ghi chú"];
    const rows=[head,...students.map(s=>[s.student_code,s.name,s.date_of_birth,s.cccd,s.phone,s.address,s.license_class,s.course,s.profile_status,s.online_status,s.cabin_status,s.dat_status,s.graduation_status,s.exam_status,Math.max(0,Number(s.tuition_total)||0),Math.max(0,Number(s.paid)||0),Math.max(0,Number(s.tuition_total||0)-Number(s.paid||0)),s.owner_username,stripScheduleFromNotes(s.notes)])];
    const ws=X.utils.aoa_to_sheet(rows);
    ws["!cols"]=[14,24,13,16,15,28,16,16,18,20,18,18,20,22,16,16,16,16,28].map(w=>({wch:w}));
    ws["!autofilter"]={ref:`A1:S${Math.max(1,rows.length)}`};
    ws["!freeze"]={xSplit:0,ySplit:1,topLeftCell:"A2",activePane:"bottomLeft",state:"frozen"};
    for(let r=2;r<=rows.length;r++){
      if(ws[`C${r}`])ws[`C${r}`].z="dd/mm/yyyy";
      for(const c of ["O","P","Q"])if(ws[`${c}${r}`]){ws[`${c}${r}`].t="n";ws[`${c}${r}`].z="#,##0 [$₫-vi-VN]"}
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
    X.writeFile(wb,`DATA-hoc-vien-${excelDate()}.xlsx`,{bookType:"xlsx",compression:true});
    toast(`Đã xuất ${students.length} học viên ra file .xlsx`);
  }catch(err){alert(errText(err))}
};
$("importBtn").onclick=()=>$("dataFile").click();
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
    const h=rows[0].map(normalize),idx={name:findCol(h,["ho va ten","ho ten","hoc vien"]),dob:findCol(h,["ngay sinh"]),cccd:findCol(h,["cccd","cmnd"]),phone:findCol(h,["dien thoai","so dien thoai","sdt"]),address:findCol(h,["dia chi"]),license:findCol(h,["hang dao tao","hang lai xe","hang"]),course:findCol(h,["khoa hoc","khoa"]),profile:findCol(h,["trang thai ho so","ho so"]),online:findCol(h,["ly thuyet online","online"]),cabin:findCol(h,["cabin"]),dat:findCol(h,["dat"]),graduation:findCol(h,["thi tot nghiep","tot nghiep"]),exam:findCol(h,["thi sat hach","sat hach"]),total:findCol(h,["tong hoc phi"]),paid:findCol(h,["da thu"]),paid1:findCol(h,["hoc phi lan 1"]),paid2:findCol(h,["hoc phi lan 2"]),paid3:findCol(h,["hoc phi lan 3"]),notes:findCol(h,["ghi chu"])};
    if(idx.name<0)throw new Error("Không tìm thấy cột HỌ VÀ TÊN trong file Excel.");
    if(idx.total<0)throw new Error("Không tìm thấy cột TỔNG HỌC PHÍ trong file Excel.");
    if(idx.paid<0&&idx.paid1<0&&idx.paid2<0&&idx.paid3<0)throw new Error("Không tìm thấy cột ĐÃ THU hoặc các cột HỌC PHÍ LẦN 1, 2, 3.");
    const validRows=rows.slice(1).map((r,i)=>({r,rowNumber:i+2})).filter(({r})=>String(r[idx.name]||"").trim());
    if(!validRows.length)throw new Error("File Excel không có dòng học viên hợp lệ.");
    const records=validRows.map(({r,rowNumber})=>{
      const get=k=>idx[k]>=0?String(r[idx[k]]??"").trim():"",total=toNumber(get("total")),paid=get("paid")?toNumber(get("paid")):toNumber(get("paid1"))+toNumber(get("paid2"))+toNumber(get("paid3"));
      if(total<0||paid<0)throw new Error(`Dòng ${rowNumber}: Học phí không được là số âm.`);
      if(paid>total)throw new Error(`Dòng ${rowNumber}: Số tiền đã thu lớn hơn tổng học phí.`);
      return{name:get("name"),date_of_birth:dataDate(get("dob"))||null,cccd:get("cccd"),phone:get("phone"),address:get("address"),license_class:get("license")||"B số tự động",course:get("course"),profile_status:get("profile")||"Đã ghi nhận",online_status:get("online")||"Chưa hoàn thành",cabin_status:get("cabin")||"Chưa hoàn thành",dat_status:get("dat")||"Chưa thực hiện",graduation_status:get("graduation")||"Chưa hoàn thành",exam_status:get("exam")||"Chưa thi sát hạch",tuition_total:total,paid,notes:get("notes")};
    });
    if(!confirm(`Nhập ${records.length} học viên từ file "${file.name}"?\nDữ liệu sẽ được thêm vào tài khoản đang chọn.`))return;
    let done=0;
    for(const data of records){
      await rpc("app_save_student",{p_token:token,p_student_id:null,p_data:data,p_owner_id:$("ownerFilter").value||me.id});done++;
    }
    await loadStudents();toast(`Đã nhập thành công ${done} học viên từ file .xlsx`);
  }catch(err){alert(errText(err))}finally{busy(false);e.target.value=""}
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
