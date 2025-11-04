import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    // serviceCenterId removed - single center architecture
    services: [
      {
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Service",
          required: false, // Changed from true to false
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        price: {
          type: Number,
          required: false, // Changed from true to false
        },
        estimatedDuration: Number, // minutes
      },
    ],
    bookingType: {
      type: String,
      enum: ["deposit_booking", "full_service"],
      default: "deposit_booking",
    },
    depositInfo: {
      amount: {
        type: Number,
        default: 200000,
      },
      paid: {
        type: Boolean,
        default: false,
      },
      paidAt: Date,
      transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VNPAYTransaction",
      },
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending", // Khách vừa đặt
        "confirmed", // Auto-confirmed when technician assigned
        "customer_arrived", // Khách đã mang xe đến
        "reception_created", // Technician đã tạo phiếu tiếp nhận
        "reception_approved", // Staff đã duyệt phiếu + parts
        "in_progress", // Đang thực hiện service
        "completed", // Hoàn thành tất cả
        "invoiced", // Đã xuất hóa đơn
        "cancelled", // Hủy bỏ
        "cancel_requested", // Khách yêu cầu hủy, chờ staff duyệt
        "cancel_approved", // Staff đã duyệt hủy, chờ xác nhận hoàn tiền
        "cancel_refunded", // Đã hoàn tiền thành công
        "no_show", // Khách không đến
      ],
      default: "pending",
    },
    // Core Status - 6 trạng thái cốt lõi cho reporting và UI đơn giản
    coreStatus: {
      type: String,
      enum: [
        "Scheduled",
        "CheckedIn",
        "InService",
        "OnHold",
        "ReadyForPickup",
        "Closed",
      ],
      required: true,
      default: "Scheduled",
    },
    // Reason code cho OnHold và Closed states
    reasonCode: {
      type: String,
      enum: [
        // OnHold reasons
        "insufficient_parts",
        "customer_decision",
        "technician_unavailable",
        "equipment_issue",
        // Closed reasons
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
      ],
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    assignedTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    estimatedCompletion: Date,
    actualCompletion: Date,
    customerNotes: String,
    internalNotes: String,
    serviceNotes: [
      {
        note: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    checklistItems: [
      {
        item: String,
        category: {
          type: String,
          enum: ["battery", "motor", "charging", "safety", "general"],
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        completedAt: Date,
        notes: String,
      },
    ],
    partsUsed: [
      {
        partId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Part",
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        unitPrice: {
          type: Number,
          required: true,
        },
        totalPrice: {
          type: Number,
          required: true,
        },
      },
    ],
    images: [
      {
        url: String,
        description: String,
        category: {
          type: String,
          enum: ["before", "during", "after", "issue", "completed"],
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "refunded"],
      default: "pending",
    },
    paymentInfo: {
      transactionRef: String,
      paymentMethod: String,
      paidAmount: Number,
      paymentDate: Date,
      vnpayTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VNPAYTransaction",
      },
    },

    // Transaction references - NEW
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
        description: "All transactions related to this appointment",
      },
    ],
    remindersSent: {
      type: Number,
      default: 0,
    },
    lastReminderSent: Date,
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      submittedAt: Date,
    },

    // Thông tin rescheduling và alternative flows
    reschedulingInfo: {
      reason: {
        type: String,
        enum: [
          "insufficient_parts",
          "customer_request",
          "technician_unavailable",
          "equipment_issue",
          "other",
        ],
      },
      originalDate: Date,
      newScheduledDate: Date,
      rescheduledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      rescheduledAt: Date,
      customerAgreed: {
        type: Boolean,
        default: false,
      },
      estimatedPartsArrival: Date,
      reschedulingNotes: String,
    },

    // References to related documents
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
    },
    serviceReceptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceReception",
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },

    // Cancel request tracking
    cancelRequest: {
      requestedAt: Date,
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reason: String,
      refundPercentage: {
        type: Number,
        default: 100,
        min: 0,
        max: 100,
      },
      refundAmount: {
        type: Number,
        description: "Calculated refund amount in VND",
      },
      baseAmount: {
        type: Number,
        description: "Base amount used for refund calculation",
      },
      // Refund method selection
      refundMethod: {
        type: String,
        enum: ["cash", "bank_transfer"],
        description: "Customer's preferred refund method",
      },
      // Customer bank information (for bank transfer)
      customerBankInfo: {
        bankName: {
          type: String,
          description: "Customer's bank name",
        },
        accountNumber: {
          type: String,
          description: "Customer's account number",
        },
        accountHolder: {
          type: String,
          description: "Account holder name",
        },
      },
      // Customer's bank proof image
      customerBankProofImage: {
        type: String,
        description: "URL to customer's bank account proof image",
      },
      // Staff approval fields
      approvedAt: Date,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      approvedNotes: String,
      // Refund processing fields
      refundProcessedAt: Date,
      refundProcessedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      refundNotes: {
        type: String,
        description: "Notes from staff when processing refund",
      },
      refundTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
        description:
          "Reference to refund transaction (updated to use Transaction model)",
      },
      // Staff's refund proof image
      refundProofImage: {
        type: String,
        description: "URL to staff's refund proof image",
      },
    },

    // Staff confirmation details
    staffConfirmation: {
      confirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      confirmedAt: Date,
      confirmationNotes: String,
      modificationsRequired: [
        {
          field: String,
          originalValue: String,
          newValue: String,
          reason: String,
        },
      ],
    },

    // Customer arrival tracking
    customerArrival: {
      arrivedAt: Date,
      receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      vehicleConditionNotes: String,
      customerItems: [
        {
          item: String,
          location: String,
          value: Number,
        },
      ],
    },

    // Workflow tracking
    workflowHistory: [
      {
        status: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        reason: String,
        notes: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Generate appointment number
appointmentSchema.pre("save", async function (next) {
  if (!this.appointmentNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      },
    });

    this.appointmentNumber = `APT${year}${month}${day}${(count + 1)
      .toString()
      .padStart(3, "0")}`;
  }
  next();
});

