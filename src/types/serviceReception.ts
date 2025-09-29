// Vietnamese Service Reception Types

export interface EVChecklistItem {
  _id?: string;
  stepNumber: number;
  title: string;
  description?: string;
  category: 'safety' | 'preparation' | 'inspection' | 'testing' | 'maintenance' | 'verification' | 'cleanup' | 'documentation';
  isRequired: boolean;
  isSafetyItem: boolean;
  estimatedTime: number; // minutes
  tools: {
    name: string;
    isRequired: boolean;
  }[];
  safetyPrecautions: string[];
  expectedResults: string[];
  documentation: {
    photoRequired: boolean;
    measurementRequired: boolean;
    measurementUnit?: string;
    signoffRequired: boolean;
  };
  subItems: {
    title: string;
    description: string;
    isRequired: boolean;
    expectedValue?: string;
    measurementType: 'voltage' | 'current' | 'temperature' | 'pressure' | 'resistance' | 'frequency' | 'visual' | 'boolean';
    actualValue?: string;
    isCompleted: boolean;
    notes?: string;
  }[];
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  actualTime?: number;
  notes?: string;
  photos?: string[];
  measurements?: {
    parameter: string;
    value: number;
    unit: string;
    isWithinRange: boolean;
    notes?: string;
  }[];
  issues?: {
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolution?: string;
    isResolved: boolean;
  }[];
}

