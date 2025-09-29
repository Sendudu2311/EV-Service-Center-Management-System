// Vietnamese Parts Management Types

export interface Part {
  _id: string;
  name: string;
  partNumber: string;
  description: string;
  category: 'battery' | 'motor' | 'charging' | 'electronics' | 'body' | 'tires' | 'fluids' | 'filters' | 'other';
  brand: string;
  model?: string;
  year?: {
    from: number;
    to: number;
  };
  compatibleVehicles: {
    make: string;
    model: string;
    year?: {
      from: number;
      to: number;
    };
  }[];

  // Pricing
  pricing: {
    wholesale: number;
    retail: number;
    labor?: number;
    currency: 'VND';
  };

  // Inventory
  inventory: {
    currentStock: number;
    minimumStock: number;
    maximumStock: number;
    reservedStock: number;
    reorderPoint: number;
    lastRestocked: string;
    location: {
      warehouse: string;
      zone: string;
      shelf: string;
      bin: string;
    };
  };

  // Supplier Information
  supplier: {
    name: string;
    contact: {
      person: string;
      phone: string;
      email: string;
    };
    leadTime: number; // days
    minimumOrderQuantity: number;
    priceBreaks?: {
      quantity: number;
      price: number;
    }[];
  };

  // Technical Specifications
  specifications: {
    weight?: number; // kg
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: 'mm' | 'cm';
    };
    material?: string;
    warranty?: {
      period: number; // months
      type: 'manufacturer' | 'supplier' | 'service_center';
      terms: string;
    };
    technicalSpecs?: {
      [key: string]: string | number;
    };
  };

  // Quality and Certification
  quality: {
    certification: ('OEM' | 'OES' | 'aftermarket' | 'refurbished')[];
    qualityGrade: 'A' | 'B' | 'C';
    testReports?: string[];
    safetyDataSheet?: string;
  };

  // Metadata
  isActive: boolean;
  isObsolete: boolean;
  replacementParts?: string[]; // Part IDs
  supersededBy?: string; // Part ID
  tags: string[];
  images: string[];
  manuals: {
    name: string;
    url: string;
    type: 'installation' | 'maintenance' | 'safety';
  }[];

  createdAt: string;
  updatedAt: string;
}

export interface PartRequest {
  _id: string;
  requestNumber: string;
  type: 'initial_service' | 'additional_during_service';
  appointmentId: string;
  serviceReceptionId?: string;
  requestedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
  };

  requestedParts: {
    partId: string;
    quantity: number;
    reason: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    availableQuantity: number;
    shortfall: number;
    unitPrice?: number;
    totalPrice?: number;
    partInfo: {
      name: string;
      partNumber: string;
      category: string;
    };
  }[];

  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'fulfilled';

  reviewDetails?: {
    reviewedBy: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    reviewedAt: string;
    decision: 'approve_all' | 'approve_partial' | 'reject_insufficient_stock' | 'reject_unnecessary';
    staffNotes: string;
    alternativeParts: {
      originalPartId: string;
      alternativePartId: string;
      reason: string;
    }[];
  };

  fulfillmentInfo?: {
    fulfilledBy: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    fulfilledAt: string;
    actualPartsUsed: {
      partId: string;
      quantity: number;
      condition: 'new' | 'refurbished' | 'used';
    }[];
  };

  urgency: 'low' | 'normal' | 'high' | 'urgent';
  estimatedCost: number;
  actualCost: number;

  customerApprovalRequired: boolean;
  customerApproved: boolean;
  customerApprovalDetails?: {
    approvedBy: string;
    approvedAt: string;
    customerNotes: string;
    communicationMethod: 'phone' | 'email' | 'sms' | 'in_person';
  };

  expectedDelivery?: {
    orderDate: string;
    expectedArrival: string;
    actualArrival?: string;
    supplierInfo: {
      name: string;
      contact: string;
      orderReference: string;
    };
  };

  requestNotes?: string;
  internalNotes?: string;

  workflowHistory: {
    status: string;
    changedBy: string;
    changedAt: string;
    reason?: string;
    notes?: string;
  }[];

  createdAt: string;
  updatedAt: string;
}

export interface PartFilters {
  category?: string;
  brand?: string;
  inStock?: boolean;
  lowStock?: boolean;
  search?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  vehicleCompatibility?: {
    make: string;
    model?: string;
    year?: number;
  };
}

export interface PartRequestFilters {
  status?: string;
  urgency?: string;
  type?: string;
  appointmentId?: string;
  requestedBy?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface StockMovement {
  _id: string;
  partId: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  reason: string;
  reference?: {
    type: 'purchase_order' | 'sales_order' | 'service_order' | 'adjustment' | 'transfer';
    id: string;
    number: string;
  };
  performedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  notes?: string;
  cost?: number;
  location?: {
    from?: string;
    to?: string;
  };
  createdAt: string;
}

// Vietnamese translations
export const partCategoryTranslations: Record<string, string> = {
  'battery': 'Pin/Ắc quy',
  'motor': 'Động cơ điện',
  'charging': 'Hệ thống sạc',
  'electronics': 'Linh kiện điện tử',
  'body': 'Thân vỏ',
  'tires': 'Lốp xe',
  'fluids': 'Dung dịch/Chất lỏng',
  'filters': 'Bộ lọc',
  'other': 'Khác',
};

export const partRequestStatusTranslations: Record<string, string> = {
  'pending': 'Chờ duyệt',
  'approved': 'Đã duyệt',
  'partially_approved': 'Duyệt một phần',
  'rejected': 'Từ chối',
  'fulfilled': 'Đã thực hiện',
};

export const partRequestTypeTranslations: Record<string, string> = {
  'initial_service': 'Dịch vụ ban đầu',
  'additional_during_service': 'Phụ tùng bổ sung',
};

export const urgencyTranslations: Record<string, string> = {
  'low': 'Thấp',
  'normal': 'Bình thường',
  'high': 'Cao',
  'urgent': 'Khẩn cấp',
  'critical': 'Rất khẩn cấp',
};

export const conditionTranslations: Record<string, string> = {
  'new': 'Mới',
  'refurbished': 'Tân trang',
  'used': 'Đã qua sử dụng',
};

export const qualityGradeTranslations: Record<string, string> = {
  'A': 'Hạng A (Xuất sắc)',
  'B': 'Hạng B (Tốt)',
  'C': 'Hạng C (Khá)',
};

export const certificationTranslations: Record<string, string> = {
  'OEM': 'Nhà sản xuất gốc',
  'OES': 'Tiêu chuẩn nhà sản xuất',
  'aftermarket': 'Thị trường phụ',
  'refurbished': 'Tân trang',
};