// Calculate total amount
appointmentSchema.methods.calculateTotal = function () {
  let total = 0;

  // Add service costs
  this.services.forEach((service) => {
    total += service.price * service.quantity;
  });

  // Add parts costs
  this.partsUsed.forEach((part) => {
    total += part.totalPrice;
  });

  // DO NOT add deposit amount to totalAmount
  // Deposit is separate and used for payment calculation (remainingAmount = totalAmount - depositAmount)
  // totalAmount should only include actual services and parts costs

  this.totalAmount = total;
  return total;
};

// State transition validation with role-based checks
appointmentSchema.methods.canTransitionTo = function (
  newStatus,
  userRole = null,
  userId = null
) {
  const allowedTransitions = {
    pending: ["confirmed", "cancelled", "no_show"],
    confirmed: ["customer_arrived", "cancelled", "rescheduled", "no_show"],
    customer_arrived: ["reception_created", "cancelled"],
    reception_created: [
      "reception_approved",
      "parts_insufficient",
      "cancelled",
    ],
    reception_approved: ["in_progress", "cancelled", "invoiced"],
    parts_insufficient: [
      "waiting_for_parts",
      "in_progress",
      "rescheduled",
      "cancelled",
    ],
    waiting_for_parts: [
      "reception_approved",
      "in_progress",
      "parts_insufficient",
      "cancelled",
      "rescheduled",
    ],
    rescheduled: ["confirmed"], // New appointment cycle
    in_progress: [
      "parts_requested",
      "parts_insufficient",
      "completed",
      "cancelled",
    ],
    parts_requested: [
      "in_progress",
      "parts_insufficient",
      "waiting_for_parts",
      "cancelled",
    ],
    completed: ["invoiced"],
    invoiced: [], // Terminal state
    cancelled: [], // Terminal state
    no_show: [], // Terminal state
  };

  // Check basic transition rules
  const isValidTransition =
    allowedTransitions[this.status]?.includes(newStatus) || false;
  if (!isValidTransition) {
    return false;
  }

  // Role-based validation
  if (userRole) {
    // Customers can only cancel their own appointments
    if (userRole === "customer") {
      return (
        newStatus === "cancelled" &&
        userId?.toString() === this.customerId?.toString()
      );
    }

    // Technicians can handle reception creation and service progression
    if (userRole === "technician") {
      const technicianTransitions = [
        "reception_created",
        "in_progress",
        "parts_requested",
        "parts_insufficient",
        "completed",
      ];
      if (technicianTransitions.includes(newStatus)) {
        // For technicians, must be assigned technician except for parts_insufficient and completed
        if (["parts_insufficient", "completed"].includes(newStatus)) {
          return true; // Any technician can mark parts insufficient or complete work
        }
        return userId?.toString() === this.assignedTechnician?.toString();
      }
    }

    // Staff and admin can handle confirmations, arrivals, approvals, and work management
    if (userRole === "staff" || userRole === "admin") {
      const staffTransitions = [
        "confirmed",
        "customer_arrived",
        "reception_approved",
        "in_progress",
        "parts_insufficient",
        "waiting_for_parts",
        "parts_requested",
        "completed",
        "cancelled",
        "rescheduled",
        "no_show",
        "invoiced",
      ];
      return staffTransitions.includes(newStatus);
    }
  }

  return true;
};

