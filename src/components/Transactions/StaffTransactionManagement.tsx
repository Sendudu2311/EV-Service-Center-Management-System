import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { transactionApi } from "../../services/api";
import toast from "react-hot-toast";
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
  DocumentTextIcon,
  UserIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  InformationCircleIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import { formatVietnameseDateTime, formatVND } from "../../utils/vietnamese";
import { Link } from "react-router-dom";

// Transaction status Vietnamese translations
const transactionStatusTranslations: Record<string, string> = {
  pending: "Đang chờ xử lý",
  processing: "Đang xử lý",
  completed: "Hoàn thành",
  failed: "Thất bại",
  cancelled: "Đã hủy",
  expired: "Hết hạn",
  refunded: "Đã hoàn tiền",
  disputed: "Khiếu nại",
};

// Transaction type Vietnamese translations
const transactionTypeTranslations: Record<string, string> = {
  vnpay: "VNPay",
  cash: "Tiền mặt",
  card: "Thẻ tín dụng/Ghi nợ",
  bank_transfer: "Chuyển khoản",
  momo: "Ví MoMo",
  zalopay: "Ví ZaloPay",
};

// Payment purpose Vietnamese translations
const paymentPurposeTranslations: Record<string, string> = {
  appointment_deposit: "Tiền đặt cọc lịch hẹn",
  appointment_payment: "Thanh toán lịch hẹn",
  invoice_payment: "Thanh toán hóa đơn",
  service_payment: "Thanh toán dịch vụ",
  refund: "Hoàn tiền",
  deposit_booking: "Đặt cọc đặt lịch",
  other: "Khác",
};

// Transaction status colors
const getStatusColor = (status: string) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    processing: "bg-lime-100 text-lime-800 border-blue-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    failed: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-dark-100 text-gray-800 border-dark-200",
    expired: "bg-orange-100 text-orange-800 border-orange-200",
    refunded: "bg-purple-100 text-purple-800 border-purple-200",
    disputed: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    colors[status as keyof typeof colors] ||
    "bg-dark-100 text-gray-800 border-dark-200"
  );
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
    disputed: ExclamationTriangleIcon,
  };
  return icons[status as keyof typeof icons] || ClockIcon;
};

