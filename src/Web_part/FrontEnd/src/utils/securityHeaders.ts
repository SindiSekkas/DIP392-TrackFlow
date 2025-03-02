// src/utils/securityHeaders.ts

interface CSPDirectives {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'font-src': string[];
  'connect-src': string[];
  'base-uri': string[];
  'form-action': string[];
  'frame-ancestors': string[];
}

// Generate CSP directives based on environment
const generateCSPDirectives = (isDev: boolean): CSPDirectives => ({
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    'https://cdnjs.cloudflare.com',
    ...(isDev ? ["'unsafe-eval'", "'unsafe-inline'"] : [])
  ],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', '/api/placeholder/'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': [
    "'self'",
    process.env.VITE_SUPABASE_URL || '',
    'wss://*.supabase.co'
  ],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"]
});

// Generate Content Security Policy string
const generateCSP = (isDev: boolean): string => {
  const directives = generateCSPDirectives(isDev);
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.filter(Boolean).join(' ')}`)
    .join('; ');
};

// Generate security headers based on environment
export const generateSecurityHeaders = (isDev: boolean) => ({
  ...(isDev ? {} : {
    'Content-Security-Policy': generateCSP(isDev)
  }),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  ...(isDev ? {} : {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  })
});