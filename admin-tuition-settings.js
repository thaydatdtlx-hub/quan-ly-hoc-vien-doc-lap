import "./admin-tuition-settings.css";

const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";
const LICENSES=["A1","A","B số tự động","B số sàn","C1"];
const DEFAULT_FEES={
  A1:[{name:"Thi lý thuyết",value:60000},{name:"Thi thực hành",value:70000},{name:"Cấp giấy phép PET",value:135000}],
  A:[{name:"Thi lý thuyết",value:60000},{name:"Thi thực hành",value:70000},{name:"Cấp giấy phép PET",value:135000}]
};
let mounted=false;
let config=[];

function token(){return localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||""}
function money(value){return new Intl.NumberFormat("vi-VN").format(Number(value)||0)+" ₫"}
function numberValue(value){return Math.max(0,Number(String(value??"").replace(/[^0-9]/g,""))||0)}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]))}

async function rpc(fn,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||"Không thể cập nhật cấu hình học phí.");
  return data;
}

function currentConfig(license){
  return config.find(item=>item.license_class===license)||{
    license_class:license,tuition:0,fees:DEFAULT_FEES[license]||[],promotion_title:"",promotion_description:"",discount_amount:0,promotion_end:null
  };
}

function feeFields(item){
  if(!DEFAULT_FEES[item.license_class])return '<div class="admin-tuition-no-fee">Không có lệ phí sát hạch cố định trong bảng công khai.</div>';
  const fees=Array.isArray(item.fees)&&item.fees.length?item.fees:DEFAULT_FEES[item.license_class];
  return `<div class="admin-tuition-fees">${DEFAULT_FEES[item.license_class].map((base,index)=>{
    const fee=fees.find(value=>value.name===base.name)||fees[index]||base;
    return `<label>${escapeHtml(base.name)}<input type="number" min="0" step="1000" data-tuition-fee="${index}" value="${Number(fee.value)||0}"></label>`;
  }).join("")}</div>`;
}

function row(item){
  return `<section class="admin-tuition-card" data-tuition-card="${escapeHtml(item.license_class)}">
    <div class="admin-tuition-card__head"><div><span>HẠNG ĐÀO TẠO</span><h3>${escapeHtml(item.license_class)}</h3></div><strong data-tuition-preview>${money(Math.max(0,(Number(item.tuition)||0)-(Number(item.discount_amount)||0)))}</strong></div>
    <div class="admin-tuition-fields">
      <label>Học phí niêm yết<input type="number" min="0" step="100000" data-tuition-field="tuition" value="${Number(item.tuition)||0}"></label>
      <label>Giảm trực tiếp<input type="number" min="0" step="100000" data-tuition-field="discount_amount" value="${Number(item.discount_amount)||0}"></label>
      <label class="wide">Tên ưu đãi<input type="text" maxlength="120" data-tuition-field="promotion_title" value="${escapeHtml(item.promotion_title||"")}" placeholder="Ví dụ: Ưu đãi khai giảng tháng 8"></label>
      <label class="wide">Mô tả ưu đãi<textarea maxlength="500" data-tuition-field="promotion_description" placeholder="Điều kiện, đối tượng áp dụng…">${escapeHtml(item.promotion_description||"")}</textarea></label>
      <label>Ưu đãi đến ngày<input type="date" data-tuition-field="promotion_end" value="${escapeHtml(item.promotion_end||"")}"></label>
    </div>
    <div class="admin-tuition-fee-title">Các khoản nộp riêng</div>
    ${feeFields(item)}
  </section>`;
}

function render(){
  const list=document.getElementById("adminTuitionList");
  if(!list)return;
  list.innerHTML=LICENSES.map(license=>row(currentConfig(license))).join("");
  list.querySelectorAll("[data-tuition-card]").forEach(card=>{
    const update=()=>{
      const tuition=numberValue(card.querySelector('[data-tuition-field="tuition"]')?.value);
      const discount=numberValue(card.querySelector('[data-tuition-field="discount_amount"]')?.value);
      card.querySelector("[data-tuition-preview]").textContent=money(Math.max(0,tuition-discount));
    };
    card.querySelectorAll('input[type="number"]').forEach(input=>input.addEventListener("input",update));
    update();
  });
}

async function load(){
  config=await rpc("app_public_tuition_config");
  if(!Array.isArray(config))config=[];
  render();
}

