import "./student-training-actions.css";

const STUDENT_ROW_SELECTOR="#studentRows";
const ACTION_BUTTON_CLASS="student-training-row-btn";
let selectedStudent=null;

function studentIdFromRow(row){
  return row.querySelector("[data-edit]")?.dataset.edit||"";
}

function studentNameFromRow(row){
  return row.querySelector(".student-name")?.textContent?.trim()||"Học viên";
}

function ensureDialog(){