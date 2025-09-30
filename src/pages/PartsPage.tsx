import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useSocket, useCustomEvent } from '../contexts/SocketContext';
import { partsAPI, partRequestsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Part,
  PartRequest,
  // PartFilters, // Unused import
  partCategoryTranslations,
  partRequestStatusTranslations,
  urgencyTranslations,
  // qualityGradeTranslations // Unused import
} from '../types/parts';
import { formatVND } from '../utils/vietnamese';

const PartsPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState<'inventory' | 'requests' | 'analytics'>('inventory');
  const [parts, setParts] = useState<Part[]>([]);
  const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Inventory filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Request filters
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab, categoryFilter, brandFilter, stockFilter, statusFilter, urgencyFilter]);

  // Listen for real-time updates
  useCustomEvent('partsRequested', (data) => {
    toast.info(`Yêu cầu phụ tùng mới: ${data.requestNumber}`);
    if (activeTab === 'requests') {
      fetchPartRequests();
    }
  });

  useCustomEvent('partsApproved', (data) => {
    toast.success(`Phụ tùng đã được duyệt: ${data.requestNumber}`);
    if (activeTab === 'requests') {
      fetchPartRequests();
    }
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'inventory') {
        await fetchParts();
      } else if (activeTab === 'requests') {
        await fetchPartRequests();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const fetchParts = async () => {
    const filters: any = {};
    if (categoryFilter) filters.category = categoryFilter;
    if (brandFilter) filters.brand = brandFilter;
    if (stockFilter !== 'all') {
      if (stockFilter === 'in_stock') filters.inStock = true;
      if (stockFilter === 'low_stock') filters.lowStock = true;
      if (stockFilter === 'out_of_stock') filters.inStock = false;
    }
    if (searchTerm) filters.search = searchTerm;

    const response = await partsAPI.getAll(filters);
    setParts(response.data.data || response.data);
  };

  const fetchPartRequests = async () => {
    const filters: any = {};
    if (statusFilter) filters.status = statusFilter;
    if (urgencyFilter) filters.urgency = urgencyFilter;

    const response = await partRequestsAPI.getAll(filters);
    setPartRequests(response.data.data || response.data);
  };

  const handleApproveRequest = async (requestId: string, decision: string, notes?: string, alternatives?: any[]) => {
    try {
      await partRequestsAPI.approve(requestId, {
        decision,
        staffNotes: notes || '',
        alternativeParts: alternatives || []
      });
      toast.success('Đã phê duyệt yêu cầu phụ tùng');
      fetchPartRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.response?.data?.message || 'Không thể phê duyệt yêu cầu');
    }
  };

  const getStockStatus = (part: Part) => {
    const currentStock = part.inventory?.currentStock || 0;
    const reservedStock = part.inventory?.reservedStock || 0;
    const minimumStock = part.inventory?.minimumStock || 0;
    
    const available = currentStock - reservedStock;
    if (available <= 0) return { status: 'out', color: 'red', text: 'Hết hàng' };
    if (available <= minimumStock) return { status: 'low', color: 'yellow', text: 'Sắp hết' };
    return { status: 'in', color: 'green', text: 'Còn hàng' };
  };

  const getRequestStatusBadge = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'partially_approved': 'bg-blue-100 text-blue-800',
      'rejected': 'bg-red-100 text-red-800',
      'fulfilled': 'bg-emerald-100 text-emerald-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {partRequestStatusTranslations[status] || status}
      </span>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const colors = {
      'low': 'bg-gray-100 text-gray-800',
      'normal': 'bg-blue-100 text-blue-800',
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800',
      'critical': 'bg-red-200 text-red-900',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colors[urgency as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {urgencyTranslations[urgency] || urgency}
      </span>
    );
  };

  const tabs = [
    { id: 'inventory', name: 'Kho phụ tùng', icon: ChartBarIcon },
    { id: 'requests', name: 'Yêu cầu phụ tùng', icon: ClockIcon },
    { id: 'analytics', name: 'Thống kê', icon: ChartBarIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Quản lý phụ tùng
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý kho phụ tùng và yêu cầu phụ tùng cho dịch vụ EV
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <FunnelIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
              Bộ lọc
            </button>
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <button
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                Thêm phụ tùng
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={activeTab === 'inventory' ? 'Tìm kiếm phụ tùng...' : 'Tìm kiếm yêu cầu...'}
            />
          </div>

          {showFilters && (
            <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              {activeTab === 'inventory' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Tất cả danh mục</option>
                      {Object.entries(partCategoryTranslations).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thương hiệu</label>
                    <input
                      type="text"
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      placeholder="Nhập thương hiệu..."
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng kho</label>
                    <select
                      value={stockFilter}
                      onChange={(e) => setStockFilter(e.target.value as any)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="all">Tất cả</option>
                      <option value="in_stock">Còn hàng</option>
                      <option value="low_stock">Sắp hết hàng</option>
                      <option value="out_of_stock">Hết hàng</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setCategoryFilter('');
                        setBrandFilter('');
                        setStockFilter('all');
                        setSearchTerm('');
                      }}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Tất cả trạng thái</option>
                      {Object.entries(partRequestStatusTranslations).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Độ ưu tiên</label>
                    <select
                      value={urgencyFilter}
                      onChange={(e) => setUrgencyFilter(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Tất cả độ ưu tiên</option>
                      {Object.entries(urgencyTranslations).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 flex items-end">
                    <button
                      onClick={() => {
                        setStatusFilter('');
                        setUrgencyFilter('');
                        setSearchTerm('');
                      }}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  {parts.length === 0 ? (
                    <div className="text-center py-12">
                      <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">Không có phụ tùng</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Chưa có phụ tùng nào trong kho.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {parts.map((part) => {
                        const stockStatus = getStockStatus(part);
                        return (
                          <div
                            key={part._id}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold text-gray-900">{part.name}</h4>
                                <p className="text-sm text-gray-500">Mã: {part.partNumber}</p>
                                <p className="text-sm text-gray-500">
                                  {partCategoryTranslations[part.category]} - {part.brand}
                                </p>
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${stockStatus.color}-100 text-${stockStatus.color}-800`}>
                                {stockStatus.text}
                              </span>
                            </div>

                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Tồn kho:</span>
                                <span className="font-medium">
                                  {(part.inventory?.currentStock || 0) - (part.inventory?.reservedStock || 0)} / {part.inventory?.currentStock || 0}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Giá bán lẻ:</span>
                                <span className="font-medium">{formatVND(part.pricing?.retail || 0)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Vị trí:</span>
                                <span className="font-medium">
                                  {part.inventory?.location?.warehouse || 'N/A'} - {part.inventory?.location?.zone || 'N/A'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                <EyeIcon className="h-4 w-4 mr-1" />
                                Xem
                              </button>
                              {(user?.role === 'admin' || user?.role === 'staff') && (
                                <button className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                  <PencilIcon className="h-4 w-4 mr-1" />
                                  Sửa
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Part Requests Tab */}
            {activeTab === 'requests' && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  {partRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">Không có yêu cầu phụ tùng</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Chưa có yêu cầu phụ tùng nào.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {partRequests.map((request) => (
                        <div
                          key={request._id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-gray-900">#{request.requestNumber}</h4>
                              <p className="text-sm text-gray-500">
                                Yêu cầu bởi: {request.requestedBy.firstName} {request.requestedBy.lastName}
                              </p>
                              <p className="text-sm text-gray-500">
                                Chi phí ước tính: {formatVND(request.estimatedCost)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getRequestStatusBadge(request.status)}
                              {getUrgencyBadge(request.urgency)}
                            </div>
                          </div>

                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-900 mb-2">Phụ tùng yêu cầu:</h5>
                            <div className="space-y-2">
                              {request.requestedParts.map((part, index) => (
                                <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                  <div>
                                    <span className="font-medium">{part.partInfo.name}</span>
                                    <span className="text-gray-500 ml-2">({part.partInfo.partNumber})</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm">Số lượng: {part.quantity}</div>
                                    {part.shortfall > 0 && (
                                      <div className="text-xs text-red-600">Thiếu: {part.shortfall}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {request.status === 'pending' && (user?.role === 'admin' || user?.role === 'staff') && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleApproveRequest(request._id, 'approve_all')}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                Duyệt tất cả
                              </button>
                              <button
                                onClick={() => handleApproveRequest(request._id, 'approve_partial')}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                              >
                                Duyệt một phần
                              </button>
                              <button
                                onClick={() => handleApproveRequest(request._id, 'reject_insufficient_stock')}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Từ chối
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <div className="text-center py-12">
                    <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Thống kê phụ tùng</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Tính năng thống kê và báo cáo sẽ được triển khai trong phiên bản tiếp theo.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PartsPage;