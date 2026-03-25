'use server'

// @ts-ignore
import pdf from 'pdf-parse'

export async function parsePdfServer(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  try {
    const data = await pdf(buffer)
    const text = data.text

    let type = "Nota"
    if (text.toLowerCase().includes('berita acara') || text.toLowerCase().includes('bap')) type = "Berita Acara"
    if (text.toLowerCase().includes('kwitansi') || text.toLowerCase().includes('kuitansi')) type = "Kwitansi"
    
    let totalAmount = 0
    const rpRegex = /(?:Rp|Total|Jumlah)[\s\S]*?([\d,.]+)/i
    const match = text.match(rpRegex)
    if (match && match[1]) {
      const cleaned = match[1].replace(/[^\d]/g, '')
      totalAmount = parseInt(cleaned, 10)
    }

    let vendorName = "Toko/Penyedia (Dari PDF)"
    const lines = text.split('\n').filter((l: string) => l.trim().length > 0)
    const startLines = lines.slice(0, 8)
    for (const line of startLines) {
      if (line.toLowerCase().includes('toko') || line.toLowerCase().includes('cv') || line.toLowerCase().includes('pt')) {
        vendorName = line.trim()
        break
      }
    }

    return { text, data: { type, vendorName, totalAmount } }
  } catch (err: any) {
    throw new Error('Gagal mengekstrak teks dari PDF: ' + err.message)
  }
}
