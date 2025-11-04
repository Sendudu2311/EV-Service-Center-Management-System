import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  PrinterIcon,
  ShareIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import { appointmentsAPI } from "../../services/api";
import toast from "react-hot-toast";

interface InvoiceDisplayModalProps {
  appointmentId: string;
  isOpen: boolean;
  onClose: () => void;
}

const InvoiceDisplayModal: React.FC<InvoiceDisplayModalProps> = ({
  appointmentId,
  isOpen,
  onClose,
}) => {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && appointmentId) {
      fetchInvoice();
    }
  }, [isOpen, appointmentId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response =
        await appointmentsAPI.getInvoiceByAppointment(appointmentId);
      if (response.data.success) {
        console.log("Invoice data:", response.data.data);
        console.log("Transactions:", response.data.data.transactions);
        setInvoice(response.data.data);
      } else {
        toast.error("Không thể tải hóa đơn");
      }
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast.error("Không thể tải hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    if (!date) return "Chưa có ngày";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "Ngày không hợp lệ";
      return dateObj.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Ngày không hợp lệ";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Hóa đơn ${invoice?.invoiceNumber}`,
          text: `Hóa đơn dịch vụ xe điện - ${invoice?.customerInfo?.name}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép link hóa đơn");
    }
  };

  const handleDownloadPDF = () => {
    try {
      // Create a new window for printing
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Không thể mở cửa sổ in. Vui lòng kiểm tra popup blocker.");
        return;
      }

      // Generate HTML content for PDF
      const htmlContent = generateInvoiceHTML();

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };

      toast.success("Đang mở cửa sổ in PDF...");
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error("Có lỗi xảy ra khi tạo PDF");
    }
  };

  const generateInvoiceHTML = () => {
    const currentDate = new Date().toLocaleDateString("vi-VN");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Hóa đơn ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-info { margin-bottom: 20px; }
          .customer-info, .vehicle-info { margin-bottom: 20px; }
          .services-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .services-table th, .services-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .services-table th { background-color: #f2f2f2; }
          .totals { text-align: right; margin-top: 20px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>HÓA ĐƠN DỊCH VỤ XE ĐIỆN</h1>
          <p className="font-semibold text-white">Số hóa đơn: ${invoice.invoiceNumber}</p>
          <p className="font-semibold text-white">Ngày tạo: ${formatDate(invoice.createdAt)}</p>
        </div>

        <div class="invoice-info">
          <h3>Thông tin khách hàng</h3>
          <p className="font-semibold text-white"><strong>Tên:</strong> ${invoice.customerInfo?.name || "N/A"}</p>
          <p className="font-semibold text-white"><strong>Email:</strong> ${invoice.customerInfo?.email || "N/A"}</p>
          <p className="font-semibold text-white"><strong>SĐT:</strong> ${invoice.customerInfo?.phone || "N/A"}</p>
        </div>

        <div class="vehicle-info">
          <h3>Thông tin xe</h3>
          <p className="font-semibold text-white"><strong>Xe:</strong> ${invoice.vehicleInfo?.make || "N/A"} ${
            invoice.vehicleInfo?.model || "N/A"
          }</p>
          <p className="font-semibold text-white"><strong>Năm:</strong> ${invoice.vehicleInfo?.year || "N/A"}</p>
          <p className="font-semibold text-white"><strong>Biển số:</strong> ${
            invoice.vehicleInfo?.licensePlate || "N/A"
          }</p>
          <p className="font-semibold text-white"><strong>VIN:</strong> ${invoice.vehicleInfo?.vin || "N/A"}</p>
        </div>

        <h3>Dịch vụ đã thực hiện</h3>
        <table class="services-table">
          <thead>
            <tr>
              <th>Dịch vụ</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${
              invoice.serviceItems
                ?.map(
                  (item: any) => `
              <tr>
                <td>${item.serviceName || "N/A"}</td>
                <td>${item.quantity || 1}</td>
                <td>${formatCurrency(item.unitPrice || 0)}</td>
                <td>${formatCurrency(item.totalPrice || 0)}</td>
              </tr>
            `
                )
                .join("") || '<tr><td colspan="4">Không có dịch vụ</td></tr>'
            }
          </tbody>
        </table>

        ${
          invoice.partItems && invoice.partItems.length > 0
            ? `
        <h3>Phụ tùng</h3>
        <table class="services-table">
          <thead>
            <tr>
              <th>Tên phụ tùng</th>
              <th>Mã phụ tùng</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.partItems
              .map(
                (item: any) => `
              <tr>
                <td>${item.partName || "N/A"}</td>
                <td>${item.partNumber || "N/A"}</td>
                <td>${item.quantity || 1}</td>
                <td>${formatCurrency(item.unitPrice || 0)}</td>
                <td>${formatCurrency(item.totalPrice || 0)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        `
            : ""
        }

        ${
          invoice.additionalCharges &&
          invoice.additionalCharges.filter(
            (c: any) => c.type === "other" && c.description.includes("External")
          ).length > 0
            ? `
        <h3>Phụ tùng ngoài (External Parts)</h3>
        <table class="services-table">
          <thead>
            <tr>
              <th>Mô tả</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.additionalCharges
              .filter(
                (c: any) =>
                  c.type === "other" && c.description.includes("External")
              )
              .map(
                (item: any) => `
              <tr>
                <td>${item.description || "N/A"}</td>
                <td>${formatCurrency(item.amount || 0)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        `
            : ""
        }

        <div class="totals">
          ${
            invoice.totals?.subtotalServices > 0
              ? `<p><strong>Tạm tính (dịch vụ):</strong> ${formatCurrency(
                  invoice.totals.subtotalServices
                )}</p>`
              : ""
          }
          ${
            invoice.totals?.subtotalParts > 0
              ? `<p><strong>Phụ tùng:</strong> ${formatCurrency(
                  invoice.totals.subtotalParts
                )}</p>`
              : ""
          }
          ${
            invoice.totals?.subtotalLabor > 0
              ? `<p><strong>Chi phí công:</strong> ${formatCurrency(
                  invoice.totals.subtotalLabor
                )}</p>`
              : ""
          }
          ${
            invoice.totals?.subtotalAdditional > 0
              ? `<p><strong>Phụ tùng ngoài:</strong> ${formatCurrency(
                  invoice.totals.subtotalAdditional
                )}</p>`
              : ""
          }
          <p style="border-top: 1px solid #ddd; padding-top: 8px; margin-top: 8px;"><strong>Tổng tạm tính:</strong> ${formatCurrency(
            invoice.totals?.subtotal || 0
          )}</p>
          <p className="font-semibold text-white"><strong>VAT (10%):</strong> ${formatCurrency(
            invoice.totals?.taxAmount || 0
          )}</p>
          <p style="font-size: 18px; font-weight: bold;"><strong>Tổng cộng:</strong> ${formatCurrency(
            invoice.totals?.totalAmount || 0
          )}</p>
          ${
            invoice.totals?.depositAmount > 0
              ? `<p style="color: #10b981;"><strong>Đã đặt cọc:</strong> -${formatCurrency(
                  invoice.totals.depositAmount
                )}</p>
              <p style="color: #f97316; font-size: 18px;"><strong>Còn phải trả:</strong> ${formatCurrency(
                invoice.totals?.remainingAmount || 0
              )}</p>`
              : ""
          }
        </div>

        <div class="footer">
          <p className="font-semibold text-white">Hóa đơn được tạo tự động bởi hệ thống EV Service Center</p>
          <p className="font-semibold text-white">Ngày in: ${currentDate}</p>
        </div>
      </body>
      </html>
    `;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-dark-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-dark-300 mb-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <h2 className="text-xl font-bold text-white">Hóa đơn dịch vụ</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              className="p-2 text-text-muted hover:text-text-secondary"
              title="In hóa đơn PDF"
              disabled={!invoice}
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-text-muted hover:text-text-secondary"
              title="In hóa đơn"
            >
              <PrinterIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 text-text-muted hover:text-text-secondary"
              title="Chia sẻ"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-secondary"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-text-secondary">
              Đang tải hóa đơn...
            </span>
          </div>
        ) : invoice ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Thông tin khách hàng
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-white">
                    <span className="text-text-muted">Tên:</span>{" "}
                    {invoice.customerInfo?.name}
                  </p>
                  <p className="font-semibold text-white">
                    <span className="text-text-muted">Email:</span>{" "}
                    {invoice.customerInfo?.email}
                  </p>
                  <p className="font-semibold text-white">
                    <span className="text-text-muted">SĐT:</span>{" "}
                    {invoice.customerInfo?.phone}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Thông tin xe
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-white">
                    <span className="text-text-muted">Xe:</span>{" "}
                    {invoice.vehicleInfo?.make} {invoice.vehicleInfo?.model}
                  </p>
                  <p className="font-semibold text-white">
                    <span className="text-text-muted">Năm:</span>{" "}
                    {invoice.vehicleInfo?.year}
                  </p>
                  <p className="font-semibold text-white">
                    <span className="text-text-muted">Biển số:</span>{" "}
                    {invoice.vehicleInfo?.licensePlate}
                  </p>
                  <p className="font-semibold text-white">
                    <span className="text-text-muted">VIN:</span>{" "}
                    {invoice.vehicleInfo?.vin}
                  </p>
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-text-secondary">Số hóa đơn</p>
                  <p className="font-semibold text-white">
                    {invoice.invoiceNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Ngày tạo</p>
                  <p className="font-semibold text-white">
                    {formatDate(invoice.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Trạng thái</p>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      invoice.status === "paid"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {invoice.status === "paid"
                      ? "Đã thanh toán"
                      : "Chưa thanh toán"}
                  </span>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Dịch vụ đã thực hiện
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-dark-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-text-muted uppercase tracking-wider">
                        Dịch vụ
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-text-muted uppercase tracking-wider">
                        Số lượng
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-text-muted uppercase tracking-wider">
                        Đơn giá
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-text-muted uppercase tracking-wider">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-300 divide-y divide-gray-200">
                    {invoice.serviceItems?.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {item.serviceName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Parts Section (Phụ tùng từ kho) */}
            {invoice.partItems && invoice.partItems.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Phụ tùng
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-dark-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs text-text-muted uppercase tracking-wider">
                          Tên phụ tùng
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-text-muted uppercase tracking-wider">
                          Mã phụ tùng
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-text-muted uppercase tracking-wider">
                          Số lượng
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-text-muted uppercase tracking-wider">
                          Đơn giá
                        </th>
                        <th className="px-6 py-3 text-left text-xs text-text-muted uppercase tracking-wider">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-dark-300 divide-y divide-gray-200">
                      {invoice.partItems.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 text-sm text-white">
                            {item.partName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {item.partNumber || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* External Parts Section */}
            {invoice.additionalCharges &&
              invoice.additionalCharges.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Phụ tùng ngoài (External Parts)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-dark-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs text-text-muted text-text-muted uppercase tracking-wider">
                            Mô tả
                          </th>
                          <th className="px-6 py-3 text-right text-xs text-text-muted text-text-muted uppercase tracking-wider">
                            Thành tiền
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-dark-300 divide-y divide-gray-200">
                        {invoice.additionalCharges
                          .filter(
                            (charge: any) =>
                              charge.type === "other" &&
                              charge.description.includes("External")
                          )
                          .map((charge: any, index: number) => (
                            <tr key={index}>
                              <td className="px-6 py-4 text-sm text-white">
                                {charge.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-white">
                                {formatCurrency(charge.amount)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Totals */}
            <div className="border-t pt-6">
              <div className="max-w-md ml-auto">
                <div className="space-y-2">
                  {/* Services */}
                  {invoice.totals?.subtotalServices > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white">Tạm tính (dịch vụ):</span>
                      <span className="text-white">
                        {formatCurrency(invoice.totals.subtotalServices)}
                      </span>
                    </div>
                  )}
                  {/* Parts from inventory */}
                  {invoice.totals?.subtotalParts > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white">Phụ tùng:</span>
                      <span className="text-white">
                        {formatCurrency(invoice.totals.subtotalParts)}
                      </span>
                    </div>
                  )}
                  {/* Labor */}
                  {invoice.totals?.subtotalLabor > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white">Chi phí công:</span>
                      <span className="text-white">
                        {formatCurrency(invoice.totals.subtotalLabor)}
                      </span>
                    </div>
                  )}
                  {/* External Parts */}
                  {invoice.totals?.subtotalAdditional > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white">Phụ tùng ngoài:</span>
                      <span className="text-white">
                        {formatCurrency(invoice.totals.subtotalAdditional)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-white">Tổng tạm tính:</span>
                    <span className="text-white">
                      {formatCurrency(invoice.totals?.subtotal || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white">VAT (10%):</span>
                    <span className="text-white">
                      {formatCurrency(invoice.totals?.taxAmount || 0)}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-white">Tổng cộng:</span>
                      <span className="text-lime-600">
                        {formatCurrency(invoice.totals?.totalAmount || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Deposit Deduction */}
                  {invoice.totals?.depositAmount > 0 && (
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-white">Đã đặt cọc:</span>
                      <span className="text-green-600">
                        -{formatCurrency(invoice.totals.depositAmount)}
                      </span>
                    </div>
                  )}

                  {/* Remaining Amount */}
                  {invoice.totals?.depositAmount > 0 && (
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-white">Còn phải trả:</span>
                      <span className="text-orange-500">
                        {formatCurrency(invoice.totals?.remainingAmount || 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Info */}
            {invoice.paymentInfo && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Thông tin thanh toán
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">
                      Phương thức thanh toán
                    </p>
                    <p className="font-semibold text-white">
                      {invoice.paymentInfo.method === "bank_transfer"
                        ? "Chuyển khoản ngân hàng"
                        : invoice.paymentInfo.method === "cash"
                          ? "Tiền mặt"
                          : invoice.paymentInfo.method}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">
                      Ngày thanh toán
                    </p>
                    <p className="font-semibold text-white">
                      {invoice.paymentInfo.paymentDate
                        ? formatDate(invoice.paymentInfo.paymentDate)
                        : "Chưa thanh toán"}
                    </p>
                  </div>
                  {invoice.paymentInfo.transactionRef && (
                    <div>
                      <p className="text-sm text-text-secondary">
                        Mã giao dịch
                      </p>
                      <p className="font-semibold text-white">
                        {invoice.paymentInfo.transactionRef}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transactions */}
            {invoice.transactions && invoice.transactions.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Lịch sử giao dịch
                </h3>
                <div className="space-y-3">
                  {invoice.transactions.map(
                    (transaction: any, index: number) => (
                      <div key={index} className="bg-dark-900 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-text-muted">
                              {transaction.transactionType === "bank_transfer"
                                ? "Chuyển khoản ngân hàng"
                                : transaction.transactionType === "cash"
                                  ? "Tiền mặt"
                                  : transaction.transactionType === "deposit"
                                    ? "Đặt cọc"
                                    : transaction.transactionType ||
                                      "Giao dịch"}
                            </p>
                            <p className="text-sm text-text-secondary">
                              {transaction.transactionRef} -{" "}
                              {formatDate(
                                transaction.processedAt ||
                                  transaction.createdAt ||
                                  transaction.updatedAt
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              {formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-sm text-text-secondary">
                              {transaction.status === "completed"
                                ? "Hoàn thành"
                                : transaction.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-text-muted">Không tìm thấy hóa đơn</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-dark-200 rounded-md text-text-secondary hover:bg-dark-900"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDisplayModal;
