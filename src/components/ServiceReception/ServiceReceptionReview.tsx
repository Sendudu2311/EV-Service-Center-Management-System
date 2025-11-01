import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { formatVND } from "../../utils/vietnamese";
import { partConflictsAPI } from "../../services/api";

interface ServiceReception {
  _id: string;
  receptionNumber: string;
  appointmentId: {
    _id: string;
    appointmentNumber: string;
  };
  customerId: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  vehicleId: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    vin: string;
  };
  vehicleCondition: {
    exterior: {
      condition: string;
      damages: Array<{
        location: string;
        type: string;
        severity: string;
        description: string;
      }>;
      notes: string;
    };
    interior: {
      condition: string;
      cleanliness: string;
      damages: Array<{
        location: string;
        type: string;
        description: string;
      }>;
      notes: string;
    };
    battery: {
      level: number;
      health: string;
      chargingStatus: string;
      notes: string;
    };
    mileage: {
      current: number;
    };
  };
  customerItems: Array<{
    item: string;
    location: string;
    value?: number;
    notes: string;
  }>;
  recommendedServices: Array<{
    serviceId:
      | {
          _id: string;
          name: string;
          category: string;
          estimatedDuration: number;
        }
      | string;
    serviceName: string;
    category: string;
    quantity: number;
    reason: string;
    estimatedDuration?: number;
    estimatedCost?: number;
  }>;
  requestedParts: Array<{
    partId:
      | {
          _id: string;
          name: string;
          partNumber: string;
          pricing: {
            retail: number;
          };
        }
      | string;
    partName: string;
    partNumber?: string;
    quantity: number;
    reason: string;
    estimatedCost?: number;
  }>;
  specialInstructions: {
    fromCustomer: string;
    safetyPrecautions: string[];
    warningNotes: string[];
  };
  estimatedServiceTime: number;
  status: string;
  receivedBy: {
    firstName: string;
    lastName: string;
  };
  receivedAt: string;
  evChecklistItems?: Array<{
    id: string;
    label: string;
    category: "battery" | "charging" | "motor" | "safety" | "general";
    checked: boolean;
    status?: "good" | "warning" | "critical";
    notes?: string;
  }>;
}

interface ServiceReceptionReviewProps {
  receptions: ServiceReception[];
  onReview: (
    receptionId: string,
    decision: "approve" | "reject",
    notes: string
  ) => Promise<void>;
  loading?: boolean;
  onReceptionUpdated?: () => void;
}

