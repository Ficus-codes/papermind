import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

export class ScannedPdfError extends Error {
  constructor(
    message = "No extractable text found - scanned PDFs are not supported yet",
  ) {
    super(message);
    this.name = "ScannedPdfError";
  }
}

export const extractText = async (buffer) => {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();

    // Scanned PDF detection: total text length threshold
    const totalText = result.text.trim();
    if (totalText.length < 100) {
      throw new ScannedPdfError();
    }

    // Map result.pages to our internal format [{ pageNumber, text }]
    const pages = result.pages.map((page) => ({
      pageNumber: page.num,
      text: page.text,
    }));

    return {
      rawText: result.text,
      pages: pages,
    };
  } catch (error) {
    if (error instanceof ScannedPdfError) {
      throw error;
    }
    throw new Error(`PDF extraction failed: ${error.message}`);
  } finally {
    await parser.destroy();
  }
};
