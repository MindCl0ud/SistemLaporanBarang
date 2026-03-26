/**
 * documentParser.ts
 * Manages the native browser AI logic for parsing documents using Tesseract.js
 *
 * Extraction logic is tuned for BAPPERIDA Sumba Barat financial documents:
 *   - Kwitansi (receipts)
 *   - Nota Pesanan (purchase orders)
 *   - Berita Acara Penerimaan Barang (goods receipt records)
 *
 * Key observations from actual PDF OCR output:
 *  - "Waikabubak" is often split as "W aikabubak" or "Waika bubak"
 *  - Numbers like "1.195.000" are OCR'd as "1. 19 5.000" or "1.19 5.000"
 *  - Item lines have lots of spaces: "- stuff sarung jog   2   buah x   200.000   400.000"
 *  - Berita Acara items may span two lines (name, then qty+price+total)
 *  - JUMLAH is on its own line and total on next line in some pages
 */

import Tesseract from 'tesseract.js'

/**
 * Preprocess an image URL/File for best Tesseract OCR quality:
 *  1. Draw on canvas at 1.5× scale (more pixels = better OCR)
 *  2. Convert to grayscale
 *  3. Auto-contrast stretch (normalize darkest/lightest pixel to 0-255)
 *  4. Adaptive threshold → pure black & white
 * Returns a new base64 PNG data URL.
 */
async function preprocessImage(src: string | File): Promise<string> {
  // Resolve File → data URL
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

  return new Promise<string>((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const SCALE = 1.5
      const w = img.width * SCALE
      const h = img.height * SCALE

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)

      const imageData = ctx.getImageData(0, 0, w, h)
      const d = imageData.data

      // Step 1: Grayscale (ITU-R BT.601)
      const gray = new Uint8Array(w * h)
      for (let i = 0; i < w * h; i++) {
        gray[i] = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2])
      }

      // Step 2: Auto-contrast (stretch histogram to 0-255)
      let minG = 255, maxG = 0
      for (let v of gray) { if (v < minG) minG = v; if (v > maxG) maxG = v }
      const range = maxG - minG || 1
      const stretched = gray.map(v => Math.round(((v - minG) / range) * 255))

      // Step 3: Otsu threshold (adaptive black & white)
      // Compute histogram
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

      // Apply threshold
      for (let i = 0; i < w * h; i++) {
        const val = stretched[i] >= threshold ? 255 : 0
        d[i * 4] = val
        d[i * 4 + 1] = val
        d[i * 4 + 2] = val
        d[i * 4 + 3] = 255
      }

      ctx.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.src = dataUrl
  })
}

