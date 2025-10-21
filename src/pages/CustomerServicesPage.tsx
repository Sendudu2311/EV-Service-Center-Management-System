import React, { useEffect, useState } from 'react';
import { servicesAPI } from '../services/api';
import { WrenchScrewdriverIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { formatVND } from '../utils/vietnamese';
import toast from 'react-hot-toast';

interface Service {
  _id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  subcategory: string;
  basePrice: number;
  estimatedDuration: number;
  skillLevel: string;
  warranty?: {
    duration: number;
    type: string;
    description: string;
  };
  tags: string[];
}

const CustomerServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');

  const categories = [
    { value: 'all', label: 'Tất cả danh mục' },
    { value: 'battery', label: 'Pin' },
    { value: 'motor', label: 'Động cơ' },
    { value: 'charging', label: 'Sạc' },
    { value: 'electronics', label: 'Điện tử' },
    { value: 'general', label: 'Tổng quát' },
    { value: 'diagnostic', label: 'Chẩn đoán' },
  ];

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [searchTerm, selectedCategory, selectedSubcategory, services]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.getAll();
      const data = response.data?.data || response.data || [];
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Không thể tải danh sách dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = services;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (service) =>
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((service) => service.category === selectedCategory);
    }

    // Filter by subcategory
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter((service) => service.subcategory === selectedSubcategory);
    }

    setFilteredServices(filtered);
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      battery: 'bg-yellow-100 text-yellow-800',
      motor: 'bg-purple-100 text-purple-800',
      charging: 'bg-blue-100 text-blue-800',
      electronics: 'bg-green-100 text-green-800',
      general: 'bg-gray-100 text-gray-800',
      diagnostic: 'bg-red-100 text-red-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getSkillLevelBadge = (skillLevel: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      basic: { bg: 'bg-green-100', text: 'text-green-800', label: 'Cơ bản' },
      beginner: { bg: 'bg-green-100', text: 'text-green-800', label: 'Cơ bản' },
      intermediate: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Trung cấp' },
      advanced: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Nâng cao' },
      expert: { bg: 'bg-red-100', text: 'text-red-800', label: 'Chuyên gia' },
    };
    const badge = badges[skillLevel] || badges.basic;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600" />
            Danh sách dịch vụ
          </h1>
          <p className="mt-2 text-gray-600">
            Xem các dịch vụ bảo dưỡng và sửa chữa xe điện chúng tôi cung cấp
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MagnifyingGlassIcon className="h-4 w-4 inline mr-1" />
                Tìm kiếm
              </label>
              <input
                type="text"
                placeholder="Tên, mô tả, mã dịch vụ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FunnelIcon className="h-4 w-4 inline mr-1" />
                Danh mục
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại dịch vụ
              </label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm"
              >
                <option value="all">Tất cả</option>
                <option value="diagnostic">Chẩn đoán</option>
                <option value="repair">Sửa chữa</option>
                <option value="replacement">Thay thế</option>
                <option value="maintenance">Bảo dưỡng</option>
                <option value="installation">Lắp đặt</option>
                <option value="inspection">Kiểm tra</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Hiển thị {filteredServices.length} / {services.length} dịch vụ
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách dịch vụ...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <WrenchScrewdriverIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Không tìm thấy dịch vụ nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <div
                key={service._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{service.name}</h3>
                      <p className="text-xs text-gray-500 font-mono">{service.code}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadgeColor(service.category)}`}>
                      {service.category}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{service.description}</p>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Giá:</span>
                      <span className="font-semibold text-blue-600">{formatVND(service.basePrice)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Thời gian:</span>
                      <span className="text-gray-900">{service.estimatedDuration} phút</span>
                    </div>
                  </div>

                  {/* Warranty */}
                  {service.warranty && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium text-green-800">Bảo hành {service.warranty.duration} ngày</span>
                      </div>
                      <p className="text-xs text-green-700">{service.warranty.description}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerServicesPage;