// Enhanced validation for specific transitions
appointmentSchema.methods.validateTransitionRequirements = function (
  newStatus
) {
  const requirements = {
    confirmed: () => {
      // Staff can confirm appointments without assigned technician
      // Technician assignment can happen after confirmation
      return true;
    },
    customer_arrived: () => {
      // Must be confirmed first
      return this.status === "confirmed";
    },
    reception_created: () => {
      // Must have customer arrived and assigned technician
      return this.status === "customer_arrived" && !!this.assignedTechnician;
    },
    reception_approved: () => {
      // Normal flow: Must have service reception created
      if (this.status === "reception_created") {
        return !!this.serviceReceptionId;
      }
      // Resume flow: Coming from waiting_for_parts (parts now available)
      if (this.status === "waiting_for_parts") {
        return true;
      }
      return false;
    },
    in_progress: () => {
      // Can start from multiple statuses - very flexible for parts workflow
      return [
        "reception_approved",
        "waiting_for_parts",
        "parts_insufficient",
        "parts_requested",
      ].includes(this.status);
    },
    parts_insufficient: () => {
      // Can happen during work, when parts requested, or when resuming work
      return [
        "in_progress",
        "reception_approved",
        "waiting_for_parts",
        "parts_requested",
      ].includes(this.status);
    },
    waiting_for_parts: () => {
      // Parts have been ordered/requested or marked insufficient
      return ["parts_insufficient", "parts_requested"].includes(this.status);
    },
    parts_requested: () => {
      // Can request parts during work
      return ["in_progress"].includes(this.status);
    },
    cancelled: () => {
      // Can be cancelled from most statuses (business decision)
      const cancellableStatuses = [
        "pending",
        "confirmed",
        "customer_arrived",
        "reception_created",
        "reception_approved",
        "parts_insufficient",
        "waiting_for_parts",
        "parts_requested",
        "in_progress",
      ];
      return cancellableStatuses.includes(this.status);
    },
    completed: () => {
      // Must be in progress - remove strict requirements for serviceNotes/checklistItems
      if (this.status !== "in_progress") {
        return false;
      }

      // Optional validation - completion is allowed even without notes/checklist
      // In practice, these should be filled, but we don't want to block completion for testing
      const hasServiceNotes = this.serviceNotes && this.serviceNotes.length > 0;
      const hasChecklistItems =
        this.checklistItems &&
        this.checklistItems.some((item) => item.isCompleted);

      // Allow completion but log a warning if no documentation
      if (!hasServiceNotes && !hasChecklistItems) {
        console.warn(
          `Appointment ${this._id} completed without service notes or checklist items`
        );
      }

      return true; // Allow completion from in_progress
    },
    invoiced: () => {
      // Must be completed OR reception_approved (for pre-payment flow)
      return ["completed", "reception_approved"].includes(this.status);
    },
  };

  const validator = requirements[newStatus];
  return !validator || validator();
};

