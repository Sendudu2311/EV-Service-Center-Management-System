import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AppointmentDetailsProps {
  appointment: any;
  onClose: () => void;
  _onUpdate: () => void; // Reserved for future update functionality
}

const AppointmentDetails: React.FC<AppointmentDetailsProps> = ({
  appointment,
  onClose,
  _onUpdate
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                Appointment Details
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-500">
                Appointment #{appointment.appointmentNumber}
              </p>
              <p className="mt-2 text-sm text-gray-900">
                Status: {appointment.status}
              </p>
              <p className="mt-2 text-sm text-gray-900">
                Scheduled: {new Date(appointment.scheduledDate).toLocaleDateString()} at {appointment.scheduledTime}
              </p>
              <p className="mt-2 text-sm text-gray-900">
                Vehicle: {appointment.vehicleId.make} {appointment.vehicleId.model}
              </p>
              <p className="mt-2 text-sm text-gray-900">
                Service Center: {appointment.serviceCenterId.name}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetails;