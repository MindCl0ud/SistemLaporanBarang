// Debug script - print each page raw text to diagnose extraction issues
const PDFParser = require('pdf2json');
const fs = require('fs');

const pdfPath = 'D:\\Code\\SistemLaporanBarang\\Dokumen Laporan Barang.pdf';
const buffer = fs.readFileSync(pdfPath);
const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataError", (err) => console.error("PDF Error:", err.parserError));
pdfParser.on("pdfParser_dataReady", () => {
  const rawText = pdfParser.getRawTextContent();
  const pages = rawText.split('----------------Page (');
  pages.forEach((page, idx) => {
    if (!page.trim() || idx === 0) return
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  RAW PAGE ${idx}`);
    console.log('='.repeat(60));
    // Print lines numbered  
    const lines = page.split('\r\n').map(l => l.trim()).filter(Boolean)
    lines.slice(0, 80).forEach((l, i) => console.log(`[${i}] ${l}`));
  });
});

pdfParser.parseBuffer(buffer);
