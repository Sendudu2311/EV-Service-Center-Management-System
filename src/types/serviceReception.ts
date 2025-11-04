// Vietnamese Service Reception Types

export interface EVChecklistItem {
  _id?: string;
  stepNumber: number;
  title: string;
  description?: string;
  category:
    | "safety"
    | "preparation"
    | "inspection"
    | "testing"
    | "maintenance"
    | "verification"
    | "cleanup"
    | "documentation";
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
    measurementType:
      | "voltage"
      | "current"
      | "temperature"
      | "pressure"
      | "resistance"
      | "frequency"
      | "visual"
      | "boolean";
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
    severity: "low" | "medium" | "high" | "critical";
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

  // Technician Information
  receivedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    employeeId: string;
  };

  // Vehicle Condition Assessment
  vehicleCondition: {
    exterior: {
      condition: "excellent" | "good" | "fair" | "poor";
      damages: {
        type:
          | "scratch"
          | "dent"
          | "crack"
          | "missing_part"
          | "corrosion"
          | "other";
        location: string;
        severity: "minor" | "moderate" | "major";
        description: string;
        photo?: string;
      }[];
      notes?: string;
    };
    interior: {
      condition: "excellent" | "good" | "fair" | "poor";
      issues: {
        type: "wear" | "tear" | "stain" | "malfunction" | "missing" | "other";
        location: string;
        description: string;
      }[];
      notes?: string;
    };
    battery: {
      level: number; // percentage
      health: "excellent" | "good" | "fair" | "poor" | "replace_soon";
      temperature?: number;
      chargingStatus: "not_charging" | "charging" | "fully_charged" | "error";
      notes?: string;
    };
    tires: {
      frontLeft: { pressure: number; treadDepth: number; condition: string };
      frontRight: { pressure: number; treadDepth: number; condition: string };
      rearLeft: { pressure: number; treadDepth: number; condition: string };
      rearRight: { pressure: number; treadDepth: number; condition: string };
    };
    mileage: {
      current: number;
    };
  };

  // Customer Items
  customerItems: {
    item: string;
    location: string;
    value?: number;
    notes?: string;
  }[];

  // Pre-service Photos
  preServicePhotos: {
    url: string;
    category: string;
    description?: string;
    timestamp: string;
  }[];

  // Diagnostic Codes
  diagnosticCodes: {
    code: string;
    description: string;
    severity: "info" | "warning" | "error" | "critical";
    system?: string;
  }[];

  // NOTE: Initial booked service from appointment is NOT included here
  // It was already paid and is only for knowing the reason for visit
  
  // Services recommended by technician after vehicle inspection
  recommendedServices: {
    serviceId: string;
    serviceName: string;
    category: string;
    quantity: number;
    reason: string;
    discoveredDuring?: string;
    estimatedCost: number;
    estimatedDuration: number;
    addedBy: string;
    addedAt: string;
    isCompleted: boolean;
    completedBy?: string;
    completedAt?: string;
    actualDuration?: number;
    technicianNotes?: string;
    qualityCheckPassed?: boolean;
  }[];

  // Parts requested by technician
  requestedParts: {
    partId: string;
    partName: string;
    partNumber: string;
    quantity: number;
    reason: string;
    isApproved: boolean;
    isAvailable: boolean;
    availableQuantity?: number;
    shortfall?: number;
    alternativePartSuggested?: string;
    estimatedCost?: number;
    actualCost?: number;
  }[];

  // External parts ordered from outside suppliers
  // Used when technician notes that vehicle will be left for external part orders
  externalParts?: {
    _id?: string;
    partName: string;
    partNumber?: string;
    supplier?: {
      name: string;
      contact?: string;
      address?: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    warranty?: {
      period: number; // in months
      description?: string;
    };
    estimatedArrival?: string;
    actualArrival?: string;
    orderStatus?: "pending_order" | "ordered" | "in_transit" | "arrived" | "installed";
    orderDetails?: {
      orderNumber?: string;
      orderDate?: string;
      orderedBy?: string;
    };
    notes?: string;
    addedBy?: string;
    addedAt?: string;
  }[];

  // Flag to indicate if this service reception has external parts
  hasExternalParts?: boolean;

  // Special Instructions
  specialInstructions: {
    fromCustomer?: string;
    fromStaff?: string;
    safetyPrecautions?: string[];
    warningNotes?: string[];
  };

  // Status and Priority
  status:
    | "received"
    | "inspected"
    | "approved"
    | "in_service"
    | "completed"
    | "ready_for_pickup";

  // Time Estimates
  estimatedServiceTime: number; // minutes
  actualServiceTime?: number;
  estimatedCompletionTime: string;

  // Submission and Approval Workflow
  submissionStatus: {
    submittedToStaff: boolean;
    submittedAt?: string;
    submittedBy?: string;
    staffReviewStatus: "pending" | "approved" | "rejected" | "needs_modification" | "partially_approved";
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
  };

  // EV Checklist Progress
  evChecklistProgress?: {
    checklistInstanceId?: string;
    totalItems: number;
    completedItems: number;
    progressPercentage: number;
    isCompleted: boolean;
    completedAt?: string;
  };

  // Timestamps
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceReceptionFormData {
  appointmentId: string;
  vehicleCondition: ServiceReception["vehicleCondition"];
  customerItems: ServiceReception["customerItems"];
  preServicePhotos?: ServiceReception["preServicePhotos"];
  diagnosticCodes?: ServiceReception["diagnosticCodes"];
  recommendedServices: ServiceReception["recommendedServices"];
  requestedParts: ServiceReception["requestedParts"];
  specialInstructions?: ServiceReception["specialInstructions"];
  estimatedServiceTime: number;
}

export interface ServiceReceptionUpdate {
  status?: ServiceReception["status"];
  vehicleCondition?: Partial<ServiceReception["vehicleCondition"]>;
  recommendedServices?: ServiceReception["recommendedServices"];
  requestedParts?: ServiceReception["requestedParts"];
  evChecklistProgress?: ServiceReception["evChecklistProgress"];
  estimatedCompletionTime?: string;
  actualServiceTime?: number;
  specialInstructions?: ServiceReception["specialInstructions"];
}

// Vietnamese translations for Service Reception
export const serviceReceptionStatusTranslations: Record<string, string> = {
  received: "Đã tiếp nhận",
  inspected: "Đã kiểm tra",
  approved: "Đã phê duyệt",
  in_service: "Đang thực hiện",
  completed: "Hoàn thành",
  ready_for_pickup: "Sẵn sàng giao xe",
};

export const vehicleConditionTranslations: Record<string, string> = {
  excellent: "Xuất sắc",
  good: "Tốt",
  fair: "Khá",
  poor: "Kém",
};

export const urgencyTranslations: Record<string, string> = {
  immediate: "Ngay lập tức",
  next_service: "Lần bảo dưỡng tiếp theo",
  future: "Tương lai",
  normal: "Bình thường",
  can_wait: "Có thể đợi",
};

export const availabilityStatusTranslations: Record<string, string> = {
  in_stock: "Còn hàng",
  order_required: "Cần đặt hàng",
  back_order: "Hết hàng tạm thời",
};
