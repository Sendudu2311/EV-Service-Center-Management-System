import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseAppointment: {
    _id: string;
    appointmentNumber: string;
    vehicleId: string | { _id: string };
  };
}

const FOLLOW_UP_OPTIONS = [
  {
    value: "warranty_issue",
    label: "Vấn đề bảo hành",
    description: "Dịch vụ trước đó có vấn đề cần bảo hành",
    icon: "🛡️",
  },
  {
    value: "additional_service",
    label: "Dịch vụ bổ sung",
    description: "Muốn thực hiện thêm dịch vụ khác",
    icon: "➕",
  },
  {
    value: "periodic_maintenance",
    label: "Bảo dưỡng định kỳ",
    description: "Bảo dưỡng định kỳ theo lịch",
    icon: "🔧",
  },
  {
    value: "unsatisfied_result",
    label: "Không hài lòng kết quả",
    description: "Xe vẫn còn vấn đề sau khi sửa",
    icon: "⚠️",
  },
  {
    value: "other",
    label: "Lý do khác",
    description: "Lý do khác không nằm trong danh sách trên",
    icon: "📝",
  },
];

const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  baseAppointment,
}) => {
  const navigate = useNavigate();
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  if (!isOpen) return null;

  const handleContinue = () => {
    if (!selectedReason) {
      return;
    }

    // Extract vehicleId if it's an object
    const vehicleId =
      typeof baseAppointment.vehicleId === "string"
        ? baseAppointment.vehicleId
        : baseAppointment.vehicleId._id;

    // Navigate to appointments page with follow-up params and showForm flag
    navigate("/appointments", {
      state: {
        showForm: true,
        isFollowUp: true,
        baseAppointmentId: baseAppointment._id,
        baseAppointmentNumber: baseAppointment.appointmentNumber,
        followUpReason: selectedReason,
        followUpNotes: notes,
        vehicleId: vehicleId,
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-dark-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          {/* Header */}
          <div className="bg-dark-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                Đặt lịch hẹn Follow-up
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              Lịch hẹn gốc: <span className="text-lime-400">#{baseAppointment.appointmentNumber}</span>
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="mb-4 text-sm text-gray-300">
              Vui lòng chọn lý do bạn muốn đặt lịch hẹn follow-up:
            </p>

            {/* Reason Options */}
            <div className="space-y-3">
              {FOLLOW_UP_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex cursor-pointer items-start rounded-lg border-2 p-4 transition-all
                    ${
                      selectedReason === option.value
                        ? "border-lime-500 bg-lime-900/20"
                        : "border-dark-700 bg-dark-900 hover:border-gray-600"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="followUpReason"
                    value={option.value}
                    checked={selectedReason === option.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 h-4 w-4 text-lime-600 focus:ring-lime-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{option.icon}</span>
                      <p className="font-medium text-white">{option.label}</p>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Notes Input */}
            {selectedReason && (
              <div className="mt-6 animate-fade-in">
                <label className="block text-sm font-medium text-gray-300">
                  Ghi chú bổ sung (tùy chọn)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-dark-700 bg-dark-900 px-4 py-2 text-white placeholder-gray-500 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                  placeholder="Mô tả chi tiết vấn đề hoặc yêu cầu của bạn..."
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-dark-900 px-6 py-4 sm:flex sm:flex-row-reverse sm:gap-3">
            <button
              onClick={handleContinue}
              disabled={!selectedReason}
              className={`
                inline-flex w-full justify-center rounded-md px-4 py-2 text-sm font-semibold text-dark-900 shadow-sm sm:w-auto
                ${
                  selectedReason
                    ? "bg-lime-600 hover:bg-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                    : "cursor-not-allowed bg-gray-600 opacity-50"
                }
              `}
            >
              Tiếp tục đặt lịch
            </button>
            <button
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-dark-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-dark-600 sm:mt-0 sm:w-auto"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowUpModal;
