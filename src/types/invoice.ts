// Vietnamese Invoice System Types

export interface InvoiceServiceItem {
  serviceId: string;
  serviceName: string;
  description?: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  technicianId?: string;
  timeSpent?: number; // minutes
  isAdditionalService: boolean;
}

export interface InvoicePartItem {
  partId: string;
  partName: string;
  partNumber: string;
  brand?: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isWarrantyItem: boolean;
  warrantyPeriod?: number; // months
}

export interface LaborCharges {
  standardLabor: {
    hours: number;
    rate: number;
    amount: number;
  };
  overtimeLabor: {
    hours: number;
    rate: number;
    amount: number;
  };
  totalLaborHours: number;
  totalLaborCost: number;
}

export interface AdditionalCharge {
  description: string;
  amount: number;
  type:
    | "fee"
    | "discount"
    | "tax"
    | "environmental_fee"
    | "disposal_fee"
    | "other";
  isPercentage: boolean;
  applyTo: "services" | "parts" | "labor" | "subtotal";
}

export interface InvoiceTotals {
  subtotalServices: number;
  subtotalParts: number;
  subtotalLabor: number;
  subtotalAdditional: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}

export interface PaymentInfo {
  method:
    | "cash"
    | "card"
    | "bank_transfer"
    | "e_wallet"
    | "cheque"
    | "installment";
  status: "unpaid" | "partially_paid" | "paid" | "overdue" | "refunded";
  dueDate?: string;
  paidAmount: number;
  remainingAmount: number;
  paymentDate?: string;
  transactionRef?: string;
  paymentNotes?: string;
  installmentPlan?: {
    totalInstallments: number;
    installmentAmount: number;
    paidInstallments: number;
    nextDueDate?: string;
  };
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  taxId?: string; // For business customers
}

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  mileage: number;
}

export interface InvoiceTerms {
  paymentTerms: string;
  warrantyTerms?: string;
  additionalTerms: string[];
}

export interface DigitalSignature {
  hash: string;
  signedBy: string;
  signedAt: string;
  isValid: boolean;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  appointmentId: string;
  serviceReceptionId?: string;
  customerId: string;
  vehicleId: string;
  transactions: string[]; // Array of transaction IDs
  // serviceCenterId removed - single center architecture

  // Invoice Items
  serviceItems: InvoiceServiceItem[];
  partItems: InvoicePartItem[];
  laborCharges: LaborCharges;
  additionalCharges: AdditionalCharge[];

  // Totals
  totals: InvoiceTotals;

  // Payment Information
  paymentInfo: PaymentInfo;

  // Customer and Vehicle Info (snapshot)
  customerInfo: CustomerInfo;
  vehicleInfo: VehicleInfo;

  // Invoice Metadata
  generatedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  approvedAt?: string;

  sentToCustomer: boolean;
  sentAt?: string;
  sentVia: "email" | "sms" | "print" | "portal";

  customerViewed: boolean;
  customerViewedAt?: string;

  // Notes and Terms
  notes?: string;
  internalNotes?: string;
  customerNotes?: string;
  terms: InvoiceTerms;

  // Status
  status:
    | "draft"
    | "pending_approval"
    | "approved"
    | "sent"
    | "viewed"
    | "paid"
    | "overdue"
    | "cancelled"
    | "refunded";

  // Revision Tracking
  revisionNumber: number;
  originalInvoiceId?: string;
  revisionReason?: string;

  // Digital Signature
  digitalSignature?: DigitalSignature;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFormData {
  appointmentId: string;
  serviceReceptionId?: string;
  customerId: string;
  vehicleId: string;
  // serviceCenterId removed - single center architecture
  serviceItems: InvoiceServiceItem[];
  partItems: InvoicePartItem[];
  laborCharges: LaborCharges;
  additionalCharges: AdditionalCharge[];
  paymentInfo: Partial<PaymentInfo>;
  notes?: string;
  internalNotes?: string;
  customerNotes?: string;
  terms: InvoiceTerms;
}

export interface PaymentData {
  amount: number;
  method: PaymentInfo["method"];
  transactionRef?: string;
  notes?: string;
}

export interface InvoiceFilters {
  status?: string;
  paymentStatus?: string;
  customerId?: string;
  // serviceCenterId removed - single center architecture
  dateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  search?: string;
}

// Vietnamese translations
export const invoiceStatusTranslations: Record<string, string> = {
  draft: "Bản nháp",
  pending_approval: "Chờ phê duyệt",
  approved: "Đã phê duyệt",
  sent: "Đã gửi",
  viewed: "Đã xem",
  paid: "Đã thanh toán",
  overdue: "Quá hạn",
  cancelled: "Đã hủy",
  refunded: "Đã hoàn tiền",
};

export const paymentMethodTranslations: Record<string, string> = {
  cash: "Tiền mặt",
  card: "Thẻ ngân hàng",
  bank_transfer: "Chuyển khoản",
  e_wallet: "Ví điện tử",
  cheque: "Séc",
  installment: "Trả góp",
};

export const paymentStatusTranslations: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  partially_paid: "Thanh toán một phần",
  paid: "Đã thanh toán",
  overdue: "Quá hạn",
  refunded: "Đã hoàn tiền",
};

export const additionalChargeTypeTranslations: Record<string, string> = {
  fee: "Phí dịch vụ",
  discount: "Giảm giá",
  tax: "Thuế",
  environmental_fee: "Phí môi trường",
  disposal_fee: "Phí xử lý",
  other: "Khác",
};

// Vietnamese VAT rate
export const VIETNAMESE_VAT_RATE = 10;

// Default payment terms in Vietnamese
export const DEFAULT_PAYMENT_TERMS = "Thanh toán ngay khi nhận hóa đơn";

// Default warranty terms
export const DEFAULT_WARRANTY_TERMS = "Bảo hành theo quy định của nhà sản xuất";

// Invoice number format: INV241218001 (INV + YYMMDD + sequence)
export const generateInvoiceNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const sequence = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `INV${year}${month}${day}${sequence}`;
};

// Format invoice number for display: INV-24/12/18-001
export const formatInvoiceNumber = (invoiceNumber: string): string => {
  if (invoiceNumber.match(/^INV\d{9}$/)) {
    const year = invoiceNumber.slice(3, 5);
    const month = invoiceNumber.slice(5, 7);
    const day = invoiceNumber.slice(7, 9);
    const sequence = invoiceNumber.slice(9);

    return `INV-${year}/${month}/${day}-${sequence}`;
  }

  return invoiceNumber;
};
