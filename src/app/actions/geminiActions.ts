'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

// Access API key from runtime env
const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

const promptString = `
You are an expert OCR and data extraction AI for Indonesian financial documents. 
Extract the financial details from the provided images of receipts/invoices (Dokumen Gabungan / Kwitansi / Nota). 

You MUST respond IN STRICT JSON FORMAT ONLY. No markdown formatting, no \`\`\`json blocks. Just the raw JSON object.

The required JSON structure matches the following TypeScript interfaces. If a field is not found, leave it empty "" or 0.
{
  "type": "string", // "Dokumen Gabungan", "Nota", "Kwitansi"
  "vendorName": "string", // The name of the store or vendor (e.g. "Sumber Mas")
  "paymentFor": "string",  // What the payment is for (e.g. "Bayar Biaya Belanja Pemeliharaan Alat Angkutan...")
  "totalAmount": 0, // The absolute GRAND TOTAL. Numeric only. No punctuation. (e.g. 1195000)
  "docNumber": "string", // Nomor Dokumen / Nomor Nota / Nomor BKU
  "baNumber": "string", // Berita acara
  "baDate": "string", // Format YYYY-MM-DD
  "kodeRek": "string", // Kode Rekening
  "subKegiatan": "string", // Sub Kegiatan
  "items": [
    {
      "description": "string", // Name of the product
      "quantity": 0, // Number only
      "unit": "string", // e.g., "buah", "botol", "ltr"
      "price": 0, // Unit price. Number only (e.g. 200000)
      "total": 0 // Price * quantity. Number only (e.g. 400000)
    }
  ]
}

PAY ATTENTION to table columns. 
"Harga" and "Total" might be close together without spaces in low quality scans (e.g. 200000400000). Use your reasoning to split these based on the quantity!
Only output valid item lines. 
`

export async function parseWithGemini(base64Images: string[]) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di pengaturan Vercel (Penting!).")
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const imageParts = base64Images.map(imgData => {
      // Split "data:image/jpeg;base64,..."
      const split = imgData.split(',')
      const mimeType = split[0].match(/:(.*?);/)?.[1] || "image/jpeg"
      const base64 = split[1]
      
      return {
        inlineData: {
          data: base64,
          mimeType
        }
      }
    })

    const result = await model.generateContent([
      promptString,
      ...imageParts
    ])
    
    // We expect valid JSON in the response.
    const textRes = result.response.text()
    
    // Strip possible markdown ticks
    let cleanText = textRes.trim();
    if (cleanText.startsWith('\`\`\`json')) cleanText = cleanText.substring(7);
    if (cleanText.startsWith('\`\`\`')) cleanText = cleanText.substring(3);
    if (cleanText.endsWith('\`\`\`')) cleanText = cleanText.substring(0, cleanText.length - 3);
    
    cleanText = cleanText.trim()

    return JSON.parse(cleanText)
  } catch (error: any) {
    console.error("Gemini Parse Error:", error);
    throw new Error("Gagal melakukan scan via Gemini AI: " + (error.message || error))
  }
}
