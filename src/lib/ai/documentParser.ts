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
  
  let type = "Nota"
  const lowerText = text.toLowerCase()
  if (lowerText.includes('berita acara') || lowerText.includes('bap')) type = "Berita Acara"
  else if (lowerText.includes('kwitansi') || lowerText.includes('kuitansi')) type = "Kwitansi"
  else if (lowerText.includes('faktur') || lowerText.includes('invoice')) type = "Faktur"

  // 1. Find the largest number in the text (often the Grand Total)
  // Regex to find currency-like numbers: 1.000, 1,000, 1000.00 etc.
  // Match numbers that are at least 3 digits long to avoid dates/codes
  const amountRegex = /(?:Rp|IDR)?\s*([\d,.]{4,})/gi
  let match;
  let matches: number[] = []
  
  while ((match = amountRegex.exec(text)) !== null) {
    const cleaned = match[1].replace(/[.,]/g, '')
    const val = parseInt(cleaned, 10)
    if (!isNaN(val) && val > 100) {
      matches.push(val)
    }
  }

  // Fallback direct regex for "Total" or "Jumlah"
  const totalKeywordsRegex = /(?:Total|Jumlah|Total Bayar|Grand Total)[\s\S]*?([\d,.]{4,})/i
  const keywordMatch = text.match(totalKeywordsRegex)
  if (keywordMatch) {
    const val = parseInt(keywordMatch[1].replace(/[.,]/g, ''), 10)
    if (!isNaN(val)) matches.push(val)
  }

  // Pick the largest one (Heuristic: The total is usually the biggest number)
  const totalAmount = matches.length > 0 ? Math.max(...matches) : 0

  // 2. Find Vendor Name (Searching first 10 significant lines)
  let vendorName = "Toko/Penyedia Tidak Diketahui"
  const vendorKeywords = ['toko', 'cv.', 'pt.', 'market', 'jaya', 'abadi', 'sentosa', 'koperasi', 'ud.']
  
  const scanLimit = Math.min(lines.length, 12)
  for (let i = 0; i < scanLimit; i++) {
    const line = lines[i].toLowerCase()
    const hasKeyword = vendorKeywords.some(k => line.includes(k))
    
    // Heuristic: If it has "JL." (address) or is very short, skip
    if (hasKeyword && !line.includes('jl.') && line.length > 3) {
      vendorName = lines[i].replace(/[:=]/g, '').trim()
      break
    }
  }

  // If still not found, just take first line if it looks like a name (not date/header)
  if (vendorName.startsWith("Toko/Penyedia") && lines.length > 0) {
    if (!lines[0].match(/\d{2}[-/]\d{2}[-/]\d{4}/)) { // not a date
        vendorName = lines[0]
    }
  }

  return { type, vendorName, totalAmount }
}
