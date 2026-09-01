const CANONICAL_ORIGIN="https://www.hoclaixecungdat.com";
const LEGACY_HOSTS=new Set(["hoc-vien-thay-dat.vercel.app","daotaolaixe-thaydat.vercel.app","daotaolaixetrongoi.com","www.daotaolaixetrongoi.com"]);
const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";

function canonicalizeLoginOrigin(){
  if(!LEGACY_HOSTS.has(location.hostname))return false;
  const isLoginPage=location.pathname==="/"||location.pathname==="/index.html"||location.pathname==="/dang-nhap.html";
  if(!isLoginPage)return false;
  location.replace(new URL("/?login=1",CANONICAL_ORIGIN).href);
  return true;
}

function requestError(data,status,fallback){
  const error=new Error(data?.message||data?.details||data?.error||fallback);
  error.status=status;
  return error;
}

async function request(url,options,timeoutMs){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    return await fetch(url,{...options,signal:controller.signal});
  }catch(error){
    if(error?.name==="AbortError")throw new Error("Kết nối mạng đang chậm. Vui lòng kiểm tra 4G/5G hoặc Wi-Fi rồi thử lại.");
    throw error;
  }finally{clearTimeout(timer)}
}

async function parseResponse(response){
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw requestError(data,response.status,"Không thể kết nối máy chủ");
  return data;
}

async function rpc(name,body={},timeoutMs=9000){
  try{
    const response=await request("/api/student-rpc",{
      method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({fn:name,body})
    },timeoutMs);
    return await parseResponse(response);
  }catch(proxyError){
    if(proxyError?.status>=400&&proxyError.status<500)throw proxyError;
    console.warn(`[mobile-login] same-origin ${name} failed; using direct fallback.`,proxyError);
    const response=await request(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{
      method:"POST",cache:"no-store",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
      body:JSON.stringify(body)
    },6500);
    return parseResponse(response);
  }
}

function clearAuth(){for(const store of [localStorage,sessionStorage]){store.removeItem("hv_token");store.removeItem("hv_auth_kind")}}
function saveAuth(token,kind,remember){
  clearAuth();
  sessionStorage.setItem("hv_token",token);sessionStorage.setItem("hv_auth_kind",kind);
  if(remember){localStorage.setItem("hv_token",token);localStorage.setItem("hv_auth_kind",kind)}
}
function currentToken(){return localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||""}
function errorText(error){return error?.message||"Đăng nhập chưa thành công. Vui lòng thử lại."}

function mountMobileLoginStability(){
  if(canonicalizeLoginOrigin())return;
  const form=document.getElementById("loginForm");
  if(!form||form.dataset.mobileStableLogin==="1")return;
  const mobile=matchMedia("(max-width: 900px)").matches||matchMedia("(pointer: coarse)").matches;
  if(!mobile)return;
  if(window.__HOCLAIXECUNGDAT_RPC_PREFLIGHT__?.active)return;
  form.dataset.mobileStableLogin="1";
  form.addEventListener("submit",async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const username=document.getElementById("username")?.value.trim()||"";
    const password=document.getElementById("password")?.value||"";
    const remember=Boolean(document.getElementById("rememberLogin")?.checked);
    const error=document.getElementById("loginError"),button=document.getElementById("loginBtn"),label=button?.querySelector("span");
    if(error)error.textContent="";if(button){button.disabled=true;button.setAttribute("aria-busy","true")}if(label)label.textContent="Đang đăng nhập…";
    try{
      let result=null,kind="manager";
      try{result=await rpc("app_login",{p_username:username,p_password:password});kind="manager"}
      catch(managerError){
        try{result=await rpc("app_student_login",{p_username:username,p_password:password});kind=result?.role==="public_theory"?"public_theory":"student"}
        catch(studentError){
          if(/app_student_login|schema cache|PGRST202/i.test(errorText(studentError)))throw managerError;
          throw studentError;
        }
      }
      if(!result?.token)throw new Error("Máy chủ chưa trả phiên đăng nhập. Vui lòng thử lại.");
      saveAuth(result.token,kind,remember);
      if(remember)localStorage.setItem("hv_saved_user",username);else localStorage.removeItem("hv_saved_user");
      if(kind==="student")return location.replace("/hoc-vien.html?mobile=3");
      if(kind==="public_theory")return location.replace("/600-cau-hoi.html");
      location.replace("/?login=1");
    }catch(loginError){
      if(error)error.textContent=errorText(loginError);
      if(button){button.disabled=false;button.removeAttribute("aria-busy")}if(label)label.textContent="Đăng nhập";
    }
  },true);
}

