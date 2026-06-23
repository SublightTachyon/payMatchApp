const pdfjsLib = window.pdfjsLib;
const {
  extractPdfText,
  parsePaystub,
  parseTimesheet,
  detectIssues,
  renderSummary,
  renderIssues,
  buildPayrollMessage
} = window.PayMatch;

const MAX_FILE_SIZE_MB = 10;
const MAX_PAGES = 5;
const FEEDBACK_EMAIL = "tag727@yahoo.com";

if (!pdfjsLib) {
  throw new Error("PDF.js did not load.");
}

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "vendor/pdf.worker.min.js";

const fields = {
  employeeName: byId("employee-name"),
  periodStart: byId("period-start"),
  periodEnd: byId("period-end"),
  timesheetTotalHours: byId("timesheet-total-hours"),
  timesheetRegularHours: byId("timesheet-regular-hours"),
  timesheetOvertimeHours: byId("timesheet-overtime-hours"),
  paystubRegularHours: byId("paystub-regular-hours"),
  paystubOvertimeHours: byId("paystub-overtime-hours"),
  hourlyRate: byId("hourly-rate"),
  overtimeRate: byId("overtime-rate"),
  grossPay: byId("gross-pay"),
  hourTolerance: byId("hour-tolerance"),
  payTolerance: byId("pay-tolerance")
};

const elements = {
  status: byId("status"),
  themeToggle: byId("theme-toggle"),
  feedbackButton: byId("feedback-button"),
  feedbackPanelButton: byId("feedback-panel-button"),
  feedbackForm: byId("feedback-form"),
  feedbackGoal: byId("feedback-goal"),
  feedbackExpected: byId("feedback-expected"),
  feedbackConfusing: byId("feedback-confusing"),
  feedbackMath: byId("feedback-math"),
  feedbackFeature: byId("feedback-feature"),
  feedbackUseAgain: byId("feedback-use-again"),
  feedbackReplyEmail: byId("feedback-reply-email"),
  reportBadResult: byId("report-bad-result"),
  compareButton: byId("compare-button"),
  sampleButton: byId("sample-button"),
  clearButton: byId("clear-button"),
  copyMessage: byId("copy-message"),
  issueList: byId("issue-list"),
  summaryStrip: byId("summary-strip"),
  payrollMessage: byId("payroll-message"),
  timesheetJson: byId("timesheet-json"),
  paystubJson: byId("paystub-json"),
  timesheetText: byId("timesheet-text"),
  paystubText: byId("paystub-text")
};

setupTheme();
setupUpload("timesheet");
setupUpload("paystub");

elements.compareButton.addEventListener("click", runAudit);
elements.feedbackButton.addEventListener("click", () => focusFeedbackForm());
elements.reportBadResult.addEventListener("click", () => focusFeedbackForm("The result looked wrong or confusing."));
elements.feedbackForm.addEventListener("submit", sendFeedbackEmail);
elements.sampleButton.addEventListener("click", loadSample);
elements.clearButton.addEventListener("click", clearAllData);
elements.copyMessage.addEventListener("click", copyMessage);
Object.values(fields).forEach(field => field.addEventListener("input", runAudit));

window.addEventListener("dragover", event => event.preventDefault());
window.addEventListener("drop", event => event.preventDefault());

function byId(id) {
  return document.getElementById(id);
}

function setupTheme() {
  const savedTheme = localStorage.getItem("paymatch-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

  elements.themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("paymatch-theme", nextTheme);
    applyTheme(nextTheme);
  });
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  elements.themeToggle.textContent = isDark ? "Light" : "Dark";
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
}

function setupUpload(type) {
  const drop = byId(`${type}-drop`);
  const input = byId(`${type}-input`);
  const name = byId(`${type}-name`);
  const badge = byId(`${type}-state`);

  drop.addEventListener("click", () => input.click());
  input.addEventListener("change", () => handleFile(input.files[0], type, name, badge));

  drop.addEventListener("dragover", event => {
    event.preventDefault();
    drop.classList.add("dragging");
  });

  drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
  drop.addEventListener("drop", event => {
    event.preventDefault();
    drop.classList.remove("dragging");
    handleFile(event.dataTransfer.files[0], type, name, badge);
  });
}

