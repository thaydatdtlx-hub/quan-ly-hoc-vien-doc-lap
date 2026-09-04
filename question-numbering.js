import { MOTORCYCLE_QUESTION_IDS, MOTORCYCLE_CRITICAL_IDS } from "./exam-config.js";

const $ = (id) => document.getElementById(id);
const motorcycleIds = [...MOTORCYCLE_QUESTION_IDS]
  .map(Number)
  .filter(Number.isFinite)
  .sort((a, b) => a - b);
const motorcycleCriticalIds = [...MOTORCYCLE_CRITICAL_IDS]
  .map(Number)
  .filter(Number.isFinite);
const motorcycleCriticalSet = new Set(motorcycleCriticalIds);
const displayNumberBySourceId = new Map(
  motorcycleIds.map((sourceId, index) => [sourceId, index + 1])
);
const MOTORCYCLE_CRITICAL_COUNT = motorcycleCriticalIds.length;

function isExamMode() {
  const kicker = String($("workspaceKicker")?.textContent || "").toUpperCase();
  return kicker.includes("THI THỬ") || kicker.includes("XEM LẠI BÀI THI");
}

function isMotorcycle250Mode() {
  if (document.body.dataset.theoryBankCount === "250") return true;

  const texts = [
    $("workspaceTitle")?.textContent,
    document.querySelector(".study-hero h1 b")?.textContent,
    document.querySelector("#studyWorkspace .workspace-head")?.getAttribute("data-theory-classic-title"),
    document.querySelector("[data-candidate-meta]")?.textContent,
    document.title
  ].filter(Boolean).join(" ");

  return /\b250\b/.test(texts);
}

function isMotorcycleCriticalView() {
  if (!isMotorcycle250Mode() || isExamMode()) return false;
  const kicker = String($("workspaceKicker")?.textContent || "").toUpperCase();
  return kicker.includes("CÂU HỎI ĐIỂM LIỆT") || $("statusFilter")?.value === "critical";
}

function sourceQuestionId(button) {
  const saved = Number(button.dataset.sourceQuestionId || 0);
  if (saved > 0) return saved;

  const currentLabel = Number(String(button.textContent || "").trim());
  if (!Number.isInteger(currentLabel) || currentLabel <= 0) return 0;

  button.dataset.sourceQuestionId = String(currentLabel);
  return currentLabel;
}

function paletteButtons() {
  const palette = $("questionPalette");
  return palette ? [...palette.querySelectorAll("[data-palette-index]")] : [];
}

function activePaletteButton(buttons = paletteButtons()) {
  return buttons.find((button) => button.classList.contains("current")) || null;
}

function syncMotorcycleCriticalCopy() {
  if (!isMotorcycle250Mode()) return;

  const trust = document.querySelectorAll(".hero-trust span");
  if (trust[1]) {
    const text = `✓ ${MOTORCYCLE_CRITICAL_COUNT} câu điểm liệt`;
    if (trust[1].textContent !== text) trust[1].textContent = text;
  }

  const criticalCard = document.querySelector('[data-start-mode="critical"] strong');
  if (criticalCard) {
    const text = `${MOTORCYCLE_CRITICAL_COUNT} câu điểm liệt`;
    if (criticalCard.textContent !== text) criticalCard.textContent = text;
  }

  if (isMotorcycleCriticalView()) {
    const title = $("workspaceTitle");
    const text = `${MOTORCYCLE_CRITICAL_COUNT} tình huống nghiêm trọng`;
    if (title && title.textContent !== text) title.textContent = text;
  }
}

function syncCriticalBadgeAndFeedback(activeSourceId) {
  if (!isMotorcycle250Mode() || !activeSourceId || isExamMode()) return;

  const isOfficialCritical = motorcycleCriticalSet.has(activeSourceId);
  const badge = $("criticalBadge");
  if (badge && !isOfficialCritical) badge.classList.add("hidden");

  if (!isOfficialCritical) {
    const feedback = $("answerFeedback")?.querySelector("p");
    if (feedback && feedback.innerHTML.includes(" Đây là câu điểm liệt, hãy ghi nhớ kỹ.")) {
      feedback.innerHTML = feedback.innerHTML.replace(" Đây là câu điểm liệt, hãy ghi nhớ kỹ.", "");
    }
  }
}