export async function parseDocumentImage(fileUrl: string | File, onProgress?: (msg: string) => void) {
  try {
    if (onProgress) onProgress('Meningkatkan Kualitas Gambar...')
    
    // Preprocess image for much better OCR accuracy
    const enhanced = typeof window !== 'undefined'
      ? await preprocessImage(fileUrl)
      : fileUrl

    if (onProgress) onProgress('Memulai OCR (Membaca Teks)...')
    
    const worker = await Tesseract.createWorker('ind', 1, {
      // Use LSTM engine (OEM 1) + assume a single uniform block (PSM 6)
    })
    await worker.setParameters({
      tessedit_pageseg_mode: '6' as any,  // PSM 6: uniform block of text
      tessedit_ocr_engine_mode: '1' as any, // OEM 1: LSTM
    })
    const ret = await worker.recognize(enhanced)
    const text = ret.data.text
    await worker.terminate()

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
  // Fix OCR artifacts in codes, numbers, and common words:
  // 1. Bridges spaces between digits and dots/slashes
  let t = text.replace(/([A-Z0-9])\s*\.\s*([A-Z0-9])/gi, '$1.$2')
  t = t.replace(/([A-Z0-9])\s*\/\s*([A-Z0-9])/gi, '$1/$2')
  
  // 2. Bridges spaces in common Indonesian vendor fragments/words/ITEMS
  // e.g., "Sum ber" -> "Sumber", "kan ebo" -> "kanebo", "stella gantung g" -> "stella gantung"
  const fragments = [
    'Sum ber', 'Ba rat', 'Ba pperida', 'Bha yangkara', 'Week arou',
    'kan ebo', 'stella gan tung', 'sar ung', 'gar dan', 'coo lant', 'coo lat'
  ]
  fragments.forEach(frag => {
    const regex = new RegExp(frag.split('').join('\\s*'), 'gi')
    t = t.replace(regex, frag.replace(/\s+/g, ''))
  })

  // 3. Specific item fixes
  t = t.replace(/\bcoolat\b/gi, 'coolant')

  // 4. Normalize multiple spaces to single (but preserve double space for item separation)
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
    const m = stripped.match(/5\.0[1]\.0[1]\.2\.09\.0002([\d.]*)/i)
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
  // 6. Line Items  
  //    Two-strategy parser:
  //    A) Single-line:  "- item   2 buah   200.000   400.000"
  //    B) Two-line span: "- item\n  2 buah   200.000   400.000"  (common in Kwitansi scans)
  // ──────────────────────────────────────────────────────────
  const items: any[] = []
  
  // Exclusion patterns for non-item lines (doc noise)
  const noisePattern = /\b(?:JUMLAH|Terbilang|NIP|Nama|Jabatan|Alamat|Waikabubak|BAPPERIDA|BRIDA|DAERAH|Tanda\s+Tangan|Pihak|Pertama|Kedua|Nomor|Terima|Uang|Jalan|Jl\.)\b/i

  // Helper: parse one item line (or two-line span) using regex-first approach.
  // Handles both tight OCR ("2buahx") and spaced OCR ("2  buah x").
  function tryParseItem(mainLine: string, nextLine?: string): any | null {
    if (noisePattern.test(mainLine)) return null

    const combined = nextLine ? `${mainLine} ${nextLine}` : mainLine

    // Strip leading marker: "- ", "1. ", "1 - "
    const stripped = combined.replace(/^(?:\d+\s*)?[-.\s]{0,3}/, '').trim()
    if (!stripped || !/[a-zA-Z]{2,}/.test(stripped)) return null
    if (noisePattern.test(stripped)) return null

    // ── Indonesian number parser ──────────────────────────────
    const toNum = (s: string) => {
      const n = s.replace(/\./g, '').replace(',', '.')
      return parseFloat(n) || 0
    }
    // Regex to match a number like "200.000" or "1.195.000"
    const NUM = '(\\d{1,3}(?:\\.\\d{3})*(?:,\\d+)?|\\d+)'
    const UNIT = '(?:buah|botol|pcs|unit|ltr?|rim|set|bu[a-z]+|kg|gram|lembar|dos|dus)[a-z]*'

    // ── Primary: [desc] [qty] [unit][x?] [price] [total] ─────
    const r1 = new RegExp(
      `^(.+?)\\s+(\\d+)\\s*${UNIT}[sx]*\\s*${NUM}\\s+${NUM}\\s*$`, 'i'
    )
    let m = stripped.match(r1)
    if (m) {
      const desc  = m[1].trim()
      const qty   = parseInt(m[2])
      const price = toNum(m[3])
      const total = toNum(m[4])
      if (/[a-zA-Z]{2,}/.test(desc) && (price > 0 || total > 0)) {
        const finalQty   = (qty > 5 && Math.abs(price - total) < 0.01 * total) ? 1 : qty || 1
        const finalPrice = price || total
        const finalTotal = total || finalQty * finalPrice
        return { description: desc, quantity: finalQty, price: finalPrice, total: finalTotal }
      }
    }

    // ── Secondary: [desc] [qty] [price] [total] ──────────────
    const r2 = new RegExp(`^(.+?)\\s+(\\d+)\\s+${NUM}\\s+${NUM}\\s*$`)
    m = stripped.match(r2)
    if (m) {
      const desc  = m[1].trim()
      const qty   = parseInt(m[2])
      const price = toNum(m[3])
      const total = toNum(m[4])
      if (/[a-zA-Z]{2,}/.test(desc) && total > 0) {
        const finalQty   = (qty > 5 && Math.abs(price - total) < 0.01 * total) ? 1 : qty || 1
        return { description: desc, quantity: finalQty, price: price || total, total }
      }
    }

    // ── Tertiary: [desc] [price] [total] (qty=1 implied) ─────
    const r3 = new RegExp(`^(.+?)\\s+${NUM}\\s+${NUM}\\s*$`)
    m = stripped.match(r3)
    if (m) {
      const desc  = m[1].trim()
      const price = toNum(m[2])
      const total = toNum(m[3])
      if (/[a-zA-Z]{2,}/.test(desc) && total > 0 && price > 0 && !noisePattern.test(desc)) {
        return { description: desc, quantity: 1, price, total }
      }
    }

    // ── Fallback: segment-split for spaced layouts ────────────
    const segments = combined.split(/[ \t]{2,}/).filter(s => s.length > 0)
    if (segments.length >= 3) {
      const totalF = toNum(segments[segments.length - 1])
      const priceF = toNum(segments[segments.length - 2])
      const descF  = segments[0].replace(/^(?:\d+\s*)?[-.]*\s*/, '').trim()
      if (totalF > 0 && /[a-zA-Z]{2,}/.test(descF)) {
        return { description: descF, quantity: 1, price: priceF || totalF, total: totalF }
      }
    }

    return null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (noisePattern.test(line) || line.length < 5) continue

    // Strategy A: line starts with a bullet/number marker
    const hasMarker = /^[-Il1]/.test(line) || /^\d+\s*[-.]/.test(line)
    if (hasMarker) {
      const parsed = tryParseItem(line)
      if (parsed) {
        items.push(parsed)
        continue
      }
      // Strategy B: try joining with next line (description on this line, numbers on next)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1]
        if (!noisePattern.test(nextLine) && /\d{3,}/.test(nextLine)) {
          const parsed2 = tryParseItem(line, nextLine)
          if (parsed2) {
            items.push(parsed2)
            i++ // consume next line
            continue
          }
        }
      }
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
    items
  }
}
