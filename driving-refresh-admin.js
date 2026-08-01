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
        <button type="button" data-refresh-save>Lưu cập nhật</button>
      </div>
    </article>`).join(""):`<div class="refresh-admin-empty">Không có đăng ký phù hợp với bộ lọc.</div>`;
}

async function loadRegistrations({silent=false}={}){
  if(loading)return;loading=true;
  if(!silent)$("drivingRefreshAdminList").innerHTML='<div class="refresh-admin-empty">Đang tải danh sách đăng ký…</div>';
  $("drivingRefreshAdminError").textContent="";
  try{
    const data=await rpc("app_admin_list_driving_refresh_registrations",{p_token:managerToken()});
    registrations=Array.isArray(data)?data:[];loaded=true;updateSummary();render();
  }catch(error){
    const message=String(error?.message||"");
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
  const save=event.target.closest("[data-refresh-save]");if(!save)return;
  const item=save.closest("[data-refresh-id]"),id=item?.dataset.refreshId;if(!id)return;
  save.disabled=true;save.textContent="Đang lưu…";$("drivingRefreshAdminError").textContent="";
  try{
    const updated=await rpc("app_admin_update_driving_refresh_registration",{p_token:managerToken(),p_registration_id:id,p_status:item.querySelector("[data-refresh-status]").value,p_admin_note:item.querySelector("[data-refresh-note]").value.trim()});
    const index=registrations.findIndex(row=>String(row.id)===String(id));if(index>=0)registrations[index]={...registrations[index],...updated};
    updateSummary();render();
  }catch(error){$("drivingRefreshAdminError").textContent=error?.message||"Chưa thể lưu cập nhật.";save.disabled=false;save.textContent="Lưu cập nhật"}
});

const adminButton=$("drivingRefreshAdminBtn");
if(adminButton){
  const observer=new MutationObserver(()=>{if(!adminButton.classList.contains("hidden")&&!loaded)loadRegistrations({silent:true})});
  observer.observe(adminButton,{attributes:true,attributeFilter:["class"]});
}
