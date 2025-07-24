// File validation utilities for secure file handling

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo' // avi
];

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_DURATION = 180; // 3 minutes in seconds
export const MAX_IMAGES_COUNT = 10;

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateImageFile(file: File): FileValidationResult {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only JPEG, PNG, WebP, and GIF images are allowed.'
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      isValid: false,
      error: 'Image size must be less than 10MB.'
    };
  }

  return { isValid: true };
}

export function validateVideoFile(file: File): FileValidationResult {
  // Check file type
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only MP4, WebM, QuickTime, and AVI videos are allowed.'
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: 'Video size must be less than 100MB.'
    };
  }

  return { isValid: true };
}

export function sanitizeFileName(fileName: string): string {
  // Remove potentially dangerous characters and limit length
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 100)
    .toLowerCase();
}

export function validateTextInput(text: string, maxLength: number = 1000): FileValidationResult {
  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      error: 'This field is required.'
    };
  }

  if (text.length > maxLength) {
    return {
      isValid: false,
      error: `Text must be less than ${maxLength} characters.`
    };
  }

  // Check for potentially malicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      return {
        isValid: false,
        error: 'Text contains invalid characters.'
      };
    }
  }

  return { isValid: true };
}