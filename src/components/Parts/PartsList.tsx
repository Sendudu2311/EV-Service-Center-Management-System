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
  const [allParts, setAllParts] = useState<Part[]>([]); // Store all parts
  const [filteredParts, setFilteredParts] = useState<Part[]>([]); // Filtered results
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
  const itemsPerPage = 12;

  // Fetch all parts once on mount
  const fetchAllParts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch all parts without pagination
      const response = await fetch(`/api/parts?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllParts(data.data || []);
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

  // Filter and search parts on frontend
  useEffect(() => {
    let results = [...allParts];

    // Apply search filter (search in name, partNumber, description, brand)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(part =>
        part.name.toLowerCase().includes(searchLower) ||
        part.partNumber.toLowerCase().includes(searchLower) ||
        part.brand.toLowerCase().includes(searchLower) ||
        (part.description && part.description.toLowerCase().includes(searchLower)) ||
        part.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (filters.category) {
      results = results.filter(part => part.category === filters.category);
    }

    // Apply brand filter
    if (filters.brand) {
      results = results.filter(part => part.brand.toLowerCase() === filters.brand.toLowerCase());
    }

    // Apply stock status filter
    if (filters.stockStatus) {
      results = results.filter(part => {
        const { currentStock, reorderPoint } = part.inventory;
        if (filters.stockStatus === 'out-of-stock') return currentStock === 0;
        if (filters.stockStatus === 'low-stock') return currentStock > 0 && currentStock <= reorderPoint;
        if (filters.stockStatus === 'in-stock') return currentStock > reorderPoint;
        return true;
      });
    }

    // Apply active status filter
    if (filters.isActive !== '') {
      results = results.filter(part =>
        part.isActive === (filters.isActive === 'true')
      );
    }

    setFilteredParts(results);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, filters, allParts]);

  // Fetch parts on mount only
  useEffect(() => {
    fetchAllParts();
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(filteredParts.length / itemsPerPage);
  const totalParts = filteredParts.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentParts = filteredParts.slice(startIndex, endIndex);

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
                placeholder="Search parts by name, part number, brand, or tags..."
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
                <option value="battery">Battery</option>
                <option value="motor">Motor</option>
                <option value="electronics">Electronics</option>
                <option value="charging">Charging</option>
                <option value="body">Body</option>
                <option value="interior">Interior</option>
                <option value="tires">Tires & Wheels</option>
                <option value="fluids">Fluids & Lubricants</option>
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
                  <option value="true">Active Only</option>
                  <option value="false">Inactive Only</option>
                </select>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-text-muted">
            Showing {startIndex + 1}-{Math.min(endIndex, totalParts)} of {totalParts} parts
            {searchTerm && <span className="ml-2 text-lime-400">• Search: "{searchTerm}"</span>}
          </div>
        </div>
      )}

      {/* Parts Grid */}
      {currentParts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted">No parts found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentParts.map((part) => {
            const stockInfo = getStockStatus(part);

            return (
              <div key={part._id} className="bg-dark-300 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                {/* Part Image */}
                <div className="h-48 bg-dark-200 relative">
                  {part.images && part.images.length > 0 ? (
                    <img
                      src={part.images[0].url}
                      alt={part.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PhotoIcon className="w-16 h-16 text-text-muted" />
                    </div>
                  )}
                  {/* Stock Status Badge */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${stockInfo.color}`}>
                    {stockInfo.label}
                  </div>
                  {/* Recommended Badge */}
                  {part.isRecommended && (
                    <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold bg-lime-500 text-dark-400">
                      Recommended
                    </div>
                  )}
                </div>

                {/* Part Info */}
                <div className="p-4">
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold text-white truncate">{part.name}</h3>
                    <p className="text-sm text-text-muted">{part.partNumber}</p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Brand:</span>
                      <span className="text-white font-medium">{part.brand}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Category:</span>
                      <span className="text-white font-medium capitalize">{part.category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Stock:</span>
                      <span className="text-white font-medium">
                        {part.inventory.currentStock} units
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Price:</span>
                      <span className="text-lime-400 font-semibold">
                        {formatCurrency(part.pricing.retail)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {showActions && onEditPart && (
                    <button
                      onClick={() => onEditPart(part)}
                      className="w-full px-4 py-2 bg-lime-500 hover:bg-lime-600 text-dark-400 rounded-md font-medium transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-dark-300 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-200 transition-colors"
          >
            Previous
          </button>

          <div className="flex space-x-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    currentPage === pageNum
                      ? 'bg-lime-500 text-dark-400 font-bold'
                      : 'bg-dark-300 text-white hover:bg-dark-200'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-dark-300 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-200 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PartsList;