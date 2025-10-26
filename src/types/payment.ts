export interface PaymentConfirmationData {
  paymentMethod: "bank_transfer" | "cash";
  amount: number;
  paymentDate: string;
  proofImage: File;
  // Bank Transfer specific
  transferRef?: string;
  bankName?: string;
  // Cash specific
  notes?: string;
}

export interface PaymentMethod {
  id: "bank_transfer" | "cash";
  name: string;
  description: string;
  icon: string;
}

export interface PaymentProof {
  file: File;
  preview: string;
  uploaded: boolean;
  url?: string;
}

export interface PaymentConfirmationFormData {
  paymentMethod: "bank_transfer" | "cash";
  amount: string;
  paymentDate: string;
  proofImage: File | null;
  // Bank Transfer specific
  transferRef: string;
  bankName: string;
  // Cash specific
  notes: string;
}

export interface PaymentConfirmationResponse {
  success: boolean;
  message: string;
  data: {
    appointment: {
      _id: string;
      appointmentNumber: string;
      status: string;
      paymentStatus: string;
    };
    invoice: {
      _id: string;
      invoiceNumber: string;
      status: string;
      totalAmount: number;
    };
    transaction: {
      _id: string;
      transactionRef: string;
      transactionType: string;
      amount: number;
    };
  };
}
