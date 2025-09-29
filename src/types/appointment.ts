// Vietnamese EV Service Center Appointment Types

export type DetailedAppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'customer_arrived'
  | 'reception_created'
  | 'reception_approved'
  | 'parts_insufficient'
  | 'waiting_for_parts'
  | 'rescheduled'
  | 'in_progress'
  | 'parts_requested'
  | 'completed'
  | 'invoiced'
  | 'cancelled'
  | 'no_show';

export type CoreAppointmentStatus =
  | 'Scheduled'
  | 'CheckedIn'
  | 'InService'
  | 'OnHold'
  | 'ReadyForPickup'
  | 'Closed';

export type AppointmentPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ServiceCategory = 'battery' | 'motor' | 'charging' | 'electronics' | 'body' | 'general' | 'diagnostic';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'customer' | 'staff' | 'technician' | 'admin';
  avatar?: string;
  specializations?: string[];
}

export interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  color: string;
  mileage: number;
  batteryInfo: {
    type: string;
    capacity: number;
    manufacturer: string;
    warrantyExpiry: string;
  };
  chargingInfo: {
    maxChargingPower: number;
    supportedConnectors: string[];
    homeChargingSetup: boolean;
  };
}

export interface ServiceCenter {
  _id: string;
  name: string;
  code: string;
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    zipCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  operatingHours: {
    monday: { start: string; end: string; isOpen: boolean };
    tuesday: { start: string; end: string; isOpen: boolean };
    wednesday: { start: string; end: string; isOpen: boolean };
    thursday: { start: string; end: string; isOpen: boolean };
    friday: { start: string; end: string; isOpen: boolean };
    saturday: { start: string; end: string; isOpen: boolean };
    sunday: { start: string; end: string; isOpen: boolean };
  };
}

export interface Service {
  _id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  basePrice: number;
  estimatedDuration: number;
  isActive: boolean;
  requiredParts?: string[];
  skillLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

export interface AppointmentService {
  serviceId: Service | string;
  serviceName: string;
  description?: string;
  category: ServiceCategory;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  estimatedDuration: number;
  actualDuration?: number;
  notes?: string;
}

export interface Appointment {
  _id: string;
  appointmentNumber: string;
  customerId: User;
  vehicleId: Vehicle;
  serviceCenterId: ServiceCenter;
  services: AppointmentService[];

  // Scheduling
  scheduledDate: string;
  scheduledTime: string;
  estimatedCompletion: string;
  actualCompletion?: string;

  // Status Management
  status: DetailedAppointmentStatus;
  coreStatus: CoreAppointmentStatus;
  priority: AppointmentPriority;

  // Staff Assignment
  assignedTechnician?: User;
  createdBy: User;
  confirmedBy?: User;
  confirmedAt?: string;

  // Customer Information
  customerNotes?: string;
  customerArrivalTime?: string;
  customerPickupTime?: string;

  // Service Information
  serviceReceptionId?: string;
  partRequestIds?: string[];
  invoiceId?: string;

  // Pricing
  estimatedCost: number;
  finalCost?: number;
  laborCost?: number;
  partsCost?: number;
  additionalCharges?: number;

  // Communication
  notificationsSent: {
    confirmation: boolean;
    reminder: boolean;
    completion: boolean;
    invoice: boolean;
  };

  // Workflow Tracking
  workflowHistory: {
    status: DetailedAppointmentStatus;
    timestamp: string;
    changedBy: User;
    notes?: string;
    reason?: string;
  }[];