async function handleFile(file, type, nameElement, badge) {
  if (!file) return;

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    setStatus("Please upload a PDF.");
    return;
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    setStatus(`PDF is too large. Please upload a file under ${MAX_FILE_SIZE_MB} MB.`);
    return;
  }

  nameElement.textContent = file.name;
  setStatus(`Reading ${file.name}`);

  try {
    const text = await extractPdfText(file, pdfjsLib, { maxPages: MAX_PAGES });
    byId(`${type}-text`).textContent = text || "No selectable text found. Scanned PDFs need OCR.";
    badge.textContent = text ? "Read" : "Needs OCR";
    badge.classList.toggle("ready", Boolean(text));

    if (type === "timesheet") {
      const parsed = parseTimesheet(text);
      renderJson(elements.timesheetJson, parsed);
      applyTimesheetParse(parsed);
    } else {
      const parsed = parsePaystub(text);
      renderJson(elements.paystubJson, parsed);
      applyPaystubParse(parsed);
    }

    setStatus(`${file.name} loaded`);
    runAudit();
  } catch (error) {
    console.error(error);
    setStatus(getPdfErrorMessage(error));
  }
}

function applyTimesheetParse(parsed) {
  setIfBlank(fields.employeeName, parsed.employeeName);
  setIfBlank(fields.periodStart, parsed.payPeriodStart);
  setIfBlank(fields.periodEnd, parsed.payPeriodEnd);
  setIfBlank(fields.timesheetTotalHours, parsed.totalHours);
  setIfBlank(fields.timesheetRegularHours, parsed.regularHours);
  setIfBlank(fields.timesheetOvertimeHours, parsed.overtimeHours);
}

function applyPaystubParse(parsed) {
  setIfBlank(fields.employeeName, parsed.employeeName);
  setIfBlank(fields.periodStart, parsed.payPeriodStart);
  setIfBlank(fields.periodEnd, parsed.payPeriodEnd);
  setIfBlank(fields.paystubRegularHours, parsed.regularHours);
  setIfBlank(fields.paystubOvertimeHours, parsed.overtimeHours);
  setIfBlank(fields.hourlyRate, parsed.hourlyRate);
  setIfBlank(fields.overtimeRate, parsed.overtimeRate);
  setIfBlank(fields.grossPay, parsed.grossPay);
}

function runAudit() {
  const values = readFormValues();
  const issues = detectIssues(values);
  const estimatedDifference = issues.reduce((sum, issue) => sum + (issue.estimatedPayImpact || 0), 0);

  renderSummary(elements.summaryStrip, issues, estimatedDifference);
  renderIssues(elements.issueList, issues);
  elements.payrollMessage.value = buildPayrollMessage(issues, values, estimatedDifference);
}

function readFormValues() {
  const hourlyRate = numberFrom(fields.hourlyRate);
  const overtimeRate = numberFrom(fields.overtimeRate) || (hourlyRate ? hourlyRate * 1.5 : null);

  return {
    employeeName: fields.employeeName.value.trim(),
    payPeriodStart: fields.periodStart.value,
    payPeriodEnd: fields.periodEnd.value,
    timesheetTotalHours: numberFrom(fields.timesheetTotalHours),
    timesheetRegularHours: numberFrom(fields.timesheetRegularHours),
    timesheetOvertimeHours: numberFrom(fields.timesheetOvertimeHours),
    paystubRegularHours: numberFrom(fields.paystubRegularHours),
    paystubOvertimeHours: numberFrom(fields.paystubOvertimeHours),
    hourlyRate,
    overtimeRate,
    grossPay: numberFrom(fields.grossPay),
    hourTolerance: numberFrom(fields.hourTolerance) ?? 0.05,
    payTolerance: numberFrom(fields.payTolerance) ?? 0.5
  };
}

function loadSample() {
  fields.employeeName.value = "Turone Greenwood";
  fields.periodStart.value = "2026-05-25";
  fields.periodEnd.value = "2026-06-07";
  fields.timesheetTotalHours.value = "47.10";
  fields.timesheetRegularHours.value = "40.00";
  fields.timesheetOvertimeHours.value = "7.10";
  fields.paystubRegularHours.value = "40.00";
  fields.paystubOvertimeHours.value = "6.88";
  fields.hourlyRate.value = "22.50";
  fields.overtimeRate.value = "33.75";
  fields.grossPay.value = "1132.20";
  elements.timesheetText.textContent = "Sample timesheet: regular 40.00, overtime 7.10, total hours 47.10.";
  elements.paystubText.textContent = "Sample paystub: regular 40.00, overtime 6.88, rate 22.50, OT rate 33.75, gross pay 1132.20.";
  renderJson(elements.timesheetJson, {
    employeeName: "Turone Greenwood",
    payPeriodStart: "2026-05-25",
    payPeriodEnd: "2026-06-07",
    dailyEntries: [
      { date: "2026-05-26", hours: 10.2 },
      { date: "2026-05-27", hours: 10.1 }
    ],
    regularHours: 40,
    overtimeHours: 7.1,
    totalHours: 47.1
  });
  renderJson(elements.paystubJson, {
    employeeName: "Turone Greenwood",
    payPeriodStart: "2026-05-25",
    payPeriodEnd: "2026-06-07",
    regularHours: 40,
    overtimeHours: 6.88,
    hourlyRate: 22.5,
    overtimeRate: 33.75,
    grossPay: 1132.2,
    deductions: []
  });
  setStatus("Sample loaded");
  runAudit();
}

