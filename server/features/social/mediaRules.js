export const MAX_IMAGE_ITEMS = 4
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/tiff'
]

export function isAllowedImageType(mimeType) {
  return ALLOWED_IMAGE_TYPES.indexOf(mimeType) !== -1
}

export function acceptAttribute() {
  return ALLOWED_IMAGE_TYPES.join(',')
}

export function validateLocalImage(file, existingImages) {
  if (!file) {
    return 'No file selected'
  }
  if (!isAllowedImageType(file.type)) {
    return 'Unsupported file type. Use JPG, PNG, GIF, or WebP.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image is too large (max 10 MB)'
  }
  if (existingImages.length >= MAX_IMAGE_ITEMS) {
    return 'You can attach up to ' + MAX_IMAGE_ITEMS + ' images'
  }
  return null
}
