import React, { useEffect, useState } from 'react';
import { partsAPI } from '../services/api';
import { CubeIcon, MagnifyingGlassIcon, FunnelIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { formatVND } from '../utils/vietnamese';
import toast from 'react-hot-toast';

interface Part {
  _id: string;
  name: string;
  partNumber: string;
  brand?: string;
  category: string;
  subcategory: string;
  pricing: {
    cost: number;
    retail: number;
    wholesale: number;
    currency: string;
  };
  inventory: {
    currentStock: number;
    reservedStock: number;
    usedStock: number;
    minStockLevel: number;
    maxStockLevel: number;
    reorderPoint: number;
  };
  warranty: {
    duration: number;
    type: string;
    description: string;
  };
  specifications?: {
    voltage?: number;
    capacity?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    other?: Record<string, any>;
  };
  description?: string;
  supplierInfo?: {
    name: string;
    contact: string;
    notes?: string;
  };
}

const CustomerPartsPage: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [filteredParts, setFilteredParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);

  const categories = [
    { value: 'all', label: 'Tất cả danh mục' },
    { value: 'battery', label: 'Pin' },
    { value: 'motor', label: 'Động cơ' },
    { value: 'charger', label: 'Sạc' },
    { value: 'electronics', label: 'Điện tử' },
    { value: 'brake', label: 'Phanh' },
    { value: 'suspension', label: 'Giảm xóc' },
    { value: 'interior', label: 'Nội thất' },
    { value: 'exterior', label: 'Ngoại thất' },
    { value: 'cooling', label: 'Làm mát' },
  ];

  useEffect(() => {
    fetchParts();
  }, []);

  useEffect(() => {
    filterParts();
  }, [searchTerm, selectedCategory, inStockOnly, parts]);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const response = await partsAPI.getAll();
      const data = response.data?.data || response.data || [];
      setParts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast.error('Không thể tải danh sách phụ tùng');
    } finally {
      setLoading(false);
    }
  };

  const filterParts = () => {
    let filtered = parts;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (part) =>
          part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (part.brand && part.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (part.supplierInfo?.name && part.supplierInfo.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((part) => part.category === selectedCategory);
    }

    // Filter by stock
    if (inStockOnly) {
      filtered = filtered.filter((part) => part.inventory.currentStock > 0);
    }

    setFilteredParts(filtered);
  };

  const getStockStatus = (part: Part) => {
    if (part.inventory.currentStock === 0) {
      return { label: 'Hết hàng', color: 'bg-red-100 text-red-800' };
    } else if (part.inventory.currentStock <= part.inventory.minStockLevel) {
      return { label: 'Sắp hết', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'Còn hàng', color: 'bg-green-100 text-green-800' };
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      battery: 'bg-yellow-100 text-yellow-800',
      motor: 'bg-purple-100 text-purple-800',
      charger: 'bg-dark-100 text-lime-800',
      electronics: 'bg-green-100 text-green-800',
      brake: 'bg-red-100 text-red-800',
      suspension: 'bg-orange-100 text-orange-800',
      interior: 'bg-indigo-100 text-indigo-800',
      exterior: 'bg-pink-100 text-pink-800',
      cooling: 'bg-cyan-100 text-cyan-800',
    };
    return colors[category] || 'bg-dark-100 text-gray-800';
  };

  const getWarrantyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      manufacturer: 'Bảo hành nhà sản xuất',
      dealer: 'Bảo hành đại lý',
      extended: 'Bảo hành mở rộng',
      limited: 'Bảo hành có điều kiện',
    };
    return labels[type] || type;
  };

  const formatWarrantyDuration = (duration: number) => {
    if (duration >= 365) {
      const years = Math.floor(duration / 365);
      return `${years} năm`;
    } else if (duration >= 30) {
      const months = Math.floor(duration / 30);
      return `${months} tháng`;
    } else {
      return `${duration} ngày`;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CubeIcon className="h-8 w-8 text-lime-600" />
            Danh sách phụ tùng
          </h1>
          <p className="mt-2 text-text-secondary">
            Xem các phụ tùng và linh kiện xe điện chính hãng
          </p>
        </div>

        {/* Filters */}
        <div className="bg-dark-300 rounded-lg shadow-sm border border-dark-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <label className="block text-sm text-text-muted text-text-secondary mb-2">
                <MagnifyingGlassIcon className="h-4 w-4 inline mr-1" />
                Tìm kiếm
              </label>
              <input
                type="text"
                placeholder="Tên, mã phụ tùng, nhà sản xuất..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-dark-200 rounded-md px-4 py-2 text-sm"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-2">
                <FunnelIcon className="h-4 w-4 inline mr-1" />
                Danh mục
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-dark-200 rounded-md px-4 py-2 text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Filter */}
            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-2">
                Trạng thái
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-3">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded border-dark-200 text-lime-600 focus:ring-lime-500"
                />
                <span className="text-sm text-text-secondary">Chỉ hiển thị còn hàng</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-text-secondary">
          Hiển thị {filteredParts.length} / {parts.length} phụ tùng
        </div>

        {/* Parts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-text-secondary">Đang tải danh sách phụ tùng...</p>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="bg-dark-300 rounded-lg shadow-sm border border-dark-200 p-12 text-center">
            <CubeIcon className="h-16 w-16 text-text-secondary mx-auto mb-4" />
            <p className="text-text-secondary">Không tìm thấy phụ tùng nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredParts.map((part) => {
              const stockStatus = getStockStatus(part);
              return (
                <div
                  key={part._id}
                  className="bg-dark-300 rounded-lg shadow-sm border border-dark-200 hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">{part.name}</h3>
                        <p className="text-xs text-text-muted font-mono">{part.partNumber}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs text-text-muted rounded-full ${getCategoryBadgeColor(part.category)}`}>
                        {part.category}
                      </span>
                    </div>

                    {/* Brand/Supplier */}
                    <div className="mb-4">
                      <span className="text-sm text-text-secondary">
                        <span className="text-text-muted">Hãng:</span> {part.brand || part.supplierInfo?.name || 'N/A'}
                      </span>
                    </div>

                    {/* Description */}
                    {part.description && (
                      <p className="text-sm text-text-secondary mb-4 line-clamp-2">{part.description}</p>
                    )}

                    {/* Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Giá:</span>
                        <span className="font-semibold text-lime-600">{formatVND(part.pricing.retail)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Tình trạng:</span>
                        <span className={`px-2 py-1 text-xs text-text-muted rounded-full ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      </div>
                      {part.inventory.currentStock > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary">Số lượng:</span>
                          <span className="text-white">{part.inventory.currentStock} chiếc</span>
                        </div>
                      )}
                    </div>

                    {/* Warranty */}
                    {part.warranty && (
                      <div className="bg-dark-50 border border-blue-200 rounded-md p-3 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheckIcon className="h-4 w-4 text-lime-600" />
                          <span className="text-xs text-lime-600">
                            Bảo hành {formatWarrantyDuration(part.warranty.duration)}
                          </span>
                        </div>
                        <p className="text-xs text-lime-700 mb-1">
                          {getWarrantyTypeLabel(part.warranty.type)}
                        </p>
                        <p className="text-xs text-lime-600">{part.warranty.description}</p>
                      </div>
                    )}

                    {/* Specifications */}
                    {part.specifications && (
                      <div className="border-t border-dark-100 pt-3 mt-3">
                        <p className="text-xs text-text-muted text-text-secondary mb-2">Thông số kỹ thuật:</p>
                        <div className="space-y-1">
                          {part.specifications.voltage && (
                            <div className="flex justify-between text-xs">
                              <span className="text-text-secondary">Điện áp:</span>
                              <span className="text-white">{part.specifications.voltage}V</span>
                            </div>
                          )}
                          {part.specifications.capacity && (
                            <div className="flex justify-between text-xs">
                              <span className="text-text-secondary">Dung lượng:</span>
                              <span className="text-white">{part.specifications.capacity}kWh</span>
                            </div>
                          )}
                          {part.specifications.other?.power && (
                            <div className="flex justify-between text-xs">
                              <span className="text-text-secondary">Công suất:</span>
                              <span className="text-white">{part.specifications.other.power}</span>
                            </div>
                          )}
                          {part.specifications.dimensions && (
                            <div className="flex justify-between text-xs">
                              <span className="text-text-secondary">Kích thước:</span>
                              <span className="text-white">
                                {part.specifications.dimensions.length} × {part.specifications.dimensions.width} × {part.specifications.dimensions.height} mm
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerPartsPage;
