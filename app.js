import {embedScheduleInNotes,parseScheduleFromNotes,stripScheduleFromNotes} from "./schedule-data.js";
import {managerNotifications,markNoticesRead,readNoticeIds} from "./account-notifications.js";
import {analyzeStudentImport,importSummary} from "./import-dedup.js";
import {openPaymentReceipt,paymentMethodLabel} from "./payment-receipt.js";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
let token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"",authKind=localStorage.getItem("hv_auth_kind")||sessionStorage.getItem("hv_auth_kind")||"",me=null,students=[],users=[],studentAccounts=[],publicTheoryAccounts=[],trainingRequests=[],theoryProgress=[],deletedStudents=[],auditLogs=[],paymentHistory=[],accountNotices=[],serverNotices=[],studentAccountsReady=false,publicTheoryAccountsReady=false,theoryProgressReady=false,operationsReady=false,paymentsReady=false,selectedStudentAccount=null,forcePasswordChange=false,currentPhoto="",statFilter="all",theorySummaryFilter="active",notificationTimer=null,excelPreviewFile=null,excelPreviewUrl="",excelImportResolve=null;

async function rpc(fn,body={}){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw new Error(data?.message||data?.details||data?.error||"Không thể kết nối máy chủ");
  return data;
}
async function recordAudit(action,entityType="system",entityId="",entityLabel="",details={}){
  try{await rpc("app_record_audit",{p_token:token,p_action:action,p_entity_type:entityType,p_entity_id:String(entityId||""),p_entity_label:entityLabel||"",p_details:details})}catch{}
}
function busy(on){$("loading").classList.toggle("hidden",!on)}
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>$("toast").classList.remove("show"),2800)}
function errText(err){return err?.message||"Có lỗi xảy ra. Vui lòng thử lại."}
function normalize(s){return String(s??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function money(n){return new Intl.NumberFormat("vi-VN").format(Number(n||0))+" ₫"}
function toNumber(v){return Number(String(v??0).replace(/[^0-9-]/g,""))||0}
function dateTime(value){
  if(!value)return"Chưa có hoạt động";
  const parsed=new Date(value);if(Number.isNaN(parsed.valueOf()))return String(value);
  return new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(parsed);
}
function dateOnly(value){
  if(!value)return"";
  const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match)return`${match[3]}/${match[2]}/${match[1]}`;
  const parsed=new Date(value);
  return Number.isNaN(parsed.valueOf())?String(value):new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"}).format(parsed);
}
function dateRange(start,end){
  if(!start&&!end)return"";
  if(start&&end)return`${dateOnly(start)} – ${dateOnly(end)}`;
  return start?`Từ ${dateOnly(start)}`:`Đến ${dateOnly(end)}`;
}
function theoryDuration(seconds){
  const value=Math.max(0,Number(seconds)||0),minutes=Math.floor(value/60),rest=value%60;
  return `${minutes}:${String(rest).padStart(2,"0")}`;
}
function progressTone(v){const n=normalize(v);if(n.includes("thi rot"))return"fail";if(n.includes("dang"))return"doing";if(n.includes("da hoan thanh")||n==="da dau")return"done";return"pending"}
function progressHtml(s){
  const dates=(parseScheduleFromNotes(s.notes)||{}).dates||{},onlineDates=dateRange(dates.online_start,dates.online_end);
  return `<div class="progress-list"><span class="progress-chip ${progressTone(s.online_status)}"><b>Online</b><span>${esc(s.online_status||"Chưa hoàn thành")}${onlineDates?`<small>${esc(onlineDates)}</small>`:""}</span></span><span class="progress-chip ${progressTone(s.cabin_status)}"><b>Cabin</b>${esc(s.cabin_status||"Chưa hoàn thành")}</span><span class="progress-chip ${progressTone(s.dat_status)}"><b>DAT</b>${esc(s.dat_status||"Chưa thực hiện")}</span><span class="progress-chip ${progressTone(s.graduation_status)}"><b>Tốt nghiệp</b>${esc(s.graduation_status||"Chưa hoàn thành")}</span><span class="progress-chip ${progressTone(s.exam_status)}"><b>Sát hạch</b>${esc(s.exam_status||"Chưa thi sát hạch")}</span></div>`;
}

async function boot(){
  if(!token)return showLogin();
  try{
    if(authKind==="student"||authKind==="public_theory"){
      me=await rpc("app_student_me",{p_token:token});
      authKind=me.role==="public_theory"?"public_theory":"student";
      return location.replace(authKind==="public_theory"?"/600-cau-hoi.html":"/hoc-vien.html");
    }
    try{me=await rpc("app_me",{p_token:token})}
    catch{
      me=await rpc("app_student_me",{p_token:token});
      authKind=me.role==="public_theory"?"public_theory":"student";
      return location.replace(authKind==="public_theory"?"/600-cau-hoi.html":"/hoc-vien.html");
    }
    if(!me?.id)throw new Error("Phiên đăng nhập hết hạn");
    authKind="manager";
    showApp();
    if(me.role==="admin"){await loadUsers();await loadStudentAccounts();await loadPublicTheoryAccounts();await loadOperations();await loadPaymentFeature()}
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
      try{x=await rpc("app_student_login",{p_username:username,p_password:$("password").value});authKind=x.role==="public_theory"?"public_theory":"student"}
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
$("openPublicRegisterBtn").onclick=()=>{
  $("publicRegisterError").textContent="";
  $("publicRegisterDialog").showModal();
  setTimeout(()=>$("publicRegisterName").focus(),50);
};
$("publicRegisterForm").onsubmit=async event=>{
  event.preventDefault();
  $("publicRegisterError").textContent="";
  const password=$("publicRegisterPassword").value;
  if(password!==$("publicRegisterConfirm").value){
    $("publicRegisterError").textContent="Hai lần nhập mật khẩu chưa giống nhau.";
    return;
  }
  const button=$("publicRegisterSubmit");
  button.disabled=true;button.textContent="Đang tạo tài khoản…";
  try{
    const result=await rpc("app_public_theory_register",{
      p_full_name:$("publicRegisterName").value.trim(),
      p_phone:$("publicRegisterPhone").value.trim(),
      p_username:$("publicRegisterUsername").value.trim().toLowerCase(),
      p_password:password
    });
    token=result.token;authKind="public_theory";
    saveAuth($("publicRegisterRemember").checked);
    location.replace("/600-cau-hoi.html");
  }catch(error){
    const message=errText(error);
    $("publicRegisterError").textContent=/app_public_theory_register|schema cache|PGRST202/i.test(message)
      ?"Tính năng đăng ký đang được quản trị viên kích hoạt. Vui lòng thử lại sau."
      :message;
  }finally{button.disabled=false;button.textContent="Tạo tài khoản & bắt đầu học"}
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
    if(me.role==="admin")await loadTheoryProgress();
    await loadServerNotifications();
    renderStudents();
    if(students.length&&!Object.prototype.hasOwnProperty.call(students[0],"online_status")&&!sessionStorage.getItem("progress_sql_warning")){sessionStorage.setItem("progress_sql_warning","1");alert("Cơ sở dữ liệu chưa có đủ các mục tiến độ. Admin cần chạy file CAP-NHAT-TIEN-DO.sql trong Supabase SQL Editor.")}
  }
  catch(err){toast(errText(err))}
}
async function loadTheoryProgress(){
  try{
    theoryProgress=await rpc("app_admin_list_theory_progress",{p_token:token})||[];
    theoryProgressReady=true;
  }catch(error){
    theoryProgress=[];theoryProgressReady=false;
    const missing=/app_admin_list_theory_progress|schema cache|PGRST202/i.test(errText(error));
    if(!missing)toast(errText(error));
  }
}
function theoryFor(studentId){return theoryProgress.find(item=>String(item.student_id)===String(studentId))}
function theoryHasStarted(item){return Number(item?.answered_count)>0||Number(item?.exam_count)>0}
function theoryProgressHtml(student){
  const account=studentAccounts.find(item=>item.student_id===String(student.id));
  if(!account)return'<div class="theory-table-empty">Chưa có tài khoản học viên</div>';
  if(!theoryProgressReady)return'<div class="theory-table-empty warning">Cần cập nhật CSDL tiến độ</div>';
  const item=theoryFor(student.id),answered=Number(item?.answered_count)||0,correct=Number(item?.correct_count)||0,exams=Number(item?.exam_count)||0;
  const accuracy=answered?Math.round(correct/answered*100):0;
  return `<div class="theory-table-progress">
    <div><strong>${answered}/600 câu</strong><span>${answered?`${accuracy}% trả lời đúng`:"Chưa bắt đầu học"}</span></div>
    <div><strong>${exams} bài thi</strong><span>${item?.best_total?`Tốt nhất ${Number(item.best_score)||0}/${Number(item.best_total)||0}`:"Chưa có kết quả"}</span></div>
    <button type="button" data-theory-progress="${student.id}">Xem học & thi</button>
  </div>`;
}
function renderTheoryDashboard(){
  if(me?.role!=="admin")return;
  const active=theoryProgress.filter(theoryHasStarted).length;
  const exams=theoryProgress.reduce((sum,item)=>sum+(Number(item.exam_count)||0),0);
  const passed=theoryProgress.reduce((sum,item)=>sum+(Number(item.passed_exam_count)||0),0);
  $("theoryStudentsActive").textContent=active;
  $("theoryExamTotal").textContent=exams;
  $("theoryExamPassed").textContent=passed;
  $("theoryDatabaseNotice").classList.toggle("hidden",theoryProgressReady);
}
function theorySummaryItems(filter=theorySummaryFilter){
  return theoryProgress.filter(item=>filter==="active"?theoryHasStarted(item):filter==="exams"?Number(item.exam_count)>0:Number(item.passed_exam_count)>0);
}
function theoryStudentFromProgress(item){
  return students.find(student=>String(student.id)===String(item.student_id))||{id:item.student_id,name:item.student_name,student_code:item.student_code,license_class:item.license_class};
}
function renderTheorySummary(){
  const query=normalize($("theorySummarySearch").value),all=theorySummaryItems(),items=all.filter(item=>!query||normalize(`${item.student_name} ${item.student_code} ${item.account_username} ${item.license_class}`).includes(query));
  $("theorySummaryCount").textContent=`${items.length}/${all.length} học viên`;
  $("theorySummaryList").innerHTML=items.length?items.map(item=>{
    const answered=Number(item.answered_count)||0,correct=Number(item.correct_count)||0,exams=Number(item.exam_count)||0,passed=Number(item.passed_exam_count)||0,accuracy=answered?Math.round(correct/answered*100):0;
    const latest=item.last_activity||item.latest_exam?.submitted_at,best=item.best_total?`${Number(item.best_score)||0}/${Number(item.best_total)||0}`:"—";
    return `<article class="theory-summary-student">
      <div class="theory-summary-person"><span>${esc((item.student_name||"?").trim().charAt(0).toUpperCase())}</span><div><strong>${esc(item.student_name||"Chưa có tên")}</strong><small>${esc(item.student_code||"Chưa có mã")} · Hạng ${esc(item.license_class||"—")}</small><em>${item.account_username?`@${esc(item.account_username)}${item.account_active?" · Đang hoạt động":" · Đang khóa"}`:"Chưa có tài khoản học viên"}</em></div></div>
      <div class="theory-summary-progress"><span><small>Đã học</small><b>${answered}/600</b></span><span><small>Chính xác</small><b>${accuracy}%</b></span><span><small>Thi thử</small><b>${exams} bài</b></span><span><small>Đã đạt</small><b>${passed} bài</b></span></div>
      <div class="theory-summary-action"><span>Điểm tốt nhất: <b>${best}</b></span><small>Hoạt động gần nhất: ${esc(dateTime(latest))}</small><button type="button" data-theory-summary-detail="${item.student_id}">Xem học & thi</button></div>
    </article>`;
  }).join(""):'<div class="theory-summary-empty"><strong>Không có học viên phù hợp</strong><span>Thử đổi từ khóa tìm kiếm hoặc chọn một ô thống kê khác.</span></div>';
}
function openTheorySummary(filter){
  if(me?.role!=="admin")return;
  if(!theoryProgressReady)return toast("Cần cập nhật CSDL tiến độ 600 câu trước.");
  theorySummaryFilter=filter;
  const items=theorySummaryItems(filter),examTotal=items.reduce((sum,item)=>sum+(Number(item.exam_count)||0),0),passedTotal=items.reduce((sum,item)=>sum+(Number(item.passed_exam_count)||0),0);
  const labels={active:["Học viên đã bắt đầu học",`${items.length} học viên đã có dữ liệu học hoặc thi thử`],exams:["Học viên đã thi thử",`${examTotal} lượt thi từ ${items.length} học viên`],passed:["Học viên có bài thi đạt",`${passedTotal} bài thi đạt từ ${items.length} học viên`]};
  $("theorySummaryTitle").textContent=labels[filter][0];$("theorySummaryMeta").textContent=labels[filter][1];$("theorySummarySearch").value="";$("theorySummaryError").textContent="";
  renderTheorySummary();$("theorySummaryDialog").showModal();setTimeout(()=>$("theorySummarySearch").focus(),50);
}
document.querySelectorAll("[data-theory-summary]").forEach(card=>card.onclick=()=>openTheorySummary(card.dataset.theorySummary));
$("theorySummarySearch").oninput=renderTheorySummary;
$("theorySummaryList").onclick=event=>{
  const button=event.target.closest("[data-theory-summary-detail]");if(!button)return;
  const item=theoryFor(button.dataset.theorySummaryDetail);if(!item)return;
  $("theorySummaryDialog").close();openTheoryDetail(theoryStudentFromProgress(item));
};
const auditLabels={
  student_created:"Đã tạo hồ sơ học viên",student_updated:"Đã cập nhật hồ sơ học viên",student_moved_to_trash:"Đã chuyển học viên vào thùng rác",student_restored:"Đã khôi phục học viên",student_deleted_permanently:"Đã xóa vĩnh viễn học viên",
  manager_created:"Đã tạo tài khoản quản lý",manager_status_changed:"Đã đổi trạng thái tài khoản quản lý",manager_password_reset:"Đã đặt lại mật khẩu quản lý",
  student_account_created:"Đã tạo tài khoản học viên",student_account_status_changed:"Đã đổi trạng thái tài khoản học viên",student_password_reset:"Đã đặt lại mật khẩu học viên",
  public_account_status_changed:"Đã đổi trạng thái người học bên ngoài",public_password_reset:"Đã đặt lại mật khẩu người học bên ngoài",public_account_deleted:"Đã xóa người học bên ngoài",
  excel_import:"Đã nhập dữ liệu từ Excel",excel_export:"Đã xuất dữ liệu Excel",schedule_changed:"Đã cập nhật lịch đào tạo"
};
function auditLabel(log){return auditLabels[log.action]||String(log.action||"Thao tác hệ thống").replaceAll("_"," ")}
function renderDeletedStudents(){
  const query=normalize($("trashSearch").value),items=deletedStudents.filter(item=>!query||normalize(`${item.name} ${item.student_code} ${item.phone} ${item.course}`).includes(query));
  $("deletedStudentCount").textContent=`${deletedStudents.length} học viên`;$("trashToolbarCount").textContent=deletedStudents.length?`${deletedStudents.length} hồ sơ có thể khôi phục`:"An toàn dữ liệu";
  $("deletedStudentList").innerHTML=items.length?items.map(item=>`<article class="deleted-student-card">
    <div class="deleted-student-main"><span>${esc((item.name||"?").trim().charAt(0).toUpperCase())}</span><div><strong>${esc(item.name||"Chưa có tên")}</strong><small>${esc(item.student_code||"Chưa có mã")} · ${esc(item.license_class||"Chưa có hạng")}</small><em>Xóa lúc ${esc(dateTime(item.deleted_at))} bởi ${esc(item.deleted_by_username||"Tài khoản hệ thống")}</em></div></div>
    <div class="deleted-student-meta"><span>${esc(item.phone||"Chưa có số điện thoại")}</span><span>${esc(item.course||"Chưa có khóa học")}</span><span>Còn nợ ${money(Math.max(0,(Number(item.tuition_total)||0)-(Number(item.paid)||0)))}</span></div>
    <div class="deleted-student-actions"><button type="button" data-restore-student="${item.id}">Khôi phục</button><button class="danger" type="button" data-permanent-delete="${item.id}">Xóa vĩnh viễn</button></div>
  </article>`).join(""):'<div class="operations-empty"><strong>Thùng rác đang trống</strong><span>Học viên bị xóa sẽ xuất hiện tại đây để Admin có thể khôi phục.</span></div>';
}
function renderAuditLogs(){
  const query=normalize($("auditSearch").value),items=auditLogs.filter(log=>!query||normalize(`${log.actor_username} ${log.entity_label} ${auditLabel(log)} ${JSON.stringify(log.details||{})}`).includes(query));
  $("auditLogCount").textContent=`${auditLogs.length} thao tác`;
  $("auditLogList").innerHTML=items.length?items.map(log=>`<article class="audit-log-card"><span class="audit-log-dot" aria-hidden="true"></span><div><strong>${esc(auditLabel(log))}</strong><small>${esc(log.entity_label||"Hệ thống")}</small><em>${esc(log.actor_username||"Tài khoản hệ thống")} · ${esc(dateTime(log.created_at))}</em></div></article>`).join(""):'<div class="operations-empty"><strong>Chưa có nhật ký phù hợp</strong><span>Các thao tác mới sẽ tự động được ghi lại tại đây.</span></div>';
}
async function loadOperations(){
  $("operationsError").textContent="";
  try{
    [deletedStudents,auditLogs]=await Promise.all([
      rpc("app_list_deleted_students",{p_token:token}),
      rpc("app_list_audit_logs",{p_token:token,p_limit:250})
    ]);
    deletedStudents=Array.isArray(deletedStudents)?deletedStudents:[];auditLogs=Array.isArray(auditLogs)?auditLogs:[];operationsReady=true;
    $("operationsSetupNotice").classList.add("hidden");renderDeletedStudents();renderAuditLogs();
  }catch(error){
    operationsReady=false;deletedStudents=[];auditLogs=[];renderDeletedStudents();renderAuditLogs();
    const missing=/app_list_deleted_students|app_list_audit_logs|schema cache|PGRST202/i.test(errText(error));
    $("operationsSetupNotice").classList.toggle("hidden",!missing);if(!missing)$("operationsError").textContent=errText(error);
  }
}
$("operationsBtn").onclick=async()=>{
  $("trashSearch").value="";$("auditSearch").value="";$("operationsDialog").showModal();busy(true);try{await loadOperations()}finally{busy(false)}
};
$("refreshOperationsBtn").onclick=async()=>{busy(true);try{await loadOperations();toast("Đã làm mới dữ liệu an toàn")}finally{busy(false)}};
$("trashSearch").oninput=renderDeletedStudents;$("auditSearch").oninput=renderAuditLogs;
$("deletedStudentList").onclick=async event=>{
  const button=event.target.closest("button"),restoreId=button?.dataset.restoreStudent,deleteId=button?.dataset.permanentDelete,id=restoreId||deleteId;if(!id)return;
  const item=deletedStudents.find(student=>String(student.id)===String(id));if(!item)return;
  if(deleteId&&!confirm(`Xóa vĩnh viễn “${item.name}”? Toàn bộ hồ sơ, lịch học và tiến độ 600 câu sẽ không thể khôi phục.`))return;
  button.disabled=true;busy(true);
  try{
    await rpc(restoreId?"app_restore_student":"app_permanently_delete_student",{p_token:token,p_student_id:id});
    toast(restoreId?`Đã khôi phục ${item.name}`:`Đã xóa vĩnh viễn ${item.name}`);await Promise.all([loadOperations(),loadStudents(),loadStudentAccounts()]);
  }catch(error){$("operationsError").textContent=errText(error)}finally{button.disabled=false;busy(false)}
};
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
    return `<tr><td><div class="student-cell">${s.photo_data?`<img class="student-photo" src="${s.photo_data}" alt="Ảnh ${esc(s.name)}">`:`<span class="student-photo empty-photo">Ảnh<br>3×4</span>`}<div><span class="student-name">${esc(s.name)}</span><span class="sub">${esc(s.student_code)}${s.owner_username?` · ${esc(s.owner_username)}`:""}</span>${account?`<span class="student-login-state ${account.active?"active":"locked"}">${account.active?"Có tài khoản học viên":"Tài khoản đang khóa"}</span>`:""}</div></div></td><td>${esc(s.license_class||"—")}<span class="sub">${esc(s.course||"Chưa có khóa")}</span></td><td>${esc(s.phone||"—")}</td><td>${progressHtml(s)}</td>${me.role==="admin"?`<td>${theoryProgressHtml(s)}</td>`:""}<td>${money(s.tuition_total)}<span class="sub">Đã thu ${money(s.paid)} · Còn ${money(Math.max(0,(s.tuition_total||0)-(s.paid||0)))}</span></td><td><div class="row-actions">${accountButton}${me.role==="admin"?`<button class="payment-row-btn" data-payment-student="${s.id}">Học phí / Phiếu thu</button>`:""}<button data-edit="${s.id}">Sửa</button>${me.role==="admin"&&s.photo_data?`<button data-download-photo="${s.id}">Tải ảnh</button>`:""}${me.role==="admin"?`<button class="danger" data-delete="${s.id}">Xóa</button>`:""}</div></td></tr>`;
  }).join("");
  $("empty").classList.toggle("hidden",rows.length>0);$("resultCount").textContent=`${rows.length} học viên`;
  $("totalStudents").textContent=students.length;
  $("learningStudents").textContent=students.filter(s=>!normalize(s.exam_status).includes("da dau")).length;
  $("debtStudents").textContent=students.filter(s=>(s.tuition_total||0)>(s.paid||0)).length;
  renderTheoryDashboard();
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
async function loadPaymentFeature(){
  try{
    paymentHistory=await rpc("app_list_student_payments",{p_token:token,p_student_id:null})||[];
    paymentsReady=true;
  }catch(error){
    paymentHistory=[];paymentsReady=false;
    if(!/app_list_student_payments|schema cache|PGRST202/i.test(errText(error)))toast(errText(error));
  }
}
function paymentStudent(){return students.find(student=>String(student.id)===String($("paymentStudentSelect").value))}
function setPaymentFormState(student){
  const enabled=paymentsReady&&Boolean(student),debt=student?Math.max(0,Number(student.tuition_total||0)-Number(student.paid||0)):0;
  for(const id of ["paymentAmount","paymentDate","paymentMethod","paymentNote","savePaymentBtn"])$(id).disabled=!enabled||debt===0;
  $("paymentAmount").max=String(debt);
  if(enabled&&debt>0&&!Number($("paymentAmount").value))$("paymentAmount").value=debt;
  $("paymentEntryNote").textContent=!paymentsReady?"Cần kích hoạt CSDL lịch sử học phí.":!student?"Chọn một học viên để nhập giao dịch.":debt?`Có thể thu tối đa ${money(debt)}.`:"Học viên đã hoàn tất học phí.";
}
function renderPaymentLedger(){
  const selected=paymentStudent(),scope=selected?[selected]:students;
  const total=scope.reduce((sum,item)=>sum+Math.max(0,Number(item.tuition_total)||0),0);
  const paid=scope.reduce((sum,item)=>sum+Math.max(0,Number(item.paid)||0),0),debt=Math.max(0,total-paid);
  $("paymentTotalMetric").textContent=money(total);$("paymentPaidMetric").textContent=money(paid);$("paymentDebtMetric").textContent=money(debt);
  $("paymentFeatureState").textContent=paymentsReady?(selected?`${selected.student_code} · ${selected.name}`:"Toàn bộ giao dịch"):`Cần chạy file CAP-NHAT-LICH-SU-HOC-PHI-PHIEU-THU.sql`;
  $("paymentFeatureState").className=paymentsReady?"is-ready":"is-warning";
  $("paymentHistoryMeta").textContent=`${paymentHistory.length} giao dịch`;
  $("paymentRows").innerHTML=paymentHistory.map(item=>{
    const voided=Boolean(item.voided_at);
    return `<tr class="${voided?"is-voided":""}"><td><strong>${esc(item.receipt_no)}</strong><small>${esc(item.note||"Thu học phí")}</small></td><td><strong>${esc(item.student_name)}</strong><small>${esc(item.student_code||"—")}</small></td><td><b>${money(item.amount)}</b></td><td>${esc(dateOnly(item.payment_date))}<small>${esc(paymentMethodLabel(item.payment_method))}</small></td><td><span class="payment-status ${voided?"voided":"active"}">${voided?"Đã hủy":"Đã ghi nhận"}</span>${voided?`<small>${esc(item.void_reason||"")}</small>`:""}</td><td><div class="payment-actions">${voided?"":`<button type="button" data-print-payment="${item.id}">Xem / In phiếu</button><button class="danger" type="button" data-void-payment="${item.id}">Hủy phiếu</button>`}</div></td></tr>`;
  }).join("");
  $("paymentEmpty").classList.toggle("hidden",paymentHistory.length>0);
  setPaymentFormState(selected);
}
async function loadPaymentHistory(studentId=null){
  if(!paymentsReady)return renderPaymentLedger();
  paymentHistory=await rpc("app_list_student_payments",{p_token:token,p_student_id:studentId||null})||[];
  renderPaymentLedger();
}
async function openPaymentLedger(student=null){
  if(!paymentsReady){
    await loadPaymentFeature();
    if(!paymentsReady)return alert("Để kích hoạt Sổ thu và Phiếu thu, hãy chạy file CAP-NHAT-LICH-SU-HOC-PHI-PHIEU-THU.sql trong Supabase SQL Editor.");
  }
  $("paymentStudentSelect").innerHTML='<option value="">Tất cả học viên</option>'+students.map(item=>`<option value="${item.id}">${esc(item.student_code)} · ${esc(item.name)}</option>`).join("");
  $("paymentStudentSelect").value=student?.id||"";$("paymentForm").reset();$("paymentDate").value=new Date().toISOString().slice(0,10);$("paymentError").textContent="";
  $("paymentDialog").showModal();
  busy(true);try{await loadPaymentHistory(student?.id||null)}catch(error){$("paymentError").textContent=errText(error)}finally{busy(false)}
}
$("paymentLedgerBtn").onclick=()=>openPaymentLedger();
$("paymentStudentSelect").onchange=async()=>{
  $("paymentAmount").value="";$("paymentError").textContent="";busy(true);
  try{await loadPaymentHistory($("paymentStudentSelect").value||null)}catch(error){$("paymentError").textContent=errText(error)}finally{busy(false)}
};
$("paymentForm").onsubmit=async event=>{
  event.preventDefault();$("paymentError").textContent="";const selected=paymentStudent(),amount=Number($("paymentAmount").value||0);
  if(!selected)return $("paymentError").textContent="Vui lòng chọn học viên.";
  if(amount<=0)return $("paymentError").textContent="Số tiền thu phải lớn hơn 0.";
  $("savePaymentBtn").disabled=true;busy(true);
  try{
    const result=await rpc("app_save_student_payment",{p_token:token,p_student_id:selected.id,p_amount:amount,p_payment_date:$("paymentDate").value,p_payment_method:$("paymentMethod").value,p_note:$("paymentNote").value.trim()});
    await loadStudents();await loadPaymentHistory(selected.id);$("paymentAmount").value="";$("paymentNote").value="";
    toast(`Đã tạo phiếu thu ${result.receipt_no}`);
  }catch(error){$("paymentError").textContent=errText(error)}finally{busy(false);setPaymentFormState(paymentStudent())}
};
$("paymentRows").onclick=async event=>{
  const printId=event.target.dataset.printPayment,voidId=event.target.dataset.voidPayment;
  if(printId){const item=paymentHistory.find(payment=>String(payment.id)===String(printId));if(item&&!openPaymentReceipt(item))toast("Trình duyệt đang chặn cửa sổ phiếu thu.");return}
  if(!voidId)return;
  const item=paymentHistory.find(payment=>String(payment.id)===String(voidId)),reason=prompt(`Nhập lý do hủy phiếu ${item?.receipt_no||""}:`);
  if(reason===null)return;if(reason.trim().length<3)return toast("Lý do hủy cần ít nhất 3 ký tự.");
  event.target.disabled=true;busy(true);
  try{await rpc("app_void_student_payment",{p_token:token,p_payment_id:voidId,p_reason:reason.trim()});await loadStudents();await loadPaymentHistory($("paymentStudentSelect").value||null);toast("Đã hủy phiếu và cập nhật lại công nợ")}
  catch(error){$("paymentError").textContent=errText(error)}finally{busy(false)}
};
$("search").oninput=renderStudents;
$("ownerFilter").onchange=loadStudents;
function selectStat(card){statFilter=card.dataset.statFilter;$("search").value="";renderStudents();document.querySelector(".panel").scrollIntoView({behavior:"smooth",block:"start"})}
document.querySelectorAll("[data-stat-filter]").forEach(card=>{card.onclick=()=>selectStat(card);card.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectStat(card)}}});

