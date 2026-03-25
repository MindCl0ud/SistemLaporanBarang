'use server'

// @ts-ignore
const PDFParser = require('pdf2json')

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
        
        let type = "Nota"
        if (text.toLowerCase().includes('berita acara') || text.toLowerCase().includes('bap')) type = "Berita Acara"
        if (text.toLowerCase().includes('kwitansi') || text.toLowerCase().includes('kuitansi')) type = "Kwitansi"
        
        let totalAmount = 0
        const rpRegex = /(?:Rp|Total|Jumlah)[\s\S]*?([\d,.]+)/i
        const match = text.match(rpRegex)
        if (match && match[1]) {
          const cleaned = match[1].replace(/[^\d]/g, '')
          totalAmount = parseInt(cleaned, 10)
        }

        let vendorName = "Toko/Penyedia (Dari PDF)"
        const lines = text.split('\n').filter((l: string) => l.trim().length > 0)
        const startLines = lines.slice(0, 8)
        for (const line of startLines) {
          if (line.toLowerCase().includes('toko') || line.toLowerCase().includes('cv') || line.toLowerCase().includes('pt')) {
            vendorName = line.trim()
            break
          }
        }

        resolve({ text, data: { type, vendorName, totalAmount } })
      } catch (err: any) {
        reject(err)
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}
