// Final verification test for the new extraction logic
const PDFParser = require('pdf2json');
const fs = require('fs');

function normalizeText(text) {
  let t = text.replace(/(\d)\s+\.\s*(\d)/g, '$1.$2')
  t = t.replace(/(\d)\s*\.\s+(\d)/g, '$1.$2')
  t = t.replace(/(\d)\s{1,2}(\d{3}(?:\.\d{3})*)(?!\d)/g, '$1$2')
  t = t.replace(/[ \t]{2,}/g, ' ')
  return t
}

function parseAmount(str) {
  if (!str) return 0
  const cleaned = str.replace(/[^\d]/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

function parseIndonesianDate(dateStr) {
  const monthMap = {
    'jan': 0,'feb': 1,'mar': 2,'apr': 3,'mei': 4,'jun': 5,
    'jul': 6,'agu': 7,'sep': 8,'okt': 9,'nov': 10,'des': 11
  }
  const m = dateStr.match(/(\d{1,2})\s+([a-z]+(?:\s+[a-z]+)?)\s+(\d{4})/i)
  if (m) {
    const day = parseInt(m[1])
    const monthRaw = m[2].toLowerCase().replace(/\s+/g, '').substring(0, 3)
    const year = parseInt(m[3])
    const monthNum = monthMap[monthRaw]
    if (monthNum !== undefined) return new Date(year, monthNum, day).toLocaleDateString('id-ID')
  }
  return null
}

function extractDataFromText(rawText) {
  const text = normalizeText(rawText)
  const lowerText = text.toLowerCase()
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 1)

  let type = 'Nota Pesanan'
  if (lowerText.includes('berita acara penerimaan') || /ba\s*p-br\s*g/i.test(text)) type = 'Berita Acara Penerimaan Barang'
  else if (lowerText.includes('kwitansi') || lowerText.includes('kuitansi')) type = 'Kwitansi'
  else if (lowerText.includes('nota pesanan')) type = 'Nota Pesanan'

  let docNumber = ''
  const docNumMatch = text.match(/(?:Nomor|Nomo\s*r)\s*[:.]?\s*([A-Z0-9.\s/\-]+?)(?:\r?\n|Dari|Pada|Kami|$)/i)
  if (docNumMatch) {
    docNumber = docNumMatch[1].replace(/\s*\/\s*/g, '/').replace(/\s*\.\s*/g, '.').replace(/\s+/g, '').trim()
  }

  let docDate = null
  const waiMatches = [...text.matchAll(/[Ww]\s*aika\s*b\s*ubak\s*,?\s*(\d{1,2}\s+[a-z]+(?:\s+[a-z]+)?\s+\d{4})/gi)]
  if (waiMatches.length > 0) docDate = parseIndonesianDate(waiMatches[waiMatches.length - 1][1])

  let kodeRek = ''
  let subKegiatan = ''
  const kodeMatch = text.match(/(5\s*\.\s*01\s*\.\s*0[1lI]\s*\.\s*2\s*\.\s*09\s*\.\s*0002)((?:\s*[\.\d\s]+)?)/i)
  if (kodeMatch) {
    kodeRek = '5.01.01.2.09.0002'
    if (kodeMatch[2]) subKegiatan = kodeMatch[2].replace(/\s+/g, '').replace(/^\./, '').trim()
  }

  let vendorName = 'Tidak Diketahui'
  const vendorPatterns = [
    /(?:Pengusaha\s+)?CV\.\s+([A-Z][A-Za-z\s]+?)(?:\r?\n|Alam|Jabat|;|,)/,
    /(?:Pengusaha\s+)?Toko\s+([A-Za-z\s]+?)(?:\r?\n|Alam|Jabat|;|,)/
  ]
  for (const pat of vendorPatterns) {
    const m = text.match(pat)
    if (m) { vendorName = m[0].replace(/\r?\n.*/s, '').replace(/[;,]$/, '').trim(); break }
  }

  const items = []
  const unitPat = '(?:buah|botol|ltr|liter|rim|dos|dus|set|pcs|unit|lembar|kg|gram)'
  const itemPatA = new RegExp('^-\\s+(.+?)\\s+(\\d+)\\s+' + unitPat + '\\s*x?\\s+([\\d.,]+)\\s+([\\d.,]+)$', 'i')
  const itemPatBqty = new RegExp('^[Il1]?\\s*(\\d+)\\s+' + unitPat + '\\s*x?\\s+([\\d.,]+)\\s+([\\d.,]+)$', 'i')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const matchA = line.match(itemPatA)
    if (matchA) {
      const price = parseAmount(matchA[3]), total = parseAmount(matchA[4])
      if (price > 0 && total > 0) items.push({ description: matchA[1].replace(/^-?\s*/, '').trim(), quantity: parseFloat(matchA[2]), price, total })
      i++; continue
    }
    if (/^-\s+\w/.test(line) && i + 1 < lines.length) {
      const matchB = lines[i+1].match(itemPatBqty)
      if (matchB) {
        const price = parseAmount(matchB[2]), total = parseAmount(matchB[3])
        if (price > 0 && total > 0) items.push({ description: line.replace(/^-\s*/, '').replace(/^\d+\s+/, '').trim(), quantity: parseFloat(matchB[1]), price, total })
        i += 2; continue
      }
    }
    i++
  }

  let totalAmount = 0
  const jumlahInline = text.match(/JUMLAH\s+([\d.,]+)/i)
  if (jumlahInline) totalAmount = parseAmount(jumlahInline[1])
  else {
    for (let j = 0; j < lines.length; j++) {
      if (/^JUMLAH$/i.test(lines[j])) {
        const next = lines[j+1] || ''
        if (/^[\d.,]+$/.test(next)) { totalAmount = parseAmount(next); break }
      }
    }
  }
  if (totalAmount === 0 && items.length > 0) totalAmount = items.reduce((s, it) => s + (it.total || 0), 0)

  return { type, docNumber, vendorName, totalAmount, date: docDate, kodeRek, subKegiatan, items }
}

// Run
const buffer = fs.readFileSync('D:\\Code\\SistemLaporanBarang\\Dokumen Laporan Barang.pdf');
const pdfParser = new PDFParser(null, 1);
pdfParser.on("pdfParser_dataError", (err) => console.error(err.parserError));
pdfParser.on("pdfParser_dataReady", () => {
  const rawText = pdfParser.getRawTextContent()
  const pages = rawText.split('----------------Page (')
  pages.forEach((page, idx) => {
    if (!page.trim() || idx === 0) return
    const result = extractDataFromText(page)
    console.log(`\n=== PAGE ${idx} ===`)
    console.log(JSON.stringify(result, null, 2))
  })
});
pdfParser.parseBuffer(buffer);
