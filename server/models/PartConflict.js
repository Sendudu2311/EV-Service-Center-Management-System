import mongoose from "mongoose";

const partConflictSchema = new mongoose.Schema({
  conflictNumber: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },
  partId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Part",
    required: true,
  },
  partName: {
    type: String,
    required: true,
  },
  partNumber: {
    type: String,
    required: true,
  },
  availableStock: {
    type: Number,
    required: true,
    min: 0,
  },
  totalRequested: {
    type: Number,
    required: true,
    min: 0,
  },
  shortfall: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ["pending", "resolved", "auto_resolved"],
    default: "pending",
    index: true,
  },
  conflictingRequests: [
    {
      requestId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "conflictingRequests.requestType",
      },
      requestType: {
        type: String,
        enum: ["ServiceReception", "PartRequest"],
        required: true,
      },
      appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
        required: true,
      },
      appointmentNumber: {
        type: String,
        required: true,
      },
      requestedQuantity: {
        type: Number,
        required: true,
        min: 1,
      },
      priority: {
        type: String,
        enum: ["low", "normal", "high", "urgent"],
        default: "normal",
      },
      scheduledDate: {
        type: Date,
        required: true,
      },
      scheduledTime: {
        type: String,
        required: true,
      },
      requestedAt: {
        type: Date,
        required: true,
      },
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      technicianId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      autoApproved: {
        type: Boolean,
        default: false,
      },
      status: {
        type: String,
        enum: ["pending", "approved", "deferred", "rejected"],
        default: "pending",
      },
      resolutionNotes: String,
    },
  ],
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  resolvedAt: {
    type: Date,
  },
  resolutionNotes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient querying
partConflictSchema.index({ partId: 1, status: 1 });
partConflictSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware to update updatedAt
partConflictSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Generate conflict number
partConflictSchema.statics.generateConflictNumber = async function () {
  const count = await this.countDocuments();
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const sequence = String(count + 1).padStart(4, "0");
  return `CF-${year}${month}${day}-${sequence}`;
};

// Method to mark conflict as resolved
partConflictSchema.methods.resolve = function (resolvedBy, notes) {
  this.status = "resolved";
  this.resolvedBy = resolvedBy;
  this.resolvedAt = new Date();
  this.resolutionNotes = notes;
  return this.save();
};

const PartConflict = mongoose.model("PartConflict", partConflictSchema);

export default PartConflict;
