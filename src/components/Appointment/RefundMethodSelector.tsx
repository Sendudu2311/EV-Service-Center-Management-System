import React, { useState, useRef } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { uploadAPI } from "../../services/api";

interface CustomerBankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

interface RefundMethodSelectorProps {
  refundMethod: "cash" | "bank_transfer" | "";
  customerBankInfo: CustomerBankInfo;
  customerBankProofImage: string;
  onRefundMethodChange: (method: "cash" | "bank_transfer") => void;
  onBankInfoChange: (info: CustomerBankInfo) => void;
  onBankProofImageChange: (imageUrl: string) => void;
  disabled?: boolean;
}

const RefundMethodSelector: React.FC<RefundMethodSelectorProps> = ({
  refundMethod,
  customerBankInfo,
  customerBankProofImage,
  onRefundMethodChange,
  onBankInfoChange,
  onBankProofImageChange,
  disabled = false,
}) => {
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        `Bank proof image - ${file.name}`
      );

      onBankProofImageChange(response.data.imageUrl);
      toast.success("Upload ảnh thành công");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Lỗi upload ảnh. Vui lòng thử lại.");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    onBankProofImageChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBankInfoChange = (
    field: keyof CustomerBankInfo,
    value: string
  ) => {
    onBankInfoChange({
      ...customerBankInfo,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Refund Method Selection */}
      <div>
        <label className="block text-sm text-text-muted text-text-secondary mb-3">
          Phương thức hoàn tiền <span className="text-red-600">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label
            className={`relative flex cursor-pointer rounded-lg p-4 border-2 ${
              refundMethod === "cash"
                ? "border-blue-500 bg-dark-900"
                : "border-dark-200 bg-dark-300 hover:bg-dark-900"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="refundMethod"
              value="cash"
              checked={refundMethod === "cash"}
              onChange={(e) => onRefundMethodChange(e.target.value as "cash")}
              className="sr-only"
              disabled={disabled}
            />
            <div className="flex items-center">
              <span className="text-2xl mr-3">💵</span>
              <div>
                <div className="text-sm text-text-muted text-white">
                  Tiền mặt
                </div>
                <div className="text-xs text-text-muted">
                  Nhận tiền mặt tại trung tâm
                </div>
              </div>
            </div>
          </label>

          <label
            className={`relative flex cursor-pointer rounded-lg p-4 border-2 ${
              refundMethod === "bank_transfer"
                ? "border-blue-500 bg-dark-900"
                : "border-dark-200 bg-dark-300 hover:bg-dark-900"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="refundMethod"
              value="bank_transfer"
              checked={refundMethod === "bank_transfer"}
              onChange={(e) =>
                onRefundMethodChange(e.target.value as "bank_transfer")
              }
              className="sr-only"
              disabled={disabled}
            />
            <div className="flex items-center">
              <span className="text-2xl mr-3">🏦</span>
              <div>
                <div className="text-sm text-text-muted text-white">
                  Chuyển khoản
                </div>
                <div className="text-xs text-text-muted">
                  Chuyển khoản vào tài khoản
                </div>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Bank Transfer Information */}
      {refundMethod === "bank_transfer" && (
        <div className="space-y-4 p-4 bg-dark-900 rounded-lg">
          <h4 className="text-sm text-text-muted text-white">
            Thông tin tài khoản ngân hàng
          </h4>

          {/* Bank Name */}
          <div>
            <label className="block text-sm text-text-muted text-text-secondary mb-1">
              Tên ngân hàng <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={customerBankInfo.bankName}
              onChange={(e) => handleBankInfoChange("bankName", e.target.value)}
              className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
              placeholder="Ví dụ: Vietcombank, Techcombank..."
              disabled={disabled}
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm text-text-muted text-text-secondary mb-1">
              Số tài khoản <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={customerBankInfo.accountNumber}
              onChange={(e) =>
                handleBankInfoChange("accountNumber", e.target.value)
              }
              className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
              placeholder="Nhập số tài khoản"
              disabled={disabled}
            />
          </div>

          {/* Account Holder */}
          <div>
            <label className="block text-sm text-text-muted text-text-secondary mb-1">
              Tên chủ tài khoản <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={customerBankInfo.accountHolder}
              onChange={(e) =>
                handleBankInfoChange("accountHolder", e.target.value)
              }
              className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
              placeholder="Nhập tên chủ tài khoản"
              disabled={disabled}
            />
          </div>

          {/* Bank Proof Image Upload */}
          <div>
            <label className="block text-sm text-text-muted text-text-secondary mb-2">
              Ảnh chứng minh tài khoản <span className="text-red-600">*</span>
            </label>

            {customerBankProofImage ? (
              <div className="space-y-2">
                <div className="relative">
                  <img
                    src={customerBankProofImage}
                    alt="Bank proof"
                    className="w-full h-32 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    disabled={disabled}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-text-muted">
                  Ảnh đã upload thành công
                </p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-dark-300 rounded-lg p-6 text-center">
                <PhotoIcon className="mx-auto h-12 w-12 text-text-muted" />
                <div className="mt-4">
                  <label
                    htmlFor="bankProofImage"
                    className={`cursor-pointer inline-flex items-center px-4 py-2 border border-dark-200 rounded-md shadow-sm text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900 ${
                      disabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <PhotoIcon className="h-5 w-5 mr-2" />
                    {uploadingImage ? "Đang upload..." : "Chọn ảnh"}
                  </label>
                  <input
                    ref={fileInputRef}
                    id="bankProofImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={disabled || uploadingImage}
                  />
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  PNG, JPG tối đa 5MB
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Messages */}
      {refundMethod === "bank_transfer" && (
        <div className="text-xs text-text-secondary bg-dark-900 p-3 rounded-md">
          <p className="text-text-muted mb-1">Lưu ý:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Vui lòng cung cấp đầy đủ thông tin tài khoản ngân hàng</li>
            <li>Ảnh chứng minh có thể là screenshot tài khoản hoặc thẻ ATM</li>
            <li>Thông tin sẽ được sử dụng để chuyển khoản hoàn tiền</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default RefundMethodSelector;
