import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      match: [
        /^\w+([-.]?\w+)*@\w+([-.]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      enum: ["service", "appointment", "parts", "warranty", "feedback", "other"],
      default: "other",
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: [{
      content: {
        type: String,
        required: true,
      },
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    readBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ assignedTo: 1, status: 1 });
contactSchema.index({ email: 1 });

// Virtual for formatted subject
contactSchema.virtual("formattedSubject").get(function () {
  const subjects = {
    service: "Service Inquiry",
    appointment: "Appointment Booking",
    parts: "Parts & Accessories",
    warranty: "Warranty Claim",
    feedback: "Feedback",
    other: "Other",
  };
  return subjects[this.subject] || "Other";
});

// Virtual for formatted status
contactSchema.virtual("formattedStatus").get(function () {
  const statuses = {
    open: "Open",
    "in-progress": "In Progress",
    closed: "Closed",
  };
  return statuses[this.status] || "Open";
});

// Virtual for time since creation
contactSchema.virtual("timeAgo").get(function () {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  return `${Math.ceil(diffDays / 30)} months ago`;
});

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;