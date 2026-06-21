(function attachParseTimesheet(global) {
  function parseTimesheet(text) {
    const normalized = text.replace(/\s+/g, " ").trim();
    const dates = findPeriodDates(normalized);
    const totalHours = findLabeledNumber(normalized, ["total hours", "total hrs", "period total", "hours worked"]);
    const overtimeHours = findLabeledNumber(normalized, ["overtime hours", "overtime hrs", "ot hours", "ot hrs"]);
    const regularHours = findLabeledNumber(normalized, ["regular hours", "regular hrs", "reg hours", "reg hrs"]);

    return {
      employeeName: findName(normalized),
      payPeriodStart: dates.start,
      payPeriodEnd: dates.end,
      dailyEntries: findDailyEntries(normalized),
      regularHours: regularHours ?? calculateRegularHours(totalHours, overtimeHours),
      overtimeHours,
      totalHours
    };
  }

  function findDailyEntries(text) {
    return [...text.matchAll(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\D{1,40}([0-9]+(?:\.[0-9]{1,2})?)\s*(?:hours|hrs|hr)?/gi)]
      .map(match => ({
        date: toDateInput(match[1]),
        hours: Number(match[2])
      }))
      .filter(entry => entry.date && entry.hours > 0);
  }

  function findLabeledNumber(text, labels) {
    for (const label of labels) {
      const pattern = new RegExp(`${escapeRegExp(label)}\\D{0,30}([0-9]+(?:\\.[0-9]{1,2})?)`, "i");
      const match = text.match(pattern);
      if (match) return Number(match[1]);
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

  function calculateRegularHours(totalHours, overtimeHours) {
    if (totalHours === null || overtimeHours === null) return null;
    return Math.max(Math.round((totalHours - overtimeHours + Number.EPSILON) * 100) / 100, 0);
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  global.PayMatch = global.PayMatch || {};
  global.PayMatch.parseTimesheet = parseTimesheet;
})(window);
