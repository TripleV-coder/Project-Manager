import DOMPurify from 'dompurify';

const ALLOWED_TAGS_SET = new Set([
  'b',
  'i',
  'em',
  'strong',
  'a',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'code',
  'pre',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'span',
]);

/**
 * Server-safe fallback HTML sanitizer that doesn't rely on jsdom
 * Strips script, style, iframe, event handlers and unallowed tags
 */
function serverSanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';

  const cleaned = dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:[^"']*/gi, '');

  return cleaned.replace(/<\/?([a-z0-9]+)\b[^>]*>/gi, (match, tagName) => {
    const lower = tagName.toLowerCase();
    if (ALLOWED_TAGS_SET.has(lower)) {
      return match.replace(/\s+on\w+="[^"]*"/gi, '').replace(/\s+on\w+='[^']*'/gi, '');
    }
    return '';
  });
}

/**
 * Sanitize HTML content to prevent XSS attacks.
 * @param {string} dirty - The untrusted HTML string
 * @returns {string} Sanitized HTML safe for rendering
 */
export function sanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  if (typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: Array.from(ALLOWED_TAGS_SET),
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
  }
  return serverSanitizeHtml(dirty);
}

/**
 * Strip all HTML tags, returning plain text only.
 * @param {string} dirty - The untrusted HTML string
 * @returns {string} Plain text with no HTML
 */
export function stripHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  if (typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
  }
  return dirty.replace(/<[^>]*>?/gm, '');
}