function setSelect(id,value){const el=$(id),v=value??"";if(v&&![...el.options].some(o=>o.value===v))el.add(new Option(v,v));el.value=v||el.options[0]?.value||""}
function showPhoto(value=""){currentPhoto=value||"";$("photoPreview").src=currentPhoto;$("photoPreview").classList.toggle("hidden",!currentPhoto);$("photoPlaceholder").classList.toggle("hidden",Boolean(currentPhoto))}
async function compressPhoto(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const ratio=img.width/img.height;if(Math.abs(ratio-.75)>.045){URL.revokeObjectURL(url);return reject(new Error("Ảnh không đúng tỷ lệ 3×4. Vui lòng chọn ảnh dọc 3×4 nền trắng."))}const check=document.createElement("canvas"),cw=180,ch=240;check.width=cw;check.height=ch;const cx=check.getContext("2d",{willReadFrequently:true});cx.drawImage(img,0,0,cw,ch);const p=cx.getImageData(0,0,cw,ch).data;let white=0,total=0;for(let y=0;y<ch*.72;y+=3)for(let x=0;x<cw;x+=3)if(y<ch*.18||x<cw*.1||x>cw*.9){const i=(y*cw+x)*4,totalPixel=p[i]+p[i+1]+p[i+2];total++;if(totalPixel>690&&Math.max(p[i],p[i+1],p[i+2])-Math.min(p[i],p[i+1],p[i+2])<32)white++}if(!total||white/total<.58){URL.revokeObjectURL(url);return reject(new Error("Ảnh chưa đạt yêu cầu nền trắng. Vui lòng chọn ảnh thẻ 3×4 có nền trắng rõ ràng."))}const canvas=document.createElement("canvas");canvas.width=450;canvas.height=600;canvas.getContext("2d").drawImage(img,0,0,450,600);URL.revokeObjectURL(url);resolve(canvas.toDataURL("image/jpeg",.82))};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Không đọc được file ảnh"))};img.src=url})}
function openStudent(s=null){
  const schedule=parseScheduleFromNotes(s?.notes||"")||{dates:{}};
  $("studentForm").reset();$("studentError").textContent="";$("studentId").value=s?.id||"";$("studentTitle").textContent=s?"Sửa thông tin học viên":"Thêm học viên";
  $("name").value=s?.name||"";$("dob").value=s?.date_of_birth||"";$("cccd").value=s?.cccd||"";$("phone").value=s?.phone||"";$("course").value=s?.course||"";$("tuitionTotal").value=s?.tuition_total||"";$("paid").value=s?.paid||"";$("address").value=s?.address||"";$("notes").value=stripScheduleFromNotes(s?.notes||"");$("onlineStart").value=String(schedule.dates?.online_start||"").slice(0,10);$("onlineEnd").value=String(schedule.dates?.online_end||"").slice(0,10);$("photoFile").value="";showPhoto(s?.photo_data||"");
  $("paid").readOnly=paymentsReady;$("paidFieldHint").textContent=paymentsReady?"Được tính tự động từ Sổ thu & Phiếu thu.":"Nhập tổng số tiền đã thu.";
  setSelect("licenseClass",s?.license_class||"B số tự động");setSelect("profileStatus",s?.profile_status||"Đã ghi nhận");setSelect("onlineStatus",s?.online_status||"Chưa hoàn thành");setSelect("cabinStatus",s?.cabin_status||"Chưa hoàn thành");setSelect("datStatus",s?.dat_status||"Chưa thực hiện");setSelect("graduationStatus",s?.graduation_status||"Chưa hoàn thành");setSelect("examStatus",s?.exam_status||"Chưa thi sát hạch");
  if(me.role==="admin"){$("studentOwner").value=s?.owner_id||$("ownerFilter").value||me.id;$("studentOwner").disabled=Boolean(s)}
  $("studentDialog").showModal();setTimeout(()=>$("name").focus(),50);
}
$("addStudentBtn").onclick=()=>openStudent();
$("photoFile").onchange=async e=>{const file=e.target.files[0];if(!file)return;const ext=file.name.toLowerCase().split(".").pop(),validType=["image/jpeg","image/png"].includes(file.type)&&["jpg","jpeg","png"].includes(ext);if(!validType){e.target.value="";return $("studentError").textContent="Chỉ chấp nhận file ảnh JPG, JPEG hoặc PNG."}if(file.size>10*1024*1024){e.target.value="";return $("studentError").textContent="Ảnh gốc không được lớn hơn 10 MB."}try{$("studentError").textContent="Đang kiểm tra ảnh 3×4 nền trắng…";showPhoto(await compressPhoto(file));$("studentError").textContent=""}catch(err){e.target.value="";$("studentError").textContent=errText(err)}};
$("removePhotoBtn").onclick=()=>{$("photoFile").value="";showPhoto("")};
$("studentRows").onclick=async e=>{
  const edit=e.target.dataset.edit,del=e.target.dataset.delete,download=e.target.dataset.downloadPhoto,account=e.target.dataset.studentAccount,theory=e.target.dataset.theoryProgress,payment=e.target.dataset.paymentStudent;
  if(theory)return openTheoryDetail(students.find(s=>String(s.id)===String(theory)));
  if(account)return openStudentAccount(students.find(s=>String(s.id)===account));
  if(payment)return openPaymentLedger(students.find(s=>String(s.id)===String(payment)));
  if(download&&me.role==="admin"){const s=students.find(x=>x.id===download);if(!s?.photo_data)return toast("Học viên chưa có ảnh thẻ");const a=document.createElement("a"),safe=normalize(s.name).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"hoc-vien";a.href=s.photo_data;a.download=`anh-the-3x4-${safe}.jpg`;document.body.appendChild(a);a.click();a.remove();return}
  if(edit)return openStudent(students.find(s=>s.id===edit));
  if(del&&!operationsReady){await loadOperations();if(!operationsReady)return toast("Cần chạy file SQL Thùng rác trước khi xóa học viên.")}
  if(del&&confirm("Chuyển học viên này vào Thùng rác? Admin có thể khôi phục lại sau.")){
    busy(true);try{await rpc("app_delete_student",{p_token:token,p_student_id:del});toast("Đã chuyển học viên vào Thùng rác");await loadStudents()}catch(err){toast(errText(err))}finally{busy(false)}
  }
};
$("studentForm").onsubmit=async e=>{
  e.preventDefault();$("studentError").textContent="";
  if(!$("name").value.trim())return $("studentError").textContent="Vui lòng nhập họ và tên.";
  if($("paid").value&&Number($("paid").value)>Number($("tuitionTotal").value||0))return $("studentError").textContent="Số tiền đã thu không được lớn hơn tổng học phí.";
  const current=students.find(s=>s.id===$("studentId").value),schedule=parseScheduleFromNotes(current?.notes||"")||{version:1,dates:{},locations:{},note:""};
  const onlineStart=$("onlineStart").value,onlineEnd=$("onlineEnd").value;
  if(Boolean(onlineStart)!==Boolean(onlineEnd))return $("studentError").textContent="Vui lòng nhập đủ ngày bắt đầu và kết thúc lý thuyết online.";
  if(onlineStart&&onlineEnd<onlineStart)return $("studentError").textContent="Ngày kết thúc lý thuyết online không được trước ngày bắt đầu.";
  schedule.dates=schedule.dates||{};schedule.locations=schedule.locations||{};
  if(onlineStart){schedule.dates.online_start=onlineStart;schedule.dates.online_end=onlineEnd}
  else{delete schedule.dates.online_start;delete schedule.dates.online_end;delete schedule.locations.online_start;delete schedule.locations.online_end}
  schedule.updatedAt=new Date().toISOString();
  const hasSchedule=Object.keys(schedule.dates).length||Object.keys(schedule.locations).length||schedule.note;
  const data={name:$("name").value.trim(),date_of_birth:$("dob").value||null,cccd:$("cccd").value.trim(),phone:$("phone").value.trim(),license_class:$("licenseClass").value,course:$("course").value.trim(),profile_status:$("profileStatus").value,online_status:$("onlineStatus").value,cabin_status:$("cabinStatus").value,dat_status:$("datStatus").value,graduation_status:$("graduationStatus").value,exam_status:$("examStatus").value,tuition_total:Number($("tuitionTotal").value||0),paid:Number($("paid").value||0),address:$("address").value.trim(),notes:embedScheduleInNotes($("notes").value.trim(),hasSchedule?schedule:null),photo_data:currentPhoto};
  $("saveStudentBtn").disabled=true;
  try{const editingId=$("studentId").value||null,savedId=await rpc("app_save_student",{p_token:token,p_student_id:editingId,p_data:data,p_owner_id:me.role==="admin"?$("studentOwner").value:null});await recordAudit(editingId?"student_updated":"student_created","student",savedId,data.name,{student_code:current?.student_code||"",tuition_total:data.tuition_total,paid:data.paid});$("studentDialog").close();await loadStudents();const saved=students.find(s=>s.id===savedId);if(currentPhoto&&(!saved||!saved.photo_data)){alert("Thông tin đã lưu nhưng ảnh chưa được cơ sở dữ liệu ghi nhận. Hãy chạy file CAP-NHAT-ANH-3X4.sql trong Supabase rồi tải ảnh lại.")}else toast("Đã lưu thông tin học viên")}
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
async function loadPublicTheoryAccounts(){
  try{
    publicTheoryAccounts=await rpc("app_admin_list_public_theory_accounts",{p_token:token})||[];
    publicTheoryAccountsReady=true;
  }catch(error){
    publicTheoryAccounts=[];publicTheoryAccountsReady=false;
    const missing=/app_admin_list_public_theory_accounts|schema cache|PGRST202/i.test(errText(error));
    if(!missing)toast(errText(error));
  }
}
function renderPublicTheoryAccounts(){
  const query=normalize($("publicTheoryAccountSearch").value);
  const items=publicTheoryAccounts.filter(account=>!query||normalize(`${account.full_name} ${account.phone} ${account.username}`).includes(query));
  $("publicAccountTotal").textContent=publicTheoryAccounts.length;
  $("publicAccountActive").textContent=publicTheoryAccounts.filter(account=>account.active).length;
  $("publicAccountStarted").textContent=publicTheoryAccounts.filter(account=>Number(account.answered_count)>0||Number(account.exam_count)>0).length;
  $("publicAccountPassed").textContent=publicTheoryAccounts.reduce((sum,account)=>sum+(Number(account.passed_exam_count)||0),0);
  if(!publicTheoryAccountsReady){
    $("publicTheoryAccountList").innerHTML='<div class="public-account-empty">Cần chạy file <b>CAP-NHAT-TAI-KHOAN-NGUOI-HOC-BEN-NGOAI.sql</b> trong Supabase để kích hoạt tính năng này.</div>';
    return;
  }
  $("publicTheoryAccountList").innerHTML=items.length?items.map(account=>`
    <article class="public-account-card ${account.active?"":"is-locked"}">
      <div class="public-account-main">
        <span class="public-account-avatar">${esc((account.full_name||account.username||"?").trim().charAt(0).toUpperCase())}</span>
        <div><strong>${esc(account.full_name||"Chưa có tên")}</strong><span>@${esc(account.username)} · ${esc(account.phone||"Chưa có SĐT")}</span></div>
        <em class="${account.active?"active":"locked"}">${account.active?"Đang hoạt động":"Đã khóa"}</em>
      </div>
      <div class="public-account-progress">
        <span><small>Đã học</small><b>${Number(account.answered_count)||0}/600</b></span>
        <span><small>Thi thử</small><b>${Number(account.exam_count)||0} bài</b></span>
        <span><small>Đã đạt</small><b>${Number(account.passed_exam_count)||0} bài</b></span>
        <span><small>Điểm tốt nhất</small><b>${account.best_score==null?"—":`${Number(account.best_score)}/${Number(account.best_total)||0}`}</b></span>
      </div>
      <div class="public-account-meta"><span>Tạo: ${esc(dateTime(account.created_at))}</span><span>Đăng nhập: ${esc(dateTime(account.last_login_at))}</span><span>Học gần nhất: ${esc(dateTime(account.last_activity))}</span></div>
      <div class="public-account-actions">
        <button data-public-reset="${account.id}" type="button">Đặt lại mật khẩu</button>
        <button data-public-toggle="${account.id}" data-active="${account.active}" type="button">${account.active?"Khóa tài khoản":"Mở khóa"}</button>
        <button class="danger" data-public-delete="${account.id}" data-name="${esc(account.full_name||account.username)}" type="button">Xóa</button>
      </div>
    </article>`).join(""):'<div class="public-account-empty">Không tìm thấy tài khoản phù hợp.</div>';
}
$("publicTheoryAccountsBtn").onclick=async()=>{
  $("publicTheoryAccountError").textContent="";
  $("publicTheoryAccountSearch").value="";
  $("publicTheoryAccountsDialog").showModal();
  await loadPublicTheoryAccounts();renderPublicTheoryAccounts();
};
$("publicTheoryAccountSearch").oninput=renderPublicTheoryAccounts;
$("publicTheoryAccountList").onclick=async event=>{
  const button=event.target.closest("button");if(!button)return;
  const id=button.dataset.publicReset||button.dataset.publicToggle||button.dataset.publicDelete;
  if(!id)return;
  const currentAccount=publicTheoryAccounts.find(account=>String(account.id)===String(id));
  $("publicTheoryAccountError").textContent="";
  button.disabled=true;
  try{
    if(button.dataset.publicReset){
      const password=prompt("Nhập mật khẩu tạm mới (ít nhất 8 ký tự):");
      if(!password)return;
      await rpc("app_admin_reset_public_theory_password",{p_token:token,p_account_id:id,p_password:password});
      await recordAudit("public_password_reset","public_theory_account",id,currentAccount?.full_name||currentAccount?.username||"");
      toast("Đã đặt lại mật khẩu và mở khóa tài khoản");
    }else if(button.dataset.publicToggle){
      const active=button.dataset.active==="true";
      await rpc("app_admin_set_public_theory_active",{p_token:token,p_account_id:id,p_active:!active});
      await recordAudit("public_account_status_changed","public_theory_account",id,currentAccount?.full_name||currentAccount?.username||"",{active:!active});
      toast(active?"Đã khóa tài khoản":"Đã mở khóa tài khoản");
    }else{
      const name=button.dataset.name||"tài khoản này";
      if(!confirm(`Xóa vĩnh viễn ${name} và toàn bộ tiến độ học, lịch sử thi?`))return;
      await rpc("app_admin_delete_public_theory_account",{p_token:token,p_account_id:id});
      await recordAudit("public_account_deleted","public_theory_account",id,name);
      toast("Đã xóa tài khoản người học");
    }
    await loadPublicTheoryAccounts();renderPublicTheoryAccounts();
  }catch(error){$("publicTheoryAccountError").textContent=errText(error)}
  finally{button.disabled=false}
};
async function openTheoryDetail(student){
  if(me?.role!=="admin"||!student)return;
  if(!theoryProgressReady){
    toast("Cần chạy file CAP-NHAT-TIEN-DO-600-CAU.sql trong Supabase trước.");
    return;
  }
  $("theoryDetailTitle").textContent=`Tiến độ của ${student.name}`;
  $("theoryDetailMeta").textContent=`${student.student_code||"Chưa có mã"} · ${student.license_class||"Chưa có hạng"}`;
  $("theoryDetailError").textContent="";
  $("theoryDetailMetrics").innerHTML='<div class="theory-detail-loading">Đang tải tiến độ và lịch sử thi…</div>';
  $("theoryExamHistory").innerHTML="";
  $("theoryProgressDialog").showModal();
  try{
    const detail=await rpc("app_admin_get_theory_detail",{p_token:token,p_student_id:student.id});
    const answered=Number(detail.answered_count)||0,correct=Number(detail.correct_count)||0,wrong=Number(detail.wrong_count)||0;
    const accuracy=answered?Math.round(correct/answered*100):0,attempts=Array.isArray(detail.attempts)?detail.attempts:[];
    $("theoryDetailMetrics").innerHTML=`
      <article><small>Đã học</small><strong>${answered}/600</strong><span>${Math.round(answered/600*100)}% bộ câu hỏi</span></article>
      <article><small>Trả lời đúng</small><strong>${correct}</strong><span>${accuracy}% trong số đã học</span></article>
      <article><small>Cần ôn lại</small><strong>${wrong}</strong><span>${Number(detail.bookmarks_count)||0} câu đánh dấu</span></article>
      <article><small>Lần hoạt động cuối</small><strong class="date-value">${esc(dateTime(detail.last_activity))}</strong><span>Câu gần nhất: ${Number(detail.last_question_id)||1}</span></article>`;
    $("theoryExamHistory").innerHTML=attempts.length?attempts.map(attempt=>`
      <tr>
        <td><strong>Hạng ${esc(attempt.license_class)}</strong><span>${esc(dateTime(attempt.submitted_at))}</span></td>
        <td><b>${Number(attempt.score)||0}/${Number(attempt.total)||0}</b></td>
        <td><span class="exam-attempt-state ${attempt.passed?"passed":"failed"}">${attempt.passed?"Đạt":"Chưa đạt"}</span>${attempt.critical_correct?"":"<small>Sai câu điểm liệt</small>"}</td>
        <td>${theoryDuration(attempt.elapsed_seconds)}</td>
      </tr>`).join(""):'<tr><td colspan="4"><div class="theory-history-empty">Học viên chưa nộp bài thi thử nào.</div></td></tr>';
  }catch(error){
    $("theoryDetailMetrics").innerHTML="";
    $("theoryDetailError").textContent=errText(error);
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
    await recordAudit("student_account_created","student",selectedStudentAccount?.student?.id,selectedStudentAccount?.student?.name||"",{username});
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
    await recordAudit("student_password_reset","student_account",account.id,selectedStudentAccount?.student?.name||account.username);
    await loadStudentAccounts();renderStudents();$("studentAccountDialog").close();toast("Đã đặt lại mật khẩu học viên");
  }catch(error){$("studentAccountError").textContent=errText(error)}
};
$("toggleStudentAccountBtn").onclick=async()=>{
  const account=selectedStudentAccount?.account;if(!account)return;
  try{
    await rpc("app_set_student_account_active",{p_token:token,p_account_id:account.id,p_active:!account.active});
    await recordAudit("student_account_status_changed","student_account",account.id,selectedStudentAccount?.student?.name||account.username,{active:!account.active});
    await loadStudentAccounts();renderStudents();$("studentAccountDialog").close();toast(account.active?"Đã khóa tài khoản học viên":"Đã mở khóa tài khoản học viên");
  }catch(error){$("studentAccountError").textContent=errText(error)}
};
$("usersBtn").onclick=()=>{$("userError").textContent="";$("usersDialog").showModal()};
$("userForm").onsubmit=async event=>{
  event.preventDefault();$("userError").textContent="";$("createUserBtn").disabled=true;
  const username=$("newUsername").value.trim();
  try{const created=await rpc("app_create_user",{p_token:token,p_username:username,p_password:$("newPassword").value});await recordAudit("manager_created","manager",created?.id||"",username);event.target.reset();toast("Đã tạo tài khoản quản lý");await loadUsers()}
  catch(error){$("userError").textContent=errText(error)}finally{$("createUserBtn").disabled=false}
};
$("userList").onclick=async event=>{
  const button=event.target.closest("button");if(!button)return;
  try{
    if(button.dataset.toggle){const active=button.dataset.active!=="true",user=users.find(item=>String(item.id)===String(button.dataset.toggle));await rpc("app_set_user_active",{p_token:token,p_user_id:button.dataset.toggle,p_active:active});await recordAudit("manager_status_changed","manager",button.dataset.toggle,user?.username||"",{active});await loadUsers();toast("Đã cập nhật tài khoản")}
    if(button.dataset.reset){const password=prompt("Nhập mật khẩu tạm mới (ít nhất 8 ký tự):");if(password){const user=users.find(item=>String(item.id)===String(button.dataset.reset));await rpc("app_admin_reset_password",{p_token:token,p_user_id:button.dataset.reset,p_password:password});await recordAudit("manager_password_reset","manager",button.dataset.reset,user?.username||"");toast("Đã đặt lại mật khẩu")}}
  }catch(error){$("userError").textContent=errText(error)}
};

function openForcedPassword(){forcePasswordChange=true;$("passwordNotice").textContent="Đây là lần đăng nhập đầu tiên. Anh cần đổi mật khẩu trước khi tiếp tục.";$("passwordClose").classList.add("hidden");$("passwordCancel").classList.add("hidden");$("passwordDialog").showModal()}
$("changePasswordBtn").onclick=()=>{forcePasswordChange=false;$("passwordNotice").textContent="Mật khẩu mới phải có ít nhất 8 ký tự.";$("passwordClose").classList.remove("hidden");$("passwordCancel").classList.remove("hidden");$("passwordError").textContent="";$("passwordDialog").showModal()};
$("passwordForm").onsubmit=async e=>{e.preventDefault();$("passwordError").textContent="";if($("newOwnPassword").value!==$("confirmOwnPassword").value)return $("passwordError").textContent="Hai lần nhập mật khẩu mới không giống nhau.";$("savePasswordBtn").disabled=true;try{await rpc("app_change_password",{p_token:token,p_old_password:$("oldPassword").value,p_new_password:$("newOwnPassword").value});forcePasswordChange=false;me.force_change_password=false;$("passwordDialog").close();e.target.reset();toast("Đã đổi mật khẩu thành công")}catch(err){$("passwordError").textContent=errText(err)}finally{$("savePasswordBtn").disabled=false}};
document.querySelectorAll("dialog .close").forEach(b=>b.onclick=()=>{const d=b.closest("dialog");if(d===$("passwordDialog")&&forcePasswordChange)return;d.close()});
document.querySelectorAll("dialog").forEach(d=>d.addEventListener("cancel",e=>{if(d===$("passwordDialog")&&forcePasswordChange)e.preventDefault()}));

function dataDate(v){if(v instanceof Date&&!Number.isNaN(v.valueOf()))return v.toISOString().slice(0,10);const s=String(v||"").trim();const m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:s}
function findCol(headers,names){return headers.findIndex(h=>names.some(n=>h===n||h.includes(n)))}
let excelModulePromise=null;
async function getExcelJS(){
  try{
    excelModulePromise||=import("exceljs");
    const module=await excelModulePromise;
    return module.default||module;
  }catch{
    excelModulePromise=null;
    throw new Error("Không tải được bộ xử lý Excel. Vui lòng kiểm tra kết nối và thử lại.");
  }
}
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
function excelDateOnly(value){return dateOnly(value)}
function dataDatetime(value){
  if(value instanceof Date&&!Number.isNaN(value.valueOf()))return localDatetime(value);
  const text=String(value||"").trim();
  if(!text)return"";
  const match=text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if(match)return `${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}T${(match[4]||"00").padStart(2,"0")}:${match[5]||"00"}`;
  const parsed=new Date(text);
  return Number.isNaN(parsed.valueOf())?"":localDatetime(parsed);
}
async function buildExcelFile(workbook,filename){
  const bytes=await workbook.xlsx.writeBuffer();
  return new File([bytes],filename,{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
function excelCellValue(value){
  if(value==null)return"";
  if(value instanceof Date)return value;
  if(typeof value!=="object")return value;
  if("result" in value)return excelCellValue(value.result);
  if("text" in value)return value.text;
  if(Array.isArray(value.richText))return value.richText.map(part=>part.text||"").join("");
  return String(value);
}
function releaseExcelPreview(){
  if(excelPreviewUrl)URL.revokeObjectURL(excelPreviewUrl);
  excelPreviewUrl="";excelPreviewFile=null;
}
function renderExcelPreview({title,file,headers,rows,note,mode,duplicateSummary=null}){
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
  $("excelConflictOptions").classList.toggle("hidden",exporting);
  $("excelDuplicateSummary").classList.toggle("hidden",exporting||!duplicateSummary);
  if(duplicateSummary)$("excelDuplicateSummary").innerHTML=`<span class="is-new"><b>${duplicateSummary.new}</b> hồ sơ mới</span><span class="is-existing"><b>${duplicateSummary.existing}</b> trùng dữ liệu</span><span class="is-review"><b>${duplicateSummary.review}</b> cần kiểm tra</span><span class="is-blocked"><b>${duplicateSummary.deleted+duplicateSummary.duplicate_file}</b> sẽ bỏ qua</span>`;
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
  if(excelImportResolve){const resolve=excelImportResolve;excelImportResolve=null;resolve(accepted?$("excelDuplicateMode").value:false)}
  if($("excelPreviewDialog").open)$("excelPreviewDialog").close();
  releaseExcelPreview();
}
function previewExportFile(file,list){
  const headers=["Họ và tên","Hạng","Lý thuyết online","BĐ Online","KT Online","DAT","BĐ DAT tự động","KT DAT tự động","BĐ DAT cơ khí","KT DAT cơ khí","Tổng học phí","Đã thu"];
  const rows=list.slice(0,20).map(s=>{
    const dates=(parseScheduleFromNotes(s.notes)||{}).dates||{};
    return[s.name,s.license_class,s.online_status,excelDateOnly(dates.online_start),excelDateOnly(dates.online_end),s.dat_status,excelDatetime(dates.dat_auto_start),excelDatetime(dates.dat_auto_end),excelDatetime(dates.dat_manual_start),excelDatetime(dates.dat_manual_end),money(s.tuition_total),money(s.paid)];
  });
  renderExcelPreview({title:"File xuất đã sẵn sàng",file,headers,rows,note:`File có ${list.length} học viên và 25 cột dữ liệu. Bảng đang hiển thị tối đa 20 học viên để kiểm tra nhanh.`,mode:"export"});
}
function importStatusLabel(item){
  const status=item._import?.status;
  return status==="new"?"Mới":status==="existing"?"Sẽ cập nhật":status==="deleted"?"Trong Thùng rác":status==="duplicate_file"?"Trùng trong file":"Cần kiểm tra";
}
function confirmExcelImport(file,analysis,summary){
  $("excelDuplicateMode").value="update";
  renderExcelPreview({
    title:"Kiểm tra trùng trước khi nhập",
    file,
    headers:["Dòng","Trạng thái","Họ và tên","Mã học viên","CCCD","Điện thoại","Lý do đối chiếu"],
    rows:analysis.slice(0,40).map(item=>[item._import.rowNumber,importStatusLabel(item),item.name,item.student_code||"—",item.cccd||"—",item.phone||"—",item._import.reason]),
    note:`Đã kiểm tra ${analysis.length} dòng theo mã học viên, CCCD và số điện thoại. Bảng hiển thị tối đa 40 dòng; hồ sơ cần kiểm tra sẽ được bỏ qua để Admin đối chiếu thủ công.${paymentsReady?" Số tiền đã thu của hồ sơ hiện có chỉ được cập nhật qua Sổ thu & Phiếu thu.":""}`,
    mode:"import",duplicateSummary:summary
  });
  return new Promise(resolve=>{excelImportResolve=resolve});
}
const importFields=["name","date_of_birth","cccd","phone","address","license_class","course","profile_status","online_status","cabin_status","dat_status","graduation_status","exam_status","tuition_total","paid"];
function studentDataForSave(student){
  return Object.fromEntries(importFields.map(field=>[field,student?.[field]??(field==="tuition_total"||field==="paid"?0:"")]).concat([["notes",student?.notes||""],["photo_data",student?.photo_data||""]]));
}
function importDataForSave(item){
  const existing=item._import?.status==="existing"?item._import.match:null;
  if(!existing){const data=studentDataForSave(item);data.notes=item.notes||"";data.photo_data="";return data}
  const data=studentDataForSave(existing);
  for(const field of importFields)if(item._present?.[field]&&!(paymentsReady&&existing&&field==="paid"))data[field]=item[field];
  const touched=item._scheduleTouched||[],notesTouched=Boolean(item._present?.notes);
  if(touched.length||notesTouched){
    const schedule=parseScheduleFromNotes(existing.notes)||{version:1,dates:{},locations:{},note:""};
    schedule.dates=schedule.dates||{};schedule.locations=schedule.locations||{};
    for(const key of touched){if(item._scheduleDates?.[key])schedule.dates[key]=item._scheduleDates[key];else{delete schedule.dates[key];delete schedule.locations[key]}}
    schedule.updatedAt=new Date().toISOString();
    const plainNotes=notesTouched?item._noteText:stripScheduleFromNotes(existing.notes||""),hasSchedule=Object.keys(schedule.dates).length||Object.keys(schedule.locations).length||schedule.note;
    data.notes=embedScheduleInNotes(plainNotes,hasSchedule?schedule:null);
  }
  return data;
}
function financialSummary(list){
  const total=list.reduce((sum,s)=>sum+Math.max(0,Number(s.tuition_total)||0),0);
  const paid=list.reduce((sum,s)=>sum+Math.max(0,Number(s.paid)||0),0);
  return{total,paid,debt:list.reduce((sum,s)=>sum+Math.max(0,(Number(s.tuition_total)||0)-(Number(s.paid)||0)),0),debtCount:list.filter(s=>(Number(s.tuition_total)||0)>(Number(s.paid)||0)).length};
}
$("exportBtn").onclick=async()=>{
  $("exportBtn").disabled=true;
  try{
    const ExcelJS=await getExcelJS(),head=["Mã học viên","Họ và tên","Ngày sinh","CCCD","Điện thoại","Địa chỉ","Hạng","Khóa","Hồ sơ","Lý thuyết online","Bắt đầu lý thuyết online","Kết thúc lý thuyết online","Cabin","DAT","Bắt đầu DAT số tự động","Kết thúc DAT số tự động","Bắt đầu DAT số cơ khí","Kết thúc DAT số cơ khí","Thi tốt nghiệp","Thi sát hạch","Tổng học phí","Đã thu","Còn lại","Tài khoản","Ghi chú"];
    const rows=[head,...students.map(s=>{
      const schedule=parseScheduleFromNotes(s.notes)||{dates:{}};
      return[s.student_code,s.name,s.date_of_birth,s.cccd,s.phone,s.address,s.license_class,s.course,s.profile_status,s.online_status,excelDateOnly(schedule.dates?.online_start),excelDateOnly(schedule.dates?.online_end),s.cabin_status,s.dat_status,excelDatetime(schedule.dates?.dat_auto_start),excelDatetime(schedule.dates?.dat_auto_end),excelDatetime(schedule.dates?.dat_manual_start),excelDatetime(schedule.dates?.dat_manual_end),s.graduation_status,s.exam_status,Math.max(0,Number(s.tuition_total)||0),Math.max(0,Number(s.paid)||0),Math.max(0,Number(s.tuition_total||0)-Number(s.paid||0)),s.owner_username,stripScheduleFromNotes(s.notes)];
    })];
    const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet("DATA HỌC VIÊN",{views:[{state:"frozen",ySplit:1,activeCell:"A2"}]});
    ws.addRows(rows);
    [14,24,13,16,15,28,16,16,18,20,22,22,18,18,22,22,22,22,20,22,16,16,16,16,28].forEach((width,index)=>ws.getColumn(index+1).width=width);
    ws.autoFilter={from:"A1",to:`Y${Math.max(1,rows.length)}`};
    const headerRow=ws.getRow(1);
    headerRow.height=25;
    headerRow.font={bold:true,color:{argb:"FFFFFFFF"}};
    headerRow.alignment={vertical:"middle",horizontal:"center"};
    headerRow.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF155FAF"}};
    for(let r=2;r<=rows.length;r++){
      ws.getCell(`C${r}`).numFmt="dd/mm/yyyy";
      for(const c of ["K","L"])ws.getCell(`${c}${r}`).numFmt="dd/mm/yyyy";
      for(const c of ["O","P","Q","R"])ws.getCell(`${c}${r}`).numFmt="dd/mm/yyyy hh:mm";
      for(const c of ["U","V","W"])ws.getCell(`${c}${r}`).numFmt="#,##0 [$₫-vi-VN]";
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
    const summarySheet=wb.addWorksheet("TỔNG HỢP");
    summarySheet.addRows(summaryRows);
    summarySheet.getColumn(1).width=30;summarySheet.getColumn(2).width=24;
    summarySheet.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};
    summarySheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF155FAF"}};
    for(const r of [4,5,6])summarySheet.getCell(`B${r}`).numFmt="#,##0 [$₫-vi-VN]";
    wb.creator="Hệ thống quản lý học viên Thầy Đạt";
    wb.title="DATA học viên Thầy Đạt";
    wb.subject="Dữ liệu quản lý học viên lái xe";
    wb.created=new Date();
    const file=await buildExcelFile(wb,`DATA-hoc-vien-${excelDate()}.xlsx`);
    previewExportFile(file,students);
    await recordAudit("excel_export","student_data","",`${students.length} học viên`,{student_count:students.length});
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
    const ExcelJS=await getExcelJS(),workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet=workbook.getWorksheet("DATA HỌC VIÊN")||workbook.worksheets[0];
    if(!sheet)throw new Error("File Excel không có trang tính.");
    const columnCount=Math.max(1,sheet.columnCount),rows=[];
    sheet.eachRow({includeEmpty:true},row=>rows.push(Array.from({length:columnCount},(_,index)=>excelCellValue(row.getCell(index+1).value))));
    if(rows.length<2)throw new Error("File Excel không có dữ liệu.");
    const h=rows[0].map(normalize),idx={code:findCol(h,["ma hoc vien","ma hv"]),name:findCol(h,["ho va ten","ho ten","hoc vien"]),dob:findCol(h,["ngay sinh"]),cccd:findCol(h,["cccd","cmnd"]),phone:findCol(h,["dien thoai","so dien thoai","sdt"]),address:findCol(h,["dia chi"]),license:findCol(h,["hang dao tao","hang lai xe","hang"]),course:findCol(h,["khoa hoc","khoa"]),profile:findCol(h,["trang thai ho so","ho so"]),online:findCol(h,["ly thuyet online","online"]),onlineStart:findCol(h,["bat dau ly thuyet online","ngay bat dau ly thuyet online","bat dau online"]),onlineEnd:findCol(h,["ket thuc ly thuyet online","ngay ket thuc ly thuyet online","ket thuc online"]),cabin:findCol(h,["cabin"]),dat:findCol(h,["dat"]),datAutoStart:findCol(h,["bat dau dat so tu dong"]),datAutoEnd:findCol(h,["ket thuc dat so tu dong"]),datManualStart:findCol(h,["bat dau dat so co khi"]),datManualEnd:findCol(h,["ket thuc dat so co khi"]),graduation:findCol(h,["thi tot nghiep","tot nghiep"]),exam:findCol(h,["thi sat hach","sat hach"]),total:findCol(h,["tong hoc phi"]),paid:findCol(h,["da thu"]),paid1:findCol(h,["hoc phi lan 1"]),paid2:findCol(h,["hoc phi lan 2"]),paid3:findCol(h,["hoc phi lan 3"]),notes:findCol(h,["ghi chu"])};
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
        online_start:dataDate(get("onlineStart")),online_end:dataDate(get("onlineEnd")),
        dat_auto_start:dataDatetime(get("datAutoStart")),dat_auto_end:dataDatetime(get("datAutoEnd")),
        dat_manual_start:dataDatetime(get("datManualStart")),dat_manual_end:dataDatetime(get("datManualEnd"))
      };
      for(const [startKey,endKey,label] of [["online_start","online_end","lý thuyết online"],["dat_auto_start","dat_auto_end","DAT số tự động"],["dat_manual_start","dat_manual_end","DAT số cơ khí"]]){
        if(Boolean(dates[startKey])!==Boolean(dates[endKey]))throw new Error(`Dòng ${rowNumber}: Vui lòng nhập đủ ngày bắt đầu và kết thúc ${label}.`);
        if(dates[startKey]&&new Date(dates[endKey])<new Date(dates[startKey]))throw new Error(`Dòng ${rowNumber}: Ngày kết thúc ${label} không được trước ngày bắt đầu.`);
      }
      const scheduleDates=Object.fromEntries(Object.entries(dates).filter(([,value])=>value)),scheduleTouched=[["onlineStart","online_start"],["onlineEnd","online_end"],["datAutoStart","dat_auto_start"],["datAutoEnd","dat_auto_end"],["datManualStart","dat_manual_start"],["datManualEnd","dat_manual_end"]].filter(([column])=>idx[column]>=0).map(([,key])=>key);
      const noteText=get("notes"),notes=embedScheduleInNotes(noteText,Object.keys(scheduleDates).length?{version:1,dates:scheduleDates,locations:{},note:"",updatedAt:new Date().toISOString()}:null);
      return{_rowNumber:rowNumber,student_code:get("code"),name:get("name"),date_of_birth:dataDate(get("dob"))||null,cccd:get("cccd"),phone:get("phone"),address:get("address"),license_class:get("license")||"B số tự động",course:get("course"),profile_status:get("profile")||"Đã ghi nhận",online_status:get("online")||"Chưa hoàn thành",cabin_status:get("cabin")||"Chưa hoàn thành",dat_status:get("dat")||"Chưa thực hiện",graduation_status:get("graduation")||"Chưa hoàn thành",exam_status:get("exam")||"Chưa thi sát hạch",tuition_total:total,paid,notes,_noteText:noteText,_scheduleDates:scheduleDates,_scheduleTouched:scheduleTouched,_present:{name:idx.name>=0,date_of_birth:idx.dob>=0,cccd:idx.cccd>=0,phone:idx.phone>=0,address:idx.address>=0,license_class:idx.license>=0,course:idx.course>=0,profile_status:idx.profile>=0,online_status:idx.online>=0,cabin_status:idx.cabin>=0,dat_status:idx.dat>=0,graduation_status:idx.graduation>=0,exam_status:idx.exam>=0,tuition_total:idx.total>=0,paid:idx.paid>=0||idx.paid1>=0||idx.paid2>=0||idx.paid3>=0,notes:idx.notes>=0}};
    });
    const allStudents=$("ownerFilter").value?await rpc("app_list_students",{p_token:token,p_owner_id:null}):students;
    if(!operationsReady)await loadOperations();
    const analysis=analyzeStudentImport(records,allStudents,deletedStudents),summary=importSummary(analysis);
    busy(false);
    const duplicateMode=await confirmExcelImport(file,analysis,summary);if(!duplicateMode)return;
    const conflictCount=summary.existing+summary.deleted+summary.duplicate_file+summary.review;
    if(duplicateMode==="stop"&&conflictCount)throw new Error(`Đã dừng nhập vì phát hiện ${conflictCount} hồ sơ trùng hoặc cần kiểm tra.`);
    busy(true);
    let created=0,updated=0,skipped=0;
    for(const item of analysis){
      const status=item._import.status;
      if(status==="deleted"||status==="duplicate_file"||status==="review"||(status==="existing"&&duplicateMode==="skip")){skipped++;continue}
      const existing=status==="existing"?item._import.match:null,data=importDataForSave(item);
      const savedId=await rpc("app_save_student",{p_token:token,p_student_id:existing?.id||null,p_data:data,p_owner_id:$("ownerFilter").value||me.id});
      if(paymentsReady)await rpc("app_sync_student_payment_balance",{p_token:token,p_student_id:savedId,p_source:`Số dư từ file Excel ${file.name}`});
      if(existing)updated++;else created++;
    }
    await recordAudit("excel_import","student_data","",file.name,{created,updated,skipped,duplicate_mode:duplicateMode});
    await loadStudents();toast(`Excel hoàn tất: thêm ${created}, cập nhật ${updated}, bỏ qua ${skipped}`);
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
