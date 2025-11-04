import React, { useEffect, useState } from 'react';
import { appointmentsAPI } from '../services/api';
import {
  ClipboardDocumentListIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { formatVietnameseDateTime, formatVND } from '../utils/vietnamese';
import {
  getWarrantyStatus,
  formatWarrantyDuration,
  getWarrantyBadgeColor,
  getWarrantyStatusText,
  type Warranty,
} from '../utils/warranty';
import toast from 'react-hot-toast';
import ExternalPartsTag from '../components/Common/ExternalPartsTag';

interface ServiceNote {
  note: string;
  addedBy: {
    _id: string;
    fullName: string;
  };
  addedAt: string;
}

interface WorkflowHistory {
  status: string;
  changedBy: {
    _id: string;
    fullName: string;
  };
  changedAt: string;
  reason: string;
  notes?: string;
}

interface PartUsed {
  partId: {
    _id: string;
    name: string;
    partNumber: string;
    pricing: {
      retail: number;
    };
    warranty: Warranty;
  };
  quantity: number;
  unitPrice: number;
  isExternalPart?: boolean;
}

interface ExternalPart {
  partName: string;
  partNumber?: string;
  supplier?: {
    name: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warranty?: {
    period: number;
    description?: string;
  };
  notes?: string;
}

interface AppointmentService {
  serviceId: {
    _id: string;
    name: string;
    description: string;
    warranty?: Warranty;
  };
  quantity: number;
  price: number;
  estimatedDuration: number;
}

interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  color?: string;
  batteryType?: string;
  batteryCapacity?: number;
}

interface CompletedAppointment {
  _id: string;
  appointmentNumber: string;
  vehicleId: string | Vehicle;
  services: AppointmentService[];
  scheduledDate: string;
  scheduledTime: string;
  actualCompletion: string;
  status: string;
  totalAmount: number;
  assignedTechnician: {
    _id: string;
    fullName: string;
  };
  serviceNotes: ServiceNote[];
  partsUsed: PartUsed[];
  externalParts?: ExternalPart[];
  hasExternalParts?: boolean;
  feedback?: {
    rating: number;
    comment: string;
    submittedAt: string;
  };
  workflowHistory: WorkflowHistory[];
  createdAt: string;
  serviceReceptionId?: {
    _id: string;
    externalParts?: ExternalPart[];
    hasExternalParts?: boolean;
  };
}

const ServiceHistoryPage: React.FC = () => {
  const [appointments, setAppointments] = useState<CompletedAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<CompletedAppointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchCompletedAppointments();
  }, []);

  const fetchCompletedAppointments = async () => {
    try {
      setLoading(true);
      // Fetch both completed and invoiced appointments
      const [completedResponse, invoicedResponse] = await Promise.all([
        appointmentsAPI.getCustomerAppointments({ status: 'completed' }),
        appointmentsAPI.getCustomerAppointments({ status: 'invoiced' })
      ]);
      
      const completedData = Array.isArray(completedResponse.data?.data) ? completedResponse.data.data : 
                           Array.isArray(completedResponse.data) ? completedResponse.data : [];
      const invoicedData = Array.isArray(invoicedResponse.data?.data) ? invoicedResponse.data.data : 
                          Array.isArray(invoicedResponse.data) ? invoicedResponse.data : [];
      
      // Combine and remove duplicates
      const allAppointments = [...completedData, ...invoicedData];
      const uniqueAppointments = Array.from(
        new Map(allAppointments.map(apt => [apt._id, apt])).values()
      );
      
      setAppointments(uniqueAppointments);
    } catch (error) {
      console.error('Error fetching service history:', error);
      toast.error('Không thể tải lịch sử dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (appointment: CompletedAppointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const renderRatingStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-text-secondary'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ClipboardDocumentListIcon className="h-8 w-8 text-lime-600" />
            Lịch sử dịch vụ
          </h1>
          <p className="mt-2 text-text-secondary">
            Xem các dịch vụ đã hoàn thành và thông tin bảo hành
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-text-secondary">Đang tải lịch sử dịch vụ...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-dark-300 rounded-lg shadow-sm border border-dark-200 p-12 text-center">
            <ClipboardDocumentListIcon className="h-16 w-16 text-text-secondary mx-auto mb-4" />
            <p className="text-text-secondary">Chưa có dịch vụ nào được hoàn thành hoặc thanh toán</p>
          </div>
        ) : (
          <div className="space-y-6">
            {appointments.map((appointment) => {
              const vehicle = typeof appointment.vehicleId === 'object' ? appointment.vehicleId : null;
              
              return (
                <div
                  key={appointment._id}
                  className="bg-dark-300 rounded-lg shadow-sm border border-dark-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {appointment.appointmentNumber}
                          </h3>
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-dark-300 text-green-600">
                            <CheckCircleIcon className="h-4 w-4" />
                            Đã hoàn thành
                          </span>
                        </div>
                        {vehicle ? (
                          <p className="text-sm text-text-secondary">
                            {vehicle.make} {vehicle.model} {vehicle.year}
                            {vehicle.vin && <span className="ml-2">• {vehicle.vin}</span>}
                          </p>
                        ) : (
                          <p className="text-sm text-text-muted">Thông tin xe không có sẵn</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleViewDetails(appointment)}
                        className="px-4 py-2 text-sm text-text-muted text-lime-600 hover:text-lime-700 hover:bg-dark-900 rounded-md transition-colors"
                      >
                        Xem chi tiết
                      </button>
                    </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <CalendarIcon className="h-5 w-5 text-text-muted" />
                      <span>Hoàn thành: {formatVietnameseDateTime(appointment.actualCompletion)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <ClockIcon className="h-5 w-5 text-text-muted" />
                      <span>Đặt lúc: {formatVietnameseDateTime(appointment.createdAt)}</span>
                    </div>
                  </div>

                  {/* Services with Warranty */}
                  <div className="mb-4">
                    <h4 className="text-sm text-text-muted text-text-secondary mb-2 flex items-center gap-2">
                      <WrenchScrewdriverIcon className="h-4 w-4" />
                      Dịch vụ đã thực hiện:
                    </h4>
                    <ul className="space-y-2">
                      {appointment.services.map((service, index) => {
                        const warrantyStatus = service.serviceId.warranty
                          ? getWarrantyStatus(appointment.actualCompletion, service.serviceId.warranty)
                          : null;
                        
                        return (
                          <li key={index} className="flex items-start justify-between gap-2 p-3 bg-dark-900 rounded-md">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-text-muted text-white">
                                  {service.serviceId.name}
                                </span>
                                {service.serviceId.warranty && warrantyStatus && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs text-text-muted rounded-full ${getWarrantyBadgeColor(warrantyStatus)}`}>
                                    <ShieldCheckIcon className="h-3 w-3" />
                                    {getWarrantyStatusText(warrantyStatus)}
                                  </span>
                                )}
                              </div>
                              {service.serviceId.warranty && (
                                <p className="text-xs text-text-secondary">
                                  Bảo hành: {formatWarrantyDuration(service.serviceId.warranty.duration)} - {service.serviceId.warranty.description}
                                  {warrantyStatus && (
                                    <span className="ml-2 text-lime-600">
                                      (Hết hạn: {warrantyStatus.expiryDate.toLocaleDateString('vi-VN')})
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                            <span className="text-sm text-text-muted text-white whitespace-nowrap">
                              {formatVND(service.price)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Parts Used with Warranty */}
                  {appointment.partsUsed && appointment.partsUsed.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm text-text-muted text-text-secondary mb-2 flex items-center gap-2">
                        <CubeIcon className="h-4 w-4" />
                        Phụ tùng đã sử dụng:
                      </h4>
                      <ul className="space-y-2">
                        {appointment.partsUsed.map((part, index) => {
                          const warrantyStatus = part.partId.warranty
                            ? getWarrantyStatus(appointment.actualCompletion, part.partId.warranty)
                            : null;

                          return (
                            <li key={index} className="flex items-start justify-between gap-2 p-3 bg-dark-900 rounded-md border border-blue-200">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm text-text-muted text-white">
                                    {part.partId.name}
                                  </span>
                                  {part.partId.warranty && warrantyStatus && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs text-text-muted rounded-full ${getWarrantyBadgeColor(warrantyStatus)}`}>
                                      <ShieldCheckIcon className="h-3 w-3" />
                                      {getWarrantyStatusText(warrantyStatus)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-text-secondary">
                                  Mã: {part.partId.partNumber} • Số lượng: {part.quantity}
                                </p>
                                {part.partId.warranty && (
                                  <p className="text-xs text-lime-700 mt-1">
                                    Bảo hành: {formatWarrantyDuration(part.partId.warranty.duration)} - {part.partId.warranty.description}
                                    {warrantyStatus && (
                                      <span className="ml-2 text-text-muted">
                                        (Hết hạn: {warrantyStatus.expiryDate.toLocaleDateString('vi-VN')})
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                              <span className="text-sm text-text-muted text-white whitespace-nowrap">
                                {formatVND(part.unitPrice * part.quantity)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* External Parts - Parts Ordered from Outside */}
                  {(appointment.serviceReceptionId?.externalParts && appointment.serviceReceptionId.externalParts.length > 0) && (
                    <div className="mb-4">
                      <h4 className="text-sm text-text-muted text-text-secondary mb-2 flex items-center gap-2">
                        <ShoppingBagIcon className="h-4 w-4" />
                        Linh kiện đặt từ bên ngoài:
                      </h4>
                      <ul className="space-y-2">
                        {appointment.serviceReceptionId.externalParts.map((part, index) => (
                          <li key={index} className="flex items-start justify-between gap-2 p-3 bg-amber-50 rounded-md border-2 border-amber-400">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-amber-900">
                                  {part.partName}
                                </span>
                                <ExternalPartsTag size="sm" showIcon={false} />
                              </div>
                              <p className="text-xs text-amber-800">
                                Mã: {part.partNumber || 'EXTERNAL'} • Số lượng: {part.quantity}
                              </p>
                              {part.supplier && (
                                <p className="text-xs text-amber-700 mt-1">
                                  Nhà cung cấp: {part.supplier.name}
                                </p>
                              )}
                              {part.warranty && part.warranty.period > 0 && (
                                <p className="text-xs text-lime-700 mt-1">
                                  Bảo hành: {part.warranty.period} tháng
                                  {part.warranty.description && ` - ${part.warranty.description}`}
                                </p>
                              )}
                              {part.notes && (
                                <p className="text-xs text-amber-600 mt-1 italic">
                                  Ghi chú: {part.notes}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-amber-900 whitespace-nowrap">
                              {formatVND(part.totalPrice)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Feedback */}
                  {appointment.feedback && (
                    <div className="mb-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                      <div className="flex items-center gap-2 mb-2">
                        <ChatBubbleLeftRightIcon className="h-4 w-4 text-yellow-700" />
                        <span className="text-sm text-text-muted text-yellow-900">Đánh giá của bạn:</span>
                        {renderRatingStars(appointment.feedback.rating)}
                      </div>
                      <p className="text-sm text-yellow-800">{appointment.feedback.comment}</p>
                    </div>
                  )}

                  {/* Total */}
                  <div className="pt-4 border-t border-dark-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-muted text-text-secondary">Tổng chi phí:</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatVND(appointment.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedAppointment && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowDetailsModal(false)}>
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-dark-9000 bg-opacity-75" />
              
              <div 
                className="inline-block align-bottom bg-dark-300 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-dark-300 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">
                      Chi tiết dịch vụ - {selectedAppointment.appointmentNumber}
                    </h3>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="text-text-muted hover:text-text-secondary"
                    >
                      <span className="text-2xl">×</span>
                    </button>
                  </div>

                  <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Technician Notes */}
                    {selectedAppointment.serviceNotes && selectedAppointment.serviceNotes.length > 0 && (
                      <div>
                        <h4 className="text-md text-text-muted text-white mb-3">Ghi chú kỹ thuật viên</h4>
                        <div className="space-y-2">
                          {selectedAppointment.serviceNotes.map((note, index) => (
                            <div key={index} className="p-3 bg-dark-900 rounded-md border border-dark-200">
                              <p className="text-sm text-white mb-1">{note.note}</p>
                              <p className="text-xs text-text-muted">
                                {note.addedBy.fullName} • {formatVietnameseDateTime(note.addedAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Workflow History */}
                    {selectedAppointment.workflowHistory && selectedAppointment.workflowHistory.length > 0 && (
                      <div>
                        <h4 className="text-md text-text-muted text-white mb-3">Lịch sử tiến trình</h4>
                        <div className="space-y-2">
                          {selectedAppointment.workflowHistory.map((history, index) => (
                            <div key={index} className="flex gap-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-lime-100 flex items-center justify-center">
                                  <CheckCircleIcon className="h-4 w-4 text-lime-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-text-muted text-white">{history.reason}</p>
                                {history.notes && (
                                  <p className="text-sm text-text-secondary">{history.notes}</p>
                                )}
                                <p className="text-xs text-text-muted">
                                  {formatVietnameseDateTime(history.changedAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-dark-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="w-full inline-flex justify-center rounded-md border border-dark-300 shadow-sm px-4 py-2 bg-dark-300 text-base text-text-muted text-text-secondary hover:bg-dark-900 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceHistoryPage;
