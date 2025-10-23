import React, { useState } from 'react';
import {
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/vietnamese';

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
    serviceId: {
      _id: string;
      name: string;
      category: string;
      estimatedDuration: number;
    } | string;
    serviceName: string;
    category: string;
    quantity: number;
    reason: string;
    estimatedDuration?: number;
    estimatedCost?: number;
  }>;
  requestedParts: Array<{
    partId: {
      _id: string;
      name: string;
      partNumber: string;
      pricing: {
        retail: number;
      };
    } | string;
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
}

interface ServiceReceptionReviewProps {
  receptions: ServiceReception[];
  onReview: (receptionId: string, decision: 'approve' | 'reject', notes: string) => Promise<void>;
  loading?: boolean;
}

const ServiceReceptionReview: React.FC<ServiceReceptionReviewProps> = ({
  receptions,
  onReview,
  loading = false
}) => {
  const [selectedReception, setSelectedReception] = useState<ServiceReception | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const conditionLabels = {
    excellent: 'Xuất sắc',
    good: 'Tốt',
    fair: 'Trung bình',
    poor: 'Kém',
    replace_soon: 'Cần thay sớm'
  };

  const chargingStatusLabels = {
    not_charging: 'Không sạc',
    charging: 'Đang sạc',
    fully_charged: 'Đã sạc đầy',
    error: 'Lỗi'
  };

  const handleReviewSubmit = async (decision: 'approve' | 'reject') => {
    if (!selectedReception) return;

    try {
      setIsSubmitting(true);
      await onReview(selectedReception._id, decision, reviewNotes);

      toast.success(
        decision === 'approve'
          ? 'Đã duyệt phiếu tiếp nhận'
          : 'Đã từ chối phiếu tiếp nhận'
      );

      setSelectedReception(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Không thể submit đánh giá');
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
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Không có phiếu tiếp nhận nào cần duyệt
        </h3>
        <p className="text-gray-500">
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
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Phiếu #{reception.receptionNumber}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Lịch hẹn #{reception.appointmentId.appointmentNumber}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedReception(reception)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Xem chi tiết & duyệt
                </button>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700">Khách hàng</h4>
                  <p>{reception.customerId.firstName} {reception.customerId.lastName}</p>
                  <p className="text-gray-600">{reception.customerId.phone}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Xe</h4>
                  <p>{reception.vehicleId.year} {reception.vehicleId.make} {reception.vehicleId.model}</p>
                  <p className="text-gray-600">{reception.vehicleId.licensePlate}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Người tiếp nhận</h4>
                  <p>{reception.receivedBy.firstName} {reception.receivedBy.lastName}</p>
                  <p className="text-gray-600">
                    {new Date(reception.receivedAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>

              {/* Services Summary */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-gray-700 mb-2">Dịch vụ đề xuất</h4>
                <div className="flex flex-wrap gap-2">
                  {reception.recommendedServices && reception.recommendedServices.length > 0 ? (
                    reception.recommendedServices.map((service, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {service.serviceName}
                        {service.quantity > 1 && ` (${service.quantity})`}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">Không có dịch vụ đề xuất</span>
                  )}
                </div>
                {reception.requestedParts && reception.requestedParts.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-700 mb-2 text-sm">Phụ tùng yêu cầu</h4>
                    <div className="flex flex-wrap gap-2">
                      {reception.requestedParts.map((part, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800"
                        >
                          {part.partName} (x{part.quantity})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-2">
                  Thời gian ước tính: {reception.estimatedServiceTime} phút
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {selectedReception && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center py-8">
          <div className="relative mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Duyệt Phiếu Tiếp Nhận #{selectedReception.receptionNumber}
                </h2>
                <p className="text-sm text-gray-600">
                  Lịch hẹn #{selectedReception.appointmentId.appointmentNumber} -
                  {selectedReception.customerId.firstName} {selectedReception.customerId.lastName}
                </p>
              </div>
              <button
                onClick={() => setSelectedReception(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Vehicle Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin xe</h3>

                  {/* Vehicle Basic Info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Xe:</span> {selectedReception.vehicleId.year} {selectedReception.vehicleId.make} {selectedReception.vehicleId.model}
                      </div>
                      <div>
                        <span className="font-medium">Biển số:</span> {selectedReception.vehicleId.licensePlate}
                      </div>
                      <div>
                        <span className="font-medium">VIN:</span> {selectedReception.vehicleId.vin}
                      </div>
                      <div>
                        <span className="font-medium">Số km:</span> {selectedReception.vehicleCondition.mileage.current.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Exterior Condition */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Tình trạng ngoại thất</h4>
                    <div className="bg-white border rounded-lg p-3">
                      <p className="text-sm mb-2">
                        <span className="font-medium">Tình trạng:</span> {conditionLabels[selectedReception.vehicleCondition.exterior.condition as keyof typeof conditionLabels]}
                      </p>

                      {selectedReception.vehicleCondition.exterior.damages.length > 0 && (
                        <div className="mb-2">
                          <span className="font-medium text-sm">Hỏng hóc:</span>
                          <div className="mt-1 space-y-1">
                            {selectedReception.vehicleCondition.exterior.damages.map((damage, index) => (
                              <div key={index} className="text-xs bg-red-50 p-2 rounded">
                                <strong>{damage.location}:</strong> {damage.type} ({damage.severity})
                                {damage.description && <p className="text-gray-600 mt-1">{damage.description}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedReception.vehicleCondition.exterior.notes && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Ghi chú:</span> {selectedReception.vehicleCondition.exterior.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Interior & Battery */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Nội thất & Pin</h4>
                    <div className="bg-white border rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Nội thất:</span> {conditionLabels[selectedReception.vehicleCondition.interior.condition as keyof typeof conditionLabels]}
                        </div>
                        <div>
                          <span className="font-medium">Độ sạch:</span> {selectedReception.vehicleCondition.interior.cleanliness}
                        </div>
                        <div>
                          <span className="font-medium">Mức pin:</span> {selectedReception.vehicleCondition.battery.level}%
                        </div>
                        <div>
                          <span className="font-medium">Tình trạng pin:</span> {conditionLabels[selectedReception.vehicleCondition.battery.health as keyof typeof conditionLabels]}
                        </div>
                      </div>

                      <div className="text-sm">
                        <span className="font-medium">Trạng thái sạc:</span> {chargingStatusLabels[selectedReception.vehicleCondition.battery.chargingStatus as keyof typeof chargingStatusLabels]}
                      </div>

                      {selectedReception.vehicleCondition.battery.notes && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Ghi chú pin:</span> {selectedReception.vehicleCondition.battery.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Customer Items */}
                  {selectedReception.customerItems.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Đồ đạc khách hàng</h4>
                      <div className="bg-white border rounded-lg p-3">
                        <div className="space-y-2">
                          {selectedReception.customerItems.map((item, index) => (
                            <div key={index} className="text-sm bg-blue-50 p-2 rounded">
                              <div className="font-medium">{item.item}</div>
                              <div className="text-gray-600">Vị trí: {item.location}</div>
                              {item.value && <div className="text-gray-600">Giá trị: {formatVND(item.value)}</div>}
                              {item.notes && <div className="text-gray-600">Ghi chú: {item.notes}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Services & Review */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Dịch vụ & Duyệt</h3>

                  {/* Services */}
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-800 mb-3">Dịch vụ đề xuất sau kiểm tra</h4>
                    <div className="space-y-2">
                      {selectedReception.recommendedServices && selectedReception.recommendedServices.length > 0 ? (
                        selectedReception.recommendedServices.map((service, index) => (
                          <div key={index} className="bg-white rounded p-3 text-sm">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium">{service.serviceName}</span>
                              <div className="text-right">
                                {(() => {
                                  const duration = typeof service.serviceId === 'object'
                                    ? service.serviceId.estimatedDuration
                                    : service.estimatedDuration;
                                  return duration ? (
                                    <div className="text-gray-600">{duration * service.quantity} phút</div>
                                  ) : null;
                                })()}
                                {service.estimatedCost && (
                                  <div className="text-blue-600 font-medium">
                                    {(service.estimatedCost * service.quantity).toLocaleString('vi-VN')} VNĐ
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-gray-600">
                              Danh mục: {service.category} • Số lượng: {service.quantity}
                            </div>
                            {service.reason && (
                              <div className="text-gray-500 text-xs mt-1">
                                Lý do: {service.reason}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="bg-white rounded p-3 text-sm text-gray-500 text-center">
                          Không có dịch vụ đề xuất
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium">Tổng thời gian ước tính:</span>
                        <span>{selectedReception.estimatedServiceTime} phút</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Tổng chi phí dịch vụ:</span>
                        <span className="text-blue-600 font-semibold">
                          {(selectedReception.recommendedServices || []).reduce((total, service) =>
                            total + ((service.estimatedCost || 0) * service.quantity), 0
                          ).toLocaleString('vi-VN')} VNĐ
                        </span>
                      </div>
                      {selectedReception.requestedParts && selectedReception.requestedParts.length > 0 && (
                        <div className="flex justify-between">
                          <span className="font-medium">Tổng chi phí phụ tùng:</span>
                          <span className="text-purple-600 font-semibold">
                            {selectedReception.requestedParts.reduce((total, part) =>
                              total + ((part.estimatedCost || 0) * part.quantity), 0
                            ).toLocaleString('vi-VN')} VNĐ
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Special Instructions */}
                  {selectedReception.specialInstructions.fromCustomer && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-800 mb-2">Yêu cầu từ khách hàng</h4>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                        {selectedReception.specialInstructions.fromCustomer}
                      </div>
                    </div>
                  )}

                  {/* Parts Requested */}
                  {selectedReception.requestedParts && selectedReception.requestedParts.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-4 mb-6">
                      <h4 className="font-medium text-gray-800 mb-3">Phụ tùng yêu cầu</h4>
                      <div className="space-y-2">
                        {selectedReception.requestedParts.map((part, index) => (
                          <div key={index} className="bg-white rounded p-3 text-sm">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium">{part.partName}</span>
                              <div className="text-right">
                                <div className="text-purple-600 font-medium">
                                  {((part.estimatedCost || 0) * part.quantity).toLocaleString('vi-VN')} VNĐ
                                </div>
                              </div>
                            </div>
                            <div className="text-gray-600">
                              Số lượng: {part.quantity}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              Lý do: {part.reason}
                            </div>
                            {/* TODO: Add availability check here */}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Section */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-4">Đánh giá phiếu tiếp nhận</h4>

                    <div className="space-y-4">
                      {/* Total Cost Summary */}
                      {(() => {
                        const servicesCost = (selectedReception.recommendedServices || []).reduce((total, service) =>
                          total + ((service.estimatedCost || 0) * service.quantity), 0
                        );
                        const partsCost = (selectedReception.requestedParts || []).reduce((total, part) =>
                          total + ((part.estimatedCost || 0) * part.quantity), 0
                        );
                        const totalCost = servicesCost + partsCost;

                        return totalCost > 0 ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <h5 className="font-medium text-gray-800 mb-3">Tóm tắt chi phí</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Dịch vụ đề xuất:</span>
                                <span className="font-medium">{servicesCost.toLocaleString('vi-VN')} VNĐ</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Phụ tùng:</span>
                                <span className="font-medium">{partsCost.toLocaleString('vi-VN')} VNĐ</span>
                              </div>
                              <div className="flex justify-between font-semibold border-t pt-2">
                                <span>Tổng cộng:</span>
                                <span className="text-blue-600">{totalCost.toLocaleString('vi-VN')} VNĐ</span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Bao gồm VAT 10%:</span>
                                <span className="font-medium">{(totalCost * 1.1).toLocaleString('vi-VN')} VNĐ</span>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ghi chú đánh giá <span className="text-gray-500 font-normal">(không bắt buộc)</span>
                        </label>
                        <textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          rows={4}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Đóng
              </button>
              <button
                onClick={() => handleReviewSubmit('reject')}
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
                onClick={() => handleReviewSubmit('approve')}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceReceptionReview;