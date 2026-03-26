// Test script to read raw text from PDF using pdf2json
const PDFParser = require('pdf2json');
const fs = require('fs');

const pdfPath = 'D:\\Code\\SistemLaporanBarang\\Dokumen Laporan Barang.pdf';
const buffer = fs.readFileSync(pdfPath);

const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataError", (err) => {
  console.error("PDF Error:", err.parserError);
});

pdfParser.on("pdfParser_dataReady", () => {
  const text = pdfParser.getRawTextContent();
  console.log("=== RAW EXTRACTED TEXT ===");
  console.log(text);
});

pdfParser.parseBuffer(buffer);
