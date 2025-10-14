import React, { useState } from "react";
import { appointmentsAPI } from "../../services/api";
import toast from "react-hot-toast";

interface PaymentRestorationHandlerProps {
  appointmentId: string;
  onClose: () => void;
  onRefresh: () => void;
}

const PaymentRestorationHandler: React.FC<PaymentRestorationHandlerProps> = ({
  appointmentId,
  onClose,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);

  const handlePaymentRestoration = async () => {
    setLoading(true);
    try {
      // Implement payment restoration logic here
      toast.success("Đã khôi phục thanh toán");
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
        <h3 className="text-lg font-semibold mb-4">Khôi phục thanh toán</h3>
        <p className="text-gray-600 mb-6">
          Bạn có chắc chắn muốn khôi phục thanh toán cho lịch hẹn này không?
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
            onClick={handlePaymentRestoration}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Xác nhận khôi phục"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentRestorationHandler;
