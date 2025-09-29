// Customer-specific appointment types for enhanced UI/UX and permissions

import {
  Appointment,
  DetailedAppointmentStatus,
  AppointmentPriority,
  CoreAppointmentStatus
} from './appointment';

export interface CustomerAppointmentCard extends Appointment {
  // Enhanced fields for customer view
  estimatedCost?: number;
  actualCost?: number;
  canReschedule: boolean;
  canCancel: boolean;
  rescheduleDeadline?: string; // ISO string
  cancelDeadline?: string; // ISO string

  // UI-specific computed fields
  statusDisplay: {
    text: string;
    color: string;
    icon?: string;
    progress: number; // 0-100 for timeline
  };

  // Timeline information
  timeline: AppointmentTimelineEvent[];

  // Next possible actions for customer
  availableActions: CustomerAppointmentAction[];
}

export interface AppointmentTimelineEvent {
  id: string;
  timestamp: string;
  status: DetailedAppointmentStatus;
  title: string;
  description: string;
  actor: {
    name: string;
    role: 'customer' | 'staff' | 'technician' | 'system';
  };
  notes?: string;
}

export interface CustomerAppointmentAction {
  type: 'view' | 'reschedule' | 'cancel' | 'pay' | 'download_invoice' | 'add_notes';
  label: string;
  icon: string;
  disabled: boolean;
  disabledReason?: string;
  destructive?: boolean; // For cancel action
}

// Reschedule functionality
export interface RescheduleRequest {
  appointmentId: string;
  newDate: string; // YYYY-MM-DD
  newTime: string; // HH:MM
  reason: string;
  reasonCategory: RescheduleReason;
}

export interface RescheduleReason {
  id: string;
  label: string;
  requiresNote: boolean;
}

export const RESCHEDULE_REASONS: RescheduleReason[] = [
  { id: 'emergency', label: 'Tình huống khẩn cấp', requiresNote: true },
  { id: 'schedule_conflict', label: 'Xung đột lịch trình', requiresNote: false },
  { id: 'weather', label: 'Thời tiết xấu', requiresNote: false },
  { id: 'vehicle_issue', label: 'Sự cố xe', requiresNote: true },
  { id: 'personal', label: 'Lý do cá nhân', requiresNote: true },
  { id: 'other', label: 'Khác', requiresNote: true }
];

// Cancel functionality
export interface CancelRequest {
  appointmentId: string;
  reason: string;
  reasonCategory: CancelReason;
}

export interface CancelReason {
  id: string;
  label: string;
  requiresNote: boolean;
  refundEligible: boolean;
}

export const CANCEL_REASONS: CancelReason[] = [
  { id: 'emergency', label: 'Tình huống khẩn cấp', requiresNote: true, refundEligible: true },
  { id: 'vehicle_sold', label: 'Đã bán xe', requiresNote: false, refundEligible: true },
  { id: 'service_not_needed', label: 'Không cần dịch vụ nữa', requiresNote: false, refundEligible: false },
  { id: 'found_alternative', label: 'Tìm được chỗ khác', requiresNote: true, refundEligible: false },
  { id: 'cost_concern', label: 'Chi phí quá cao', requiresNote: false, refundEligible: true },
  { id: 'other', label: 'Khác', requiresNote: true, refundEligible: false }
];

// Available time slots for reschedule
export interface AvailableTimeSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  available: boolean;
  technicianId?: string;
  technicianName?: string;
  estimatedDuration: number; // minutes
}

// Customer appointment filters
export interface CustomerAppointmentFilters {
  status?: DetailedAppointmentStatus | CoreAppointmentStatus | '';
  dateRange?: {
    from: string;
    to: string;
  };
  search?: string; // Search by appointment number, service, vehicle
  sortBy: 'date' | 'status' | 'priority' | 'created';
  sortOrder: 'asc' | 'desc';
}

// Customer-specific permissions
export interface CustomerPermissions {
  canCreate: boolean;
  canView: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  rescheduleTimeLimit: number; // hours before appointment
  cancelTimeLimit: number; // hours before appointment
  maxRescheduleCount: number; // per appointment
}

// Default customer permissions
export const DEFAULT_CUSTOMER_PERMISSIONS: CustomerPermissions = {
  canCreate: true,
  canView: true,
  canReschedule: true,
  canCancel: true,
  rescheduleTimeLimit: 24, // 24 hours before
  cancelTimeLimit: 2, // 2 hours before
  maxRescheduleCount: 2 // max 2 reschedules per appointment
};

// Permission checking functions
export const checkCustomerPermission = (
  appointment: Appointment,
  action: 'reschedule' | 'cancel',
  permissions: CustomerPermissions = DEFAULT_CUSTOMER_PERMISSIONS
): { allowed: boolean; reason?: string } => {
  const now = new Date();
  const appointmentDateTime = new Date(`${appointment.scheduledDate}T${appointment.scheduledTime}`);
  const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  switch (action) {
    case 'reschedule':
      if (!permissions.canReschedule) {
        return { allowed: false, reason: 'Không có quyền đổi lịch' };
      }

      if (hoursUntilAppointment < permissions.rescheduleTimeLimit) {
        return {
          allowed: false,
          reason: `Chỉ có thể đổi lịch trước ${permissions.rescheduleTimeLimit} giờ`
        };
      }

      if (['cancelled', 'completed', 'invoiced', 'no_show'].includes(appointment.status)) {
        return { allowed: false, reason: 'Không thể đổi lịch với trạng thái hiện tại' };
      }

      // Check reschedule count (would need to be tracked in appointment)
      return { allowed: true };

    case 'cancel':
      if (!permissions.canCancel) {
        return { allowed: false, reason: 'Không có quyền hủy lịch' };
      }

      if (hoursUntilAppointment < permissions.cancelTimeLimit) {
        return {
          allowed: false,
          reason: `Chỉ có thể hủy lịch trước ${permissions.cancelTimeLimit} giờ`
        };
      }

      if (['cancelled', 'completed', 'invoiced', 'no_show'].includes(appointment.status)) {
        return { allowed: false, reason: 'Không thể hủy lịch với trạng thái hiện tại' };
      }

      return { allowed: true };

    default:
      return { allowed: false, reason: 'Hành động không hợp lệ' };
  }
};

// Loading states for customer appointments
export interface CustomerAppointmentLoadingState {
  isLoading: boolean;
  isRescheduling: boolean;
  isCancelling: boolean;
  isLoadingTimeSlots: boolean;
  error: string | null;
  lastFetch: Date | null;
}

// Error types specific to customer appointments
export interface CustomerAppointmentError {
  type: 'network' | 'auth' | 'validation' | 'business_rule' | 'server';
  message: string;
  field?: string; // for validation errors
  code?: string;
  retryable: boolean;
}