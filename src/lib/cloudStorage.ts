import { v2 as cloudinary } from 'cloudinary'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Configure Cloudinary from environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
}

export interface UploadOptions {
  folder?: string
  filenamePrefix?: string
  fallbackBucket?: string
}

/**
 * Upload an image file to Cloudinary with automatic Supabase Storage fallback
 * @param file The File object to upload
 * @param options Upload options (folder, prefix, fallback bucket)
 * @returns The secure HTTPS URL of the uploaded image
 */
export async function uploadImageToCloud(
  file: File,
  options: UploadOptions = {}
): Promise<string> {
  const {
    folder = 'graha-aisyah/check-in',
    filenamePrefix = 'photo',
    fallbackBucket = 'check-in-photos'
  } = options

  if (!file || file.size === 0) {
    return ''
  }

  // 1. Try uploading to Cloudinary if credentials are configured
  if (cloudName && apiKey && apiSecret) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64Data = `data:${file.type || 'image/webp'};base64,${buffer.toString('base64')}`

      const publicId = `${filenamePrefix}-${Date.now()}`

      const uploadResult = await cloudinary.uploader.upload(base64Data, {
        folder: folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
      })

      if (uploadResult && uploadResult.secure_url) {
        return uploadResult.secure_url
      }
    } catch (cloudinaryError: any) {
      console.warn('Cloudinary upload warning, falling back to Supabase storage:', cloudinaryError?.message || cloudinaryError)
    }
  }

  // 2. Fallback to Supabase Storage if Cloudinary is unavailable
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    const isWebP = file.type === 'image/webp' || file.name.endsWith('.webp')
    const ext = isWebP ? 'webp' : (file.name.split('.').pop() || 'jpg')
    const fileName = `${folder}/${Date.now()}-${filenamePrefix}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(fallbackBucket)
      .upload(fileName, file, {
        contentType: file.type || (isWebP ? 'image/webp' : 'image/jpeg'),
        cacheControl: '31536000',
        upsert: false
      })

    if (!uploadError) {
      const { data } = supabase.storage.from(fallbackBucket).getPublicUrl(fileName)
      return data.publicUrl
    }
  } catch (supabaseErr: any) {
    console.error('Supabase fallback upload failed:', supabaseErr)
  }

  return ''
}

/**
 * Check if Cloudinary is configured and ready
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && apiKey && apiSecret)
}
