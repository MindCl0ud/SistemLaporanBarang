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

export async function parseDocumentImage(fileUrl: string | File, onProgress?: (msg: string) => void) {
  try {
    if (onProgress) onProgress('Memulai OCR (Membaca Teks)...')
    const worker = await Tesseract.createWorker('ind')
    const ret = await worker.recognize(fileUrl)
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
  if (lowerText.includes('berita acara penerimaan') || /ba\s*p-br\s*g/i.test(text)) {
    type = 'Berita Acara Penerimaan Barang'
  } else if (lowerText.includes('kwitansi') || lowerText.includes('kuitansi')) {
    type = 'Kwitansi'
  } else if (lowerText.includes('nota pesanan') || /np\.br\s*g/i.test(text)) {
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
      const m = text.match(pat)
      if (m) {
        vendorName = m[1]?.trim() || m[0].trim()
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
  //    Resilient Segment-based Parsing
  // ──────────────────────────────────────────────────────────
  const items: any[] = []
  const unitPattern = new RegExp('(?:bu[a-z]{1,3}\\s*[hx]?|bot[a-z]{0,2}\\s*[lx]?|lt[a-z]?|li[a-z]+|rim|dos|dus|set|pcs|unit|lembar|kg|gram)', 'i')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('JUMLAH') || line.includes('Terima dari') || line.includes('Untuk Pembayaran')) continue

    // Strategy 1: Look for numeric patterns in the line
    // e.g. name... [qty] [unit] [x] [price] [total]
    const segments = line.split(/[ \t]{2,}/).filter(s => s.length > 0)
    
    // An item line usually has at least: description, quantity+unit, price, total
    // But sometimes quantity and unit are separate segments or merged.
    if (segments.length >= 2) {
      // Find the segments that look like prices/totals (ending segments usually)
      const lastSegment = segments[segments.length - 1]
      const prevSegment = segments[segments.length - 2]
      
      const total = parseAmount(lastSegment)
      const price = parseAmount(prevSegment)
      
      // If we found a valid total and price (or just a total)
      if (total > 0) {
        // Find quantity + unit
        let qty = 0
        let description = segments[0]
        
        // Try to find a segment with "digit + unit"
        for (let j = 1; j < segments.length - 1; j++) {
          const seg = segments[j]
          const m = seg.match(/(\d+(?:\.\d+)?)\s*(?:buah|botol|pcs|unit|lt|rim|set|bu[a-z]+)/i)
          if (m) {
            qty = parseFloat(m[1])
            // Description is everything before this segment
            description = segments.slice(0, j).join(' ')
            break
          }
        }
        
        // If still no qty, maybe it's the 2nd segment
        if (qty === 0 && segments.length >= 3) {
          const m = segments[1].match(/^\d+$/)
          if (m) {
            qty = parseFloat(segments[1])
            description = segments[0]
          }
        }

        // Clean up description (remove leading #, dash, etc.)
        description = description.replace(/^(?:\d+\s*)?-?\s*/, '').trim()
        
        if (description.length > 2 && (qty > 0 || total > 0)) {
          items.push({
            description,
            quantity: qty || 1,
            price: price || total,
            total
          })
          continue
        }
      }
    }

    // Strategy 2: Fallback to existing Pattern B (Two-line items)
    if (/^-\s+\w/.test(line) && i + 1 < lines.length) {
       const nextLine = lines[i+1]
       const matchB = nextLine.match(/^[Il1]?\s*(\d+)\s+(?:buah|botol|lt|rim|set|pcs)\s*x?\s+([\d.,\s]+)\s+([\d.,]+)\s*$/i)
       if (matchB) {
         items.push({
           description: line.replace(/^-\s*/, '').trim(),
           quantity: parseFloat(matchB[1]),
           price: parseAmount(matchB[2]),
           total: parseAmount(matchB[3])
         })
         i++ // skip next line
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
