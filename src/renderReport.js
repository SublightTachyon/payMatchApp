(function attachRenderReport(global) {
  const { formatMoney } = global.PayMatch || {};

  function renderSummary(container, issues, estimatedDifference) {
    const status = issues.length === 0 ? "Looks close" : "Possible issue";
    replaceChildren(container, [
      makeSummaryItem("Status", status),
      makeSummaryItem("Estimated difference", formatMoney(estimatedDifference)),
      makeSummaryItem("Issues", String(issues.length))
    ]);
  }

  function makeSummaryItem(label, value) {
    const item = document.createElement("div");
    const labelElement = document.createElement("span");
    const valueElement = document.createElement("strong");

    labelElement.textContent = label;
    valueElement.textContent = value;
    item.append(labelElement, valueElement);
    return item;
  }

  function renderIssues(container, issues) {
    container.replaceChildren();

    if (issues.length === 0) {
      container.className = "issue-list empty";
      container.textContent = "No mismatches found in the fields entered.";
      return;
    }

    container.className = "issue-list";

    issues.forEach(issue => {
      const article = document.createElement("article");
      const title = document.createElement("h3");
      const detail = document.createElement("p");

      article.className = `issue ${issue.severity}`;
      title.textContent = issue.title;
      detail.textContent = `${issue.detail} Estimated impact: ${formatMoney(issue.estimatedPayImpact || 0)}.`;
      article.append(title, detail);
      container.append(article);
    });
  }

  function buildPayrollMessage(issues, values, estimatedDifference) {
    if (issues.length === 0) {
      return "Hi, I checked my timesheet against my paystub and the hours and gross pay look close based on the information I entered.";
    }

    const period = values.payPeriodStart && values.payPeriodEnd
      ? ` for ${values.payPeriodStart} through ${values.payPeriodEnd}`
      : "";
    const lines = issues
      .filter(issue => issue.type !== "HOURLY_RATE_MISSING")
      .slice(0, 3)
      .map(issue => `- ${issue.title}: ${issue.detail}`);

    return [
      `Hi, I noticed a possible paystub mismatch${period}. Could you help me understand it?`,
      "",
      ...lines,
      "",
      `My estimated gross pay difference before taxes is ${formatMoney(estimatedDifference)}. I may be missing something, but I wanted to ask with the timesheet and paystub details in front of me.`
    ].join("\n");
  }

  global.PayMatch = global.PayMatch || {};
  Object.assign(global.PayMatch, { renderSummary, renderIssues, buildPayrollMessage });

  function replaceChildren(container, children) {
    container.replaceChildren(...children);
  }
})(window);
