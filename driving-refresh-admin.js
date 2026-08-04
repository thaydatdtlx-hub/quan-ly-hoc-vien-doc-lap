import "./driving-refresh-admin-actions.css";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const $=id=>document.getElementById(id);
let registrations=[],loaded=false,loading=false;

const statusLabels={new:"Chưa liên hệ",contacted:"Đã liên hệ",scheduled:"Đã xếp lịch",completed:"Hoàn thành",cancelled:"Không tiếp tục"};
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const normalize=value=>String(value??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
const managerToken=()=>localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
const dateTime=value=>value?new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value)):"";
const dateOnly=value=>value?String(value).split("-").reverse().join("/"):"Linh hoạt";
const money=value=>new Intl.NumberFormat("vi-VN").format(Number(value)||0)+" ₫";

async function rpc(fn,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||"Không thể kết nối máy chủ");
  return data;
}

function updateSummary(){
  const count=status=>registrations.filter(item=>item.status===status).length;
  $("drivingRefreshTotal").textContent=registrations.length;
  $("drivingRefreshNew").textContent=count("new");
  $("drivingRefreshScheduled").textContent=count("scheduled");
  $("drivingRefreshCompleted").textContent=count("completed");
  $("drivingRefreshToolbarCount").textContent=count("new")?`${count("new")} khách mới`:"Đã xử lý hết";
}

function goalsMarkup(value){
  const goals=Array.isArray(value)?value:[];
  return goals.length?goals.map(goal=>`<span>${esc(goal)}</span>`).join(""):"<span>Chưa ghi rõ</span>";
}

function render(){
  const query=normalize($("drivingRefreshSearch").value),status=$("drivingRefreshStatus").value;
  const rows=registrations.filter(item=>(status==="all"||item.status===status)&&(!query||normalize(`${item.registration_code} ${item.full_name} ${item.phone} ${item.area} ${item.service_type} ${item.training_package}`).includes(query)));
  $("drivingRefreshAdminList").innerHTML=rows.length?rows.map(item=>`
    <article class="refresh-admin-item status-${esc(item.status)}" data-refresh-id="${esc(item.id)}">
      <div class="refresh-admin-person">
        <span>${esc(item.registration_code)}</span>
        <strong>${esc(item.full_name)}</strong>
        <a href="tel:${esc(String(item.phone||"").replace(/[^0-9+]/g,""))}">${esc(item.phone)}</a>
        <small>Đăng ký ${esc(dateTime(item.created_at))}</small>
      </div>
      <div class="refresh-admin-detail">
        <strong>${esc(item.service_type||"Bổ túc tay lái")} · ${esc(item.transmission||"Chưa chọn")} · ${esc(item.duration_hours||2)} giờ · ${esc(money(item.estimated_total))}</strong>
        <small>Gói: ${esc(item.training_package||"Kỹ năng thực tế")} · Tiền xe ${esc(money(item.vehicle_hourly_rate??item.base_hourly_rate))}/giờ${Number(item.track_hourly_rate)>0?` · Phí sân ${esc(money(item.track_hourly_rate))}/giờ`:""}</small>
        <small>${esc(item.license_status||"Chưa ghi tình trạng bằng")}${Number(item.weekend_surcharge_per_hour)>0?` · Có phụ thu cuối tuần ${esc(money(item.weekend_surcharge_per_hour))}/giờ`:""}</small>
        <div class="refresh-admin-goals">${goalsMarkup(item.goals)}</div>
        <small>Lịch mong muốn: ${esc(dateOnly(item.preferred_date))}${item.preferred_time?` · ${esc(item.preferred_time)}`:""}</small>
        ${item.area?`<small>Khu vực: ${esc(item.area)}</small>`:""}
        ${item.note?`<small>Nhu cầu: ${esc(item.note)}</small>`:""}
      </div>
      <div class="refresh-admin-actions">
        <select data-refresh-status aria-label="Trạng thái xử lý của ${esc(item.full_name)}">${Object.entries(statusLabels).map(([value,label])=>`<option value="${value}"${item.status===value?" selected":""}>${label}</option>`).join("")}</select>
        <textarea data-refresh-note maxlength="800" placeholder="Ghi chú tư vấn, lịch đã hẹn…">${esc(item.admin_note||"")}</textarea>
        <div class="refresh-admin-buttons">
          <button type="button" data-refresh-edit>Chỉnh sửa</button>
          <button type="button" data-refresh-delete>Xóa</button>
          <button type="button" data-refresh-save>Lưu trạng thái</button>
        </div>
      </div>
    </article>`).join(""):`<div class="refresh-admin-empty">Không có đăng ký phù hợp với bộ lọc.</div>`;
}

