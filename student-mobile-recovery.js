const KEY="student_mobile_recovery_20260816_v2";
const $=id=>document.getElementById(id);
let observer=null;
function hasProfile(){const name=$("studentName")?.textContent?.trim()||"",code=$("studentCode")?.textContent?.trim()||"";return (name&&name!=="Học viên")||(code&&code!=="Chưa có mã")}
function setTextIfChanged(id,value){const node=$(id),next=String(value);if(node&&node.textContent!==next)node.textContent=next}
function sync(){
  if(!hasProfile())return false;
  observer?.disconnect();
  const name=$("studentName")?.textContent?.trim()||"học viên",license=$("studentLicense")?.textContent?.trim()||"Đang học";
  setTextIfChanged("mobileStudentOverviewTitle",`Xin chào, ${name}`);
  setTextIfChanged("mobileStudentClass",license);
  setTextIfChanged("mobileStudentActionTitle","Hồ sơ đã sẵn sàng");
  setTextIfChanged("mobileStudentActionDetail","Lịch, học phí và thông báo đang được đồng bộ.");
  $("studentPortal")?.classList.remove("hidden");$("studentLoading")?.classList.add("hidden");document.querySelectorAll("#studentRuntimeWarning").forEach(node=>node.remove());if(document.documentElement?.getAttribute("data-student-profile")!=="ready")document.documentElement?.setAttribute("data-student-profile","ready");sessionStorage.removeItem(KEY);return true;
}
observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,childList:true,characterData:true});
setTimeout(()=>{
  if(sync())return;
  const waiting=/đang đồng bộ hồ sơ/i.test($("studentRuntimeWarning")?.textContent||"");
  if(waiting&&!sessionStorage.getItem(KEY)){
    sessionStorage.setItem(KEY,"1");
    const url=new URL(location.href);url.searchParams.set("mobile_recovery","1");url.searchParams.set("t",String(Date.now()));location.replace(url.href);
  }
},7000);
window.addEventListener("pageshow",()=>setTimeout(sync,150));
window.addEventListener("student-profile-ready",sync);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(sync,50)});
