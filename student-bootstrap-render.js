const BOOTSTRAP_KEY="hv_student_bootstrap_v1";
const MAX_AGE_MS=2*60*60*1000;
const $=id=>document.getElementById(id);
const money=value=>new Intl.NumberFormat("vi-VN").format(Math.max(0,Number(value)||0))+" ₫";
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function date(value){const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return match?`${match[3]}/${match[2]}/${match[1]}`:(value||"Chưa cập nhật")}
function setText(id,value){const node=$(id);if(node)node.textContent=value}
function readBootstrap(){for(const store of [sessionStorage,localStorage]){try{const raw=store.getItem(BOOTSTRAP_KEY);if(!raw)continue;const data=JSON.parse(raw);if(!data?.profile?.id||!data.saved_at||Date.now()-Number(data.saved_at)>MAX_AGE_MS){store.removeItem(BOOTSTRAP_KEY);continue}return data}catch{store.removeItem(BOOTSTRAP_KEY)}}return null}
function clearBootstrap(){for(const store of [localStorage,sessionStorage])store.removeItem(BOOTSTRAP_KEY)}
function renderBootstrap(data){
  const student=data?.profile;if(!student?.id)return false;
  window.__THAY_DAT_STUDENT_BOOTSTRAP__=student;
  setText("studentUsername",`${data.username||"Học viên"} · Học viên`);setText("studentName",student.name||"Học viên");setText("studentCode",student.student_code||"Chưa có mã");setText("studentCourse",student.course||"Chưa có khóa");setText("studentLicense",student.license_class||"Chưa có hạng");setText("mobileStudentOverviewTitle",`Xin chào, ${student.name||"học viên"}`);setText("mobileStudentClass",student.license_class||"Đang học");
  if(student.photo_data&&$("studentPhoto")){$("studentPhoto").src=student.photo_data;$("studentPhoto").classList.remove("hidden");$("studentPhotoPlaceholder")?.classList.add("hidden")}
  const total=Math.max(0,Number(student.tuition_total)||0),paid=Math.max(0,Number(student.paid)||0),debt=Math.max(0,total-paid),rate=total?Math.min(100,Math.round(paid/total*100)):0;
  setText("tuitionTotal",money(total));setText("tuitionPaid",money(paid));setText("tuitionDebt",money(debt));setText("tuitionRate",`Đã đóng ${rate}% tổng học phí`);setText("tuitionDebtNote",debt?"Vui lòng hoàn tất theo lịch hẹn":"Không còn công nợ");
  const status=$("tuitionStatus");if(status){status.textContent=debt?"Còn học phí cần hoàn tất":"Đã hoàn tất học phí";status.className=debt?"has-debt":"complete"}
  setText("paymentDebt",money(debt));const badge=$("paymentAmountBadge");if(badge){badge.textContent=debt?`Còn nợ ${money(debt)}`:"Đã hoàn tất";badge.className=debt?"has-debt":"complete"}
  const profile=[["Ngày sinh",date(student.date_of_birth)],["Số CCCD",student.cccd||"Chưa cập nhật"],["Điện thoại",student.phone||"Chưa cập nhật"],["Địa chỉ",student.address||"Chưa cập nhật"],["Hạng đào tạo",student.license_class||"Chưa cập nhật"],["Sát hạch / bằng lái",student.exam_status||"Chưa thi sát hạch"],["Trạng thái hồ sơ",student.profile_status||"Chưa cập nhật"]];if($("studentProfile"))$("studentProfile").innerHTML=profile.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
  const progress=[["▤","Hồ sơ",student.profile_status||"Chưa cập nhật"],["◉","Lý thuyết online",student.online_status||"Chưa hoàn thành"],["▣","Cabin",student.cabin_status||"Chưa hoàn thành"],["⌖","DAT",student.dat_status||"Chưa thực hiện"],["✓","Thi tốt nghiệp",student.graduation_status||"Chưa hoàn thành"],["★","Thi sát hạch",student.exam_status||"Chưa thi sát hạch"]];if($("studentProgress"))$("studentProgress").innerHTML=progress.map(([icon,label,value])=>`<article class="progress-card"><span>${icon}</span><div><small>${esc(label)}</small><strong>${esc(value)}</strong></div><i></i></article>`).join("");
  setText("mobileStudentActionTitle","Hồ sơ đã sẵn sàng");setText("mobileStudentActionDetail","Đang đồng bộ lịch học và các dữ liệu mới nhất.");$("studentPortal")?.classList.remove("hidden");$("studentLoading")?.classList.add("hidden");$("studentRuntimeWarning")?.remove();return true;
}
const data=readBootstrap();if(data)renderBootstrap(data);$("studentLogoutBtn")?.addEventListener("click",clearBootstrap,{capture:true});
