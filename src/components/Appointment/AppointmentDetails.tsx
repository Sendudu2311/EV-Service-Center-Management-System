import React, { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import CancelRequestManagement from "./CancelRequestManagement";
import CancelRequestModal from "./CancelRequestModal";
import PaymentPreviewModal from "../Payment/PaymentPreviewModal";
import FollowUpModal from "./FollowUpModal";
import { useAuth } from "../../contexts/AuthContext";

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
  const externalServiceAmount = appointment.services.reduce(
    (total, service) => {
      return total + (service.quantity * service.price || 0);
    },
    0
  );
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentPreview, setShowPaymentPreview] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const { user } = useAuth();

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-orange-600 text-white",
      confirmed: "bg-lime-200 text-dark-900",
      customer_arrived: "bg-dark-600 text-white",
      reception_created: "bg-purple-600 text-white",
      reception_approved: "bg-lime-200 text-dark-900",
      in_progress: "bg-orange-600 text-white",
      completed: "bg-green-600 text-white",
      invoiced: "bg-text-muted text-white",
      cancelled: "bg-red-600 text-white",
      cancel_requested: "bg-orange-600 text-white",
      cancel_approved: "bg-orange-600 text-white",
      cancel_refunded: "bg-green-600 text-white",
    };
    return colors[status as keyof typeof colors] || "bg-text-muted text-white";
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
        <div className="fixed inset-0 bg-dark-9000 bg-opacity-75 transition-opacity" />

        <div className="relative transform overflow-hidden rounded-lg bg-dark-300 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
          <div className="bg-dark-300 px-6 pb-4 pt-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold leading-6 text-white">
                  Chi tiết lịch hẹn
                </h3>
                <p className="mt-1 text-sm text-text-muted">
                  Mã lịch hẹn: {appointment.appointmentNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-dark-300 text-text-muted hover:text-text-muted focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm text-text-muted ${getStatusBadge(
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

            {/* Follow-up Banner */}
            {appointment.isFollowUp && appointment.baseAppointmentId && (
              <div className="mb-6 bg-purple-900 bg-opacity-20 border-2 border-purple-500 rounded-xl p-4 shadow-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white">
                      Lịch hẹn Follow-up
                    </h4>
                    <p className="text-sm text-purple-200 mt-1">
                      Lịch hẹn gốc:{" "}
                      <span className="font-semibold text-purple-100">
                        #{appointment.baseAppointmentId.appointmentNumber}
                      </span>
                      {" - "}
                      {formatVietnameseDateTime(
                        appointment.baseAppointmentId.scheduledDate,
                        appointment.baseAppointmentId.scheduledTime
                      )}
                    </p>
                    {appointment.followUpReason && (
                      <p className="text-sm text-purple-200 mt-1">
                        Lý do:{" "}
                        <span className="font-semibold text-purple-100">
                          {appointment.followUpReason === "warranty_issue"
                            ? "Vấn đề bảo hành"
                            : appointment.followUpReason ===
                                "additional_service"
                              ? "Dịch vụ bổ sung"
                              : appointment.followUpReason ===
                                  "periodic_maintenance"
                                ? "Bảo dưỡng định kỳ"
                                : appointment.followUpReason ===
                                    "unsatisfied_result"
                                  ? "Không hài lòng kết quả"
                                  : "Lý do khác"}
                        </span>
                      </p>
                    )}
                    {appointment.followUpNotes && (
                      <div className="mt-2 bg-purple-800 bg-opacity-30 rounded-lg p-3">
                        <p className="text-xs text-purple-300 font-semibold mb-1">
                          Ghi chú từ khách hàng:
                        </p>
                        <p className="text-sm text-purple-100">
                          {appointment.followUpNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                <div className="bg-dark-900 rounded-lg p-4">
                  <h4 className="text-lg text-text-muted text-white mb-4">
                    Thông tin cơ bản
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted text-text-muted">
                        Ngày hẹn:
                      </span>
                      <span className="text-sm text-white">
                        {formatVietnameseDateTime(
                          appointment.scheduledDate,
                          appointment.scheduledTime
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted text-text-muted">
                        Độ ưu tiên:
                      </span>
                      <span
                        className={`text-sm text-text-muted ${
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
                        <span className="text-sm text-text-muted text-text-muted">
                          Dự kiến hoàn thành:
                        </span>
                        <span className="text-sm text-white">
                          {formatVietnameseDateTime(
                            appointment.estimatedCompletion
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="bg-dark-900 rounded-lg p-4">
                  <h4 className="text-lg text-text-muted text-white mb-4">
                    Thông tin xe
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted text-text-muted">
                        Xe:
                      </span>
                      <span className="text-sm text-white">
                        {appointment.vehicleId.make}{" "}
                        {appointment.vehicleId.model} (
                        {appointment.vehicleId.year})
                      </span>
                    </div>
                    {appointment.vehicleId.licensePlate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-text-muted text-text-muted">
                          Biển số:
                        </span>
                        <span className="text-sm text-white">
                          {appointment.vehicleId.licensePlate}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Center */}
                <div className="bg-dark-900 rounded-lg p-4">
                  <h4 className="text-lg text-text-muted text-white mb-4">
                    Trung tâm dịch vụ
                  </h4>
                  <div className="space-y-3">
                    {/* Service Center Information removed - single center architecture */}
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted text-text-muted">
                        Tên:
                      </span>
                      <span className="text-sm text-white">
                        EV Service Center
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-text-muted text-text-muted">
                        Địa chỉ:
                      </span>
                      <span className="text-sm text-white">
                        123 Main Street, Ho Chi Minh City
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Services & Timeline */}
              <div className="space-y-6">
                {/* Services */}
                <div className="bg-dark-900 rounded-lg p-4">
                  <h4 className="text-lg text-text-muted text-white mb-4">
                    Dịch vụ đã đặt
                  </h4>
                  <div className="space-y-3">
                    {appointment.services.map((service, index) => (
                      <div
                        key={index}
                        className="border-b border-dark-200 pb-3 last:border-0"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-text-muted text-white">
                              {service.serviceId?.name ||
                                "Dịch vụ không xác định"}
                            </p>
                            <p className="text-xs text-text-muted">
                              Thời gian dự kiến: {service.estimatedDuration}{" "}
                              phút
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-text-muted text-white">
                              {formatVND(service.price)}
                            </p>
                            <p className="text-xs text-text-muted">
                              SL: {service.quantity}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Parts Used Section */}
                    {appointment.partsUsed &&
                      appointment.partsUsed.length > 0 && (
                        <>
                          <div className="pt-3 border-t border-dark-300">
                            <h5 className="text-sm font-semibold text-white mb-2">
                              Phụ tùng đã sử dụng
                            </h5>
                          </div>
                          {appointment.partsUsed.map((part, index) => (
                            <div
                              key={index}
                              className="border-b border-dark-200 pb-3 last:border-0"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm text-text-muted text-white">
                                    {part.partId?.name ||
                                      "Phụ tùng không xác định"}
                                  </p>
                                  {part.partId?.partNumber && (
                                    <p className="text-xs text-text-muted">
                                      Mã: {part.partId.partNumber}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-text-muted text-white">
                                    {formatVND(part.unitPrice * part.quantity)}
                                  </p>
                                  <p className="text-xs text-text-muted">
                                    SL: {part.quantity}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                    {/* External Parts Section */}
                    {appointment.serviceReceptionId?.externalParts &&
                      appointment.serviceReceptionId.externalParts.length >
                        0 && (
                        <>
                          <div className="pt-3 border-t border-amber-400">
                            <h5 className="text-sm font-semibold text-amber-500 mb-2 flex items-center gap-2">
                              <span>🛒</span>
                              Linh kiện đặt từ bên ngoài
                            </h5>
                          </div>
                          {appointment.serviceReceptionId.externalParts.map(
                            (part: any, index: number) => (
                              <div
                                key={index}
                                className="border-b border-amber-200 pb-3 last:border-0 bg-amber-50 -mx-3 px-3 py-2"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm text-amber-900 font-semibold">
                                      {part.partName}
                                    </p>
                                    {part.partNumber && (
                                      <p className="text-xs text-amber-700">
                                        Mã: {part.partNumber}
                                      </p>
                                    )}
                                    {part.supplier?.name && (
                                      <p className="text-xs text-amber-600">
                                        NCC: {part.supplier.name}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-amber-700 font-semibold">
                                      {formatVND(part.totalPrice)}
                                    </p>
                                    <p className="text-xs text-amber-600">
                                      SL: {part.quantity}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </>
                      )}

                    {/* Subtotals and Total */}
                    <div className="pt-3 border-t border-dark-300 space-y-2">
                      {(() => {
                        // Calculate subtotals
                        const servicesTotal = appointment.services.reduce(
                          (sum: number, service: any) =>
                            sum +
                            (service.price || 0) * (service.quantity || 1),
                          0
                        );
                        const partsTotal =
                          appointment.partsUsed?.reduce(
                            (sum: number, part: any) =>
                              sum +
                              (part.unitPrice || 0) * (part.quantity || 1),
                            0
                          ) || 0;
                        const externalPartsTotal =
                          appointment.serviceReceptionId?.externalParts?.reduce(
                            (sum: number, part: any) =>
                              sum + (part.totalPrice || 0),
                            0
                          ) || 0;
                        const subtotal =
                          servicesTotal + partsTotal + externalPartsTotal;
                        const vatAmount = subtotal * 0.1;
                        const totalWithVAT = subtotal + vatAmount;

                        return (
                          <>
                            {/* Services Subtotal */}
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-text-muted">
                                Tổng dịch vụ:
                              </span>
                              <span className="text-white">
                                {formatVND(servicesTotal)}
                              </span>
                            </div>

                            {/* Parts Subtotal */}
                            {appointment.partsUsed &&
                              appointment.partsUsed.length > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-text-muted">
                                    Tổng phụ tùng:
                                  </span>
                                  <span className="text-white">
                                    {formatVND(partsTotal)}
                                  </span>
                                </div>
                              )}

                            {/* External Parts Subtotal */}
                            {appointment.serviceReceptionId?.externalParts &&
                              appointment.serviceReceptionId.externalParts
                                .length > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-amber-600 flex items-center gap-1">
                                    <span>🛒</span>
                                    Tổng linh kiện ngoài:
                                  </span>
                                  <span className="text-amber-500 font-semibold">
                                    {formatVND(externalPartsTotal)}
                                  </span>
                                </div>
                              )}

                            {/* VAT */}
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-text-muted">
                                VAT (10%):
                              </span>
                              <span className="text-white">
                                {formatVND(vatAmount)}
                              </span>
                            </div>

                            {/* Deposit */}
                            {appointment.depositInfo &&
                              appointment.depositInfo.paid &&
                              appointment.depositInfo.amount && (
                                <div className="flex justify-between items-center text-sm border-t border-dark-200 pt-2">
                                  <span className="text-text-muted">
                                    Đã đặt cọc:
                                  </span>
                                  <span className="text-green-600">
                                    -{formatVND(appointment.depositInfo.amount)}
                                  </span>
                                </div>
                              )}

                            {/* Total */}
                            <div className="flex justify-between items-center pt-2 border-t border-dark-200">
                              <span className="text-base font-semibold text-white">
                                Tổng cộng:
                              </span>
                              <span className="text-lg font-bold text-lime-600">
                                {formatVND(totalWithVAT)}
                              </span>
                            </div>

                            {/* Remaining Amount */}
                            {appointment.depositInfo &&
                              appointment.depositInfo.paid &&
                              appointment.depositInfo.amount && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-text-muted">
                                    Còn phải trả:
                                  </span>
                                  <span className="text-orange-500 font-semibold">
                                    {formatVND(
                                      totalWithVAT -
                                        appointment.depositInfo.amount
                                    )}
                                  </span>
                                </div>
                              )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Workflow Timeline */}
                {appointment.workflowHistory &&
                  appointment.workflowHistory.length > 0 && (
                    <div className="bg-dark-900 rounded-lg p-4">
                      <h4 className="text-lg text-text-muted text-white mb-4">
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
                                <div className="w-3 h-3 bg-dark-9000 rounded-full mt-1 shadow-sm"></div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-text-muted text-white">
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
                                <p className="text-xs text-text-muted mt-1">
                                  {formatVietnameseDateTime(history.changedAt)}
                                </p>
                                {history.notes && history.notes.trim() && (
                                  <p className="text-xs text-text-secondary mt-1 italic">
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
                  <div className="bg-dark-900 rounded-lg p-4">
                    <h4 className="text-lg text-text-muted text-white mb-4">
                      Ghi chú khách hàng
                    </h4>
                    <p className="text-sm text-text-secondary">
                      {appointment.customerNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-dark-900 px-6 py-4 sm:flex sm:flex-row-reverse">
            <div className="flex space-x-3">
              {/* NEW: Follow-up Button for Customers - show when completed or invoiced */}
              {user?.role === "customer" &&
                (appointment.customerId === user._id ||
                  appointment.customerId?._id === user._id) &&
                ["completed", "invoiced"].includes(appointment.status) && (
                  <button
                    type="button"
                    onClick={() => setShowFollowUpModal(true)}
                    className="inline-flex w-full justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:w-auto"
                  >
                    📅 Đặt lịch Follow-up
                  </button>
                )}

              {/* Payment Preview Button for Customers - show when reception is approved */}
              {user?.role === "customer" &&
                (appointment.customerId === user._id ||
                  appointment.customerId?._id === user._id) &&
                appointment.status === "reception_approved" && (
                  <button
                    type="button"
                    onClick={() => setShowPaymentPreview(true)}
                    className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
                  >
                    Xem chi tiết thanh toán
                  </button>
                )}

              {/* Cancel Request Button for Customers */}
              {user?.role === "customer" &&
                (appointment.customerId === user._id ||
                  appointment.customerId?._id === user._id) &&
                ["pending", "confirmed"].includes(appointment.status) && (
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 sm:w-auto"
                  >
                    Yêu cầu hủy lịch hẹn
                  </button>
                )}

              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-md bg-lime-600 px-4 py-2 text-sm font-semibold text-dark-900 shadow-sm hover:bg-dark-9000 focus:outline-none focus:ring-2 focus:ring-lime-400 sm:ml-3 sm:w-auto"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Request Modal */}
      <CancelRequestModal
        appointment={appointment}
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={() => {
          _onUpdate();
          setShowCancelModal(false);
        }}
      />

      {/* Payment Preview Modal */}
      <PaymentPreviewModal
        appointment={appointment}
        isOpen={showPaymentPreview}
        onClose={() => setShowPaymentPreview(false)}
      />

      {/* NEW: Follow-up Modal */}
      <FollowUpModal
        isOpen={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        baseAppointment={{
          _id: appointment._id,
          appointmentNumber: appointment.appointmentNumber,
          vehicleId: appointment.vehicleId,
        }}
      />
    </div>
  );
};

export default AppointmentDetails;
