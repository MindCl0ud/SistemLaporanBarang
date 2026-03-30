/**
 * documentParser.ts
 * Manages the native browser AI logic for parsing documents using Tesseract.js
 *
 * Extraction logic is tuned for BAPPERIDA Sumba Barat financial documents:
 * - Kwitansi (receipts)
 * - Nota Pesanan (purchase orders)
 * - Berita Acara Penerimaan Barang (goods receipt records)
 *
 * Key observations from actual PDF OCR output:
 * - "Waikabubak" is often split as "W aikabubak" or "Waika bubak"
 * - Numbers like "1.195.000" are OCR'd as "1. 19 5.000" or "1.19 5.000"
 * - Item lines have lots of spaces: "- stuff sarung jog   2   buah x   200.000   400.000"
 * - Berita Acara items may span two lines (name, then qty+price+total)
 * - JUMLAH is on its own line and total on next line in some pages
 */

import Tesseract from 'tesseract.js'

// --- OPTIMALISASI PERFORMA: Singleton Worker ---
// Mencegah memory leak akibat pembuatan worker baru setiap kali memproses dokumen
let sharedWorker: Tesseract.Worker | null = null;

async function getWorker() {
  if (!sharedWorker) {
    sharedWorker = await Tesseract.createWorker('ind', 1);
    await sharedWorker.setParameters({
      tessedit_pageseg_mode: '6' as any,  // PSM 6: uniform block of text
      tessedit_ocr_engine_mode: '1' as any, // OEM 1: LSTM
    });
  }
  return sharedWorker;
}

/**
 * Preprocess an image URL/File for best Tesseract OCR quality:
 * 1. Draw on canvas at 2.0× scale (more pixels = better OCR)
 * 2. Convert to grayscale
 * 3. Auto-contrast stretch (normalize darkest/lightest pixel to 0-255)
 * 4. Adaptive threshold → pure black & white
 * Returns a new base64 PNG data URL.
 */
async function preprocessImage(src: string | File): Promise<{ dataUrl: string; skewAngle: number }> {
  let dataUrl: string
  if (src instanceof File) {
    dataUrl = await new Promise<string>((res, rej) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result as string)
      reader.onerror = rej
      reader.readAsDataURL(src)
    })
  } else {
    dataUrl = src
  }

  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const SCALE = 2.0 
      const w = img.width * SCALE
      const h = img.height * SCALE

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0, w, h)

      const imageData = ctx.getImageData(0, 0, w, h)
      const d = imageData.data

      // Step 1: Grayscale & Skew Detection
      const gray = new Uint8Array(w * h)
      for (let i = 0; i < w * h; i++) {
        gray[i] = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2])
      }

      // SIMPLE SKEW DETECTION (Sample 100 random lines and check for dominant angle)
      let skewAngle = 0
      // Note: Real Hough transform is heavy, we use a lightweight OSD check if Tesseract provides it,
      // but for preprocessing we do a basic horizontal line alignment check if needed.
      // For now, we focus on the thresholding and table structure.

      // Step 2: Auto-contrast (stretch histogram to 0-255)
      let minG = 255, maxG = 0
      for (let v of gray) { if (v < minG) minG = v; if (v > maxG) maxG = v }
      const range = maxG - minG || 1
      const stretched = gray.map(v => Math.round(((v - minG) / range) * 255))

      // Step 3: Otsu threshold (adaptive black & white)
      const hist = new Array(256).fill(0)
      for (const v of stretched) hist[v]++
      const total = stretched.length
      let sumB = 0, wB = 0, sum = 0
      for (let i = 0; i < 256; i++) sum += i * hist[i]
      let maxVar = 0, threshold = 128
      for (let t = 0; t < 256; t++) {
        wB += hist[t]; if (!wB) continue
        const wF = total - wB; if (!wF) break
        sumB += t * hist[t]
        const mB = sumB / wB
        const mF = (sum - sumB) / wF
        const bv = wB * wF * (mB - mF) ** 2
        if (bv > maxVar) { maxVar = bv; threshold = t }
      }

      for (let i = 0; i < w * h; i++) {
        const val = stretched[i] >= threshold ? 255 : 0
        d[i * 4] = val
        d[i * 4 + 1] = val
        d[i * 4 + 2] = val
        d[i * 4 + 3] = 255
      }

      ctx.putImageData(imageData, 0, 0)
      resolve({ dataUrl: canvas.toDataURL('image/png'), skewAngle })
    }
    img.src = dataUrl
  })
}

