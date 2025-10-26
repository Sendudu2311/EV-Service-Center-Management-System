import mongoose from "mongoose";
import Transaction from "../Transaction.js";

// Cash Transaction Schema - extends base Transaction
const cashTransactionSchema = new mongoose.Schema(
  {
    // Cash specific data
    cashData: {
      receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        description: "Staff member who received the cash payment",
      },
      receiptNumber: {
        type: String,
        description: "Receipt number for the cash payment",
      },
      receivedAt: {
        type: Date,
        default: Date.now,
        description: "When the cash was received",
      },
      denomination: {
        type: Object,
        description: "Breakdown of cash denominations received",
        default: {},
      },
      changeGiven: {
        type: Number,
        default: 0,
        description: "Change given to customer",
      },
      notes: {
        type: String,
        description: "Additional notes about the cash transaction",
      },
      receiptImage: {
        type: String,
        description: "URL to receipt/proof image",
      },
    },
  },
  {
    discriminatorKey: "transactionType",
  }
);

// Create indexes for cash transactions
cashTransactionSchema.index({ "cashData.receivedBy": 1, createdAt: -1 });
cashTransactionSchema.index({ "cashData.receiptNumber": 1 });
cashTransactionSchema.index({ "cashData.receivedAt": 1 });

// Method to record cash payment
cashTransactionSchema.methods.recordCashPayment = function (cashData) {
  this.status = "completed";
  this.cashData.receivedBy = cashData.receivedBy;
  this.cashData.receiptNumber = cashData.receiptNumber;
  this.cashData.denomination = cashData.denomination || {};
  this.cashData.changeGiven = cashData.changeGiven || 0;
  this.cashData.notes = cashData.notes;
  this.cashData.receivedAt = new Date();
  this.paidAmount = this.amount;
  this.processedBy = cashData.receivedBy;
  this.processedAt = new Date();
  this.updatedAt = new Date();

  return this.save();
};

// Method to generate receipt number
cashTransactionSchema.statics.generateReceiptNumber = function () {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const timestamp = Date.now().toString().slice(-6);

  return `CASH${year}${month}${day}${timestamp}`;
};

// Method to calculate denomination breakdown
cashTransactionSchema.methods.calculateDenomination = function (amount) {
  const denominations = [
    500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000,
  ];
  const breakdown = {};
  let remaining = amount;

  for (const denom of denominations) {
    const count = Math.floor(remaining / denom);
    if (count > 0) {
      breakdown[denom] = count;
      remaining -= count * denom;
    }
  }

  return breakdown;
};

// Pre-save middleware to auto-generate receipt number
cashTransactionSchema.pre("save", function (next) {
  if (this.isNew && !this.cashData.receiptNumber) {
    this.cashData.receiptNumber = this.constructor.generateReceiptNumber();
  }
  next();
});

// Create CashTransaction discriminator
const CashTransaction = Transaction.discriminator(
  "cash",
  cashTransactionSchema
);

export default CashTransaction;