function adminIsActive(){
  const app=document.getElementById("app"),accountName=document.getElementById("accountName");
  return Boolean(app&&!app.classList.contains("hidden")&&/\badmin\b/i.test(accountName?.textContent||""));
}

function installTuitionEditorStyles(){
  if(document.querySelector("style[data-admin-tuition-entry-fix]"))return;
  const style=document.createElement("style");
  style.setAttribute("data-admin-tuition-entry-fix","");
  style.textContent=`
    .tuition-profile-field-moved{display:none!important}
    .tuition-profile-note{grid-column:1/-1;padding:12px 14px;border:1px solid rgba(21,95,175,.18);border-radius:12px;background:rgba(21,95,175,.06);font-size:13px;line-height:1.45}
    .tuition-profile-note strong{display:block;margin-bottom:3px}
    .payment-tuition-editor{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,240px) auto;gap:12px;align-items:end;margin:14px 0;padding:14px;border:1px solid rgba(21,95,175,.18);border-radius:14px;background:rgba(21,95,175,.05)}
    .payment-tuition-editor__copy strong,.payment-tuition-editor__copy small{display:block}
    .payment-tuition-editor__copy small{margin-top:4px;opacity:.72;line-height:1.4}
    .payment-tuition-editor label{display:grid;gap:6px;font-weight:700}
    .payment-tuition-editor input{min-width:0;width:100%}
    .payment-tuition-editor button{min-height:44px;white-space:nowrap}
    .payment-tuition-editor__status{grid-column:1/-1;min-height:18px;font-size:12px;margin:0}
    @media(max-width:720px){.payment-tuition-editor{grid-template-columns:1fr}.payment-tuition-editor__status{grid-column:auto}}
  `;
  document.head.append(style);
}

function hideTuitionFromStudentProfile(){
  const total=document.getElementById("tuitionTotal"),paid=document.getElementById("paid");
  for(const input of [total,paid])input?.closest("label")?.classList.add("tuition-profile-field-moved");
  if(document.getElementById("tuitionProfileMovedNote"))return;
  const course=document.getElementById("course")?.closest("label");
  if(!course)return;
  const note=document.createElement("div");
  note.id="tuitionProfileMovedNote";
  note.className="tuition-profile-note";
  note.innerHTML="<strong>Học phí được quản lý riêng</strong><span>Tổng học phí và các lần thu được nhập tại <b>Sổ thu &amp; Phiếu thu</b>, không nhập trong phần thông tin liên hệ.</span>";
  course.insertAdjacentElement("afterend",note);
}

function createTuitionEditor(){
  const dialog=document.getElementById("paymentDialog"),toolbar=dialog?.querySelector(".payment-toolbar");
  if(!dialog||!toolbar)return null;
  let box=document.getElementById("paymentTuitionTotalEditorBox");
  if(box)return box;
  box=document.createElement("section");
  box.id="paymentTuitionTotalEditorBox";
  box.className="payment-tuition-editor";
  box.innerHTML=`
    <div class="payment-tuition-editor__copy">
      <strong>Thiết lập tổng học phí</strong>
      <small>Chọn học viên ở phía trên, nhập tổng học phí tại đây. Các lần đã thu tiếp tục ghi bằng Phiếu thu bên dưới.</small>
    </div>
    <label>Tổng học phí
      <input id="paymentTuitionTotalEditor" type="number" min="0" step="1000" inputmode="numeric" disabled>
    </label>
    <button id="savePaymentTuitionTotalBtn" class="primary" type="button" disabled>Lưu tổng học phí</button>
    <p id="paymentTuitionTotalStatus" class="payment-tuition-editor__status" role="status" aria-live="polite"></p>
  `;
  toolbar.insertAdjacentElement("afterend",box);
  return box;
}