// Update status with enhanced validation and history tracking
appointmentSchema.methods.updateStatus = function (
  newStatus,
  userId,
  userRole = null,
  reason = "",
  notes = ""
) {
  // Check if transition is allowed
  if (!this.canTransitionTo(newStatus, userRole, userId)) {
    throw new Error(
      `Cannot transition from ${this.status} to ${newStatus}. User role: ${userRole}`
    );
  }

  // Check business requirements
  if (!this.validateTransitionRequirements(newStatus)) {
    throw new Error(`Transition requirements not met for ${newStatus}`);
  }

  // Add to workflow history
  this.workflowHistory.push({
    status: this.status, // Previous status
    changedBy: userId,
    changedAt: new Date(),
    reason,
    notes,
  });

  // Update status
  this.status = newStatus;

  // Auto-update related fields based on status
  this.updateRelatedFields(newStatus);

  return this.save();
};

// Auto-update related fields when status changes
appointmentSchema.methods.updateRelatedFields = function (newStatus) {
  const now = new Date();

  switch (newStatus) {
    case "customer_arrived":
      if (!this.customerArrival.arrivedAt) {
        this.customerArrival.arrivedAt = now;
      }
      break;
    case "completed":
      this.actualCompletion = now;
      break;
    case "cancelled":
    case "no_show":
      // Clear any future estimated completion
      this.estimatedCompletion = undefined;
      break;
  }
};

// Check if appointment can be modified
appointmentSchema.methods.canBeModified = function () {
  const modifiableStatuses = [
    "pending",
    "confirmed",
    "customer_arrived",
    "reception_created",
  ];
  return modifiableStatuses.includes(this.status);
};

// Check if technician can start work
appointmentSchema.methods.canStartWork = function () {
  return this.status === "reception_approved";
};

// Check if appointment can be completed
appointmentSchema.methods.canBeCompleted = function () {
  return this.status === "in_progress";
};

// Check if customer can cancel appointment
appointmentSchema.methods.canBeCancelledByCustomer = function (customerId) {
  // Check if it's the right customer
  if (this.customerId.toString() !== customerId.toString()) {
    return { canCancel: false, reason: "Not your appointment" };
  }

  // Check if status allows cancellation
  const cancellableStatuses = ["pending", "confirmed"];
  if (!cancellableStatuses.includes(this.status)) {
    return {
      canCancel: false,
      reason: `Cannot cancel appointment with status: ${this.status}`,
    };
  }

  // Check if already has cancel request
  if (this.status === "cancel_requested" || this.status === "cancel_approved") {
    return {
      canCancel: false,
      reason: "Cancel request already submitted",
    };
  }

  // Calculate refund percentage based on time
  const appointmentDateTime = new Date(this.scheduledDate);
  const now = new Date();
  const timeDifference = appointmentDateTime.getTime() - now.getTime();
  const hoursUntilAppointment = timeDifference / (1000 * 60 * 60);

  let refundPercentage = 100;
  let refundMessage = "100% refund";

  if (hoursUntilAppointment < 24) {
    refundPercentage = 80;
    refundMessage = "80% refund (less than 24 hours)";
  }

  // Calculate base amount for refund calculation
  let baseAmount;
  if (this.bookingType === "deposit_booking" && this.depositInfo?.paid) {
    baseAmount = this.depositInfo.amount;
  } else {
    baseAmount = this.totalAmount;
  }

  const estimatedRefundAmount = Math.round(
    (baseAmount * refundPercentage) / 100
  );

  return {
    canCancel: true,
    hoursLeft: Math.round(hoursUntilAppointment * 10) / 10,
    refundPercentage,
    refundMessage,
    baseAmount,
    estimatedRefundAmount,
  };
};