function ensureEditDialog(){
  let dialog=$("drivingRefreshEditDialog");
  if(dialog)return dialog;
  dialog=document.createElement("dialog");
  dialog.id="drivingRefreshEditDialog";
  dialog.className="refresh-registration-edit-dialog";
  dialog.innerHTML=`<form id="drivingRefreshEditForm">
    <input id="drivingRefreshEditId" type="hidden">
    <div class="dialog-head"><div><p class="dialog-kicker">CHỈNH SỬA ĐĂNG KÝ</p><h2 id="drivingRefreshEditTitle">Thông tin khách đăng ký</h2></div><button type="button" class="close" aria-label="Đóng">×</button></div>
    <div class="refresh-registration-edit-grid">
      <label>Họ và tên<input id="drivingRefreshEditName" maxlength="80" required></label>
      <label>Số điện thoại<input id="drivingRefreshEditPhone" inputmode="tel" maxlength="15" required></label>
      <label>Nội dung bổ túc<select id="drivingRefreshEditService"><option>Bổ túc tay lái</option><option>Bổ túc sa hình</option></select></label>
      <label>Gói luyện<select id="drivingRefreshEditPackage"><option>Kỹ năng thực tế</option><option>Luyện tổng hợp</option><option>Chọn từng bài</option></select></label>
      <label>Tình trạng bằng lái<select id="drivingRefreshEditLicense"><option>Đã có bằng lái</option><option>Đang học lái xe</option><option>Lâu chưa lái lại</option><option>Chưa có bằng lái</option></select></label>
      <label>Loại xe<select id="drivingRefreshEditTransmission"><option>Số tự động</option><option>Số sàn</option></select></label>
      <label>Số giờ dự kiến<input id="drivingRefreshEditHours" type="number" min="2" max="20" step="1" required></label>
      <label>Ngày mong muốn<input id="drivingRefreshEditDate" type="date"></label>
      <label>Khung giờ<input id="drivingRefreshEditTime" maxlength="80" placeholder="Linh hoạt"></label>
      <label>Trạng thái<select id="drivingRefreshEditStatus">${Object.entries(statusLabels).map(([value,label])=>`<option value="${value}">${label}</option>`).join("")}</select></label>
      <label class="wide">Kỹ năng / bài sa hình<textarea id="drivingRefreshEditGoals" placeholder="Mỗi nội dung một dòng"></textarea></label>
      <label class="wide">Khu vực<input id="drivingRefreshEditArea" maxlength="160"></label>
      <label class="wide">Nhu cầu khách hàng<textarea id="drivingRefreshEditNote" maxlength="800"></textarea></label>
      <label class="wide">Ghi chú Admin<textarea id="drivingRefreshEditAdminNote" maxlength="800"></textarea></label>
    </div>
    <p id="drivingRefreshEditError" class="refresh-registration-edit-error" role="alert"></p>
    <div class="actions"><button type="button" class="close">Hủy</button><button id="drivingRefreshEditSave" class="primary" type="submit">Lưu chỉnh sửa</button></div>
  </form>`;
  document.body.append(dialog);
  dialog.querySelectorAll(".close").forEach(button=>button.addEventListener("click",()=>dialog.close()));
  $("drivingRefreshEditService").addEventListener("change",syncEditPackage);
  $("drivingRefreshEditForm").addEventListener("submit",saveEditedRegistration);
  return dialog;
}

