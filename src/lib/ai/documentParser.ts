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

  // 5. WORD REPAIR DICTIONARY (User Request: Fix common OCR artifacts)
  const repairMap: Record<string, string> = {
    'tcrima': 'terima',
    'scjumlah': 'sejumlah',
    'pemeliharann': 'pemeliharaan',
    'sarungjog': 'sarung jok',
    'gardar': 'gardan',
    'angkuian': 'angkutan',
    'dara': 'darat',
    'coolat': 'coolant',
    'kancbo': 'kanebo',
    '1tr': 'ltr',
    'botolx': 'botol x',
    'buahx': 'buah x'
  }
  Object.entries(repairMap).forEach(([bad, good]) => {
    const reg = new RegExp(`\\b${bad}\\b`, 'gi')
    t = t.replace(reg, good)
  })

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
  let paymentFor = ''
  const paymentMatch = rawText.match(/(?:Untuk\s+Pembayaran|Uraian)\s*[:]\s*([\s\S]+?)(?=(?:dengan\s+rincian|[-]\s+|Jurmlah|$))/i)
  if (paymentMatch) {
    paymentFor = paymentMatch[1].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
  }

  // ──────────────────────────────────────────────────────────
  // 6. Line Items
  // ──────────────────────────────────────────────────────────
  const items: any[] = []
  const noisePattern = /\b(?:JUMLAH|Terbilang|NIP|Nama|Jabatan|Alamat|Waikabubak|BAPPERIDA|BRIDA|DAERAH|Tanda\s+Tangan|Pihak|Pertama|Kedua|Nomor|Terima|Uang|Jalan|Jl\.|202[4-6]|8045|5\.01\.|5\.1\.)\b/i

  const cleanNum = (str: string) => {
    // Replace dots that are used as thousand separators, then replace comma with dot for decimal
    // But in ID usually it's just dots for thousand separators.
    // Example: 100.000,00 -> 100000.00
    let cleaned = str.replace(/\.(?=\d{3})/g, '').replace(',', '.')
    if (cleaned.includes('.') && cleaned.split('.').pop()?.length === 3) {
      // It was probably a thousand separator dot, not a decimal.
      cleaned = cleaned.replace('.', '')
    }
    return parseFloat(cleaned)
  }

  const isUnitToken = (s: string) => {
    const clean = s.toLowerCase().replace(/[^a-z]/g, '')
    const commonUnits = ['buah', 'botol', 'pcs', 'unit', 'ltr', 'liter', 'rim', 'set', 'kg', 'gram', 'lembar', 'dos', 'dus', 'kotak', 'roll', 'm', 'meter', 'ls', 'koli', 'zak', 'btl']
    return commonUnits.some(u => clean === u || (clean.length > 2 && u.startsWith(clean)))
  }

  function tryParseItem(line: string): any | null {
    if (noisePattern.test(line) || line.length < 5) return null
    
    // Clean line and split into tokens
    const cleanLine = line.replace(/^[-\s|]+/, '').replace(/[-\s|]+$/, '')
    const tokens = cleanLine.split(/\s+/).filter(Boolean)
    
    // Find all number tokens and unit tokens
    const nums: { val: number, idx: number, raw: string }[] = []
    let unit: string | null = null
    let unitIdx = -1

    tokens.forEach((t, i) => {
      const val = parseAmount(t)
      if (val > 0 && /[\d.]/.test(t)) {
        nums.push({ val, idx: i, raw: t })
      } else if (isUnitToken(t)) {
        unit = t.toLowerCase().replace(/[^a-z]/g, '')
        unitIdx = i
      }
    })

    // SMART ARITHMETIC: Try to find Qty * Price = Total
    // We need at least 2 numbers (Total and something else)
    if (nums.length >= 2) {
      // Find the largest number (likely the total)
      const sortedNums = [...nums].sort((a, b) => b.val - a.val)
      const totalCand = sortedNums[0]
      
      // Look for a combination that multiplies to totalCand (allow 1% error for OCR rounding)
      for (let i = 1; i < sortedNums.length; i++) {
        for (let j = 1; j < sortedNums.length; j++) {
          if (i === j) continue
          const n1 = sortedNums[i].val
          const n2 = sortedNums[j].val
          const prod = n1 * n2
          const diff = Math.abs(prod - totalCand.val)
          
          if (diff <= totalCand.val * 0.01 || (prod === totalCand.val)) {
            // Found it! n1 or n2 is qty, the other is price.
            // Typically weight: price is larger than qty
            const [qty, price] = n1 < n2 ? [n1, n2] : [n2, n1]
            
            // Extract description: everything before the first number or unit
            const firstNumIdx = Math.min(...nums.map(n => n.idx))
            const firstSignifIdx = unitIdx !== -1 ? Math.min(firstNumIdx, unitIdx) : firstNumIdx
            const desc = tokens.slice(0, firstSignifIdx).join(' ')
            
            if (desc.trim().length > 2) {
              return { description: desc.trim(), quantity: qty, unit: unit || "buah", price, total: totalCand.val }
            }
          }
        }
      }

      // Fallback: If no multiplication found, but we have 2 or 3 numbers and a 'x' pivot
      if (cleanLine.includes(' x ') || cleanLine.includes(' X ')) {
        const pivotIdx = tokens.findIndex(t => t.toLowerCase() === 'x')
        if (pivotIdx !== -1) {
          const leftNums = nums.filter(n => n.idx < pivotIdx)
          const rightNums = nums.filter(n => n.idx > pivotIdx)
          
          if (leftNums.length > 0 && rightNums.length > 0) {
            const qty = leftNums[leftNums.length-1].val
            const total = rightNums[rightNums.length-1].val
            const price = rightNums.length > 1 ? rightNums[0].val : (total / (qty || 1))
            
            const firstPartIdx = Math.min(leftNums[0].idx, unitIdx !== -1 ? unitIdx : 999)
            const desc = tokens.slice(0, firstPartIdx).join(' ')
            if (desc.trim().length > 2) {
              return { description: desc.trim(), quantity: qty, unit: unit || "buah", price, total }
            }
          }
        }
      }
    }
    
    return null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const parsed = tryParseItem(line)
    if (parsed) {
      items.push(parsed)
    } else if (i + 1 < lines.length) {
      // Try combining with next line (Berita Acara layout)
      const combinedParsed = tryParseItem(`${line} ${lines[i+1]}`)
      if (combinedParsed) {
        items.push(combinedParsed)
        i++
      }
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

  // 2. DEDUPLICATE ITEMS
  const uniqueItems: any[] = []
  const seenItems = new Set<string>()
  
  items.forEach(item => {
    const key = `${item.description.toLowerCase()}-${item.total}`
    if (!seenItems.has(key)) {
      uniqueItems.push(item)
      seenItems.add(key)
    }
  })

  // 3. SMART SUM VALIDATION
  const sumTotalItems = uniqueItems.reduce((sum, item) => sum + (item.total || 0), 0)
  
  // If the extracted total is suspiciously large or doesn't match the sum
  // we prioritize the sum if we found multiple items.
  let finalTotal = totalAmount
  if (Math.abs(sumTotalItems - totalAmount) > 10 && sumTotalItems > 0) {
    // If sum of items is reasonable and total is suspiciously large (> 10M for simple items)
    if (totalAmount > 10000000 && sumTotalItems < 10000000) {
      finalTotal = sumTotalItems
    } else if (totalAmount === 0 && sumTotalItems > 0) {
      finalTotal = sumTotalItems
    }
  }

  return {
    type,
    docNumber,
    vendorName,
    totalAmount: finalTotal,
    date: docDate,
    kodeRek,
    subKegiatan,
    paymentFor,
    items: uniqueItems
  }
}
