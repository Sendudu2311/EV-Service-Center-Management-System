import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { transactionApi } from "../../services/api";
import toast from "react-hot-toast";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { formatVietnameseDateTime, formatVND } from "../../utils/vietnamese";

// Transaction status Vietnamese translations (simplified)
const transactionStatusTranslations: Record<string, string> = {
  pending: "Đang chờ xử lý",
  processing: "Đang xử lý",
  completed: "Thành công",
  failed: "Thất bại",
  cancelled: "Đã hủy",
  expired: "Hết hạn",
  refunded: "Đã hoàn tiền",
};

// Transaction type Vietnamese translations (simplified)
const transactionTypeTranslations: Record<string, string> = {
  vnpay: "VNPay",
  cash: "Tiền mặt",
  card: "Thẻ ngân hàng",
  bank_transfer: "Chuyển khoản",
  momo: "Ví MoMo",
  zalopay: "Ví ZaloPay",
};

// Payment purpose Vietnamese translations (simplified)
const paymentPurposeTranslations: Record<string, string> = {
  appointment_deposit: "Đặt cọc lịch hẹn",
  appointment_payment: "Thanh toán dịch vụ",
  invoice_payment: "Thanh toán hóa đơn",
  service_payment: "Thanh toán dịch vụ",
  refund: "Hoàn tiền",
  deposit_booking: "Đặt cọc",
  other: "Khác",
};

// Transaction status colors (simplified)
const getStatusColor = (status: string) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
    expired: "bg-orange-100 text-orange-800",
    refunded: "bg-purple-100 text-purple-800",
  };
  return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
};

// Status icon mapping (simplified)
const getStatusIcon = (status: string) => {
  const icons = {
    pending: ClockIcon,
    processing: ClockIcon,
    completed: CheckCircleIcon,
    failed: XCircleIcon,
    cancelled: XCircleIcon,
    expired: ExclamationTriangleIcon,
    refunded: CheckCircleIcon,
  };
  return icons[status as keyof typeof icons] || ClockIcon;
};

// Get payment method icon
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

