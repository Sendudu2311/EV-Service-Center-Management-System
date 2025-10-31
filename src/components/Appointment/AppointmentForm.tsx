import React, { useState, useEffect } from "react";
import { XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import {
  vehiclesAPI,
  techniciansAPI,
  vnpayAPI,
  slotsAPI,
  appointmentsAPI,
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

interface Slot {
  _id: string;
  start: string;
  status: string;
  capacity: number;
  bookedCount?: number;
}

interface Technician {
  _id: string;
  firstName: string;
  lastName: string;
  specialization: string[];
}

interface PendingAppointment {
  vehicleId?: string;
  services?: unknown[];
  scheduledDate?: string;
  scheduledTime?: string;
  customerNotes?: string;
  priority?: string;
  technicianId?: string | null;
  selectedSlotId?: string;
  paymentInfo?: {
    transactionRef: string;
  };
  [key: string]: unknown;
}

interface AppointmentFormProps {
  onCancel: () => void;
}

// Constant for selected services to prevent re-creation on every render
const SELECTED_SERVICES = [{ serviceId: "BOOK001", category: "general" }];

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [checkingVehicle, setCheckingVehicle] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [reservedSlotId, setReservedSlotId] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianData, setSelectedTechnicianData] =
    useState<Technician | null>(null);
  const [currentStep, setCurrentStep] = useState<"input" | "confirmation">(
    "input"
  );
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [pendingAppointment, setPendingAppointment] =
    useState<PendingAppointment | null>(null);

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

  // Handle technician data restoration when technicians array is loaded
  useEffect(() => {
    if (
      formData.technicianId &&
      technicians.length > 0 &&
      !selectedTechnicianData
    ) {
      const foundTechnician = technicians.find(
        (t) => t._id === formData.technicianId
      );
      if (foundTechnician) {
        setSelectedTechnicianData(foundTechnician);
      }
    }
  }, [technicians, formData.technicianId, selectedTechnicianData]);

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

        setSlots(slotData as Slot[]);
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
      const appointment = JSON.parse(pendingDataStr) as PendingAppointment;

      setFormData({
        vehicleId: appointment.vehicleId || "",
        services: appointment.services?.map((s: unknown) =>
          typeof s === "string"
            ? s
            : ((s as Record<string, unknown>).serviceId as string)
        ) || ["BOOK001"],
        scheduledDate: appointment.scheduledDate || "",
        scheduledTime: appointment.scheduledTime || "",
        customerNotes: appointment.customerNotes || "",
        priority: appointment.priority || "normal",
        technicianId: appointment.technicianId || null,
      });

      // Restore technician data if available
      if (appointment.technicianId && technicians.length > 0) {
        const foundTechnician = technicians.find(
          (t) => t._id === appointment.technicianId
        );
        if (foundTechnician) {
          setSelectedTechnicianData(foundTechnician);
        } else {
          setSelectedTechnicianData({
            _id: appointment.technicianId,
            firstName: "Selected",
            lastName: "Technician",
            specialization: [],
          });
        }
      }

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
  }, [technicians]);

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

      const mappedTechnicians = techniciansData.map((tech: unknown) => {
        const techObj = tech as Record<string, unknown>;
        return {
          _id: techObj._id as string,
          firstName: techObj.firstName as string,
          lastName: techObj.lastName as string,
          specialization: (techObj.specializations ||
            techObj.specialization ||
            []) as string[],
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

    // Reset technician data when date changes
    if (name === "scheduledDate") {
      setSelectedTechnicianData(null);
    }
  };

  const handleTechnicianSelect = (
    technicianId: string | null,
    technicianData?: unknown
  ) => {
    setFormData((prev) => ({ ...prev, technicianId }));

    // Store selected technician data for display
    if (technicianId) {
      if (technicianData) {
        // Use technician data from TechnicianSelection
        // Convert TechnicianSelection format to AppointmentForm format
        const techData = technicianData as Record<string, unknown>;
        const convertedTechnician: Technician = {
          _id: techData.id as string,
          firstName: (techData.name as string)?.split(" ")[0] || "Selected",
          lastName:
            (techData.name as string)?.split(" ").slice(1).join(" ") ||
            "Technician",
          specialization: (techData.specializations as string[]) || [],
        };

        setSelectedTechnicianData(convertedTechnician);
      } else {
        // Try to find in technicians array first
        const foundTechnician = technicians.find((t) => t._id === technicianId);

        if (foundTechnician) {
          setSelectedTechnicianData(foundTechnician);
        } else {
          // Create a basic technician object for display
          const basicTechnician = {
            _id: technicianId,
            firstName: "Selected",
            lastName: "Technician",
            specialization: [],
          };
          setSelectedTechnicianData(basicTechnician);
        }
      }
    } else {
      setSelectedTechnicianData(null);
    }
  };

  const calculateTotalAmount = () => {
    return 200000;
  };

  const handleCreatePayment = async () => {
    const depositAmount = 200000; // Fixed deposit amount
    setLoading(true);

    try {
      // Reserve slot first (don't create appointment yet)
      if (selectedSlotId && !reservedSlotId) {
        try {
          const r = await slotsAPI.reserve(selectedSlotId);
          setReservedSlotId(r.data?.data?._id || selectedSlotId);
        } catch (reserveErr: unknown) {
          const error = reserveErr as {
            response?: { data?: { message?: string } };
          };
          toast.error(error.response?.data?.message || "Slot unavailable");
          setLoading(false);
          return;
        }
      }

      // Prepare appointment data for payment (not create yet)
      const appointmentData = {
        vehicleId: formData.vehicleId,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        customerNotes: formData.customerNotes,
        priority: formData.priority,
        technicianId: formData.technicianId,
        slotId: selectedSlotId,
        services: [], // Empty services for deposit booking
      };

      // Create payment for deposit (appointment will be created after payment success)
      const paymentData = {
        amount: depositAmount,
        language: "vn",
        orderInfo: `Dat coc 200,000 VND cho lich hen`,
        appointmentData: appointmentData, // Pass appointment data, not appointment ID
        paymentType: "appointment", // Changed from "deposit" to "appointment"
        depositAmount: depositAmount,
      };

      const response = await vnpayAPI.createPayment(paymentData);

      if ((response.data as unknown as Record<string, unknown>)?.paymentUrl) {
        // Store appointment data for payment result page (not appointment ID)
        localStorage.setItem(
          "pendingAppointment",
          JSON.stringify({
            ...appointmentData,
            selectedSlotId: selectedSlotId,
            reservedSlotId: reservedSlotId,
          })
        );

        window.location.href = (
          response.data as unknown as Record<string, unknown>
        ).paymentUrl as string;
      } else {
        throw new Error("Failed to create payment URL");
      }
    } catch (error: unknown) {
      console.error("Error creating payment:", error);
      const errorObj = error as { response?: { data?: { message?: string } } };
      toast.error(
        errorObj.response?.data?.message || "Failed to create payment"
      );
    } finally {
      setLoading(false);
    }
  };

  const checkVehicleBookingStatus = async (vehicleId: string) => {
    setCheckingVehicle(true);
    try {
      const response = await appointmentsAPI.checkVehicleBookingStatus(
        vehicleId
      );
      const data = response.data?.data;

      if (data?.hasPendingAppointments) {
        const pendingAppointments = data.pendingAppointments;
        const appointmentList = pendingAppointments
          .map(
            (apt: {
              appointmentNumber: string;
              scheduledDate: string;
              scheduledTime: string;
            }) =>
              `- ${apt.appointmentNumber} (${apt.scheduledDate} ${apt.scheduledTime})`
          )
          .join("\n");

        toast.error(
          `Xe ${data.vehicleInfo.make} ${data.vehicleInfo.model} đã có lịch hẹn đang chờ xử lý:\n${appointmentList}\n\nVui lòng hoàn thành hoặc hủy lịch hẹn hiện tại trước khi đặt lịch mới.`,
          { duration: 8000 }
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking vehicle booking status:", error);
      toast.error("Không thể kiểm tra trạng thái xe. Vui lòng thử lại.");
      return false;
    } finally {
      setCheckingVehicle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicleId || !formData.scheduledDate || !selectedSlotId) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    // Check vehicle booking status before proceeding
    const isVehicleAvailable = await checkVehicleBookingStatus(
      formData.vehicleId
    );
    if (!isVehicleAvailable) {
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
    // Direct booking is disabled - appointment is created in PaymentResult.tsx
    toast("Appointment is being processed. Please wait...", {
      icon: "⏳",
      duration: 3000,
    });
    return;
  };

  const selectedVehicle = vehicles.find((v) => v._id === formData.vehicleId);
  const selectedSlot = slots.find((s) => s._id === selectedSlotId);

  // Use selectedTechnicianData if available, otherwise fallback to technicians array
  const selectedTechnician =
    selectedTechnicianData ||
    technicians.find((t) => t._id === formData.technicianId) ||
    (formData.technicianId
      ? {
          _id: formData.technicianId,
          firstName: "Selected",
          lastName: "Technician",
          specialization: [],
        }
      : null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-dark-300 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Modern & Elegant */}
        <div className="bg-dark-900 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-dark-300 bg-opacity-20 rounded-lg p-2">
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
                <p className="text-text-secondary text-sm mt-0.5">
                  {currentStep === "input"
                    ? "Chọn thông tin dịch vụ và thời gian"
                    : "Kiểm tra và hoàn tất đặt lịch"}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:bg-dark-300 hover:bg-opacity-20 rounded-lg p-2 transition-all duration-200"
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
                    ? "bg-dark-300 text-lime-600 shadow-lg scale-110"
                    : "bg-dark-300 text-lime-600"
                }`}
              >
                {currentStep === "input" ? (
                  "1"
                ) : (
                  <CheckIcon className="w-5 h-5" />
                )}
              </div>
              <span className="ml-2 text-white text-text-muted text-sm">
                Thông tin
              </span>
            </div>
            <div className="w-20 h-1 bg-dark-300 bg-opacity-30 rounded-full overflow-hidden">
              <div
                className={`h-full bg-dark-300 transition-all duration-500 ${
                  currentStep === "confirmation" ? "w-full" : "w-0"
                }`}
              ></div>
            </div>
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  currentStep === "confirmation"
                    ? "bg-dark-300 text-lime-600 shadow-lg scale-110"
                    : "bg-dark-300 bg-opacity-30 text-white"
                }`}
              >
                2
              </div>
              <span
                className={`ml-2 text-text-muted text-sm transition-colors ${
                  currentStep === "confirmation"
                    ? "text-white"
                    : "text-text-secondary"
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
              <div className="bg-dark-900 rounded-xl p-5 space-y-4">
                <h4 className="font-semibold text-white flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-lime-600"
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
                    <label className="block text-sm text-text-muted text-text-secondary mb-2">
                      Chọn phương tiện <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="vehicleId"
                      value={formData.vehicleId}
                      onChange={handleChange}
                      required
                      disabled={paymentVerified}
                      className="w-full rounded-lg bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-2 focus:ring-lime-400 focus:ring-opacity-50 transition-all duration-200 disabled:bg-dark-100 disabled:cursor-not-allowed py-2.5 px-4"
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
                    <label className="block text-sm text-text-muted text-text-secondary mb-2">
                      Ngày hẹn <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      name="scheduledDate"
                      value={formData.scheduledDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split("T")[0]}
                      required
                      disabled={paymentVerified}
                      className="w-full rounded-lg bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-2 focus:ring-lime-400 focus:ring-opacity-50 transition-all duration-200 disabled:bg-dark-100 disabled:cursor-not-allowed py-2.5 px-4"
                    />
                  </div>
                </div>
              </div>

              {/* Time Slots Section */}
              {formData.scheduledDate && slots.length > 0 && (
                <div className="bg-dark-900 rounded-xl p-5">
                  <h4 className="font-semibold text-white mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-lime-600"
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
                    Chọn khung giờ <span className="text-red-600 ml-1">*</span>
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
                          className={`p-4 rounded-lg border-2 text-text-muted transition-all duration-200 transform hover:scale-105 ${
                            isSelected
                              ? "border-lime-600 bg-lime-600 text-dark-900 shadow-md font-semibold hover:bg-dark-9000"
                              : isAvailable
                              ? "border-dark-200 hover:border-blue-300 bg-dark-300 text-text-secondary hover:shadow-sm"
                              : "border-dark-200 bg-dark-100 text-text-muted cursor-not-allowed opacity-60"
                          }`}
                        >
                          <div className="text-base font-bold">
                            {vietnameseTime.time}
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              isSelected ? "text-dark-900" : "text-text-muted"
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
                  <div className="bg-dark-300 border-l-4 border-blue-400 rounded-lg p-4">
                    <div className="flex">
                      <svg
                        className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-sm text-text-secondary">
                        Không có khung giờ khả dụng cho ngày này. Vui lòng chọn
                        ngày khác.
                      </p>
                    </div>
                  </div>
                )}

              {/* Service Info Card */}
              <div className="bg-dark-900 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-dark-9000 rounded-xl flex items-center justify-center shadow-lg">
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
                      <span className="text-sm text-text-secondary block">
                        Dịch vụ
                      </span>
                      <span className="text-base font-semibold text-white">
                        Đặt lịch kiểm tra
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-text-secondary block">
                      Tổng chi phí
                    </span>
                    <span className="text-2xl font-bold text-lime-600">
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
                <div className="bg-dark-900 rounded-xl p-5">
                  <h4 className="font-semibold text-white mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-lime-600"
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
                <div className="bg-dark-300 border-l-4 border-blue-400 rounded-lg p-4">
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
                    <p className="text-sm text-text-secondary">
                      Vui lòng chọn ngày và khung giờ để xem danh sách kỹ thuật
                      viên khả dụng
                    </p>
                  </div>
                </div>
              )}

              {/* Customer Notes */}
              <div className="bg-dark-900 rounded-xl p-5">
                <label className="text-sm text-text-muted text-text-secondary mb-2 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-lime-600"
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
                  className="block w-full rounded-lg bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-2 focus:ring-lime-400 focus:ring-opacity-50 transition-all duration-200 disabled:bg-dark-100 disabled:cursor-not-allowed p-3"
                  placeholder="Nhập thông tin chi tiết về yêu cầu của bạn..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-dark-200">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="px-6 py-3 border-2 border-dark-300 rounded-lg text-sm font-semibold text-text-secondary bg-dark-300 hover:bg-dark-900 hover:border-dark-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={
                    !formData.vehicleId ||
                    !formData.scheduledDate ||
                    !selectedSlotId ||
                    loading ||
                    checkingVehicle
                  }
                  className="px-8 py-3 border-2 border-transparent rounded-lg text-sm font-semibold text-dark-900 bg-lime-200 hover:bg-lime-300 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {loading || checkingVehicle ? (
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
                      {checkingVehicle
                        ? "Đang kiểm tra xe..."
                        : "Đang xử lý..."}
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
              <div className="bg-dark-300 rounded-xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-10 h-10 bg-dark-9000 rounded-lg flex items-center justify-center">
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
                  <h4 className="text-lg font-bold text-white">
                    Chi tiết đặt lịch
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-dark-300 rounded-lg p-4 shadow-sm border border-dark-200">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 text-text-muted mr-2"
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
                      <h5 className="text-sm text-text-muted text-text-muted">
                        Thông tin xe
                      </h5>
                    </div>
                    <p className="text-lg font-semibold text-white mb-1">
                      {selectedVehicle?.make} {selectedVehicle?.model}
                    </p>
                    <p className="text-sm text-text-secondary">
                      Năm: {selectedVehicle?.year}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      VIN: {selectedVehicle?.vin}
                    </p>
                  </div>

                  <div className="bg-dark-300 rounded-lg p-4 shadow-sm border border-dark-200">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 text-text-muted mr-2"
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
                      <h5 className="text-sm text-text-muted text-text-muted">
                        Dịch vụ
                      </h5>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      Đặt lịch kiểm tra
                    </p>
                    <p className="text-sm text-text-secondary mt-1">
                      Thời gian ước tính: 60 phút
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-dark-300 rounded-lg p-4 shadow-sm border border-dark-200">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 text-text-muted mr-2"
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
                      <h5 className="text-sm text-text-muted text-text-muted">
                        Ngày hẹn
                      </h5>
                    </div>
                    <p className="text-lg font-semibold text-white">
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

                  <div className="bg-dark-300 rounded-lg p-4 shadow-sm border border-dark-200">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 text-text-muted mr-2"
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
                      <h5 className="text-sm text-text-muted text-text-muted">
                        Khung giờ
                      </h5>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {selectedSlot &&
                        utcToVietnameseDateTime(new Date(selectedSlot.start))
                          .time}
                    </p>
                  </div>
                </div>

                {selectedTechnician && (
                  <div className="bg-dark-300 rounded-lg p-4 shadow-sm border border-dark-200">
                    <div className="flex items-center mb-3">
                      <svg
                        className="w-5 h-5 text-text-muted mr-2"
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
                      <h5 className="text-sm text-text-muted text-text-muted">
                        Kỹ thuật viên
                      </h5>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-dark-9000 flex items-center justify-center">
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
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-white">
                          {selectedTechnician.firstName}{" "}
                          {selectedTechnician.lastName}
                        </p>
                        {selectedTechnician.specialization &&
                          selectedTechnician.specialization.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedTechnician.specialization
                                .slice(0, 2)
                                .map((spec: string) => (
                                  <span
                                    key={spec}
                                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-dark-200 text-lime-600"
                                  >
                                    {spec}
                                  </span>
                                ))}
                              {selectedTechnician.specialization.length > 2 && (
                                <span className="text-xs text-text-muted">
                                  +
                                  {selectedTechnician.specialization.length - 2}{" "}
                                  more
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                {!selectedTechnician && formData.technicianId && (
                  <div className="bg-dark-300 rounded-lg p-4 shadow-sm border border-dark-200">
                    <div className="flex items-center mb-3">
                      <svg
                        className="w-5 h-5 text-text-muted mr-2"
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
                      <h5 className="text-sm text-text-muted text-text-muted">
                        Kỹ thuật viên
                      </h5>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-dark-300 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-text-secondary"
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
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-white">
                          Kỹ thuật viên đã chọn
                        </p>
                        <p className="text-sm text-text-secondary">
                          Thông tin chi tiết sẽ được hiển thị sau khi xác nhận
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {formData.customerNotes && (
                  <div className="bg-dark-300 rounded-lg p-4 shadow-sm border border-dark-200">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 text-text-muted mr-2"
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
                      <h5 className="text-sm text-text-muted text-text-muted">
                        Ghi chú
                      </h5>
                    </div>
                    <p className="text-base text-text-secondary leading-relaxed">
                      {formData.customerNotes}
                    </p>
                  </div>
                )}

                <div className="bg-dark-900 rounded-lg p-5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-dark-300 bg-opacity-20 rounded-lg flex items-center justify-center">
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
                        <p className="text-sm text-text-secondary">Tổng thanh toán</p>
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
                <div className="bg-dark-300 border-2 border-blue-600 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-dark-9000 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <svg
                        className="h-7 w-7 text-white"
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
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-white">
                        Đang xử lý đặt lịch...
                      </p>
                      <p className="text-sm text-text-secondary mt-1">
                        Mã giao dịch:{" "}
                        <span className="font-mono font-semibold">
                          {pendingAppointment.paymentInfo.transactionRef}
                        </span>
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        Hệ thống đang tự động tạo lịch hẹn cho bạn. Vui lòng
                        chờ...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t border-dark-200">
                <button
                  type="button"
                  onClick={handleBackToInput}
                  disabled={loading || paymentVerified}
                  className="px-6 py-3 border-2 border-dark-300 rounded-lg text-sm font-semibold text-text-secondary bg-dark-300 hover:bg-dark-900 hover:border-dark-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  ← Quay lại
                </button>
                <div className="flex space-x-3">
                  {paymentVerified ? (
                    <button
                      type="button"
                      disabled={true}
                      className="px-8 py-3 border-2 border-transparent rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed shadow-lg"
                    >
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
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreatePayment}
                      disabled={loading}
                      className="px-8 py-3 border-2 border-transparent rounded-lg text-sm font-semibold text-dark-900 bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-500 hover:to-lime-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-dark-900"
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
