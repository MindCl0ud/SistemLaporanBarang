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
  } catch (error) {
    console.error('OCR Error:', error)
    throw new Error('Gagal membaca dokumen.')
  }
}

function extractDataFromText(text: string) {
  // A simple heuristic extractor (Fallback before loading 2GB LLM in browser)
  const lines = text.split('\n')
  
  let type = "Nota"
  if (text.toLowerCase().includes('berita acara') || text.toLowerCase().includes('bap')) type = "Berita Acara"
  if (text.toLowerCase().includes('kwitansi') || text.toLowerCase().includes('kuitansi')) type = "Kwitansi"

  // Attempt to find total amount: search for "total", "jumlah", "Rp"
  let totalAmount = 0
  const rpRegex = /(?:Rp|Total|Jumlah)[\s\S]*?([\d,.]+)/i
  const match = text.match(rpRegex)
  if (match && match[1]) {
    const cleaned = match[1].replace(/[^\d]/g, '')
    totalAmount = parseInt(cleaned, 10)
  }

  // Attempt to find vendor/toko
  let vendorName = "Toko/Penyedia Tidak Diketahui"
  const startLines = lines.slice(0, 5) // Usually at the top
  for (const line of startLines) {
    if (line.toLowerCase().includes('toko') || line.toLowerCase().includes('cv') || line.toLowerCase().includes('pt')) {
      vendorName = line.trim()
      break
    }
  }

  return { type, vendorName, totalAmount }
}