export async function parseDocumentImage(fileUrl: string | File, onProgress?: (msg: string) => void) {
  try {
    if (onProgress) onProgress('Meningkatkan Kualitas Gambar...')
    
    const preRes = typeof window !== 'undefined'
      ? await preprocessImage(fileUrl)
      : { dataUrl: fileUrl as string, skewAngle: 0 }

    if (onProgress) onProgress('Memulai OCR (Membaca Teks)...')
    
    const worker = await getWorker()
    const ret = await worker.recognize(preRes.dataUrl)
    const text = ret.data.text

    if (onProgress) onProgress('Menyusun Data...')
    const parsedData = extractDataFromText(text)
    if (onProgress) onProgress('Selesai')
    return { text, data: parsedData }
  } catch (error: any) {
    console.error('OCR Error:', error)
    throw new Error('Gagal membaca dokumen: ' + (error?.message || error))
  }
}

/**
 * Remove internal spaces within numbers: "1. 19 5.000" => "1.195.000"
 * Also collapses multiple spaces and normalizes "W aikabubak" => "Waikabubak"
 */
function normalizeText(text: string): string {
  // 0. Strip table border characters (OCR reads BA table lines as | or +)
  // PENINGKATAN: Menambahkan underscore (_)
  let t = text.replace(/[|+#_]/g, ' ')

  // Fix OCR artifacts in codes, numbers, and common words:
  // 1. Bridges spaces between digits and dots/slashes
  t = t.replace(/([A-Z0-9])\s*\.\s*([A-Z0-9])/gi, '$1.$2')
  t = t.replace(/([A-Z0-9])\s*\/\s*([A-Z0-9])/gi, '$1/$2')
  
  // PENINGKATAN: Menggabungkan spasi liar pada angka ribuan tanpa titik
  t = t.replace(/(\d)\s+(?=\d{3})/g, '$1')
  
  // 2. Bridges spaces in common Indonesian vendor fragments/words/ITEMS
  // PENINGKATAN: Menambahkan kata kunci BAPPERIDA agar lebih presisi
  const fragments = [
    'Sum ber', 'Ba rat', 'Ba pperida', 'Bha yangkara', 'Week arou',
    'kan ebo', 'stella gan tung', 'sar ung', 'gar dan', 'coo lant', 'coo lat',
    'Waikabubak', 'BAPPERIDA', 'Kwitansi', 'Nomor', 'Penerimaan', 'Barang'
  ]
  fragments.forEach(frag => {
    const regex = new RegExp(frag.split('').join('\\s*'), 'gi')
    t = t.replace(regex, frag.replace(/\s+/g, ''))
  })

  // 3. Specific item fixes
  t = t.replace(/\bcoolat\b/gi, 'coolant')
  t = t.replace(/\bcoolant\b/gi, 'coolant')

  // 4. Normalize 3+ spaces to double space
  t = t.replace(/[ \t]{3,}/g, '  ')
  return t
}

/** Parse a formatted currency string to integer, handling OCR artifacts */
function parseAmount(str: string): number {
  if (!str) return 0
  // Step 1: collapse spaces around dots/slashes
  let s = str.replace(/(\d)\s*\.\s*(\d)/g, '$1.$2')
  // Step 2: remove everything except digits
  const cleaned = s.replace(/[^\d]/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

/** Parse Indonesian date string "22 Januari 2026" to Date */
function parseIndonesianDate(dateStr: string): Date | null {
  const monthMap: Record<string, number> = {
    'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
    'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'agu': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'des': 11
  }
  const m = dateStr.match(/(\d{1,2})\s+([a-z]+(?:\s+[a-z]+)?)\s+(\d{4})/i)
  if (m) {
    const day = parseInt(m[1])
    const monthRaw = m[2].toLowerCase().replace(/\s+/g, '').substring(0, 3)
    const year = parseInt(m[3])
    const monthNum = monthMap[monthRaw] ?? monthMap[m[2].toLowerCase().split(' ')[0]]
    if (monthNum !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, monthNum, day)
    }
  }
  return null
}

export function extractDataFromText(rawText: string) {
  const text = normalizeText(rawText)
  const lowerText = text.toLowerCase()
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 1)

  // ──────────────────────────────────────────────────────────
  // 1. Document Type
  // ──────────────────────────────────────────────────────────
  let type = 'Nota Pesanan'
  const isBA = lowerText.includes('berita acara') || /ba\s*p-br\s*g/i.test(text) || /penerimaan\s*barang/i.test(text)
  const isKwitansi = lowerText.includes('kwitansi') || lowerText.includes('kuitansi') || /pembayaran\s*sejumlah/i.test(text) || lowerText.includes('bukti pembayaran')
  const isNota = lowerText.includes('nota pesanan') || /np\.br\s*g/i.test(text) || /pesanan\s*barang/i.test(text)

  if (isKwitansi) {
    type = 'Kwitansi'
  } else if (isBA) {
    type = 'Berita Acara Penerimaan Barang'
  } else if (isNota) {
    type = 'Nota Pesanan'
  } else if (lowerText.includes('faktur') || lowerText.includes('invoice')) {
    type = 'Faktur'
  }

  // ──────────────────────────────────────────────────────────
  // 2. Document Number
  //    Look for the pattern: [CODE] / [NUMBER] / [CODE] / [YEAR]
  //    e.g. "BRIDA.011.7/87/BAP-BRG/2026"
  // ──────────────────────────────────────────────────────────
  let docNumber = ''
  
  // Strategy: search for common number prefixes, then look for a pattern with slashes and year
  const docNumPatterns = [
    // Pattern 1: Starts with "Nomor :" or similar. Allow spaces in content.
    /(?:N\s*o\s*m\s*[oe]\s*r|N\s*o\s*\.?|N\s*u\s*m\s*b\s*e\s*r)\s*[:.]?\s*([A-Z0-9./\-\s\t]{5,100})/i,
    // Pattern 2: Raw number pattern with slashes and 202x/203x year
    /([A-Z0-9.\-\s\t]{3,}\s*\/\s*\d{1,4}\s*\/\s*[A-Z0-9.\-\s\t]{3,}\s*\/\s*(?:202[0-9]|203[0-9]))/i
  ]

  for (const pat of docNumPatterns) {
    const match = text.match(pat)
    if (match) {
      let val = match[1] || match[0]
      // Clean up: stop at keywords or boundaries (including newline)
      const cleaned = val.split(/\r?\n|\b(?:Dari|Pada|Kami|Dua|Waikabubak|Kamis|Tanggal|Berdasarkan|Nama|Jabatan)\b/i)[0]
      docNumber = cleaned
        .replace(/\s+/g, '')
        .replace(/[.;,:]+$/, '')
        .trim()
      
      // If we found a good looking number (with slashes), stop
      if (docNumber.includes('/') && docNumber.length > 8) break
    }
  }

  // Final cleanup if we got a false positive like "VASIDAERAH"
  if (docNumber.toUpperCase() === 'VASIDAERAH' || docNumber.toUpperCase() === 'BAPPERIDA') {
    docNumber = ''
  }

  // ──────────────────────────────────────────────────────────
  // 3. Date
  //    Prioritize "Waikabubak, [date]" — look for LAST occurrence (signature)
  //    e.g. "W aikabubak, 21 Januari 2026" or "Waikab ubak, 22 Jan uari  2026"
  // ──────────────────────────────────────────────────────────
  let docDate: Date | null = null

  // Find all "Waikabubak" date occurrences (handles OCR splits)
  const waikabubakPattern = /[Ww]\s*aika\s*b\s*ubak\s*,?\s*(\d{1,2}\s+[a-z]+(?:\s+[a-z]+)?\s+\d{4})/gi
  const waiMatches = [...text.matchAll(waikabubakPattern)]
  if (waiMatches.length > 0) {
    // Use LAST occurrence (typically the signature date)
    const lastDate = waiMatches[waiMatches.length - 1][1]
    docDate = parseIndonesianDate(lastDate)
  }

  // Fallback: "Tanggal X Bulan Y Tahun Z" pattern in Berita Acara
  if (!docDate) {
    const writtenDateMatch = text.match(/\d{1,2}\s+[Jj]anuari\s+\d{4}|\d{1,2}\s+[Ff]ebruari\s+\d{4}|\d{1,2}\s+[Mm]aret\s+\d{4}/)
    if (writtenDateMatch) {
      docDate = parseIndonesianDate(writtenDateMatch[0])
    }
  }

  // ──────────────────────────────────────────────────────────
  // 4. Kode Rekening & Sub Kegiatan
  //    Base: 5.01.01.2.09.0002  (suffix = sub-kegiatan)
  //    OCR reality from kwitansi: "5.0 1 .Ol. 2.09.0002.5.1.02.03.02.0035"
  //    Strategy: process line-by-line, strip spaces, normalize O→0, then match
  // ──────────────────────────────────────────────────────────
  let kodeRek = ''
  let subKegiatan = ''

  const rawLines = rawText.split(/\r?\n/)
  for (const rawLine of rawLines) {
    // Strip ALL spaces from the line
    let stripped = rawLine.replace(/\s+/g, '')
    // Normalize OCR letter-for-digit swaps in code context
    stripped = stripped
      .replace(/(\d)O(\d)/g, '$10$2')   // digit-O-digit → digit-0-digit
      .replace(/(\d)O\./g, '$10.')       // digit-O-dot   → digit-0-dot
      .replace(/\.O(\d)/g, '.0$1')       // dot-O-digit   → dot-0-digit
      .replace(/\.l(\d)/g, '.1$1')       // dot-l-digit   → dot-1-digit
      .replace(/(\d)l\./g, '$11.')       // digit-l-dot   → digit-1-dot
      .replace(/\.Ol\./g, '.01.')        // ".Ol." → ".01."

    // Match base code 5.01.01.2.09.0002 and capture the suffix
    // The base code itself might have OCR errors (dots/spaces)
    // We use a more flexible regex that allows for optional dots/spaces between major digit groups
    const baseCodePattern = /5[\s.]?0[\s.]?1[\s.]?0[\s.]?1[\s.]?2[\s.]?0[\s.]?9[\s.]?0[\s.]?0[\s.]?0[\s.]?2([\d.]*)/i
    const m = stripped.match(baseCodePattern)
    if (m) {
      kodeRek = '5.01.01.2.09.0002'
      subKegiatan = (m[1] || '').replace(/^\./, '').replace(/\.$/, '')
      break
    }
  }

  // ──────────────────────────────────────────────────────────
  // 5. Vendor / Penyedia
  // ──────────────────────────────────────────────────────────
  let vendorName = 'Tidak Diketahui'

  // Strategy: Find "PIHAK KEDUA" and look at lines around it (-6 to +6)
  const pkIndex = lines.findIndex(l => l.toUpperCase().includes('PIHAK KEDUA'))
  if (pkIndex !== -1) {
    const start = Math.max(0, pkIndex - 6)
    const end = Math.min(lines.length, pkIndex + 6)
    
    // Look for Jabatan (prioritized) then Nama
    let foundJabatan = ''
    let foundNama = ''
    
    for (let i = start; i < end; i++) {
      const line = lines[i]
      if (line.includes(':')) {
        const parts = line.split(':')
        const key = parts[0].toLowerCase()
        const val = parts[1].trim()
        
        if (key.includes('jabatan') && val.length > 3) foundJabatan = val
        if (key.includes('nama') && val.length > 3 && !/LEKO|AGUSTINUS/i.test(val)) foundNama = val
      }
    }
    vendorName = foundJabatan || foundNama || vendorName
  }

  // Fallback: look for "Terima Dari" or common patterns
  if (vendorName === 'Tidak Diketahui') {
    const vendorPatterns = [
      /(?:Pengusaha\s+)?CV\.\s+([A-Z][A-Za-z\s]+?)(?:\r?\n|Alam|Jabat|;|,)/,
      /(?:Pengusaha\s+)?Toko\s+([A-Za-z\s]+?)(?:\r?\n|Alam|Jabat|;|,)/,
      /(?:UD\.|PT\.)\s+([A-Z][A-Za-z\s]+?)(?:\r?\n|Alam|Jabat|;|,)/,
      /Terima Dari\s*[:]\s*([A-Z\s.,]{3,50})/i,
    ]
    for (const pat of vendorPatterns) {
      const match = text.match(pat)
      if (match) {
        vendorName = match[1]?.trim() || match[0].trim()
        break
      }
    }
  }

  // Final Cleanup for Vendor Name: REMOVE ALL PREFIXES & EXCLUDE PAYERS
  if (vendorName !== 'Tidak Diketahui') {
    // If it looks like a document number or internal agency, reset it
    const isInternalAgency = /BAPPERIDA|BRIDA|DAERAH|KABUPATEN|SUMBA|PENGGUNA|ANGGARAN|PROSE/i.test(vendorName)
    const isDocNumber = /[\d./]{8,}/.test(vendorName) && vendorName.includes('/')

    if (isInternalAgency || isDocNumber) {
      vendorName = 'Tidak Diketahui'
    } else {
      vendorName = vendorName
        .replace(/\b(?:Pengusaha|Toko|Penyedia|Nama|Pihak\s+Kedua|Jabatan)\b\s*[:.-]?\s*/gi, '')
        .replace(/\b(?:CV\.?|PT\.?|UD\.?)\b\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
    }
  }

  // ──────────────────────────────────────────────────────────
  // 3.5. Payment Description (Uraian / Untuk Pembayaran)
  //      Look for text between "Untuk Pembayaran :" and "dengan rincian :"
  // ──────────────────────────────────────────────────────────
  let paymentDescription = ''
  const paymentMatch = rawText.match(/(?:Untuk\s+Pembayaran|Uraian)\s*[:]\s*([\s\S]+?)(?=(?:dengan\s+rincian|[-]\s+|Jurmlah|$))/i)
  if (paymentMatch) {
    paymentDescription = paymentMatch[1].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
  }

  // ──────────────────────────────────────────────────────────
  // 6. Line Items
  // ──────────────────────────────────────────────────────────
  const items: any[] = []
  const noisePattern = /\b(?:JUMLAH|Terbilang|NIP|Nama|Jabatan|Alamat|Waikabubak|BAPPERIDA|BRIDA|DAERAH|Tanda\s+Tangan|Pihak|Pertama|Kedua|Nomor|Terima|Uang|Jalan|Jl\.)\b/i

  const toNum = (s: string) => {
    const v = parseFloat(s.replace(/\./g, '').replace(',', '.'))
    return isNaN(v) ? 0 : v
  }

  const isUnitToken = (s: string) => {
    const clean = s.replace(/^[^a-zA-Z]+/, '')
    return /^(?:buah|botol|pcs|unit|ltr?|rim|set|bu[a-z]+|kg|gram|lembar|dos|dus)[a-z]*[sx]?$/i.test(clean)
  }

  function tryParseItem(mainLine: string, nextLine?: string): any | null {
    if (noisePattern.test(mainLine)) return null
    
    // NEW STRATEGY: Look for the 'x' as a strict pivot
    // Format: "- [desc] [qty] [unit] x [price] [total]"
    if (mainLine.includes(' x ')) {
      const parts = mainLine.split(' x ')
      const leftTokens = parts[0].split(/\s+/).filter(Boolean)
      const rightTokens = parts[1].split(/\s+/).filter(Boolean)

      if (leftTokens.length >= 3 && rightTokens.length >= 1) {
        let unitIdx = leftTokens.length - 1
        while (unitIdx > 0 && !isUnitToken(leftTokens[unitIdx])) unitIdx--
        
        if (unitIdx > 0) {
          const qty = toNum(leftTokens[unitIdx - 1])
          const unit = leftTokens[unitIdx]
          const desc = leftTokens.slice(0, unitIdx - 1).join(' ').replace(/^[-Il1\s]+/, '').trim()
          
          // Separate Price and Total from the right side
          // Even if they are merged like "75.000150.000", if we have qty, we can derive them.
          let price = 0, total = 0
          if (rightTokens.length >= 2) {
            price = toNum(rightTokens[0])
            total = toNum(rightTokens[1])
          } else {
            // Merged case: "75.000150.000"
            const raw = rightTokens[0].replace(/[^\d]/g, '')
            if (qty > 0 && raw.length > 6) {
              // Heuristic: price is the first significant part
              const estimatedPriceStr = raw.substring(0, Math.floor(raw.length / 2))
              price = parseInt(estimatedPriceStr)
              total = price * qty
            } else {
              total = toNum(rightTokens[0])
              price = total / (qty || 1)
            }
          }

          if (desc.length > 2 && total > 0) {
            return { description: desc, quantity: qty || 1, unit, price, total }
          }
        }
      }
    }

    // Fallback to old token strategy for non-x lines (like Berita Acara tables)
    const combined = nextLine ? `${mainLine} ${nextLine}` : mainLine
    const tokens = combined.replace(/^(?:\d+\s*)?[-.\s]{0,3}/, '').split(/\s+/).filter(Boolean)
    if (tokens.length >= 3) {
      let rIdx = tokens.length - 1
      let total = 0, price = 0
      if (/^\d+[.\s\d]*$/.test(tokens[rIdx])) { total = toNum(tokens[rIdx]); rIdx-- }
      if (rIdx >= 0 && /^\d+[.\s\d]*$/.test(tokens[rIdx])) { price = toNum(tokens[rIdx]); rIdx-- }
      
      let unitIdx = -1
      for (let k = rIdx; k >= 1; k--) {
        if (isUnitToken(tokens[k])) { unitIdx = k; break }
      }
      
      if (unitIdx > 0 && total > 0) {
        const desc = tokens.slice(0, unitIdx - 1).join(' ').replace(/^[-Il1\s]+/, '').trim()
        const qty = toNum(tokens[unitIdx - 1])
        if (desc.length > 2) {
          return { description: desc, quantity: qty || 1, price: price || (total/(qty||1)), total }
        }
      }
    }
    return null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (noisePattern.test(line) || line.length < 5) continue
    const parsed = tryParseItem(line)
    if (parsed) { items.push(parsed); continue }
    
    // Look ahead one line for Berita Acara formats
    if (i + 1 < lines.length) {
      const parsed2 = tryParseItem(line, lines[i+1])
      if (parsed2) { items.push(parsed2); i++; continue }
    }
  }

  // ── STRATEGY 3: Post-processing description cleaner ──────
  // Safety net for Kwitansi/Nota items only.
  // BA items are already correctly parsed by the 4-line collector — skip them.
  if (type !== 'Berita Acara Penerimaan Barang') {
    const TRAILING_QTY_UNIT = /\s+(\d{1,2})\s+(?:buah|botol|pcs|unit|ltr?|rim|set|[a-z]{2,})\s*x?\s*$/i
    for (const item of items) {
      const m = item.description.match(TRAILING_QTY_UNIT)
      if (m) {
        item.description = item.description.replace(TRAILING_QTY_UNIT, '').trim()
        if (item.quantity === 1) item.quantity = parseInt(m[1])
      }
      item.description = item.description.replace(/^[-\s|]+/, '').replace(/[-\s|]+$/, '').trim()
    }
  } else {
    // For BA: just strip noise chars from description edges
    for (const item of items) {
      item.description = item.description.replace(/^[-\s|]+/, '').replace(/[-\s|]+$/, '').trim()
    }
  }

  // ──────────────────────────────────────────────────────────
  // 7. Total Amount  
  //    "JUMLAH" is an all-caps row with total. "Jumlah" (mixed case) is a column header — skip it.
  //    Total may appear:
  //      A) Same line: "JUMLAH                 1. 19 5.000" (Nota Pesanan)
  //      B) Next line: "JUMLAH\r\n1.19 5.000"              (Berita Acara)
  // ──────────────────────────────────────────────────────────
  let totalAmount = 0

  // Find JUMLAH lines (must be all uppercase to exclude column headers like "Jumlah")
  for (let j = 0; j < lines.length; j++) {
    const jumlahLine = lines[j]
    if (!/^JUMLAH\b/.test(jumlahLine)) continue  // case-sensitive: skip "Jumlah" headers

    // Case A: amount on same line after whitespace "JUMLAH   1. 19 5.000"
    const sameLineMatch = jumlahLine.match(/^JUMLAH\s+([\d.,\s]+)$/i)
    if (sameLineMatch && sameLineMatch[1].trim()) {
      const amt = parseAmount(sameLineMatch[1])
      if (amt > 1000) { totalAmount = amt; break }
    }

    // Case B: amount on next line
    const nextLine = (lines[j + 1] || '').trim()
    if (/^[\d.,\s]+$/.test(nextLine) && nextLine.replace(/\D/g, '').length > 3) {
      const amt = parseAmount(nextLine)
      if (amt > 1000) { totalAmount = amt; break }
    }
  }

  // Fallback: sum items
  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((s, it) => s + (it.total || 0), 0)
  }

  return {
    type,
    docNumber,
    vendorName,
    totalAmount,
    date: docDate,
    kodeRek,
    subKegiatan,
    paymentDescription,
    items
  }
}
