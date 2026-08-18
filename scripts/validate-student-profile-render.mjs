import {readFile} from "node:fs/promises";

const [emergencySource,pwaSource,mobileRecoverySource]=await Promise.all([
  readFile(new URL("../student-portal-emergency-recovery.js",import.meta.url),"utf8"),
  readFile(new URL("../pwa-install.js",import.meta.url),"utf8"),
  readFile(new URL("../student-mobile-recovery.js",import.meta.url),"utf8")
]);
for(const token of ["app_student_portal","normalizeStudentProfile","coreProfileIsVisible","renderCoreStudentProfile","studentName","studentCode","studentCourse","studentLicense","studentProgress","studentProfile","data-student-profile"]){
  if(!emergencySource.includes(token))throw new Error(`Emergency profile recovery thiếu ${token}.`);
}
for(const moduleName of ["admin-tuition-settings.js","admin-site-config.js","recruitment-operations.js","student-activity-admin.js"]){
  if(pwaSource.includes(`import \"./${moduleName}\";`))throw new Error(`Module Admin ${moduleName} vẫn được tải tĩnh trên Cổng học viên.`);
  if(!pwaSource.includes(`import(\"./${moduleName}\")`))throw new Error(`Module Admin ${moduleName} chưa được tải có điều kiện.`);
}
for(const token of ["setTextIfChanged","observer?.disconnect()","getAttribute(\"data-student-profile\")"]){
  if(!mobileRecoverySource.includes(token))throw new Error(`Mobile recovery thiếu chốt chống vòng lặp: ${token}.`);
}

class ClassList{
  constructor(values=[]){this.values=new Set(values)}
  add(...values){values.forEach(value=>this.values.add(value))}
  remove(...values){values.forEach(value=>this.values.delete(value))}
  contains(value){return this.values.has(value)}
  toggle(value,force){const enabled=force===undefined?!this.contains(value):Boolean(force);enabled?this.add(value):this.remove(value);return enabled}
}

const elements=new Map();
let textWrites=0;
class Element{
  constructor(id="",classes=[]){this._id="";this._textContent="";this.classList=new ClassList(classes);this.innerHTML="";this.style={cssText:""};this.attributes=new Map();this.parentElement=null;if(id)this.id=id}
  set id(value){if(this._id)elements.delete(this._id);this._id=value;if(value)elements.set(value,this)}
  get id(){return this._id}
  set textContent(value){this._textContent=String(value);textWrites++}
  get textContent(){return this._textContent}
  append(){}
  prepend(){}
  remove(){if(this._id)elements.delete(this._id)}
  setAttribute(name,value){this.attributes.set(name,String(value))}
  getAttribute(name){return this.attributes.get(name)??null}
  removeAttribute(name){this.attributes.delete(name)}
  addEventListener(){}
  querySelector(){return null}
  insertAdjacentElement(){}
  scrollIntoView(){}
}

for(const [id,classes] of [
  ["studentPortal",["hidden"]],
  ["studentLoading",[]],
  ["studentName",[]],
  ["studentCode",[]],
  ["studentCourse",[]],
  ["studentLicense",[]],
  ["mobileStudentOverviewTitle",[]],
  ["mobileStudentClass",[]],
  ["mobileStudentActionTitle",[]],
  ["mobileStudentActionDetail",[]]
])new Element(id,classes);

const documentElement=new Element();
documentElement.setAttribute("data-student-profile","ready");
globalThis.document={
  hidden:false,
  documentElement,
  body:new Element(),
  head:new Element(),
  getElementById:id=>elements.get(id)||null,
  createElement:()=>new Element(),
  querySelector:()=>null,
  querySelectorAll:selector=>selector==="#studentRuntimeWarning"?[...elements.values()].filter(node=>node.id==="studentRuntimeWarning"):[],
  addEventListener(){}
};
globalThis.window={addEventListener(){},dispatchEvent(){return true},setTimeout(...args){return globalThis.setTimeout(...args)}};
globalThis.CustomEvent=class{constructor(type){this.type=type}};
globalThis.location={pathname:"/hoc-vien.html",search:"",replace(){throw new Error("Không được chuyển trang khi hồ sơ hợp lệ.")}};
Object.defineProperty(globalThis,"navigator",{value:{clipboard:null},configurable:true});
globalThis.localStorage={getItem:key=>key==="hv_token"?"render-test-token":null,removeItem(){}};
globalThis.sessionStorage={getItem:()=>null,removeItem(){}};
globalThis.setTimeout=callback=>{queueMicrotask(callback);return 1};
globalThis.clearTimeout=()=>{};
let observerCallback=null,observerDisconnects=0;
globalThis.MutationObserver=class{
  constructor(callback){observerCallback=callback}
  observe(){}
  disconnect(){observerDisconnects++}
};
globalThis.fetch=async(_url,options)=>{
  const request=JSON.parse(options?.body||"{}");
  const payload=request.fn==="app_student_portal"?[JSON.stringify({
    id:"student-render-ok",
    name:"Học viên kiểm thử",
    student_code:"TEST-001",
    course:"K26-B",
    license_class:"B",
    tuition_total:1000000,
    paid:500000
  })]:{username:"render.test"};
  return new Response(JSON.stringify(payload),{status:200,headers:{"Content-Type":"application/json"}});
};

await import(new URL("../student-portal-emergency-recovery.js?render-test=1",import.meta.url));
await new Promise(resolve=>setImmediate(resolve));
await new Promise(resolve=>setImmediate(resolve));

if(elements.has("studentRuntimeWarning"))throw new Error("Banner đồng bộ hồ sơ vẫn còn sau khi API thành công.");
if(elements.get("studentPortal")?.classList.contains("hidden"))throw new Error("Cổng học viên vẫn bị ẩn sau khi render.");
if(!elements.get("studentLoading")?.classList.contains("hidden"))throw new Error("Trạng thái tải hồ sơ chưa được ẩn.");
if(elements.get("studentName")?.textContent!=="Học viên kiểm thử")throw new Error("Tên học viên chưa được render.");
if(elements.get("studentCode")?.textContent!=="TEST-001")throw new Error("Mã học viên chưa được render từ payload bọc.");
if(elements.get("studentCourse")?.textContent!=="K26-B")throw new Error("Khóa học chưa được render từ payload bọc.");
if(elements.get("mobileStudentActionTitle")?.textContent!=="Hồ sơ đã sẵn sàng")throw new Error("Mobile dashboard chưa chuyển sang trạng thái sẵn sàng.");
if(documentElement.attributes.get("data-student-profile")!=="ready")throw new Error("Cờ profile-ready chưa được đặt.");

textWrites=0;
await import(new URL("../student-mobile-recovery.js?loop-test=1",import.meta.url));
await new Promise(resolve=>setImmediate(resolve));
if(observerDisconnects<1)throw new Error("MutationObserver chưa dừng sau khi hồ sơ đã hiển thị.");
textWrites=0;
observerCallback?.();
if(textWrites!==0)throw new Error("MutationObserver vẫn tự ghi lại DOM và có thể làm treo trang.");

console.log("Render hồ sơ mobile hợp lệ: dữ liệu hiển thị và MutationObserver không còn tự lặp.");
