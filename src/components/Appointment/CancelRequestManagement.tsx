import React, { useState } from "react";
import { appointmentsAPI } from "../../services/api";
import toast from "react-hot-toast";

interface CancelRequestManagementProps {
  appointmentId: string;
  onClose: () => void;
  onRefresh: () => void;
}

const CancelRequestManagement: React.FC<CancelRequestManagementProps> = ({
  appointmentId,
  onClose,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);

  const handleCancelRequest = async () => {
    setLoading(true);
    try {
      await appointmentsAPI.cancelAppointment(appointmentId);
      toast.success("Đã gửi yêu cầu hủy lịch hẹn");
      onRefresh();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Hủy lịch hẹn</h3>
        <p className="text-gray-600 mb-6">
          Bạn có chắc chắn muốn hủy lịch hẹn này không?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            onClick={handleCancelRequest}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Xác nhận hủy"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelRequestManagement;
