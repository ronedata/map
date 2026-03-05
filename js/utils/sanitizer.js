/**
 * Sanitizer Utility Module
 * Provides functions to sanitize user inputs and prevent XSS attacks
 */

/**
 * Sanitizes HTML string to prevent XSS attacks
 * @param {string} str - The string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeHTML(str) {
  if (!str) return '';
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

/**
 * Sanitizes file name for safe display
 * @param {string} fileName - The file name to sanitize
 * @returns {string} Sanitized file name
 */
export function sanitizeFileName(fileName) {
  if (!fileName) return '';
  // Remove any HTML tags and special characters that could cause issues
  return fileName
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>:"\/\\|?*\x00-\x1F]/g, '_') // Replace unsafe characters
    .trim();
}

/**
 * Validates and sanitizes URL parameters
 * @param {string} param - The parameter to validate
 * @returns {string} Sanitized parameter
 */
export function sanitizeParam(param) {
  if (!param) return '';
  return encodeURIComponent(String(param));
}

/**
 * Escapes HTML entities
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHTML(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}
