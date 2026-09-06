/**
 * Client-Side Smart Image Compressor
 * Compresses KTP, Selfie, and Payment Proof images to WebP / JPEG format with visual lossless quality.
 * Reduces file sizes by 80-95% while keeping NIK text, face details, and receipt amounts crystal clear.
 * Highly optimized for cross-platform stability (iOS Safari, Android Chrome, Samsung Internet).
 */

export interface CompressionOptions {
  maxDimension?: number // Maximum width or height in pixels (default 1400)
  quality?: number // Quality factor 0.0 to 1.0 (default 0.82)
  targetFormat?: 'image/webp' | 'image/jpeg' // Default WebP with auto-fallback to JPEG
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
 * Helper to calculate dimensions keeping aspect ratio
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

  return { width: targetWidth, height: targetHeight }
}

/**
 * Helper to export canvas to Blob with format fallback (WebP -> JPEG)
 */
function exportCanvasToBlob(
  canvas: HTMLCanvasElement,
  originalFile: File,
  targetFormat: 'image/webp' | 'image/jpeg',
  quality: number
): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(
        (blob) => {
          // Verify blob is valid and has content
          if (blob && blob.size > 0) {
            const actualType = blob.type || targetFormat
            const isWebP = actualType === 'image/webp'
            const ext = isWebP ? 'webp' : 'jpg'
            const baseName = (originalFile.name || 'photo').replace(/\.[^/.]+$/, '')

            const compressedFile = new File([blob], `${baseName}.${ext}`, {
              type: actualType,
              lastModified: Date.now()
            })
            return resolve(compressedFile)
          }

          // Fallback to JPEG if WebP export failed (e.g. older Safari WebKit)
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob && jpegBlob.size > 0) {
                const baseName = (originalFile.name || 'photo').replace(/\.[^/.]+$/, '')
                const fallbackFile = new File([jpegBlob], `${baseName}.jpg`, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                })
                return resolve(fallbackFile)
              }
              resolve(null)
            },
            'image/jpeg',
            quality
          )
        },
        targetFormat,
        quality
      )
    } catch {
      resolve(null)
    }
  })
}

/**
 * Compress an image File on the client-side
 * Uses URL.createObjectURL and createImageBitmap for minimal memory usage on mobile devices.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxDimension = 1400,
    quality = 0.82,
    targetFormat = 'image/webp'
  } = options

  // Basic validation
  if (!file) {
    return file
  }

  // Detect image type or extension
  const fileType = (file.type || '').toLowerCase()
  const fileName = (file.name || '').toLowerCase()
  const isImageMime = fileType.startsWith('image/')
  const isImageExt = /\.(jpe?g|png|webp|heic|heif|bmp|tiff?)$/i.test(fileName)

  // If clearly not an image and has non-empty non-image mime without image extension, return as is
  if (!isImageMime && !isImageExt && fileType !== '' && !fileType.includes('octet-stream')) {
    return file
  }

  // Skip SVGs and Animated GIFs to prevent breaking animation
  if (fileType === 'image/svg+xml' || fileType === 'image/gif') {
    return file
  }

  // If file is already very small (< 80 KB) and already WebP or JPEG, return directly
  if (file.size < 80 * 1024 && (fileType === 'image/webp' || fileType === 'image/jpeg')) {
    return file
  }

  return new Promise(async (resolve) => {
    // 1. Try modern createImageBitmap first (very fast, low memory, handles orientations)
    if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
      try {
        const bitmap = await createImageBitmap(file)
        const { width, height } = calculateDimensions(bitmap.width, bitmap.height, maxDimension)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(bitmap, 0, 0, width, height)

          const compressed = await exportCanvasToBlob(canvas, file, targetFormat, quality)
          bitmap.close?.()
          if (compressed) {
            return resolve(compressed)
          }
        }
      } catch (bitmapErr) {
        // createImageBitmap might not support certain formats, fallback to Image + createObjectURL
      }
    }

    // 2. Universal fallback: HTML Image element with URL.createObjectURL (avoids huge base64 strings)
    try {
      const objectUrl = URL.createObjectURL(file)
      const img = new Image()

      const cleanup = () => {
        try {
          URL.revokeObjectURL(objectUrl)
        } catch {}
      }

      img.onload = async () => {
        try {
          const { width, height } = calculateDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, maxDimension)

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            cleanup()
            return resolve(file)
          }

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)

          const compressed = await exportCanvasToBlob(canvas, file, targetFormat, quality)
          cleanup()
          if (compressed) {
            return resolve(compressed)
          }
          resolve(file)
        } catch (err) {
          cleanup()
          console.warn('Canvas processing error:', err)
          resolve(file)
        }
      }

      img.onerror = (imgErr) => {
        cleanup()
        console.warn('Image load error during compression:', imgErr)
        resolve(file)
      }

      img.src = objectUrl
    } catch (err) {
      console.warn('compressImage exception, returning original file:', err)
      resolve(file)
    }
  })
}

/**
 * Capture frame from HTMLVideoElement and compress directly to WebP / JPEG File
 */
export function captureVideoFrameToWebP(
  video: HTMLVideoElement,
  filenamePrefix: string,
  maxDimension = 1400,
  quality = 0.85,
  mirror = false
): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      if (!video || video.videoWidth === 0) {
        return resolve(null)
      }

      const { width, height } = calculateDimensions(video.videoWidth, video.videoHeight, maxDimension)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      if (mirror) {
        ctx.translate(width, 0)
        ctx.scale(-1, 1)
      }

      ctx.drawImage(video, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            const file = new File(
              [blob],
              `${filenamePrefix}-${Date.now()}.webp`,
              {
                type: 'image/webp',
                lastModified: Date.now()
              }
            )
            resolve(file)
          } else {
            // Fallback to jpeg
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob && jpegBlob.size > 0) {
                  const file = new File(
                    [jpegBlob],
                    `${filenamePrefix}-${Date.now()}.jpg`,
                    { type: 'image/jpeg', lastModified: Date.now() }
                  )
                  resolve(file)
                } else {
                  resolve(null)
                }
              },
              'image/jpeg',
              quality
            )
          }
        },
        'image/webp',
        quality
      )
    } catch (err) {
      console.warn('captureVideoFrameToWebP error:', err)
      resolve(null)
    }
  })
}