function syncEditPackage(){
  const driving=$("drivingRefreshEditService").value==="Bổ túc tay lái";
  $("drivingRefreshEditPackage").value=driving?"Kỹ năng thực tế":($("drivingRefreshEditPackage").value==="Kỹ năng thực tế"?"Luyện tổng hợp":$("drivingRefreshEditPackage").value);
  [...$("drivingRefreshEditPackage").options].forEach(option=>option.hidden=driving?option.value!=="Kỹ năng thực tế":option.value==="Kỹ năng thực tế");
}

function openEditRegistration(id){
  const item=registrations.find(row=>String(row.id)===String(id));
  if(!item)return;
  const dialog=ensureEditDialog();
  $("drivingRefreshEditId").value=item.id;
  $("drivingRefreshEditTitle").textContent=`${item.registration_code} · ${item.full_name}`;
  $("drivingRefreshEditName").value=item.full_name||"";
  $("drivingRefreshEditPhone").value=item.phone||"";
  $("drivingRefreshEditService").value=item.service_type||"Bổ túc tay lái";
  $("drivingRefreshEditPackage").value=item.training_package||"Kỹ năng thực tế";
  $("drivingRefreshEditLicense").value=item.license_status||"Đã có bằng lái";
  $("drivingRefreshEditTransmission").value=item.transmission||"Số tự động";
  $("drivingRefreshEditHours").value=item.duration_hours||2;
  $("drivingRefreshEditDate").value=item.preferred_date||"";
  $("drivingRefreshEditTime").value=item.preferred_time||"Linh hoạt";
  $("drivingRefreshEditStatus").value=item.status||"new";
  $("drivingRefreshEditGoals").value=(Array.isArray(item.goals)?item.goals:[]).join("\n");
  $("drivingRefreshEditArea").value=item.area||"";
  $("drivingRefreshEditNote").value=item.note||"";
  $("drivingRefreshEditAdminNote").value=item.admin_note||"";
  $("drivingRefreshEditError").textContent="";
  syncEditPackage();
  dialog.showModal();
  setTimeout(()=>$("drivingRefreshEditName").focus(),50);
}

async function saveEditedRegistration(event){
  event.preventDefault();
  const save=$("drivingRefreshEditSave"),id=$("drivingRefreshEditId").value;
  const goals=$("drivingRefreshEditGoals").value.split("\n").map(value=>value.trim()).filter(Boolean);
  if(!goals.length)return $("drivingRefreshEditError").textContent="Vui lòng nhập ít nhất một kỹ năng hoặc bài sa hình.";
  save.disabled=true;save.textContent="Đang lưu…";$("drivingRefreshEditError").textContent="";
  try{
    const updated=await rpc("app_admin_edit_driving_refresh_registration",{p_token:managerToken(),p_registration_id:id,p_data:{
      full_name:$("drivingRefreshEditName").value.trim(),phone:$("drivingRefreshEditPhone").value.trim(),service_type:$("drivingRefreshEditService").value,
      training_package:$("drivingRefreshEditPackage").value,license_status:$("drivingRefreshEditLicense").value,transmission:$("drivingRefreshEditTransmission").value,
      duration_hours:Number($("drivingRefreshEditHours").value),preferred_date:$("drivingRefreshEditDate").value||null,preferred_time:$("drivingRefreshEditTime").value.trim()||"Linh hoạt",
      goals,area:$("drivingRefreshEditArea").value.trim(),note:$("drivingRefreshEditNote").value.trim(),status:$("drivingRefreshEditStatus").value,
      admin_note:$("drivingRefreshEditAdminNote").value.trim()
    }});
    const index=registrations.findIndex(row=>String(row.id)===String(id));
    if(index>=0)registrations[index]=updated;
    updateSummary();render();$("drivingRefreshEditDialog").close();
  }catch(reason){
    const message=String(reason?.message||"");
    $("drivingRefreshEditError").textContent=/app_admin_edit_driving_refresh_registration|schema cache|PGRST202|Could not find/i.test(message)?"Cần chạy file CAP-NHAT-CHINH-SUA-XOA-DANG-KY-BO-TUC.sql trong Supabase trước.":message||"Chưa thể lưu chỉnh sửa.";
  }finally{save.disabled=false;save.textContent="Lưu chỉnh sửa"}
}

