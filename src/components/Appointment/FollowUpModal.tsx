import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseParent?: () => void; // Callback to close parent AppointmentDetails modal
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
  onCloseParent,
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

    // Close both modals before navigating
    onClose();
    if (onCloseParent) {
      onCloseParent();
    }

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
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-dark-9000 bg-opacity-90 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-dark-300 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          {/* Header */}
          <div className="bg-dark-900 px-6 py-4 border-b border-dark-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    Đặt lịch hẹn Follow-up
                  </h3>
                  <p className="mt-1 text-sm text-text-muted">
                    Lịch hẹn gốc: <span className="text-purple-400 font-semibold">#{baseAppointment.appointmentNumber}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md text-text-muted hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 bg-dark-300">
            <p className="mb-4 text-sm text-text-muted">
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
                        ? "border-purple-500 bg-purple-900/20 shadow-lg shadow-purple-500/20"
                        : "border-dark-600 bg-dark-900 hover:border-dark-500 hover:bg-dark-800"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="followUpReason"
                    value={option.value}
                    checked={selectedReason === option.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 bg-dark-700 border-dark-600"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{option.icon}</span>
                      <p className={`font-medium ${selectedReason === option.value ? 'text-purple-100' : 'text-white'}`}>
                        {option.label}
                      </p>
                    </div>
                    <p className={`mt-1 text-sm ${selectedReason === option.value ? 'text-purple-300' : 'text-text-muted'}`}>
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Notes Input */}
            {selectedReason && (
              <div className="mt-6 animate-fade-in">
                <label className="block text-sm font-medium text-white mb-2">
                  Ghi chú bổ sung (tùy chọn)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-4 py-2 text-white placeholder-text-muted focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Mô tả chi tiết vấn đề hoặc yêu cầu của bạn..."
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-dark-900 px-6 py-4 sm:flex sm:flex-row-reverse sm:gap-3 border-t border-dark-600">
            <button
              onClick={handleContinue}
              disabled={!selectedReason}
              className={`
                inline-flex w-full justify-center rounded-md px-4 py-2.5 text-sm font-semibold shadow-sm sm:w-auto transition-all
                ${
                  selectedReason
                    ? "bg-purple-600 text-white hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-purple-500/30"
                    : "cursor-not-allowed bg-dark-600 text-text-muted opacity-50"
                }
              `}
            >
              📅 Tiếp tục đặt lịch
            </button>
            <button
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-dark-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-dark-500 focus:outline-none focus:ring-2 focus:ring-dark-400 sm:mt-0 sm:w-auto transition-all"
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
