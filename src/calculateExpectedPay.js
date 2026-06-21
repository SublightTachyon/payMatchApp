(function attachCalculateExpectedPay(global) {
  function calculateExpectedPay({ regularHours, overtimeHours, hourlyRate, overtimeRate }) {
    const safeHourlyRate = hourlyRate || 0;
    const safeOvertimeRate = overtimeRate || safeHourlyRate * 1.5;
    const regularPay = roundMoney((regularHours || 0) * safeHourlyRate);
    const overtimePay = roundMoney((overtimeHours || 0) * safeOvertimeRate);

    return {
      regularPay,
      overtimePay,
      grossPay: roundMoney(regularPay + overtimePay),
      overtimeRateUsed: safeOvertimeRate
    };
  }

  function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  const api = { calculateExpectedPay, roundMoney };

  global.PayMatch = global.PayMatch || {};
  Object.assign(global.PayMatch, api);

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
