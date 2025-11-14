import mongoose from "mongoose";

// Base Transaction Schema - Common fields for all transaction types
const transactionSchema = new mongoose.Schema(
  {
    // Core transaction identifiers
    transactionRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
      description: "Unique transaction reference",
    },

    // Transaction type discriminator
    transactionType: {
      type: String,
      required: true,
      enum: ["vnpay", "cash", "card", "bank_transfer", "momo", "zalopay"],
      index: true,
      description: "Type of transaction/payment method",
    },

    // Payment purpose and context
    paymentPurpose: {
      type: String,
      required: true,
      enum: [
        "appointment_deposit",
        "appointment_payment",
        "invoice_payment",
        "service_payment",
        "refund",
        "deposit_booking",
        "other",
      ],
      description: "Purpose of the payment",
    },

    // Related entities
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      description: "Customer who made the payment",
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      description: "Related appointment (if applicable)",
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      description: "Related invoice (if applicable)",
    },

    // Payment amounts
    amount: {
      type: Number,
      required: true,
      min: 0,
      description: "Transaction amount in VND",
    },
    paidAmount: {
      type: Number,
      default: 0,
      description: "Actual amount paid (may differ from requested amount)",
    },
    currency: {
      type: String,
      default: "VND",
      description: "Payment currency",
    },

    // Transaction status
    status: {
      type: String,
      required: true,
      enum: [
        "pending", // Initial state
        "processing", // Payment initiated, awaiting response
        "completed", // Payment successful
        "failed", // Payment failed
        "cancelled", // Payment cancelled by user
        "expired", // Payment expired
        "refunded", // Payment refunded
        "disputed", // Payment disputed
      ],
      default: "pending",
      index: true,
    },

    // Staff processing information (for offline payments)
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      description: "Staff member who processed the payment",
    },
    processedAt: {
      type: Date,
      description: "When the payment was processed",
    },

    // Error handling
    errorMessage: {
      type: String,
      description: "Error message if transaction failed",
    },
    errorCode: {
      type: String,
      description: "Specific error code",
    },

    // Additional metadata
    metadata: {
      type: Object,
      description: "Additional transaction-specific data",
      default: {},
    },

    // Billing information
    billingInfo: {
      mobile: String,
      email: String,
      fullName: String,
      address: String,
    },

    // Audit timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      description: "Transaction expiration time",
    },

    // Settlement information
    settlementInfo: {
      settled: {
        type: Boolean,
        default: false,
      },
      settlementDate: Date,
      settlementAmount: Number,
      settlementReference: String,
    },

    // Notes and comments
    notes: {
      type: String,
      description: "Internal notes about the transaction",
    },
    customerNotes: {
      type: String,
      description: "Customer notes or comments",
    },
  },
  {
    timestamps: true,
    collection: "transactions",
  }
);

// Create compound indexes for common queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ transactionType: 1, status: 1 });
transactionSchema.index({ appointmentId: 1 });
transactionSchema.index({ invoiceId: 1 });
transactionSchema.index({ paymentPurpose: 1, status: 1 });

// Virtual for formatted amount
transactionSchema.virtual("formattedAmount").get(function () {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(this.amount);
});

// Virtual for transaction duration
transactionSchema.virtual("duration").get(function () {
  if (this.processedAt && this.createdAt) {
    return this.processedAt - this.createdAt;
  }
  return null;
});

// Method to update transaction status
transactionSchema.methods.updateStatus = function (
  newStatus,
  additionalData = {}
) {
  this.status = newStatus;
  this.updatedAt = new Date();

  if (newStatus === "completed" && !this.processedAt) {
    this.processedAt = new Date();
  }

  // Handle nested fields with dot notation
  Object.keys(additionalData).forEach((key) => {
    if (key.includes(".")) {
      // Handle dot notation for nested fields
      const keys = key.split(".");
      let current = this;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = additionalData[key];
    } else {
      // Direct assignment for top-level fields
      this[key] = additionalData[key];
    }
  });

  // Auto-set paidAmount when transaction is completed
  // If paidAmount is not explicitly provided and status is completed, set it to the transaction amount
  if (newStatus === "completed" && !additionalData.paidAmount && (this.paidAmount === 0 || this.paidAmount === undefined || this.paidAmount === null)) {
    this.paidAmount = this.amount;
    console.log(`🔄 [Transaction.updateStatus] Auto-setting paidAmount to ${this.amount} for transaction ${this.transactionRef}`);
  }

  return this.save();
};

// Method to handle transaction failure
transactionSchema.methods.handleFailure = function (errorCode, errorMessage) {
  this.status = "failed";
  this.errorCode = errorCode;
  this.errorMessage = errorMessage;
  this.updatedAt = new Date();
  return this.save();
};

// Method to check if transaction is expired
transactionSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Static method to find expired transactions
transactionSchema.statics.findExpired = function () {
  return this.find({
    status: { $in: ["pending", "processing"] },
    expiresAt: { $lt: new Date() },
  });
};

// Static method to get transaction statistics
transactionSchema.statics.getStatistics = function (dateRange = {}) {
  const matchStage = {};

  if (dateRange.startDate && dateRange.endDate) {
    matchStage.createdAt = {
      $gte: new Date(dateRange.startDate),
      $lte: new Date(dateRange.endDate),
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        avgAmount: { $avg: "$amount" },
      },
    },
    {
      $project: {
        status: "$_id",
        count: 1,
        totalAmount: 1,
        avgAmount: { $round: ["$avgAmount", 2] },
        _id: 0,
      },
    },
  ]);
};

// Static method to get transactions by type
transactionSchema.statics.getByType = function (transactionType, filters = {}) {
  return this.find({ transactionType, ...filters });
};

// Static method to get user transactions
transactionSchema.statics.getUserTransactions = function (
  userId,
  filters = {}
) {
  return this.find({ userId, ...filters }).sort({ createdAt: -1 });
};

// Pre-save middleware to set expiration (15 minutes from creation for online payments)
transactionSchema.pre("save", function (next) {
  if (this.isNew && !this.expiresAt && this.transactionType !== "cash") {
    this.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }
  next();
});

// Create the base Transaction model
const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