  // Metadata
  cancellationReason?: string;
  rescheduleReason?: string;
  rescheduleCount: number;
  noShowCount: number;
  isUrgent: boolean;
  requiresApproval: boolean;
  isApproved: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentFilters {
  status?: DetailedAppointmentStatus | DetailedAppointmentStatus[];
  coreStatus?: CoreAppointmentStatus | CoreAppointmentStatus[];
  priority?: AppointmentPriority | AppointmentPriority[];
  customerId?: string;
  vehicleId?: string;
  serviceCenterId?: string;
  technicianId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  serviceCategory?: ServiceCategory;
  search?: string;
}

export interface AppointmentFormData {
  vehicleId: string;
  serviceCenterId: string;
  services: {
    serviceId: string;
    quantity: number;
  }[];
  scheduledDate: string;
  scheduledTime: string;
  priority: AppointmentPriority;
  customerNotes?: string;
  requiresApproval?: boolean;
}

export interface AppointmentUpdateData {
  status?: DetailedAppointmentStatus;
  priority?: AppointmentPriority;
  assignedTechnician?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  customerNotes?: string;
  serviceNotes?: string;
  estimatedCompletion?: string;
  actualCompletion?: string;
}

export interface StatusTransition {
  from: DetailedAppointmentStatus;
  to: DetailedAppointmentStatus;
  allowedRoles: ('customer' | 'staff' | 'technician' | 'admin')[];
  requiresApproval?: boolean;
  automaticTransition?: boolean;
}

// Status transition rules for Vietnamese EV workflow
export const statusTransitions: StatusTransition[] = [
  { from: 'pending', to: 'confirmed', allowedRoles: ['staff', 'admin'] },
  { from: 'pending', to: 'cancelled', allowedRoles: ['customer', 'staff', 'admin'] },
  { from: 'confirmed', to: 'customer_arrived', allowedRoles: ['staff', 'admin'] },
  { from: 'confirmed', to: 'cancelled', allowedRoles: ['customer', 'staff', 'admin'] },
  { from: 'confirmed', to: 'no_show', allowedRoles: ['staff', 'admin'] },
  { from: 'confirmed', to: 'rescheduled', allowedRoles: ['customer', 'staff', 'admin'] },
  { from: 'customer_arrived', to: 'reception_created', allowedRoles: ['technician', 'staff', 'admin'] },
  { from: 'reception_created', to: 'reception_approved', allowedRoles: ['staff', 'admin'] },
  { from: 'reception_approved', to: 'in_progress', allowedRoles: ['technician', 'staff', 'admin'] },
  { from: 'reception_approved', to: 'parts_insufficient', allowedRoles: ['technician', 'staff', 'admin'] },
  { from: 'in_progress', to: 'parts_requested', allowedRoles: ['technician', 'staff', 'admin'] },
  { from: 'in_progress', to: 'completed', allowedRoles: ['technician', 'staff', 'admin'] },
  { from: 'parts_insufficient', to: 'waiting_for_parts', allowedRoles: ['staff', 'admin'] },
  { from: 'parts_requested', to: 'in_progress', allowedRoles: ['technician', 'staff', 'admin'] },
  { from: 'waiting_for_parts', to: 'in_progress', allowedRoles: ['technician', 'staff', 'admin'] },
  { from: 'completed', to: 'invoiced', allowedRoles: ['staff', 'admin'] },
  { from: 'rescheduled', to: 'confirmed', allowedRoles: ['staff', 'admin'] },
];

// Core status mapping from detailed status
export const getCorStatus = (detailedStatus: DetailedAppointmentStatus): CoreAppointmentStatus => {
  const statusMap: Record<DetailedAppointmentStatus, CoreAppointmentStatus> = {
    'pending': 'Scheduled',
    'confirmed': 'Scheduled',
    'rescheduled': 'Scheduled',
    'customer_arrived': 'CheckedIn',
    'reception_created': 'CheckedIn',
    'reception_approved': 'InService',
    'in_progress': 'InService',
    'parts_requested': 'InService',
    'parts_insufficient': 'OnHold',
    'waiting_for_parts': 'OnHold',
    'completed': 'ReadyForPickup',
    'invoiced': 'ReadyForPickup',
    'cancelled': 'Closed',
    'no_show': 'Closed',
  };

  return statusMap[detailedStatus];
};

// Check if status transition is allowed
export const canTransitionStatus = (
  from: DetailedAppointmentStatus,
  to: DetailedAppointmentStatus,
  userRole: 'customer' | 'staff' | 'technician' | 'admin'
): boolean => {
  const transition = statusTransitions.find(t => t.from === from && t.to === to);
  return transition ? transition.allowedRoles.includes(userRole) : false;
};

// Get next possible statuses for current status and user role
export const getNextStatuses = (
  currentStatus: DetailedAppointmentStatus,
  userRole: 'customer' | 'staff' | 'technician' | 'admin'
): DetailedAppointmentStatus[] => {
  return statusTransitions
    .filter(t => t.from === currentStatus && t.allowedRoles.includes(userRole))
    .map(t => t.to);
};

// Vietnamese translations for appointment statuses
export const appointmentStatusTranslations: Record<DetailedAppointmentStatus, string> = {
  'pending': 'Chờ xác nhận',
  'confirmed': 'Đã xác nhận',
  'customer_arrived': 'Khách hàng đã đến',
  'reception_created': 'Đã tạo phiếu tiếp nhận',
  'reception_approved': 'Đã duyệt phiếu tiếp nhận',
  'parts_insufficient': 'Thiếu phụ tùng',
  'waiting_for_parts': 'Đang chờ phụ tùng',
  'rescheduled': 'Đã đổi lịch',
  'in_progress': 'Đang thực hiện',
  'parts_requested': 'Đã yêu cầu phụ tùng',
  'completed': 'Hoàn thành',
  'invoiced': 'Đã xuất hóa đơn',
  'cancelled': 'Đã hủy',
  'no_show': 'Khách không đến',
};

// Vietnamese translations for appointment priorities
export const priorityTranslations: Record<AppointmentPriority, string> = {
  'low': 'Thấp',
  'normal': 'Bình thường',
  'high': 'Cao',
  'urgent': 'Khẩn cấp',
};