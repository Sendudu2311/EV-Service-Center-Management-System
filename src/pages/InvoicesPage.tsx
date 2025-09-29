import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  EyeIcon,
  // PencilIcon, // Unused import
  PaperAirplaneIcon,
  BanknotesIcon,
  PrinterIcon,
  DocumentCheckIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useSocket, useCustomEvent } from '../contexts/SocketContext';
import { invoicesAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Invoice,
  InvoiceFilters,
  PaymentData,
  invoiceStatusTranslations,
  paymentMethodTranslations,
  paymentStatusTranslations,
  formatInvoiceNumber
} from '../types/invoice';
import { formatVietnameseDateTime, formatVND, numberToVietnameseWords } from '../utils/vietnamese';

const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [_showDetailsModal, setShowDetailsModal] = useState(false); // Reserved for modal functionality

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, paymentStatusFilter, dateRange]);

  // Listen for real-time updates
  useCustomEvent('invoiceGenerated', (data) => {
    toast.success(`Hóa đơn mới: ${data.invoiceNumber}`);
    fetchInvoices();
  });

  useCustomEvent('paymentReceived', (data) => {
    toast.success(`Đã nhận thanh toán: ${data.invoiceNumber}`);
    fetchInvoices();
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const filters: InvoiceFilters = {};

      if (statusFilter) filters.status = statusFilter;
      if (paymentStatusFilter) filters.paymentStatus = paymentStatusFilter;
      if (searchTerm) filters.search = searchTerm;
      if (dateRange.start && dateRange.end) {
        filters.dateRange = { start: dateRange.start, end: dateRange.end };
      }

      const response = await invoicesAPI.getAll(filters);
      setInvoices(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Không thể tải danh sách hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      await invoicesAPI.approve(invoiceId);
      toast.success('Đã phê duyệt hóa đơn');
      fetchInvoices();
    } catch (error: any) {
      console.error('Error approving invoice:', error);
      toast.error(error.response?.data?.message || 'Không thể phê duyệt hóa đơn');
    }
  };

  const handleSendToCustomer = async (invoiceId: string, method: string = 'email') => {
    try {
      await invoicesAPI.sendToCustomer(invoiceId, method);
      toast.success('Đã gửi hóa đơn cho khách hàng');
      fetchInvoices();
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      toast.error(error.response?.data?.message || 'Không thể gửi hóa đơn');
    }
  };

  const handleRecordPayment = async (paymentData: PaymentData) => {
    if (!selectedInvoice) return;

    try {
      await invoicesAPI.recordPayment(selectedInvoice._id, paymentData);

      // Emit socket event
      if (socket) {
        socket.emit('payment_received', {
          invoiceId: selectedInvoice._id,
          invoiceNumber: selectedInvoice.invoiceNumber,
          amount: paymentData.amount,
          customerId: selectedInvoice.customerId
        });
      }

      toast.success('Đã ghi nhận thanh toán');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Không thể ghi nhận thanh toán');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'pending_approval': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-blue-100 text-blue-800',
      'sent': 'bg-indigo-100 text-indigo-800',
      'viewed': 'bg-purple-100 text-purple-800',
      'paid': 'bg-green-100 text-green-800',
      'overdue': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800',
      'refunded': 'bg-orange-100 text-orange-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {invoiceStatusTranslations[status] || status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors = {
      'unpaid': 'bg-red-100 text-red-800',
      'partially_paid': 'bg-yellow-100 text-yellow-800',
      'paid': 'bg-green-100 text-green-800',
      'overdue': 'bg-red-200 text-red-900',
      'refunded': 'bg-orange-100 text-orange-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {paymentStatusTranslations[status] || status}
      </span>
    );
  };

  const canApprove = (invoice: Invoice) => {
    return invoice.status === 'pending_approval' && (user?.role === 'admin' || user?.role === 'staff');
  };

  const canSend = (invoice: Invoice) => {
    return invoice.status === 'approved' && !invoice.sentToCustomer;
  };

  const canRecordPayment = (invoice: Invoice) => {
    return ['sent', 'viewed'].includes(invoice.status) &&
           invoice.paymentInfo.status !== 'paid' &&
           (user?.role === 'admin' || user?.role === 'staff');
  };

  const PaymentModal = () => {
    const [paymentData, setPaymentData] = useState<PaymentData>({
      amount: selectedInvoice?.paymentInfo.remainingAmount || 0,
      method: 'cash',
      transactionRef: '',
      notes: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleRecordPayment(paymentData);
    };

    if (!selectedInvoice || !showPaymentModal) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ghi nhận thanh toán
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền thanh toán *
                </label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                  max={selectedInvoice.paymentInfo.remainingAmount}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Còn lại: {formatVND(selectedInvoice.paymentInfo.remainingAmount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phương thức thanh toán *
                </label>
                <select
                  value={paymentData.method}
                  onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value as any })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  {Object.entries(paymentMethodTranslations).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã giao dịch
                </label>
                <input
                  type="text"
                  value={paymentData.transactionRef}
                  onChange={(e) => setPaymentData({ ...paymentData, transactionRef: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
                >
                  Ghi nhận
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Quản lý hóa đơn
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý hóa đơn và thanh toán cho dịch vụ bảo dưỡng xe điện
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
              <button className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                Tạo hóa đơn
              </button>
            )}
          </div>
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
              placeholder="Tìm kiếm hóa đơn..."
            />
          </div>

          {showFilters && (
            <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái hóa đơn
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(invoiceStatusTranslations).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái thanh toán
                  </label>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Tất cả</option>
                    {Object.entries(paymentStatusTranslations).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setPaymentStatusFilter('');
                    setDateRange({ start: '', end: '' });
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
          {[
            {
              label: 'Tổng hóa đơn',
              value: invoices.length,
              color: 'blue'
            },
            {
              label: 'Chờ thanh toán',
              value: invoices.filter(inv => inv.paymentInfo.status === 'unpaid').length,
              color: 'yellow'
            },
            {
              label: 'Đã thanh toán',
              value: invoices.filter(inv => inv.paymentInfo.status === 'paid').length,
              color: 'green'
            },
            {
              label: 'Tổng doanh thu',
              value: formatVND(invoices.filter(inv => inv.paymentInfo.status === 'paid')
                .reduce((sum, inv) => sum + inv.totals.totalAmount, 0)),
              color: 'emerald'
            }
          ].map((stat) => (
            <div key={stat.label} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 truncate">{stat.label}</p>
                    <p className={`text-2xl font-semibold text-${stat.color}-600`}>
                      {typeof stat.value === 'number' ? stat.value : stat.value}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Invoices List */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <DocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Không có hóa đơn</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Chưa có hóa đơn nào được tạo.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(invoices || []).map((invoice) => (
                  <div
                    key={invoice._id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatInvoiceNumber(invoice.invoiceNumber)}
                          </h3>
                          {getStatusBadge(invoice.status)}
                          {getPaymentStatusBadge(invoice.paymentInfo.status)}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Khách hàng</p>
                            <p className="text-sm text-gray-900">{invoice.customerInfo.name}</p>
                            <p className="text-sm text-gray-500">{invoice.customerInfo.phone}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Xe</p>
                            <p className="text-sm text-gray-900">
                              {invoice.vehicleInfo.make} {invoice.vehicleInfo.model} {invoice.vehicleInfo.year}
                            </p>
                            <p className="text-sm text-gray-500">{invoice.vehicleInfo.licensePlate}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Thông tin thanh toán</p>
                            <p className="text-sm text-gray-900 font-semibold">
                              {formatVND(invoice.totals.totalAmount)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Đã thanh toán: {formatVND(invoice.paymentInfo.paidAmount)}
                            </p>
                          </div>
                        </div>

                        <div className="text-sm text-gray-500">
                          Tạo: {formatVietnameseDateTime(invoice.createdAt)} bởi {invoice.generatedBy.firstName} {invoice.generatedBy.lastName}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowDetailsModal(true);
                          }}
                          className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>

                        {canApprove(invoice) && (
                          <button
                            onClick={() => handleApproveInvoice(invoice._id)}
                            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700"
                          >
                            <DocumentCheckIcon className="h-4 w-4" />
                          </button>
                        )}

                        {canSend(invoice) && (
                          <button
                            onClick={() => handleSendToCustomer(invoice._id)}
                            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                          >
                            <PaperAirplaneIcon className="h-4 w-4" />
                          </button>
                        )}

                        {canRecordPayment(invoice) && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowPaymentModal(true);
                            }}
                            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
                          >
                            <BanknotesIcon className="h-4 w-4" />
                          </button>
                        )}

                        <button className="inline-flex items-center p-2 border border-gray-300 rounded-full shadow-sm text-gray-700 bg-white hover:bg-gray-50">
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal />
    </div>
  );
};

export default InvoicesPage;