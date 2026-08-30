/**
 * Security utilities for input validation and sanitization
 * Prevents SQL injection, XSS attacks, and validates data formats
 */

/**
 * Sanitize string input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers (onclick=, onerror=, etc.)
    .trim()
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): { valid: boolean; sanitized: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, sanitized: '' }
  }
  
  const sanitized = sanitizeString(email.toLowerCase().trim())
  if (!sanitized) {
    return { valid: false, sanitized: '' }
  }
  
  // Standard permissive email regex that handles international/subdomains without crashing mobile browsers
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  
  return {
    valid: emailRegex.test(sanitized),
    sanitized
  }
}

/**
 * Validate and sanitize phone number (Indonesian format)
 */
export function validatePhone(phone: string): { valid: boolean; sanitized: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, sanitized: '' }
  }
  
  // Remove all non-digit characters except leading +
  let sanitized = phone.trim().replace(/[^\d+]/g, '')
  
  // If starts with +, remove + for digit length check
  const digitsOnly = sanitized.replace(/\D/g, '')
  
  // Indonesian numbers usually 9 to 15 digits (e.g. 08123456789, +628123456789, 81234567890)
  const isValidLength = digitsOnly.length >= 9 && digitsOnly.length <= 16
  const isValidPrefix = /^((\+?62)|0|8)[0-9]{8,15}$/.test(digitsOnly)
  
  return {
    valid: isValidLength && isValidPrefix,
    sanitized
  }
}

/**
 * Validate and sanitize full name
 * Tolerant for Indonesian titles, degrees, smart punctuation from iOS keyboards (curly quotes), commas, dots, and hyphens.
 */
export function validateFullName(name: string): { valid: boolean; sanitized: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, sanitized: '' }
  }
  
  const sanitized = sanitizeString(name).trim()
  
  // Name should be 2-100 characters, allow letters, spaces, dots, hyphens, straight/curly apostrophes, commas, parentheses
  // Supports Unicode letters (\p{L}) for Indonesian names and special keyboard characters
  const nameRegex = /^[\p{L}\s.'’‘\-(),/]{2,100}$/u
  
  return {
    valid: nameRegex.test(sanitized) && sanitized.length >= 2 && sanitized.length <= 100,
    sanitized
  }
}

/**
 * Validate and sanitize ID card number (NIK - 16 digits)
 */
export function validateIdCardNumber(idCard: string): { valid: boolean; sanitized: string } {
  if (!idCard || typeof idCard !== 'string') {
    return { valid: false, sanitized: '' }
  }
  
  // Remove all non-digit characters
  const sanitized = idCard.replace(/\D/g, '').trim()
  
  // NIK should be exactly 16 digits
  return {
    valid: sanitized.length === 16 && /^\d{16}$/.test(sanitized),
    sanitized
  }
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid.trim())
}

/**
 * Validate file type and size
 */
export function validateFile(file: File, allowedTypes: string[], maxSizeMB: number): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'File tidak ditemukan' }
  }
  
  // Check file type (MIME type or file extension fallback for mobile browsers)
  const fileType = (file.type || '').toLowerCase()
  const fileName = (file.name || '').toLowerCase()
  const isImageAllowed = allowedTypes.some(type => type.startsWith('image/'))
  const hasImageExt = /\.(jpe?g|png|webp|heic|heif|gif|bmp|raw|tiff?)$/i.test(fileName)
  
  // Mobile browsers sometimes pass empty file.type on live camera capture, so treat as valid if image is expected and size is reasonable
  const isValidType = allowedTypes.some(type => fileType.startsWith(type)) || 
                      (isImageAllowed && (hasImageExt || fileType === '' || fileType.includes('octet-stream')))
  
  if (!isValidType) {
    return { valid: false, error: `Tipe file tidak didukung. Silakan pilih foto (JPG, PNG, WebP, HEIC).` }
  }
  
  // Check file size (convert MB to bytes)
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `Ukuran file terlalu besar (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maksimal ${maxSizeMB}MB` }
  }
  
  return { valid: true }
}

/**
 * Validate numeric amount
 */
export function validateAmount(amount: string | number): { valid: boolean; sanitized: number } {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numAmount) || numAmount <= 0 || numAmount > 999999999) {
    return { valid: false, sanitized: 0 }
  }
  
  return { valid: true, sanitized: numAmount }
}

/**
 * Validate JSON string and parse safely
 */
export function validateJSON(jsonString: string): { valid: boolean; data?: any } {
  if (!jsonString || typeof jsonString !== 'string') {
    return { valid: false }
  }
  
  try {
    const parsed = JSON.parse(jsonString)
    return { valid: true, data: parsed }
  } catch {
    return { valid: false }
  }
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  
  return text.replace(/[&<>"']/g, (m) => map[m])
}





