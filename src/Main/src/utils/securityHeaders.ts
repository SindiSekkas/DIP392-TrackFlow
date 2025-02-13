// src/utils/securityHeaders.ts

// Define allowed sources for different resource types
const allowedSources = {
    scripts: [
      "'self'",  // Same origin
      "https://cdnjs.cloudflare.com", // For external libraries
    ],
    styles: [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind
    ],
    images: [
      "'self'",
      "data:", // For data URLs
      "/api/placeholder/", // For placeholder images
    ],
    fonts: [
      "'self'",
      "https://fonts.gstatic.com", // If using Google Fonts
    ],
  };
  
  // Generate Content Security Policy
  export const generateCSP = (): string => {
    return [
      `default-src 'self'`,
      `script-src ${allowedSources.scripts.join(' ')}`,
      `style-src ${allowedSources.styles.join(' ')}`,
      `img-src ${allowedSources.images.join(' ')}`,
      `font-src ${allowedSources.fonts.join(' ')}`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`, // Equivalent to X-Frame-Options: DENY
    ].join('; ');
  };
  
  // Security headers configuration
  export const securityHeaders = {
    // Content Security Policy
    'Content-Security-Policy': generateCSP(),
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Control browser features
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Basic XSS protection for older browsers
    'X-XSS-Protection': '1; mode=block',
    
    // Do not send referrer information to other origins
    'Referrer-Policy': 'same-origin',
  };