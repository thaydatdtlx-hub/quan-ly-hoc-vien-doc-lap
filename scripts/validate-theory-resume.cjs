const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../questions.js','utf8').replace(/^import.*$/mg,'');
function harness({failStorage=false,auth=false,failFirst=false}={}){
 const nodes=new Map();
 function node(id){if(!nodes.has(id)){const classes=new Set(id==='studyWorkspace'?['hidden']:[]);nodes.set(id,{id,style:{},dataset:{},value:'all',textContent:'',innerHTML:'',disabled:false,offsetTop:0,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},setAttribute(){},removeAttribute(){}})}return nodes.get(id)}
 const buttons=[node('continue')];
 const saved={answers:{249:2},bookmarks:[249],lastId:249,exams:[]};
 const values=new Map([['thay_dat_600_progress_v1',JSON.stringify(saved)]]);
 if(auth){values.set('hv_token','test-only');values.set('hv_auth_kind','student');values.set('thay_dat_600_progress_v2_test',JSON.stringify(saved));}
 let calls=0;
 const questions=Array.from({length:600},(_,i)=>({id:i+1,topicId:i<180?1:i<205?2:i<263?3:4,question:'Test '+(i+1),answer:2,options:[{n:1,text:'One'},{n:2,text:'Two'}]}));
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>{if(failStorage)throw Error('QuotaExceededError');values.set(k,v)}};
 const ctx=vm.createContext({console,AbortController,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},EXAMS:{B:{count:30}},MOTORCYCLE_QUESTION_IDS:[],MOTORCYCLE_CRITICAL_IDS:[],localStorage:storage,sessionStorage:{getItem:()=>null},window:{scrollTo(){}},document:{getElementById:node,querySelector:()=>null,querySelectorAll:s=>s==='[data-start-mode]'?buttons:[],addEventListener(){}},fetch:async url=>{
 if(url.includes('app_student_me'))return{ok:true,json:async()=>({role:'student',student_id:'test'})};
 if(url.includes('app_student_get_theory_progress'))return{ok:true,json:async()=>({license_class:'B số tự động',progress_data:saved})};
 calls++;if(failFirst&&calls===1)throw Error('offline');return{ok:true,json:async()=>questions};
 }});
 vm.runInContext(source,ctx);
 return{ctx,node,buttons,get calls(){return calls}};
}
(async()=>{
 for(const options of [{},{failStorage:true},{auth:true},{auth:true,failStorage:true},{failFirst:true}]){
  const h=harness(options);await new Promise(r=>setImmediate(r));
  await vm.runInContext('startFromButton("continue")',h.ctx);
  assert.equal(h.node('questionText').textContent,'Test 249',JSON.stringify(options));
  assert.equal(h.node('studyWorkspace').classList.contains('hidden'),false);
  assert.equal(h.buttons[0].disabled,false);
  assert.equal(vm.runInContext('progress.answers[249]',h.ctx),2);
  if(options.failFirst)assert.equal(h.calls,2);
  vm.runInContext('clearTimeout(remoteSyncTimer);clearTimeout(toast.timer)',h.ctx);
 }
 const h=harness();await new Promise(r=>setImmediate(r));
 h.ctx.fetch=()=>new Promise(()=>{});
 await assert.rejects(vm.runInContext('fetchJson("/slow",{},5)',h.ctx),/quá thời gian/);
 h.ctx.fetch=async()=>({ok:true,json:()=>new Promise(()=>{})});
 await assert.rejects(vm.runInContext('fetchJson("/slow-body",{},5)',h.ctx),/quá thời gian/);
 vm.runInContext('clearTimeout(toast.timer)',h.ctx);
 console.log('PASS: resume question 249; preserve answers; student class B; storage quota; data retry; fetch and body timeout.');
})().catch(e=>{console.error(e);process.exitCode=1});
