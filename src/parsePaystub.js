(function attachParsePaystub(global) {
  function parsePaystub(text) {
    const normalized = normalize(text);
    const dates = findPeriodDates(normalized);

    return {
      employeeName: findName(normalized),
      payPeriodStart: dates.start,
      payPeriodEnd: dates.end,
      regularHours: findLabeledNumber(normalized, ["regular hours", "regular hrs", "reg hours", "reg hrs"]),
      overtimeHours: findLabeledNumber(normalized, ["overtime hours", "overtime hrs", "ot hours", "ot hrs"]),
      hourlyRate: findLabeledMoney(normalized, ["hourly rate", "regular rate", "base rate", "rate"]),
      overtimeRate: findLabeledMoney(normalized, ["overtime rate", "ot rate"]),
      grossPay: findLabeledMoney(normalized, ["gross pay", "current gross", "gross earnings"]),
      deductions: findDeductions(normalized)
    };
  }

  function findDeductions(text) {
    return ["401k", "taxes", "insurance", "medical", "dental"]
      .map(name => ({ name, amount: findLabeledMoney(text, [name]) }))
      .filter(deduction => deduction.amount !== null);
  }

  function normalize(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function findLabeledNumber(text, labels) {
    for (const label of labels) {
      const pattern = new RegExp(`${escapeRegExp(label)}\\D{0,30}([0-9]+(?:\\.[0-9]{1,2})?)`, "i");
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }

    return null;
  }

  function findLabeledMoney(text, labels) {
    for (const label of labels) {
      const pattern = new RegExp(`${escapeRegExp(label)}\\D{0,30}\\$?([0-9,]+(?:\\.[0-9]{1,2})?)`, "i");
      const match = text.match(pattern);
      if (match) return Number(match[1].replace(/,/g, ""));
    }

    return null;
  }

  function findName(text) {
    const match = text.match(/(?:employee name|employee|name)\D{1,20}([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
    return match ? match[1] : "";
  }

  function findPeriodDates(text) {
    const dates = [...text.matchAll(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g)]
      .map(match => toDateInput(match[1]))
      .filter(Boolean);

    return {
      start: dates[0] || "",
      end: dates[1] || ""
    };
  }

  function toDateInput(value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (!match) return "";

    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  global.PayMatch = global.PayMatch || {};
  global.PayMatch.parsePaystub = parsePaystub;
})(window);
