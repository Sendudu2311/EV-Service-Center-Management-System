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
  const [mergeOnDuplicate, setMergeOnDuplicate] = useState(true); // NEW: Merge duplicates by default

  const requiredFields = ['name', 'partNumber', 'category', 'brand'];
  const categories = ['battery', 'motor', 'charging', 'electronics', 'body', 'interior', 'safety', 'consumables'];

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

    // Validate category - case insensitive
    if (row.category && !categories.includes(row.category.toLowerCase())) {
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
  };;

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

        // Map headers to expected field names - comprehensive mapping
        const headers = jsonData[0];
        const headerMapping: { [key: string]: string } = {
          // Basic fields
          'Part Name': 'name',
          'Name': 'name',
          'Part Number': 'partNumber',
          'PartNumber': 'partNumber',
          'Category': 'category',
          'Subcategory': 'subcategory',
          'Brand': 'brand',
          'Model': 'model',
          'Description': 'description',
          
          // Specifications
          'Spec Voltage': 'specVoltage',
          'Spec Power': 'specPower',
          'Dim Length': 'dimLength',
          'Dim Width': 'dimWidth',
          'Dim Height': 'dimHeight',
          'Spec Other': 'specOther',
          
          // Compatibility
          'Compatibility Makes': 'makes',
          'Compatibility Models': 'models',
          'Compatibility Years Min': 'yearsMin',
          'Compatibility Years Max': 'yearsMax',
          'Battery Types': 'batteryTypes',
          
          // Pricing
          'Cost Price': 'costPrice',
          'CostPrice': 'costPrice',
          'Retail Price': 'retailPrice',
          'RetailPrice': 'retailPrice',
          'Wholesale Price': 'wholesalePrice',
          'WholesalePrice': 'wholesalePrice',
          'Currency': 'currency',
          
          // Supplier
          'Supplier Name': 'supplierName',
          'Supplier Contact': 'supplierContact',
          'Supplier Notes': 'supplierNotes',
          
          // Inventory
          'Current Stock': 'currentStock',
          'CurrentStock': 'currentStock',
          'Reserved Stock': 'reservedStock',
          'Min Stock Level': 'minStockLevel',
          'MinStockLevel': 'minStockLevel',
          'Max Stock Level': 'maxStockLevel',
          'MaxStockLevel': 'maxStockLevel',
          'Reorder Point': 'reorderPoint',
          'Average Usage': 'averageUsage',
          
          // Other fields
          'Lead Time (days)': 'leadTime',
          'Warranty Duration (days)': 'warrantyDuration',
          'Warranty Type': 'warrantyType',
          'Warranty Description': 'warrantyDescription',
          'Tags (comma separated)': 'tags',
          'Image URLs (comma separated)': 'images',
          'Is Recommended (true/false)': 'isRecommended',
          'Is Active (true/false)': 'isActive',
          'Is Discontinued (true/false)': 'isDiscontinued',
          'Replacement Part Numbers (comma separated)': 'replacementParts'
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
          toast(`${allErrors.length} validation errors found`);
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Failed to parse Excel file');
      }
    };

    reader.readAsArrayBuffer(file);
  };;

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix all validation errors before importing');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const token = localStorage.getItem('token');
      const payload = importData.map((row) => {
        // Parse images and tags if provided as comma-separated strings
        let images = [] as any[];
        if (row.images) {
          if (typeof row.images === 'string') {
            images = row.images.split(',').map((s: string) => ({ url: s.trim(), isPrimary: false }));
          } else if (Array.isArray(row.images)) {
            images = row.images.map((u: string) => ({ url: u, isPrimary: false }));
          }
        }

        let tags = [] as string[];
        if (row.tags) {
          if (typeof row.tags === 'string') tags = row.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
          else if (Array.isArray(row.tags)) tags = row.tags.map((s: any) => String(s).trim()).filter(Boolean);
        }

        const pricing = {
          cost: Number(row.costPrice ?? row.cost ?? 0) || 0,
          retail: Number(row.retailPrice ?? row.retail ?? 0) || 0,
          wholesale: Number(row.wholesalePrice ?? row.wholesale ?? 0) || 0,
          currency: row.currency || 'VND'
        };

        const inventory = {
          currentStock: Number(row.currentStock ?? 0) || 0,
          reservedStock: Number(row.reservedStock ?? 0) || 0,
          usedStock: Number(row.usedStock ?? 0) || 0,
          minStockLevel: Number(row.minStockLevel ?? 0) || 0,
          maxStockLevel: Number(row.maxStockLevel ?? 0) || 0,
          reorderPoint: Number(row.reorderPoint ?? 0) || 0,
          averageUsage: Number(row.averageUsage ?? 0) || 0
        };

        // Handle years properly - can be from separate min/max columns or JSON string
        let years = undefined;
        if (row.yearsMin || row.yearsMax) {
          years = {
            min: Number(row.yearsMin) || undefined,
            max: Number(row.yearsMax) || undefined
          };
        } else if (row.years) {
          if (typeof row.years === 'string') {
            try {
              years = JSON.parse(row.years);
            } catch (e) {
              // If not JSON, try to parse as "min-max" format
              const yearMatch = row.years.match(/(\d{4})-(\d{4})/);
              if (yearMatch) {
                years = { min: Number(yearMatch[1]), max: Number(yearMatch[2]) };
              }
            }
          } else {
            years = row.years;
          }
        }

        const compatibility = {
          makes: row.makes ? String(row.makes).split(',').map((s: string) => s.trim()) : [],
          models: row.models ? String(row.models).split(',').map((s: string) => s.trim()) : [],
          years,
          batteryTypes: row.batteryTypes ? String(row.batteryTypes).split(',').map((s: string) => s.trim()) : []
        };

        // Handle specifications
        const specifications: any = {};
        if (row.specVoltage || row.voltage) specifications.voltage = Number(row.specVoltage || row.voltage);
        if (row.specPower || row.power) specifications.power = Number(row.specPower || row.power);
        
        // Handle dimensions
        if (row.dimLength || row.dimWidth || row.dimHeight) {
          specifications.dimensions = {};
          if (row.dimLength) specifications.dimensions.length = Number(row.dimLength);
          if (row.dimWidth) specifications.dimensions.width = Number(row.dimWidth);
          if (row.dimHeight) specifications.dimensions.height = Number(row.dimHeight);
        }
        
        // Handle spec other - parse key:value;key:value format
        if (row.specOther) {
          try {
            if (typeof row.specOther === 'string') {
              const otherObj: any = {};
              row.specOther.split(';').forEach((pair: string) => {
                const [key, value] = pair.split(':');
                if (key && value) {
                  otherObj[key.trim()] = isNaN(Number(value.trim())) ? value.trim() : Number(value.trim());
                }
              });
              specifications.other = otherObj;
            } else {
              specifications.other = row.specOther;
            }
          } catch (e) {
            specifications.other = row.specOther;
          }
        }

        // Handle warranty
        let warranty = undefined;
        if (row.warrantyDuration || row.warrantyType || row.warrantyDescription) {
          warranty = {
            duration: row.warrantyDuration ? Number(row.warrantyDuration) : undefined,
            type: row.warrantyType || 'manufacturer',
            description: row.warrantyDescription || ''
          };
        }

        // Handle supplier info
        let supplierInfo = undefined;
        if (row.supplierName || row.supplierContact || row.supplierNotes) {
          supplierInfo = {
            name: row.supplierName || '',
            contact: row.supplierContact || '',
            notes: row.supplierNotes || ''
          };
        }

        return {
          name: row.name,
          partNumber: row.partNumber,
          description: row.description || '',
          category: (row.category || '').toLowerCase(), // Ensure lowercase
          subcategory: row.subcategory || '',
          brand: row.brand || '',
          model: row.model || '',
          pricing,
          inventory,
          compatibility,
          specifications,
          supplierInfo,
          warranty,
          leadTime: row.leadTime ? Number(row.leadTime) : undefined,
          isActive: row.isActive !== undefined ? Boolean(row.isActive === 'true' || row.isActive === true) : true,
          isRecommended: row.isRecommended !== undefined ? Boolean(row.isRecommended === 'true' || row.isRecommended === true) : false,
          isDiscontinued: row.isDiscontinued !== undefined ? Boolean(row.isDiscontinued === 'true' || row.isDiscontinued === true) : false,
          tags,
          images
        };
      });

      // Send single bulk request
      const response = await fetch('/api/parts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || 'Import failed');
      }

      const result = await response.json();
      const summary = result.summary || { created: 0, merged: 0, skipped: 0, errors: 0 };
      const totalSuccess = summary.created + summary.merged;
      
      let toastMessage = `Import completed: ${totalSuccess} parts processed`;
      if (summary.created > 0) toastMessage += ` (${summary.created} created`;
      if (summary.merged > 0) toastMessage += `${summary.created > 0 ? ', ' : '('}${summary.merged} merged`;
      if (summary.skipped > 0) toastMessage += `${totalSuccess > 0 ? ', ' : '('}${summary.skipped} skipped`;
      if (summary.errors > 0) toastMessage += `${totalSuccess > 0 || summary.skipped > 0 ? ', ' : '('}${summary.errors} errors`;
      if (summary.created > 0 || summary.merged > 0 || summary.skipped > 0 || summary.errors > 0) toastMessage += ')';
      
      if (totalSuccess === result.summary?.total) {
        toast.success(toastMessage);
      } else {
        toast.success(toastMessage);
        console.warn('Import results', result.results);
      }

      onImportComplete?.();
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };;

  const downloadTemplate = () => {
    const templateData = [
      [
        'Part Name', 'Part Number', 'Category', 'Subcategory', 'Brand', 'Model', 'Description',
        'Spec Voltage', 'Spec Power', 'Dim Length', 'Dim Width', 'Dim Height', 'Spec Other',
        'Compatibility Makes', 'Compatibility Models', 'Compatibility Years Min', 'Compatibility Years Max', 'Battery Types',
        'Cost Price', 'Retail Price', 'Wholesale Price', 'Currency',
        'Supplier Name', 'Supplier Contact', 'Supplier Notes',
        'Current Stock', 'Reserved Stock', 'Min Stock Level', 'Max Stock Level', 'Reorder Point', 'Average Usage',
        'Lead Time (days)', 
        'Warranty Duration (months)', 'Warranty Type', 'Warranty Description',
        'Tags (comma separated)', 'Image URLs (comma separated)', 'Is Recommended (true/false)', 'Is Active (true/false)', 'Is Discontinued (true/false)'
      ],
      [
        '22kW Onboard Charger (Template Example)', 'CHG-ONBOARD-22KW-001', 'charging', 'onboard-charger', 'ChargeMax', '', 'High-efficiency 22kW onboard charging unit for EV',
        '400', '22', '400', '300', '150', 'efficiency:95;cooling:liquid',
        'VinFast,Hyundai,BMW', 'VF e34,IONIQ 5,i4', '2022', '2025', 'lithium-ion',
        '3500000', '5500000', '4500000', 'VND',
        'ChargeMax Technologies', 'info@chargemax.com', 'Specialized EV charging equipment',
        '15', '2', '5', '25', '10', '4',
        '10', 
        '24', 'manufacturer', '24 months manufacturer warranty covering defects',
        'charging,onboard,22kw,charger,fast-charging', 'https://res.cloudinary.com/de9bsmb2q/image/upload/v1759333457/ev-service/parts/dtl5pim5rzi0whrrvgkx.jpg', 'true', 'true', 'false'
      ],
      [
        'DC-DC Converter 12V 125A (Template Example)', 'ELC-DC-CONVERTER-125A-001', 'electronics', 'power-converter', 'PowerTech', '', 'High voltage to 12V DC converter for auxiliary systems',
        '12', '1.5', '250', '180', '80', 'inputVoltage:250-450V;outputCurrent:125A;efficiency:92',
        'Tesla,VinFast,Hyundai', 'Model 3,Model Y,VF e34,IONIQ 5', '2020', '2025', 'lithium-ion',
        '2000000', '3200000', '2600000', 'VND',
        'PowerTech Solutions', 'support@powertech.com', 'Automotive power electronics specialist',
        '20', '3', '8', '35', '15', '7',
        '7', 
        '12', 'manufacturer', '12 months manufacturer warranty',
        'electronics,dc-converter,12v,power,auxiliary', 'https://res.cloudinary.com/de9bsmb2q/image/upload/v1759461734/ev-service/parts/k9edp8mqhw1yham2nt46.jpg', 'true', 'true', 'false'
      ],
      [
        '22kW Onboard Charger (TEST: Merge with existing stock)', 'CHG-ONBOARD-22KW-001', 'charging', 'onboard-charger', 'ChargeMax', '', 'High-efficiency 22kW onboard charging unit - THIS PART EXISTS IN DB WITH STOCK 12',
        '400', '22', '400', '300', '150', 'efficiency:95;cooling:liquid',
        'VinFast,Hyundai,BMW', 'VF e34,IONIQ 5,i4', '2022', '2025', 'lithium-ion',
        '3500000', '5500000', '4500000', 'VND',
        'ChargeMax Technologies', 'info@chargemax.com', 'Specialized EV charging equipment',
        '10', '2', '5', '25', '10', '4',
        '10', 
        '24', 'manufacturer', '24 months manufacturer warranty covering defects',
        'charging,onboard,22kw,charger,fast-charging', 'https://res.cloudinary.com/de9bsmb2q/image/upload/v1759333457/ev-service/parts/dtl5pim5rzi0whrrvgkx.jpg', 'true', 'true', 'false'
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 30 }, // Part Name
      { wch: 20 }, // Part Number
      { wch: 15 }, // Category
      { wch: 18 }, // Subcategory
      { wch: 12 }, // Brand
      { wch: 12 }, // Model
      { wch: 25 }, // Description
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, // Specifications
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, // Compatibility
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, // Pricing
      { wch: 20 }, { wch: 18 }, { wch: 15 }, // Supplier
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, // Inventory
      { wch: 12 }, // Lead Time
      { wch: 18 }, { wch: 16 }, { wch: 30 }, // Warranty
      { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 } // Other
    ];
    
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
                      <li>• Optional columns: All specification, compatibility, pricing, inventory, warranty fields</li>
                      <li>• <strong>NEW:</strong> Full warranty support including Duration (months), Type, Description</li>
                      <li>• Category must be one of: {categories.join(', ')}</li>
                      <li>• Choose merge or skip strategy for duplicate part numbers before importing</li>
                    </ul>
                    <button
                      onClick={downloadTemplate}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      📥 Download Complete Excel Template
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

                  {/* Duplicate Handling Option */}
                  {showPreview && importData.length > 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-medium text-yellow-900 mb-3">Duplicate Part Handling</h4>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          checked={mergeOnDuplicate}
                          onChange={() => setMergeOnDuplicate(true)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-yellow-800">
                          <strong>Merge:</strong> If part number exists, increase stock quantity (recommended for inventory updates)
                        </span>
                      </label>
                      <label className="flex items-center cursor-pointer mt-2">
                        <input
                          type="radio"
                          checked={!mergeOnDuplicate}
                          onChange={() => setMergeOnDuplicate(false)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-yellow-800">
                          <strong>Skip:</strong> If part number exists, skip this row (recommended for new part imports)
                        </span>
                      </label>
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