/**
 * Client-Side Smart Image Compressor
 * Compresses KTP, Selfie, and Payment Proof images to optimized JPEG format.
 * Reduces file sizes from 8-15 MB down to ~120-250 KB with visual lossless quality.
 * Universally compatible across iOS Safari, Android Chrome, and all mobile browsers.
 */

export interface CompressionOptions {
  maxDimension?: number // Maximum width or height in pixels (default 1280)
  quality?: number // Quality factor 0.0 to 1.0 (default 0.78)
  targetFormat?: 'image/jpeg' | 'image/webp' // Default image/jpeg
}

export interface CompressionResult {
  file: File
  originalSize: number
  compressedSize: number
  savedPercent: number
  format: string
}

/**
 * Format bytes to readable human string (e.g. 150 KB, 2.4 MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Helper to calculate proportional dimensions
 */
function calculateDimensions(width: number, height: number, maxDimension: number): { width: number; height: number } {
  let targetWidth = width
  let targetHeight = height

  if (targetWidth > targetHeight) {
    if (targetWidth > maxDimension) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth)
      targetWidth = maxDimension
    }
  } else {
    if (targetHeight > maxDimension) {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight)
      targetHeight = maxDimension
    }
  }

  return { width: Math.max(1, targetWidth), height: Math.max(1, targetHeight) }
}

/**
 * Helper to export canvas to Blob with universal JPEG encoding
 * Note: Never export WebP without verifying blob.type, as iOS Safari silently returns 4MB PNGs for WebP!
 * JPEG is universally supported on 100% of browsers with real compression.
 */
function exportCanvasToJpegBlob(
  canvas: HTMLCanvasElement,
  originalFile: File,
  quality = 0.78
): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            // Safety: if the blob is still unexpectedly large (> 900 KB), re-export with slightly lower quality
            if (blob.size > 900 * 1024 && quality > 0.65) {
              return canvas.toBlob(
                (retryBlob) => {
                  if (retryBlob && retryBlob.size > 0) {
                    const baseName = (originalFile.name || 'photo').replace(/\.[^/.]+$/, '')
                    return resolve(new File([retryBlob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }))
                  }
                  resolve(null)
                },
                'image/jpeg',
                0.65
              )
            }

            const baseName = (originalFile.name || 'photo').replace(/\.[^/.]+$/, '')
            const compressedFile = new File([blob], `${baseName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            return resolve(compressedFile)
          }
          resolve(null)
        },
        'image/jpeg',
        quality
      )
    } catch (err) {
      console.warn('exportCanvasToJpegBlob error:', err)
      resolve(null)
    }
  })
}

/**
 * Compress an image File on the client-side
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxDimension = 1280,
    quality = 0.78
  } = options

  if (!file) {
    return file
  }

  const fileType = (file.type || '').toLowerCase()
  const fileName = (file.name || '').toLowerCase()
  const isImageMime = fileType.startsWith('image/')
  const isImageExt = /\.(jpe?g|png|webp|heic|heif|bmp|tiff?)$/i.test(fileName)

  if (!isImageMime && !isImageExt && fileType !== '' && !fileType.includes('octet-stream')) {
    return file
  }

  // Skip SVGs and GIFs
  if (fileType === 'image/svg+xml' || fileType === 'image/gif') {
    return file
  }

  // If file is already small (< 70 KB) and is JPEG or WebP, return directly
  if (file.size < 70 * 1024 && (fileType === 'image/jpeg' || fileType === 'image/webp')) {
    return file
  }

  return new Promise((resolve, reject) => {
    let objectUrl = ''
    try {
      objectUrl = URL.createObjectURL(file)
    } catch (createUrlErr) {
      console.warn('URL.createObjectURL failed:', createUrlErr)
      return resolve(file)
    }

    const img = new Image()

    const cleanup = () => {
      try {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      } catch {}
    }

    img.onload = async () => {
      try {
        const naturalWidth = img.naturalWidth || img.width
        const naturalHeight = img.naturalHeight || img.height

        if (!naturalWidth || !naturalHeight) {
          cleanup()
          return resolve(file)
        }

        const { width, height } = calculateDimensions(naturalWidth, naturalHeight, maxDimension)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) {
          cleanup()
          return resolve(file)
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        const compressed = await exportCanvasToJpegBlob(canvas, file, quality)
        cleanup()

        if (compressed && compressed.size > 0) {
          // If compressed file is indeed smaller or reasonably sized, use it
          if (compressed.size < file.size || compressed.size < 800 * 1024) {
            return resolve(compressed)
          }
        }

        resolve(file)
      } catch (err) {
        cleanup()
        console.warn('Canvas compression error:', err)
        // If file is too large (> 2MB) and compression failed, reject to protect server payload
        if (file.size > 2 * 1024 * 1024) {
          reject(new Error('Gagal mengompresi foto. Silakan ambil foto ulang.'))
        } else {
          resolve(file)
        }
      }
    }

    img.onerror = (imgErr) => {
      cleanup()
      console.warn('Image load error during compression:', imgErr)
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error('Format foto tidak terbaca oleh browser. Silakan ambil foto ulang.'))
      } else {
        resolve(file)
      }
    }

    img.src = objectUrl
  })
}

/**
 * Capture frame from HTMLVideoElement and compress directly to JPEG File
 */
export function captureVideoFrameToWebP(
  video: HTMLVideoElement,
  filenamePrefix: string,
  maxDimension = 1280,
  quality = 0.80,
  mirror = false
): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        return resolve(null)
      }

      const { width, height } = calculateDimensions(video.videoWidth, video.videoHeight, maxDimension)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) return resolve(null)

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      if (mirror) {
        ctx.translate(width, 0)
        ctx.scale(-1, 1)
      }

      ctx.drawImage(video, 0, 0, width, height)

      // Encode directly to universal JPEG
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            const file = new File(
              [blob],
              `${filenamePrefix}-${Date.now()}.jpg`,
              {
                type: 'image/jpeg',
                lastModified: Date.now()
              }
            )
            resolve(file)
          } else {
            resolve(null)
          }
        },
        'image/jpeg',
        quality
      )
    } catch (err) {
      console.warn('captureVideoFrameToWebP error:', err)
      resolve(null)
    }
  })
}
