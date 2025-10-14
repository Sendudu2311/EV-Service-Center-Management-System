import React, { useState } from "react";
import { appointmentsAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

interface CancelRequestManagementProps {
  appointment: any;
  onUpdate: () => void;
}

const CancelRequestManagement: React.FC<CancelRequestManagementProps> = ({
  appointment,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

  const handleApprove = async () => {
    setLoading(true);
    try {
      await appointmentsAPI.approveCancellation(appointment._id, approveNotes);
      toast.success("Đã duyệt yêu cầu hủy lịch hẹn");
      setShowApproveModal(false);
      setApproveNotes("");
      onUpdate();
    } catch (error: any) {
      console.error("Error approving cancellation:", error);
      toast.error(
        error.response?.data?.message || "Có lỗi xảy ra khi duyệt yêu cầu"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    setLoading(true);
    try {
      await appointmentsAPI.processRefund(appointment._id, refundNotes);
      toast.success("Đã xử lý hoàn tiền thành công");
      setShowRefundModal(false);
      setRefundNotes("");
      onUpdate();
    } catch (error: any) {
      console.error("Error processing refund:", error);
      toast.error(
        error.response?.data?.message || "Có lỗi xảy ra khi xử lý hoàn tiền"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!appointment.cancelRequest) {
    return null;
  }

  const { reason, requestedAt, refundAmount, refundPercentage } =
    appointment.cancelRequest;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Yêu cầu hủy lịch hẹn
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              <strong>Lý do:</strong> {reason}
            </p>
            <p>
              <strong>Thời gian yêu cầu:</strong>{" "}
              {new Date(requestedAt).toLocaleString("vi-VN")}
            </p>
            {refundAmount && (
              <p>
                <strong>Số tiền hoàn:</strong>{" "}
                {refundAmount.toLocaleString("vi-VN")} VND ({refundPercentage}%)
              </p>
            )}
          </div>

          {appointment.status === "cancel_requested" && isStaffOrAdmin && (
            <div className="mt-3">
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? "Đang xử lý..." : "Duyệt yêu cầu hủy"}
              </button>
            </div>
          )}

          {appointment.status === "cancel_approved" && (
            <div className="mt-3">
              {isStaffOrAdmin ? (
                <div>
                  <p className="text-sm text-yellow-700 mb-2">
                    Khách hàng đang chờ hoàn tiền
                  </p>
                  <button
                    onClick={() => setShowRefundModal(true)}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? "Đang xử lý..." : "Xác nhận hoàn tiền"}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-yellow-700">Đang chờ hoàn tiền...</p>
              )}
            </div>
          )}

          {appointment.status === "cancelled" &&
            appointment.cancelRequest.refundProcessedAt && (
              <div className="mt-3">
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="ml-2">
                      <p className="text-sm font-medium text-green-800">
                        Đã hoàn tiền thành công
                      </p>
                      <p className="text-xs text-green-600">
                        Hoàn tiền: {refundAmount?.toLocaleString("vi-VN")} VND (
                        {refundPercentage}%)
                      </p>
                      <p className="text-xs text-green-600">
                        Thời gian:{" "}
                        {new Date(
                          appointment.cancelRequest.refundProcessedAt
                        ).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Approve Cancellation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Duyệt yêu cầu hủy lịch hẹn
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Nhập ghi chú cho việc duyệt yêu cầu hủy..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setApproveNotes("");
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Hủy
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Đang xử lý..." : "Duyệt"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Process Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Xác nhận hoàn tiền
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Nhập ghi chú cho việc hoàn tiền..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundNotes("");
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Hủy
                </button>
                <button
                  onClick={handleProcessRefund}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Đang xử lý..." : "Xác nhận hoàn tiền"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancelRequestManagement;
