import React, { useState, useRef, useEffect } from "react";
import {
  XMarkIcon,
  PhotoIcon,
  BanknotesIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import { appointmentsAPI } from "../../services/api";
import {
  PaymentConfirmationFormData,
  PaymentMethod,
} from "../../types/payment";
import toast from "react-hot-toast";

interface PaymentConfirmationModalProps {
  appointment: any;
  invoice: any | null; // Invoice data (optional)
  serviceReception: any | null; // Service reception data (most complete)
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  appointment,
  invoice,
  serviceReception,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Calculate totals from service reception (most complete data source)
  const calculateTotals = () => {
    const depositAmount = appointment.depositInfo?.paid
      ? appointment.depositInfo.amount
      : 0;

    // Priority 1: Use invoice data if available (already calculated with tax)
    if (invoice && invoice.totals) {
      return {
        depositAmount,
        totalAmount: invoice.totals.totalAmount || 0,
        remainingAmount: invoice.totals.remainingAmount || 0,
      };
    }

    // Priority 2: Calculate from Service Reception (includes all parts + recommended services)
    if (serviceReception) {
      // Initial services from appointment
      const servicesTotal = appointment.services.reduce(
        (sum: number, s: any) => sum + (s.price || 0) * (s.quantity || 1),
        0
      );

      // Recommended services discovered during inspection
      const recommendedServicesTotal = (serviceReception.recommendedServices || [])
        .reduce((sum: number, rs: any) => sum + (rs.estimatedCost || 0), 0);

      // Parts (approved or available)
      const partsTotal = (serviceReception.requestedParts || [])
        .filter((part: any) => part.isAvailable)
        .reduce((sum: number, part: any) => {
          const unitPrice = part.partId?.pricing?.retail || part.estimatedCost || 0;
          return sum + (unitPrice * part.quantity);
        }, 0);

      // Labor estimates
      const laborTotal = serviceReception.estimatedLabor?.totalCost || 0;

      const subtotal = servicesTotal + recommendedServicesTotal + partsTotal + laborTotal;
      const taxAmount = subtotal * 0.1; // 10% VAT
      const totalAmount = subtotal + taxAmount;
      const remainingAmount = totalAmount - depositAmount;

      return { depositAmount, totalAmount, remainingAmount };
    }

    // Priority 3: Fallback - Calculate from appointment only (least accurate)
    const servicesTotal = appointment.services.reduce(
      (sum: number, s: any) => sum + (s.price || 0) * (s.quantity || 1),
      0
    );
    const subtotal = servicesTotal;
    const taxAmount = subtotal * 0.1;
    const totalAmount = subtotal + taxAmount;
    const remainingAmount = totalAmount - depositAmount;

    return { depositAmount, totalAmount, remainingAmount };
  };

  const calculateRemainingAmount = () => {
    return calculateTotals().remainingAmount;
  };

  const [formData, setFormData] = useState<PaymentConfirmationFormData>({
    paymentMethod: "bank_transfer",
    amount: "0", // Not used anymore, amount is calculated dynamically
    paymentDate: new Date().toISOString().split("T")[0],
    proofImage: null,
    transferRef: "",
    bankName: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form data when appointment changes
  useEffect(() => {
    if (appointment) {
      // Reset form data when appointment changes
      setFormData((prev) => ({
        ...prev,
        paymentMethod: "bank_transfer",
        paymentDate: new Date().toISOString().split("T")[0],
        proofImage: null,
        transferRef: "",
        bankName: "",
        notes: "",
      }));
    }
  }, [appointment]);

  const paymentMethods: PaymentMethod[] = [
    {
      id: "bank_transfer",
      name: "Chuyển khoản ngân hàng",
      description: "Xác nhận thanh toán qua chuyển khoản",
      icon: "🏦",
    },
    {
      id: "cash",
      name: "Tiền mặt",
      description: "Xác nhận thanh toán bằng tiền mặt",
      icon: "💵",
    },
  ];

  const handleInputChange = (
    field: keyof PaymentConfirmationFormData,
    value: string | File | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File ảnh không được vượt quá 5MB");
        return;
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Chỉ chấp nhận file JPG, PNG hoặc PDF");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        proofImage: file,
      }));

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      proofImage: null,
    }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File ảnh không được vượt quá 5MB");
        return;
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Chỉ chấp nhận file JPG, PNG hoặc PDF");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        proofImage: file,
      }));

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
    }
  };

  const validateForm = (): boolean => {
    // Amount is now fixed and read-only, no need to validate

    if (!formData.paymentDate) {
      toast.error("Vui lòng chọn ngày thanh toán");
      return false;
    }

    if (!formData.proofImage) {
      toast.error("Vui lòng upload ảnh chứng minh thanh toán");
      return false;
    }

    if (formData.paymentMethod === "bank_transfer") {
      if (!formData.transferRef || formData.transferRef.length < 6) {
        toast.error("Mã giao dịch phải có ít nhất 6 ký tự");
        return false;
      }
      if (!formData.bankName.trim()) {
        toast.error("Vui lòng nhập tên ngân hàng");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("paymentMethod", formData.paymentMethod);
      formDataToSend.append("amount", calculateRemainingAmount().toString());
      formDataToSend.append("paymentDate", formData.paymentDate);
      formDataToSend.append("proofImage", formData.proofImage!);

      if (formData.paymentMethod === "bank_transfer") {
        formDataToSend.append("transferRef", formData.transferRef);
        formDataToSend.append("bankName", formData.bankName);
      } else if (formData.paymentMethod === "cash") {
        formDataToSend.append("notes", formData.notes);
      }

      const response = await appointmentsAPI.confirmFinalPayment(
        appointment._id,
        formDataToSend
      );

      if (response.data.success) {
        toast.success("Xác nhận thanh toán thành công!");
        onSuccess();
        onClose();
      } else {
        toast.error(
          response.data.message || "Có lỗi xảy ra khi xác nhận thanh toán"
        );
      }
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Có lỗi xảy ra khi xác nhận thanh toán";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-dark-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-dark-300 mb-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <h2 className="text-xl font-bold text-white">
            Xác nhận thanh toán cuối cùng
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary"
            disabled={loading}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Payment Summary */}
        <div className="mb-6 p-4 bg-dark-900 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-lime-900 mb-3">
            Thông tin thanh toán
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-secondary">Tiền cọc đã trả:</span>
              <span className="ml-2 font-semibold text-green-600 text-green-600">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(calculateTotals().depositAmount)}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">Tổng tiền dịch vụ:</span>
              <span className="ml-2 font-semibold text-green-600">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(calculateTotals().totalAmount)}
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-blue-200">
              <span className="text-lg font-bold text-red-600">
                Số tiền cần trả thêm:
              </span>
              <span className="ml-2 text-xl font-bold text-red-600">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(calculateTotals().remainingAmount)}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-text-secondary">Appointment:</span>
              <span className="ml-2 font-semibold text-green-600">
                #{appointment?.appointmentNumber}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm text-text-muted text-text-secondary mb-3">
              Phương thức thanh toán
            </label>
            <div className="grid grid-cols-2 gap-4">
              {paymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={`relative flex cursor-pointer rounded-lg p-4 border-2 ${
                    formData.paymentMethod === method.id
                      ? "border-blue-500 bg-dark-900"
                      : "border-dark-200 bg-dark-300 hover:bg-dark-900"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={formData.paymentMethod === method.id}
                    onChange={(e) =>
                      handleInputChange(
                        "paymentMethod",
                        e.target.value as "bank_transfer" | "cash"
                      )
                    }
                    className="sr-only"
                    disabled={loading}
                  />
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{method.icon}</span>
                    <div>
                      <div className="text-sm text-text-muted text-white">
                        {method.name}
                      </div>
                      <div className="text-xs text-text-muted">
                        {method.description}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Dynamic Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount - Fixed and Read-only */}
            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Số tiền (VND) *
              </label>
              <input
                type="text"
                value={new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(calculateRemainingAmount())}
                className="w-full px-3 py-2 border border-dark-200 rounded-md bg-dark-900 text-text-secondary cursor-not-allowed"
                disabled={true}
                readOnly
              />
              <p className="text-xs text-text-muted mt-1">
                Số tiền được tính tự động dựa trên hóa đơn
              </p>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Ngày thanh toán *
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) =>
                  handleInputChange("paymentDate", e.target.value)
                }
                className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                disabled={loading}
                required
              />
            </div>

            {/* Bank Transfer specific fields */}
            {formData.paymentMethod === "bank_transfer" && (
              <>
                <div>
                  <label className="block text-sm text-text-muted text-text-secondary mb-1">
                    Mã giao dịch *
                  </label>
                  <input
                    type="text"
                    value={formData.transferRef}
                    onChange={(e) =>
                      handleInputChange("transferRef", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                    placeholder="Nhập mã giao dịch từ ngân hàng"
                    disabled={loading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted text-text-secondary mb-1">
                    Tên ngân hàng *
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) =>
                      handleInputChange("bankName", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                    placeholder="VD: Vietcombank, Techcombank..."
                    disabled={loading}
                    required
                  />
                </div>
              </>
            )}

            {/* Cash specific fields */}
            {formData.paymentMethod === "cash" && (
              <div className="md:col-span-2">
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                  placeholder="Ghi chú về giao dịch tiền mặt (tùy chọn)"
                  rows={3}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Proof Image Upload */}
          <div>
            <label className="block text-sm text-text-muted text-text-secondary mb-1">
              Ảnh chứng minh thanh toán *
            </label>
            <div
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
              isDragOver
                ? 'border-lime-500 bg-lime-900 bg-opacity-10'
                : 'border-dark-300 hover:border-dark-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
              <div className="space-y-1 text-center">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mx-auto h-32 w-auto rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      disabled={loading}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <PhotoIcon className="mx-auto h-12 w-12 text-text-muted" />
                )}
                <div className="flex text-sm text-text-secondary">
                  <label
                    htmlFor="proofImage"
                    className="relative cursor-pointer bg-dark-300 rounded-md text-text-muted text-lime-600 hover:text-lime-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>
                      {formData.proofImage ? "Thay đổi ảnh" : "Upload ảnh"}
                    </span>
                    <input
                      ref={fileInputRef}
                      id="proofImage"
                      name="proofImage"
                      type="file"
                      className="sr-only"
                      accept="image/*,.pdf"
                      onChange={handleImageUpload}
                      disabled={loading}
                    />
                  </label>
                  <p className="pl-1">hoặc kéo thả vào đây</p>
                </div>
                <p className="text-xs text-text-muted">
                  PNG, JPG, PDF tối đa 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-dark-200 rounded-md text-text-secondary hover:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-lime-600 text-dark-900 rounded-md hover:bg-dark-9000 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-lime-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận thanh toán"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentConfirmationModal;
