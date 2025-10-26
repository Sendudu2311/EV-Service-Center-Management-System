// Transaction Types for EV Service Center Management System

export type TransactionType =
  | "vnpay"
  | "cash"
  | "card"
  | "bank_transfer"
  | "momo"
  | "zalopay";

export type PaymentPurpose =
  | "appointment_deposit"
  | "appointment_payment"
  | "invoice_payment"
  | "service_payment"
  | "refund"
  | "deposit_booking"
  | "other";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded"
  | "disputed";

export type CardType =
  | "visa"
  | "mastercard"
  | "amex"
  | "jcb"
  | "unionpay"
  | "other";

export type VerificationMethod =
  | "bank_statement"
  | "sms_confirmation"
  | "online_banking"
  | "phone_verification"
  | "other";

// Base Transaction Interface
export interface BaseTransaction {
  _id: string;
  transactionRef: string;
  transactionType: TransactionType;
  paymentPurpose: PaymentPurpose;
  userId: string;
  appointmentId?: string;
  invoiceId?: string;
  amount: number;
  paidAmount: number;
  currency: string;
  status: TransactionStatus;
  processedBy?: string;
  processedAt?: string;
  errorMessage?: string;
  errorCode?: string;
  metadata: Record<string, any>;
  billingInfo: {
    mobile?: string;
    email?: string;
    fullName?: string;
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  settlementInfo: {
    settled: boolean;
    settlementDate?: string;
    settlementAmount?: number;
    settlementReference?: string;
  };
  notes?: string;
  customerNotes?: string;
}

// VNPay Transaction Interface
export interface VNPayTransaction extends BaseTransaction {
  transactionType: "vnpay";
  vnpayData: {
    bankCode?: string;
    cardType?: string;
    payDate?: string;
    paymentDate?: string;
    secureHash?: string;
    ipAddr?: string;
    locale: string;
    version: string;
    command: string;
    transactionNo?: string;
    responseCode?: string;
  };
}

// Cash Transaction Interface
export interface CashTransaction extends BaseTransaction {
  transactionType: "cash";
  cashData: {
    receivedBy: string;
    receiptNumber: string;
    receivedAt: string;
    denomination: Record<string, number>;
    changeGiven: number;
    notes?: string;
  };
}

// Card Transaction Interface
export interface CardTransaction extends BaseTransaction {
  transactionType: "card";
  cardData: {
    cardType: CardType;
    last4Digits: string;
    authCode?: string;
    transactionId?: string;
    processedBy: string;
    processedAt: string;
    terminalId?: string;
    merchantId?: string;
    batchNumber?: string;
    referenceNumber: string;
    notes?: string;
  };
}

// Bank Transfer Transaction Interface
export interface BankTransferTransaction extends BaseTransaction {
  transactionType: "bank_transfer";
  bankTransferData: {
    bankName: string;
    bankCode?: string;
    transferRef: string;
    accountNumber?: string;
    accountHolder?: string;
    transferDate?: string;
    verifiedBy?: string;
    verifiedAt?: string;
    verificationMethod?: VerificationMethod;
    verificationNotes?: string;
    receiptImage?: string;
    notes?: string;
  };
}

// Union type for all transaction types
export type Transaction =
  | VNPayTransaction
  | CashTransaction
  | CardTransaction
  | BankTransferTransaction;

// Transaction Creation Data Types
export interface CreateTransactionData {
  userId: string;
  appointmentId?: string;
  invoiceId?: string;
  amount: number;
  paymentPurpose: PaymentPurpose;
  billingInfo?: {
    mobile?: string;
    email?: string;
    fullName?: string;
    address?: string;
  };
  notes?: string;
  customerNotes?: string;
  metadata?: Record<string, any>;
}

export interface CreateVNPayTransactionData extends CreateTransactionData {
  vnpayData: {
    bankCode?: string;
    ipAddr?: string;
    locale?: string;
    version?: string;
    command?: string;
    payDate?: string;
  };
}

export interface CreateCashTransactionData extends CreateTransactionData {
  cashData: {
    receivedBy: string;
    denomination?: Record<string, number>;
    changeGiven?: number;
    notes?: string;
  };
}

export interface CreateCardTransactionData extends CreateTransactionData {
  cardData: {
    cardType: CardType;
    last4Digits: string;
    authCode?: string;
    transactionId?: string;
    terminalId?: string;
    merchantId?: string;
    batchNumber?: string;
    notes?: string;
  };
}

export interface CreateBankTransferTransactionData
  extends CreateTransactionData {
  bankTransferData: {
    bankName: string;
    bankCode?: string;
    transferRef?: string;
    accountNumber?: string;
    accountHolder?: string;
    transferDate?: string;
    verificationMethod?: VerificationMethod;
    verificationNotes?: string;
    receiptImage?: string;
    notes?: string;
  };
}

// API Request/Response Types
export interface TransactionListResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface TransactionResponse {
  success: boolean;
  data: {
    transaction: Transaction;
  };
}

export interface TransactionStatisticsResponse {
  success: boolean;
  data: {
    statistics: Array<{
      status: string;
      count: number;
      totalAmount: number;
      avgAmount: number;
    }>;
  };
}

// Filter and Query Types
export interface TransactionFilters {
  page?: number;
  limit?: number;
  transactionType?: TransactionType;
  status?: TransactionStatus;
  paymentPurpose?: PaymentPurpose;
  userId?: string;
  appointmentId?: string;
  invoiceId?: string;
  startDate?: string;
  endDate?: string;
}

export interface TransactionStatisticsFilters {
  startDate?: string;
  endDate?: string;
}

// Payment Recording Types
export interface RecordPaymentData {
  method: TransactionType;
  amount: number;
  userId: string;
  billingInfo?: {
    mobile?: string;
    email?: string;
    fullName?: string;
    address?: string;
  };
  notes?: string;
  customerNotes?: string;
  transactionData: Record<string, any>;
}

export interface RefundData {
  amount?: number;
  reason: string;
  customerNotes?: string;
}

// Transaction Service Types
export interface TransactionServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ProcessPaymentResponse {
  transaction: Transaction;
  invoice: any; // Invoice type
  isFullPayment: boolean;
}

export interface ProcessRefundResponse {
  refundTransaction: Transaction;
}

// UI Component Props Types
export interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export interface TransactionItemProps {
  transaction: Transaction;
  onView?: (transaction: Transaction) => void;
  onRefund?: (transaction: Transaction) => void;
  showActions?: boolean;
}

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transaction: Transaction) => void;
  invoiceId?: string;
  appointmentId?: string;
  userId?: string;
  amount?: number;
}

export interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  onReset: () => void;
}

// Utility Types
export type TransactionWithPopulatedFields = Transaction & {
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  appointmentId?: {
    _id: string;
    appointmentNumber: string;
    scheduledDate: string;
  };
  invoiceId?: {
    _id: string;
    invoiceNumber: string;
  };
  processedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
};

// Form Data Types
export interface CashPaymentFormData {
  amount: number;
  denomination: Record<string, number>;
  changeGiven: number;
  notes: string;
  customerNotes: string;
}

export interface CardPaymentFormData {
  amount: number;
  cardType: CardType;
  last4Digits: string;
  authCode: string;
  transactionId: string;
  terminalId: string;
  merchantId: string;
  batchNumber: string;
  notes: string;
  customerNotes: string;
}

export interface BankTransferPaymentFormData {
  amount: number;
  bankName: string;
  bankCode: string;
  transferRef: string;
  accountNumber: string;
  accountHolder: string;
  transferDate: string;
  verificationMethod: VerificationMethod;
  verificationNotes: string;
  receiptImage: string;
  notes: string;
  customerNotes: string;
}
