import React, { useState, useEffect } from "react";
import { XMarkIcon, ClockIcon } from "@heroicons/react/24/outline";
import {
  appointmentsAPI,
  vehiclesAPI,
  techniciansAPI,
  vnpayAPI,
  slotsAPI,
} from "../../services/api";
import toast from "react-hot-toast";
import TechnicianSelection from "./TechnicianSelection";
import AppointmentConfirmation from "./AppointmentConfirmation";
import { utcToVietnameseDateTime } from "../../utils/timezone";

interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
}

// Service interface removed as we use fixed service

interface AppointmentFormCleanProps {
  onSuccess: () => void;
  onCancel: () => void;
  restorationData?: {
    formData?: {
      vehicleId: string;
      services: string[];
      scheduledDate: string;
      scheduledTime: string;
      customerNotes: string;
      priority: string;
      technicianId: string | null;
    };
    selectedSlotId?: string | null;
    reservedSlotId?: string | null;
    paymentInfo?: {
      transactionRef: string;
      amount: number;
      paymentDate: Date;
    };
    paymentVerified?: boolean;
  };
}

const AppointmentFormClean: React.FC<AppointmentFormCleanProps> = ({
  onSuccess,
  onCancel,
  restorationData,
}) => {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [slots, setSlots] = useState<
    Array<{
      _id: string;
      start: string;
      startTime: string; // Giả sử API trả về trường này (HH:MM)
      end: string;
      status: string;
      capacity: number;
      bookedCount: number;
      technicianIds?: Array<{ firstName: string; lastName: string } | string>;
      canBook?: boolean;
    }>
  >([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    restorationData?.selectedSlotId || null
  );
  const [reservedSlotId, setReservedSlotId] = useState<string | null>(
    restorationData?.reservedSlotId || null
  );
  // Services are now fixed, no need for state
  const [technicians, setTechnicians] = useState<
    Array<{
      _id: string;
      firstName: string;
      lastName: string;
      specialization: string[];
    }>
  >([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentVerified] = useState(restorationData?.paymentVerified || false);
  const [pendingAppointment, setPendingAppointment] = useState<{
    paymentInfo?: {
      transactionRef: string;
      amount: number;
      method: string;
    };
  } | null>(
    restorationData?.paymentInfo
      ? { paymentInfo: { ...restorationData.paymentInfo, method: "vnpay" } }
      : null
  );
  // Bank selection removed for simplified form

  const [formData, setFormData] = useState({
    vehicleId: restorationData?.formData?.vehicleId || "",
    services: ["MAINT001"], // Auto-select Basic Maintenance Service
    scheduledDate: restorationData?.formData?.scheduledDate || "",
    scheduledTime: restorationData?.formData?.scheduledTime || "",
    customerNotes: restorationData?.formData?.customerNotes || "",
    priority: "normal", // Fixed priority
    technicianId:
      restorationData?.formData?.technicianId || (null as string | null),
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [vehiclesRes, techniciansRes] = await Promise.all([
          vehiclesAPI.getAll(),
          techniciansAPI.getAll(),
        ]);

        setVehicles(
          Array.isArray(vehiclesRes.data?.data)
            ? vehiclesRes.data.data
            : Array.isArray(vehiclesRes.data)
            ? vehiclesRes.data
            : []
        );
        const techniciansData = Array.isArray(techniciansRes.data?.data)
          ? techniciansRes.data.data
          : Array.isArray(techniciansRes.data)
          ? techniciansRes.data
          : [];

        // Map specializations to specialization for compatibility
        const mappedTechnicians = techniciansData.map((tech: unknown) => {
          const t = tech as {
            _id: string;
            firstName: string;
            lastName: string;
            specializations?: string[];
            specialization?: string[];
            [key: string]: unknown;
          };
          return {
            _id: t._id,
            firstName: t.firstName,
            lastName: t.lastName,
            specialization: t.specializations || t.specialization || [],
          };
        });

        setTechnicians(mappedTechnicians);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast.error("Failed to load initial data");
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!formData.scheduledDate) {
      setSlots([]);
      if (!paymentVerified) {
        setSelectedSlotId(null);
        setFormData((prev) => ({ ...prev, scheduledTime: "" }));
      }
      return;
    }

    const fetchSlots = async () => {
      try {
        const response = await slotsAPI.list({
          from: formData.scheduledDate,
          to: formData.scheduledDate,
        });

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

        setSlots(slotData as typeof slots);
      } catch (err) {
        console.error("Error fetching slots:", err);
        setSlots([]);
      }
    };

    fetchSlots();
  }, [formData.scheduledDate, paymentVerified]);

  useEffect(() => {
    if (
      restorationData?.paymentVerified &&
      restorationData?.formData?.scheduledDate &&
      restorationData?.formData?.scheduledTime
    ) {
      setShowConfirmation(true);
    }
  }, [restorationData]);

  const handleSlotSelect = (slotId: string) => {
    if (paymentVerified) return;

    const slot = slots.find((s) => s._id === slotId);

    if (
      slot &&
      (slot.status === "available" || slot.status === "partially_booked")
    ) {
      setSelectedSlotId(slotId);

      // SỬA: Tự động set `scheduledTime` dựa trên startTime của slot.
      // Giả sử API trả về `startTime` là "HH:MM". Nếu không, ta cần tính toán từ `start`.
      const timeToSet =
        slot.startTime || new Date(slot.start).toTimeString().slice(0, 5);

      setFormData((prev) => ({
        ...prev,
        scheduledTime: timeToSet,
      }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    const updates: Record<string, string | null> = { [name]: value };
    if (["scheduledDate"].includes(name)) {
      // Reset technician when date changes
      updates.technicianId = null;
    }
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleTechnicianSelect = (technicianId: string | null) => {
    setFormData((prev) => ({
      ...prev,
      technicianId,
    }));
  };

  const calculateTotalAmount = () => {
    // Fixed price for Basic Maintenance Service
    return 200000;
  };

  const handleCreatePayment = async () => {
    const totalAmount = calculateTotalAmount();
    if (totalAmount <= 0) {
      toast.error("Invalid payment amount");
      return;
    }
    setLoading(true);
    try {
      const appointmentData = {
        ...formData,
        services: [{ serviceId: "MAINT001", quantity: 1 }], // Fixed service
        ...(formData.technicianId && { technicianId: formData.technicianId }),
      };
      const paymentData = {
        amount: totalAmount,
        bankCode: undefined, // Simplified - no bank selection
        language: "vn",
        orderInfo: `Thanh toan dich vu bao duong co ban - 200k`,
        appointmentData: appointmentData,
      };
      if (selectedSlotId && !reservedSlotId) {
        try {
          const r = await slotsAPI.reserve(selectedSlotId);
          setReservedSlotId(r.data?.data?._id || selectedSlotId);
        } catch (reserveErr: unknown) {
          const err = reserveErr as {
            response?: { data?: { message?: string } };
          };
          toast.error(
            err.response?.data?.message ||
              "Selected time slot is no longer available"
          );
          setLoading(false);
          return;
        }
      }
      const response = await vnpayAPI.createPayment(paymentData);
      if ((response.data as { paymentUrl?: string })?.paymentUrl) {
        const dataToStore = {
          ...formData,
          selectedSlotId,
          services: [{ serviceId: "MAINT001", quantity: 1 }], // Fixed service
          ...(formData.technicianId && { technicianId: formData.technicianId }),
          paymentInfo: {
            transactionRef:
              (response.data as { transactionRef?: string }).transactionRef ||
              "",
            amount: totalAmount,
            method: "vnpay",
          },
        };
        setPendingAppointment(dataToStore);
        localStorage.setItem("pendingAppointment", JSON.stringify(dataToStore));
        window.location.href =
          (response.data as { paymentUrl?: string }).paymentUrl || "";
      } else {
        throw new Error("Failed to create payment URL");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to create payment");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Service is auto-selected, no need to check
    if (paymentVerified) {
      await handleDirectBooking();
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmationConfirm = async () => {
    const totalAmount = calculateTotalAmount();
    if (paymentVerified) {
      setShowConfirmation(false);
      await handleDirectBooking();
    } else if (totalAmount > 0) {
      setShowConfirmation(false);
      setShowPayment(true);
    } else {
      setShowConfirmation(false);
      await handleDirectBooking();
    }
  };

  const handleConfirmationBack = () => {
    setShowConfirmation(false);
  };

  const handleDirectBooking = async () => {
    if (!formData.scheduledTime) {
      toast.error("Please select a time slot before booking.");
      return;
    }
    setLoading(true);
    try {
      if (selectedSlotId && !reservedSlotId) {
        try {
          const r = await slotsAPI.reserve(selectedSlotId);
          setReservedSlotId(r.data?.data?._id || selectedSlotId);
        } catch (reserveErr: unknown) {
          const err = reserveErr as {
            response?: { data?: { message?: string } };
          };
          toast.error(
            err.response?.data?.message ||
              "Selected time slot is no longer available"
          );
          setLoading(false);
          return;
        }
      }
      const appointmentData = {
        ...formData,
        services: [{ serviceId: "MAINT001", quantity: 1 }], // Fixed service
        ...(pendingAppointment?.paymentInfo && {
          paymentInfo: pendingAppointment.paymentInfo,
        }),
        ...(selectedSlotId && {
          slotId: selectedSlotId,
          skipSlotReservation: !!reservedSlotId,
        }),
      };
      await appointmentsAPI.create(appointmentData);
      setReservedSlotId(null);
      if (paymentVerified && pendingAppointment?.paymentInfo) {
        try {
          await vnpayAPI.verifyAppointmentPayment({
            transactionRef: pendingAppointment.paymentInfo.transactionRef,
          });
        } catch (verifyError) {
          console.error(
            "Failed to send post-payment notifications:",
            verifyError
          );
        }
      }
      toast.success("Appointment booked successfully!");
      localStorage.removeItem("pendingAppointment");
      localStorage.removeItem("paymentVerified");
      onSuccess();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to book appointment");
      if (reservedSlotId) {
        try {
          await slotsAPI.release(reservedSlotId);
        } catch (releaseErr) {
          console.error(
            "Failed to release slot after booking failure",
            releaseErr
          );
        }
        setReservedSlotId(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    {paymentVerified
                      ? "Appointment Details"
                      : "Book New Appointment"}
                  </h3>
                  {paymentVerified && (
                    <p className="text-sm text-gray-600 mt-1">
                      {" "}
                      Payment completed - reviewing your booking details{" "}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {showConfirmation ? (
                <AppointmentConfirmation
                  formData={formData}
                  vehicles={vehicles}
                  services={[
                    {
                      _id: "MAINT001",
                      name: "Basic Maintenance Service",
                      basePrice: 200000,
                      estimatedDuration: 60,
                      category: "general",
                      description: "Dịch vụ bảo dưỡng cơ bản",
                    },
                  ]}
                  technicians={technicians}
                  totalAmount={calculateTotalAmount()}
                  onConfirm={
                    paymentVerified
                      ? handleDirectBooking
                      : handleConfirmationConfirm
                  }
                  onBack={handleConfirmationBack}
                  loading={loading}
                  paymentVerified={paymentVerified}
                />
              ) : (
                <>
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="vehicleId"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Select Vehicle <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="vehicleId"
                        name="vehicleId"
                        required
                        value={formData.vehicleId}
                        onChange={handleChange}
                        disabled={paymentVerified}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                          paymentVerified
                            ? "bg-gray-100 cursor-not-allowed opacity-60"
                            : ""
                        }`}
                      >
                        <option value="">Select a vehicle</option>
                        {vehicles.map((vehicle) => (
                          <option key={vehicle._id} value={vehicle._id}>
                            {vehicle.make} {vehicle.model} {vehicle.year} -{" "}
                            {vehicle.vin}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label
                          htmlFor="scheduledDate"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="scheduledDate"
                          name="scheduledDate"
                          required
                          min={new Date().toISOString().split("T")[0]}
                          value={formData.scheduledDate}
                          onChange={handleChange}
                          disabled={paymentVerified}
                          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                            paymentVerified
                              ? "bg-gray-100 cursor-not-allowed opacity-60"
                              : ""
                          }`}
                        />
                      </div>
                    </div>

                    {formData.scheduledDate && slots.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Available Time Slots{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {slots.map((slot) => {
                            const isSelected = selectedSlotId === slot._id;
                            const isAvailable =
                              slot.status === "available" ||
                              slot.status === "partially_booked";
                            const technicianNames =
                              slot.technicianIds
                                ?.map(
                                  (
                                    tech:
                                      | { firstName: string; lastName: string }
                                      | string
                                  ) =>
                                    typeof tech === "object"
                                      ? `${tech.firstName} ${tech.lastName}`
                                      : tech
                                )
                                .join(", ") || "No technicians assigned";
                            return (
                              <div
                                key={slot._id}
                                onClick={() => handleSlotSelect(slot._id)}
                                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                                    : isAvailable
                                    ? "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                    : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                                } ${
                                  paymentVerified ? "cursor-not-allowed" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-sm font-medium text-gray-900">
                                    {(() => {
                                      const startTime = utcToVietnameseDateTime(
                                        new Date(slot.start)
                                      );
                                      const endTime = utcToVietnameseDateTime(
                                        new Date(slot.end)
                                      );
                                      return `${startTime.time} - ${endTime.time}`;
                                    })()}
                                  </div>
                                  <div
                                    className={`text-xs px-2 py-1 rounded-full ${
                                      slot.status === "available"
                                        ? "bg-green-100 text-green-800"
                                        : slot.status === "partially_booked"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {slot.status === "available"
                                      ? "Available"
                                      : slot.status === "partially_booked"
                                      ? "Limited"
                                      : "Full"}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-600 mb-1">
                                  Capacity:{" "}
                                  {slot.capacity - (slot.bookedCount || 0)}/
                                  {slot.capacity} spots
                                </div>
                                <div className="text-xs text-gray-500">
                                  Technicians: {technicianNames}
                                </div>
                                {isSelected && (
                                  <div className="mt-2 text-xs text-blue-600 font-medium">
                                    ✓ Selected
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {formData.scheduledDate &&
                      formData.services.length > 0 &&
                      slots.length === 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <ClockIcon className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-yellow-700">
                                No time slots are currently available for the
                                selected date. Please try a different date, or
                                contact the service center directly.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Auto-selected Basic Maintenance Service */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Dịch vụ bảo dưỡng
                      </label>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-2 h-2 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              Basic Maintenance Service
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Dịch vụ bảo dưỡng cơ bản cho xe điện - kiểm tra
                              tổng quát và bảo dưỡng định kỳ
                            </div>
                            <div className="text-sm font-semibold text-blue-600 mt-2">
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(200000)}{" "}
                              • 60 phút
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {formData.scheduledDate && formData.scheduledTime && (
                      <div>
                        <TechnicianSelection
                          selectedServices={[
                            { serviceId: "MAINT001", category: "general" },
                          ]}
                          selectedTechnicianId={formData.technicianId}
                          onTechnicianSelect={handleTechnicianSelect}
                          disabled={loading || paymentVerified}
                          appointmentDate={formData.scheduledDate}
                          appointmentTime={formData.scheduledTime}
                          selectedSlotId={selectedSlotId}
                          estimatedDuration={60} // Fixed duration for Basic Maintenance
                        />
                      </div>
                    )}

                    {(!formData.scheduledDate || !formData.scheduledTime) &&
                      slots.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <svg
                                className="h-5 w-5 text-blue-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-blue-700">
                                Vui lòng chọn ngày và giờ để xem kỹ thuật viên
                                có sẵn.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    <div>
                      <label
                        htmlFor="customerNotes"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Notes
                      </label>
                      <textarea
                        id="customerNotes"
                        name="customerNotes"
                        rows={3}
                        value={formData.customerNotes}
                        onChange={handleChange}
                        disabled={paymentVerified}
                        placeholder="Please describe any specific issues or requests..."
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                          paymentVerified
                            ? "bg-gray-100 cursor-not-allowed opacity-60"
                            : ""
                        }`}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              {!showPayment ? (
                <button
                  type="submit"
                  disabled={loading || !formData.scheduledTime}
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading
                    ? "Processing..."
                    : paymentVerified
                    ? "Confirm Booking"
                    : "Review & Continue"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCreatePayment}
                    disabled={loading}
                    className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:ml-3 sm:w-auto disabled:opacity-50"
                  >
                    {loading
                      ? "Processing..."
                      : `Pay ${new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(calculateTotalAmount())}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPayment(false)}
                    disabled={loading}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-400 sm:mt-0 sm:w-auto"
                  >
                    Back
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AppointmentFormClean;
