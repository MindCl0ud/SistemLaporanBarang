/**
 * storage.ts
 * Utility for handling document image storage.
 * 
 * Current implementation uses local buffering (base64).
 * This is designed to be easily swappable for:
 * - Supabase Storage
 * - Vercel Blob
 * - Amazon S3
 */

export async function uploadDocumentImage(file: File): Promise<string> {
  // For now, we return a data URL since we don't have a configured cloud bucket.
  // In a production environment, you would use:
  // supabase.storage.from('documents').upload(path, file)
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function getImageUrl(path: string): string {
  // If the path is already a full URL or data URL, return it
  if (path.startsWith('http') || path.startsWith('data:')) {
    return path
  }
  
  // Logical placeholder for Supabase public URL
  return path 
}
