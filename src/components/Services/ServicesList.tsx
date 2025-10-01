import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Service {
  _id: string;
  name: string;
  code: string;
  description: string;
  category: 'battery' | 'motor' | 'charging' | 'electronics' | 'body' | 'general' | 'diagnostic';
  subcategory?: string;
  basePrice: number;
  estimatedDuration: number;
  skillLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  requiredCertifications: string[];
  requiredTools: Array<{
    name: string;
    isRequired: boolean;
  }>;
  checklist: Array<{
    step: string;
    category: 'safety' | 'preparation' | 'execution' | 'verification' | 'cleanup';
    isRequired: boolean;
    estimatedTime: number;
  }>;
  commonParts: Array<{
    partId: string;
    quantity: number;
    isOptional: boolean;
  }>;
  warranty?: {
    duration: number;
    description: string;
  };
  isActive: boolean;
  applicableVehicles?: {
    makes: string[];
    models: string[];
    years: {
      min: number;
      max: number;
    };
    batteryTypes: string[];
  };
  seasonality?: {
    peak: string[];
    low: string[];
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface ServicesListProps {
  onEditService?: (service: Service) => void;
}

const ServicesList: React.FC<ServicesListProps> = ({ onEditService }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    isActive: 'true'
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalServices, setTotalServices] = useState(0);
  const itemsPerPage = 12;

  const fetchServices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        ...filters,
        search: searchTerm,
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      }).toString();

      const response = await fetch(`/api/services?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setServices(data.data || data.services || []);
        setTotalPages(data.totalPages || 1);
        setTotalServices(data.totalServices || data.total || 0);
      } else {
        toast.error('Failed to fetch services');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Error loading services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, filters]);

  useEffect(() => {
    fetchServices();
  }, [searchTerm, filters, currentPage]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (filterKey: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      'battery': 'bg-green-100 text-green-800',
      'motor': 'bg-blue-100 text-blue-800',
      'charging': 'bg-yellow-100 text-yellow-800',
      'electronics': 'bg-purple-100 text-purple-800',
      'body': 'bg-orange-100 text-orange-800',
      'general': 'bg-gray-100 text-gray-800',
      'diagnostic': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    );
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
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={handleSearch}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-4">
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              <option value="battery">Battery</option>
              <option value="motor">Motor</option>
              <option value="charging">Charging</option>
              <option value="electronics">Electronics</option>
              <option value="body">Body</option>
              <option value="general">General</option>
              <option value="diagnostic">Diagnostic</option>
            </select>

            <select
              value={filters.isActive}
              onChange={(e) => handleFilterChange('isActive', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{service.name}</h3>
                  <div className="flex space-x-2 mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {service.code}
                    </span>
                    {getCategoryBadge(service.category)}
                    {service.subcategory && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {service.subcategory}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    service.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {service.description}
              </p>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Duration:</span>
                  <span className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                    {formatDuration(service.estimatedDuration)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Base Price:</span>
                  <span className="font-medium">{formatPrice(service.basePrice)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Skill Level:</span>
                  <span className="capitalize">{service.skillLevel}</span>
                </div>

                {service.commonParts && service.commonParts.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Parts Required:</span>
                    <span>{service.commonParts.length} items</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEditService?.(service)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, totalServices)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{totalServices}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {services.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No services found</div>
          <p className="text-gray-400 mt-2">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default ServicesList;