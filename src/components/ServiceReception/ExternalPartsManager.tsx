import React, { useState } from "react";
import { PlusIcon, TrashIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { formatVND } from "../../utils/vietnamese";

interface ExternalPart {
  _id?: string;
  partName: string;
  partNumber?: string;
  supplier?: {
    name: string;
    contact?: string;
    address?: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warranty?: {
    period: number;
    description?: string;
  };
  estimatedArrival?: string;
  notes?: string;
}

interface ExternalPartsManagerProps {
  technicianNote?: string; // Note from technician about external parts needed
  existingParts?: ExternalPart[];
  onChange: (parts: ExternalPart[]) => void;
}

const ExternalPartsManager: React.FC<ExternalPartsManagerProps> = ({
  technicianNote,
  existingParts = [],
  onChange,
}) => {
  const [parts, setParts] = useState<ExternalPart[]>(existingParts);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPart, setNewPart] = useState<ExternalPart>({
    partName: "",
    partNumber: "",
    supplier: { name: "", contact: "", address: "" },
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    warranty: { period: 0, description: "" },
    estimatedArrival: "",
    notes: "",
  });

  const handleAddPart = () => {
    if (!newPart.partName || newPart.unitPrice <= 0) {
      alert("Vui lòng nhập tên linh kiện và giá");
      return;
    }

    const partToAdd = {
      ...newPart,
      totalPrice: newPart.unitPrice * newPart.quantity,
    };

    const updatedParts = [...parts, partToAdd];
    setParts(updatedParts);
    onChange(updatedParts);

    // Reset form
    setNewPart({
      partName: "",
      partNumber: "",
      supplier: { name: "", contact: "", address: "" },
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      warranty: { period: 0, description: "" },
      estimatedArrival: "",
      notes: "",
    });
    setShowAddForm(false);
  };

  const handleRemovePart = (index: number) => {
    const updatedParts = parts.filter((_, i) => i !== index);
    setParts(updatedParts);
    onChange(updatedParts);
  };

  const calculateTotal = () => {
    return parts.reduce((sum, part) => sum + part.totalPrice, 0);
  };

  return (
    <div className="border border-amber-500 rounded-lg p-4 bg-amber-50">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBagIcon className="h-6 w-6 text-amber-600" />
        <h3 className="text-lg font-semibold text-amber-800">
          Linh kiện đặt từ bên ngoài
        </h3>
        <span className="ml-auto px-3 py-1 bg-amber-200 text-amber-800 text-xs font-medium rounded-full">
          ĐỂ XE LẠI
        </span>
      </div>

      {/* Technician Note */}
      {technicianNote && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-1">
            Ghi chú từ kỹ thuật viên:
          </p>
          <p className="text-sm text-blue-700">{technicianNote}</p>
        </div>
      )}

      {/* Existing External Parts List */}
      {parts.length > 0 && (
        <div className="mb-4 space-y-3">
          {parts.map((part, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">
                      {part.partName}
                    </h4>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">
                      External
                    </span>
                  </div>
                  {part.partNumber && (
                    <p className="text-sm text-gray-600">
                      Mã: {part.partNumber}
                    </p>
                  )}
                  {part.supplier?.name && (
                    <p className="text-sm text-gray-600">
                      Nhà cung cấp: {part.supplier.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRemovePart(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Số lượng:</span>
                  <span className="ml-2 font-medium">{part.quantity}</span>
                </div>
                <div>
                  <span className="text-gray-500">Đơn giá:</span>
                  <span className="ml-2 font-medium">
                    {formatVND(part.unitPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Tổng:</span>
                  <span className="ml-2 font-semibold text-amber-600">
                    {formatVND(part.totalPrice)}
                  </span>
                </div>
              </div>

              {part.warranty && part.warranty.period > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Bảo hành:</span> {part.warranty.period} tháng
                  {part.warranty.description && ` - ${part.warranty.description}`}
                </div>
              )}

              {part.estimatedArrival && (
                <div className="mt-1 text-sm text-gray-600">
                  <span className="font-medium">Dự kiến về:</span>{" "}
                  {new Date(part.estimatedArrival).toLocaleDateString("vi-VN")}
                </div>
              )}

              {part.notes && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Ghi chú:</span> {part.notes}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end items-center pt-3 border-t border-gray-200">
            <div className="text-right">
              <p className="text-sm text-gray-600">Tổng tiền linh kiện ngoài:</p>
              <p className="text-xl font-bold text-amber-600">
                {formatVND(calculateTotal())}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                (Chưa bao gồm VAT 10%)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add New Part Form */}
      {showAddForm ? (
        <div className="bg-white border border-gray-300 rounded-lg p-4 space-y-4">
          <h4 className="font-semibold text-gray-800 mb-3">
            Thêm linh kiện đặt ngoài
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên linh kiện *
              </label>
              <input
                type="text"
                value={newPart.partName}
                onChange={(e) =>
                  setNewPart({ ...newPart, partName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="Ví dụ: Pin lithium 72V 100Ah"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã linh kiện
              </label>
              <input
                type="text"
                value={newPart.partNumber}
                onChange={(e) =>
                  setNewPart({ ...newPart, partNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="BP-72100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số lượng *
              </label>
              <input
                type="number"
                min="1"
                value={newPart.quantity}
                onChange={(e) =>
                  setNewPart({
                    ...newPart,
                    quantity: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đơn giá (VND) *
              </label>
              <input
                type="number"
                min="0"
                value={newPart.unitPrice}
                onChange={(e) =>
                  setNewPart({
                    ...newPart,
                    unitPrice: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="15000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thành tiền
              </label>
              <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium">
                {formatVND(newPart.unitPrice * newPart.quantity)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nhà cung cấp
            </label>
            <input
              type="text"
              value={newPart.supplier?.name || ""}
              onChange={(e) =>
                setNewPart({
                  ...newPart,
                  supplier: { ...newPart.supplier, name: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Công ty TNHH Pin EV Việt Nam"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bảo hành (tháng)
              </label>
              <input
                type="number"
                min="0"
                value={newPart.warranty?.period || 0}
                onChange={(e) =>
                  setNewPart({
                    ...newPart,
                    warranty: {
                      ...newPart.warranty,
                      period: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="12"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dự kiến về hàng
              </label>
              <input
                type="date"
                value={newPart.estimatedArrival || ""}
                onChange={(e) =>
                  setNewPart({ ...newPart, estimatedArrival: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú
            </label>
            <textarea
              value={newPart.notes || ""}
              onChange={(e) =>
                setNewPart({ ...newPart, notes: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Ghi chú thêm về linh kiện..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              onClick={handleAddPart}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              Thêm linh kiện
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full px-4 py-3 border-2 border-dashed border-amber-400 rounded-lg text-amber-700 hover:bg-amber-100 flex items-center justify-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span className="font-medium">Thêm linh kiện đặt ngoài</span>
        </button>
      )}
    </div>
  );
};

export default ExternalPartsManager;