function syncMotorcycleCriticalPalette(buttons) {
  const criticalView = isMotorcycleCriticalView();

  if (!criticalView) {
    for (const button of buttons) button.style.removeProperty("display");
    return;
  }

  const officialButtons = buttons.filter((button) => motorcycleCriticalSet.has(sourceQuestionId(button)));
  for (const button of buttons) {
    const official = motorcycleCriticalSet.has(sourceQuestionId(button));
    if (official) button.style.removeProperty("display");
    else button.style.display = "none";
  }

  const active = activePaletteButton(buttons);
  if (!active) return;

  const activeSourceId = sourceQuestionId(active);
  if (!motorcycleCriticalSet.has(activeSourceId)) {
    const currentPoolIndex = Number(active.dataset.paletteIndex || 0);
    const target = officialButtons.find((button) => Number(button.dataset.paletteIndex) > currentPoolIndex)
      || [...officialButtons].reverse().find((button) => Number(button.dataset.paletteIndex) < currentPoolIndex)
      || officialButtons[0];
    if (target) queueMicrotask(() => target.click());
    return;
  }

  const officialIndex = officialButtons.indexOf(active);
  const displayNumber = displayNumberBySourceId.get(activeSourceId);
  const questionNumber = $("questionNumber");
  if (questionNumber && displayNumber && officialIndex >= 0) {
    const text = `CÂU ${displayNumber} · ${officialIndex + 1} / ${MOTORCYCLE_CRITICAL_COUNT}`;
    if (questionNumber.textContent !== text) questionNumber.textContent = text;
  }

  const previous = $("prevQuestionBtn");
  const next = $("nextQuestionBtn");
  if (previous) previous.disabled = officialIndex <= 0;
  if (next) next.disabled = officialIndex < 0 || officialIndex >= officialButtons.length - 1;
}

function renumberPracticePalette() {
  if (isExamMode() || !isMotorcycle250Mode()) return;

  const buttons = paletteButtons();
  if (!buttons.length) {
    syncMotorcycleCriticalCopy();
    return;
  }

  for (const button of buttons) {
    const sourceId = sourceQuestionId(button);
    const displayNumber = displayNumberBySourceId.get(sourceId);
    if (!displayNumber) continue;

    const label = String(displayNumber);
    if (button.textContent.trim() !== label) button.textContent = label;
    button.setAttribute("aria-label", `Câu ${label}`);
    button.title = `Câu ${label}`;
  }

  const activeButton = activePaletteButton(buttons);
  const activeLabel = activeButton?.textContent?.trim();
  const activeSourceId = activeButton ? sourceQuestionId(activeButton) : 0;
  const questionNumber = $("questionNumber");

  if (questionNumber && activeLabel && !isMotorcycleCriticalView()) {
    const currentText = String(questionNumber.textContent || "");
    const nextText = currentText.replace(/^(\s*CÂU\s+)\d+/i, `$1${activeLabel}`);
    if (nextText !== currentText) questionNumber.textContent = nextText;
  }

  syncMotorcycleCriticalCopy();
  syncMotorcycleCriticalPalette(buttons);
  syncCriticalBadgeAndFeedback(activeSourceId);
}

function moveBetweenOfficialCriticalQuestions(direction) {
  if (!isMotorcycleCriticalView()) return false;

  const buttons = paletteButtons();
  const officialButtons = buttons.filter((button) => motorcycleCriticalSet.has(sourceQuestionId(button)));
  const active = activePaletteButton(buttons);
  const index = officialButtons.indexOf(active);
  if (index < 0) return false;

  const target = officialButtons[index + direction];
  if (target) target.click();
  return true;
}

function interceptCriticalNavigation() {
  document.addEventListener("click", (event) => {
    const control = event.target.closest?.("#prevQuestionBtn, #nextQuestionBtn");
    if (!control || !isMotorcycleCriticalView()) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    moveBetweenOfficialCriticalQuestions(control.id === "nextQuestionBtn" ? 1 : -1);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (!isMotorcycleCriticalView()) return;
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    if (document.querySelector("dialog[open]")) return;
    if ($("studyWorkspace")?.classList.contains("hidden")) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    moveBetweenOfficialCriticalQuestions(event.key === "ArrowRight" ? 1 : -1);
  }, true);
}

function wrapAiContext() {
  const original = window.__THAY_DAT_AI_CONTEXT__;
  if (typeof original !== "function" || original.__motorcycleCriticalWrapped) return;

  const wrapped = () => {
    const context = original();
    if (!context || !isMotorcycle250Mode() || isExamMode()) return context;
    if (!motorcycleCriticalSet.has(Number(context.id))) return { ...context, critical: false };
    return context;
  };
  wrapped.__motorcycleCriticalWrapped = true;
  window.__THAY_DAT_AI_CONTEXT__ = wrapped;
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
  const studyHome = $("studyHome");
  const statusFilter = $("statusFilter");

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

  if (studyHome) {
    new MutationObserver(queueRenumber).observe(studyHome, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  if (statusFilter) statusFilter.addEventListener("change", queueRenumber);

  new MutationObserver(queueRenumber).observe(document.body, {
    attributes: true,
    attributeFilter: ["data-theory-bank-count"]
  });

  interceptCriticalNavigation();
  wrapAiContext();
  queueRenumber();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", observeQuestionNumbering, { once: true });
} else {
  observeQuestionNumbering();
}