// Check if customer can reschedule appointment
appointmentSchema.methods.canBeRescheduledByCustomer = function (customerId) {
  // Check if it's the right customer
  if (this.customerId.toString() !== customerId.toString()) {
    return { canReschedule: false, reason: "Not your appointment" };
  }

  // Check if status allows rescheduling
  const reschedulableStatuses = ["pending", "confirmed"];
  if (!reschedulableStatuses.includes(this.status)) {
    return {
      canReschedule: false,
      reason: `Cannot reschedule appointment with status: ${this.status}`,
    };
  }

  // Check time restriction - must be at least 24 hours before appointment
  const appointmentDateTime = new Date(this.scheduledDate);
  const now = new Date();
  const timeDifference = appointmentDateTime.getTime() - now.getTime();
  const hoursUntilAppointment = timeDifference / (1000 * 60 * 60);

  if (hoursUntilAppointment < 24) {
    return {
      canReschedule: false,
      reason:
        "Cannot reschedule within 24 hours of appointment. Please contact the service center.",
      hoursLeft: Math.round(hoursUntilAppointment * 10) / 10,
    };
  }

  // Check reschedule count limit (max 2 times)
  const rescheduleCount = this.reschedulingInfo?.rescheduleCount || 0;
  if (rescheduleCount >= 2) {
    return {
      canReschedule: false,
      reason:
        "Maximum reschedule limit reached (2 times). Please contact the service center.",
      rescheduleCount,
    };
  }

  return {
    canReschedule: true,
    hoursLeft: Math.round(hoursUntilAppointment * 10) / 10,
    rescheduleCount,
    remainingReschedules: 2 - rescheduleCount,
  };
};

// Get available customer actions
appointmentSchema.methods.getCustomerActions = function (customerId) {
  const cancelCheck = this.canBeCancelledByCustomer(customerId);
  const rescheduleCheck = this.canBeRescheduledByCustomer(customerId);

  return {
    canCancel: cancelCheck.canCancel,
    canReschedule: rescheduleCheck.canReschedule,
    cancelReason: cancelCheck.reason,
    rescheduleReason: rescheduleCheck.reason,
    hoursLeft: cancelCheck.hoursLeft || rescheduleCheck.hoursLeft,
    rescheduleCount: rescheduleCheck.rescheduleCount || 0,
    remainingReschedules: rescheduleCheck.remainingReschedules || 0,
  };
};

// Handle rescheduling
appointmentSchema.methods.reschedule = function (
  newDate,
  reason,
  userId,
  customerAgreed = false
) {
  // Increment reschedule count
  const currentCount = this.reschedulingInfo?.rescheduleCount || 0;

  this.reschedulingInfo = {
    reason,
    originalDate: this.reschedulingInfo?.originalDate || this.scheduledDate,
    previousDate: this.scheduledDate,
    newScheduledDate: newDate,
    rescheduledBy: userId,
    rescheduledAt: new Date(),
    customerAgreed,
    rescheduleCount: currentCount + 1,
  };

  if (customerAgreed) {
    this.scheduledDate = newDate;
    this.status = "confirmed"; // Reset to confirmed status
  } else {
    this.status = "rescheduled";
  }

  return this.save();
};

// Request cancellation
appointmentSchema.methods.requestCancellation = function (
  reason,
  userId,
  refundInfo = {}
) {
  const appointmentDateTime = new Date(this.scheduledDate);
  const now = new Date();
  const timeDifference = appointmentDateTime.getTime() - now.getTime();
  const hoursUntilAppointment = timeDifference / (1000 * 60 * 60);

  // Calculate refund percentage
  let refundPercentage = 100;
  if (hoursUntilAppointment < 24) {
    refundPercentage = 80;
  }

  // Calculate base amount for refund calculation
  let baseAmount;
  if (this.bookingType === "deposit_booking" && this.depositInfo?.paid) {
    baseAmount = this.depositInfo.amount;
  } else {
    baseAmount = this.totalAmount;
  }

  // Calculate refund amount
  const estimatedRefundAmount = Math.round(
    (baseAmount * refundPercentage) / 100
  );

  this.cancelRequest = {
    requestedAt: new Date(),
    requestedBy: userId,
    reason,
    refundPercentage,
    baseAmount, // Store base amount for refund calculation
    refundAmount: estimatedRefundAmount, // Store calculated refund amount
    // Add refund method and bank info
    refundMethod: refundInfo.refundMethod,
    customerBankInfo: refundInfo.customerBankInfo,
    customerBankProofImage: refundInfo.customerBankProofImage,
  };

  this.status = "cancel_requested";

  // Add to workflow history
  this.workflowHistory.push({
    status: this.status,
    changedBy: userId,
    changedAt: new Date(),
    reason: `Cancel requested - ${refundPercentage}% refund`,
    notes: reason,
  });

  return this.save();
};

