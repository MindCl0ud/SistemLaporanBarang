const PDFParser = require('pdf2json');
const fs = require('fs');

const buffer = fs.readFileSync('D:\\Code\\SistemLaporanBarang\\Dokumen Laporan Barang.pdf');
const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataReady", () => {
  const raw = pdfParser.getRawTextContent()
  console.log("--- RAW OCR DATA ---")
  console.log(raw)
});
pdfParser.parseBuffer(buffer);
