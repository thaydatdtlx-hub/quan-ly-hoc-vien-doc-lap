import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const DATA_URL = new URL("../public/data/600-cau-hoi-2025.json", import.meta.url);
const EXPECTED_ANSWER_HASH = "449af1588afa8ffc245252fb5a0a689fec768dc0fa3ea1241b279c5340501fb1";
const EXPECTED_CONTENT_HASH = "97171b0dc8a903562f5ead6f5c6b1f9039d2c57247459273e368c7738ce7fe0b";

const questions = JSON.parse(await readFile(DATA_URL, "utf8"));
const errors = [];

if (!Array.isArray(questions) || questions.length !== 600) {
  errors.push(`Cần đúng 600 câu, hiện có ${Array.isArray(questions) ? questions.length : "dữ liệu không hợp lệ"}.`);
}

questions.forEach((question, index) => {
  const expectedId = index + 1;
  if (question.id !== expectedId) errors.push(`Vị trí ${expectedId} có id ${question.id}.`);
  if (!String(question.question || "").trim()) errors.push(`Câu ${question.id} thiếu nội dung.`);

  const optionNumbers = question.options?.map((option) => option.n) || [];
  const expectedNumbers = Array.from({ length: optionNumbers.length }, (_, optionIndex) => optionIndex + 1);
  if (JSON.stringify(optionNumbers) !== JSON.stringify(expectedNumbers)) {
    errors.push(`Câu ${question.id} có thứ tự phương án không liên tục.`);
  }
  if (!optionNumbers.includes(question.answer)) {
    errors.push(`Câu ${question.id} không có phương án đáp án số ${question.answer}.`);
  }
  question.options?.forEach((option) => {
    if (!String(option.text || "").trim()) errors.push(`Câu ${question.id}, phương án ${option.n} bị trống.`);
    if (/^[1-4]\.\s/.test(option.text)) {
      errors.push(`Câu ${question.id}, phương án ${option.n} bị lặp số thứ tự trong nội dung.`);
    }
  });
});

const criticalCount = questions.filter((question) => question.critical).length;
if (criticalCount !== 60) errors.push(`Cần đúng 60 câu điểm liệt, hiện có ${criticalCount}.`);

// 599 đáp án được đọc tự động từ phần gạch chân trong PDF Cục CSGT.
// PDF không gạch chân câu 204; đáp án 1 được giữ theo nội dung "phải làm gì trước tiên".
const answerHash = createHash("sha256")
  .update(questions.map((question) => question.answer).join(""))
  .digest("hex");
if (answerHash !== EXPECTED_ANSWER_HASH) errors.push("Dãy đáp án không còn khớp bản đối chiếu chính thức.");

const canonicalContent = questions.map(({ id, question, options, answer, critical }) => ({
  id,
  question,
  options,
  answer,
  critical
}));
const contentHash = createHash("sha256")
  .update(JSON.stringify(canonicalContent))
  .digest("hex");
if (contentHash !== EXPECTED_CONTENT_HASH) errors.push("Nội dung câu hỏi hoặc phương án đã thay đổi ngoài bản đối chiếu.");

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Hợp lệ: 600 câu, 1.858 phương án, 60 câu điểm liệt và toàn bộ đáp án khớp bản đối chiếu.");
