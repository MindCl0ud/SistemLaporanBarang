// Trace exactly what 'lines' array contains at JUMLAH position after normalizeText
const PDFParser = require('pdf2json');
const fs = require('fs');

function normalizeText(text) {
  let t = text.replace(/(\d)\s*\.\s*(\d)/g, '$1.$2')
  t = t.replace(/[ \t]{3,}/g, '  ')
  return t
}

const buffer = fs.readFileSync('D:\\Code\\SistemLaporanBarang\\Dokumen Laporan Barang.pdf');
const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataError", (err) => console.error(err.parserError));
pdfParser.on("pdfParser_dataReady", () => {
  const rawText = pdfParser.getRawTextContent()
  const pages = rawText.split('----------------Page (')
  
  pages.forEach((page, idx) => {
    if (!page.trim() || idx === 0) return
    const text = normalizeText(page)
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 1)
    
    console.log(`\n=== PAGE ${idx} - JUMLAH Lines ===`)
    lines.forEach((l, i) => {
      if (l.toUpperCase().includes('JUMLAH')) {
        console.log(`  line[${i}]: ${JSON.stringify(l)}`)
        console.log(`  line[${i+1}]: ${JSON.stringify(lines[i+1])}`)
        // Test the regex
        const match = l.match(/^JUMLAH\s+([\d.,\s]+)$/i)
        console.log(`  sameLineMatch:`, match ? JSON.stringify(match[1]) : null)
      }
    })
  })
});

pdfParser.parseBuffer(buffer);