export interface ServiceReception {
  _id: string;
  receptionNumber: string;
  appointmentId: string;
  customerId: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
  };
  vehicleId: {
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
  };
  serviceCenterId: {
    _id: string;
    name: string;
    code: string;
  };

  // Technician Information
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    employeeId: string;
  };
  assignedTechnician?: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    employeeId: string;
    specializations: string[];
  };

  // Vehicle Condition Assessment
  vehicleCondition: {
    exterior: {
      condition: 'excellent' | 'good' | 'fair' | 'poor';
      damages: {
        type: 'scratch' | 'dent' | 'crack' | 'missing_part' | 'corrosion' | 'other';
        location: string;
        severity: 'minor' | 'moderate' | 'major';
        description: string;
        photo?: string;
      }[];
      notes?: string;
    };
    interior: {
      condition: 'excellent' | 'good' | 'fair' | 'poor';
      issues: {
        type: 'wear' | 'tear' | 'stain' | 'malfunction' | 'missing' | 'other';
        location: string;
        description: string;
      }[];
      notes?: string;
    };
    underHood: {
      condition: 'excellent' | 'good' | 'fair' | 'poor';
      findings: {
        component: string;
        condition: 'normal' | 'needs_attention' | 'needs_replacement';
        notes: string;
      }[];
    };
    battery: {
      currentCharge: number; // percentage
      voltage: number;
      temperature: number;
      chargeCycles: number;
      healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
      estimatedRange: number;
      chargingPortCondition: 'excellent' | 'good' | 'fair' | 'poor';
      issues: string[];
    };
    tires: {
      frontLeft: { pressure: number; treadDepth: number; condition: string };
      frontRight: { pressure: number; treadDepth: number; condition: string };
      rearLeft: { pressure: number; treadDepth: number; condition: string };
      rearRight: { pressure: number; treadDepth: number; condition: string };
    };
  };

  // Customer Information
  customerComplaints: string[];
  customerRequests: string[];
  customerNotes?: string;

  // Service Planning
  plannedServices: {
    serviceId: string;
    serviceName: string;
    description: string;
    category: string;
    estimatedDuration: number;
    estimatedCost: number;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    requiredParts?: string[];
    notes?: string;
  }[];

  additionalServicesRecommended: {
    serviceId: string;
    serviceName: string;
    description: string;
    reason: string;
    urgency: 'immediate' | 'next_service' | 'future';
    estimatedCost: number;
    customerApprovalRequired: boolean;
    customerApproved?: boolean;
  }[];

  // EV-Specific Checklist
  evChecklist: EVChecklistItem[];

  // Parts Assessment
  partsNeeded: {
    partId: string;
    partName: string;
    partNumber: string;
    quantity: number;
    urgency: 'immediate' | 'normal' | 'can_wait';
    estimatedCost: number;
    availabilityStatus: 'in_stock' | 'order_required' | 'back_order';
    estimatedDelivery?: string;
    alternativeParts?: {
      partId: string;
      partName: string;
      reason: string;
    }[];
  }[];

  // Cost Estimation
  costEstimate: {
    labor: {
      standardHours: number;
      overtimeHours: number;
      standardRate: number;
      overtimeRate: number;
      totalLaborCost: number;
    };
    parts: {
      subtotal: number;
      discount: number;
      total: number;
    };
    additionalCharges: {
      description: string;
      amount: number;
      type: 'fee' | 'environmental' | 'disposal' | 'other';
    }[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    grandTotal: number;
  };

  // Approval Workflow
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  approvalHistory: {
    status: string;
    timestamp: string;
    approvedBy: {
      _id: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    notes?: string;
    reason?: string;
  }[];

  // Customer Communication
  customerNotifications: {
    type: 'reception_created' | 'estimate_ready' | 'approval_required' | 'work_started' | 'work_completed';
    sentAt: string;
    method: 'email' | 'sms' | 'phone' | 'in_person';
    message: string;
    delivered: boolean;
    customerResponse?: string;
    responseAt?: string;
  }[];

  // Quality Control
  qualityChecks: {
    category: string;
    checkpoints: {
      item: string;
      status: 'pass' | 'fail' | 'na';
      notes?: string;
      inspector: string;
      timestamp: string;
    }[];
  }[];

  // Documentation
  photos: {
    category: 'before' | 'during' | 'after' | 'damage' | 'repair';
    url: string;
    description: string;
    timestamp: string;
    uploadedBy: string;
  }[];

  documents: {
    type: 'warranty' | 'manual' | 'certificate' | 'invoice' | 'other';
    name: string;
    url: string;
    uploadedBy: string;
    uploadedAt: string;
  }[];

  // Metadata
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimatedCompletionDate: string;
  actualCompletionDate?: string;
  internalNotes?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface ServiceReceptionFormData {
  appointmentId: string;
  customerId: string;
  vehicleId: string;
  assignedTechnician?: string;
  customerComplaints: string[];
  customerRequests: string[];
  customerNotes?: string;
  vehicleCondition: ServiceReception['vehicleCondition'];
  plannedServices: ServiceReception['plannedServices'];
  additionalServicesRecommended: ServiceReception['additionalServicesRecommended'];
  partsNeeded: ServiceReception['partsNeeded'];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimatedCompletionDate: string;
  internalNotes?: string;
}

export interface ServiceReceptionUpdate {
  status?: ServiceReception['status'];
  vehicleCondition?: Partial<ServiceReception['vehicleCondition']>;
  plannedServices?: ServiceReception['plannedServices'];
  additionalServicesRecommended?: ServiceReception['additionalServicesRecommended'];
  partsNeeded?: ServiceReception['partsNeeded'];
  costEstimate?: ServiceReception['costEstimate'];
  evChecklist?: EVChecklistItem[];
  priority?: ServiceReception['priority'];
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  internalNotes?: string;
}

// Vietnamese translations for Service Reception
export const serviceReceptionStatusTranslations: Record<string, string> = {
  'draft': 'Bản nháp',
  'pending_approval': 'Chờ phê duyệt',
  'approved': 'Đã phê duyệt',
  'rejected': 'Đã từ chối',
  'in_progress': 'Đang thực hiện',
  'completed': 'Hoàn thành',
};

export const vehicleConditionTranslations: Record<string, string> = {
  'excellent': 'Xuất sắc',
  'good': 'Tốt',
  'fair': 'Khá',
  'poor': 'Kém',
};

export const urgencyTranslations: Record<string, string> = {
  'immediate': 'Ngay lập tức',
  'next_service': 'Lần bảo dưỡng tiếp theo',
  'future': 'Tương lai',
  'normal': 'Bình thường',
  'can_wait': 'Có thể đợi',
};

export const availabilityStatusTranslations: Record<string, string> = {
  'in_stock': 'Còn hàng',
  'order_required': 'Cần đặt hàng',
  'back_order': 'Hết hàng tạm thời',
};