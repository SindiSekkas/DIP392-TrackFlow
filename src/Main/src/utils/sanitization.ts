// src/utils/sanitization.ts
import DOMPurify from 'dompurify';

// Sanitize HTML content
export const sanitizeHTML = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
};

// Sanitize plain text (remove all HTML)
export const sanitizeText = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim(); // Remove leading/trailing whitespace
};

// Sanitize email addresses
export const sanitizeEmail = (email: string): string => {
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@._-]/g, '');
};

// Sanitize filename
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.'); // Prevent directory traversal
};

// Generic input validator
export const validateInput = (input: string, type: 'email' | 'text' | 'html' | 'filename'): boolean => {
  switch (type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    case 'text':
      return input === sanitizeText(input);
    case 'html':
      return input === sanitizeHTML(input);
    case 'filename':
      return /^[a-zA-Z0-9._-]+$/.test(input);
    default:
      return false;
  }
};