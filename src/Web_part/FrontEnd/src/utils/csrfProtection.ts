// src/utils/csrfProtection.ts

// Generate a cryptographically secure random token
export const generateCSRFToken = (): string => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  };
  
  // Verify that the provided token matches the stored one
  export const verifyCSRFToken = (token: string, storedToken: string): boolean => {
    if (!token || !storedToken) return false;
    return token === storedToken;
  };
  
  // Middleware for adding CSRF token to requests
  export const csrfMiddleware = {
    // Add token to request headers
    requestInterceptor: (config: any) => {
      const token = localStorage.getItem('csrf_token');
      if (token) {
        config.headers['X-CSRF-Token'] = token;
      }
      return config;
    },
  
    // Setup initial CSRF protection
    setupCSRF: () => {
      if (!localStorage.getItem('csrf_token')) {
        localStorage.setItem('csrf_token', generateCSRFToken());
      }
    }
  };