import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { serviceReceptionAPI } from "../../services/api";
import toast from "react-hot-toast";

interface PaymentPreviewModalProps {
  appointment: any;
  isOpen: boolean;
  onClose: () => void;
}

const PaymentPreviewModal: React.FC<PaymentPreviewModalProps> = ({
  appointment,
  isOpen,
  onClose,
}) => {
  const [serviceReception, setServiceReception] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && appointment) {
      fetchServiceReception();
    }
  }, [isOpen, appointment]);

  const fetchServiceReception = async () => {
    try {
      setLoading(true);
      const response = await serviceReceptionAPI.getByAppointment(
        appointment._id
      );
      if (response.data.success) {
        setServiceReception(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching service reception:", error);
      toast.error("Không thể tải thông tin phiếu tiếp nhận");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    if (!serviceReception) {
      return { depositAmount: 0, totalAmount: 0, remainingAmount: 0 };
    }

    const depositAmount = appointment?.depositInfo?.paid
      ? appointment.depositInfo.amount
      : 0;

    // Calculate services from appointment (already booked)
    let servicesTotal = 0;
    appointment.services?.forEach((service: any) => {
      servicesTotal += (service.price || 0) * (service.quantity || 1);
    });

    // Calculate recommended services
    let recommendedServicesTotal = 0;
    serviceReception.recommendedServices?.forEach((service: any) => {
      if (service.customerApproved) {
        const price =
          (typeof service.serviceId === "object" &&
            service.serviceId?.basePrice) ||
          service.estimatedCost ||
          0;
        recommendedServicesTotal += price * (service.quantity || 1);
      }
    });

    // Calculate parts
    let partsTotal = 0;
    serviceReception.requestedParts?.forEach((part: any) => {
      if (part.isAvailable && part.isApproved) {
        const unitPrice =
          part.partId?.pricing?.retail || part.estimatedCost || 0;
        partsTotal += unitPrice * part.quantity;
      }
    });

    // Calculate labor
    const laborTotal = serviceReception.estimatedLabor?.totalCost || 0;

    const subtotal =
      servicesTotal + recommendedServicesTotal + partsTotal + laborTotal;
    const taxAmount = subtotal * 0.1;
    const totalAmount = subtotal + taxAmount;
    const remainingAmount = totalAmount - depositAmount;

    return {
      depositAmount,
      servicesTotal,
      recommendedServicesTotal,
      partsTotal,
      laborTotal,
      subtotal,
      taxAmount,
      totalAmount,
      remainingAmount,
    };
  };

  if (!isOpen) return null;

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 bg-dark-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-dark-300 mb-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <h2 className="text-xl font-bold text-white">
            Chi tiết thanh toán dự kiến
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-600"></div>
          </div>
        ) : serviceReception ? (
          <>
            {/* Payment Summary */}
            <div className="mb-6 p-4 bg-dark-900 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-lime-900 mb-3">
                Tóm tắt chi phí
              </h3>

              {/* Initial Services */}
              {appointment.services && appointment.services.length > 0 && (
                <div className="mb-4 pb-3 border-b border-dark-200">
                  <h4 className="text-sm font-semibold text-text-secondary mb-2">
                    Dịch vụ đã đặt:
                  </h4>
                  {appointment.services.map((service: any, index: number) => {
                    const price = service.price || 0;
                    const total = price * (service.quantity || 1);
                    return (
                      <div
                        key={index}
                        className="flex justify-between text-sm text-text-muted mb-1"
                      >
                        <span>
                          • {service.serviceId?.name || "Dịch vụ"} (x
                          {service.quantity || 1})
                        </span>
                        <span className="text-green-600">
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recommended Services */}
              {serviceReception.recommendedServices?.some(
                (s: any) => s.customerApproved
              ) && (
                <div className="mb-4 pb-3 border-b border-dark-200">
                  <h4 className="text-sm font-semibold text-text-secondary mb-2">
                    Dịch vụ đề xuất (đã duyệt):
                  </h4>
                  {serviceReception.recommendedServices
                    .filter((service: any) => service.customerApproved)
                    .map((service: any, index: number) => {
                      const price =
                        (typeof service.serviceId === "object" &&
                          service.serviceId?.basePrice) ||
                        service.estimatedCost ||
                        0;
                      const total = price * (service.quantity || 1);
                      return (
                        <div
                          key={index}
                          className="flex justify-between text-sm text-text-muted mb-1"
                        >
                          <span>
                            • {service.serviceName} (x{service.quantity || 1})
                          </span>
                          <span className="text-green-600">
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(total)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Parts */}
              {serviceReception.requestedParts?.some(
                (p: any) => p.isAvailable && p.isApproved
              ) && (
                <div className="mb-4 pb-3 border-b border-dark-200">
                  <h4 className="text-sm font-semibold text-text-secondary mb-2">
                    Phụ tùng:
                  </h4>
                  {serviceReception.requestedParts
                    .filter((part: any) => part.isAvailable && part.isApproved)
                    .map((part: any, index: number) => {
                      const unitPrice =
                        part.partId?.pricing?.retail || part.estimatedCost || 0;
                      const total = unitPrice * part.quantity;
                      return (
                        <div
                          key={index}
                          className="flex justify-between text-sm text-text-muted mb-1"
                        >
                          <span>
                            • {part.partId?.name || "Phụ tùng"} (x
                            {part.quantity})
                          </span>
                          <span className="text-green-600">
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(total)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Labor */}
              {totals.laborTotal > 0 && (
                <div className="mb-4 pb-3 border-b border-dark-200">
                  <h4 className="text-sm font-semibold text-text-secondary mb-2">
                    Chi phí công:
                  </h4>
                  <div className="flex justify-between text-sm text-text-muted mb-1">
                    <span>
                      • {serviceReception.estimatedLabor?.hours || 0} giờ x{" "}
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(
                        serviceReception.estimatedLabor?.hourlyRate || 0
                      )}
                    </span>
                    <span className="text-green-600">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(totals.laborTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Totals Summary */}
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <span className="text-text-secondary">Tạm tính:</span>
                  <span className="ml-2 font-semibold text-white">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(totals.subtotal)}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">VAT (10%):</span>
                  <span className="ml-2 font-semibold text-white">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(totals.taxAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">Tiền cọc đã trả:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    -
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(totals.depositAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">
                    Tổng tiền dịch vụ:
                  </span>
                  <span className="ml-2 font-semibold text-white">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(totals.totalAmount)}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-blue-200">
                  <span className="text-lg font-bold text-orange-600">
                    Số tiền cần trả:
                  </span>
                  <span className="ml-2 text-xl font-bold text-orange-600">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(totals.remainingAmount)}
                  </span>
                </div>
              </div>
              <div className="pt-2">
                <span className="text-text-secondary">Phiếu tiếp nhận:</span>
                <span className="ml-2 font-semibold text-green-600">
                  #{serviceReception.receptionNumber}
                </span>
                {appointment?.appointmentNumber && (
                  <>
                    <span className="text-text-secondary ml-4">Lịch hẹn:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      #{appointment.appointmentNumber}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                ℹ️ Đây là chi phí dự kiến dựa trên phiếu tiếp nhận đã được
                duyệt. Chi phí thực tế có thể thay đổi tùy theo tình trạng thực
                tế của xe.
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-text-secondary">
            Chưa có thông tin phiếu tiếp nhận
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-900 hover:bg-dark-200 text-white rounded-md transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPreviewModal;
