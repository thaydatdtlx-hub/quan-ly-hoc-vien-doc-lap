import {readFile} from "node:fs/promises";

const [emergencySource,pwaSource]=await Promise.all([
  readFile(new URL("../student-portal-emergency-recovery.js",import.meta.url),"utf8"),
  readFile(new URL("../pwa-install.js",import.meta.url),"utf8")
]);
for(const token of ["app_student_portal","normalizeStudentProfile","coreProfileIsVisible","renderCoreStudentProfile","studentName","studentCode","studentCourse","studentLicense","studentProgress","studentProfile","data-student-profile"]){
  if(!emergencySource.includes(token))throw new Error(`Emergency profile recovery thiếu ${token}.`);
}
for(const moduleName of ["admin-tuition-settings.js","admin-site-config.js","recruitment-operations.js","student-activity-admin.js"]){
  if(pwaSource.includes(`import \"./${moduleName}\";`))throw new Error(`Module Admin ${moduleName} vẫn được tải tĩnh trên Cổng học viên.`);
  if(!pwaSource.includes(`import(\"./${moduleName}\")`))throw new Error(`Module Admin ${moduleName} chưa được tải có điều kiện.`);
}

class ClassList{
  constructor(values=[]){this.values=new Set(values)}
  add(...values){values.forEach(value=>this.values.add(value))}
  remove(...values){values.forEach(value=>this.values.delete(value))}
  contains(value){return this.values.has(value)}
  toggle(value,force){const enabled=force===undefined?!this.contains(value):Boolean(force);enabled?this.add(value):this.remove(value);return enabled}
}

const elements=new Map();
class Element{
  constructor(id="",classes=[]){this._id="";this.classList=new ClassList(classes);this.textContent="";this.innerHTML="";this.style={cssText:""};this.attributes=new Map();this.parentElement=null;if(id)this.id=id}
  set id(value){if(this._id)elements.delete(this._id);this._id=value;if(value)elements.set(value,this)}
  get id(){return this._id}
  append(){}
  prepend(){}
  remove(){if(this._id)elements.delete(this._id)}
  setAttribute(name,value){this.attributes.set(name,String(value))}
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

console.log("Render hồ sơ mobile hợp lệ: banner đồng bộ được gỡ và giao diện chuyển sang trạng thái sẵn sàng.");
