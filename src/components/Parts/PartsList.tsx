import React, { useState, useEffect } from 'react';
import { 
  PhotoIcon, 
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Part {
  _id: string;
  partNumber: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  brand: string;
  model?: string;
  specifications?: {
    voltage?: number;
    capacity?: number;
    power?: number;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
      weight?: number;
    };
    material?: string;
    color?: string;
    other?: any;
  };
  compatibility?: {
    makes: string[];
    models: string[];
    years: {
      min: number;
      max: number;
    };
    batteryTypes: string[];
  };
  pricing: {
    cost: number;
    retail: number;
    wholesale?: number;
    currency: string;
  };
  supplierInfo?: {
    name: string;
    contact: string;
    notes?: string;
  };
  inventory: {
    currentStock: number;
    reservedStock?: number;
    usedStock?: number;
    minStockLevel: number;
    maxStockLevel?: number;
    reorderPoint: number;
    averageUsage?: number;
    reservations?: any[];
  };
  leadTime?: number;
  warranty?: {
    duration: number;
    type: string;
    description: string;
  };
  usage?: {
    totalUsed: number;
    lastUsed?: string;
    averageMonthlyUsage: number;
  };
  isRecommended?: boolean;
  isActive: boolean;
  isDiscontinued?: boolean;
  replacementParts?: string[];
  tags: string[];
  images?: Array<{
    url: string;
    publicId: string;
    originalName: string;
  }>;
  documents?: any[];
  createdAt: string;
  updatedAt: string;
}

interface PartsListProps {
  onEditPart?: (part: Part) => void;
  viewMode?: 'management' | 'catalog' | 'low-stock';
  showFilters?: boolean;
  showActions?: boolean;
  filterDefaults?: {
    category?: string;
    brand?: string;
    stockStatus?: string;
    isActive?: string;
  };
}

const PartsList: React.FC<PartsListProps> = ({ 
  onEditPart, 
  viewMode = 'management',
  showFilters = true,
  showActions = true,
  filterDefaults = {}
}) => {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    brand: '',
    stockStatus: '',
    isActive: 'true',
    ...filterDefaults
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalParts, setTotalParts] = useState(0);
  const itemsPerPage = 12;

  const fetchParts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        ...filters,
        search: searchTerm,
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      }).toString();

      const response = await fetch(`/api/parts?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setParts(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotalParts(data.totalParts || data.total || 0);
      } else {
        toast.error('Failed to fetch parts');
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast.error('Error loading parts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, filters]);

  useEffect(() => {
    fetchParts();
  }, [searchTerm, filters, currentPage]);

  const getStockStatus = (part: Part) => {
    const { currentStock, minStockLevel, reorderPoint } = part.inventory;
    
    if (currentStock === 0) {
      return { status: 'out-of-stock', label: 'Out of Stock', color: 'text-white bg-red-600' };
    } else if (currentStock <= reorderPoint) {
      return { status: 'low-stock', label: 'Low Stock', color: 'text-white bg-orange-600' };
    } else if (currentStock <= minStockLevel) {
      return { status: 'warning', label: 'Warning', color: 'text-white bg-orange-600' };
    } else {
      return { status: 'in-stock', label: 'In Stock', color: 'text-white bg-green-600' };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      {showFilters && (
        <div className="bg-dark-300 p-6 rounded-lg shadow">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-text-muted" />
              </div>
              <input
                type="text"
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 bg-dark-300 text-white border border-dark-200 rounded-md leading-5 placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
              />
            </div>

            {/* Filters */}
            <div className="flex space-x-4">
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="border bg-dark-300 text-white border-dark-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
              >
                <option value="">All Categories</option>
                <option value="Battery">Battery</option>
                <option value="Motor">Motor</option>
                <option value="Electronics">Electronics</option>
                <option value="Charging">Charging</option>
                <option value="Body">Body</option>
                <option value="Interior">Interior</option>
                <option value="Tires">Tires</option>
                <option value="Fluids">Fluids</option>
              </select>

              <select
                value={filters.stockStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, stockStatus: e.target.value }))}
                className="border bg-dark-300 text-white border-dark-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
              >
                <option value="">All Stock Status</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>

              {viewMode === 'management' && (
                <select
                  value={filters.isActive}
                  onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
                  className="border bg-dark-300 text-white border-dark-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Parts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parts.map((part) => {
          const stockStatus = getStockStatus(part);
          
          return (
            <div key={part._id} className="bg-dark-300 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Part Image */}
                <div className="w-full h-32 bg-dark-100 rounded-lg mb-4 flex items-center justify-center">
                  {part.images && part.images.length > 0 ? (
                    <img
                      src={part.images[0].url}
                      alt={part.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <PhotoIcon className="h-12 w-12 text-text-muted" />
                  )}
                </div>

                {/* Part Info */}
                <div className="space-y-2">
                  {/* Part Name and Stock Status in same line */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex-1">{part.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted ${stockStatus.color} ml-2`}>
                      {stockStatus.label}
                    </span>
                  </div>
                  
                  <p className="text-sm text-text-muted">#{part.partNumber}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">Category:</span>
                    <span className="text-sm text-text-muted">{part.category}</span>
                  </div>

                  {part.brand && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-muted">Brand:</span>
                      <span className="text-sm text-text-muted">{part.brand}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">Stock:</span>
                    <span className="text-sm text-text-muted">{part.inventory.currentStock}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">Price:</span>
                    <span className="text-sm text-text-muted">
                      {formatCurrency(part.pricing.retail)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {showActions && onEditPart && (
                  <div className="flex justify-end space-x-2 pt-4 border-t border-dark-200 mt-4">
                    <button
                      onClick={() => onEditPart(part)}
                      className="text-sm text-lime-600 hover:text-lime-800 text-text-muted"
                    >
                      {viewMode === 'catalog' ? 'View Details' : 'Edit'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="bg-dark-300 px-4 py-3 flex items-center justify-between border-t border-dark-200 sm:px-6 mt-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-dark-300 text-sm text-text-muted rounded-md text-text-secondary bg-dark-300 hover:bg-dark-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-dark-300 text-sm text-text-muted rounded-md text-text-secondary bg-dark-300 hover:bg-dark-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-text-secondary">
                Showing{' '}
                <span className="text-text-muted">{((currentPage - 1) * itemsPerPage) + 1}</span>
                {' '}to{' '}
                <span className="text-text-muted">
                  {Math.min(currentPage * itemsPerPage, totalParts)}
                </span>
                {' '}of{' '}
                <span className="text-text-muted">{totalParts}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-dark-300 bg-dark-300 text-sm text-text-muted text-text-muted hover:bg-dark-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm text-text-muted ${
                        currentPage === pageNum
                          ? 'z-10 bg-dark-900 border-blue-500 text-lime-600'
                          : 'bg-dark-300 border-dark-300 text-text-muted hover:bg-dark-900'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-dark-300 bg-dark-300 text-sm text-text-muted text-text-muted hover:bg-dark-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {parts.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-text-muted text-lg">No parts found</div>
          <p className="text-text-muted mt-2">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default PartsList;
