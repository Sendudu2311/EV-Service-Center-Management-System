import React, { useState, useEffect } from "react";
import { XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import {
  appointmentsAPI,
  vehiclesAPI,
  techniciansAPI,
  vnpayAPI,
  slotsAPI,
} from "../../services/api";
import toast from "react-hot-toast";
import TechnicianSelection from "./TechnicianSelection";
import { utcToVietnameseDateTime } from "../../utils/timezone";

interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
}

interface AppointmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// Constant for selected services to prevent re-creation on every render
const SELECTED_SERVICES = [{ serviceId: "BOOK001", category: "general" }];

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [reservedSlotId, setReservedSlotId] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState<"input" | "confirmation">(
    "input"
  );
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [pendingAppointment, setPendingAppointment] = useState<any>(null);

  const [formData, setFormData] = useState({
    vehicleId: "",
    services: ["BOOK001"],
    scheduledDate: "",
    scheduledTime: "",
    customerNotes: "",
    priority: "normal",
    technicianId: null as string | null,
  });

  useEffect(() => {
    fetchVehicles();
    fetchTechnicians();
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

        setSlots(slotData as any[]);
      } catch (err) {
        console.error("Error fetching slots:", err);
        setSlots([]);
      }
    };

    fetchSlots();
  }, [formData.scheduledDate, paymentVerified]);

  useEffect(() => {
    const paymentVerifiedStr = localStorage.getItem("paymentVerified");
    const pendingDataStr = localStorage.getItem("pendingAppointment");

    if (paymentVerifiedStr && pendingDataStr) {
      const paymentData = JSON.parse(paymentVerifiedStr);
      const appointment = JSON.parse(pendingDataStr);

      setFormData({
        vehicleId: appointment.vehicleId || "",
        services: appointment.services?.map((s: any) =>
          typeof s === "string" ? s : s.serviceId
        ) || ["BOOK001"],
        scheduledDate: appointment.scheduledDate || "",
        scheduledTime: appointment.scheduledTime || "",
        customerNotes: appointment.customerNotes || "",
        priority: appointment.priority || "normal",
        technicianId: appointment.technicianId || null,
      });

      if (appointment.selectedSlotId) {
        setSelectedSlotId(appointment.selectedSlotId);
      }

      setPendingAppointment({
        ...appointment,
        paymentInfo: paymentData,
      });

      setPaymentVerified(true);
      setCurrentStep("confirmation");

      localStorage.removeItem("pendingAppointment");
      localStorage.removeItem("paymentVerified");

      toast.success(
        "Payment verified! Please complete your appointment booking."
      );
    }
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await vehiclesAPI.getAll();
      const vehicleData = response.data?.data || response.data || [];
      setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to load vehicles");
      setVehicles([]);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await techniciansAPI.getAll();
      const techniciansData = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];

      const mappedTechnicians = techniciansData.map((tech: any) => {
        return {
          _id: tech._id,
          firstName: tech.firstName,
          lastName: tech.lastName,
          specialization: tech.specializations || tech.specialization || [],
        };
      });

      setTechnicians(mappedTechnicians);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      setTechnicians([]);
    }
  };

  const handleSlotSelect = (slotId: string) => {
    if (paymentVerified) return;

    const slot = slots.find((s) => s._id === slotId);
    if (
      slot &&
      (slot.status === "available" || slot.status === "partially_booked")
    ) {
      setSelectedSlotId(slotId);
      const vietnameseTime = utcToVietnameseDateTime(new Date(slot.start));
      setFormData((prev) => ({
        ...prev,
        scheduledTime: vietnameseTime.time,
      }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "scheduledDate" && { technicianId: null }),
    }));
  };

  const handleTechnicianSelect = (technicianId: string | null) => {
    setFormData((prev) => ({ ...prev, technicianId }));
  };

  const calculateTotalAmount = () => {
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
        services: [{ serviceId: "BOOK001", quantity: 1 }],
        ...(formData.technicianId && { technicianId: formData.technicianId }),
      };

      const paymentData = {
        amount: totalAmount,
        language: "vn",
        orderInfo: "Thanh toan dich vu dat lich kiem tra",
        appointmentData,
      };

      if (selectedSlotId && !reservedSlotId) {
        try {
          const r = await slotsAPI.reserve(selectedSlotId);
          setReservedSlotId(r.data?.data?._id || selectedSlotId);
        } catch (reserveErr: any) {
          toast.error(reserveErr.response?.data?.message || "Slot unavailable");
          setLoading(false);
          return;
        }
      }

      const response = await vnpayAPI.createPayment(paymentData);

      if ((response.data as any)?.paymentUrl) {
        const dataToStore = {
          ...formData,
          selectedSlotId,
          services: [{ serviceId: "BOOK001", quantity: 1 }],
          ...(formData.technicianId && { technicianId: formData.technicianId }),
          paymentInfo: {
            transactionRef: (response.data as any).transactionRef || "",
            amount: totalAmount,
            method: "vnpay",
          },
          // Add appointment ID tracking for payment process
          appointmentId: null, // Will be set after appointment creation
        };

        localStorage.setItem("pendingAppointment", JSON.stringify(dataToStore));
        window.location.href = (response.data as any).paymentUrl;
      } else {
        throw new Error("Failed to create payment URL");
      }
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast.error(error.response?.data?.message || "Failed to create payment");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicleId || !formData.scheduledDate || !selectedSlotId) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (paymentVerified) {
      await handleDirectBooking();
      return;
    }

    setCurrentStep("confirmation");
  };

  const handleBackToInput = () => {
    setCurrentStep("input");
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
        } catch (reserveErr: any) {
          toast.error(reserveErr.response?.data?.message || "Slot unavailable");
          setLoading(false);
          return;
        }
      }

      const appointmentData = {
        ...formData,
        services: [{ serviceId: "BOOK001", quantity: 1 }],
        ...(formData.technicianId && { technicianId: formData.technicianId }),
        ...(paymentVerified &&
          pendingAppointment?.paymentInfo && {
            paymentInfo: pendingAppointment.paymentInfo,
          }),
        ...(selectedSlotId && {
          slotId: selectedSlotId,
          skipSlotReservation: !!reservedSlotId,
        }),
      };

      const response = await appointmentsAPI.create(appointmentData);
      setReservedSlotId(null);

      // Log appointment ID for debugging
      const appointmentId = response.data?.data?._id;
      const appointmentNumber = response.data?.data?.appointmentNumber;

      console.log("✅ [AppointmentForm] Appointment created successfully:", {
        appointmentId,
        appointmentNumber,
        response: response.data,
      });

      // Update pending appointment with actual appointment ID
      if (paymentVerified && pendingAppointment) {
        const updatedPendingAppointment = {
          ...pendingAppointment,
          appointmentId: appointmentId,
          appointmentNumber: appointmentNumber,
        };
        setPendingAppointment(updatedPendingAppointment);
        localStorage.setItem(
          "pendingAppointment",
          JSON.stringify(updatedPendingAppointment)
        );

        // Also update the VNPay transaction record with appointment ID
        if (pendingAppointment.paymentInfo?.transactionRef) {
          try {
            await vnpayAPI.updateTransactionAppointmentId({
              transactionRef: pendingAppointment.paymentInfo.transactionRef,
              appointmentId: appointmentId,
            });
          } catch (updateErr) {
            console.error(
              "Failed to update VNPay transaction with appointment ID:",
              updateErr
            );
          }
        }
      }

      if (paymentVerified && pendingAppointment?.paymentInfo) {
        try {
          await vnpayAPI.verifyAppointmentPayment({
            transactionRef: pendingAppointment.paymentInfo.transactionRef,
          });
        } catch (verifyError) {
          console.error("Failed to send notifications:", verifyError);
        }
      }

      toast.success("Appointment booked successfully!");
      localStorage.removeItem("pendingAppointment");
      localStorage.removeItem("paymentVerified");
      onSuccess();
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast.error(
        error.response?.data?.message || "Failed to book appointment"
      );

      if (reservedSlotId) {
        try {
          await slotsAPI.release(reservedSlotId);
        } catch (releaseErr) {
          console.error("Failed to release slot:", releaseErr);
        }
        setReservedSlotId(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v._id === formData.vehicleId);
  const selectedSlot = slots.find((s) => s._id === selectedSlotId);
  const selectedTechnician = technicians.find(
    (t) => t._id === formData.technicianId
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Modern & Elegant */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-2">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {currentStep === "input"
                    ? "Đặt lịch hẹn mới"
                    : "Xác nhận thông tin"}
                </h3>
                <p className="text-blue-100 text-sm mt-0.5">
                  {currentStep === "input"
                    ? "Chọn thông tin dịch vụ và thời gian"
                    : "Kiểm tra và hoàn tất đặt lịch"}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all duration-200"
              aria-label="Đóng"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Step Progress */}
          <div className="flex items-center justify-center mt-5 space-x-3">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  currentStep === "input"
                    ? "bg-white text-blue-600 shadow-lg scale-110"
                    : "bg-white text-blue-600"
                }`}
              >
                {currentStep === "input" ? (
                  "1"
                ) : (
                  <CheckIcon className="w-5 h-5" />
                )}
              </div>
              <span className="ml-2 text-white font-medium text-sm">
                Thông tin
              </span>
            </div>
            <div className="w-20 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
              <div
                className={`h-full bg-white transition-all duration-500 ${
                  currentStep === "confirmation" ? "w-full" : "w-0"
                }`}
              ></div>
            </div>
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  currentStep === "confirmation"
                    ? "bg-white text-blue-600 shadow-lg scale-110"
                    : "bg-white bg-opacity-30 text-white"
                }`}
              >
                2
              </div>
              <span
                className={`ml-2 font-medium text-sm transition-colors ${
                  currentStep === "confirmation"
                    ? "text-white"
                    : "text-blue-100"
                }`}
              >
                Xác nhận
              </span>
            </div>
          </div>
        </div>

        {/* Content - Scrollable with better spacing */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentStep === "input" ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Vehicle & Date Section */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  Thông tin cơ bản
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chọn phương tiện <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="vehicleId"
                      value={formData.vehicleId}
                      onChange={handleChange}
                      required
                      disabled={paymentVerified}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed py-2.5 px-4"
                    >
                      <option value="">Chọn xe của bạn</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle._id} value={vehicle._id}>
                          {vehicle.make} {vehicle.model} ({vehicle.year})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày hẹn <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="scheduledDate"
                      value={formData.scheduledDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split("T")[0]}
                      required
                      disabled={paymentVerified}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed py-2.5 px-4"
                    />
                  </div>
                </div>
              </div>

              {/* Time Slots Section */}
              {formData.scheduledDate && slots.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-5">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Chọn khung giờ <span className="text-red-500 ml-1">*</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
                          onClick={() => handleSlotSelect(slot._id)}
                          disabled={!isAvailable || paymentVerified}
                          className={`p-4 rounded-lg border-2 font-medium transition-all duration-200 transform hover:scale-105 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                              : isAvailable
                              ? "border-gray-200 hover:border-blue-300 bg-white text-gray-700 hover:shadow-sm"
                              : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                          }`}
                        >
                          <div className="text-base font-bold">
                            {vietnameseTime.time}
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              isSelected ? "text-blue-600" : "text-gray-500"
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
                </div>
              )}

              {formData.scheduledDate &&
                formData.services.length > 0 &&
                slots.length === 0 && (
                  <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4">
                    <div className="flex">
                      <svg
                        className="w-5 h-5 text-amber-400 mr-3 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-sm text-amber-800">
                        Không có khung giờ khả dụng cho ngày này. Vui lòng chọn
                        ngày khác.
                      </p>
                    </div>
                  </div>
                )}

              {/* Service Info Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg
                        className="w-6 h-6 text-white"
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
                    <div>
                      <span className="text-sm text-gray-600 block">
                        Dịch vụ
                      </span>
                      <span className="text-base font-semibold text-gray-900">
                        Đặt lịch kiểm tra
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600 block">
                      Tổng chi phí
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(200000)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technician Selection */}
              {formData.scheduledDate && formData.scheduledTime && (
                <div className="bg-gray-50 rounded-xl p-5">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Chọn kỹ thuật viên
                  </h4>
                  <TechnicianSelection
                    selectedServices={SELECTED_SERVICES}
                    selectedTechnicianId={formData.technicianId}
                    onTechnicianSelect={handleTechnicianSelect}
                    disabled={loading || paymentVerified}
                    appointmentDate={formData.scheduledDate}
                    appointmentTime={formData.scheduledTime}
                    selectedSlotId={selectedSlotId}
                    estimatedDuration={60}
                  />
                </div>
              )}

              {(!formData.scheduledDate || !formData.scheduledTime) && (
                <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4">
                  <div className="flex">
                    <svg
                      className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-blue-700">
                      Vui lòng chọn ngày và khung giờ để xem danh sách kỹ thuật
                      viên khả dụng
                    </p>
                  </div>
                </div>
              )}

              {/* Customer Notes */}
              <div className="bg-gray-50 rounded-xl p-5">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Ghi chú thêm (tùy chọn)
                </label>
                <textarea
                  name="customerNotes"
                  value={formData.customerNotes}
                  onChange={handleChange}
                  rows={3}
                  disabled={paymentVerified}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed p-3"
                  placeholder="Nhập thông tin chi tiết về yêu cầu của bạn..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={
                    !formData.vehicleId ||
                    !formData.scheduledDate ||
                    !selectedSlotId ||
                    loading
                  }
                  className="px-8 py-3 border-2 border-transparent rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
                    "Tiếp tục →"
                  )}
                </button>
              </div>
            </form>
          ) : (
            // Step 2: Confirmation View
            <div className="space-y-6">
              {/* Confirmation Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Chi tiết đặt lịch
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 text-gray-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      <h5 className="text-sm font-medium text-gray-500">
                        Thông tin xe
                      </h5>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mb-1">
                      {selectedVehicle?.make} {selectedVehicle?.model}
                    </p>
                    <p className="text-sm text-gray-600">
                      Năm: {selectedVehicle?.year}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      VIN: {selectedVehicle?.vin}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 text-gray-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                      </svg>
                      <h5 className="text-sm font-medium text-gray-500">
                        Dịch vụ
                      </h5>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      Đặt lịch kiểm tra
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Thời gian ước tính: 60 phút
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 text-gray-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <h5 className="text-sm font-medium text-gray-500">
                        Ngày hẹn
                      </h5>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(formData.scheduledDate).toLocaleDateString(
                        "vi-VN",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 text-gray-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <h5 className="text-sm font-medium text-gray-500">
                        Khung giờ
                      </h5>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedSlot &&
                        utcToVietnameseDateTime(new Date(selectedSlot.start))
                          .time}
                    </p>
                  </div>
                </div>

                {selectedTechnician && (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 text-gray-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <h5 className="text-sm font-medium text-gray-500">
                        Kỹ thuật viên
                      </h5>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedTechnician.firstName}{" "}
                      {selectedTechnician.lastName}
                    </p>
                  </div>
                )}

                {formData.customerNotes && (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 text-gray-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                        />
                      </svg>
                      <h5 className="text-sm font-medium text-gray-500">
                        Ghi chú
                      </h5>
                    </div>
                    <p className="text-base text-gray-700 leading-relaxed">
                      {formData.customerNotes}
                    </p>
                  </div>
                )}

                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-7 h-7 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-blue-100">Tổng thanh toán</p>
                        <p className="text-3xl font-bold text-white">
                          {calculateTotalAmount().toLocaleString("vi-VN")} ₫
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              {paymentVerified && pendingAppointment?.paymentInfo && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <CheckIcon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-green-800">
                        Thanh toán thành công!
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Mã giao dịch:{" "}
                        <span className="font-mono font-semibold">
                          {pendingAppointment.paymentInfo.transactionRef}
                        </span>
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Vui lòng nhấn "Hoàn tất đặt lịch" để xác nhận cuộc hẹn
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleBackToInput}
                  disabled={loading || paymentVerified}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  ← Quay lại
                </button>
                <div className="flex space-x-3">
                  {paymentVerified ? (
                    <button
                      type="button"
                      onClick={handleDirectBooking}
                      disabled={loading}
                      className="px-8 py-3 border-2 border-transparent rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
                        <span className="flex items-center">
                          <CheckIcon className="w-5 h-5 mr-2" />
                          Hoàn tất đặt lịch
                        </span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreatePayment}
                      disabled={loading}
                      className="px-8 py-3 border-2 border-transparent rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
                        <span className="flex items-center">
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                          </svg>
                          Thanh toán ngay
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentForm;