async function refreshTuitionEditor(){
  if(!adminIsActive())return;
  const select=document.getElementById("paymentStudentSelect"),input=document.getElementById("paymentTuitionTotalEditor"),button=document.getElementById("savePaymentTuitionTotalBtn"),status=document.getElementById("paymentTuitionTotalStatus");
  if(!select||!input||!button||!status)return;
  const studentId=select.value;
  if(!studentId){
    input.value="";input.disabled=true;button.disabled=true;status.textContent="Chọn một học viên để nhập tổng học phí.";return;
  }
  const token=currentToken();
  if(!token){status.textContent="Phiên đăng nhập đã hết hạn.";input.disabled=true;button.disabled=true;return}
  input.disabled=true;button.disabled=true;status.textContent="Đang tải tổng học phí…";
  try{
    const students=await rpc("app_list_students",{p_token:token,p_owner_id:null});
    const student=(Array.isArray(students)?students:[]).find(item=>String(item.id)===String(studentId));
    if(!student)throw new Error("Không tìm thấy học viên đã chọn.");
    input.value=String(Number(student.tuition_total)||0);
    input.disabled=false;button.disabled=false;
    const paid=Number(student.paid)||0,debt=Math.max(0,(Number(student.tuition_total)||0)-paid);
    status.textContent=`Đã thu theo số dư hiện tại: ${paid.toLocaleString("vi-VN")} ₫ · Còn nợ: ${debt.toLocaleString("vi-VN")} ₫.`;
  }catch(error){
    input.disabled=true;button.disabled=true;status.textContent=error?.message||"Chưa tải được học phí.";
  }
}

function mountAdminTuitionEditor(){
  if(!adminIsActive())return;
  installTuitionEditorStyles();
  hideTuitionFromStudentProfile();
  const box=createTuitionEditor();
  if(!box||box.dataset.ready==="1")return;
  box.dataset.ready="1";
  const select=document.getElementById("paymentStudentSelect"),button=document.getElementById("savePaymentTuitionTotalBtn"),input=document.getElementById("paymentTuitionTotalEditor"),status=document.getElementById("paymentTuitionTotalStatus"),dialog=document.getElementById("paymentDialog");
  select?.addEventListener("change",()=>setTimeout(refreshTuitionEditor,0));
  if(dialog)new MutationObserver(()=>{if(dialog.hasAttribute("open"))setTimeout(refreshTuitionEditor,0)}).observe(dialog,{attributes:true,attributeFilter:["open"]});
  button?.addEventListener("click",async()=>{
    const studentId=select?.value||"",total=Number(input?.value);
    if(!studentId){status.textContent="Vui lòng chọn học viên.";return}
    if(!Number.isFinite(total)||total<0){status.textContent="Tổng học phí phải là số hợp lệ và không âm.";return}
    const token=currentToken();
    if(!token){status.textContent="Phiên đăng nhập đã hết hạn.";return}
    button.disabled=true;input.disabled=true;status.textContent="Đang lưu tổng học phí…";
    try{
      const result=await rpc("app_admin_set_student_tuition_total",{p_token:token,p_student_id:studentId,p_tuition_total:total});
      const saved=Number(result?.tuition_total??total)||0;
      status.textContent=`Đã lưu tổng học phí ${saved.toLocaleString("vi-VN")} ₫. Đang cập nhật lại danh sách…`;
      setTimeout(()=>location.reload(),450);
    }catch(error){
      status.textContent=error?.message||"Chưa lưu được tổng học phí.";button.disabled=false;input.disabled=false;
    }
  });
  setTimeout(refreshTuitionEditor,0);
}

function mountAllStabilityFixes(){mountMobileLoginStability();mountAdminTuitionEditor()}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountAllStabilityFixes,{once:true});
else mountAllStabilityFixes();
window.addEventListener("pageshow",mountAllStabilityFixes);
new MutationObserver(()=>mountAdminTuitionEditor()).observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});
