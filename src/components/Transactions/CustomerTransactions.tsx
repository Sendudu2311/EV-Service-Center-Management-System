import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { vnpayAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  CreditCardIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { formatVietnameseDateTime, formatVND } from '../../utils/vietnamese';
import { Link } from 'react-router-dom';

// Transaction status Vietnamese translations
const transactionStatusTranslations: Record<string, string> = {
  pending: 'Đang chờ xử lý',
  processing: 'Đang xử lý',
  completed: 'Hoàn thành',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
  expired: 'Hết hạn',
  refunded: 'Đã hoàn tiền',
  disputed: 'Khiếu nại'
};

// Payment type Vietnamese translations
const paymentTypeTranslations: Record<string, string> = {
  appointment: 'Đặt lịch hẹn',
  invoice: 'Hóa đơn dịch vụ',
  service: 'Dịch vụ',
  other: 'Khác'
};

// Transaction status colors
const getStatusColor = (status: string) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    processing: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    expired: 'bg-orange-100 text-orange-800 border-orange-200',
    refunded: 'bg-purple-100 text-purple-800 border-purple-200',
    disputed: 'bg-red-100 text-red-800 border-red-200'
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// Status icon mapping
const getStatusIcon = (status: string) => {
  const icons = {
    pending: ClockIcon,
    processing: ArrowPathIcon,
    completed: CheckCircleIcon,
    failed: XCircleIcon,
    cancelled: XCircleIcon,
    expired: ExclamationTriangleIcon,
    refunded: BanknotesIcon,
    disputed: ExclamationTriangleIcon
  };
  return icons[status as keyof typeof icons] || ClockIcon;
};

const CustomerTransactions: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    paymentType: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  const fetchTransactions = useCallback(async (page = 1, appliedFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(appliedFilters).filter(([_, value]) => value))
      };

      const response = await vnpayAPI.getUserTransactions(params);

      // Backend returns transactions and pagination directly in response.data
      const data = response.data;

      setTransactions(data.transactions || []);
      setPagination(data.pagination || pagination);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      setError(error.response?.data?.message || 'Không thể tải giao dịch');
      toast.error('Không thể tải giao dịch');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handlePageChange = (newPage: number) => {
    fetchTransactions(newPage);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchTransactions(1, newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      status: '',
      paymentType: '',
      startDate: '',
      endDate: '',
      search: ''
    };
    setFilters(clearedFilters);
    fetchTransactions(1, clearedFilters);
  };

  const getTransactionDetails = (transaction: any) => {
    const details = [];

    if (transaction.appointmentId) {
      details.push({
        label: 'Lịch hẹn',
        value: `#${transaction.appointmentId.appointmentNumber}`,
        link: `/appointments/${transaction.appointmentId._id}`
      });
    }

    if (transaction.invoiceId) {
      details.push({
        label: 'Hóa đơn',
        value: transaction.invoiceId.invoiceNumber,
        link: `/invoices/${transaction.invoiceId._id}`
      });
    }

    if (transaction.vnpayData?.bankCode) {
      details.push({
        label: 'Ngân hàng',
        value: transaction.vnpayData.bankCode.toUpperCase()
      });
    }

    if (transaction.vnpayData?.cardType) {
      details.push({
        label: 'Loại thẻ',
        value: transaction.vnpayData.cardType
      });
    }

    return details;
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-8"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg border">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lịch sử giao dịch</h1>
              <p className="mt-2 text-sm text-gray-600">
                Xem lịch sử thanh toán và giao dịch của bạn
              </p>
            </div>
            <button
              onClick={() => fetchTransactions()}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Bộ lọc</h3>
            {(Object.values(filters).some(value => value)) && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tìm kiếm
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Mã giao dịch..."
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trạng thái
              </label>
              <select
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(transactionStatusTranslations).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại thanh toán
              </label>
              <select
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={filters.paymentType}
                onChange={(e) => handleFilterChange('paymentType', e.target.value)}
              >
                <option value="">Tất cả loại</option>
                {Object.entries(paymentTypeTranslations).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white shadow-sm rounded-lg">
          {error ? (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Không thể tải giao dịch</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Không có giao dịch</h3>
              <p className="mt-1 text-sm text-gray-500">
                Bạn chưa có giao dịch nào trong khoảng thời gian này.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {transactions.map((transaction) => {
                const StatusIcon = getStatusIcon(transaction.status);
                const details = getTransactionDetails(transaction);

                return (
                  <div key={transaction._id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <StatusIcon className={`h-5 w-5 ${
                              transaction.status === 'completed' ? 'text-green-500' :
                              transaction.status === 'failed' ? 'text-red-500' :
                              transaction.status === 'pending' ? 'text-yellow-500' :
                              'text-gray-500'
                            }`} />
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">
                                {transaction.transactionRef}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {formatVietnameseDateTime(transaction.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                              {transactionStatusTranslations[transaction.status] || transaction.status}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatVND(transaction.amount)}
                            </span>
                          </div>
                        </div>

                        {/* Payment Type and Description */}
                        <div className="mb-3">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {paymentTypeTranslations[transaction.paymentType] || transaction.paymentType}
                          </span>
                          <p className="mt-1 text-sm text-gray-600">
                            {transaction.orderInfo}
                          </p>
                        </div>

                        {/* Transaction Details */}
                        {details.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                            {details.map((detail, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">{detail.label}:</span>
                                {detail.link ? (
                                  <Link to={detail.link} className="text-blue-600 hover:text-blue-500 font-medium">
                                    {detail.value}
                                  </Link>
                                ) : (
                                  <span className="text-gray-900 font-medium">{detail.value}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Error Message */}
                        {transaction.errorMessage && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            <strong>Lỗi:</strong> {transaction.errorMessage}
                          </div>
                        )}

                        {/* VNPay Transaction Info */}
                        {transaction.vnpayData?.transactionNo && (
                          <div className="mt-2 text-xs text-gray-500">
                            Mã giao dịch VNPay: {transaction.vnpayData.transactionNo}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Hiển thị <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> đến{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      trong <span className="font-medium">{pagination.total}</span> kết quả
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="sr-only">Trước</span>
                        &larr;
                      </button>
                      {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === pagination.page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="sr-only">Sau</span>
                        &rarr;
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerTransactions;