const SUPABASE_URL="https://pkzxkvcncipfszeukpwu.supabase.co";
const SUPABASE_KEY="sb_publishable_rrQ2fAG7ZpIKizN3-tss1w_4xPxq3Vo";

const normalize=value=>String(value??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");

async function rpc(token,fn,body={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,{
    method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.details||data?.error||"Không thể tải danh sách học viên");
  return data;
}

function studentKind(student){
  const license=normalize(student?.license_class);
  if(license.includes("b so co khi"))return"b_manual";
  if(license.includes("b so tu dong"))return"b_auto";
  return"other";
}

function showError(message){
  const error=document.getElementById("scheduleError");
  if(error)error.textContent=message;
}

export function installBAutomaticDatSupport(fields=[]){
  if(typeof document==="undefined"||!Array.isArray(fields))return;

  const autoFields=fields.filter(field=>field.key==="dat_auto_start"||field.key==="dat_auto_end");
  if(autoFields.length!==2)return;

  const start=()=>{
    const form=document.getElementById("scheduleForm");
    const select=document.getElementById("scheduleStudent");
    const fieldHost=document.getElementById("scheduleFields");
    if(!form||!select||!fieldHost)return;

    const token=localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||"";
    if(!token)return;

    const studentKinds=new Map();
    let currentKind="other";

    const applyFieldMode=studentId=>{
      currentKind=studentKinds.get(String(studentId))||"other";
      for(const field of autoFields)field.onlyFor=currentKind==="b_auto"?undefined:"b_manual";
    };

    const syncNote=()=>{
      fieldHost.querySelector(".dat-auto-range-note")?.remove();
      if(currentKind!=="b_auto"||!document.getElementById("date-dat_auto_start"))return;
      const note=document.createElement("div");
      note.className="dat-range-note dat-auto-range-note";
      note.innerHTML="<strong>DAT dành cho học viên B số tự động</strong><span>Nhập đủ ngày bắt đầu và ngày kết thúc DAT số tự động.</span>";
      fieldHost.insertAdjacentElement("afterbegin",note);
    };

    const prepare=studentId=>{
      applyFieldMode(studentId||select.value);
      queueMicrotask(syncNote);
      setTimeout(syncNote,0);
    };

    select.addEventListener("change",event=>prepare(event.target.value),true);

    document.addEventListener("click",event=>{
      const editButton=event.target.closest("[data-edit-student]");
      if(editButton)return prepare(editButton.dataset.editStudent);
      if(event.target.closest("#openEditorBtn"))prepare(select.value);
    },true);

    form.addEventListener("submit",event=>{
      applyFieldMode(select.value);
      if(currentKind!=="b_auto")return;
      const startValue=document.getElementById("date-dat_auto_start")?.value||"";
      const endValue=document.getElementById("date-dat_auto_end")?.value||"";
      if(Boolean(startValue)!==Boolean(endValue)){
        event.preventDefault();
        event.stopImmediatePropagation();
        showError("Vui lòng nhập đủ ngày bắt đầu và kết thúc DAT số tự động.");
        return;
      }
      if(startValue&&new Date(endValue)<new Date(startValue)){
        event.preventDefault();
        event.stopImmediatePropagation();
        showError("Ngày kết thúc DAT số tự động không được trước ngày bắt đầu.");
      }
    },true);

    new MutationObserver(()=>syncNote()).observe(fieldHost,{childList:true});

    (async()=>{
      try{
        const me=await rpc(token,"app_me",{p_token:token});
        if(me?.role!=="admin")return;
        const students=await rpc(token,"app_list_students",{p_token:token,p_owner_id:null})||[];
        for(const student of students)studentKinds.set(String(student.id),studentKind(student));

        const initialize=()=>{
          if(!select.options.length)return false;
          prepare(select.value);
          select.dispatchEvent(new Event("change",{bubbles:true}));
          return true;
        };
        if(!initialize()){
          const observer=new MutationObserver(()=>{if(initialize())observer.disconnect()});
          observer.observe(select,{childList:true});
        }
      }catch{
        // Giữ nguyên giao diện cũ khi phiên đăng nhập không còn hợp lệ.
      }
    })();
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
}
