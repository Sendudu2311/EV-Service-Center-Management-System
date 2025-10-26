import React, { useState } from "react";
import { appointmentsAPI } from "../../services/api";
import toast from "react-hot-toast";
import RefundMethodSelector from "./RefundMethodSelector";

interface CancelRequestModalProps {
  appointment: {
    _id: string;
    appointmentNumber: string;
    scheduledDate: string;
    scheduledTime: string;
    totalAmount?: number;
    bookingType?: string;
    depositInfo?: {
      amount: number;
    };
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CustomerBankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

const CancelRequestModal: React.FC<CancelRequestModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<
    "cash" | "bank_transfer" | ""
  >("");
  const [customerBankInfo, setCustomerBankInfo] = useState<CustomerBankInfo>({
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  });
  const [customerBankProofImage, setCustomerBankProofImage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate reason
    if (!reason.trim()) {
      toast.error("Vui lòng chọn lý do hủy lịch hẹn");
      return;
    }

    if (reason === "Khác" && !customReason.trim()) {
      toast.error("Vui lòng mô tả chi tiết lý do hủy lịch hẹn");
      return;
    }

    if (!refundMethod) {
      toast.error("Vui lòng chọn phương thức hoàn tiền");
      return;
    }

    if (refundMethod === "bank_transfer") {
      if (
        !customerBankInfo.bankName ||
        !customerBankInfo.accountNumber ||
        !customerBankInfo.accountHolder
      ) {
        toast.error("Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng");
        return;
      }
      if (!customerBankProofImage) {
        toast.error("Vui lòng upload ảnh chứng minh tài khoản");
        return;
      }
    }

    setLoading(true);
    try {
      const requestData: {
        reason: string;
        refundMethod: "cash" | "bank_transfer";
        customerBankInfo?: CustomerBankInfo;
        customerBankProofImage?: string;
      } = {
        reason: reason === "Khác" ? customReason.trim() : reason.trim(),
        refundMethod,
      };

      // Only include bank info if method is bank_transfer
      if (refundMethod === "bank_transfer") {
        requestData.customerBankInfo = customerBankInfo;
        requestData.customerBankProofImage = customerBankProofImage;
      }

      await appointmentsAPI.requestCancellation(appointment._id, requestData);

      toast.success("Yêu cầu hủy lịch hẹn đã được gửi thành công");
      onSuccess();
      handleClose();
    } catch (error: unknown) {
      console.error("Error requesting cancellation:", error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message ||
          "Có lỗi xảy ra khi gửi yêu cầu hủy lịch hẹn"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setCustomReason("");
    setRefundMethod("");
    setCustomerBankInfo({
      bankName: "",
      accountNumber: "",
      accountHolder: "",
    });
    setCustomerBankProofImage("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Yêu cầu hủy lịch hẹn
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Appointment Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">
              Thông tin lịch hẹn
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Mã lịch hẹn:</span>
                <span className="ml-2 font-medium">
                  {appointment.appointmentNumber}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Ngày:</span>
                <span className="ml-2 font-medium">
                  {new Date(appointment.scheduledDate).toLocaleDateString(
                    "vi-VN"
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Giờ:</span>
                <span className="ml-2 font-medium">
                  {appointment.scheduledTime}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Tổng tiền:</span>
                <span className="ml-2 font-medium">
                  {(() => {
                    // For deposit booking, show deposit amount
                    if (
                      appointment.bookingType === "deposit_booking" &&
                      appointment.depositInfo?.amount
                    ) {
                      return appointment.depositInfo.amount.toLocaleString(
                        "vi-VN"
                      );
                    }
                    // For full service booking, show total amount
                    return (appointment.totalAmount || 0).toLocaleString(
                      "vi-VN"
                    );
                  })()}{" "}
                  VND
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Số tiền hoàn dự kiến:</span>
                <span className="ml-2 font-medium text-green-600">
                  {(() => {
                    // Calculate refund amount based on 24h rule
                    const appointmentDateTime = new Date(
                      appointment.scheduledDate
                    );
                    const now = new Date();
                    const timeDifference =
                      appointmentDateTime.getTime() - now.getTime();
                    const hoursUntilAppointment =
                      timeDifference / (1000 * 60 * 60);

                    const refundPercentage =
                      hoursUntilAppointment >= 24 ? 100 : 80;

                    // Get base amount
                    let baseAmount;
                    if (
                      appointment.bookingType === "deposit_booking" &&
                      appointment.depositInfo?.amount
                    ) {
                      baseAmount = appointment.depositInfo.amount;
                    } else {
                      baseAmount = appointment.totalAmount || 0;
                    }

                    const estimatedRefundAmount = Math.round(
                      (baseAmount * refundPercentage) / 100
                    );

                    return `${estimatedRefundAmount.toLocaleString(
                      "vi-VN"
                    )} VND (${refundPercentage}%)`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cancellation Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do hủy lịch hẹn <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                required
              >
                <option value="">Chọn lý do hủy lịch hẹn...</option>
                <option value="Thay đổi kế hoạch">Thay đổi kế hoạch</option>
                <option value="Xe gặp sự cố khác">Xe gặp sự cố khác</option>
                <option value="Không thể đến đúng giờ">
                  Không thể đến đúng giờ
                </option>
                <option value="Tìm được dịch vụ khác">
                  Tìm được dịch vụ khác
                </option>
                <option value="Lý do cá nhân">Lý do cá nhân</option>
                <option value="Thời tiết không thuận lợi">
                  Thời tiết không thuận lợi
                </option>
                <option value="Xe đã được sửa chữa ở nơi khác">
                  Xe đã được sửa chữa ở nơi khác
                </option>
                <option value="Thay đổi địa chỉ">Thay đổi địa chỉ</option>
                <option value="Khác">Khác</option>
              </select>

              {/* Custom reason input when "Khác" is selected */}
              {reason === "Khác" && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vui lòng mô tả chi tiết{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Vui lòng mô tả chi tiết lý do hủy lịch hẹn..."
                    disabled={loading}
                    required
                  />
                </div>
              )}
            </div>

            {/* Refund Method Selection */}
            <RefundMethodSelector
              refundMethod={refundMethod}
              customerBankInfo={customerBankInfo}
              customerBankProofImage={customerBankProofImage}
              onRefundMethodChange={setRefundMethod}
              onBankInfoChange={setCustomerBankInfo}
              onBankProofImageChange={setCustomerBankProofImage}
              disabled={loading}
            />

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Đang gửi..." : "Gửi yêu cầu hủy"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CancelRequestModal;
