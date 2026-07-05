import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

/**
 * Parses raw text from a PDF binary buffer.
 * @param {Buffer} pdfBuffer - The binary buffer of the PDF file.
 * @returns {Promise<string>} The parsed text.
 */
export const parsePDFText = async (pdfBuffer) => {
  try {
    if (typeof pdf.PDFParse === 'function') {
      // For modular pdf-parse v2, instantiate the class using Uint8Array
      const uint8Array = new Uint8Array(pdfBuffer);
      const parser = new pdf.PDFParse(uint8Array);
      await parser.load();
      const result = await parser.getText();
      await parser.destroy().catch(() => {});
      return result?.text || '';
    } else {
      // Fallback to traditional pdf-parse function signature
      const data = await pdf(pdfBuffer);
      return data.text || '';
    }
  } catch (error) {
    console.error('[PDF Parser Error]:', error);
    throw new Error('Failed to extract text from PDF document.');
  }
};
