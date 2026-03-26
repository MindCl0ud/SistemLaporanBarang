// Test the extraction logic against the actual PDF
// Run: node test_extraction.cjs
const PDFParser = require('pdf2json');
const fs = require('fs');

// Replicate the extraction logic inline for testing
function normalizeOcrText(text) {
  let t = text.replace(/(\d)\s*\.\s*(\d)/g, '$1.$2')
  t = t.replace(/(\d)\s+(\d)/g, '$1$2')
  t = t.replace(/ {2,}/g, ' ')
  return t
}

function parseAmount(str) {
  if (!str) return 0
  const cleaned = str.replace(/[^\d]/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

function parseIndonesianDate(dateStr) {
  const monthMap = {
    'januari': 0,'februari':1,'maret':2,'april':3,'mei':4,'juni':5,
    'juli':6,'agustus':7,'september':8,'oktober':9,'november':10,'desember':11
  }
  const numericMatch = dateStr.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/i)
  if (numericMatch) {
    const day = parseInt(numericMatch[1])
    const monthName = numericMatch[2].toLowerCase()
    const year = parseInt(numericMatch[3])
    const monthNum = monthMap[monthName]
    if (monthNum !== undefined) return new Date(year, monthNum, day).toLocaleDateString('id-ID')
  }
  return null
}

function extractDataFromText(rawText) {
  const text = normalizeOcrText(rawText)
  const lowerText = text.toLowerCase()
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1)

  let type = 'Nota Pesanan'
  if (lowerText.includes('berita acara penerimaan') || lowerText.includes('bap-brg')) type = 'Berita Acara Penerimaan Barang'
  else if (lowerText.includes('kwitansi') || lowerText.includes('kuitansi')) type = 'Kwitansi'
  else if (lowerText.includes('nota pesanan') || lowerText.includes('np.brg')) type = 'Nota Pesanan'

  let docNumber = ''
  const docNumMatch = text.match(/(?:Nomor|Nomo r|Nomer)\s*[:.]?\s*([A-Z0-9./\s-]+?)(?:\n|Dari|Pada|$)/i)
  if (docNumMatch) docNumber = docNumMatch[1].replace(/\s+/g, '').trim()

  let docDate = null
  const waikabubakMatches = [...text.matchAll(/Waika\s*bubak\s*,?\s*(\d{1,2}\s+[a-z]+\s+\d{4})/gi)]
  if (waikabubakMatches.length > 0) {
    const lastMatch = waikabubakMatches[waikabubakMatches.length - 1]
    docDate = parseIndonesianDate(lastMatch[1])
  }

  let kodeRek = ''
  let subKegiatan = ''
  const fullCodePattern = new RegExp('(5\\s*\\.\\s*01\\s*\\.\\s*0[1l]\\s*\\.\\s*2\\s*\\.\\s*09\\s*\\.\\s*0002)(?:\\s*\\.?\\s*([\\d\\s.]+))?', 'i')
  const kodeMatch = text.match(fullCodePattern)
  if (kodeMatch) {
    kodeRek = '5.01.01.2.09.0002'
    if (kodeMatch[2]) subKegiatan = kodeMatch[2].replace(/\s+/g, '').replace(/^\./, '')
  }

  let vendorName = 'Tidak Diketahui'
  const vendorRegex = /(?:CV\.|Toko|UD\.|PT\.|Pengusaha)\s+([A-Z][A-Za-z\s]+?)(?:\n|Alam|Jab)/
  const vendorMatch = text.match(vendorRegex)
  if (vendorMatch) vendorName = vendorMatch[0].replace(/\n.*/s, '').trim()

  const items = []
  const itemOneLine = /^-\s+(.+?)\s+(\d+)\s+(?:buah\s*x|botol\s*x|buahx|botolx|ltr|unit|buah|set)\s*([\d.,]+)\s+([\d.,]+)$/i
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const singleMatch = line.match(itemOneLine)
    if (singleMatch) {
      const price = parseAmount(singleMatch[3])
      const total = parseAmount(singleMatch[4])
      if (price > 0 && total > 0) {
        items.push({ description: singleMatch[1].replace(/^-\s*/,'').trim(), quantity: parseFloat(singleMatch[2]), price, total })
      }
      i++; continue
    }
    if (/^-\s+\w/.test(line) && i+1 < lines.length) {
      const nextLine = lines[i+1] || ''
      const multiQtyMatch = nextLine.match(/^(\d+)\s+(?:buah|botol|ltr|unit)\s*x\s*([\d.,]+)\s+([\d.,]+)$/i)
      if (multiQtyMatch) {
        const price = parseAmount(multiQtyMatch[2])
        const total = parseAmount(multiQtyMatch[3])
        if (price > 0 && total > 0) {
          items.push({ description: line.replace(/^-\s*/,'').trim(), quantity: parseFloat(multiQtyMatch[1]), price, total })
        }
        i += 2; continue
      }
    }
    i++
  }

  let totalAmount = 0
  const jumlahMatch = text.match(/JUMLAH\s+([\d.,]+)/i)
  if (jumlahMatch) totalAmount = parseAmount(jumlahMatch[1])
  if (totalAmount === 0 && items.length > 0) totalAmount = items.reduce((s, it) => s + (it.total || 0), 0)

  return { type, docNumber, vendorName, totalAmount, date: docDate, kodeRek, subKegiatan, items }
}

// --- Run ---
const pdfPath = 'D:\\Code\\SistemLaporanBarang\\Dokumen Laporan Barang.pdf';
const buffer = fs.readFileSync(pdfPath);
const pdfParser = new PDFParser(null, 1);

pdfParser.on("pdfParser_dataError", (err) => console.error("PDF Error:", err.parserError));
pdfParser.on("pdfParser_dataReady", () => {
  const rawText = pdfParser.getRawTextContent();
  // Split by page and test each
  const pages = rawText.split('----------------Page (');
  pages.forEach((page, idx) => {
    if (!page.trim()) return
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  PAGE ${idx}`);
    console.log('='.repeat(60));
    const result = extractDataFromText(page);
    console.log(JSON.stringify(result, null, 2));
  });
});

pdfParser.parseBuffer(buffer);
