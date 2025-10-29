import React from "react";
import {
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

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
  basePrice: number;
  estimatedDuration: number;
  category: string;
  description: string;
}

interface Technician {
  _id: string;
  firstName: string;
  lastName: string;
  specialization: string[];
}

interface AppointmentConfirmationProps {
  formData: {
    vehicleId: string;
    services: string[];
    scheduledDate: string;
    scheduledTime: string;
    customerNotes: string;
    priority: string;
    technicianId: string | null;
  };
  vehicles: Vehicle[];
  services: Service[];
  technicians: Technician[];
  totalAmount: number;
  onConfirm: () => void;
  onBack: () => void;
  loading?: boolean;
  paymentVerified?: boolean;
}

const AppointmentConfirmation: React.FC<AppointmentConfirmationProps> = ({
  formData,
  vehicles,
  services,
  technicians,
  totalAmount,
  onConfirm,
  onBack,
  loading = false,
  paymentVerified = false,
}) => {
  // Get selected data
  const selectedVehicle = vehicles.find((v) => v._id === formData.vehicleId);
  // serviceCenterId removed - single center architecture
  const selectedServices = services.filter((s) =>
    formData.services.includes(s._id)
  );
  const selectedTechnician = formData.technicianId
    ? technicians.find((t) => t._id === formData.technicianId)
    : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-white bg-red-600";
      case "normal":
        return "text-dark-900 bg-lime-200";
      case "low":
        return "text-white bg-green-600";
      default:
        return "text-white bg-text-muted";
    }
  };

  return (
    <div className="bg-dark-300 rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-lime-200 to-lime-300 px-6 py-4 rounded-t-lg">
        <div className="flex items-center">
          <CheckCircleIcon className="h-8 w-8 text-white mr-3" />
          <div>
            <h2 className="text-xl font-bold text-white">
              Confirm Your Appointment
            </h2>
            <p className="text-lime-100">
              Please review your booking details before proceeding to payment
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Vehicle Information */}
        <div className="bg-dark-900 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <UserIcon className="h-5 w-5 text-text-secondary mr-2" />
            <h3 className="text-lg font-semibold text-white">
              Vehicle Information
            </h3>
          </div>
          {selectedVehicle ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-secondary">Make & Model</p>
                <p className="text-text-muted">
                  {selectedVehicle.make} {selectedVehicle.model}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Year</p>
                <p className="text-text-muted">{selectedVehicle.year}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-text-secondary">VIN</p>
                <p className="text-text-muted font-mono text-sm">
                  {selectedVehicle.vin}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-red-600">No vehicle selected</p>
          )}
        </div>

        {/* Service Center Information */}
        <div className="bg-dark-900 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <MapPinIcon className="h-5 w-5 text-text-secondary mr-2" />
            <h3 className="text-lg font-semibold text-white">
              Service Center
            </h3>
          </div>
          <div>
            <p className="text-text-muted text-lg">EV Service Center</p>
            <p className="text-text-secondary">
              123 Main Street, Ho Chi Minh City, Vietnam
            </p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-dark-900 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <ClockIcon className="h-5 w-5 text-text-secondary mr-2" />
            <h3 className="text-lg font-semibold text-white">
              Appointment Schedule
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-text-secondary">Date</p>
              <p className="text-text-muted">
                {formatDate(formData.scheduledDate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Time</p>
              <p className="text-text-muted">{formData.scheduledTime}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Priority</p>
              <span
                className={`inline-flex px-2 py-1 text-xs text-text-muted rounded-full ${getPriorityColor(
                  formData.priority
                )}`}
              >
                {formData.priority.charAt(0).toUpperCase() +
                  formData.priority.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Selected Services */}
        <div className="bg-dark-900 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <WrenchScrewdriverIcon className="h-5 w-5 text-text-secondary mr-2" />
            <h3 className="text-lg font-semibold text-white">
              Selected Services
            </h3>
          </div>
          {selectedServices.length > 0 ? (
            <div className="space-y-3">
              {selectedServices.map((service) => (
                <div
                  key={service._id}
                  className="flex justify-between items-start bg-dark-300 rounded-md p-3 border"
                >
                  <div className="flex-1">
                    <h4 className="text-text-muted text-white">
                      {service.name}
                    </h4>
                    <p className="text-sm text-text-secondary">
                      {service.description}
                    </p>
                    <div className="flex items-center mt-2 space-x-4">
                      <span className="text-xs text-text-muted">
                        Category: {service.category}
                      </span>
                      <span className="text-xs text-text-muted">
                        Duration: {service.estimatedDuration} min
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lime-600">
                      {formatCurrency(service.basePrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-red-600">No services selected</p>
          )}
        </div>

        {/* Technician Information */}
        {selectedTechnician && (
          <div className="bg-dark-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Assigned Technician
            </h3>
            <div className="bg-dark-300 rounded-md p-3 border">
              <p className="text-text-muted">
                {selectedTechnician.firstName} {selectedTechnician.lastName}
              </p>
              <p className="text-sm text-text-secondary">
                Specializations: {selectedTechnician.specialization.join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Customer Notes */}
        {formData.customerNotes && (
          <div className="bg-dark-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Special Instructions
            </h3>
            <div className="bg-dark-300 rounded-md p-3 border">
              <p className="text-text-secondary">{formData.customerNotes}</p>
            </div>
          </div>
        )}

        {/* Total Amount */}
        <div className="bg-dark-900 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-lime-900">
              Total Amount
            </h3>
            <div className="text-right">
              <p className="text-2xl font-bold text-lime-600">
                {formatCurrency(totalAmount)}
              </p>
              <p className="text-sm text-lime-600">
                Including all selected services
              </p>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        {paymentVerified ? (
          <div className="bg-dark-200 border border-green-600 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-white">
                  Payment Verified
                </h3>
                <div className="mt-2 text-sm text-text-secondary">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Your payment has been successfully processed</li>
                    <li>
                      Click "Confirm Booking" to complete your appointment
                    </li>
                    <li>
                      You will receive email confirmation with appointment
                      details
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-dark-300 border border-yellow-600 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.726-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm text-text-muted text-yellow-600">
                  Payment Information
                </h3>
                <div className="mt-2 text-sm text-yellow-600">
                  <ul className="list-disc list-inside space-y-1">
                    <li>You will be redirected to VNPay secure payment page</li>
                    <li>
                      After successful payment, return to complete your booking
                    </li>
                    <li>
                      You will receive email confirmation with appointment
                      details
                    </li>
                    <li>Payment is processed securely through VNPay</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="bg-dark-900 px-6 py-4 rounded-b-lg flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-dark-200 bg-dark-300 text-white rounded-md shadow-sm text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-400 disabled:opacity-50"
        >
          Back to Edit
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={loading || totalAmount <= 0}
          className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm text-text-muted text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-green-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
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
              Processing...
            </>
          ) : paymentVerified ? (
            <>
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Confirm Booking
            </>
          ) : (
            `Confirm & Pay ${formatCurrency(totalAmount)}`
          )}
        </button>
      </div>
    </div>
  );
};

export default AppointmentConfirmation;
