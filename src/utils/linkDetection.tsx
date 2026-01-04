import React from 'react';

/**
 * URL detection patterns for various link formats:
 * - Full URLs with protocol (https://, http://)
 * - URLs starting with www.
 * - Bare domain links (domain.tld, domain.tld/path)
 */

// Allowed protocols for security
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Common TLDs for bare domain detection
const COMMON_TLDS = [
  'com', 'org', 'net', 'io', 'co', 'dev', 'app', 'site', 'online', 'tech',
  'ai', 'xyz', 'info', 'biz', 'me', 'tv', 'edu', 'gov', 'uk', 'de', 'fr',
  'jp', 'cn', 'ru', 'br', 'in', 'au', 'ca', 'es', 'it', 'nl', 'se', 'no',
  'fi', 'dk', 'pl', 'cz', 'at', 'ch', 'be', 'ie', 'nz', 'za', 'ke', 'ng',
  'gh', 'ug', 'tz', 'rw', 'et', 'eg', 'ma', 'dz', 'ly', 'sd'
];

// Comprehensive URL regex that matches:
// 1. URLs with protocol (http:// or https://)
// 2. URLs starting with www.
// 3. Bare domains with common TLDs (e.g., example.com, github.com/user)
const URL_REGEX = new RegExp(
  '(' +
    // Protocol URLs: http:// or https://
    'https?:\\/\\/[^\\s<>\\[\\]{}|\\\\^`"\']+' +
    '|' +
    // www URLs: www.example.com
    'www\\.[^\\s<>\\[\\]{}|\\\\^`"\']+' +
    '|' +
    // Bare domains: example.com, github.com/user/repo
    '(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+' +
    '(?:' + COMMON_TLDS.join('|') + ')' +
    '(?:\\/[^\\s<>\\[\\]{}|\\\\^`"\']*)?'  +
  ')',
  'gi'
);

/**
 * Sanitizes a URL to prevent XSS attacks
 * @param url - The URL to sanitize
 * @returns Sanitized URL or null if potentially malicious
 */
export function sanitizeUrl(url: string): string | null {
  try {
    // Add protocol if missing
    let normalizedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.startsWith('www.')) {
        normalizedUrl = 'https://' + url;
      } else {
        normalizedUrl = 'https://' + url;
      }
    }

    // Parse the URL to validate it
    const parsedUrl = new URL(normalizedUrl);

    // Only allow http and https protocols
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return null;
    }

    // Block javascript: and data: URLs that might be disguised
    const lowerHref = parsedUrl.href.toLowerCase();
    if (lowerHref.includes('javascript:') || lowerHref.includes('data:')) {
      return null;
    }

    return parsedUrl.href;
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Truncates a URL for display purposes
 * @param url - The URL to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated URL string
 */
function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;
  
  // Remove protocol for display
  let displayUrl = url.replace(/^https?:\/\//, '');
  // Remove trailing slash
  displayUrl = displayUrl.replace(/\/$/, '');
  
  if (displayUrl.length <= maxLength) return displayUrl;
  
  return displayUrl.substring(0, maxLength - 3) + '...';
}

export interface LinkifyOptions {
  className?: string;
  truncateLength?: number;
  openInNewTab?: boolean;
}

/**
 * Converts plain text with URLs into React elements with clickable links
 * @param text - The text to process
 * @param options - Customization options
 * @returns Array of React nodes (strings and link elements)
 */
export function linkifyText(
  text: string,
  options: LinkifyOptions = {}
): React.ReactNode[] {
  const {
    className = 'text-primary hover:underline break-all',
    truncateLength = 50,
    openInNewTab = true
  } = options;

  if (!text) return [];

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      result.push(text.substring(lastIndex, match.index));
    }

    const matchedUrl = match[0];
    const sanitizedUrl = sanitizeUrl(matchedUrl);

    if (sanitizedUrl) {
      // Create clickable link
      result.push(
        <a
          key={`link-${match.index}`}
          href={sanitizedUrl}
          className={className}
          target={openInNewTab ? '_blank' : undefined}
          rel={openInNewTab ? 'noopener noreferrer' : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {truncateUrl(matchedUrl, truncateLength)}
        </a>
      );
    } else {
      // If URL is invalid/unsafe, just show as text
      result.push(matchedUrl);
    }

    lastIndex = match.index + matchedUrl.length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  // If no matches found, return original text
  if (result.length === 0) {
    return [text];
  }

  return result;
}

/**
 * React component that renders text with clickable links
 */
interface LinkifiedTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
  truncateLength?: number;
  as?: keyof JSX.IntrinsicElements;
}

export function LinkifiedText({
  text,
  className = '',
  linkClassName = 'text-primary hover:underline break-all',
  truncateLength = 50,
  as: Component = 'span'
}: LinkifiedTextProps): React.ReactElement {
  const content = linkifyText(text, {
    className: linkClassName,
    truncateLength,
    openInNewTab: true
  });

  return <Component className={className}>{content}</Component>;
}

export default LinkifiedText;
