import React, { useState, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, DocumentArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface ImportRow {
  [key: string]: any;
  name?: string;
  partNumber?: string;
  category?: string;
  brand?: string;
  costPrice?: number;
  retailPrice?: number;
  currentStock?: number;
  minStockLevel?: number;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface PartBulkImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

const PartBulkImport: React.FC<PartBulkImportProps> = ({ isOpen, onClose, onImportComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const requiredFields = ['name', 'partNumber', 'category', 'brand'];
  const categories = ['Battery', 'Motor', 'Electronics', 'Charging', 'Body', 'Interior', 'Tires', 'Fluids'];

  const validateRow = (row: ImportRow, index: number): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Check required fields
    requiredFields.forEach(field => {
      if (!row[field] || String(row[field]).trim() === '') {
        errors.push({
          row: index + 1,
          field,
          message: `${field} is required`
        });
      }
    });

    // Validate category
    if (row.category && !categories.includes(row.category)) {
      errors.push({
        row: index + 1,
        field: 'category',
        message: `Category must be one of: ${categories.join(', ')}`
      });
    }

    // Validate numeric fields
    const numericFields = ['costPrice', 'retailPrice', 'currentStock', 'minStockLevel'];
    numericFields.forEach(field => {
      if (row[field] !== undefined && isNaN(Number(row[field]))) {
        errors.push({
          row: index + 1,
          field,
          message: `${field} must be a valid number`
        });
      }
    });

    return errors;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setSelectedFile(file);
    parseExcelFile(file);
  };

  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header mapping
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ''
        }) as any[][];

        if (jsonData.length < 2) {
          toast.error('Excel file must contain at least a header row and one data row');
          return;
        }

        // Map headers to expected field names
        const headers = jsonData[0];
        const headerMapping: { [key: string]: string } = {
          'Part Name': 'name',
          'Name': 'name',
          'Part Number': 'partNumber',
          'PartNumber': 'partNumber',
          'Category': 'category',
          'Brand': 'brand',
          'Description': 'description',
          'Cost Price': 'costPrice',
          'CostPrice': 'costPrice',
          'Retail Price': 'retailPrice',
          'RetailPrice': 'retailPrice',
          'Current Stock': 'currentStock',
          'CurrentStock': 'currentStock',
          'Min Stock Level': 'minStockLevel',
          'MinStockLevel': 'minStockLevel',
          'Model': 'model',
          'Subcategory': 'subcategory'
        };

        // Process data rows
        const processedData: ImportRow[] = jsonData.slice(1).map(row => {
          const processedRow: ImportRow = {};
          headers.forEach((header, index) => {
            const mappedField = headerMapping[header] || header.toLowerCase().replace(/\s+/g, '');
            processedRow[mappedField] = row[index];
          });
          return processedRow;
        });

        setImportData(processedData);
        
        // Validate all rows
        const allErrors: ValidationError[] = [];
        processedData.forEach((row, index) => {
          const rowErrors = validateRow(row, index);
          allErrors.push(...rowErrors);
        });
        
        setValidationErrors(allErrors);
        setShowPreview(true);
        
        if (allErrors.length === 0) {
          toast.success(`${processedData.length} rows loaded successfully`);
        } else {
          toast.warning(`${allErrors.length} validation errors found`);
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Failed to parse Excel file');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix all validation errors before importing');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const token = localStorage.getItem('token');
      const successCount = importData.length;
      let processedCount = 0;

      // Process in batches to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < importData.length; i += batchSize) {
        const batch = importData.slice(i, i + batchSize);
        
        const promises = batch.map(async (row) => {
          const partData = {
            name: row.name,
            partNumber: row.partNumber,
            description: row.description || '',
            category: row.category,
            subcategory: row.subcategory || '',
            brand: row.brand,
            model: row.model || '',
            pricing: {
              cost: parseFloat(row.costPrice) || 0,
              retail: parseFloat(row.retailPrice) || 0,
              wholesale: parseFloat(row.wholesalePrice) || 0,
              currency: 'VND'
            },
            inventory: {
              currentStock: parseInt(row.currentStock) || 0,
              reservedStock: 0,
              usedStock: 0,
              minStockLevel: parseInt(row.minStockLevel) || 10,
              maxStockLevel: parseInt(row.maxStockLevel) || 100,
              reorderPoint: parseInt(row.reorderPoint) || 20,
              averageUsage: 0
            },
            isActive: true,
            isRecommended: false,
            isDiscontinued: false,
            tags: []
          };

          const response = await fetch('/api/parts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(partData)
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(`Row ${processedCount + 1}: ${error.message}`);
          }

          processedCount++;
          setProgress((processedCount / successCount) * 100);
        });

        await Promise.all(promises);
      }

      toast.success(`Successfully imported ${successCount} parts`);
      onImportComplete?.();
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Part Name', 'Part Number', 'Category', 'Brand', 'Description', 'Cost Price', 'Retail Price', 'Current Stock', 'Min Stock Level'],
      ['Sample Battery', 'BAT001', 'Battery', 'BrandX', 'High performance lithium battery', '1000000', '1500000', '50', '10'],
      ['Sample Motor', 'MOT001', 'Motor', 'BrandY', 'Electric motor for EV', '5000000', '7500000', '20', '5']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Parts Template');
    XLSX.writeFile(workbook, 'parts_import_template.xlsx');
  };

  const resetForm = () => {
    setSelectedFile(null);
    setImportData([]);
    setValidationErrors([]);
    setShowPreview(false);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    Bulk Import Parts
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Instructions */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Import Instructions</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Upload an Excel file (.xlsx or .xls) with part data</li>
                      <li>• Required columns: Part Name, Part Number, Category, Brand</li>
                      <li>• Optional columns: Description, Cost Price, Retail Price, Current Stock, Min Stock Level</li>
                      <li>• Category must be one of: {categories.join(', ')}</li>
                    </ul>
                    <button
                      onClick={downloadTemplate}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Download Template
                    </button>
                  </div>

                  {/* File Upload */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Click to upload Excel file
                        </button>
                        <p className="text-sm text-gray-500 mt-1">or drag and drop</p>
                      </div>
                      {selectedFile && (
                        <p className="mt-2 text-sm text-gray-600">
                          Selected: {selectedFile.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                        <h4 className="font-medium text-red-900">
                          Validation Errors ({validationErrors.length})
                        </h4>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {validationErrors.slice(0, 10).map((error, index) => (
                          <p key={index} className="text-sm text-red-700">
                            Row {error.row}, {error.field}: {error.message}
                          </p>
                        ))}
                        {validationErrors.length > 10 && (
                          <p className="text-sm text-red-700 font-medium">
                            ... and {validationErrors.length - 10} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Preview Data */}
                  {showPreview && importData.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">
                        Preview ({importData.length} rows)
                      </h4>
                      <div className="overflow-x-auto max-h-60">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Part Number
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Brand
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Cost Price
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Stock
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {importData.slice(0, 5).map((row, index) => (
                              <tr key={index} className={validationErrors.some(e => e.row === index + 1) ? 'bg-red-50' : ''}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {row.name}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {row.partNumber}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {row.category}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {row.brand}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {row.costPrice ? `${Number(row.costPrice).toLocaleString()} VND` : '-'}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  {row.currentStock || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importData.length > 5 && (
                          <p className="text-sm text-gray-500 mt-2 text-center">
                            ... and {importData.length - 5} more rows
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {isProcessing && (
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Importing parts...</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-4 pt-6 border-t">
                    <button
                      onClick={resetForm}
                      disabled={isProcessing}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Reset
                    </button>
                    <button
                      onClick={onClose}
                      disabled={isProcessing}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={!showPreview || validationErrors.length > 0 || isProcessing}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isProcessing ? 'Importing...' : `Import ${importData.length} Parts`}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PartBulkImport;