// Get status information for staff
const getStatusInfo = (status: string) => {
  const info = {
    pending: {
      text: "Giao dịch đang chờ xử lý",
      icon: ClockIcon,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    processing: {
      text: "Đang xử lý giao dịch",
      icon: ArrowPathIcon,
      color: "text-lime-600",
      bgColor: "bg-dark-900"
    },
    completed: {
      text: "Giao dịch thành công",
      icon: CheckCircleIcon,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    failed: {
      text: "Giao dịch thất bại",
      icon: XCircleIcon,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    cancelled: {
      text: "Giao dịch đã hủy",
      icon: XCircleIcon,
      color: "text-text-secondary",
      bgColor: "bg-dark-900"
    },
    expired: {
      text: "Giao dịch đã hết hạn",
      icon: ExclamationTriangleIcon,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    refunded: {
      text: "Đã hoàn tiền",
      icon: BanknotesIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    disputed: {
      text: "Giao dịch đang khiếu nại",
      icon: ExclamationTriangleIcon,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
  };

  return info[status as keyof typeof info] || info.pending;
};

// Get payment method icon and details
const getPaymentMethodIcon = (type: string) => {
  const icons = {
    vnpay: CreditCardIcon,
    cash: BanknotesIcon,
    card: CreditCardIcon,
    bank_transfer: BuildingOfficeIcon,
    momo: CreditCardIcon,
    zalopay: CreditCardIcon,
  };
  return icons[type as keyof typeof icons] || CreditCardIcon;
};

// Get enhanced payment method details for staff
const getPaymentMethodDetails = (transaction: any) => {
  const details = [];

  if (transaction.transactionType === "card" && transaction.cardData) {
    if (transaction.cardData.cardType) {
      details.push({
        label: "Loại thẻ",
        value: transaction.cardData.cardType,
        icon: CreditCardIcon
      });
    }
    if (transaction.cardData.last4Digits) {
      details.push({
        label: "Số thẻ",
        value: `****${transaction.cardData.last4Digits}`,
        icon: CreditCardIcon
      });
    }
    if (transaction.cardData.terminalId) {
      details.push({
        label: "Mã terminal",
        value: transaction.cardData.terminalId,
        icon: CogIcon
      });
    }
  }

  if (transaction.transactionType === "vnpay" && transaction.vnpayData) {
    if (transaction.vnpayData.vnpBankCode) {
      details.push({
        label: "Ngân hàng",
        value: transaction.vnpayData.vnpBankCode.toUpperCase(),
        icon: BuildingOfficeIcon
      });
    }
    if (transaction.vnpayData.vnpTxnRef) {
      details.push({
        label: "Mã GD VNPAY",
        value: transaction.vnpayData.vnpTxnRef,
        icon: DocumentTextIcon
      });
    }
  }

  if (transaction.transactionType === "bank_transfer" && transaction.bankTransferData) {
    if (transaction.bankTransferData.bankName) {
      details.push({
        label: "Ngân hàng",
        value: transaction.bankTransferData.bankName,
        icon: BuildingOfficeIcon
      });
    }
    if (transaction.bankTransferData.transferRef) {
      details.push({
        label: "Số tham chiếu",
        value: transaction.bankTransferData.transferRef,
        icon: DocumentTextIcon
      });
    }
  }

  if (transaction.transactionType === "cash" && transaction.cashData) {
    if (transaction.cashData.receivedBy) {
      details.push({
        label: "Người nhận tiền",
        value: transaction.cashData.receivedBy,
        icon: UserIcon
      });
    }
  }

  return details;
};

// Get customer information for staff
const getCustomerInfo = (transaction: any) => {
  const info = [];

  if (transaction.userId) {
    if (typeof transaction.userId === 'object' && transaction.userId !== null) {
      if (transaction.userId.firstName) {
        info.push({
          label: "Họ tên khách hàng",
          value: `${transaction.userId.firstName} ${transaction.userId.lastName || ''}`,
          icon: UserGroupIcon
        });
      }
      if (transaction.userId.phone) {
        info.push({
          label: "Số điện thoại",
          value: transaction.userId.phone,
          icon: UserIcon
        });
      }
      if (transaction.userId.email) {
        info.push({
          label: "Email",
          value: transaction.userId.email,
          icon: UserIcon
        });
      }
    }
  }

  if (transaction.billingInfo) {
    if (transaction.billingInfo.fullName && (!transaction.userId || typeof transaction.userId === 'string')) {
      info.push({
        label: "Họ tên thanh toán",
        value: transaction.billingInfo.fullName,
        icon: UserGroupIcon
      });
    }
    if (transaction.billingInfo.mobile) {
      info.push({
        label: "SĐT thanh toán",
        value: transaction.billingInfo.mobile,
        icon: UserIcon
      });
    }
    if (transaction.billingInfo.email) {
      info.push({
        label: "Email thanh toán",
        value: transaction.billingInfo.email,
        icon: UserIcon
      });
    }
  }

  return info;
};

// Get staff processing information
const getStaffProcessingInfo = (transaction: any) => {
  const info = [];

  if (transaction.processedBy) {
    const processedBy = typeof transaction.processedBy === 'object' && transaction.processedBy !== null
      ? `${transaction.processedBy.firstName} ${transaction.processedBy.lastName || ''}`
      : transaction.processedBy;

    info.push({
      label: "Nhân viên xử lý",
      value: processedBy,
      icon: ShieldCheckIcon
    });
  }

  if (transaction.processedAt) {
    info.push({
      label: "Thời gian xử lý",
      value: formatVietnameseDateTime(transaction.processedAt),
      icon: ClockIcon
    });
  }

  // Payment method specific staff info
  if (transaction.transactionType === "card" && transaction.cardData?.processedBy) {
    info.push({
      label: "NV xử lý thẻ",
      value: transaction.cardData.processedBy,
      icon: ShieldCheckIcon
    });
  }

  if (transaction.transactionType === "bank_transfer" && transaction.bankTransferData?.verifiedBy) {
    info.push({
      label: "NV xác minh CK",
      value: transaction.bankTransferData.verifiedBy,
      icon: ShieldCheckIcon
    });
  }

  if (transaction.transactionType === "cash" && transaction.cashData?.receivedBy) {
    info.push({
      label: "NV nhận tiền",
      value: transaction.cashData.receivedBy,
      icon: ShieldCheckIcon
    });
  }

  return info;
};

const StaffTransactionManagement: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [refundModal, setRefundModal] = useState(false);
  const [refundData, setRefundData] = useState({ amount: "", reason: "" });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    status: "",
    transactionType: "",
    paymentPurpose: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  const fetchTransactions = useCallback(
    async (page = 1, appliedFilters = filters) => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          page,
          limit: pagination.limit,
          ...Object.fromEntries(
            Object.entries(appliedFilters).filter(([_, value]) => value)
          ),
        };

        console.log("🔍 Debug - Transaction params being sent:", params);
        const response = await transactionApi.getTransactions(params);
        const apiResponse = response.data;
        console.log("🔍 Debug - Transaction response:", apiResponse);

        if (apiResponse.success && apiResponse.data) {
          setTransactions(apiResponse.data.transactions || []);
          // Note: getAllTransactions might not return pagination data
        } else {
          setTransactions([]);
        }
      } catch (error: any) {
        console.error("Error fetching transactions:", error);
        console.error(
          "🔍 Debug - Transaction error details:",
          error.response?.data
        );
        setError(error.response?.data?.message || "Không thể tải giao dịch");
        toast.error("Không thể tải giao dịch");
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      // Only send filters that have values
      const validFilters = Object.fromEntries(
        Object.entries(filters).filter(
          ([_, value]) => value && value.trim() !== ""
        )
      );
      console.log("🔍 Debug - Stats filters being sent:", validFilters);
      const response = await transactionApi.getTransactionStatistics(validFilters);
      const statsResponse = response.data;
      console.log("🔍 Debug - Stats response:", statsResponse);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data.statistics);
      } else {
        setStats(null);
      }
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      console.error("🔍 Debug - Stats error details:", error.response?.data);
      toast.error("Không thể tải thống kê");
    } finally {
      setStatsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (showStats) {
      fetchStats();
    }
  }, [showStats, fetchStats]);

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
      status: "",
      transactionType: "",
      paymentPurpose: "",
      startDate: "",
      endDate: "",
      search: "",
    };
    setFilters(clearedFilters);
    fetchTransactions(1, clearedFilters);
  };

  const handleRefund = async () => {
    if (!selectedTransaction || !refundData.reason) {
      toast.error("Vui lòng nhập lý do hoàn tiền");
      return;
    }

    try {
      await transactionApi.processRefund(selectedTransaction._id, {
        amount: refundData.amount ? parseInt(refundData.amount) : undefined,
        reason: refundData.reason,
      });

      toast.success("Hoàn tiền thành công");
      setRefundModal(false);
      setRefundData({ amount: "", reason: "" });
      setSelectedTransaction(null);
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể hoàn tiền");
    }
  };

  const handleUpdateStatus = async (
    transactionId: string,
    newStatus: string
  ) => {
    try {
      await transactionApi.updateTransactionStatus(transactionId, {
        status: newStatus,
        additionalData: { updatedBy: user?._id },
      });

      toast.success("Cập nhật trạng thái thành công");
      fetchTransactions();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Không thể cập nhật trạng thái"
      );
    }
  };

  const processExpiredTransactions = async () => {
    try {
      const response = await transactionApi.processExpiredTransactions();
      toast.success(response.data.message || "Xử lý giao dịch hết hạn thành công");
      fetchTransactions();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Không thể xử lý giao dịch hết hạn"
      );
    }
  };

  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
          }
        `}</style>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Quản lý giao dịch
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Quản lý tất cả giao dịch thanh toán trong hệ thống
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowStats(!showStats)}
                className="inline-flex items-center px-4 py-2 border border-dark-200 rounded-md shadow-sm text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900"
              >
                <ChartBarIcon className="h-4 w-4 mr-2" />
                {showStats ? "Ẩn thống kê" : "Hiện thống kê"}
              </button>
              <button
                onClick={() => fetchTransactions()}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-dark-200 rounded-md shadow-sm text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900 disabled:opacity-50"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Làm mới
              </button>
              <button
                onClick={processExpiredTransactions}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm text-text-muted text-red-700 bg-dark-300 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Dọn dẹp hết hạn
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        {showStats && (
          <div className="bg-dark-300 rounded-lg shadow-sm border mb-6 p-6">
            <h3 className="text-lg text-text-muted text-white mb-4">
              Thống kê giao dịch
            </h3>

            {statsLoading ? (
              <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-dark-100 p-4 rounded-lg">
                    <div className="h-4 bg-dark-300 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-dark-300 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-dark-900 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-muted text-lime-600">
                        Tổng giao dịch
                      </p>
                      <p className="text-2xl font-bold text-lime-900">
                        {stats.totalTransactions || 0}
                      </p>
                    </div>
                    <DocumentTextIcon className="h-8 w-8 text-lime-500" />
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-muted text-green-600">
                        Doanh thu
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        {formatVND(stats.totalRevenue || 0)}
                      </p>
                    </div>
                    <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-muted text-purple-600">
                        Tỷ lệ thành công
                      </p>
                      <p className="text-2xl font-bold text-purple-900">
                        {((stats.successRate || 0) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <CheckCircleIcon className="h-8 w-8 text-purple-500" />
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-muted text-orange-600">
                        Thất bại
                      </p>
                      <p className="text-2xl font-bold text-orange-900">
                        {stats.byStatus?.find((s: any) => s.status === "failed")
                          ?.count || 0}
                      </p>
                    </div>
                    <XCircleIcon className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-text-muted text-center py-4">
                Không có dữ liệu thống kê
              </p>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-dark-300 rounded-lg shadow-sm border mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-text-muted text-white">Bộ lọc</h3>
            {Object.values(filters).some((value) => value) && (
              <button
                onClick={clearFilters}
                className="text-sm text-lime-600 hover:text-lime-500"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Tìm kiếm
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Mã giao dịch, khách hàng..."
                  className="pl-10 w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 sm:text-sm"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Trạng thái
              </label>
              <select
                className="w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 sm:text-sm"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(transactionStatusTranslations).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Loại giao dịch
              </label>
              <select
                className="w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 sm:text-sm"
                value={filters.transactionType}
                onChange={(e) =>
                  handleFilterChange("transactionType", e.target.value)
                }
              >
                <option value="">Tất cả loại</option>
                {Object.entries(transactionTypeTranslations).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Mục đích thanh toán
              </label>
              <select
                className="w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 sm:text-sm"
                value={filters.paymentPurpose}
                onChange={(e) =>
                  handleFilterChange("paymentPurpose", e.target.value)
                }
              >
                <option value="">Tất cả mục đích</option>
                {Object.entries(paymentPurposeTranslations).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                className="w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 sm:text-sm"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
              />
            </div>

            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                className="w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 sm:text-sm"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          {loading ? (
            // Loading state
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="bg-dark-300 rounded-lg shadow-sm border p-6 animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="h-6 bg-dark-300 rounded w-64 mb-3"></div>
                      <div className="h-4 bg-dark-300 rounded w-48 mb-2"></div>
                      <div className="h-4 bg-dark-300 rounded w-32"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-8 bg-dark-300 rounded w-32 mb-2"></div>
                      <div className="h-6 bg-dark-300 rounded w-24"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            // Error state
            <div className="bg-dark-300 rounded-lg shadow-sm border p-8 text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-600 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Không thể tải giao dịch
              </h3>
              <p className="text-text-secondary mb-4">{error}</p>
              <button
                onClick={() => fetchTransactions()}
                className="inline-flex items-center px-4 py-2 border border-dark-200 rounded-md shadow-sm text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Thử lại
              </button>
            </div>
          ) : transactions.length === 0 ? (
            // Empty state
            <div className="bg-dark-300 rounded-lg shadow-sm border p-8 text-center">
              <CreditCardIcon className="mx-auto h-12 w-12 text-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Không có giao dịch
              </h3>
              <p className="text-text-secondary">
                Không có giao dịch nào trong khoảng thời gian này.
              </p>
            </div>
          ) : (
            // Transaction cards
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const StatusIcon = getStatusIcon(transaction.status);
                const PaymentMethodIcon = getPaymentMethodIcon(transaction.transactionType);
                const statusInfo = getStatusInfo(transaction.status);
                const paymentDetails = getPaymentMethodDetails(transaction);
                const customerInfo = getCustomerInfo(transaction);
                const staffInfo = getStaffProcessingInfo(transaction);
                const isExpanded = expandedTransaction === transaction._id;

                return (
                  <div
                    key={transaction._id}
                    className="bg-dark-300 rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* Main Transaction Card */}
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="flex items-center space-x-2">
                              <PaymentMethodIcon className="h-5 w-5 text-text-secondary" />
                              <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">
                                {transaction.transactionRef || transaction._id}
                              </h3>
                              <p className="text-sm text-text-muted">
                                {formatVietnameseDateTime(transaction.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted ${getStatusColor(
                                transaction.status
                              )}`}>
                                {transactionStatusTranslations[transaction.status] || transaction.status}
                              </span>
                              <span className="text-sm text-text-muted">•</span>
                              <span className="text-sm text-text-secondary">
                                {transactionTypeTranslations[transaction.transactionType] || transaction.transactionType}
                              </span>
                              <span className="text-sm text-text-muted">•</span>
                              <span className="text-sm text-text-secondary">
                                {paymentPurposeTranslations[transaction.paymentPurpose] || transaction.paymentPurpose}
                              </span>
                            </div>

                            {/* Customer preview */}
                            {customerInfo.length > 0 && (
                              <div className="text-xs text-text-muted">
                                Khách hàng: {customerInfo[0].value}
                              </div>
                            )}

                            {transaction.notes && (
                              <p className="text-sm text-text-secondary">
                                {transaction.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right ml-6">
                          <div className="text-2xl font-bold text-white mb-1">
                            {formatVND(transaction.amount)}
                          </div>
                          {transaction.paidAmount !== transaction.amount && (
                            <div className="text-sm text-text-muted">
                              Đã thanh toán: {formatVND(transaction.paidAmount)}
                            </div>
                          )}

                          {/* Staff Action Buttons */}
                          <div className="mt-3 space-x-2">
                            {transaction.status === "completed" && (
                              <button
                                onClick={() => {
                                  setSelectedTransaction(transaction);
                                  setRefundModal(true);
                                }}
                                className="inline-flex items-center px-3 py-1 border border-red-300 rounded text-xs text-text-muted text-red-700 bg-dark-300 hover:bg-red-50"
                              >
                                <BanknotesIcon className="h-3 w-3 mr-1" />
                                Hoàn tiền
                              </button>
                            )}

                            <select
                              onChange={(e) => handleUpdateStatus(transaction._id, e.target.value)}
                              value={transaction.status}
                              className="inline-flex items-center px-3 py-1 border border-dark-300 rounded text-xs text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900"
                            >
                              <option value="">Cập nhật trạng thái</option>
                              <option value="pending">Đang chờ</option>
                              <option value="processing">Đang xử lý</option>
                              <option value="completed">Hoàn thành</option>
                              <option value="failed">Thất bại</option>
                              <option value="cancelled">Hủy</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Status message */}
                      <div className={`mt-4 p-3 rounded-lg ${statusInfo.bgColor} ${statusInfo.color.replace('text-', 'text-')}`}>
                        <div className="flex items-center">
                          <StatusIcon className="h-4 w-4 mr-2" />
                          <span className="text-sm">
                            {statusInfo.text}
                          </span>
                        </div>
                      </div>

                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => setExpandedTransaction(isExpanded ? null : transaction._id)}
                        className="mt-4 flex items-center space-x-2 text-lime-600 hover:text-lime-500 text-sm text-text-muted transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <span>Ẩn chi tiết</span>
                            <ChevronUpIcon className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            <span>Xem chi tiết</span>
                            <ChevronDownIcon className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-dark-200 bg-dark-900 p-6 animate-fadeIn">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Customer Information */}
                          {customerInfo.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                                <UserGroupIcon className="h-4 w-4 mr-2" />
                                Thông tin khách hàng
                              </h4>
                              <div className="space-y-2">
                                {customerInfo.map((detail, index) => (
                                  <div key={index} className="flex justify-between items-center py-2 border-b border-dark-200">
                                    <span className="text-sm text-text-secondary">{detail.label}</span>
                                    <span className="text-sm text-text-muted text-white">{detail.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Payment Method Details */}
                          {paymentDetails.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                                <CreditCardIcon className="h-4 w-4 mr-2" />
                                Chi tiết thanh toán
                              </h4>
                              <div className="space-y-2">
                                {paymentDetails.map((detail, index) => (
                                  <div key={index} className="flex justify-between items-center py-2 border-b border-dark-200">
                                    <span className="text-sm text-text-secondary">{detail.label}</span>
                                    <span className="text-sm text-text-muted text-white">{detail.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Staff Processing Information */}
                        {staffInfo.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-dark-200">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                              <ShieldCheckIcon className="h-4 w-4 mr-2" />
                              Thông tin xử lý
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {staffInfo.map((detail, index) => (
                                <div key={index} className="bg-dark-300 rounded-lg p-4 border">
                                  <div className="flex items-center space-x-2">
                                    <detail.icon className="h-4 w-4 text-lime-500" />
                                    <span className="text-sm text-text-secondary">{detail.label}</span>
                                  </div>
                                  <div className="mt-1 text-sm text-text-muted text-white">{detail.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Related Services */}
                        {(transaction.appointmentId || transaction.invoiceId) && (
                          <div className="mt-6 pt-6 border-t border-dark-200">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                              <DocumentTextIcon className="h-4 w-4 mr-2" />
                              Dịch vụ liên quan
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {transaction.appointmentId && (
                                <div className="bg-dark-300 rounded-lg p-4 border">
                                  <div className="text-sm text-text-muted mb-1">Lịch hẹn dịch vụ</div>
                                  <div className="text-sm text-text-muted text-white">
                                    {typeof transaction.appointmentId === 'object'
                                      ? transaction.appointmentId.appointmentNumber || transaction.appointmentId._id
                                      : transaction.appointmentId
                                    }
                                  </div>
                                </div>
                              )}
                              {transaction.invoiceId && (
                                <div className="bg-dark-300 rounded-lg p-4 border">
                                  <div className="text-sm text-text-muted mb-1">Hóa đơn thanh toán</div>
                                  <div className="text-sm text-text-muted text-white">
                                    {typeof transaction.invoiceId === 'object'
                                      ? transaction.invoiceId.invoiceNumber || transaction.invoiceId._id
                                      : transaction.invoiceId
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {(transaction.notes || transaction.customerNotes) && (
                          <div className="mt-6 pt-6 border-t border-dark-200">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                              <InformationCircleIcon className="h-4 w-4 mr-2" />
                              Ghi chú
                            </h4>
                            <div className="space-y-3">
                              {transaction.notes && (
                                <div className="bg-dark-300 rounded-lg p-4 border">
                                  <div className="text-sm text-text-muted text-text-secondary mb-1">Ghi chú nội bộ</div>
                                  <div className="text-sm text-white">{transaction.notes}</div>
                                </div>
                              )}
                              {transaction.customerNotes && (
                                <div className="bg-dark-900 rounded-lg p-4 border border-blue-200">
                                  <div className="text-sm text-text-muted text-lime-700 mb-1">Ghi chú khách hàng</div>
                                  <div className="text-sm text-lime-900">{transaction.customerNotes}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Error Information */}
                        {(transaction.errorMessage || transaction.errorCode) && (
                          <div className="mt-6 pt-6 border-t border-dark-200">
                            <h4 className="text-sm font-semibold text-red-900 mb-3 flex items-center">
                              <XCircleIcon className="h-4 w-4 mr-2" />
                              Thông tin lỗi
                            </h4>
                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                              {transaction.errorCode && (
                                <div className="mb-2">
                                  <span className="text-sm text-text-muted text-red-700">Mã lỗi:</span>
                                  <span className="text-sm text-red-900 ml-2">{transaction.errorCode}</span>
                                </div>
                              )}
                              {transaction.errorMessage && (
                                <div>
                                  <span className="text-sm text-text-muted text-red-700">Thông báo:</span>
                                  <span className="text-sm text-red-900 ml-2">{transaction.errorMessage}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Processing Timeline */}
                        <div className="mt-6 pt-6 border-t border-dark-200">
                          <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                            <ClockIcon className="h-4 w-4 mr-2" />
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center py-2">
                              <span className="text-sm text-text-secondary">Thời gian tạo</span>
                              <span className="text-sm text-text-muted text-white">{formatVietnameseDateTime(transaction.createdAt)}</span>
                            </div>
                            {transaction.updatedAt && (
                              <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-text-secondary">Cập nhật lần cuối</span>
                                <span className="text-sm text-text-muted text-white">{formatVietnameseDateTime(transaction.updatedAt)}</span>
                              </div>
                            )}
                            {transaction.processedAt && (
                              <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-text-secondary">Thời gian xử lý</span>
                                <span className="text-sm text-text-muted text-white">{formatVietnameseDateTime(transaction.processedAt)}</span>
                              </div>
                            )}
                            {transaction.expiresAt && transaction.status === "pending" && (
                              <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-text-secondary">Thời gian hết hạn</span>
                                <span className="text-sm text-text-muted text-orange-900">{formatVietnameseDateTime(transaction.expiresAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more button */}
          {!loading && !error && transactions.length > 0 && (
            <div className="text-center pt-6">
              <button
                onClick={() => fetchTransactions(pagination.page + 1)}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-dark-200 rounded-md shadow-sm text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Tải thêm
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Refund Modal */}
      {refundModal && selectedTransaction && (
        <div className="fixed inset-0 bg-dark-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-dark-300">
            <div className="mt-3">
              <h3 className="text-lg text-text-muted text-white mb-4">
                Hoàn tiền giao dịch
              </h3>

              <div className="mb-4 p-3 bg-dark-900 rounded">
                <p className="text-sm">
                  <strong>Mã giao dịch:</strong>{" "}
                  {selectedTransaction.transactionRef}
                </p>
                <p className="text-sm">
                  <strong>Số tiền:</strong>{" "}
                  {formatVND(selectedTransaction.amount)}
                </p>
                <p className="text-sm">
                  <strong>Trạng thái:</strong>{" "}
                  {transactionStatusTranslations[selectedTransaction.status]}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Số tiền hoàn (để trống để hoàn toàn bộ)
                </label>
                <input
                  type="number"
                  className="w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 sm:text-sm"
                  placeholder={formatVND(selectedTransaction.amount)}
                  value={refundData.amount}
                  onChange={(e) =>
                    setRefundData({ ...refundData, amount: e.target.value })
                  }
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Lý do hoàn tiền *
                </label>
                <textarea
                  className="w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400 sm:text-sm"
                  rows={3}
                  placeholder="Nhập lý do hoàn tiền..."
                  value={refundData.reason}
                  onChange={(e) =>
                    setRefundData({ ...refundData, reason: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setRefundModal(false);
                    setRefundData({ amount: "", reason: "" });
                    setSelectedTransaction(null);
                  }}
                  className="px-4 py-2 text-sm text-text-muted text-text-secondary bg-dark-300 border border-dark-200 rounded-md hover:bg-dark-900"
                >
                  Hủy
                </button>
                <button
                  onClick={handleRefund}
                  className="px-4 py-2 text-sm text-text-muted text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  Xác nhận hoàn tiền
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffTransactionManagement;
