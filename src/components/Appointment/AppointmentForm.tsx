import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  appointmentsAPI,
  vehiclesAPI,
  servicesAPI,
  techniciansAPI,
  vnpayAPI,
} from "../../services/api";
import toast from "react-hot-toast";
import TechnicianSelection from "./TechnicianSelection";
import AppointmentConfirmation from "./AppointmentConfirmation";

interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
}

// ServiceCenter interface removed - single center architecture

interface Service {
  _id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  estimatedDuration: number;
}

interface AppointmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  // serviceCenters removed - single center architecture
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [pendingAppointment, setPendingAppointment] = useState<any>(null);
  const [selectedBank, setSelectedBank] = useState("");
  const [formData, setFormData] = useState({
    vehicleId: "",
    services: [] as string[],
    scheduledDate: "",
    scheduledTime: "",
    customerNotes: "",
    priority: "normal",
    technicianId: null as string | null,
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    // Single center architecture - always fetch services and technicians
    fetchServices();
    fetchTechnicians();
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

  // fetchServiceCenters removed - single center architecture

  const fetchServices = async () => {
    try {
      const response = await servicesAPI.getAll();
      const serviceData = response.data?.data || response.data || [];
      setServices(Array.isArray(serviceData) ? serviceData : []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Failed to load services");
      setServices([]);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await techniciansAPI.getAll();
      const technicianData = response.data?.data || response.data || [];
      setTechnicians(Array.isArray(technicianData) ? technicianData : []);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      setTechnicians([]);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checkbox = e.target as HTMLInputElement;
      if (checkbox.checked) {
        setFormData((prev) => ({
          ...prev,
          services: [...prev.services, value],
          // Reset technician selection when services change
          technicianId: null,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          services: prev.services.filter((id) => id !== value),
          // Reset technician selection when services change
          technicianId: null,
        }));
      }
    } else {
      const updates: any = { [name]: value };

      // Reset technician selection when critical fields change
      if (["scheduledDate", "scheduledTime"].includes(name)) {
        updates.technicianId = null;
      }

      setFormData((prev) => ({
        ...prev,
        ...updates,
      }));
    }
  };

  const handleTechnicianSelect = (technicianId: string | null) => {
    setFormData((prev) => ({
      ...prev,
      technicianId,
    }));
  };

  const calculateTotalAmount = () => {
    return formData.services.reduce((total, serviceId) => {
      const service = services.find((s) => s._id === serviceId);
      return total + (service?.basePrice || 0);
    }, 0);
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
        services: formData.services.map((serviceId) => ({
          serviceId,
          quantity: 1,
        })),
        ...(formData.technicianId && { technicianId: formData.technicianId }),
      };

      const paymentData = {
        amount: totalAmount,
        bankCode: selectedBank || undefined,
        language: "vn",
        orderInfo: `Thanh toan dich vu xe dien - ${formData.services.length} dich vu`,
        appointmentData: appointmentData,
      };

      const response = await vnpayAPI.createPayment(paymentData);

      if (response.data?.paymentUrl) {
        // Store pending appointment data for after payment
        const appointmentData = {
          ...formData,
          services: formData.services.map((serviceId) => ({
            serviceId,
            quantity: 1,
          })),
          ...(formData.technicianId && { technicianId: formData.technicianId }),
          paymentInfo: {
            transactionRef: response.data.transactionRef,
            amount: totalAmount,
            method: "vnpay",
          },
        };

        setPendingAppointment(appointmentData);
        localStorage.setItem(
          "pendingAppointment",
          JSON.stringify(appointmentData)
        );

        // Redirect to VNPay payment page
        window.location.href = response.data.paymentUrl;
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

    if (formData.services.length === 0) {
      toast.error("Please select at least one service");
      return;
    }

    // If payment is already verified, directly complete the booking
    if (paymentVerified) {
      await handleDirectBooking();
      return;
    }

    // Show confirmation step for normal flow
    setShowConfirmation(true);
  };

  const handleConfirmationConfirm = async () => {
    const totalAmount = calculateTotalAmount();

    if (paymentVerified) {
      // Payment already verified - directly book appointment and trigger post-payment workflow
      setShowConfirmation(false);
      await handleDirectBooking();
    } else if (totalAmount > 0) {
      // Need payment - show payment selection
      setShowConfirmation(false);
      setShowPayment(true);
    } else {
      // Free service - direct booking
      setShowConfirmation(false);
      await handleDirectBooking();
    }
  };

  const handleConfirmationBack = () => {
    setShowConfirmation(false);
  };

  const handleDirectBooking = async () => {
    setLoading(true);

    try {
      const appointmentData = {
        ...formData,
        services: formData.services.map((serviceId) => ({
          serviceId,
          quantity: 1,
        })),
        ...(formData.technicianId && { technicianId: formData.technicianId }),
        ...(paymentVerified &&
          pendingAppointment?.paymentInfo && {
            paymentInfo: pendingAppointment.paymentInfo,
          }),
      };

      // Create appointment FIRST
      await appointmentsAPI.create(appointmentData);

      // THEN trigger post-payment workflow (emails) AFTER appointment is created
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
          // Don't fail the booking if notifications fail
        }
      }

      toast.success("Appointment booked successfully!");

      // Clean up
      localStorage.removeItem("pendingAppointment");
      localStorage.removeItem("paymentVerified");

      onSuccess();
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast.error(
        error.response?.data?.message || "Failed to book appointment"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!pendingAppointment) return;

    setLoading(true);
    try {
      // First verify the payment
      const verifyResponse = await vnpayAPI.verifyAppointmentPayment({
        transactionRef: pendingAppointment.paymentInfo.transactionRef,
      });

      if (verifyResponse.data?.success) {
        // Create appointment with verified payment info
        const appointmentData = {
          ...pendingAppointment,
          paymentInfo: verifyResponse.data.paymentInfo,
        };

        await appointmentsAPI.create(appointmentData);
        toast.success("Appointment booked successfully after payment");
        localStorage.removeItem("pendingAppointment");
        onSuccess();
      } else {
        throw new Error("Payment verification failed");
      }
    } catch (error: any) {
      console.error("Error creating appointment after payment:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to book appointment after payment"
      );
    } finally {
      setLoading(false);
    }
  };

  // Check for successful payment on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const transactionRef = urlParams.get("transactionRef");

    // Check for payment verification data
    const paymentVerifiedStr = localStorage.getItem("paymentVerified");
    const pendingDataStr = localStorage.getItem("pendingAppointment");

    if (paymentVerifiedStr) {
      const paymentData = JSON.parse(paymentVerifiedStr);

      if (pendingDataStr) {
        const appointment = JSON.parse(pendingDataStr);

        // Pre-fill the form with the appointment data
        setFormData({
          vehicleId: appointment.vehicleId || "",
          services: appointment.services?.map((s: any) => s.serviceId) || [],
          scheduledDate: appointment.scheduledDate || "",
          scheduledTime: appointment.scheduledTime || "",
          customerNotes: appointment.customerNotes || "",
          priority: appointment.priority || "normal",
          technicianId: appointment.technicianId || null,
        });

        // Set the pending appointment with payment info
        setPendingAppointment({
          ...appointment,
          paymentInfo: paymentData,
        });

        // Set payment verified flag
        setPaymentVerified(true);

        // Clean up localStorage
        localStorage.removeItem("pendingAppointment");
        localStorage.removeItem("paymentVerified");

        // Show success message
        toast.success(
          "Payment verified! Please complete your appointment booking."
        );
      }
    } else if (success === "true" && transactionRef) {
      const pendingData = localStorage.getItem("pendingAppointment");
      if (pendingData) {
        const appointment = JSON.parse(pendingData);
        if (appointment.paymentInfo?.transactionRef === transactionRef) {
          setPendingAppointment(appointment);
          handlePaymentSuccess();
        }
      }
    }
  }, []);

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
                      Payment completed - reviewing your booking details
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

              {/* Show confirmation step - but not if payment is already verified */}
              {showConfirmation && !paymentVerified ? (
                <AppointmentConfirmation
                  formData={formData}
                  vehicles={vehicles}
                  services={services}
                  technicians={technicians}
                  totalAmount={calculateTotalAmount()}
                  onConfirm={handleConfirmationConfirm}
                  onBack={handleConfirmationBack}
                  loading={loading}
                  paymentVerified={paymentVerified}
                />
              ) : (
                <>
                  {/* Payment Verification Status */}
                  {paymentVerified && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-green-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-green-700">
                            <strong>Payment Verified!</strong> Your payment has
                            been processed successfully. Please review and
                            confirm your booking.
                          </p>
                          {pendingAppointment?.paymentInfo && (
                            <p className="text-xs text-green-600 mt-1">
                              Amount:{" "}
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(
                                pendingAppointment.paymentInfo.amount
                              )}{" "}
                              • Transaction:{" "}
                              {pendingAppointment.paymentInfo.transactionRef}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Booking Summary for Payment Verified */}
                  {paymentVerified && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-medium text-blue-900 mb-3">
                        Booking Summary
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vehicle:</span>
                          <span className="font-medium">
                            {(() => {
                              const vehicle = vehicles.find(
                                (v) => v._id === formData.vehicleId
                              );
                              return vehicle
                                ? `${vehicle.make} ${vehicle.model} ${vehicle.year}`
                                : "Selected";
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date & Time:</span>
                          <span className="font-medium">
                            {formData.scheduledDate} at {formData.scheduledTime}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Services:</span>
                          <span className="font-medium">
                            {formData.services.length} service
                            {formData.services.length !== 1 ? "s" : ""} selected
                          </span>
                        </div>
                        {formData.technicianId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Technician:</span>
                            <span className="font-medium">
                              {(() => {
                                const technician = technicians.find(
                                  (t) => t._id === formData.technicianId
                                );
                                return technician
                                  ? `${technician.firstName} ${technician.lastName}`
                                  : "Selected";
                              })()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Priority:</span>
                          <span className="font-medium capitalize">
                            {formData.priority}
                          </span>
                        </div>
                        <div className="flex justify-between text-blue-600 font-semibold">
                          <span>Total Amount:</span>
                          <span>
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(calculateTotalAmount())}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Vehicle Selection */}
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

                    {/* Service Center Selection removed - single center architecture */}

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
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
                      <div>
                        <label
                          htmlFor="scheduledTime"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Time <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="scheduledTime"
                          name="scheduledTime"
                          required
                          value={formData.scheduledTime}
                          onChange={handleChange}
                          disabled={paymentVerified}
                          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                            paymentVerified
                              ? "bg-gray-100 cursor-not-allowed opacity-60"
                              : ""
                          }`}
                        >
                          <option value="">Select time</option>
                          {[
                            "08:00",
                            "08:30",
                            "09:00",
                            "09:30",
                            "10:00",
                            "10:30",
                            "11:00",
                            "11:30",
                            "13:00",
                            "13:30",
                            "14:00",
                            "14:30",
                            "15:00",
                            "15:30",
                            "16:00",
                            "16:30",
                            "17:00",
                          ].map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Services */}
                    {services.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Select Services{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div
                          className={`space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 ${
                            paymentVerified ? "bg-gray-50" : ""
                          }`}
                        >
                          {services.map((service) => (
                            <div key={service._id} className="flex items-start">
                              <input
                                type="checkbox"
                                id={service._id}
                                value={service._id}
                                checked={formData.services.includes(
                                  service._id
                                )}
                                onChange={handleChange}
                                disabled={paymentVerified}
                                className={`mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                                  paymentVerified
                                    ? "cursor-not-allowed opacity-60"
                                    : ""
                                }`}
                              />
                              <label
                                htmlFor={service._id}
                                className="ml-3 flex-1"
                              >
                                <div className="text-sm font-medium text-gray-900">
                                  {service.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {service.description}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {new Intl.NumberFormat("vi-VN", {
                                    style: "currency",
                                    currency: "VND",
                                  }).format(service.basePrice)}{" "}
                                  • {service.estimatedDuration} min
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Technician Selection */}
                    {formData.services.length > 0 &&
                      formData.scheduledDate &&
                      formData.scheduledTime && (
                        <div>
                          <TechnicianSelection
                            selectedServices={formData.services.map(
                              (serviceId) => {
                                const service = services.find(
                                  (s) => s._id === serviceId
                                );
                                return {
                                  serviceId,
                                  category: service?.category,
                                };
                              }
                            )}
                            selectedTechnicianId={formData.technicianId}
                            onTechnicianSelect={handleTechnicianSelect}
                            disabled={loading || paymentVerified}
                            appointmentDate={formData.scheduledDate}
                            appointmentTime={formData.scheduledTime}
                            estimatedDuration={formData.services.reduce(
                              (total, serviceId) => {
                                const service = services.find(
                                  (s) => s._id === serviceId
                                );
                                return (
                                  total + (service?.estimatedDuration || 0)
                                );
                              },
                              0
                            )}
                          />
                        </div>
                      )}

                    {/* Info message when technician selection is not available yet */}
                    {formData.services.length > 0 &&
                      (!formData.scheduledDate || !formData.scheduledTime) && (
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
                                Please select a date and time to view available
                                technicians for your chosen services.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Priority */}
                    <div>
                      <label
                        htmlFor="priority"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Priority
                      </label>
                      <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        disabled={paymentVerified}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                          paymentVerified
                            ? "bg-gray-100 cursor-not-allowed opacity-60"
                            : ""
                        }`}
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    {/* Notes */}
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

                    {/* Payment Selection */}
                    {showPayment && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-900 mb-3">
                          Payment Method
                        </h4>

                        {/* Total Amount */}
                        <div className="mb-4 p-3 bg-white rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Total Amount:
                            </span>
                            <span className="text-lg font-semibold text-blue-600">
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(calculateTotalAmount())}
                            </span>
                          </div>
                        </div>

                        {/* Bank Selection */}
                        <div className="mb-4">
                          <label
                            htmlFor="bankCode"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            Select Bank (Optional)
                          </label>
                          <select
                            id="bankCode"
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Auto-select bank</option>
                            <option value="VNPAYQR">VNPay QR Code</option>
                            <option value="VNBANK">
                              Vietnamese Bank Cards
                            </option>
                            <option value="INTCARD">International Cards</option>
                            <option value="VISA">Visa</option>
                            <option value="MASTERCARD">Mastercard</option>
                          </select>
                        </div>

                        {/* Payment Info */}
                        <div className="text-xs text-gray-600 mb-4">
                          <p>
                            • You will be redirected to VNPay secure payment
                            page
                          </p>
                          <p>
                            • After successful payment, your appointment will be
                            automatically booked
                          </p>
                          <p>
                            • Payment reference:{" "}
                            {pendingAppointment?.paymentInfo?.transactionRef ||
                              "Will be generated"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              {!showPayment ? (
                <button
                  type="submit"
                  disabled={loading}
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

export default AppointmentForm;
