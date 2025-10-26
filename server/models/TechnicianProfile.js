import mongoose from "mongoose";

const technicianProfileSchema = new mongoose.Schema(
  {
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    workShift: {
      type: {
        type: String,
        enum: ["morning", "afternoon", "night", "flexible"],
        default: "flexible",
      },
      startTime: {
        type: String,
        required: true,
        default: "08:00",
      },
      endTime: {
        type: String,
        required: true,
        default: "17:00",
      },
      daysOfWeek: [
        {
          type: String,
          enum: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
        },
      ],
      breakTime: {
        start: String,
        end: String,
        duration: {
          type: Number,
          default: 60, // minutes
        },
      },
    },
    workingHours: {
      weeklyLimit: {
        type: Number,
        default: 40,
      },
      currentWeekHours: {
        type: Number,
        default: 0,
      },
      overtime: {
        type: Number,
        default: 0,
      },
      lastWeekReset: {
        type: Date,
        default: Date.now,
      },
    },
    performance: {
      completedJobs: {
        type: Number,
        default: 0,
      },
      averageCompletionTime: {
        type: Number,
        default: 0, // minutes
      },
      qualityRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      customerRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      efficiency: {
        type: Number,
        min: 0,
        max: 100,
        default: 0, // percentage
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    availability: {
      status: {
        type: String,
        enum: [
          "available",
          "busy",
          "break",
          "offline",
          "sick_leave",
          "vacation",
        ],
        default: "available",
      },
      currentAppointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
      },
      scheduleNotes: String,
      lastStatusUpdate: {
        type: Date,
        default: Date.now,
      },
      autoStatusChange: {
        type: Boolean,
        default: true,
      },
    },
    skillMatrix: [
      {
        serviceCategory: {
          type: String,
          enum: [
            "battery",
            "motor",
            "charging",
            "electronics",
            "body",
            "general",
            "diagnostic",
          ],
          required: true,
        },
        proficiencyLevel: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
        lastAssessment: {
          type: Date,
          default: Date.now,
        },
        trainingNeeded: {
          type: Boolean,
          default: false,
        },
        certificationRequired: {
          type: Boolean,
          default: false,
        },
      },
    ],
    workload: {
      current: {
        type: Number,
        default: 0,
      },
      capacity: {
        type: Number,
        default: 8, // appointments per day
      },
      queuedAppointments: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Appointment",
        },
      ],
      estimatedWorkHours: {
        type: Number,
        default: 0,
      },
    },
    certificationTracking: {
      renewalReminders: [
        {
          certificationName: String,
          renewalDate: Date,
          reminderSent: {
            type: Boolean,
            default: false,
          },
          daysBeforeReminder: {
            type: Number,
            default: 30,
          },
        },
      ],
      trainingHours: {
        completed: {
          type: Number,
          default: 0,
        },
        required: {
          type: Number,
          default: 40, // per year
        },
        currentYear: {
          type: Number,
          default: new Date().getFullYear(),
        },
      },
      mandatoryTraining: [
        {
          name: String,
          completed: {
            type: Boolean,
            default: false,
          },
          completedDate: Date,
          expiryDate: Date,
        },
      ],
    },
    preferences: {
      preferredServiceTypes: [
        {
          type: String,
          enum: [
            "battery",
            "motor",
            "charging",
            "electronics",
            "body",
            "general",
            "diagnostic",
          ],
        },
      ],
      workloadPreference: {
        type: String,
        enum: ["light", "moderate", "heavy"],
        default: "moderate",
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
    },
    tools: [
      {
        name: String,
        serialNumber: String,
        assignedDate: Date,
        condition: {
          type: String,
          enum: ["excellent", "good", "fair", "needs_replacement"],
          default: "good",
        },
        lastMaintenance: Date,
        nextMaintenance: Date,
      },
    ],
    statistics: {
      totalAppointments: {
        type: Number,
        default: 0,
      },
      appointmentsThisMonth: {
        type: Number,
        default: 0,
      },
      appointmentsThisWeek: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
      },
      onTimeCompletionRate: {
        type: Number,
        default: 100, // percentage
      },
      lastStatUpdate: {
        type: Date,
        default: Date.now,
      },
    },
    yearsExperience: {
      type: Number,
      min: 0,
      max: 50,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying (technicianId and employeeId already have unique indexes from schema)
technicianProfileSchema.index({ "availability.status": 1 });
technicianProfileSchema.index({ "skillMatrix.serviceCategory": 1 });
technicianProfileSchema.index({ "workload.current": 1 });

// Virtual for current workload percentage
technicianProfileSchema.virtual("workloadPercentage").get(function () {
  return this.workload.capacity > 0
    ? (this.workload.current / this.workload.capacity) * 100
    : 0;
});

// Virtual for skill level average
technicianProfileSchema.virtual("averageSkillLevel").get(function () {
  if (this.skillMatrix.length === 0) return 0;
  const total = this.skillMatrix.reduce(
    (sum, skill) => sum + skill.proficiencyLevel,
    0
  );
  return total / this.skillMatrix.length;
});

// Method to update performance metrics
technicianProfileSchema.methods.updatePerformanceMetrics = async function (
  appointmentData
) {
  const completionTime =
    appointmentData.actualCompletion - appointmentData.scheduledDate;
  const completionTimeMinutes = Math.floor(completionTime / (1000 * 60));

  // Update completion statistics
  this.performance.completedJobs += 1;

  // Update average completion time
  const totalTime =
    this.performance.averageCompletionTime *
    (this.performance.completedJobs - 1);
  this.performance.averageCompletionTime = Math.floor(
    (totalTime + completionTimeMinutes) / this.performance.completedJobs
  );

  // Update customer rating if provided
  if (appointmentData.feedback && appointmentData.feedback.rating) {
    const currentTotal =
      this.performance.customerRating * (this.performance.completedJobs - 1);
    this.performance.customerRating =
      (currentTotal + appointmentData.feedback.rating) /
      this.performance.completedJobs;
  }

  this.performance.lastUpdated = new Date();

  return this.save();
};

// ==============================================================================
// TECHNICIAN AVAILABILITY CHECK METHOD - DISABLED
// ==============================================================================
// This method performs comprehensive availability checks for a technician
// before assigning them to a new appointment
// COMMENTED OUT TO DISABLE WORKLOAD CHECKING

// Method to check technician availability for appointment
// technicianProfileSchema.methods.isAvailableForAppointment = function (
//   scheduledDate,
//   estimatedDuration
// ) {
//   // 1. CHECK BASIC AVAILABILITY STATUS
//   // Ensure technician is in 'available' or 'busy' status
//   // Exclude: 'offline', 'sick_leave', 'vacation', 'break'
//   if (!["available", "busy"].includes(this.availability.status)) {
//     return false;
//   }

//   // 2. CHECK WORKLOAD CAPACITY
//   // Verify technician hasn't exceeded their daily appointment capacity
//   // workload.current = current number of appointments
//   // workload.capacity = maximum appointments per day (default: 8)
//   if (this.workload.current >= this.workload.capacity) {
//     return false;
//   }

//   // 3. CHECK WORKING HOURS/DAYS
//   // Ensure appointment is scheduled on technician's working days
//   const appointmentDay = scheduledDate
//     .toLocaleDateString("en-US", { weekday: "long" })
//     .toLowerCase();
//   if (!this.workShift.daysOfWeek.includes(appointmentDay)) {
//     return false;
//   }

//   // 4. ADDITIONAL CHECKS
//   // Additional time slot checking would be done in the controller
//   // This includes conflict checking with existing appointments
//   return true;
// };

// ==============================================================================
// WORKLOAD MANAGEMENT METHODS - DISABLED
// ==============================================================================
// These methods handle workload tracking when appointments are assigned/completed
// COMMENTED OUT TO DISABLE WORKLOAD MANAGEMENT

// Method to assign appointment to technician
technicianProfileSchema.methods.assignAppointment = function (appointmentId) {
  // Increment current workload count
  this.workload.current += 1;
  // Add appointment to queued appointments list
  this.workload.queuedAppointments.push(appointmentId);

  // Update availability status if technician was available
  if (this.availability.status === "available") {
    this.availability.status = "busy";
    this.availability.currentAppointment = appointmentId;
    this.availability.lastStatusUpdate = new Date();
  }

  return this.save();
};

// Method to complete appointment
technicianProfileSchema.methods.completeAppointment = function (appointmentId) {
  // Decrement current workload count (ensure it doesn't go below 0)
  this.workload.current = Math.max(0, this.workload.current - 1);
  // Remove appointment from queued appointments list
  this.workload.queuedAppointments = this.workload.queuedAppointments.filter(
    (id) => !id.equals(appointmentId)
  );

  // If this was the current appointment, update status
  if (
    this.availability.currentAppointment &&
    this.availability.currentAppointment.equals(appointmentId)
  ) {
    this.availability.currentAppointment = null;
    // Set status to 'busy' if still has other appointments, otherwise 'available'
    this.availability.status = this.workload.current > 0 ? "busy" : "available";
    this.availability.lastStatusUpdate = new Date();
  }

  // Update statistics
  this.statistics.totalAppointments += 1;
  this.statistics.appointmentsThisMonth += 1;
  this.statistics.appointmentsThisWeek += 1;
  this.statistics.lastStatUpdate = new Date();

  return this.save();
};

// Method to reset weekly hours (run weekly via cron job)
technicianProfileSchema.methods.resetWeeklyHours = function () {
  this.workingHours.currentWeekHours = 0;
  this.workingHours.overtime = 0;
  this.workingHours.lastWeekReset = new Date();
  this.statistics.appointmentsThisWeek = 0;

  return this.save();
};

// Method to reset monthly statistics (run monthly via cron job)
technicianProfileSchema.methods.resetMonthlyStats = function () {
  this.statistics.appointmentsThisMonth = 0;

  return this.save();
};

export default mongoose.model("TechnicianProfile", technicianProfileSchema);
