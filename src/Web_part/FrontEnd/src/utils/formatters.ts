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