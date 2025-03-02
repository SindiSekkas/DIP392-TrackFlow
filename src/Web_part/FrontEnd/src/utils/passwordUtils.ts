// src/utils/passwordUtils.ts

/**
 * Generates a random password with specified complexity
 * @param length The length of the password to generate (default: 10)
 * @returns A random password string
 */
export const generateRandomPassword = (length = 10): string => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+{}:"<>?|[];\',./`~';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    
    // Ensure at least one of each character type
    let password = '';
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    
    // Fill the rest with random characters
    for (let i = 4; i < length; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password characters
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  };
  
  /**
   * Checks if a password meets the minimum requirements
   * @param password The password to check
   * @returns Boolean indicating if the password is valid
   */
  export const isValidPassword = (password: string): boolean => {
    // Minimum 8 characters
    if (password.length < 8) return false;
    
    // At least one lowercase letter
    if (!/[a-z]/.test(password)) return false;
    
    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) return false;
    
    // At least one number
    if (!/[0-9]/.test(password)) return false;
    
    // At least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
    
    return true;
  };