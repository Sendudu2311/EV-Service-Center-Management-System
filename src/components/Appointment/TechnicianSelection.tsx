import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import TechnicianCard from './TechnicianCard';

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
}

interface TechnicianSelectionProps {
  serviceCenterId: string;
  selectedServices: Array<{ serviceId: string; category?: string }>;
  selectedTechnicianId: string | null;
  onTechnicianSelect: (technicianId: string | null) => void;
  disabled?: boolean;
  appointmentDate?: string;
  appointmentTime?: string;
  estimatedDuration?: number;
}

const TechnicianSelection: React.FC<TechnicianSelectionProps> = ({
  serviceCenterId,
  selectedServices,
  selectedTechnicianId,
  onTechnicianSelect,
  disabled = false,
  appointmentDate,
  appointmentTime,
  estimatedDuration = 60
}) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [technicianAvailability, setTechnicianAvailability] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState({
    availability: '',
    specialization: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Extract service categories for filtering (memoized to prevent unnecessary re-renders)
  const serviceCategories = useMemo(() => {
    return selectedServices
      .map(service => service.category)
      .filter(Boolean)
      .filter((category, index, array) => array.indexOf(category) === index);
  }, [selectedServices]);

  // Individual technician availability check (for real-time validation during selection)
  const checkTechnicianAvailability = async (technicianId: string) => {
    if (!appointmentDate || !appointmentTime) {
      return true; // If no date/time selected, assume available
    }

    try {
      const response = await api.get('/api/appointments/technician-availability', {
        params: {
          technicianId,
          date: appointmentDate,
          time: appointmentTime,
          duration: estimatedDuration
        }
      });

      return response.data.success && response.data.data.available;
    } catch (error) {
      console.error('Error checking technician availability:', error);
      return false;
    }
  };

  const fetchTechnicians = async () => {
    if (!serviceCenterId || !appointmentDate || !appointmentTime) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('serviceCenterId', serviceCenterId);
      params.append('date', appointmentDate);
      params.append('time', appointmentTime);
      params.append('duration', estimatedDuration.toString());
      
      // Add service categories for skill matching
      if (serviceCategories.length > 0) {
        serviceCategories.forEach(category => {
          if (category) params.append('serviceCategories', category);
        });
      }

      // Add filtering parameters
      if (filter.availability) params.append('availability', filter.availability);
      if (filter.specialization) params.append('specialization', filter.specialization);

      const response = await api.get(
        `/api/appointments/available-technicians?${params.toString()}`
      );

      if (response.data.success) {
        setTechnicians(response.data.data);
        // Set all fetched technicians as available since they're pre-filtered
        const availabilityMap = response.data.data.reduce((acc: Record<string, boolean>, technician: any) => {
          acc[technician.id] = true;
          return acc;
        }, {});
        setTechnicianAvailability(availabilityMap);
      }
    } catch (error) {
      console.error('Error fetching available technicians:', error);
      toast.error('Failed to load available technicians');
      setTechnicians([]);
      setTechnicianAvailability({});
    } finally {
      setLoading(false);
    }
  };

  // Memoize service categories string to prevent unnecessary API calls
  const serviceCategoriesString = useMemo(() => {
    return serviceCategories.sort().join(',');
  }, [serviceCategories]);

  useEffect(() => {
    fetchTechnicians();
  }, [serviceCenterId, appointmentDate, appointmentTime, estimatedDuration, filter.availability, filter.specialization, serviceCategoriesString]);

  const filteredTechnicians = useMemo(() => {
    if (!technicians || technicians.length === 0) {
      return [];
    }
    
    return technicians.filter(technician => {
      // Search filter
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        if (!technician.name?.toLowerCase().includes(searchLower) &&
            !technician.specializations?.some(spec => 
              spec?.toLowerCase().includes(searchLower)
            )) {
          return false;
        }
      }
      return true;
    });
  }, [technicians, filter.search]);

  const handleTechnicianSelect = async (technicianId: string) => {
    if (disabled) return;
    
    if (selectedTechnicianId === technicianId) {
      // Deselect if clicking the same technician
      onTechnicianSelect(null);
    } else {
      // Check availability before selecting
      if (appointmentDate && appointmentTime) {
        const isAvailable = await checkTechnicianAvailability(technicianId);
        if (!isAvailable) {
          toast.error('This technician is not available at the selected time. Please choose a different time or technician.');
          return;
        }
      }
      onTechnicianSelect(technicianId);
    }
  };

  const clearSelection = () => {
    onTechnicianSelect(null);
  };

  if (!serviceCenterId || !appointmentDate || !appointmentTime) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p>
          Please select a service center, date, and time to view available technicians.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Choose Technician (Optional)
          </h3>
          <p className="text-sm text-gray-600">
            Select a preferred technician or let us assign the best available one
          </p>
        </div>
        {selectedTechnicianId && (
          <button
            type="button"
            onClick={clearSelection}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search technicians..."
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border ${
              showFilters 
                ? 'border-blue-500 bg-blue-50 text-blue-600' 
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Availability
              </label>
              <select
                value={filter.availability}
                onChange={(e) => setFilter(prev => ({ ...prev, availability: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialization
              </label>
              <select
                value={filter.specialization}
                onChange={(e) => setFilter(prev => ({ ...prev, specialization: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                {serviceCategories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
                <option value="battery">Battery</option>
                <option value="motor">Motor</option>
                <option value="charging">Charging</option>
                <option value="electronics">Electronics</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Technicians Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-64"></div>
            </div>
          ))}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Finding available technicians...</span>
        </div>
      ) : filteredTechnicians.length > 0 ? (
        <>
          {/* Results Count */}
          <div className="text-sm text-gray-600">
            {filteredTechnicians.length} technician{filteredTechnicians.length !== 1 ? 's' : ''} available
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
                isAvailableForSlot={technicianAvailability[technician.id] !== false}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">
            {filter.search || filter.availability || filter.specialization 
              ? 'No technicians match your search criteria.' 
              : 'No technicians available for this time slot.'}
          </p>
          <p className="text-sm">
            {!filter.search && !filter.availability && !filter.specialization 
              ? 'Please try selecting a different date or time, or let us automatically assign the best available technician.' 
              : 'Try adjusting your search filters or selecting a different time slot.'}
          </p>
        </div>
      )}

      {/* Auto-assignment Notice */}
      {!selectedTechnicianId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">
                Auto-assignment enabled
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                If you don't select a technician, we'll automatically assign the best available technician based on their skills, availability, and performance.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianSelection;