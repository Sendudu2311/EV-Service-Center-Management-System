import React, { useState, useEffect, useMemo, useCallback } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
// Removed filter icons - simplified interface
import TechnicianCard from "./TechnicianCard";

interface Technician {
  id: string;
  name: string;
  specializations: string[];
  availability: {
    status: string;
    workloadPercentage: number;
  };
  performance: {
    customerRating: number;
    completedJobs: number;
    efficiency: number;
  };
  skills: Array<{
    category: string;
    level: number;
    certified: boolean;
  }>;
  isRecommended: boolean;
  yearsExperience: number;
  // New: Slot status information from optimized API
  slotStatus?: {
    slotId: string;
    slotTime: string;
    currentWorkload: number;
    maxCapacity: number;
    slotCapacity: number;
    technicianSlotCapacity: number;
    availabilityPercentage: number;
    isPreferred: boolean;
    appointments: Array<{
      id: string;
      status: string;
      scheduledDate: string;
    }>;
  };
}

interface TechnicianSelectionProps {
  selectedServices: Array<{ serviceId: string; category?: string }>;
  selectedTechnicianId: string | null;
  onTechnicianSelect: (
    technicianId: string | null,
    technicianData?: Technician
  ) => void;
  disabled?: boolean;
  appointmentDate?: string;
  appointmentTime?: string;
  selectedSlotId?: string | null;
  estimatedDuration?: number;
}

const TechnicianSelection: React.FC<TechnicianSelectionProps> = ({
  selectedServices,
  selectedTechnicianId,
  onTechnicianSelect,
  disabled = false,
  appointmentDate,
  appointmentTime,
  selectedSlotId,
  estimatedDuration = 60,
}) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [technicianAvailability, setTechnicianAvailability] = useState<
    Record<string, boolean>
  >({});
  // Removed filter state - simplified interface

  // Extract service categories for filtering (memoized to prevent unnecessary re-renders)
  const serviceCategories = useMemo(() => {
    const categories = selectedServices
      .map((service) => service.category)
      .filter(
        (category): category is string =>
          category !== undefined && category !== null && category !== ""
      )
      .filter((category, index, array) => array.indexOf(category) === index);

    return categories;
  }, [selectedServices]);

  // Removed individual technician availability check - not needed since technicians are pre-filtered by API

  const fetchTechnicians = useCallback(async () => {
    if (!appointmentDate || !appointmentTime) {
      return;
    }

    setLoading(true);
    try {
      let techniciansData: Technician[] = [];

      // Use slot-specific API if selectedSlotId is provided, otherwise use time-based API
      if (selectedSlotId) {
        // Build parameters for the slot-specific API
        const params = new URLSearchParams();
        params.append("slotId", selectedSlotId);
        params.append("duration", estimatedDuration.toString());

        // Add service categories for skill matching
        if (serviceCategories.length > 0) {
          serviceCategories.forEach((category) => {
            params.append("serviceCategories", category);
          });
        }

        const response = await api.get(
          `/api/appointments/available-technicians-for-slot?${params.toString()}`
        );

        if (response.data.success) {
          techniciansData = response.data.data;
        }
      } else {
        // Build parameters for the time-based API
        const params = new URLSearchParams();
        params.append("date", appointmentDate);
        params.append("time", appointmentTime);
        params.append("duration", estimatedDuration.toString());

        // Add service categories for skill matching
        if (serviceCategories.length > 0) {
          serviceCategories.forEach((category) => {
            params.append("serviceCategories", category);
          });
        }

        const response = await api.get(
          `/api/appointments/available-technicians?${params.toString()}`
        );

        if (response.data.success) {
          techniciansData = response.data.data;
        }
      }

      setTechnicians(techniciansData);
      // Set all fetched technicians as available since they're pre-filtered
      const availabilityMap = techniciansData.reduce(
        (acc: Record<string, boolean>, technician: any) => {
          acc[technician.id] = true;
          return acc;
        },
        {}
      );
      setTechnicianAvailability(availabilityMap);
    } catch (error: any) {
      console.error("Error fetching available technicians:", error);
      toast.error("Failed to load available technicians");
      setTechnicians([]);
      setTechnicianAvailability({});
    } finally {
      setLoading(false);
    }
  }, [
    appointmentDate,
    appointmentTime,
    estimatedDuration,
    serviceCategories,
    selectedSlotId,
    // Note: selectedTechnicianId is intentionally not included as it shouldn't trigger refetch
  ]);

  // Removed serviceCategoriesString - no longer needed without filters

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  // Removed filtering - show all available technicians
  const filteredTechnicians = technicians;

  const handleTechnicianSelect = (technicianId: string) => {
    if (disabled) return;

    if (selectedTechnicianId === technicianId) {
      // Deselect if clicking the same technician
      onTechnicianSelect(null);
    } else {
      // Find the technician data and pass it along
      const technicianData = technicians.find((t) => t.id === technicianId);

      // Pass both technicianId and technicianData to parent
      onTechnicianSelect(technicianId, technicianData);
    }
  };

  const clearSelection = () => {
    onTechnicianSelect(null);
  };

  if (!appointmentDate || !appointmentTime) {
    return (
      <div className="text-center py-8 text-text-muted">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p>Please select a date and time to view available technicians.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Choose Technician (Optional)
          </h3>
          <p className="text-sm text-text-secondary">
            Select a preferred technician or let us assign the best available
            one
          </p>
        </div>
        {selectedTechnicianId && (
          <button
            type="button"
            onClick={clearSelection}
            className="text-sm text-lime-600 hover:text-lime-700"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Removed search and filters - simplified interface */}

      {/* Technicians Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-dark-200 rounded-lg h-64"></div>
            </div>
          ))}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-text-secondary">
            Finding available technicians...
          </span>
        </div>
      ) : filteredTechnicians.length > 0 ? (
        <>
          {/* Results Count */}
          <div className="text-sm text-text-secondary">
            {filteredTechnicians.length} technician
            {filteredTechnicians.length !== 1 ? "s" : ""} available
          </div>

          {/* Technicians Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTechnicians.map((technician) => (
              <TechnicianCard
                key={technician.id}
                technician={technician}
                isSelected={selectedTechnicianId === technician.id}
                onSelect={handleTechnicianSelect}
                selectedServices={serviceCategories}
                isAvailableForSlot={
                  technicianAvailability[technician.id] !== false
                }
                disabled={disabled}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-text-muted">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-lg text-text-muted text-white mb-2">
            No technicians available for this time slot.
          </p>
          <p className="text-sm">
            Please try selecting a different date or time, or let us
            automatically assign the best available technician.
          </p>
        </div>
      )}

      {/* Auto-assignment Notice */}
      {!selectedTechnicianId && (
        <div className="bg-dark-900 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-lime-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="bg-dark-900 ml-3">
              <h4 className="text-sm text-text-muted text-white">
                Auto-assignment enabled
              </h4>
              <p className="text-sm text-text-secondary mt-1">
                If you don't select a technician, we'll automatically assign the
                best available technician based on their skills, availability,
                and performance.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianSelection;
