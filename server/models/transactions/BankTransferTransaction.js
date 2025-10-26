import mongoose from "mongoose";
import Transaction from "../Transaction.js";

// Bank Transfer Transaction Schema - extends base Transaction
const bankTransferTransactionSchema = new mongoose.Schema(
  {
    // Bank transfer specific data
    bankTransferData: {
      bankName: {
        type: String,
        required: true,
        description: "Name of the bank used for transfer",
      },
      bankCode: {
        type: String,
        description: "Bank code",
      },
      transferRef: {
        type: String,
        required: true,
        description: "Bank transfer reference number",
      },
      accountNumber: {
        type: String,
        description: "Account number (masked)",
      },
      accountHolder: {
        type: String,
        description: "Account holder name",
      },
      transferDate: {
        type: Date,
        description: "Date when the transfer was made",
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        description: "Staff member who verified the transfer",
      },
      verifiedAt: {
        type: Date,
        description: "When the transfer was verified",
      },
      verificationMethod: {
        type: String,
        enum: [
          "bank_statement",
          "sms_confirmation",
          "online_banking",
          "phone_verification",
          "other",
        ],
        description: "Method used to verify the transfer",
      },
      verificationNotes: {
        type: String,
        description: "Notes about the verification process",
      },
      receiptImage: {
        type: String,
        description: "URL to receipt/screenshot image",
      },
      notes: {
        type: String,
        description: "Additional notes about the bank transfer",
      },
    },
  },
  {
    discriminatorKey: "transactionType",
  }
);

// Create indexes for bank transfer transactions
bankTransferTransactionSchema.index({
  "bankTransferData.verifiedBy": 1,
  createdAt: -1,
});
bankTransferTransactionSchema.index({ "bankTransferData.transferRef": 1 });
bankTransferTransactionSchema.index({ "bankTransferData.bankName": 1 });
bankTransferTransactionSchema.index({ "bankTransferData.transferDate": 1 });

// Method to record bank transfer
bankTransferTransactionSchema.methods.recordBankTransfer = function (
  transferData
) {
  this.status = "completed";
  this.bankTransferData.bankName = transferData.bankName;
  this.bankTransferData.bankCode = transferData.bankCode;
  this.bankTransferData.transferRef = transferData.transferRef;
  this.bankTransferData.accountNumber = transferData.accountNumber;
  this.bankTransferData.accountHolder = transferData.accountHolder;
  this.bankTransferData.transferDate = transferData.transferDate;
  this.bankTransferData.verifiedBy = transferData.verifiedBy;
  this.bankTransferData.verifiedAt = new Date();
  this.bankTransferData.verificationMethod = transferData.verificationMethod;
  this.bankTransferData.verificationNotes = transferData.verificationNotes;
  this.bankTransferData.receiptImage = transferData.receiptImage;
  this.bankTransferData.notes = transferData.notes;
  this.paidAmount = this.amount;
  this.processedBy = transferData.verifiedBy;
  this.processedAt = new Date();
  this.updatedAt = new Date();

  return this.save();
};

// Method to verify bank transfer
bankTransferTransactionSchema.methods.verifyTransfer = function (
  verificationData
) {
  this.bankTransferData.verifiedBy = verificationData.verifiedBy;
  this.bankTransferData.verifiedAt = new Date();
  this.bankTransferData.verificationMethod =
    verificationData.verificationMethod;
  this.bankTransferData.verificationNotes = verificationData.verificationNotes;
  this.bankTransferData.receiptImage = verificationData.receiptImage;
  this.status = "completed";
  this.processedBy = verificationData.verifiedBy;
  this.processedAt = new Date();
  this.updatedAt = new Date();

  return this.save();
};

// Method to generate transfer reference
bankTransferTransactionSchema.statics.generateTransferRef = function () {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const timestamp = Date.now().toString().slice(-6);

  return `TRF${year}${month}${day}${timestamp}`;
};

// Method to mask account number
bankTransferTransactionSchema.methods.maskAccountNumber = function (
  accountNumber
) {
  if (!accountNumber || accountNumber.length < 4) return "****";
  return "****" + accountNumber.slice(-4);
};

// Pre-save middleware to auto-generate transfer reference
bankTransferTransactionSchema.pre("save", function (next) {
  if (this.isNew && !this.bankTransferData.transferRef) {
    this.bankTransferData.transferRef = this.constructor.generateTransferRef();
  }
  next();
});

// Create BankTransferTransaction discriminator
const BankTransferTransaction = Transaction.discriminator(
  "bank_transfer",
  bankTransferTransactionSchema
);

export default BankTransferTransaction;
