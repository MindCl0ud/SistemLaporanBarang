// Trace JUMLAH match specifically
const PDFParser = require('pdf2json');
const fs = require('fs');

const buffer = fs.readFileSync('D:\\Code\\SistemLaporanBarang\\Dokumen Laporan Barang.pdf');
const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataError", (err) => console.error(err.parserError));
pdfParser.on("pdfParser_dataReady", () => {
  const rawText = pdfParser.getRawTextContent()
  const pages = rawText.split('----------------Page (')
  
  pages.forEach((page, idx) => {
    if (!page.trim() || idx === 0) return
    console.log(`\n=== PAGE ${idx} JUMLAH trace ===`)
    
    // Find JUMLAH
    const jumlahIdx = page.search(/JUMLAH/i)
    if (jumlahIdx >= 0) {
      const snippet = page.slice(jumlahIdx, jumlahIdx + 50)
      console.log("Raw snippet after JUMLAH:", JSON.stringify(snippet))
    }
    
    // Try the regex
    const m = page.match(/JUMLAH\s+([\d.,\s]+)/i)
    if (m) console.log("Regex captured:", JSON.stringify(m[1]))
    else {
      // Try next-line approach
      const lines = page.split(/\r?\n/)
      lines.forEach((l, i) => {
        if (/^JUMLAH$/i.test(l.trim())) {
          console.log("JUMLAH on own line, next line:", JSON.stringify(lines[i+1]))
        }
      })
    }
  })
});

pdfParser.parseBuffer(buffer);
