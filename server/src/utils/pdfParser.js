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
    const data = await pdf(pdfBuffer);
    return data.text || '';
  } catch (error) {
    console.error('[PDF Parser Error]:', error);
    throw new Error('Failed to extract text from PDF document.');
  }
};
