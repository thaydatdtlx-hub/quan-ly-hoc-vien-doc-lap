import { MOTORCYCLE_QUESTION_IDS } from "./exam-config.js";

const $ = (id) => document.getElementById(id);
const motorcycleIds = [...MOTORCYCLE_QUESTION_IDS]
  .map(Number)
  .filter(Number.isFinite)
  .sort((a, b) => a - b);
const displayNumberBySourceId = new Map(
  motorcycleIds.map((sourceId, index) => [sourceId, index + 1])
);

function isExamMode() {
  const kicker = String($("workspaceKicker")?.textContent || "").toUpperCase();
  return kicker.includes("THI THỬ") || kicker.includes("XEM LẠI BÀI THI");
}

function isMotorcycle250Mode() {
  if (document.body.dataset.theoryBankCount === "250") return true;
  const title = String($("workspaceTitle")?.textContent || "");
  return /\b250\b/.test(title);
}

function sourceQuestionId(button) {
  const saved = Number(button.dataset.sourceQuestionId || 0);
  if (saved > 0) return saved;

  const currentLabel = Number(String(button.textContent || "").trim());
  if (!Number.isInteger(currentLabel) || currentLabel <= 0) return 0;

  button.dataset.sourceQuestionId = String(currentLabel);
  return currentLabel;
}

function renumberPracticePalette() {
  if (isExamMode() || !isMotorcycle250Mode()) return;

  const palette = $("questionPalette");
  if (!palette) return;

  const buttons = [...palette.querySelectorAll("[data-palette-index]")];
  if (!buttons.length) return;

  for (const button of buttons) {
    const sourceId = sourceQuestionId(button);
    const displayNumber = displayNumberBySourceId.get(sourceId);
    if (!displayNumber) continue;

    const label = String(displayNumber);
    if (button.textContent.trim() !== label) button.textContent = label;
    button.setAttribute("aria-label", `Câu ${label}`);
    button.title = `Câu ${label}`;
  }

  const activeButton = buttons.find((button) => button.classList.contains("current"));
  const activeLabel = activeButton?.textContent?.trim();
  const questionNumber = $("questionNumber");
  if (!questionNumber || !activeLabel) return;

  const currentText = String(questionNumber.textContent || "");
  const nextText = currentText.replace(/^(\s*CÂU\s+)\d+/i, `$1${activeLabel}`);
  if (nextText !== currentText) questionNumber.textContent = nextText;
}

let queued = false;
function queueRenumber() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    renumberPracticePalette();
  });
}

function observeQuestionNumbering() {
  const palette = $("questionPalette");
  const questionNumber = $("questionNumber");
  const workspaceTitle = $("workspaceTitle");

  if (palette) {
    new MutationObserver(queueRenumber).observe(palette, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  if (questionNumber) {
    new MutationObserver(queueRenumber).observe(questionNumber, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  if (workspaceTitle) {
    new MutationObserver(queueRenumber).observe(workspaceTitle, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  new MutationObserver(queueRenumber).observe(document.body, {
    attributes: true,
    attributeFilter: ["data-theory-bank-count"]
  });

  queueRenumber();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", observeQuestionNumbering, { once: true });
} else {
  observeQuestionNumbering();
}
