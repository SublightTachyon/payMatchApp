const assert = require("node:assert/strict");
const { calculateExpectedPay } = require("../src/calculateExpectedPay");
const { detectIssues } = require("../src/detectIssues");

const expected = calculateExpectedPay({
  regularHours: 40,
  overtimeHours: 7.1,
  hourlyRate: 22.5,
  overtimeRate: 33.75
});

assert.equal(expected.regularPay, 900);
assert.equal(expected.overtimePay, 239.63);
assert.equal(expected.grossPay, 1139.63);

const issues = detectIssues({
  payPeriodStart: "2026-05-25",
  payPeriodEnd: "2026-06-07",
  timesheetTotalHours: 47.1,
  timesheetRegularHours: 40,
  timesheetOvertimeHours: 7.1,
  paystubRegularHours: 40,
  paystubOvertimeHours: 6.88,
  hourlyRate: 22.5,
  overtimeRate: 33.75,
  grossPay: 1132.2,
  hourTolerance: 0.05,
  payTolerance: 0.5
});

assert.ok(issues.some(issue => issue.type === "OVERTIME_HOURS_MISMATCH"));
assert.ok(issues.some(issue => issue.type === "GROSS_PAY_MISMATCH"));

console.log("payrollMath.test.js passed");
