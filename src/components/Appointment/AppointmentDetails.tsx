import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import CancelRequestManagement from "./CancelRequestManagement";

interface AppointmentDetailsProps {
  appointment: any;
  onClose: () => void;
  _onUpdate: () => void; // Reserved for future update functionality
}

const AppointmentDetails: React.FC<AppointmentDetailsProps> = ({
  appointment,
  onClose,
  _onUpdate,
}) => {
  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      customer_arrived: "bg-green-100 text-green-800",
      reception_created: "bg-purple-100 text-purple-800",
      reception_approved: "bg-indigo-100 text-indigo-800",
      in_progress: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      invoiced: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
      cancel_requested: "bg-orange-100 text-orange-800",
      cancel_approved: "bg-yellow-100 text-yellow-800",
      cancel_refunded: "bg-green-100 text-green-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatVietnameseDateTime = (date: string, time?: string) => {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString("vi-VN");
    return time ? `${dateStr} lúc ${time}` : dateStr;
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
          <div className="bg-white px-6 pb-4 pt-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold leading-6 text-gray-900">
                  Chi tiết lịch hẹn
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Mã lịch hẹn: {appointment.appointmentNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                  appointment.status
                )}`}
              >
                {appointment.status === "pending" && "Chờ xác nhận"}
                {appointment.status === "confirmed" && "Đã xác nhận"}
                {appointment.status === "customer_arrived" && "Khách đã đến"}
                {appointment.status === "reception_created" &&
                  "Đã tạo phiếu tiếp nhận"}
                {appointment.status === "reception_approved" &&
                  "Đã duyệt phiếu"}
                {appointment.status === "in_progress" && "Đang thực hiện"}
                {appointment.status === "completed" && "Hoàn thành"}
                {appointment.status === "invoiced" && "Đã xuất hóa đơn"}
                {appointment.status === "cancelled" &&
                  (appointment.cancelRequest?.refundProcessedAt
                    ? "Đã hủy và hoàn tiền"
                    : "Đã hủy")}
                {appointment.status === "cancel_requested" && "Yêu cầu hủy"}
                {appointment.status === "cancel_approved" && "Đã duyệt hủy"}
                {appointment.status === "cancel_refunded" && "Đã hoàn tiền"}
              </span>
            </div>

            {/* Cancel Request Management */}
            {(appointment.status === "cancel_requested" ||
              appointment.status === "cancel_approved" ||
              (appointment.status === "cancelled" &&
                appointment.cancelRequest)) && (
              <CancelRequestManagement
                appointment={appointment}
                onUpdate={_onUpdate}
              />
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Appointment Info */}
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    Thông tin cơ bản
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Ngày hẹn:
                      </span>
                      <span className="text-sm text-gray-900">
                        {formatVietnameseDateTime(
                          appointment.scheduledDate,
                          appointment.scheduledTime
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Độ ưu tiên:
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          appointment.priority === "high"
                            ? "text-red-600"
                            : appointment.priority === "medium"
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {appointment.priority === "high" && "Cao"}
                        {appointment.priority === "medium" && "Trung bình"}
                        {appointment.priority === "normal" && "Bình thường"}
                      </span>
                    </div>
                    {appointment.estimatedCompletion && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          Dự kiến hoàn thành:
                        </span>
                        <span className="text-sm text-gray-900">
                          {formatVietnameseDateTime(
                            appointment.estimatedCompletion
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    Thông tin xe
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Xe:
                      </span>
                      <span className="text-sm text-gray-900">
                        {appointment.vehicleId.make}{" "}
                        {appointment.vehicleId.model} (
                        {appointment.vehicleId.year})
                      </span>
                    </div>
                    {appointment.vehicleId.licensePlate && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          Biển số:
                        </span>
                        <span className="text-sm text-gray-900">
                          {appointment.vehicleId.licensePlate}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Center */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    Trung tâm dịch vụ
                  </h4>
                  <div className="space-y-3">
                    {/* Service Center Information removed - single center architecture */}
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Tên:
                      </span>
                      <span className="text-sm text-gray-900">
                        EV Service Center
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Địa chỉ:
                      </span>
                      <span className="text-sm text-gray-900">
                        123 Main Street, Ho Chi Minh City
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Services & Timeline */}
              <div className="space-y-6">
                {/* Services */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    Dịch vụ đã đặt
                  </h4>
                  <div className="space-y-3">
                    {appointment.services.map((service, index) => (
                      <div
                        key={index}
                        className="border-b border-gray-200 pb-3 last:border-0"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {service.serviceId?.name ||
                                "Dịch vụ không xác định"}
                            </p>
                            <p className="text-xs text-gray-500">
                              Thời gian dự kiến: {service.estimatedDuration}{" "}
                              phút
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatVND(service.price)}
                            </p>
                            <p className="text-xs text-gray-500">
                              SL: {service.quantity}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold text-gray-900">
                          Tổng cộng:
                        </span>
                        <span className="text-base font-semibold text-gray-900">
                          {formatVND(appointment.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workflow Timeline */}
                {appointment.workflowHistory &&
                  appointment.workflowHistory.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">
                        Lịch sử xử lý
                      </h4>
                      <div className="space-y-4">
                        {appointment.workflowHistory
                          .slice(-5)
                          .filter(
                            (history, index, array) =>
                              index === 0 ||
                              history.status !== array[index - 1].status
                          )
                          .map((history, index) => (
                            <div
                              key={`${history.status}-${history.changedAt}-${index}`}
                              className="flex items-start space-x-3"
                            >
                              <div className="flex-shrink-0">
                                <div className="w-3 h-3 bg-blue-500 rounded-full mt-1 shadow-sm"></div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {history.status === "reception_created" &&
                                    "Tạo phiếu tiếp nhận"}
                                  {history.status === "reception_approved" &&
                                    "Duyệt phiếu tiếp nhận"}
                                  {history.status === "in_progress" &&
                                    "Bắt đầu thực hiện"}
                                  {history.status === "completed" &&
                                    "Hoàn thành dịch vụ"}
                                  {history.status === "confirmed" &&
                                    "Xác nhận lịch hẹn"}
                                  {history.status === "customer_arrived" &&
                                    "Khách hàng đến"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatVietnameseDateTime(history.changedAt)}
                                </p>
                                {history.notes && history.notes.trim() && (
                                  <p className="text-xs text-gray-600 mt-1 italic">
                                    "{history.notes}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                {/* Customer Notes */}
                {appointment.customerNotes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      Ghi chú khách hàng
                    </h4>
                    <p className="text-sm text-gray-700">
                      {appointment.customerNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:ml-3 sm:w-auto"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetails;
