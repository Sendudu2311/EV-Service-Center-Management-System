import React, { useState, useRef } from "react";
import { appointmentsAPI, uploadAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";

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
  const [refundProofImage, setRefundProofImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh hợp lệ");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước file không được vượt quá 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const response = await uploadAPI.uploadImage(
        file,
        `Refund proof image - ${file.name}`
      );

      setRefundProofImage(response.data.imageUrl || "");
      toast.success("Upload ảnh thành công");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Lỗi upload ảnh. Vui lòng thử lại.");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setRefundProofImage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleProcessRefund = async () => {
    if (!refundProofImage) {
      toast.error("Vui lòng upload ảnh chứng từ hoàn tiền");
      return;
    }

    setLoading(true);
    try {
      await appointmentsAPI.processRefund(appointment._id, {
        notes: refundNotes,
        refundProofImage: refundProofImage,
      });
      toast.success("Đã xử lý hoàn tiền thành công");
      setShowRefundModal(false);
      setRefundNotes("");
      setRefundProofImage("");
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

  const {
    reason,
    requestedAt,
    refundAmount,
    refundPercentage,
    refundMethod,
    customerBankInfo,
    customerBankProofImage,
  } = appointment.cancelRequest;

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
            {refundMethod && (
              <p>
                <strong>Phương thức hoàn tiền:</strong>{" "}
                {refundMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}
              </p>
            )}
            {refundMethod === "bank_transfer" && customerBankInfo && (
              <div className="mt-2 p-3 bg-white rounded border">
                <p className="font-medium text-gray-900 mb-2">
                  Thông tin tài khoản:
                </p>
                <p>
                  <strong>Ngân hàng:</strong> {customerBankInfo.bankName}
                </p>
                <p>
                  <strong>Số tài khoản:</strong>{" "}
                  {customerBankInfo.accountNumber}
                </p>
                <p>
                  <strong>Chủ tài khoản:</strong>{" "}
                  {customerBankInfo.accountHolder}
                </p>
                {customerBankProofImage && (
                  <div className="mt-2">
                    <p className="font-medium text-gray-900 mb-1">
                      Ảnh chứng minh:
                    </p>
                    <img
                      src={customerBankProofImage}
                      alt="Bank proof"
                      className="w-32 h-20 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
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
                      {appointment.cancelRequest.refundProofImage && (
                        <div className="mt-2">
                          <p className="text-xs text-green-600 mb-1">
                            Chứng từ hoàn tiền:
                          </p>
                          <img
                            src={appointment.cancelRequest.refundProofImage}
                            alt="Chứng từ hoàn tiền"
                            className="w-32 h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() =>
                              window.open(
                                appointment.cancelRequest.refundProofImage,
                                "_blank"
                              )
                            }
                          />
                        </div>
                      )}
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
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Xác nhận hoàn tiền
              </h3>

              {/* Refund Method Display */}
              {refundMethod && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Phương thức hoàn tiền:{" "}
                    {refundMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}
                  </p>
                  {refundMethod === "bank_transfer" && customerBankInfo && (
                    <div className="mt-2 text-sm text-blue-800">
                      <p>
                        <strong>Ngân hàng:</strong> {customerBankInfo.bankName}
                      </p>
                      <p>
                        <strong>Số tài khoản:</strong>{" "}
                        {customerBankInfo.accountNumber}
                      </p>
                      <p>
                        <strong>Chủ tài khoản:</strong>{" "}
                        {customerBankInfo.accountHolder}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
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

              {/* Proof Image Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ảnh chứng từ hoàn tiền <span className="text-red-500">*</span>
                </label>

                {refundProofImage ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img
                        src={refundProofImage}
                        alt="Refund proof"
                        className="w-full h-32 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        disabled={loading}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Ảnh đã upload thành công
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label
                        htmlFor="refundProofImage"
                        className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 ${
                          loading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <PhotoIcon className="h-5 w-5 mr-2" />
                        {uploadingImage ? "Đang upload..." : "Chọn ảnh"}
                      </label>
                      <input
                        ref={fileInputRef}
                        id="refundProofImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={loading || uploadingImage}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      PNG, JPG tối đa 5MB
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundNotes("");
                    setRefundProofImage("");
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Hủy
                </button>
                <button
                  onClick={handleProcessRefund}
                  disabled={loading || !refundProofImage}
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
