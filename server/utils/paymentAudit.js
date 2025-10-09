import mongoose from "mongoose";

/**
 * Payment audit logging utility
 * Tracks all payment-related activities for compliance and debugging
 */

// Create a separate collection for payment audits
const paymentAuditSchema = new mongoose.Schema(
  {
    transactionRef: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    action: {
      type: String,
      required: true,
      enum: [
        "payment_initiated",
        "payment_success",
        "payment_failed",
        "payment_refunded",
        "payment_verified",
        "appointment_created",
        "email_sent",
        "notification_sent",
        "error_occurred",
      ],
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "VND",
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["vnpay", "cash", "bank_transfer", "credit_card"],
    },
    status: {
      type: String,
      required: true,
      enum: ["success", "failed", "pending", "cancelled"],
    },
    details: {
      vnpayTransaction: {
        transactionNo: String,
        responseCode: String,
        bankCode: String,
        cardType: String,
        payDate: String,
      },
      errorMessage: String,
      ipAddress: String,
      userAgent: String,
      sessionId: String,
    },
    metadata: {
      serviceCenterId: mongoose.Schema.Types.ObjectId,
      services: [
        {
          serviceId: mongoose.Schema.Types.ObjectId,
          serviceName: String,
          quantity: Number,
          price: Number,
        },
      ],
      customerInfo: {
        firstName: String,
        lastName: String,
        email: String,
        phone: String,
      },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
paymentAuditSchema.index({ transactionRef: 1, action: 1 });
paymentAuditSchema.index({ userId: 1, timestamp: -1 });
paymentAuditSchema.index({ status: 1, timestamp: -1 });
paymentAuditSchema.index({ paymentMethod: 1, timestamp: -1 });

const PaymentAudit = mongoose.model("PaymentAudit", paymentAuditSchema);

/**
 * Log payment initiation
 */
export const logPaymentInitiated = async (data) => {
  try {
    const audit = new PaymentAudit({
      transactionRef: data.transactionRef,
      userId: data.userId,
      appointmentId: data.appointmentId,
      action: "payment_initiated",
      amount: data.amount,
      paymentMethod: data.paymentMethod || "vnpay",
      status: "pending",
      details: {
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
      },
      metadata: data.metadata,
    });

    await audit.save();
    console.log("✅ Payment initiated logged:", data.transactionRef);
    return audit;
  } catch (error) {
    console.error("❌ Failed to log payment initiated:", error);
    return null;
  }
};

/**
 * Log payment success
 */
export const logPaymentSuccess = async (data) => {
  try {
    const audit = new PaymentAudit({
      transactionRef: data.transactionRef,
      userId: data.userId,
      appointmentId: data.appointmentId,
      invoiceId: data.invoiceId,
      action: "payment_success",
      amount: data.amount,
      paymentMethod: data.paymentMethod || "vnpay",
      status: "success",
      details: {
        vnpayTransaction: data.vnpayTransaction,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
      metadata: data.metadata,
    });

    await audit.save();
    console.log("✅ Payment success logged:", data.transactionRef);
    return audit;
  } catch (error) {
    console.error("❌ Failed to log payment success:", error);
    return null;
  }
};

/**
 * Log payment failure
 */
export const logPaymentFailed = async (data) => {
  try {
    const audit = new PaymentAudit({
      transactionRef: data.transactionRef,
      userId: data.userId,
      appointmentId: data.appointmentId,
      action: "payment_failed",
      amount: data.amount,
      paymentMethod: data.paymentMethod || "vnpay",
      status: "failed",
      details: {
        errorMessage: data.errorMessage,
        vnpayTransaction: data.vnpayTransaction,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
      metadata: data.metadata,
    });

    await audit.save();
    console.log("✅ Payment failure logged:", data.transactionRef);
    return audit;
  } catch (error) {
    console.error("❌ Failed to log payment failure:", error);
    return null;
  }
};

/**
 * Log email notification sent
 */
export const logEmailSent = async (data) => {
  try {
    const audit = new PaymentAudit({
      transactionRef: data.transactionRef,
      userId: data.userId,
      appointmentId: data.appointmentId,
      action: "email_sent",
      amount: data.amount,
      paymentMethod: data.paymentMethod || "vnpay",
      status: "success",
      details: {
        emailType: data.emailType,
        recipientEmail: data.recipientEmail,
        ipAddress: data.ipAddress,
      },
      metadata: data.metadata,
    });

    await audit.save();
    console.log("✅ Email sent logged:", data.transactionRef);
    return audit;
  } catch (error) {
    console.error("❌ Failed to log email sent:", error);
    return null;
  }
};

/**
 * Log notification sent
 */
export const logNotificationSent = async (data) => {
  try {
    const audit = new PaymentAudit({
      transactionRef: data.transactionRef,
      userId: data.userId,
      appointmentId: data.appointmentId,
      action: "notification_sent",
      amount: data.amount,
      paymentMethod: data.paymentMethod || "vnpay",
      status: "success",
      details: {
        notificationType: data.notificationType,
        recipientId: data.recipientId,
        channel: data.channel,
      },
      metadata: data.metadata,
    });

    await audit.save();
    console.log("✅ Notification sent logged:", data.transactionRef);
    return audit;
  } catch (error) {
    console.error("❌ Failed to log notification sent:", error);
    return null;
  }
};

/**
 * Log error occurrence
 */
export const logError = async (data) => {
  try {
    const audit = new PaymentAudit({
      transactionRef: data.transactionRef,
      userId: data.userId,
      appointmentId: data.appointmentId,
      action: "error_occurred",
      amount: data.amount || 0,
      paymentMethod: data.paymentMethod || "vnpay",
      status: "failed",
      details: {
        errorMessage: data.errorMessage,
        errorStack: data.errorStack,
        errorCode: data.errorCode,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
      metadata: data.metadata,
    });

    await audit.save();
    console.log("✅ Error logged:", data.transactionRef);
    return audit;
  } catch (error) {
    console.error("❌ Failed to log error:", error);
    return null;
  }
};

/**
 * Get payment audit trail for a transaction
 */
export const getPaymentAuditTrail = async (transactionRef) => {
  try {
    const audits = await PaymentAudit.find({ transactionRef })
      .sort({ timestamp: 1 })
      .populate("userId", "firstName lastName email")
      .populate("appointmentId", "appointmentNumber")
      .populate("invoiceId", "invoiceNumber");

    return audits;
  } catch (error) {
    console.error("❌ Failed to get payment audit trail:", error);
    return [];
  }
};

/**
 * Get payment statistics
 */
export const getPaymentStatistics = async (startDate, endDate) => {
  try {
    const matchStage = {
      $match: {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    };

    const stats = await PaymentAudit.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          successfulPayments: {
            $sum: {
              $cond: [{ $eq: ["$status", "success"] }, 1, 0],
            },
          },
          failedPayments: {
            $sum: {
              $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
            },
          },
          averageAmount: { $avg: "$amount" },
        },
      },
    ]);

    return (
      stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        averageAmount: 0,
      }
    );
  } catch (error) {
    console.error("❌ Failed to get payment statistics:", error);
    return null;
  }
};

export default PaymentAudit;
