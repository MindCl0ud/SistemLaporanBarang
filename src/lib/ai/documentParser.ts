/**
 * documentParser.ts
 * Manages the native browser AI logic for parsing documents using Tesseract.js
 * and Transformers.js (for structured json extraction if doing browser ML).
 */

import Tesseract from 'tesseract.js'

export async function parseDocumentImage(fileUrl: string | File, onProgress?: (msg: string) => void) {
  try {
    if (onProgress) onProgress('Memulai OCR (Membaca Teks)...')
    
    // Step 1: Optical Character Recognition
    const worker = await Tesseract.createWorker('ind') // Indonesian
    const ret = await worker.recognize(fileUrl)
    const text = ret.data.text
    await worker.terminate()

    if (onProgress) onProgress('Menyusun Data...')
    
    // Step 2: Native AI Structuring (Transformers.js or Regex Fallback for speed)
    // NOTE: Transformers.js is very heavy for client-side LLM JSON parsing. 
    // For V1 "Native AI", we will use regex + simple heuristics first, 
    // and provide the Transformers.js pipeline as an optional heavy load.
    
    const parsedData = extractDataFromText(text)
    
    if (onProgress) onProgress('Selesai')
    return { text, data: parsedData }
  } catch (error: any) {
    console.error('OCR Error:', error)
    throw new Error('Gagal membaca dokumen: ' + (error?.message || error))
  }
}

export function extractDataFromText(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const lowerText = text.toLowerCase()
  
  // 1. Determine Type
  let type = "Nota"
  if (lowerText.includes('berita acara') || lowerText.includes('bap')) type = "Berita Acara"
  else if (lowerText.includes('kwitansi') || lowerText.includes('kuitansi')) type = "Kwitansi"
  else if (lowerText.includes('faktur') || lowerText.includes('invoice')) type = "Faktur"

  // 2. Extract Specific Date (Waikabubak format)
  let docDate: Date | null = null
  const dateRegex = /(?:Waikabubak|Tanggal)\s*,?\s*(\d{1,2}\s+[a-z]+\s+\d{4})/i
  const dateMatch = text.match(dateRegex)
  if (dateMatch) {
    // Basic Indonesian month mapping if needed, but JS Date might handle some
    const monthMap: Record<string, string> = {
      'januari': 'Jan', 'februari': 'Feb', 'maret': 'Mar', 'april': 'Apr', 'mei': 'May', 'juni': 'Jun',
      'juli': 'Jul', 'agustus': 'Aug', 'september': 'Sep', 'oktober': 'Oct', 'november': 'Nov', 'desember': 'Dec'
    }
    let dateStr = dateMatch[1].toLowerCase()
    Object.keys(monthMap).forEach(key => {
      dateStr = dateStr.replace(key, monthMap[key])
    })
    const parsedDate = new Date(dateStr)
    if (!isNaN(parsedDate.getTime())) docDate = parsedDate
  }

  // 3. Extract Kode Rek & Sub Kegiatan
  let kodeRek = ""
  let subKegiatan = ""
  // Pattern: 5.01.01.2.09.0002 followed by more numbers
  const kodeRekRegex = /(5\.01\.01\.2\.09\.0002)(?:\.([\d.]+))?/
  const kodeMatch = text.match(kodeRekRegex)
  if (kodeMatch) {
    kodeRek = kodeMatch[0]
    subKegiatan = kodeMatch[2] || ""
  }

  // 4. Find Total Amount (Largest Number Heuristic)
  const amountRegex = /(?:Rp|IDR)?\s*([\d,.]{4,})/gi
  let match;
  let matches: number[] = []
  while ((match = amountRegex.exec(text)) !== null) {
    const cleaned = match[1].replace(/[.,]/g, '')
    const val = parseInt(cleaned, 10)
    if (!isNaN(val) && val > 100) matches.push(val)
  }
  const totalAmount = matches.length > 0 ? Math.max(...matches) : 0

  // 5. Extract Vendor Name
  let vendorName = "Toko/Penyedia Tidak Diketahui"
  const vendorKeywords = ['toko', 'cv.', 'pt.', 'market', 'jaya', 'abadi', 'sentosa', 'koperasi', 'ud.']
  const scanLimit = Math.min(lines.length, 12)
  for (let i = 0; i < scanLimit; i++) {
    const line = lines[i].toLowerCase()
    if (vendorKeywords.some(k => line.includes(k)) && !line.includes('jl.') && line.length > 3) {
      vendorName = lines[i].replace(/[:=]/g, '').trim()
      break
    }
  }

  // 6. Extract Line Items (Rincian Item)
  // Look for lines containing numbers that might specify Qty and Price
  // Typical: [Item Name] [Qty] [Unit] [Price] [Total]
  const items: any[] = []
  const itemLineRegex = /^(.+?)\s+(\d+)\s+(?:pcs|rim|dus|buah|unit|set|liter|kg)?\s*([\d,.]{4,})\s+([\d,.]{4,})$/i
  
  for (const line of lines) {
    const m = line.match(itemLineRegex)
    if (m) {
      items.push({
        description: m[1].trim(),
        quantity: parseFloat(m[2]),
        price: parseFloat(m[3].replace(/[.,]/g, '')),
        total: parseFloat(m[4].replace(/[.,]/g, ''))
      })
    }
  }

  return { 
    type, 
    vendorName, 
    totalAmount, 
    date: docDate, 
    kodeRek, 
    subKegiatan,
    items 
  }
}
