// ==================== APPOINTMENT TYPES ====================

export type AppointmentStatus = 'pending' | 'confirmed' | 'customer_arrived' |
  'reception_created' | 'reception_approved' | 'parts_insufficient' |
  'waiting_for_parts' | 'rescheduled' | 'in_progress' | 'parts_requested' |
  'completed' | 'invoiced' | 'cancelled' | 'no_show';

export type CoreStatus = 'Scheduled' | 'CheckedIn' | 'InService' | 'OnHold' | 'ReadyForPickup' | 'Closed';

export type Priority = 'normal' | 'high' | 'urgent';

export type BookingType = 'deposit_booking' | 'full_service';

export interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  color: string;
  batteryType: string;
  licensePlate: string;
  batteryCapacity?: number;
  chargingPower?: number;
}

export interface Service {
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
}

export interface Technician {
  _id: string;
  firstName: string;
  lastName: string;
  specializations: string[];
  phone: string;
}

export interface Appointment {
  _id: string;
  appointmentNumber: string;
  scheduledDate: string;
  scheduledTime: string;
  status: AppointmentStatus;
  coreStatus: CoreStatus;
  priority: Priority;
  bookingType: BookingType;
  customerId: Customer;
  vehicleId: Vehicle;
  services: Service[];
  assignedTechnician?: Technician;
  notes?: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== SERVICE RECEPTION TYPES ====================

export type ExteriorCondition = 'excellent' | 'good' | 'fair' | 'poor';
export type DamageType = 'scratch' | 'dent' | 'crack' | 'rust' | 'paint_damage' | 'missing_part';
export type DamageSeverity = 'minor' | 'moderate' | 'major';
export type InteriorDamageType = 'stain' | 'tear' | 'wear' | 'burn' | 'missing_part';
export type Cleanliness = 'very_clean' | 'clean' | 'moderate' | 'dirty' | 'very_dirty';
export type BatteryHealth = 'excellent' | 'good' | 'fair' | 'poor' | 'replace_soon';
export type ChargingStatus = 'not_charging' | 'charging' | 'fully_charged' | 'error';
export type FluidLevel = 'full' | 'adequate' | 'low' | 'empty';
export type FluidCondition = 'clear' | 'amber' | 'dark' | 'contaminated' | 'clean' | 'dirty';
export type TireCondition = 'new' | 'good' | 'fair' | 'replace_soon' | 'replace_now';
export type SpareCondition = 'available' | 'good' | 'fair' | 'poor' | 'missing';
export type LightStatus = 'working' | 'dim' | 'not_working';
export type IssueCategory = 'engine' | 'transmission' | 'brakes' | 'suspension' | 'electrical' | 'hvac' | 'other';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PhotoCategory = 'exterior_front' | 'exterior_back' | 'exterior_left' | 'exterior_right' |
                            'interior_front' | 'interior_back' | 'dashboard' | 'trunk' | 'engine' | 'other';
export type DiagnosticSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ChecklistCategory = 'battery' | 'charging' | 'motor' | 'safety' | 'general';
export type ChecklistStatus = 'good' | 'warning' | 'critical';

export interface ExteriorDamage {
  location: string;
  type: DamageType;
  severity: DamageSeverity;
  description: string;
  photoUrl?: string;
}

export interface InteriorDamage {
  location: string;
  type: InteriorDamageType;
  description: string;
  photoUrl?: string;
}

export interface VehicleCondition {
  exterior?: {
    condition: ExteriorCondition;
    damages?: ExteriorDamage[];
    notes?: string;
  };
  interior?: {
    condition: ExteriorCondition;
    cleanliness: Cleanliness;
    damages?: InteriorDamage[];
    notes?: string;
  };
  battery?: {
    level: number;
    health: BatteryHealth;
    temperature?: number;
    chargingStatus: ChargingStatus;
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
      level: FluidLevel;
      condition: FluidCondition;
    };
    coolant?: {
      level: FluidLevel;
      condition: FluidCondition;
    };
    washerFluid?: {
      level: FluidLevel;
    };
  };
  tires?: {
    frontLeft?: TireInfo;
    frontRight?: TireInfo;
    rearLeft?: TireInfo;
    rearRight?: TireInfo;
    spare?: {
      condition: SpareCondition;
      pressure?: number;
    };
  };
  lights?: {
    headlights: LightStatus;
    taillights: LightStatus;
    indicators: LightStatus;
    interiorLights: LightStatus;
  };
  generalIssues?: GeneralIssue[];
}

export interface TireInfo {
  treadDepth: number;
  pressure: number;
  condition: TireCondition;
}

export interface GeneralIssue {
  category: IssueCategory;
  issue: string;
  severity: IssueSeverity;
  customerReported?: boolean;
}

export interface CustomerItem {
  item: string;
  location: string;
  value?: number;
  notes?: string;
}

export interface PreServicePhoto {
  url: string;
  category: PhotoCategory;
  description?: string;
  timestamp?: string;
}

export interface DiagnosticCode {
  code: string;
  description: string;
  severity: DiagnosticSeverity;
  system: string;
  detectedAt?: string;
}

