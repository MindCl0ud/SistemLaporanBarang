'use server'

// @ts-ignore
const PDFParser = require('pdf2json')

import { extractDataFromText } from './documentParser';

export async function parsePdfServer(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  return new Promise((resolve, reject) => {
    // @ts-ignore
    const pdfParser = new PDFParser(null, 1);
    
    pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
    pdfParser.on("pdfParser_dataReady", () => {
      try {
        const text = pdfParser.getRawTextContent() || "";
        const result = extractDataFromText(text)
        resolve({ text, data: result })
      } catch (err: any) {
        reject(err)
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}
