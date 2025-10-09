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

interface ServiceCenter {
  _id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
  };
}

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
    serviceCenterId: string;
    services: string[];
    scheduledDate: string;
    scheduledTime: string;
    customerNotes: string;
    priority: string;
    technicianId: string | null;
  };
  vehicles: Vehicle[];
  serviceCenters: ServiceCenter[];
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
  serviceCenters,
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
  const selectedServiceCenter = serviceCenters.find(
    (sc) => sc._id === formData.serviceCenterId
  );
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
        return "text-red-600 bg-red-100";
      case "normal":
        return "text-blue-600 bg-blue-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-lg">
        <div className="flex items-center">
          <CheckCircleIcon className="h-8 w-8 text-white mr-3" />
          <div>
            <h2 className="text-xl font-bold text-white">
              Confirm Your Appointment
            </h2>
            <p className="text-blue-100">
              Please review your booking details before proceeding to payment
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Vehicle Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <UserIcon className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Vehicle Information
            </h3>
          </div>
          {selectedVehicle ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Make & Model</p>
                <p className="font-medium">
                  {selectedVehicle.make} {selectedVehicle.model}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Year</p>
                <p className="font-medium">{selectedVehicle.year}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">VIN</p>
                <p className="font-medium font-mono text-sm">
                  {selectedVehicle.vin}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-red-600">No vehicle selected</p>
          )}
        </div>

        {/* Service Center Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <MapPinIcon className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Service Center
            </h3>
          </div>
          {selectedServiceCenter ? (
            <div>
              <p className="font-medium text-lg">
                {selectedServiceCenter.name}
              </p>
              <p className="text-gray-600">
                {selectedServiceCenter.address.street},{" "}
                {selectedServiceCenter.address.city},{" "}
                {selectedServiceCenter.address.state}
              </p>
            </div>
          ) : (
            <p className="text-red-600">No service center selected</p>
          )}
        </div>

        {/* Date & Time */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <ClockIcon className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Appointment Schedule
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-medium">
                {formatDate(formData.scheduledDate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Time</p>
              <p className="font-medium">{formData.scheduledTime}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Priority</p>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
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
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <WrenchScrewdriverIcon className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Selected Services
            </h3>
          </div>
          {selectedServices.length > 0 ? (
            <div className="space-y-3">
              {selectedServices.map((service) => (
                <div
                  key={service._id}
                  className="flex justify-between items-start bg-white rounded-md p-3 border"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {service.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {service.description}
                    </p>
                    <div className="flex items-center mt-2 space-x-4">
                      <span className="text-xs text-gray-500">
                        Category: {service.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        Duration: {service.estimatedDuration} min
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">
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
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Assigned Technician
            </h3>
            <div className="bg-white rounded-md p-3 border">
              <p className="font-medium">
                {selectedTechnician.firstName} {selectedTechnician.lastName}
              </p>
              <p className="text-sm text-gray-600">
                Specializations: {selectedTechnician.specialization.join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Customer Notes */}
        {formData.customerNotes && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Special Instructions
            </h3>
            <div className="bg-white rounded-md p-3 border">
              <p className="text-gray-700">{formData.customerNotes}</p>
            </div>
          </div>
        )}

        {/* Total Amount */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-blue-900">
              Total Amount
            </h3>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalAmount)}
              </p>
              <p className="text-sm text-blue-600">
                Including all selected services
              </p>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        {paymentVerified ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Payment Verified
                </h3>
                <div className="mt-2 text-sm text-green-700">
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
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
                <h3 className="text-sm font-medium text-yellow-800">
                  Payment Information
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
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
      <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Back to Edit
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={loading || totalAmount <= 0}
          className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
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
