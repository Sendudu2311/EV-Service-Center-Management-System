// Shared types for dashboard components to ensure BE/FE synchronization

export interface CustomerDashboardStats {
  activeVehicles: number;
  upcomingAppointments: number;
  completedServices: number;
  totalSpent: number;
}

export interface CustomerVehicleInfo {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  batteryCapacity: number;
  range: number;
  maxChargingPower: number;
  isMaintenanceDue: boolean;
  nextMaintenanceDate?: string;
  images?: string[];
  licensePlate?: string;
  batteryHealth?: 'excellent' | 'good' | 'fair' | 'poor';
  currentCharge?: number;
}

export interface CustomerRecentAppointment {
  _id: string;
  appointmentNumber: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  services: string[];
  vehicle: string;
  serviceCenter: string;
  totalPrice: number;
}

export interface CustomerNotification {
  _id: string;
  type: 'appointment_reminder' | 'maintenance_due' | 'service_completed' | 'invoice_ready' | 'payment_due';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  expiresAt?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface CustomerDashboardResponse {
  stats: CustomerDashboardStats;
  vehicles: CustomerVehicleInfo[];
  recentAppointments: CustomerRecentAppointment[];
  notifications?: CustomerNotification[];
  maintenanceAlerts?: {
    vehicleId: string;
    vehicleName: string;
    dueDate: string;
    type: string;
  }[];
}

export interface DashboardApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

// Error handling types
export interface DashboardError {
  type: 'network' | 'auth' | 'server' | 'validation';
  message: string;
  code?: number;
  retry?: boolean;
}

// Loading states
export interface DashboardLoadingState {
  isLoading: boolean;
  error: DashboardError | null;
  lastFetch: Date | null;
}

// Real-time update types
export interface AppointmentStatusUpdate {
  appointmentId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
  updatedBy: {
    name: string;
    role: string;
  };
  notes?: string;
}

export interface InvoiceGeneratedEvent {
  customerId: string;
  invoiceNumber: string;
  appointmentId: string;
  amount: number;
  dueDate: string;
}

export interface NewMessageEvent {
  recipientId: string;
  senderName: string;
  appointmentId?: string;
  message: string;
  timestamp: string;
}