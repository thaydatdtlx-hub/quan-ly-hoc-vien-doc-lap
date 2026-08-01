import assert from "node:assert/strict";
import {analyzeStudentImport,importSummary,studentIdentityKeys} from "../import-dedup.js";

assert.deepEqual(studentIdentityKeys({student_code:"HV-0001",cccd:"079 123 456 789",phone:"0984 811 037"}),[
  "code:hv-0001","cccd:079123456789","phone:0984811037"
]);
assert.equal(studentIdentityKeys({phone:"+84 984 811 037"})[0],"phone:0984811037");
assert.equal(studentIdentityKeys({phone:984811037})[0],"phone:0984811037");

const active=[{id:"a1",student_code:"HV-0001",name:"Nguyễn Văn An",date_of_birth:"2000-01-01",cccd:"079123456789",phone:"0984811037"}];
const deleted=[{id:"d1",student_code:"HV-0002",name:"Trần Văn Bình",date_of_birth:"2001-02-02",cccd:"079987654321",phone:"0909000000"}];
const rows=[
  {_rowNumber:2,student_code:"HV-0001",name:"Nguyễn Văn An",cccd:"",phone:""},
  {_rowNumber:3,student_code:"",name:"Trần Văn Bình",cccd:"079987654321",phone:""},
  {_rowNumber:4,student_code:"",name:"Lê Văn C",cccd:"",phone:"0911222333"},
  {_rowNumber:5,student_code:"",name:"Lê Văn C bản sao",cccd:"",phone:"0911222333"},
  {_rowNumber:6,student_code:"",name:"Nguyễn Văn An",date_of_birth:"2000-01-01",cccd:"",phone:""}
];
const analysis=analyzeStudentImport(rows,active,deleted),summary=importSummary(analysis);
assert.deepEqual(analysis.map(item=>item._import.status),["existing","deleted","new","duplicate_file","review"]);
assert.deepEqual(summary,{new:1,existing:1,deleted:1,duplicate_file:1,review:1});

console.log("Chống trùng Excel hợp lệ: mã học viên, CCCD, số điện thoại và cảnh báo họ tên/ngày sinh.");
