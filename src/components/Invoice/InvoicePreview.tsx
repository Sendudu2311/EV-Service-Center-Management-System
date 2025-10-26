import React from "react";
import {
  DocumentTextIcon,
  PrinterIcon,
  ShareIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  formatVND,
  formatVietnameseDate,
  formatVietnamesePhone,
} from "../../utils/vietnamese";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  appointmentId: {
    appointmentNumber: string;
    customerId: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address?: {
        street: string;
        ward: string;
        district: string;
        city: string;
      };
    };
    vehicleId: {
      make: string;
      model: string;
      year: number;
      licensePlate: string;
      vin: string;
    };
    // serviceCenterId removed - single center architecture
  };

  lineItems: {
    type: "service" | "part";
    itemId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxable: boolean;
    warranty?: {
      period: number;
      unit: "days" | "months" | "years";
      terms: string;
    };
  }[];

  financialSummary: {
    subtotal: number;
    laborCost: number;
    partsCost: number;
    vatAmount: number;
    vatRate: number;
    totalAmount: number;
    currency: string;
  };

  paymentInfo: {
    dueDate: string;
    paidAmount: number;
    remainingAmount: number;
    paymentMethod?: string;
    paymentStatus: "pending" | "partial" | "paid" | "overdue";
    transactions: {
      transactionId: string;
      amount: number;
      method: string;
      processedAt: string;
      status: string;
      reference?: string;
    }[];
  };

  vietnameseCompliance: {
    vatRegistrationNumber: string;
    businessRegistrationNumber: string;
    issuedDate: string;
    legalNotes: string[];
    digitalSignature?: {
      signedBy: string;
      signedAt: string;
      certificate: string;
    };
  };

  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  invoice: Invoice;
  onPrint?: () => void;
  onShare?: () => void;
  onPayment?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

