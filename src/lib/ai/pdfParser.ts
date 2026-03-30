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
        const fullText = pdfParser.getRawTextContent() || "";
        
        // Split by page break markers "----------------Page (n) Break----------------"
        const pageChunks = fullText.split(/----------------Page \(\d+\) Break----------------/g)
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 50) // skip empty/short pages

        const results = pageChunks.map((chunk: string) => {
          return {
            text: chunk,
            data: extractDataFromText(chunk)
          }
        })

        resolve(results)
      } catch (err: any) {
        reject(err)
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}