async function deleteRegistration(id){
  const item=registrations.find(row=>String(row.id)===String(id));
  if(!item||!confirm(`Xóa vĩnh viễn đăng ký ${item.registration_code} của ${item.full_name}?\n\nThao tác này không thể hoàn tác.`))return;
  $("drivingRefreshAdminError").textContent="";
  try{
    await rpc("app_admin_delete_driving_refresh_registration",{p_token:managerToken(),p_registration_id:id});
    registrations=registrations.filter(row=>String(row.id)!==String(id));
    updateSummary();render();
  }catch(reason){
    const message=String(reason?.message||"");
    $("drivingRefreshAdminError").textContent=/app_admin_delete_driving_refresh_registration|schema cache|PGRST202|Could not find/i.test(message)?"Cần chạy file CAP-NHAT-CHINH-SUA-XOA-DANG-KY-BO-TUC.sql trong Supabase trước.":message||"Chưa thể xóa đăng ký.";
  }
}

async function loadRegistrations({silent=false}={}){
  if(loading)return;loading=true;
  if(!silent)$("drivingRefreshAdminList").innerHTML='<div class="refresh-admin-empty">Đang tải danh sách đăng ký…</div>';
  $("drivingRefreshAdminError").textContent="";
  try{
    const data=await rpc("app_admin_list_driving_refresh_registrations",{p_token:managerToken()});
    registrations=Array.isArray(data)?data:[];loaded=true;updateSummary();render();
  }catch(reason){
    const message=String(reason?.message||"");
    $("drivingRefreshAdminError").textContent=/app_admin_list_driving_refresh_registrations|schema cache|PGRST202|Could not find/i.test(message)?"Cần chạy file SQL bổ túc tay lái và sa hình trong Supabase để kích hoạt danh sách này.":message;
    if(!silent)$("drivingRefreshAdminList").innerHTML='<div class="refresh-admin-empty">Chưa thể tải dữ liệu đăng ký.</div>';
  }finally{loading=false}
}

$("drivingRefreshAdminBtn")?.addEventListener("click",async()=>{
  $("drivingRefreshAdminDialog").showModal();
  await loadRegistrations();
  setTimeout(()=>$("drivingRefreshSearch").focus(),60);
});
$("drivingRefreshReload")?.addEventListener("click",()=>loadRegistrations());
$("drivingRefreshSearch")?.addEventListener("input",render);
$("drivingRefreshStatus")?.addEventListener("change",render);
$("drivingRefreshAdminList")?.addEventListener("click",async event=>{
  const item=event.target.closest("[data-refresh-id]"),id=item?.dataset.refreshId;if(!id)return;
  if(event.target.closest("[data-refresh-edit]"))return openEditRegistration(id);
  if(event.target.closest("[data-refresh-delete]"))return deleteRegistration(id);
  const save=event.target.closest("[data-refresh-save]");if(!save)return;
  save.disabled=true;save.textContent="Đang lưu…";$("drivingRefreshAdminError").textContent="";
  try{
    const updated=await rpc("app_admin_update_driving_refresh_registration",{p_token:managerToken(),p_registration_id:id,p_status:item.querySelector("[data-refresh-status]").value,p_admin_note:item.querySelector("[data-refresh-note]").value.trim()});
    const index=registrations.findIndex(row=>String(row.id)===String(id));if(index>=0)registrations[index]={...registrations[index],...updated};
    updateSummary();render();
  }catch(reason){$("drivingRefreshAdminError").textContent=reason?.message||"Chưa thể lưu cập nhật.";save.disabled=false;save.textContent="Lưu trạng thái"}
});

const adminButton=$("drivingRefreshAdminBtn");
if(adminButton){
  const observer=new MutationObserver(()=>{if(!adminButton.classList.contains("hidden")&&!loaded)loadRegistrations({silent:true})});
  observer.observe(adminButton,{attributes:true,attributeFilter:["class"]});
}
