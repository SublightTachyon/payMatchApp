(function attachExtractPdfText(global) {
  async function extractPdfText(file, pdfjsLib, options = {}) {
    const maxPages = options.maxPages ?? 5;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    if (pdf.numPages > maxPages) {
      throw new Error(`Too many pages. Please upload ${maxPages} pages or fewer.`);
    }

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(extractPageText(content.items));
    }

    return pages.join("\n\n").trim();
  }

  function extractPageText(items) {
    const lines = [];

    [...items]
      .sort((a, b) => {
        const yDifference = b.transform[5] - a.transform[5];
        return Math.abs(yDifference) > 2 ? yDifference : a.transform[4] - b.transform[4];
      })
      .forEach(item => {
        const text = item.str.trim();
        if (!text) return;

        const y = item.transform[5];
        let line = lines.find(candidate => Math.abs(candidate.y - y) <= 2);

        if (!line) {
          line = { y, items: [] };
          lines.push(line);
        }

        line.items.push({ x: item.transform[4], text });
      });

    return lines
      .sort((a, b) => b.y - a.y)
      .map(line => line.items.sort((a, b) => a.x - b.x).map(item => item.text).join(" "))
      .join("\n");
  }

  global.PayMatch = global.PayMatch || {};
  global.PayMatch.extractPdfText = extractPdfText;
})(window);