function clearAllData() {
  Object.values(fields).forEach(field => {
    if (field.id === "hour-tolerance") {
      field.value = "0.05";
      return;
    }

    if (field.id === "pay-tolerance") {
      field.value = "0.50";
      return;
    }

    field.value = "";
  });

  ["timesheet", "paystub"].forEach(type => {
    byId(`${type}-input`).value = "";
    byId(`${type}-name`).textContent = "No file selected";
    byId(`${type}-state`).textContent = "Empty";
    byId(`${type}-state`).classList.remove("ready");
  });

  elements.timesheetText.textContent = "No timesheet loaded.";
  elements.paystubText.textContent = "No paystub loaded.";
  elements.timesheetJson.textContent = "No timesheet JSON yet.";
  elements.paystubJson.textContent = "No paystub JSON yet.";
  elements.issueList.className = "issue-list empty";
  elements.issueList.textContent = "Upload documents or load the sample to start.";
  elements.payrollMessage.value = "This tool will write a calm, specific message after it finds a mismatch.";
  renderSummary(elements.summaryStrip, [], 0);
  setStatus("Cleared all local data");
}

function copyMessage() {
  elements.payrollMessage.select();
  document.execCommand("copy");
  setStatus("Payroll message copied");
}

function focusFeedbackForm(confusingText) {
  if (confusingText && !elements.feedbackConfusing.value.trim()) {
    elements.feedbackConfusing.value = confusingText;
  }

  elements.feedbackForm.scrollIntoView({ behavior: "smooth", block: "start" });
  elements.feedbackGoal.focus({ preventScroll: true });
  setStatus("Feedback form ready");
}

function sendFeedbackEmail(event) {
  event.preventDefault();

  const values = readFormValues();
  const subject = "PayMatch feedback";
  const body = [
    "What were you trying to do?",
    cleanFeedback(elements.feedbackGoal.value),
    "",
    "Did the app give the result you expected?",
    cleanFeedback(elements.feedbackExpected.value),
    "",
    "Was anything confusing?",
    cleanFeedback(elements.feedbackConfusing.value),
    "",
    "Did the math look right?",
    cleanFeedback(elements.feedbackMath.value),
    "",
    "What feature would make this more useful?",
    cleanFeedback(elements.feedbackFeature.value),
    "",
    "Would you use this again?",
    cleanFeedback(elements.feedbackUseAgain.value),
    "",
    "Optional reply email:",
    cleanFeedback(elements.feedbackReplyEmail.value),
    "",
    "Testing details:",
    `Pay period: ${values.payPeriodStart || "not entered"} to ${values.payPeriodEnd || "not entered"}`,
    `Timesheet hours: ${values.timesheetTotalHours ?? "not entered"}`,
    `Paystub regular/OT hours: ${values.paystubRegularHours ?? "not entered"} / ${values.paystubOvertimeHours ?? "not entered"}`,
    `Hourly/OT rate: ${values.hourlyRate ?? "not entered"} / ${values.overtimeRate ?? "not entered"}`,
    `Gross pay: ${values.grossPay ?? "not entered"}`,
    "",
    "Please do not attach sensitive pay documents unless you are comfortable sharing them. Remove SSN, address, employee ID, employer details, and other private information first."
  ].join("\n");

  window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  setStatus("Opening feedback email");
}

function cleanFeedback(value) {
  const trimmed = value.trim();
  return trimmed === "" ? "No answer" : trimmed;
}

function setIfBlank(field, value) {
  if ((field.value === "" || field.value === "0") && value !== null && value !== undefined && value !== "") {
    field.value = value;
  }
}

function renderJson(element, value) {
  element.textContent = JSON.stringify(value, null, 2);
}

function numberFrom(field) {
  return field.value === "" ? null : Number(field.value);
}

function getPdfErrorMessage(error) {
  const message = error && error.message ? error.message : "";

  if (message.includes("Too many pages")) {
    return message;
  }

  if (/password/i.test(message)) {
    return "That PDF appears to be password-protected. Please upload an unlocked copy.";
  }

  if (/Invalid PDF|Missing PDF|Unexpected server response/i.test(message)) {
    return "That PDF looks broken or unsupported. Please try a clean PDF export.";
  }

  return "Could not read that PDF. Scanned PDFs may need OCR first.";
}

function setStatus(message) {
  elements.status.textContent = message;
}
