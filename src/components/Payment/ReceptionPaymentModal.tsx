import React, { useState, useRef, useEffect } from "react";
import {
  XMarkIcon,
  PhotoIcon,
  BanknotesIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import { serviceReceptionAPI } from "../../services/api";
import {
  PaymentConfirmationFormData,
  PaymentMethod,
} from "../../types/payment";
import toast from "react-hot-toast";

interface ReceptionPaymentModalProps {
  appointment: any; // Only for basic info display (optional)
  serviceReception: any; // Service reception data (REQUIRED - primary data source)
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ReceptionPaymentModal: React.FC<ReceptionPaymentModalProps> = ({
  appointment,
  serviceReception,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Calculate totals DIRECTLY from ServiceReception ONLY
  const calculateTotals = () => {
    if (!serviceReception) {
      console.error("No serviceReception data");
      return { depositAmount: 0, totalAmount: 0, remainingAmount: 0 };
    }

    // Get deposit from appointment if available (fallback)
    const depositAmount = appointment?.depositInfo?.paid
      ? appointment.depositInfo.amount
      : 0;

    console.log("=== DEBUG RECEPTION PAYMENT MODAL ===");
    console.log("ServiceReception:", serviceReception);
    console.log("Deposit amount:", depositAmount);

    // 1. Recommended services (from serviceReception - already approved by staff)
    let recommendedServicesTotal = 0;
    if (serviceReception.recommendedServices) {
      recommendedServicesTotal = serviceReception.recommendedServices.reduce(
        (sum: number, rs: any) => {
          // Get price from populated serviceId or estimatedCost
          const price =
            (typeof rs.serviceId === "object" && rs.serviceId?.basePrice) ||
            rs.estimatedCost ||
            0;
          return sum + price * (rs.quantity || 1);
        },
        0
      );
    }
    console.log("Recommended services total:", recommendedServicesTotal);

    // 2. Parts (from serviceReception - already approved by staff)
    let partsTotal = 0;
    if (serviceReception.requestedParts) {
      partsTotal = serviceReception.requestedParts.reduce(
        (sum: number, p: any) => {
          // Get price from populated partId or estimatedCost
          const unitPrice =
            (typeof p.partId === "object" && p.partId?.pricing?.retail) ||
            p.estimatedCost ||
            0;
          return sum + unitPrice * (p.quantity || 1);
        },
        0
      );
    }
    console.log("Parts total:", partsTotal);

    // 3. External Parts (from serviceReception - parts ordered from outside)
    let externalPartsTotal = 0;
    if (serviceReception.externalParts) {
      externalPartsTotal = serviceReception.externalParts.reduce(
        (sum: number, ep: any) => sum + (ep.totalPrice || 0),
        0
      );
    }
    console.log("External parts total:", externalPartsTotal);

    // 4. Labor cost (if available in serviceReception)
    const laborTotal = serviceReception.invoicing?.laborCost || 0;
    console.log("Labor total:", laborTotal);

    // Calculate totals
    const subtotal = recommendedServicesTotal + partsTotal + externalPartsTotal + laborTotal;
    const taxAmount = subtotal * 0.1; // 10% VAT
    const totalAmount = subtotal + taxAmount;
    const remainingAmount = totalAmount - depositAmount;

    console.log("Subtotal:", subtotal);
    console.log("Tax:", taxAmount);
    console.log("Total amount:", totalAmount);
    console.log("Remaining amount:", remainingAmount);

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form data when serviceReception changes
  useEffect(() => {
    if (serviceReception) {
      // Reset form data when serviceReception changes
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
  }, [serviceReception]);

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

    // Prevent double submission
    if (loading) {
      console.warn("Payment submission already in progress, ignoring duplicate request");
      return;
    }

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

      // Call the serviceReception API endpoint for payment
      // Use serviceReception._id instead of appointment._id
      const response = await serviceReceptionAPI.confirmPayment(
        serviceReception._id,
        formDataToSend
      );

      if (response.data.success) {
        toast.success(
          "Xác nhận thanh toán thành công! Công việc đã bắt đầu tự động."
        );
        onSuccess();
        onClose();
      } else {
        toast.error(
          response.data.message || "Có lỗi xảy ra khi xác nhận thanh toán"
        );
      }
    } catch (error: any) {
      console.error("Error confirming payment after reception:", error);
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
            Xác nhận thanh toán (Sau duyệt phiếu tiếp nhận)
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

          {/* Recommended Services from ServiceReception */}
          {serviceReception?.recommendedServices?.length > 0 && (
            <div className="mb-4 pb-3 border-b border-dark-200">
              <h4 className="text-sm font-semibold text-text-secondary mb-2">
                Dịch vụ đề xuất:
              </h4>
              {serviceReception.recommendedServices.map(
                (service: any, index: number) => {
                  const price =
                    (typeof service.serviceId === "object" &&
                      service.serviceId?.basePrice) ||
                    service.estimatedCost ||
                    0;
                  const total = price * (service.quantity || 1);
                  return (
                    <div
                      key={index}
                      className="flex justify-between text-sm text-text-muted mb-1"
                    >
                      <span>
                        • {service.serviceName} (x{service.quantity || 1})
                      </span>
                      <span className="text-green-600">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(total)}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* Parts Details from ServiceReception */}
          {serviceReception?.requestedParts?.length > 0 && (
            <div className="mb-4 pb-3 border-b border-dark-200">
              <h4 className="text-sm font-semibold text-text-secondary mb-2">
                Phụ tùng:
              </h4>
              {serviceReception.requestedParts.map(
                (part: any, index: number) => {
                  const unitPrice =
                    (typeof part.partId === "object" &&
                      part.partId?.pricing?.retail) ||
                    part.estimatedCost ||
                    0;
                  const total = unitPrice * (part.quantity || 1);
                  return (
                    <div
                      key={index}
                      className="flex justify-between text-sm text-text-muted mb-1"
                    >
                      <span>
                        • {part.partName} (x{part.quantity || 1})
                      </span>
                      <span className="text-green-600">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(total)}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* External Parts - Parts ordered from outside */}
          {serviceReception?.externalParts?.length > 0 && (
            <div className="mb-4 pb-3 border-b border-amber-300 bg-amber-50 -mx-4 px-4 py-3">
              <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <span>🛒</span>
                Linh kiện đặt từ bên ngoài:
              </h4>
              {serviceReception.externalParts.map(
                (part: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between text-sm text-amber-900 mb-1"
                  >
                    <span>
                      • {part.partName} (x{part.quantity || 1})
                      {part.supplier?.name && (
                        <span className="text-xs text-amber-700 ml-1">
                          - {part.supplier.name}
                        </span>
                      )}
                    </span>
                    <span className="text-amber-600 font-semibold">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(part.totalPrice || 0)}
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          {/* Labor Cost */}
          {(serviceReception?.invoicing?.laborCost || 0) > 0 && (
            <div className="mb-4 pb-3 border-b border-dark-200">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Chi phí nhân công:</span>
                <span className="text-green-600 font-semibold">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(serviceReception.invoicing.laborCost || 0)}
                </span>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Tiền cọc đã trả:</span>
              <span className="font-semibold text-green-600">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(calculateTotals().depositAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Tổng tiền dịch vụ:</span>
              <span className="font-semibold text-green-600">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(calculateTotals().totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-text-muted italic">
              <span>• Đã bao gồm 10% VAT</span>
            </div>
            <div className="pt-2 border-t border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-red-600">
                  Số tiền cần trả thêm:
                </span>
                <span className="text-xl font-bold text-red-600">
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(calculateTotals().remainingAmount)}
                </span>
              </div>
            </div>
            <div className="pt-2">
              <span className="text-text-secondary">Phiếu tiếp nhận:</span>
              <span className="ml-2 font-semibold text-green-600">
                #{serviceReception?.receptionNumber}
              </span>
              {appointment?.appointmentNumber && (
                <>
                  <span className="text-text-secondary ml-4">Lịch hẹn:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    #{appointment.appointmentNumber}
                  </span>
                </>
              )}
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
                Số tiền được tính tự động từ phiếu tiếp nhận
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
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dark-300 border-dashed rounded-md hover:border-dark-400 transition-colors">
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

export default ReceptionPaymentModal;