// Approve cancellation
appointmentSchema.methods.approveCancellation = function (userId, notes = "") {
  this.cancelRequest.approvedAt = new Date();
  this.cancelRequest.approvedBy = userId;
  this.cancelRequest.approvedNotes = notes;

  this.status = "cancel_approved";

  // Add to workflow history
  this.workflowHistory.push({
    status: this.status,
    changedBy: userId,
    changedAt: new Date(),
    reason: "Cancel request approved",
    notes,
  });

  return this.save();
};

// Process refund
appointmentSchema.methods.processRefund = function (
  userId,
  refundTransactionId,
  notes = "",
  refundProofImage = ""
) {
  this.cancelRequest.refundProcessedAt = new Date();
  this.cancelRequest.refundProcessedBy = userId;
  this.cancelRequest.refundTransactionId = refundTransactionId;
  this.cancelRequest.refundProofImage = refundProofImage;
  this.cancelRequest.refundNotes = notes || ""; // Store notes from staff when processing refund

  // After successful refund, change status to cancelled
  this.status = "cancelled";

  // Add to workflow history
  this.workflowHistory.push({
    status: this.status,
    changedBy: userId,
    changedAt: new Date(),
    reason: "Refund processed successfully - appointment cancelled",
    notes: `Refund transaction: ${refundTransactionId}${
      notes ? ` - ${notes}` : ""
    }`,
  });

  return this.save();
};

// Static method để compute core status từ detailed status
appointmentSchema.statics.getCoreStatus = function (detailedStatus) {
  const mapping = {
    pending: "Scheduled",
    confirmed: "Scheduled",
    customer_arrived: "CheckedIn",
    reception_created: "CheckedIn",
    reception_approved: "InService", // Fixed: reception approved should move to InService
    in_progress: "InService",
    parts_insufficient: "OnHold",
    waiting_for_parts: "OnHold",
    parts_requested: "OnHold",
    completed: "ReadyForPickup",
    invoiced: "ReadyForPickup",
    cancelled: "Closed",
    cancel_requested: "OnHold",
    cancel_approved: "OnHold",
    cancel_refunded: "Closed",
    no_show: "Closed",
    rescheduled: "Closed",
  };
  return mapping[detailedStatus] || "Scheduled";
};

// Static method để determine reason code
appointmentSchema.statics.getReasonCode = function (
  detailedStatus,
  coreStatus
) {
  if (coreStatus === "OnHold") {
    if (
      detailedStatus === "parts_insufficient" ||
      detailedStatus === "waiting_for_parts"
    ) {
      return "insufficient_parts";
    }
    if (detailedStatus === "parts_requested") {
      return "insufficient_parts";
    }
    // Default OnHold reason
    return "insufficient_parts";
  }

  if (coreStatus === "Closed") {
    if (detailedStatus === "completed" || detailedStatus === "invoiced") {
      return "completed";
    }
    if (detailedStatus === "cancelled") {
      return "cancelled";
    }
    if (detailedStatus === "cancel_refunded") {
      return "cancelled";
    }
    if (detailedStatus === "no_show") {
      return "no_show";
    }
    if (detailedStatus === "rescheduled") {
      return "rescheduled";
    }
  }

  return null; // No reason code needed for other states
};

// Pre-save middleware để auto-update coreStatus và reasonCode
appointmentSchema.pre("save", function () {
  // Auto-compute coreStatus từ detailed status
  this.coreStatus = this.constructor.getCoreStatus(this.status);

  // Auto-set reasonCode cho OnHold và Closed states
  this.reasonCode = this.constructor.getReasonCode(
    this.status,
    this.coreStatus
  );
});

// Indexes for performance optimization (appointmentNumber already has unique index from schema)
appointmentSchema.index({ customerId: 1, scheduledDate: -1 });
appointmentSchema.index({ serviceCenterId: 1, status: 1 });
appointmentSchema.index({ assignedTechnician: 1, status: 1 });
appointmentSchema.index({ status: 1, scheduledDate: 1 });
appointmentSchema.index({ "workflowHistory.changedAt": -1 });
appointmentSchema.index({ coreStatus: 1, reasonCode: 1 });

export default mongoose.model("Appointment", appointmentSchema);