const InvoicePreview: React.FC<Props> = ({
  invoice,
  onPrint,
  onShare,
  onPayment,
  showActions = true,
  compact = false,
}) => {
  const getStatusBadge = () => {
    const status = invoice.paymentInfo.paymentStatus;
    switch (status) {
      case "paid":
        return {
          color: "bg-green-100 text-green-800",
          text: "Đã thanh toán",
          icon: CheckCircleIcon,
        };
      case "partial":
        return {
          color: "bg-yellow-100 text-yellow-800",
          text: "Thanh toán một phần",
          icon: ClockIcon,
        };
      case "overdue":
        return {
          color: "bg-red-100 text-red-800",
          text: "Quá hạn",
          icon: ExclamationTriangleIcon,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          text: "Chờ thanh toán",
          icon: ClockIcon,
        };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  if (compact) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-900">
                #{invoice.invoiceNumber}
              </h4>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusBadge.text}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {invoice.appointmentId?.customerId?.firstName || ""}{" "}
              {invoice.appointmentId?.customerId?.lastName ||
                "Unknown Customer"}
            </p>
            <p className="text-sm text-gray-500">
              {invoice.appointmentId?.vehicleId?.make || "Unknown"}{" "}
              {invoice.appointmentId?.vehicleId?.model || "Vehicle"} -{" "}
              {invoice.appointmentId?.vehicleId?.licensePlate || "N/A"}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                {formatVietnameseDate(invoice.createdAt)}
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatVND(invoice.financialSummary.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Hóa đơn #{invoice.invoiceNumber}
              </h3>
              <p className="text-sm text-gray-600">
                Lịch hẹn: #{invoice.appointmentId?.appointmentNumber || "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusBadge.color}`}
            >
              <StatusIcon className="h-4 w-4 mr-1" />
              {statusBadge.text}
            </span>
            {showActions && (
              <div className="flex space-x-2">
                {onPrint && (
                  <button
                    onClick={onPrint}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <PrinterIcon className="h-5 w-5" />
                  </button>
                )}
                {onShare && (
                  <button
                    onClick={onShare}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <ShareIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Business Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Service Center Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Từ:</h4>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">EV Service Center</p>
              <p className="text-sm text-gray-600">EV-SC-001</p>
              <p className="text-sm text-gray-600">123 Main Street, Ward 1</p>
              <p className="text-sm text-gray-600">
                District 1, Ho Chi Minh City
              </p>
              <p className="text-sm text-gray-600">ĐT: +84 28 1234 5678</p>
              <p className="text-sm text-gray-600">
                Email: info@evservicecenter.com
              </p>
              <p className="text-sm text-gray-600">
                MST:{" "}
                {invoice.vietnameseCompliance?.vatRegistrationNumber ||
                  "0123456789"}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Đến:</h4>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">
                {invoice.appointmentId?.customerId?.firstName || ""}{" "}
                {invoice.appointmentId?.customerId?.lastName || ""}
              </p>
              <p className="text-sm text-gray-600">
                ĐT:{" "}
                {formatVietnamesePhone(
                  invoice.appointmentId?.customerId?.phone || ""
                )}
              </p>
              <p className="text-sm text-gray-600">
                Email: {invoice.appointmentId?.customerId?.email || ""}
              </p>
              {invoice.appointmentId?.customerId?.address && (
                <>
                  <p className="text-sm text-gray-600">
                    {invoice.appointmentId?.customerId?.address?.street || ""},{" "}
                    {invoice.appointmentId?.customerId?.address?.ward || ""}
                  </p>
                  <p className="text-sm text-gray-600">
                    {invoice.appointmentId?.customerId?.address?.district || ""}
                    , {invoice.appointmentId?.customerId?.address?.city || ""}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Thông tin xe:
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Xe
              </p>
              <p className="text-sm font-medium text-gray-900">
                {invoice.appointmentId?.vehicleId?.make || ""}{" "}
                {invoice.appointmentId?.vehicleId?.model || ""}{" "}
                {invoice.appointmentId?.vehicleId?.year || ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Biển số
              </p>
              <p className="text-sm font-medium text-gray-900">
                {invoice.appointmentId?.vehicleId?.licensePlate || ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Số khung
              </p>
              <p className="text-sm font-medium text-gray-900">
                {invoice.appointmentId?.vehicleId?.vin || ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Ngày xuất
              </p>
              <p className="text-sm font-medium text-gray-900">
                {formatVietnameseDate(invoice.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mô tả
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SL
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Đơn giá
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thành tiền
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.lineItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.description}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {item.type === "service" ? "Dịch vụ" : "Phụ tùng"}
                          {item.warranty && (
                            <span className="ml-2">
                              • BH: {item.warranty.period}{" "}
                              {item.warranty.unit === "months"
                                ? "tháng"
                                : item.warranty.unit === "years"
                                ? "năm"
                                : "ngày"}
                            </span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {formatVND(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatVND(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tiền công:</span>
              <span className="text-gray-900">
                {formatVND(invoice.financialSummary.laborCost)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Phụ tùng:</span>
              <span className="text-gray-900">
                {formatVND(invoice.financialSummary.partsCost)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tạm tính:</span>
              <span className="text-gray-900">
                {formatVND(invoice.financialSummary.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                VAT ({invoice.financialSummary.vatRate}%):
              </span>
              <span className="text-gray-900">
                {formatVND(invoice.financialSummary.vatAmount)}
              </span>
            </div>
            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Tổng cộng:</span>
                <span className="text-gray-900">
                  {formatVND(invoice.financialSummary.totalAmount)}
                </span>
              </div>
            </div>

            {/* Payment Information */}
            {invoice.paymentInfo.paidAmount > 0 && (
              <>
                {invoice.totals?.depositAmount > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Tiền cọc đã trả:</span>
                    <span>-{formatVND(invoice.totals.depositAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-green-600">
                  <span>Đã thanh toán:</span>
                  <span>-{formatVND(invoice.paymentInfo.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-red-600">Còn lại:</span>
                  <span className="text-red-600">
                    {formatVND(invoice.paymentInfo.remainingAmount)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Due Date */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Hạn thanh toán:{" "}
              {formatVietnameseDate(invoice.paymentInfo.dueDate)}
            </span>
          </div>
        </div>

        {/* Legal Notes */}
        {invoice.vietnameseCompliance?.legalNotes?.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Ghi chú pháp lý:
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              {invoice.vietnameseCompliance?.legalNotes?.map((note, index) => (
                <p key={index}>• {note}</p>
              ))}
            </div>
          </div>
        )}

        {/* Digital Signature */}
        {invoice.vietnameseCompliance?.digitalSignature && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-900">
                  Hóa đơn điện tử đã được ký số
                </p>
                <p className="text-xs text-blue-700">
                  Ký bởi:{" "}
                  {invoice.vietnameseCompliance?.digitalSignature?.signedBy}
                </p>
                <p className="text-xs text-blue-700">
                  Thời gian:{" "}
                  {formatVietnameseDate(
                    invoice.vietnameseCompliance?.digitalSignature?.signedAt
                  )}
                </p>
              </div>
              <CheckCircleIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="mt-6 flex items-center justify-end space-x-4">
            {invoice.paymentInfo.remainingAmount > 0 && onPayment && (
              <button
                onClick={onPayment}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium transition-colors"
              >
                Thanh toán {formatVND(invoice.paymentInfo.remainingAmount)}
              </button>
            )}
            {onPrint && (
              <button
                onClick={onPrint}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors"
              >
                In hóa đơn
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
              >
                Chia sẻ
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicePreview;
