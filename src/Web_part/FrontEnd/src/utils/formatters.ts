// src/utils/formatters.ts

/**
 * Formats the date into a readable format
 */
export const formatDate = (dateString: string | Date): string => {
    if (!dateString) return '';
    
    const date = typeof dateString === 'string' 
      ? new Date(dateString) 
      : dateString;
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  /**
   * Formats the weight with units
   */
  export const formatWeight = (weight?: number): string => {
    if (!weight && weight !== 0) return '';
    return `${weight.toLocaleString()} kg`;
  };
  
  /**
   * Formats the file size
   */
  export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

/**
 * Formats dimensions with units
 */
export const formatDimension = (value?: number): string => {
  if (!value && value !== 0) return '—';
  return `${value.toLocaleString()} mm`;
};

/**
 * Performs natural sorting for strings with numbers
 * Example: "Test1", "Test2", "Test12" will be sorted as "Test1", "Test2", "Test12"
 */
export const naturalSort = (a: string, b: string): number => {
  // Handle null or undefined values to ensure we always return a number
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  const regex = /(\d+)|(\D+)/g;
  const aMatches = String(a).toLowerCase().match(regex) || [];
  const bMatches = String(b).toLowerCase().match(regex) || [];
  
  for (let i = 0; i < Math.min(aMatches.length, bMatches.length); i++) {
    const aMatch = aMatches[i];
    const bMatch = bMatches[i];
    
    // If both parts are numeric, compare them as numbers
    if (/^\d+$/.test(aMatch) && /^\d+$/.test(bMatch)) {
      const aNum = parseInt(aMatch, 10);
      const bNum = parseInt(bMatch, 10);
      if (aNum !== bNum) {
        return aNum - bNum;
      }
    } 
    // Otherwise, compare them as strings
    else if (aMatch !== bMatch) {
      return aMatch < bMatch ? -1 : 1;
    }
  }
  
  // If we get here, one string is a prefix of the other
  return aMatches.length - bMatches.length;
};