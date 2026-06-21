(function attachDetectIssues(global) {
  const { calculateExpectedPay, roundMoney } = global.PayMatch || require("./calculateExpectedPay");

  function detectIssues(values) {
    const issues = [];
    const hourTolerance = values.hourTolerance ?? 0.05;
    const payTolerance = values.payTolerance ?? 0.5;
    const expected = calculateExpectedPay({
      regularHours: values.timesheetRegularHours,
      overtimeHours: values.timesheetOvertimeHours,
      hourlyRate: values.hourlyRate,
      overtimeRate: values.overtimeRate
    });
    const paidHours = roundHours((values.paystubRegularHours || 0) + (values.paystubOvertimeHours || 0));
    const missingTotalHours = roundHours((values.timesheetTotalHours || 0) - paidHours);
    const missingRegularHours = roundHours((values.timesheetRegularHours || 0) - (values.paystubRegularHours || 0));
    const missingOvertimeHours = roundHours((values.timesheetOvertimeHours || 0) - (values.paystubOvertimeHours || 0));
    const grossDifference = roundMoney(expected.grossPay - (values.grossPay || 0));

    if (values.payPeriodStart && values.paystubPayPeriodStart && values.payPeriodStart !== values.paystubPayPeriodStart) {
      issues.push(makeIssue("PAY_PERIOD_MISMATCH", "high", "Pay period mismatch", "The timecard and paystub appear to cover different start dates.", 0));
    }

    if (Math.abs(missingTotalHours) > hourTolerance) {
      issues.push(makeIssue(
        "TOTAL_HOURS_MISMATCH",
        "high",
        "Total hours mismatch",
        `Timesheet shows ${formatHours(values.timesheetTotalHours)} total hours, but the paystub appears to pay ${formatHours(paidHours)} hours.`,
        estimateMixedHourImpact(missingRegularHours, missingOvertimeHours, values)
      ));
    }

    if (Math.abs(missingRegularHours) > hourTolerance) {
      issues.push(makeIssue(
        "REGULAR_HOURS_MISMATCH",
        "medium",
        "Regular hours mismatch",
        `Timesheet regular hours are ${formatHours(values.timesheetRegularHours)}. Paystub regular hours are ${formatHours(values.paystubRegularHours)}.`,
        roundMoney(missingRegularHours * (values.hourlyRate || 0))
      ));
    }

    if (Math.abs(missingOvertimeHours) > hourTolerance) {
      issues.push(makeIssue(
        "OVERTIME_HOURS_MISMATCH",
        "high",
        "Overtime hours mismatch",
        `Timesheet overtime is ${formatHours(values.timesheetOvertimeHours)} hours. Paystub overtime is ${formatHours(values.paystubOvertimeHours)} hours.`,
        roundMoney(missingOvertimeHours * (values.overtimeRate || 0))
      ));
    }

    if (values.hourlyRate && values.overtimeRate && values.overtimeRate < values.hourlyRate * 1.5 - 0.01) {
      issues.push(makeIssue(
        "OVERTIME_RATE_LOW",
        "high",
        "Overtime rate may be low",
        `Overtime rate is ${formatMoney(values.overtimeRate)}. One-and-a-half times the base rate would be ${formatMoney(values.hourlyRate * 1.5)}.`,
        roundMoney(((values.hourlyRate * 1.5) - values.overtimeRate) * (values.paystubOvertimeHours || 0))
      ));
    }

    if (values.grossPay && Math.abs(grossDifference) > payTolerance) {
      issues.push(makeIssue(
        "GROSS_PAY_MISMATCH",
        grossDifference > 0 ? "high" : "medium",
        "Gross pay does not match calculated gross",
        `Based on timesheet hours and listed rates, expected gross is ${formatMoney(expected.grossPay)}. Paystub gross is ${formatMoney(values.grossPay)}.`,
        grossDifference
      ));
    }

    if (!values.hourlyRate) {
      issues.push(makeIssue("HOURLY_RATE_MISSING", "medium", "Hourly rate missing", "Add the base hourly rate so the app can estimate missing gross pay.", 0));
    }

    return issues;
  }

  function makeIssue(type, severity, title, detail, estimatedPayImpact) {
    return { type, severity, title, detail, estimatedPayImpact };
  }

  function estimateMixedHourImpact(regularDifference, overtimeDifference, values) {
    return roundMoney(
      (regularDifference || 0) * (values.hourlyRate || 0) +
      (overtimeDifference || 0) * (values.overtimeRate || 0)
    );
  }

  function roundHours(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
  }

  function formatHours(value) {
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  }

  const api = { detectIssues, formatMoney, formatHours };

  global.PayMatch = global.PayMatch || {};
  Object.assign(global.PayMatch, api);

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
