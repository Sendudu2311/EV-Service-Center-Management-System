import api from './api';
import { AxiosResponse } from 'axios';

// ==================== TYPES ====================
// These match the backend response structures exactly

export interface WorkQueueAppointment {
  _id: string;
  appointmentNumber: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  coreStatus: string;
  priority: 'normal' | 'high' | 'urgent';
  bookingType: 'deposit_booking' | 'full_service';
  customerId: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  vehicleId: {
    _id: string;
    make: string;
    model: string;
    year: number;
    vin: string;
    color: string;
    batteryType: string;
    licensePlate: string;
  };
  services: Array<{
    serviceId: {
      _id: string;
      name: string;
      category: string;
      basePrice: number;
      estimatedDuration: number;
    };
    quantity: number;
    price: number;
    estimatedDuration: number;
  }>;
  assignedTechnician?: {
    _id: string;
    firstName: string;
    lastName: string;
    specializations: string[];
    phone: string;
  };
  notes?: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkQueueResponse {
  success: boolean;
  data: {
    appointments: WorkQueueAppointment[];
    statistics: {
      total: number;
      pending: number;
      confirmed: number;
      inProgress: number;
      unassigned: number;
      urgent: number;
      high: number;
      overdue: number;
    };
    pagination: {
      current: number;
      pages: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface ServiceReceptionData {
  appointmentId: string;
  vehicleCondition: {
    exterior?: {
      condition: 'excellent' | 'good' | 'fair' | 'poor';
      damages?: Array<{
        location: string;
        type: 'scratch' | 'dent' | 'crack' | 'rust' | 'paint_damage' | 'missing_part';
        severity: 'minor' | 'moderate' | 'major';
        description: string;
        photoUrl?: string;
      }>;
      notes?: string;
    };
    interior?: {
      condition: 'excellent' | 'good' | 'fair' | 'poor';
      cleanliness: 'very_clean' | 'clean' | 'moderate' | 'dirty' | 'very_dirty';
      damages?: Array<{
        location: string;
        type: 'stain' | 'tear' | 'wear' | 'burn' | 'missing_part';
        description: string;
        photoUrl?: string;
      }>;
      notes?: string;
    };
    battery?: {
      level: number;
      health: 'excellent' | 'good' | 'fair' | 'poor' | 'replace_soon';
      temperature?: number;
      chargingStatus: 'not_charging' | 'charging' | 'fully_charged' | 'error';
      lastChargeDate?: string;
      cycleCount?: number;
      notes?: string;
    };
    mileage?: {
      current: number;
      lastService?: number;
      mileageSinceLastService?: number;
      odometerPhoto?: string;
    };
    fluids?: {
      brakeFluid?: {
        level: 'full' | 'adequate' | 'low' | 'empty';
        condition: 'clear' | 'amber' | 'dark' | 'contaminated';
      };
      coolant?: {
        level: 'full' | 'adequate' | 'low' | 'empty';
        condition: 'clear' | 'clean' | 'dirty' | 'contaminated';
      };
      washerFluid?: {
        level: 'full' | 'adequate' | 'low' | 'empty';
      };
    };
    tires?: {
      frontLeft?: {
        treadDepth: number;
        pressure: number;
        condition: 'new' | 'good' | 'fair' | 'replace_soon' | 'replace_now';
      };
      frontRight?: {
        treadDepth: number;
        pressure: number;
        condition: 'new' | 'good' | 'fair' | 'replace_soon' | 'replace_now';
      };
      rearLeft?: {
        treadDepth: number;
        pressure: number;
        condition: 'new' | 'good' | 'fair' | 'replace_soon' | 'replace_now';
      };
      rearRight?: {
        treadDepth: number;
        pressure: number;
        condition: 'new' | 'good' | 'fair' | 'replace_soon' | 'replace_now';
      };
      spare?: {
        condition: 'available' | 'good' | 'fair' | 'poor' | 'missing';
        pressure?: number;
      };
    };
    lights?: {
      headlights: 'working' | 'dim' | 'not_working';
      taillights: 'working' | 'dim' | 'not_working';
      indicators: 'working' | 'not_working';
      interiorLights: 'working' | 'not_working';
    };
    generalIssues?: Array<{
      category: 'engine' | 'transmission' | 'brakes' | 'suspension' | 'electrical' | 'hvac' | 'other';
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      customerReported?: boolean;
    }>;
  };
  customerItems?: Array<{
    item: string;
    location: string;
    value?: number;
    notes?: string;
  }>;
  preServicePhotos?: Array<{
    url: string;
    category: 'exterior_front' | 'exterior_back' | 'exterior_left' | 'exterior_right' |
             'interior_front' | 'interior_back' | 'dashboard' | 'trunk' | 'engine' | 'other';
    description?: string;
  }>;
  diagnosticCodes?: Array<{
    code: string;
    description: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    system: string;
  }>;
  estimatedCompletionTime: string;
  estimatedServiceTime: number; // in minutes
  specialInstructions?: {
    fromCustomer?: string;
    fromStaff?: string;
    safetyPrecautions?: string[];
    warningNotes?: string[];
  };
  recommendedServices?: Array<{
    serviceId: string;
    serviceName: string;
    category: string;
    quantity: number;
    reason: string;
    discoveredDuring: string;
    estimatedCost: number;
    estimatedDuration: number;
  }>;
  requestedParts?: Array<{
    partId: string;
    partName: string;
    partNumber: string;
    quantity: number;
    reason: string;
    estimatedCost: number;
  }>;
  evChecklistItems?: Array<{
    id: string;
    label: string;
    category: 'battery' | 'charging' | 'motor' | 'safety' | 'general';
    checked: boolean;
    status?: 'good' | 'warning' | 'critical';
    notes?: string;
  }>;
}

export interface ServiceReceptionResponse {
  success: boolean;
  data: {
    serviceReception: any; // Full ServiceReception object
    appointment: any; // Updated Appointment object
  };
  message: string;
}

// ==================== API METHODS ====================

/**
 * Get work queue for technician
 * Backend: GET /api/appointments/work-queue
 * Params: status, priority, technicianId, dateRange, page, limit, sortBy
 */
export const getWorkQueue = async (params?: {
  status?: string; // comma-separated, default: "pending,confirmed"
  priority?: 'normal' | 'high' | 'urgent';
  technicianId?: string;
  dateRange?: 'today' | 'tomorrow' | 'week' | 'overdue' | 'all'; // default: "today"
  page?: number;
  limit?: number;
  sortBy?: 'priority_date' | 'date' | 'priority' | 'status';
}): Promise<WorkQueueResponse> => {
  const response: AxiosResponse<WorkQueueResponse> = await api.get('/api/appointments/work-queue', {
    params: params || {}
  });
  return response.data;
};

/**
 * Get single appointment detail
 * Backend: GET /api/appointments/:id
 */
export const getAppointmentDetail = async (appointmentId: string): Promise<any> => {
  const response = await api.get(`/api/appointments/${appointmentId}`);
  return response.data;
};

/**
 * Create service reception form
 * Backend: POST /api/service-receptions/:appointmentId/create
 */
export const createServiceReception = async (
  appointmentId: string,
  receptionData: ServiceReceptionData
): Promise<ServiceReceptionResponse> => {
  const response: AxiosResponse<ServiceReceptionResponse> = await api.post(
    `/api/service-receptions/${appointmentId}/create`,
    receptionData
  );
  return response.data;
};

/**
 * Submit service reception to staff for approval
 * Backend: PUT /api/appointments/:id/submit-reception
 */
export const submitServiceReception = async (
  appointmentId: string,
  submissionNotes?: string
): Promise<any> => {
  const response = await api.put(`/api/appointments/${appointmentId}/submit-reception`, {
    submissionNotes: submissionNotes || ''
  });
  return response.data;
};

/**
 * Start working on appointment
 * Backend: PUT /api/appointments/:id/start-work
 */
export const startWork = async (appointmentId: string, notes?: string): Promise<any> => {
  const response = await api.put(`/api/appointments/${appointmentId}/start-work`, {
    notes: notes || ''
  });
  return response.data;
};

/**
 * Complete appointment work
 * Backend: PUT /api/appointments/:id/complete
 */
export const completeWork = async (appointmentId: string, completionData: {
  notes?: string;
  actualDuration?: number;
}): Promise<any> => {
  const response = await api.put(`/api/appointments/${appointmentId}/complete`, completionData);
  return response.data;
};

/**
 * Get service reception by appointment ID (returns latest active one)
 * Backend: GET /api/service-receptions/appointment/:appointmentId
 */
export const getServiceReceptionByAppointment = async (appointmentId: string): Promise<any> => {
  const response = await api.get(`/api/service-receptions/appointment/${appointmentId}`);
  return response.data;
};

/**
 * Get ALL service receptions by appointment ID (returns array)
 * Backend: GET /api/service-receptions/appointment/:appointmentId/all
 */
export const getAllServiceReceptionsByAppointment = async (appointmentId: string): Promise<any> => {
  const response = await api.get(`/api/service-receptions/appointment/${appointmentId}/all`);
  return response.data;
};

/**
 * Update service reception
 * Backend: PUT /api/service-receptions/:id
 */
export const updateServiceReception = async (
  receptionId: string,
  updateData: Partial<ServiceReceptionData>
): Promise<any> => {
  const response = await api.put(`/api/service-receptions/${receptionId}`, updateData);
  return response.data;
};

/**
 * Add recommended service during inspection
 * Backend: POST /api/service-receptions/:id/add-service
 */
export const addRecommendedService = async (
  receptionId: string,
  serviceData: {
    serviceId: string;
    serviceName: string;
    category: string;
    quantity: number;
    reason: string;
    discoveredDuring: string;
    estimatedCost: number;
    estimatedDuration: number;
  }
): Promise<any> => {
  const response = await api.post(`/api/service-receptions/${receptionId}/add-service`, serviceData);
  return response.data;
};

/**
 * Request additional parts during service
 * Backend: POST /api/part-requests
 */
export const requestParts = async (partsRequestData: {
  type: 'initial_service' | 'additional_during_service';
  appointmentId: string;
  serviceReceptionId?: string;
  requestedParts: Array<{
    partId: string;
    partName: string;
    partNumber: string;
    quantity: number;
    reason: string;
    estimatedCost: number;
  }>;
  requestNotes?: string;
}): Promise<any> => {
  const response = await api.post('/api/part-requests', partsRequestData);
  return response.data;
};

/**
 * Upload photo (using form data)
 * Backend: POST /api/upload/photo
 */
export const uploadPhoto = async (photoUri: string, category: string): Promise<any> => {
  const formData = new FormData();

  // Extract filename from URI
  const filename = photoUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('photo', {
    uri: photoUri,
    name: filename,
    type: type,
  } as any);

  formData.append('category', category);

  const response = await api.post('/api/upload/photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get slots for technician schedule
 * Backend: GET /api/slots?technicianId=&from=&to=
 */
export const getTechnicianSlots = async (params: {
  technicianId?: string;
  from?: string; // ISO date string
  to?: string;   // ISO date string
}): Promise<any> => {
  const response = await api.get('/api/slots', { params });
  return response.data;
};

export default {
  getWorkQueue,
  getAppointmentDetail,
  createServiceReception,
  submitServiceReception,
  startWork,
  completeWork,
  getServiceReceptionByAppointment,
  getAllServiceReceptionsByAppointment,
  updateServiceReception,
  addRecommendedService,
  requestParts,
  uploadPhoto,
  getTechnicianSlots,
};