function cardPayload(card){
  const license=card.dataset.tuitionCard;
  const get=name=>card.querySelector(`[data-tuition-field="${name}"]`);
  const fees=DEFAULT_FEES[license]?DEFAULT_FEES[license].map((base,index)=>({
    name:base.name,
    value:numberValue(card.querySelector(`[data-tuition-fee="${index}"]`)?.value)
  })):[];
  return{
    license_class:license,
    tuition:numberValue(get("tuition")?.value),
    fees,
    promotion_title:get("promotion_title")?.value.trim()||"",
    promotion_description:get("promotion_description")?.value.trim()||"",
    discount_amount:numberValue(get("discount_amount")?.value),
    promotion_end:get("promotion_end")?.value||null,
    active:true
  };
}

async function save(){
  const button=document.getElementById("adminTuitionSave");
  const status=document.getElementById("adminTuitionStatus");
  button.disabled=true;
  status.className="admin-tuition-status";
  status.textContent="Đang lưu cấu hình…";
  try{
    for(const card of document.querySelectorAll("[data-tuition-card]")){
      await rpc("app_admin_save_tuition_config",{p_token:token(),p_data:cardPayload(card)});
    }
    await load();
    status.className="admin-tuition-status success";
    status.textContent="Đã lưu. Bảng học phí công khai sẽ dùng dữ liệu mới ngay khi tải lại trang.";
  }catch(error){
    status.className="admin-tuition-status error";
    status.textContent=error?.message||"Không thể lưu cấu hình.";
  }finally{button.disabled=false}
}

function mountDialog(){
  if(document.getElementById("adminTuitionDialog"))return;
  const dialog=document.createElement("dialog");
  dialog.id="adminTuitionDialog";
  dialog.className="admin-tuition-dialog";
  dialog.innerHTML=`<div class="admin-tuition-dialog__head"><div><p>CẤU HÌNH WEBSITE CÔNG KHAI</p><h2>Học phí & ưu đãi</h2><span>Chỉ Admin được thay đổi. Giá mới được lưu trực tiếp vào hệ thống và dùng trên trang đăng ký.</span></div><button type="button" data-tuition-close aria-label="Đóng">×</button></div>
    <div id="adminTuitionList" class="admin-tuition-list"></div>
    <p id="adminTuitionStatus" class="admin-tuition-status"></p>
    <div class="admin-tuition-actions"><button type="button" data-tuition-close>Đóng</button><button id="adminTuitionSave" class="primary" type="button">Lưu học phí & ưu đãi</button></div>`;
  document.body.append(dialog);
  dialog.querySelectorAll("[data-tuition-close]").forEach(button=>button.addEventListener("click",()=>dialog.close()));
  document.getElementById("adminTuitionSave").addEventListener("click",save);
}

async function openDialog(){
  const dialog=document.getElementById("adminTuitionDialog");
  const status=document.getElementById("adminTuitionStatus");
  status.textContent="Đang tải học phí hiện tại…";
  dialog.showModal();
  try{await load();status.textContent=""}catch(error){status.className="admin-tuition-status error";status.textContent=error?.message||"Không tải được cấu hình."}
}

function mountAdminControls(){
  if(mounted)return;
  const app=document.getElementById("app");
  const name=document.getElementById("accountName");
  const account=document.querySelector(".topbar .account");
  if(!app||app.classList.contains("hidden")||!name||!/\badmin\b/i.test(name.textContent)||!account)return;
  mounted=true;
  mountDialog();
  const button=document.createElement("button");
  button.id="adminTuitionSettingsBtn";
  button.type="button";
  button.className="admin-tuition-open";
  button.textContent="Học phí & ưu đãi";
  const password=document.getElementById("changePasswordBtn");
  password?account.insertBefore(button,password):account.append(button);
  button.addEventListener("click",openDialog);

  const mobileMenu=document.getElementById("mobileAdminAccountMenu");
  if(mobileMenu){
    const mobileButton=document.createElement("button");
    mobileButton.type="button";
    mobileButton.textContent="Học phí & ưu đãi";
    mobileButton.addEventListener("click",()=>{mobileMenu.classList.add("hidden");openDialog()});
    mobileMenu.insertBefore(mobileButton,mobileMenu.querySelector(".danger"));
  }
}

const observer=new MutationObserver(mountAdminControls);
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountAdminControls,{once:true});else mountAdminControls();