const ServiceReceptionReview: React.FC<ServiceReceptionReviewProps> = ({
  receptions,
  onReview,
  loading = false,
  onReceptionUpdated,
}) => {
  const [selectedReception, setSelectedReception] =
    useState<ServiceReception | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReviewSubmit = async (decision: "approve" | "reject") => {
    if (!selectedReception) return;

    try {
      setIsSubmitting(true);

      // Check for conflicts before approving - HARD BLOCK
      if (decision === "approve") {
        try {
          const conflictCheck = await partConflictsAPI.checkReceptionConflicts(
            selectedReception._id
          );

          if (conflictCheck.data.hasConflict) {
            const conflictCount = conflictCheck.data.conflictCount;
            const conflicts = conflictCheck.data.conflicts;

            // Build conflict details message
            const conflictParts = conflicts
              .map((c: any) => `${c.partName} (${c.partNumber})`)
              .join(", ");

            // HARD BLOCK - Cannot approve if conflict exists
            toast.error(
              `Không thể duyệt phiếu tiếp nhận!\n\n` +
                `Phiếu này có ${conflictCount} xung đột phụ tùng:\n` +
                `${conflictParts}\n\n` +
                `Vui lòng giải quyết xung đột trong tab "Quản lý xung đột" trước khi duyệt.`,
              {
                duration: 8000,
                icon: '🚫',
              }
            );
            setIsSubmitting(false);
            return; // BLOCK approval completely
          }
        } catch (conflictError: any) {
          console.error("Error checking conflicts:", conflictError);
          
          // HARD BLOCK on API error too - cannot verify safety
          const errorMsg = conflictError.response?.data?.message || 
                          conflictError.message || 
                          "Lỗi kết nối";
          
          toast.error(
            `🚫 Không thể kiểm tra xung đột phụ tùng!\n\n` +
            `Lỗi: ${errorMsg}\n\n` +
            `Vui lòng thử lại hoặc liên hệ quản trị viên.`,
            {
              duration: 8000,
              icon: '🚫',
            }
          );
          setIsSubmitting(false);
          return; // BLOCK approval on API error
        }
      }

      await onReview(selectedReception._id, decision, reviewNotes);

      toast.success(
        decision === "approve"
          ? "Đã duyệt phiếu tiếp nhận"
          : "Đã từ chối phiếu tiếp nhận"
      );

      setSelectedReception(null);
      setReviewNotes("");
      if (onReceptionUpdated) {
        onReceptionUpdated();
      }
    } catch (error: any) {
      console.error("Error submitting review:", error);

      // Show specific error message from API if available
      const errorMessage = error.response?.data?.message ||
                          error.message ||
                          "Không thể submit đánh giá";

      toast.error(errorMessage, {
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (receptions.length === 0) {
    return (
      <div className="text-center py-12 bg-dark-900 rounded-lg">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-text-muted mb-4" />
        <h3 className="text-lg text-text-muted text-white mb-2">
          Không có phiếu tiếp nhận nào cần duyệt
        </h3>
        <p className="text-text-muted">
          Tất cả phiếu tiếp nhận đã được xử lý hoặc chưa có phiếu nào được tạo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reception List */}
      <div className="grid gap-6">
        {receptions.map((reception) => (
          <div
            key={reception._id}
            className={`bg-dark-300 border rounded-lg shadow-sm hover:shadow-md transition-all ${
              (reception as any).hasConflict
                ? 'border-red-500 border-2 bg-red-900/10'
                : 'border-dark-200'
            }`}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Phiếu #{reception.receptionNumber}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Lịch hẹn #{reception.appointmentId.appointmentNumber}
                    </p>
                  </div>
                  {(reception as any).hasConflict && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-600 text-white animate-pulse">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      Xung đột phụ tùng
                    </span>
                  )}
                </div>
                {(reception as any).hasConflict ? (
                  <div className="text-yellow-400 text-sm flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    <span>
                      Có xung đột phụ tùng.{' '}
                      <button
                        onClick={() => setSelectedReception(reception)}
                        className="text-blue-400 underline hover:text-blue-300"
                      >
                        Xem chi tiết
                      </button>
                      {' '}hoặc{' '}
                      <a
                        href="/part-conflicts"
                        className="text-blue-400 underline hover:text-blue-300"
                      >
                        giải quyết xung đột
                      </a>
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedReception(reception)}
                    className="text-lime-600 hover:text-lime-700 text-sm text-text-muted"
                  >
                    Xem chi tiết & duyệt
                  </button>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="text-text-muted text-text-secondary">
                    Khách hàng
                  </h4>
                  <p className="text-white">
                    {reception.customerId.firstName}{" "}
                    {reception.customerId.lastName}
                  </p>
                  <p className="text-text-secondary">
                    {reception.customerId.phone}
                  </p>
                </div>
                <div>
                  <h4 className="text-text-muted text-text-secondary">Xe</h4>
                  <p className="text-white">
                    {reception.vehicleId.year} {reception.vehicleId.make}{" "}
                    {reception.vehicleId.model}
                  </p>
                  <p className="text-text-secondary">
                    {reception.vehicleId.licensePlate}
                  </p>
                </div>
                <div>
                  <h4 className="text-text-muted text-text-secondary">
                    Người tiếp nhận
                  </h4>
                  <p className="text-white">
                    {reception.receivedBy.firstName}{" "}
                    {reception.receivedBy.lastName}
                  </p>
                  <p className="text-text-secondary">
                    {new Date(reception.receivedAt).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>

              {/* Services Summary */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-text-muted text-text-secondary mb-2">
                  Dịch vụ đề xuất
                </h4>
                <div className="flex flex-wrap gap-2">
                  {reception.recommendedServices &&
                  reception.recommendedServices.length > 0 ? (
                    reception.recommendedServices.map((service, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs text-text-muted bg-dark-200 text-lime-600"
                      >
                        {service.serviceName}
                        {service.quantity > 1 && ` (${service.quantity})`}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-text-muted">
                      Không có dịch vụ đề xuất
                    </span>
                  )}
                </div>
                {reception.requestedParts &&
                  reception.requestedParts.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-text-muted text-text-secondary text-sm">
                          Phụ tùng yêu cầu
                        </h4>
                        {(reception as any).hasConflict && (
                          <Link
                            to="/part-conflicts"
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold text-yellow-100 bg-yellow-600 hover:bg-yellow-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                            Có xung đột phụ tùng
                          </Link>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {reception.requestedParts.map((part, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs text-text-muted bg-purple-100 text-purple-800"
                          >
                            {part.partName} (x{part.quantity})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                <p className="text-sm text-text-secondary mt-2">
                  Thời gian ước tính: {reception.estimatedServiceTime} phút
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {selectedReception && (
        <div className="fixed inset-0 bg-dark-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center py-8">
          <div className="relative mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-dark-300 my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Duyệt Phiếu Tiếp Nhận #{selectedReception.receptionNumber}
                </h2>
                <p className="text-sm text-text-secondary">
                  Lịch hẹn #{selectedReception.appointmentId.appointmentNumber}{" "}
                  -{selectedReception.customerId.firstName}{" "}
                  {selectedReception.customerId.lastName}
                </p>
              </div>
              <button
                onClick={() => setSelectedReception(null)}
                className="text-text-muted hover:text-text-secondary"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Vehicle Information & EV Checklist */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Thông tin xe
                  </h3>

                  {/* Vehicle Basic Info */}
                  <div className="bg-dark-900 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-text-muted">Xe:</span>{" "}
                        {selectedReception.vehicleId.year}{" "}
                        {selectedReception.vehicleId.make}{" "}
                        {selectedReception.vehicleId.model}
                      </div>
                      <div>
                        <span className="text-text-muted">Biển số:</span>{" "}
                        {selectedReception.vehicleId.licensePlate}
                      </div>
                      <div>
                        <span className="text-text-muted">VIN:</span>{" "}
                        {selectedReception.vehicleId.vin}
                      </div>
                      <div>
                        <span className="text-text-muted">Số km:</span>{" "}
                        {selectedReception.vehicleCondition?.mileage?.current?.toLocaleString() ||
                          "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* EV Checklist Section */}
                  {selectedReception.evChecklistItems &&
                    selectedReception.evChecklistItems.length > 0 && (
                      <div className="bg-dark-300 border border-dark-200 rounded-lg p-4 mb-4">
                        <h4 className="text-text-muted text-gray-800 mb-3">
                          EV Checklist
                        </h4>
                        <div className="space-y-3">
                          {[
                            "battery",
                            "charging",
                            "motor",
                            "safety",
                            "general",
                          ].map((category) => {
                            const categoryItems =
                              selectedReception.evChecklistItems?.filter(
                                (item) =>
                                  item.category === category && item.checked
                              ) || [];
                            if (categoryItems.length === 0) return null;

                            const categoryLabels: Record<string, string> = {
                              battery: "🔋 Hệ thống Pin",
                              charging: "⚡ Hệ thống Sạc",
                              motor: "🔧 Động cơ",
                              safety: "🛡️ An toàn Cao thế",
                              general: "🚗 Kiểm tra Chung",
                            };

                            return (
                              <div
                                key={category}
                                className="border-l-4 border-blue-500 pl-3"
                              >
                                <h5 className="text-text-muted text-sm text-text-secondary mb-2">
                                  {categoryLabels[category]}
                                </h5>
                                <div className="space-y-2">
                                  {categoryItems.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-start space-x-2 text-sm"
                                    >
                                      <CheckCircleIcon
                                        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                                          item.status === "critical"
                                            ? "text-red-600"
                                            : item.status === "warning"
                                            ? "text-yellow-500"
                                            : "text-green-500"
                                        }`}
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-white">
                                            {item.label}
                                          </span>
                                          {item.status && (
                                            <span
                                              className={`text-xs px-2 py-0.5 rounded ${
                                                item.status === "critical"
                                                  ? "bg-dark-300 text-red-600"
                                                  : item.status === "warning"
                                                  ? "bg-dark-300 text-yellow-600"
                                                  : "bg-dark-300 text-green-600"
                                              }`}
                                            >
                                              {item.status === "critical"
                                                ? "Nghiêm trọng"
                                                : item.status === "warning"
                                                ? "Cảnh báo"
                                                : "Tốt"}
                                            </span>
                                          )}
                                        </div>
                                        {item.notes && (
                                          <p className="text-xs text-text-secondary mt-1 italic">
                                            {item.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Summary */}
                        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-lg font-bold text-green-600">
                              {selectedReception.evChecklistItems?.filter(
                                (i) => i.status === "good"
                              ).length || 0}
                            </div>
                            <div className="text-xs text-text-secondary">
                              Tốt
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-yellow-600">
                              {selectedReception.evChecklistItems?.filter(
                                (i) => i.status === "warning"
                              ).length || 0}
                            </div>
                            <div className="text-xs text-text-secondary">
                              Cảnh báo
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-red-600">
                              {selectedReception.evChecklistItems?.filter(
                                (i) => i.status === "critical"
                              ).length || 0}
                            </div>
                            <div className="text-xs text-text-secondary">
                              Nghiêm trọng
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Customer Items */}
                  {selectedReception.customerItems &&
                    selectedReception.customerItems.length > 0 && (
                      <div>
                        <h4 className="text-text-muted text-gray-800 mb-2">
                          Đồ đạc khách hàng
                        </h4>
                        <div className="bg-dark-300 border rounded-lg p-3">
                          <div className="space-y-2">
                            {selectedReception.customerItems.map(
                              (item, index) => (
                                <div
                                  key={index}
                                  className="text-sm bg-dark-900 p-2 rounded"
                                >
                                  <div className="text-text-muted">
                                    {item.item}
                                  </div>
                                  <div className="text-text-secondary">
                                    Vị trí: {item.location}
                                  </div>
                                  {item.value && (
                                    <div className="text-text-secondary">
                                      Giá trị: {formatVND(item.value)}
                                    </div>
                                  )}
                                  {item.notes && (
                                    <div className="text-text-secondary">
                                      Ghi chú: {item.notes}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Right Column - Services & Review */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Dịch vụ & Duyệt
                  </h3>

                  {/* Services */}
                  <div className="bg-dark-900 rounded-lg p-4 mb-6">
                    <h4 className="text-text-muted text-gray-800 mb-3">
                      Dịch vụ đề xuất sau kiểm tra
                    </h4>
                    <div className="space-y-2">
                      {selectedReception.recommendedServices &&
                      selectedReception.recommendedServices.length > 0 ? (
                        selectedReception.recommendedServices.map(
                          (service, index) => (
                            <div
                              key={index}
                              className="bg-dark-300 rounded p-3 text-sm"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-text-muted">
                                  {service.serviceName}
                                </span>
                                <div className="text-right">
                                  {(() => {
                                    const duration =
                                      typeof service.serviceId === "object"
                                        ? service.serviceId.estimatedDuration
                                        : service.estimatedDuration;
                                    return duration ? (
                                      <div className="text-text-secondary">
                                        {duration * service.quantity} phút
                                      </div>
                                    ) : null;
                                  })()}
                                  {service.estimatedCost && (
                                    <div className="text-lime-600 text-text-muted">
                                      {(
                                        service.estimatedCost * service.quantity
                                      ).toLocaleString("vi-VN")}{" "}
                                      VNĐ
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-text-secondary">
                                Danh mục: {service.category} • Số lượng:{" "}
                                {service.quantity}
                              </div>
                              {service.reason && (
                                <div className="text-text-muted text-xs mt-1">
                                  Lý do: {service.reason}
                                </div>
                              )}
                            </div>
                          )
                        )
                      ) : (
                        <div className="bg-dark-300 rounded p-3 text-sm text-text-muted text-center">
                          Không có dịch vụ đề xuất
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-text-muted">
                          Tổng thời gian ước tính:
                        </span>
                        <span>
                          {selectedReception.estimatedServiceTime} phút
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">
                          Tổng chi phí dịch vụ:
                        </span>
                        <span className="text-lime-600 font-semibold">
                          {(selectedReception.recommendedServices || [])
                            .reduce(
                              (total, service) =>
                                total +
                                (service.estimatedCost || 0) * service.quantity,
                              0
                            )
                            .toLocaleString("vi-VN")}{" "}
                          VNĐ
                        </span>
                      </div>
                      {selectedReception.requestedParts &&
                        selectedReception.requestedParts.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-text-muted">
                              Tổng chi phí phụ tùng:
                            </span>
                            <span className="text-purple-600 font-semibold">
                              {selectedReception.requestedParts
                                .reduce(
                                  (total, part) =>
                                    total +
                                    (part.estimatedCost || 0) * part.quantity,
                                  0
                                )
                                .toLocaleString("vi-VN")}{" "}
                              VNĐ
                            </span>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Special Instructions */}
                  {selectedReception.specialInstructions.fromCustomer && (
                    <div className="mb-6">
                      <h4 className="text-text-muted text-text-secondary mb-2">
                        Yêu cầu từ khách hàng
                      </h4>
                      <div className="bg-dark-300 border border-yellow-600 rounded-lg p-3 text-sm text-text-secondary">
                        {selectedReception.specialInstructions.fromCustomer}
                      </div>
                    </div>
                  )}

                  {/* Parts Requested */}
                  {selectedReception.requestedParts &&
                    selectedReception.requestedParts.length > 0 && (
                      <div className="bg-dark-300 rounded-lg p-4 mb-6 border border-dark-200">
                        <h4 className="text-text-muted text-text-secondary mb-3">
                          Phụ tùng yêu cầu
                        </h4>
                        <div className="space-y-2">
                          {selectedReception.requestedParts.map(
                            (part, index) => (
                              <div
                                key={index}
                                className="bg-dark-300 rounded p-3 text-sm"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-text-muted">
                                    {part.partName}
                                  </span>
                                  <div className="text-right">
                                    <div className="text-purple-600 text-text-muted">
                                      {(
                                        (part.estimatedCost || 0) *
                                        part.quantity
                                      ).toLocaleString("vi-VN")}{" "}
                                      VNĐ
                                    </div>
                                  </div>
                                </div>
                                <div className="text-text-secondary">
                                  Số lượng: {part.quantity}
                                </div>
                                <div className="text-text-muted text-xs mt-1">
                                  Lý do: {part.reason}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Review Section */}
                  <div className="bg-dark-900 rounded-lg p-4">
                    <h4 className="text-text-muted text-gray-800 mb-4">
                      Đánh giá phiếu tiếp nhận
                    </h4>

                    <div className="space-y-4">
                      {/* Total Cost Summary */}
                      {(() => {
                        const servicesCost = (
                          selectedReception.recommendedServices || []
                        ).reduce(
                          (total, service) =>
                            total +
                            (service.estimatedCost || 0) * service.quantity,
                          0
                        );
                        const partsCost = (
                          selectedReception.requestedParts || []
                        ).reduce(
                          (total, part) =>
                            total + (part.estimatedCost || 0) * part.quantity,
                          0
                        );
                        const totalCost = servicesCost + partsCost;

                        return totalCost > 0 ? (
                          <div className="bg-dark-900 border border-blue-200 rounded-lg p-4 mb-4">
                            <h5 className="text-text-muted text-gray-800 mb-3">
                              Tóm tắt chi phí
                            </h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Dịch vụ đề xuất:</span>
                                <span className="text-text-muted">
                                  {servicesCost.toLocaleString("vi-VN")} VNĐ
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Phụ tùng:</span>
                                <span className="text-text-muted">
                                  {partsCost.toLocaleString("vi-VN")} VNĐ
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold border-t pt-2">
                                <span>Tổng cộng:</span>
                                <span className="text-lime-600">
                                  {totalCost.toLocaleString("vi-VN")} VNĐ
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-text-secondary">
                                <span>Bao gồm VAT 10%:</span>
                                <span className="text-text-muted">
                                  {(totalCost * 1.1).toLocaleString("vi-VN")}{" "}
                                  VNĐ
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}

                      <div>
                        <label className="block text-sm text-text-muted text-text-secondary mb-2">
                          Ghi chú đánh giá{" "}
                          <span className="text-text-muted font-normal">
                            (không bắt buộc)
                          </span>
                        </label>
                        <textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          rows={4}
                          className="block w-full rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400"
                          placeholder="Nhập ghi chú về quyết định duyệt/từ chối (nếu cần)..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t">
              <button
                onClick={() => setSelectedReception(null)}
                className="px-6 py-2 border border-dark-200 rounded-md text-text-secondary hover:bg-dark-900"
              >
                Đóng
              </button>
              {(selectedReception as any)?.hasConflict ? (
                <div className="flex items-center text-yellow-400 text-sm px-4 py-2 bg-yellow-900/20 rounded-md border border-yellow-600/30">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                  <span>
                    Không thể duyệt do có xung đột phụ tùng.{' '}
                    <a
                      href="/part-conflicts"
                      className="text-blue-400 underline hover:text-blue-300 font-semibold"
                    >
                      Hãy qua tab Quản lý xung đột để giải quyết
                    </a>
                  </span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleReviewSubmit("reject")}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
                  >
                    {isSubmitting ? (
                      <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <XMarkIcon className="w-4 h-4 mr-2" />
                    )}
                    Từ chối
                  </button>
                  <button
                    onClick={() => handleReviewSubmit("approve")}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                  >
                    {isSubmitting ? (
                      <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                    )}
                    Duyệt
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceReceptionReview;
