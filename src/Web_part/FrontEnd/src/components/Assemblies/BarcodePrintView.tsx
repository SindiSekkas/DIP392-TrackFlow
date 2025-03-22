// src/components/Assemblies/BarcodePrintView.tsx
import React, { useRef, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface Barcode {
  id: string;
  barcode: string;
  assemblyName: string;
  projectName: string;
}

interface BarcodePrintViewProps {
  barcodes: Barcode[];
  onClose: () => void;
}

const BarcodePrintView: React.FC<BarcodePrintViewProps> = ({ barcodes, onClose }) => {
  const printContainerRef = useRef<HTMLDivElement>(null);
  
  // Generate barcodes on component mount
  useEffect(() => {
    if (printContainerRef.current) {
      const barcodeElements = printContainerRef.current.querySelectorAll('.barcode-svg');
      
      barcodeElements.forEach((element, index) => {
        if (index < barcodes.length) {
          JsBarcode(element, barcodes[index].barcode, {
            format: "CODE128",
            width: 2,
            height: 50,
            displayValue: true,
            fontSize: 14,
            margin: 10,
            background: "#ffffff"
          });
        }
      });
    }
  }, [barcodes]);
  
  // Handle print functionality
  const handlePrint = () => {
    const printContent = printContainerRef.current?.innerHTML || '';
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print barcodes');
      return;
    }
    
    // Write print content to the new window
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcodes</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
            }
            .barcode-container {
              display: inline-block;
              page-break-inside: avoid;
              margin: 5mm;
              padding: 5mm;
              border: 1px solid #ccc;
              background: #fff;
            }
            .assembly-info {
              margin-top: 5mm;
              text-align: center;
              font-size: 12px;
            }
            .project-info {
              color: #666;
              font-size: 10px;
            }
            @media print {
              body {
                margin: 0;
              }
              .print-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-grid">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    
    // Wait for content to load, then print
    printWindow.document.close();
    printWindow.onload = function() {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = function() {
        printWindow.close();
      };
    };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Print Barcodes</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Print controls */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-gray-700">
                {barcodes.length} barcode{barcodes.length !== 1 ? 's' : ''} ready to print
              </span>
            </div>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <Printer size={18} className="mr-2" />
              Print
            </button>
          </div>
        </div>
        
        {/* Print preview */}
        <div className="flex-1 overflow-auto p-4">
          <div 
            ref={printContainerRef}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
          >
            {barcodes.map((barcode) => (
              <div key={barcode.id} className="barcode-container bg-white p-4 border border-gray-200 rounded-md">
                <svg className="barcode-svg w-full"></svg>
                <div className="assembly-info">
                  <div className="font-medium">{barcode.assemblyName}</div>
                  <div className="project-info">{barcode.projectName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodePrintView;