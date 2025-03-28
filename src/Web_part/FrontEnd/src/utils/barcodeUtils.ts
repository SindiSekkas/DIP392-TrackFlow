// src/utils/barcodeUtils.ts
import JsBarcode from 'jsbarcode';

/**
 * Generate a unique barcode string
 * @param prefix Optional prefix for the barcode
 * @returns A unique barcode string
 */
export const generateUniqueBarcode = (prefix = 'ASM'): string => {
  // Create a random code with timestamp to ensure uniqueness
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Render a barcode onto an SVG element
 * @param element SVG element or selector to render the barcode
 * @param value Barcode value to render
 * @param options Optional rendering options
 */
export const renderBarcode = (
  element: string | HTMLElement | SVGElement,
  value: string,
  options: {
    format?: string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    margin?: number;
    background?: string;
  } = {}
): void => {
  JsBarcode(element, value, {
    format: options.format || "CODE128",
    width: options.width || 2,
    height: options.height || 100,
    displayValue: options.displayValue !== undefined ? options.displayValue : true,
    fontSize: options.fontSize || 20,
    margin: options.margin || 10,
    background: options.background || "#ffffff"
  });
};

/**
 * Create a downloadable barcode image
 * @param barcodeValue The barcode value to encode
 * @param fileName Optional filename for the download
 */
export const createDownloadableBarcode = (
  barcodeValue: string,
  fileName = 'barcode.png'
): void => {
  // Create a temporary SVG element
  const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  
  // Render the barcode to the SVG
  renderBarcode(svgElement, barcodeValue);
  
  // Convert SVG to a data URL
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  
  // Create a temporary image to convert SVG to PNG
  const img = new Image();
  img.onload = () => {
    // Create a canvas to draw the image
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Draw the image to the canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      
      // Convert canvas to a data URL
      const pngUrl = canvas.toDataURL('image/png');
      
      // Create a download link
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = fileName;
      
      // Trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up
      URL.revokeObjectURL(svgUrl);
    }
  };
  
  // Load the SVG into the image
  img.src = svgUrl;
};