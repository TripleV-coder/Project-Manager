// @ts-nocheck -- TODO(S2-#11): migrate to .ts with proper types
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * @param {string} dirty - The untrusted HTML string
 * @returns {string} Sanitized HTML safe for rendering
 */
export function sanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
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
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

/**
 * Strip all HTML tags, returning plain text only.
 * @param {string} dirty - The untrusted HTML string
 * @returns {string} Plain text with no HTML
 */
export function stripHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}
