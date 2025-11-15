import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { slotsAPI, appointmentsAPI } from "../../services/api";
import toast from "react-hot-toast";
import { utcToVietnameseDateTime } from "../../utils/timezone";

interface Slot {
  _id: string;
  start: string;
  end: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status: string;
  capacity: number;
  bookedCount: number;
  technicianIds?: string[];
}

interface PreBookedAppointment {
  _id: string;
  appointmentNumber: string;
  customerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  vehicleId: {
    _id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
  };
  preBookingDetails: {
    requestedDate: string;
    requestedTimeRange: "morning" | "afternoon" | "evening";
  };
  status: string;
}

interface AssignSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: PreBookedAppointment | null;
  onSuccess: () => void;
}

const TIME_RANGE_MAP = {
  morning: { label: "Buổi sáng", hours: "8:00 - 12:00", icon: "🌅" },
  afternoon: { label: "Buổi chiều", hours: "13:00 - 17:00", icon: "☀️" },
  evening: { label: "Buổi tối", hours: "17:00 - 20:00", icon: "🌆" },
};

const AssignSlotModal: React.FC<AssignSlotModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(false);

  useEffect(() => {
    if (isOpen && appointment) {
      fetchAvailableSlots();
    }
  }, [isOpen, appointment]);

  const fetchAvailableSlots = async () => {
    if (!appointment) return;

    setFetchingSlots(true);
    try {
      // Format date to YYYY-MM-DD (backend expects string format)
      const rawDate = appointment.preBookingDetails.requestedDate;
      const requestedDate = new Date(rawDate).toISOString().split("T")[0];

      console.log("[AssignSlotModal] Fetching slots for:", {
        rawDate,
        formattedDate: requestedDate,
        timeRange: appointment.preBookingDetails.requestedTimeRange,
      });

      const response = await slotsAPI.list({
        from: requestedDate,
        to: requestedDate,
      });

      console.log("[AssignSlotModal] API Response:", response.data);

      let slotData: unknown[] = [];
      const responseData = response.data as unknown as {
        data?: { data?: unknown[] };
        [key: string]: unknown;
      };
      if (responseData?.data?.data && Array.isArray(responseData.data.data)) {
        slotData = responseData.data.data;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        slotData = responseData.data;
      } else if (Array.isArray(responseData)) {
        slotData = responseData;
      }

      console.log("[AssignSlotModal] Total slots from API:", slotData.length);

      // Filter slots based on requested time range
      const requestedTimeRange =
        appointment.preBookingDetails.requestedTimeRange;
      const filteredSlots = (slotData as Slot[]).filter((slot) => {
        // Use startTime field which is already in Vietnam local time (HH:MM format)
        const startTime = (slot as any).startTime || "";
        if (!startTime) {
          console.log("[AssignSlotModal] Slot missing startTime:", slot);
          return false;
        }

        const hour = parseInt(startTime.split(":")[0], 10);

        if (requestedTimeRange === "morning") {
          return hour >= 8 && hour < 12;
        } else if (requestedTimeRange === "afternoon") {
          return hour >= 13 && hour < 17;
        } else if (requestedTimeRange === "evening") {
          return hour >= 17 && hour < 20;
        }
        return true;
      });

      console.log(
        "[AssignSlotModal] Filtered slots:",
        filteredSlots.length,
        "for time range:",
        requestedTimeRange
      );
      console.log(
        "[AssignSlotModal] Filtered slots detail:",
        filteredSlots.map((s) => ({
          id: s._id,
          startTime: (s as any).startTime,
          status: s.status,
          capacity: s.capacity,
          bookedCount: s.bookedCount,
        }))
      );

      setSlots(filteredSlots);
    } catch (error) {
      console.error("Error fetching slots:", error);
      toast.error("Không thể tải danh sách slot");
      setSlots([]);
    } finally {
      setFetchingSlots(false);
    }
  };

  const handleAssignSlot = async () => {
    if (!selectedSlotId || !appointment) {
      toast.error("Vui lòng chọn slot");
      return;
    }

    setLoading(true);
    try {
      const response = await appointmentsAPI.assignSlot(appointment._id, {
        slotId: selectedSlotId,
      });

      if (response.data?.success) {
        toast.success("Đã phân công slot thành công!");
        onSuccess();
        onClose();
      } else {
        throw new Error("Failed to assign slot");
      }
    } catch (error: unknown) {
      console.error("Error assigning slot:", error);
      const errorObj = error as { response?: { data?: { message?: string } } };
      toast.error(
        errorObj.response?.data?.message || "Không thể phân công slot"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const timeRangeInfo =
    TIME_RANGE_MAP[appointment.preBookingDetails.requestedTimeRange];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-dark-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl">
          {/* Header */}
          <div className="bg-dark-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                Phân công Slot cho Pre-booking
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {/* Appointment Info */}
            <div className="bg-dark-900 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-lime-400 mb-3">
                Thông tin lịch hẹn
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400">Mã lịch hẹn:</p>
                  <p className="text-white font-semibold">
                    #{appointment.appointmentNumber}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Khách hàng:</p>
                  <p className="text-white font-semibold">
                    {appointment.customerId.firstName}{" "}
                    {appointment.customerId.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Xe:</p>
                  <p className="text-white font-semibold">
                    {appointment.vehicleId.make} {appointment.vehicleId.model} (
                    {appointment.vehicleId.year})
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Biển số:</p>
                  <p className="text-white font-semibold">
                    {appointment.vehicleId.licensePlate}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Ngày yêu cầu:</p>
                  <p className="text-white font-semibold">
                    {new Date(
                      appointment.preBookingDetails.requestedDate
                    ).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Buổi mong muốn:</p>
                  <p className="text-white font-semibold flex items-center gap-2">
                    <span>{timeRangeInfo.icon}</span>
                    {timeRangeInfo.label} ({timeRangeInfo.hours})
                  </p>
                </div>
              </div>
            </div>

            {/* Slot Selection */}
            <div className="bg-dark-900 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-lime-400 mb-3">
                Chọn slot khả dụng
              </h4>

              {fetchingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <svg
                    className="animate-spin h-8 w-8 text-lime-600"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="ml-3 text-gray-400">Đang tải slots...</span>
                </div>
              ) : slots.length === 0 ? (
                <div className="bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-yellow-200 font-medium">
                        Chưa có slot nào cho buổi này
                      </p>
                      <p className="text-xs text-yellow-300 mt-1">
                        Vui lòng tạo slot mới trong Slot Manager trước khi phân
                        công.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {slots.map((slot) => {
                    const isSelected = selectedSlotId === slot._id;
                    const isAvailable =
                      slot.status === "available" ||
                      slot.status === "partially_booked";
                    const vietnameseTime = utcToVietnameseDateTime(
                      new Date(slot.start)
                    );
                    const availableSlots =
                      slot.capacity - (slot.bookedCount || 0);

                    return (
                      <button
                        key={slot._id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot._id)}
                        disabled={!isAvailable}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 transform hover:scale-105 ${
                          isSelected
                            ? "border-lime-600 bg-lime-600 text-dark-900 shadow-md font-semibold"
                            : isAvailable
                              ? "border-dark-700 hover:border-lime-400 bg-dark-800 text-white hover:shadow-sm"
                              : "border-dark-700 bg-dark-700 text-gray-500 cursor-not-allowed opacity-50"
                        }`}
                      >
                        <div className="text-base font-bold">
                          {vietnameseTime.time}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            isSelected ? "text-dark-900" : "text-gray-400"
                          }`}
                        >
                          {isAvailable
                            ? `${availableSlots} chỗ trống`
                            : "Đã đầy"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selection Info */}
            {selectedSlotId && (
              <div className="mt-4 bg-lime-900 bg-opacity-20 border border-lime-500 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-5 h-5 text-lime-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-lime-200">
                    Đã chọn slot{" "}
                    <span className="font-semibold">
                      {
                        utcToVietnameseDateTime(
                          new Date(
                            slots.find((s) => s._id === selectedSlotId)
                              ?.start || ""
                          )
                        ).time
                      }
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-dark-900 px-6 py-4 sm:flex sm:flex-row-reverse sm:gap-3">
            <button
              onClick={handleAssignSlot}
              disabled={!selectedSlotId || loading}
              className={`
                inline-flex w-full justify-center rounded-md px-4 py-2 text-sm font-semibold text-dark-900 shadow-sm sm:w-auto
                ${
                  selectedSlotId && !loading
                    ? "bg-lime-600 hover:bg-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                    : "cursor-not-allowed bg-gray-600 opacity-50"
                }
              `}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Đang xử lý...
                </span>
              ) : (
                "Xác nhận phân công"
              )}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-dark-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-dark-600 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignSlotModal;
