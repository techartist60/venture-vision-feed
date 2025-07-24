// Security utilities for rate limiting and input sanitization

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private storage = new Map<string, RateLimitEntry>();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const entry = this.storage.get(identifier);

    if (!entry || now > entry.resetTime) {
      // Reset or create new entry
      this.storage.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return false;
    }

    if (entry.count >= this.maxAttempts) {
      return true;
    }

    // Increment count
    entry.count++;
    return false;
  }

  getRemainingTime(identifier: string): number {
    const entry = this.storage.get(identifier);
    if (!entry) return 0;
    
    const now = Date.now();
    return Math.max(0, entry.resetTime - now);
  }

  reset(identifier: string): void {
    this.storage.delete(identifier);
  }
}

// Rate limiters for different actions
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const uploadRateLimiter = new RateLimiter(10, 60 * 1000); // 10 uploads per minute

export function sanitizeHtml(input: string): string {
  // Remove potentially dangerous HTML tags and attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .trim();
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 320; // RFC 5321 limit
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be less than 128 characters' };
  }
  
  // Check for at least one lowercase, uppercase, digit, and special character
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasLower || !hasUpper || !hasDigit || !hasSpecial) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character' 
    };
  }
  
  return { isValid: true };
}

export function logSecurityEvent(event: string, details: any = {}) {
  // In production, this would send to a security monitoring service
  if (process.env.NODE_ENV === 'development') {
    console.warn('Security Event:', event, details);
  }
  
  // Could integrate with services like Sentry, LogRocket, etc.
  // sentry.captureMessage(`Security Event: ${event}`, 'warning', { extra: details });
}

export function generateSecureRandomString(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  
  return result;
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  // Check both MIME type and file extension for better security
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  const allowedMimeTypes = allowedTypes.map(type => type.toLowerCase());
  const allowedExtensions = allowedTypes.map(type => 
    type.replace('image/', '').replace('video/', '')
  );
  
  return allowedMimeTypes.includes(mimeType) && 
         (extension ? allowedExtensions.includes(extension) : false);
}