// Get payment method details
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
  }

  if (transaction.transactionType === "vnpay" && transaction.vnpayData) {
    if (transaction.vnpayData.vnpBankCode) {
      details.push({
        label: "Ngân hàng",
        value: transaction.vnpayData.vnpBankCode.toUpperCase(),
        icon: BuildingOfficeIcon
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
  }

  return details;
};

const CustomerTransactions: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { limit: 20 };

      if (filter !== "all") {
        params.status = filter;
      }

      const response = await transactionApi.getMyTransactions(params);
      const apiResponse = response.data;

      if (apiResponse.success && apiResponse.data) {
        setTransactions(apiResponse.data.transactions || []);
      } else {
        setTransactions([]);
      }
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      setError(error.response?.data?.message || "Không thể tải giao dịch");
      toast.error("Không thể tải giao dịch");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getStatusInfo = (status: string) => {
    const info = {
      pending: {
        text: "Giao dịch đang được xử lý",
        icon: ClockIcon,
        color: "text-yellow-600"
      },
      processing: {
        text: "Hệ thống đang xác nhận giao dịch",
        icon: ClockIcon,
        color: "text-blue-600"
      },
      completed: {
        text: "Giao dịch đã hoàn tất thành công",
        icon: CheckCircleIcon,
        color: "text-green-600"
      },
      failed: {
        text: "Giao dịch không thành công",
        icon: XCircleIcon,
        color: "text-red-600"
      },
      cancelled: {
        text: "Giao dịch đã bị hủy",
        icon: XCircleIcon,
        color: "text-gray-600"
      },
      expired: {
        text: "Giao dịch đã hết hạn",
        icon: ExclamationTriangleIcon,
        color: "text-orange-600"
      },
      refunded: {
        text: "Đã hoàn tiền thành công",
        icon: CheckCircleIcon,
        color: "text-purple-600"
      },
    };

    return info[status as keyof typeof info] || info.pending;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Lịch sử giao dịch
          </h1>
          <p className="mt-2 text-gray-600">
            Xem lịch sử tất cả giao dịch thanh toán của bạn
          </p>
        </div>

        {/* Simple Filter */}
        <div className="bg-white rounded-lg shadow-sm border mb-6 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === "completed"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Thành công
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === "pending"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Đang xử lý
            </button>
            <button
              onClick={() => setFilter("failed")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === "failed"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Thất bại
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          {loading ? (
            // Loading state
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-6 bg-gray-300 rounded w-48 mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-32"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-6 bg-gray-300 rounded w-24 mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            // Error state
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <XCircleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Không thể tải giao dịch
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchTransactions}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Thử lại
              </button>
            </div>
          ) : transactions.length === 0 ? (
            // Empty state
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Chưa có giao dịch
              </h3>
              <p className="text-gray-600">
                Bạn chưa có giao dịch nào trong hệ thống.
              </p>
            </div>
          ) : (
            // Transaction list
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const StatusIcon = getStatusIcon(transaction.status);
                const PaymentMethodIcon = getPaymentMethodIcon(transaction.transactionType);
                const statusInfo = getStatusInfo(transaction.status);
                const paymentDetails = getPaymentMethodDetails(transaction);
                const isExpanded = expandedTransaction === transaction._id;

                return (
                  <div
                    key={transaction._id}
                    className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* Main Transaction Card */}
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="flex items-center space-x-2">
                              <PaymentMethodIcon className="h-5 w-5 text-gray-600" />
                              <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {transactionTypeTranslations[transaction.transactionType] || transaction.transactionType}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {formatVietnameseDateTime(transaction.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                transaction.status
                              )}`}>
                                {transactionStatusTranslations[transaction.status] || transaction.status}
                              </span>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-600">
                                {paymentPurposeTranslations[transaction.paymentPurpose] || transaction.paymentPurpose}
                              </span>
                            </div>

                            {transaction.notes && (
                              <p className="text-sm text-gray-600">
                                {transaction.notes}
                              </p>
                            )}

                            {/* Payment method details preview */}
                            {paymentDetails.length > 0 && (
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                {paymentDetails.slice(0, 2).map((detail, index) => (
                                  <div key={index} className="flex items-center">
                                    <detail.icon className="h-3 w-3 mr-1" />
                                    <span>{detail.value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right ml-6">
                          <div className="text-2xl font-bold text-gray-900 mb-1">
                            {formatVND(transaction.amount)}
                          </div>
                          {transaction.paidAmount !== transaction.amount && (
                            <div className="text-sm text-gray-500">
                              Đã thanh toán: {formatVND(transaction.paidAmount)}
                            </div>
                          )}
                          {transaction.transactionRef && (
                            <div className="text-xs text-gray-500 mt-1">
                              Mã: {transaction.transactionRef}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status message */}
                      <div className={`mt-4 p-3 rounded-lg ${
                        transaction.status === "completed" ? "bg-green-50 text-green-800" :
                        transaction.status === "failed" || transaction.status === "cancelled" ? "bg-red-50 text-red-800" :
                        transaction.status === "pending" || transaction.status === "processing" ? "bg-blue-50 text-blue-800" :
                        "bg-gray-50 text-gray-800"
                      }`}>
                        <div className="flex items-center">
                          <StatusIcon className="h-4 w-4 mr-2" />
                          <span className="text-sm">
                            {statusInfo.text}
                          </span>
                        </div>
                      </div>

                      {/* Expand/Collapse Button */}
                      {(paymentDetails.length > 0 || transaction.appointmentId || transaction.invoiceId || transaction.billingInfo) && (
                        <button
                          onClick={() => setExpandedTransaction(isExpanded ? null : transaction._id)}
                          className="mt-4 flex items-center space-x-2 text-blue-600 hover:text-blue-500 text-sm font-medium transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <span>Ẩn chi tiết</span>
                              <ArrowPathIcon className="h-4 w-4 rotate-180" />
                            </>
                          ) : (
                            <>
                              <span>Xem chi tiết</span>
                              <ArrowPathIcon className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-6 animate-fadeIn">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Payment Method Details */}
                          {paymentDetails.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                <CreditCardIcon className="h-4 w-4 mr-2" />
                                Thông tin thanh toán
                              </h4>
                              <div className="space-y-2">
                                {paymentDetails.map((detail, index) => (
                                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-sm text-gray-600">{detail.label}</span>
                                    <span className="text-sm font-medium text-gray-900">{detail.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Billing Information */}
                          {transaction.billingInfo && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                <UserIcon className="h-4 w-4 mr-2" />
                                Thông tin thanh toán
                              </h4>
                              <div className="space-y-2">
                                {transaction.billingInfo.fullName && (
                                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-sm text-gray-600">Họ tên</span>
                                    <span className="text-sm font-medium text-gray-900">{transaction.billingInfo.fullName}</span>
                                  </div>
                                )}
                                {transaction.billingInfo.mobile && (
                                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-sm text-gray-600">Số điện thoại</span>
                                    <span className="text-sm font-medium text-gray-900">{transaction.billingInfo.mobile}</span>
                                  </div>
                                )}
                                {transaction.billingInfo.email && (
                                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-sm text-gray-600">Email</span>
                                    <span className="text-sm font-medium text-gray-900">{transaction.billingInfo.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Related Services */}
                        {(transaction.appointmentId || transaction.invoiceId) && (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Dịch vụ liên quan</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {transaction.appointmentId && (
                                <div className="bg-white rounded-lg p-4 border">
                                  <div className="text-sm text-gray-500 mb-1">Lịch hẹn dịch vụ</div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {typeof transaction.appointmentId === 'object'
                                      ? transaction.appointmentId.appointmentNumber || transaction.appointmentId._id
                                      : transaction.appointmentId
                                    }
                                  </div>
                                </div>
                              )}
                              {transaction.invoiceId && (
                                <div className="bg-white rounded-lg p-4 border">
                                  <div className="text-sm text-gray-500 mb-1">Hóa đơn thanh toán</div>
                                  <div className="text-sm font-medium text-gray-900">
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

                        {/* Customer Notes */}
                        {transaction.customerNotes && (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Ghi chú của bạn</h4>
                            <div className="bg-blue-50 rounded-lg p-4">
                              <p className="text-sm text-blue-900">{transaction.customerNotes}</p>
                            </div>
                          </div>
                        )}

                        {/* Processing Timeline */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Thời gian xử lý</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center py-2">
                              <span className="text-sm text-gray-600">Thời gian tạo</span>
                              <span className="text-sm font-medium text-gray-900">{formatVietnameseDateTime(transaction.createdAt)}</span>
                            </div>
                            {transaction.processedAt && (
                              <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-gray-600">Thời gian xử lý</span>
                                <span className="text-sm font-medium text-gray-900">{formatVietnameseDateTime(transaction.processedAt)}</span>
                              </div>
                            )}
                            {transaction.expiresAt && transaction.status === "pending" && (
                              <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-gray-600">Hết hạn</span>
                                <span className="text-sm font-medium text-orange-900">{formatVietnameseDateTime(transaction.expiresAt)}</span>
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
                onClick={fetchTransactions}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Tải thêm
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerTransactions;