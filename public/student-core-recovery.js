(function(){
  "use strict";

  var RETRY_DELAY=1400;
  var REQUEST_TIMEOUT=9000;
  var running=false;

  function byId(id){return document.getElementById(id)}
  function token(){return localStorage.getItem("hv_token")||sessionStorage.getItem("hv_token")||""}
  function text(id){return (byId(id)&&byId(id).textContent||"").trim()}
  function hasProfile(){return Boolean((text("studentName")&&text("studentName")!=="Học viên")||(text("studentCode")&&text("studentCode")!=="Chưa có mã"))}
  function coreLooksComplete(){
    return hasProfile()&&text("tuitionTotal")!=="0 ₫"&&byId("studentProfile")&&byId("studentProfile").children.length>0&&byId("studentProgress")&&byId("studentProgress").children.length>0;
  }
  function normalize(payload){
    var value=payload;
    for(var depth=0;depth<6;depth++){
      if(typeof value==="string"){
        try{value=JSON.parse(value);continue}catch(error){return null}
      }
      if(Array.isArray(value)){if(!value.length)return null;value=value[0];continue}
      if(value&&typeof value==="object"){
        if(value.id!=null||value.student_id!=null||value.username!=null)return value;
        var nested=value.data!==undefined?value.data:value.result!==undefined?value.result:value.student!==undefined?value.student:value.profile!==undefined?value.profile:value.account;
        if(nested!==undefined&&nested!==value){value=nested;continue}
      }
      break;
    }
    return value&&typeof value==="object"&&!Array.isArray(value)?value:null;
  }
  function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(char){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]})}
  function money(value){return new Intl.NumberFormat("vi-VN").format(Number(value||0))+" ₫"}
  function setText(id,value){var node=byId(id);if(node)node.textContent=String(value==null?"":value)}
  function showPortal(){if(byId("studentPortal"))byId("studentPortal").classList.remove("hidden");if(byId("studentLoading"))byId("studentLoading").classList.add("hidden")}
  function clearWarning(){document.querySelectorAll("#studentRuntimeWarning").forEach(function(node){node.remove()})}
  function warning(message,retry){
    showPortal();
    var box=byId("studentRuntimeWarning");
    if(!box){box=document.createElement("div");box.id="studentRuntimeWarning";box.style.cssText="margin:14px auto;padding:12px 14px;max-width:1200px;border:1px solid #f0d5a8;border-radius:12px;background:#fff8e9;color:#76551c;font:700 12px/1.5 system-ui";if(byId("studentPortal"))byId("studentPortal").prepend(box)}
    box.replaceChildren(document.createTextNode(message));
    if(retry){var button=document.createElement("button");button.type="button";button.textContent="Thử lại";button.style.cssText="margin-left:12px;padding:8px 12px;border:0;border-radius:9px;background:#1477d4;color:#fff;font:700 12px system-ui";button.onclick=function(){recover(true)};box.appendChild(button)}
  }
  function rpc(name,body){
    return new Promise(function(resolve,reject){
      var request=new XMLHttpRequest();
      request.open("POST","/api/student-rpc",true);
      request.timeout=REQUEST_TIMEOUT;
      request.setRequestHeader("Content-Type","application/json");
      request.setRequestHeader("Cache-Control","no-store");
      request.onload=function(){
        var data=null;
        try{data=request.responseText?JSON.parse(request.responseText):null}catch(error){return reject(new Error("Dữ liệu máy chủ không hợp lệ."))}
        if(request.status>=200&&request.status<300)return resolve(data);
        reject(new Error(data&&((data.message||data.details||data.error))||"Không tải được dữ liệu học viên."));
      };
      request.onerror=function(){reject(new Error("Không kết nối được máy chủ dữ liệu."))};
      request.ontimeout=function(){reject(new Error("Máy chủ phản hồi quá chậm."))};
      request.send(JSON.stringify({fn:name,body:body}));
    });
  }
  function renderPhoto(student){
    var photo=byId("studentPhoto"),placeholder=byId("studentPhotoPlaceholder");
    if(!photo||!placeholder)return;
    if(student.photo_data){photo.src=student.photo_data;photo.classList.remove("hidden");placeholder.classList.add("hidden")}else{photo.classList.add("hidden");placeholder.classList.remove("hidden")}
  }
  function renderProgress(student){
    var host=byId("studentProgress");if(!host)return;
    var rows=[
      ["▤","Hồ sơ",student.profile_status||"Chưa cập nhật"],
      ["◉","Lý thuyết online",student.online_status||"Chưa hoàn thành"],
      ["▣","Cabin",student.cabin_status||"Chưa hoàn thành"],
      ["⌖","DAT",student.dat_status||"Chưa thực hiện"],
      ["✓","Thi tốt nghiệp",student.graduation_status||"Chưa hoàn thành"],
      ["★","Thi sát hạch",student.exam_status||"Chưa thi sát hạch"]
    ];
    host.innerHTML=rows.map(function(row){return '<article class="progress-card"><span>'+esc(row[0])+'</span><div><small>'+esc(row[1])+'</small><strong>'+esc(row[2])+'</strong></div><i></i></article>'}).join("");
  }
  function renderProfile(student){
    var host=byId("studentProfile");if(!host)return;
    var rows=[
      ["Ngày sinh",student.date_of_birth||"Chưa cập nhật"],
      ["Số CCCD",student.cccd||"Chưa cập nhật"],
      ["Điện thoại",student.phone||"Chưa cập nhật"],
      ["Địa chỉ",student.address||"Chưa cập nhật"],
      ["Hạng đào tạo",student.license_class||"Chưa cập nhật"],
      ["Sát hạch / bằng lái",student.exam_status||"Chưa thi sát hạch"],
      ["Trạng thái hồ sơ",student.profile_status||"Chưa cập nhật"]
    ];
    host.innerHTML=rows.map(function(row){return '<div><dt>'+esc(row[0])+'</dt><dd>'+esc(row[1])+'</dd></div>'}).join("");
  }
  function renderFinance(student){
    var total=Math.max(0,Number(student.tuition_total)||0),paid=Math.max(0,Number(student.paid)||0),debt=Math.max(0,total-paid),rate=total?Math.min(100,Math.round(paid/total*100)):0;
    setText("tuitionTotal",money(total));setText("tuitionPaid",money(paid));setText("tuitionDebt",money(debt));setText("tuitionRate","Đã đóng "+rate+"% tổng học phí");
    setText("tuitionStatus",debt?"Còn học phí cần hoàn tất":"Đã hoàn tất học phí");setText("tuitionDebtNote",debt?"Vui lòng hoàn tất theo lịch hẹn":"Không còn công nợ");
    setText("paymentDebt",money(debt));setText("paymentAmountBadge",debt?"Còn nợ "+money(debt):"Đã hoàn tất");
    var pending=byId("paymentPending"),complete=byId("paymentComplete");if(pending)pending.classList.toggle("hidden",debt===0);if(complete)complete.classList.toggle("hidden",debt>0);
  }
  function renderEssential(me,student){
    if(!student||student.id==null)return false;
    setText("studentUsername",(me&&me.username||"Học viên")+" · Học viên");
    setText("studentName",student.name||"Học viên");
    setText("studentCode",student.student_code||"Chưa có mã");
    setText("studentCourse",student.course||"Chưa có khóa");
    setText("studentLicense",student.license_class||"Chưa có hạng");
    setText("mobileStudentOverviewTitle","Xin chào, "+(student.name||"học viên"));
    setText("mobileStudentClass",student.license_class||"Đang học");
    setText("mobileStudentAccountName",student.name||"Học viên");
    setText("mobileStudentActionTitle","Hồ sơ đã sẵn sàng");
    setText("mobileStudentActionDetail","Dữ liệu mới nhất từ Admin đã được đồng bộ.");
    renderPhoto(student);renderFinance(student);renderProgress(student);renderProfile(student);showPortal();clearWarning();
    document.documentElement.setAttribute("data-student-profile","ready");
    document.documentElement.setAttribute("data-student-core-recovery","ready");
    window.__STUDENT_CORE_PROFILE__={me:me,student:student};
    window.dispatchEvent(new CustomEvent("student-profile-ready",{detail:{source:"core-xhr-full"}}));
    return true;
  }
  async function recover(force){
    if(location.pathname!=="/hoc-vien.html"||running||(!force&&coreLooksComplete()))return;
    var sessionToken=token();if(!sessionToken)return;
    running=true;document.documentElement.setAttribute("data-student-core-recovery","loading");
    try{
      var results=await Promise.allSettled([rpc("app_student_me",{p_token:sessionToken}),rpc("app_student_portal",{p_token:sessionToken})]);
      var me=results[0].status==="fulfilled"?normalize(results[0].value):null;
      var student=results[1].status==="fulfilled"?normalize(results[1].value):null;
      if(renderEssential(me,student))return;
      var error=results[1].status==="rejected"?results[1].reason:results[0].status==="rejected"?results[0].reason:new Error("Không nhận được hồ sơ học viên.");
      document.documentElement.setAttribute("data-student-core-recovery","error");warning((error&&error.message||"Không tải được hồ sơ học viên.")+" Phiên đăng nhập vẫn được giữ.",true);
    }catch(error){document.documentElement.setAttribute("data-student-core-recovery","error");warning((error&&error.message||"Không tải được hồ sơ học viên.")+" Phiên đăng nhập vẫn được giữ.",true)}finally{running=false}
  }

  window.__retryStudentCoreProfile=function(){recover(true)};
  window.setTimeout(function(){recover(false)},RETRY_DELAY);
  window.setTimeout(function(){if(!coreLooksComplete())recover(true)},4500);
  window.addEventListener("student-functions-ready",function(){window.setTimeout(function(){if(!coreLooksComplete())recover(true)},50)});
  window.addEventListener("pageshow",function(){window.setTimeout(function(){recover(false)},300)});
  document.addEventListener("visibilitychange",function(){if(!document.hidden)recover(false)});
})();