export interface RecommendedService {
  _id?: string;
  serviceId: string;
  serviceName: string;
  category: string;
  quantity: number;
  reason: string;
  discoveredDuring: string;
  estimatedCost: number;
  estimatedDuration: number;
  addedBy?: string;
  addedAt?: string;
  isCompleted?: boolean;
  completedBy?: string;
  completedAt?: string;
  actualDuration?: number;
  technicianNotes?: string;
  qualityCheckPassed?: boolean;
  customerApproved?: boolean;
}

export interface RequestedPart {
  _id?: string;
  partId: string;
  partName: string;
  partNumber: string;
  quantity: number;
  reason: string;
  isApproved?: boolean;
  isAvailable?: boolean;
  availableQuantity?: number;
  shortfall?: number;
  alternativePartSuggested?: string;
  customerApprovalRequired?: boolean;
  customerApproved?: boolean;
  estimatedCost: number;
  actualCost?: number;
}

export interface EVChecklistItem {
  id: string;
  label: string;
  category: ChecklistCategory;
  checked: boolean;
  status?: ChecklistStatus;
  notes?: string;
}

export interface SpecialInstructions {
  fromCustomer?: string;
  fromStaff?: string;
  safetyPrecautions?: string[];
  warningNotes?: string[];
}

export interface ServiceReception {
  _id: string;
  receptionNumber: string;
  appointmentId: string;
  customerId: string;
  vehicleId: string;
  vehicleCondition: VehicleCondition;
  customerItems?: CustomerItem[];
  preServicePhotos?: PreServicePhoto[];
  diagnosticCodes?: DiagnosticCode[];
  estimatedCompletionTime: string;
  estimatedServiceTime: number;
  actualServiceTime?: number;
  specialInstructions?: SpecialInstructions;
  receivedBy: string;
  receivedAt: string;
  status: 'received' | 'inspected' | 'approved' | 'in_service' | 'completed' | 'ready_for_pickup';
  recommendedServices?: RecommendedService[];
  requestedParts?: RequestedPart[];
  evChecklistItems?: EVChecklistItem[];
  submissionStatus?: {
    submittedToStaff: boolean;
    submittedAt?: string;
    submittedBy?: string;
    staffReviewStatus: 'pending' | 'approved' | 'rejected' | 'needs_modification' | 'partially_approved';
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
  };
  workflowHistory?: Array<{
    status: string;
    changedBy: string;
    changedAt: string;
    reason?: string;
    notes?: string;
    systemGenerated: boolean;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== WORK QUEUE TYPES ====================

export interface WorkQueueStatistics {
  total: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  unassigned: number;
  urgent: number;
  high: number;
  overdue: number;
}

export interface Pagination {
  current: number;
  pages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface WorkQueueFilters {
  status?: string;
  priority?: Priority;
  technicianId?: string;
  dateRange?: 'today' | 'tomorrow' | 'week' | 'overdue' | 'all';
  page?: number;
  limit?: number;
  sortBy?: 'priority_date' | 'date' | 'priority' | 'status';
}

// ==================== PART REQUEST TYPES ====================

export interface PartRequestData {
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
}

// ==================== FORM DATA TYPES ====================

export interface ServiceReceptionFormData {
  appointmentId: string;
  vehicleCondition: VehicleCondition;
  customerItems?: CustomerItem[];
  preServicePhotos?: PreServicePhoto[];
  diagnosticCodes?: DiagnosticCode[];
  estimatedCompletionTime: string;
  estimatedServiceTime: number;
  specialInstructions?: SpecialInstructions;
  recommendedServices?: RecommendedService[];
  requestedParts?: RequestedPart[];
  evChecklistItems?: EVChecklistItem[];
}

// ==================== UI STATE TYPES ====================

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  details?: any;
}

export interface SuccessState {
  isSuccess: boolean;
  message?: string;
  data?: any;
}

// ==================== COMPONENT PROP TYPES ====================

export interface WorkQueueItemProps {
  appointment: Appointment;
  onPress: (appointment: Appointment) => void;
}

export interface AppointmentDetailHeaderProps {
  appointment: Appointment;
  onBack: () => void;
}

export interface VehicleInfoCardProps {
  vehicle: Vehicle;
}

export interface CustomerInfoCardProps {
  customer: Customer;
}

export interface ServiceListCardProps {
  services: Service[];
}

export interface ActionButtonsProps {
  appointment: Appointment;
  onStartWork: () => void;
  onCreateReception: () => void;
  onViewReception: () => void;
  isLoading?: boolean;
}

// ==================== NAVIGATION TYPES ====================

export type TechnicianStackParamList = {
  TechnicianWorkQueue: undefined;
  TechnicianAppointmentDetail: { appointmentId: string };
  ServiceReceptionCreate: {
    appointmentId: string;
    rejectedReceptionId?: string; // Optional: ID of rejected reception to pre-fill form
  };
  ServiceReceptionEdit: { receptionId: string; appointmentId: string };
  EVChecklist: { receptionId: string };
  PartsRequest: { appointmentId: string; receptionId?: string };
  ServiceNotes: { appointmentId: string };
  PhotoDocumentation: { receptionId: string; category: PhotoCategory };
  WorkProgress: { appointmentId: string };
  CompleteService: { appointmentId: string };
};
