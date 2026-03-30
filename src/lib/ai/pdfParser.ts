'use server'

// @ts-ignore
const PDFParser = require('pdf2json')

import { extractDataFromText } from './documentParser';

export async function parsePdfServer(formData: FormData): Promise<any> {
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
        
        // --- LOGIKA HYBRID: Deteksi PDF Scan ---
        // Jika teks yang diekstrak sangat sedikit (< 50 karakter), kemungkinan besar ini adalah PDF hasil scan (gambar)
        if (fullText.trim().length < 50) {
           resolve([{ 
             text: "PDF_SCAN_DETECTED", 
             data: null,
             info: "Dokumen ini terdeteksi sebagai PDF hasil scan (tanpa teks asli). Silakan unggah dalam format gambar (JPG/PNG) untuk menggunakan OCR."
           }]);
           return;
        }

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
