import mongoose from "mongoose";

const vnpayTransactionSchema = new mongoose.Schema(
  {
    // Core transaction identifiers
    transactionRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
      description: "Unique transaction reference (vnp_TxnRef)",
    },
    transactionNo: {
      type: String,
      description: "VNPay transaction number (vnp_TransactionNo)",
    },

    // Payment type and purpose
    paymentType: {
      type: String,
      required: true,
      enum: ["appointment", "invoice", "service", "refund", "other"],
      description: "Type of payment being made",
    },
    orderInfo: {
      type: String,
      required: true,
      description: "Payment description/order information (vnp_OrderInfo)",
    },
    orderType: {
      type: String,
      default: "other",
      description: "Order type classification (vnp_OrderType)",
    },

    // Related entities
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      description: "User who made the payment",
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
    // serviceCenterId removed - single center architecture

    // Payment amounts
    amount: {
      type: Number,
      required: true,
      min: 0,
      description: "Original payment amount in VND",
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

    // Payment status
    status: {
      type: String,
      required: true,
      enum: [
        "pending", // Initial state, payment URL created
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
    responseCode: {
      type: String,
      description: "VNPay response code (vnp_ResponseCode)",
    },

    // VNPay specific data
    vnpayData: {
      bankCode: {
        type: String,
        description: "Bank code used for payment",
      },
      cardType: {
        type: String,
        description: "Card type used",
      },
      payDate: {
        type: String,
        description: "VNPay payment date (vnp_PayDate format)",
      },
      paymentDate: {
        type: Date,
        description: "Actual payment completion date",
      },
      secureHash: {
        type: String,
        description: "VNPay secure hash for verification",
      },
      ipAddr: {
        type: String,
        description: "Client IP address",
      },
      locale: {
        type: String,
        default: "vn",
        description: "Payment interface language",
      },
      version: {
        type: String,
        default: "2.1.0",
        description: "VNPay API version",
      },
      command: {
        type: String,
        default: "pay",
        description: "VNPay command type",
      },
    },

    // Billing information
    billingInfo: {
      mobile: String,
      email: String,
      fullName: String,
      address: String,
    },

    // Error handling
    errorMessage: {
      type: String,
      description: "Error message if payment failed",
    },
    errorCode: {
      type: String,
      description: "Specific error code from VNPay or system",
    },

    // Additional metadata
    metadata: {
      appointmentData: {
        type: Object,
        description: "Original appointment data for payment tracking",
      },
      returnUrl: String,
      userAgent: String,
      referer: String,
      additionalNotes: String,
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
      description: "Payment expiration time",
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
  },
  {
    timestamps: true,
    collection: "vnpay_transactions",
  }
);

// Create compound indexes for common queries
vnpayTransactionSchema.index({ userId: 1, createdAt: -1 });
vnpayTransactionSchema.index({ status: 1, createdAt: -1 });
vnpayTransactionSchema.index({ paymentType: 1, status: 1 });
vnpayTransactionSchema.index({ appointmentId: 1 });
vnpayTransactionSchema.index({ invoiceId: 1 });
vnpayTransactionSchema.index({ "vnpayData.payDate": 1 });

// Virtual for formatted amount
vnpayTransactionSchema.virtual("formattedAmount").get(function () {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(this.amount);
});

// Virtual for transaction duration
vnpayTransactionSchema.virtual("duration").get(function () {
  if (this.vnpayData.paymentDate && this.createdAt) {
    return this.vnpayData.paymentDate - this.createdAt;
  }
  return null;
});

// Method to update payment status
vnpayTransactionSchema.methods.updateStatus = function (
  newStatus,
  additionalData = {}
) {
  this.status = newStatus;
  this.updatedAt = new Date();

  if (newStatus === "completed" && !this.vnpayData.paymentDate) {
    this.vnpayData.paymentDate = new Date();
  }

  // Merge additional data
  Object.assign(this, additionalData);

  return this.save();
};

// Method to handle payment failure
vnpayTransactionSchema.methods.handleFailure = function (
  responseCode,
  errorMessage
) {
  this.status = "failed";
  this.responseCode = responseCode;
  this.errorMessage = errorMessage;
  this.updatedAt = new Date();
  return this.save();
};

// Method to check if transaction is expired
vnpayTransactionSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Static method to find expired transactions
vnpayTransactionSchema.statics.findExpired = function () {
  return this.find({
    status: { $in: ["pending", "processing"] },
    expiresAt: { $lt: new Date() },
  });
};

// Static method to get transaction statistics
vnpayTransactionSchema.statics.getStatistics = function (dateRange = {}) {
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

// Pre-save middleware to set expiration (15 minutes from creation)
vnpayTransactionSchema.pre("save", function (next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }
  next();
});

const VNPAYTransaction = mongoose.model(
  "VNPAYTransaction",
  vnpayTransactionSchema
);

export default VNPAYTransaction;
