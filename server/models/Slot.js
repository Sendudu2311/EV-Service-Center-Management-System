import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    technicianIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Track appointments for each technician in this slot
    technicianAppointments: [
      {
        technicianId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        appointmentIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
          },
        ],
        currentWorkload: {
          type: Number,
          default: 0,
        },
        maxCapacity: {
          type: Number,
          default: 1,
        },
      },
    ],
    // Date and time fields for appointment form compatibility
    date: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
    capacity: {
      type: Number,
      default: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["available", "partially_booked", "full", "blocked"],
      default: "available",
    },
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

slotSchema.methods.canBook = function () {
  return this.status === "available" || this.status === "partially_booked";
};

slotSchema.methods.book = function () {
  if (this.bookedCount + 1 >= this.capacity) {
    this.bookedCount = this.capacity;
    this.status = "full";
  } else {
    this.bookedCount += 1;
    this.status = "partially_booked";
  }
  return this.save();
};

slotSchema.methods.release = function () {
  this.bookedCount = Math.max(0, this.bookedCount - 1);
  if (this.bookedCount === 0) this.status = "available";
  else this.status = "partially_booked";
  return this.save();
};

// Method to initialize technicianAppointments if not exists
slotSchema.methods.initializeTechnicianAppointments = async function () {
  if (
    !this.technicianAppointments ||
    this.technicianAppointments.length === 0
  ) {
    console.log(
      `🔧 [initializeTechnicianAppointments] Initializing for slot ${this._id}`
    );
    this.technicianAppointments = this.technicianIds.map((technicianId) => ({
      technicianId: technicianId,
      appointmentIds: [],
      currentWorkload: 0,
      maxCapacity: 1, // Default capacity
    }));

    // Save to database
    await this.save();
    console.log(`✅ [initializeTechnicianAppointments] Saved to database`);
  }
  return this;
};

// Method to check if a technician is available in this slot
slotSchema.methods.isTechnicianAvailable = async function (technicianId) {
  // First check if technician is in technicianIds array
  const isInTechnicianIds = this.technicianIds.some(
    (id) => id.toString() === technicianId.toString()
  );

  if (!isInTechnicianIds) {
    return false;
  }

  // Initialize technicianAppointments if not exists
  await this.initializeTechnicianAppointments();

  const technicianSlot = this.technicianAppointments.find(
    (ta) => ta.technicianId.toString() === technicianId.toString()
  );

  if (!technicianSlot) {
    // If technician is in technicianIds but not in technicianAppointments,
    // assume they are available (new technician not yet tracked)
    return true;
  }

  console.log(`🔍 [isTechnicianAvailable] Technician ${technicianId}:`, {
    currentWorkload: technicianSlot.currentWorkload,
    maxCapacity: technicianSlot.maxCapacity,
    isAvailable: technicianSlot.currentWorkload < technicianSlot.maxCapacity,
  });

  return technicianSlot.currentWorkload < technicianSlot.maxCapacity;
};

// Method to get available technicians for this slot
slotSchema.methods.getAvailableTechnicians = function () {
  return this.technicianAppointments
    .filter((ta) => ta.currentWorkload < ta.maxCapacity)
    .map((ta) => ta.technicianId);
};

// ==============================================================================
// OPTIMIZED TECHNICIAN AVAILABILITY CHECK FOR SLOT - DISABLED
// ==============================================================================
// This method checks if a technician is available in a specific time slot
// It considers both slot capacity and technician's personal workload capacity
// COMMENTED OUT TO DISABLE WORKLOAD CHECKING

// OPTIMIZED: Method to check technician availability without technicianAppointments
// slotSchema.methods.isTechnicianAvailableOptimized = async function (
//   technicianId
// ) {
//   // 1. CHECK IF TECHNICIAN IS ASSIGNED TO THIS SLOT
//   // Verify technician is in the slot's technicianIds array
//   const isInTechnicianIds = this.technicianIds.some(
//     (id) => id.toString() === technicianId.toString()
//   );

//   if (!isInTechnicianIds) {
//     return false;
//   }

//   // 2. CHECK SLOT CAPACITY
//   // First check if the entire slot has available capacity
//   if (this.bookedCount >= this.capacity) {
//     console.log(
//       `🔍 [isTechnicianAvailableOptimized] Slot ${this._id} is at full capacity (${this.bookedCount}/${this.capacity})`
//     );
//     return false;
//   }

//   // 3. COUNT CURRENT APPOINTMENTS FOR THIS TECHNICIAN
//   // Count how many appointments this technician already has in this slot
//   const Appointment = (await import("./Appointment.js")).default;
//   const currentAppointments = await Appointment.countDocuments({
//     slotId: this._id,
//     assignedTechnician: technicianId,
//     status: { $in: ["confirmed", "in_progress"] },
//   });

//   // 4. GET TECHNICIAN PROFILE FOR PERSONAL CAPACITY
//   // Get technician's personal workload capacity from their profile
//   const TechnicianProfile = (await import("./TechnicianProfile.js")).default;
//   const technicianProfile = await TechnicianProfile.findOne({
//     technicianId: technicianId,
//   });

//   // 5. CALCULATE TECHNICIAN CAPACITY IN THIS SLOT
//   // If slot has multiple technicians, distribute REMAINING capacity equally
//   const totalTechnicians = this.technicianIds.length;
//   const slotCapacity = this.capacity;
//   const remainingCapacity = slotCapacity - this.bookedCount;

//   // If no remaining capacity, technician is not available
//   if (remainingCapacity <= 0) {
//     return false;
//   }

//   // Each technician gets equal share of REMAINING capacity
//   // But if remaining capacity < total technicians, only some technicians are available
//   const technicianSlotCapacity = Math.floor(
//     remainingCapacity / totalTechnicians
//   );

//   // 6. HANDLE REMAINING SLOTS DISTRIBUTION
//   // If technician gets 0 capacity from slot distribution, check if they can take remaining slots
//   let maxCapacity = technicianSlotCapacity;

//   // If this technician gets 0 from distribution but there are remaining slots,
//   // they might still be available (first-come-first-served)
//   if (technicianSlotCapacity === 0 && remainingCapacity > 0) {
//     // Check if this technician is among the first ones who can take remaining slots
//     const technicianIndex = this.technicianIds.findIndex(
//       (id) => id.toString() === technicianId.toString()
//     );

//     // Only allow technicians with index < remainingCapacity to be available
//     // This ensures only the first N technicians are available for remaining slots
//     if (technicianIndex < remainingCapacity) {
//       maxCapacity = 1; // This technician can take 1 remaining slot
//     } else {
//       maxCapacity = 0; // This technician is not available for remaining slots
//     }
//   }

//   // 7. RESPECT TECHNICIAN'S PERSONAL CAPACITY
//   // Also respect technician's personal capacity from their profile
//   const technicianPersonalCapacity = technicianProfile?.workload?.capacity || 1;
//   maxCapacity = Math.min(maxCapacity, technicianPersonalCapacity);

//   // 8. LOGGING FOR DEBUGGING
//   console.log(
//     `🔍 [isTechnicianAvailableOptimized] Technician ${technicianId}:`,
//     {
//       slotBookedCount: this.bookedCount,
//       slotCapacity,
//       remainingCapacity,
//       currentAppointments,
//       totalTechnicians,
//       technicianSlotCapacity,
//       technicianIndex: this.technicianIds.findIndex(
//         (id) => id.toString() === technicianId.toString()
//       ),
//       technicianPersonalCapacity,
//       maxCapacity,
//       isAvailable: currentAppointments < maxCapacity,
//     }
//   );

//   // 9. FINAL AVAILABILITY CHECK
//   // Technician is available if their current appointments < max capacity
//   return currentAppointments < maxCapacity;
// };

// ==============================================================================
// GET AVAILABLE TECHNICIANS OPTIMIZED - SIMPLIFIED (NO WORKLOAD CHECK)
// ==============================================================================
// This method gets available technicians for a slot without workload checking
// Returns all technicians assigned to the slot

slotSchema.methods.getAvailableTechniciansOptimized = async function () {
  const availableTechnicians = [];

  // If slot is at full capacity, return empty array
  if (this.bookedCount >= this.capacity) {
    console.log(
      `🔍 [getAvailableTechniciansOptimized] Slot ${this._id} is at full capacity (${this.bookedCount}/${this.capacity}), returning empty array`
    );
    return [];
  }

  const Appointment = (await import("./Appointment.js")).default;

  for (const technicianId of this.technicianIds) {
    // Count current appointments for this technician in this slot
    // Include all active appointment statuses that should block technician availability
    // Statuses: confirmed, customer_arrived, reception_created, reception_approved, in_progress
    // These are all statuses where technician is still actively assigned to the appointment
    const appointmentCount = await Appointment.countDocuments({
      slotId: this._id,
      assignedTechnician: technicianId,
      status: {
        $in: [
          "confirmed", // Appointment confirmed, technician assigned
          "customer_arrived", // Customer arrived, technician still assigned
          "reception_created", // Reception created, technician still assigned
          "reception_approved", // Reception approved, technician still assigned
          "in_progress", // Work in progress, technician actively working
        ],
      },
    });

    console.log(
      `🔍 [getAvailableTechniciansOptimized] Technician ${technicianId}: appointmentCount=${appointmentCount}, slotBookedCount=${this.bookedCount}, slotCapacity=${this.capacity}`
    );

    // Calculate remaining capacity in slot
    const remainingCapacity = this.capacity - this.bookedCount;

    // Skip technician if:
    // 1. Slot has no remaining capacity, OR
    // 2. Technician already has an appointment in this slot
    if (remainingCapacity <= 0 || appointmentCount > 0) {
      console.log(
        `⏭️ [getAvailableTechniciansOptimized] Skipping technician ${technicianId} - remainingCapacity=${remainingCapacity}, appointmentCount=${appointmentCount}`
      );
      continue;
    }

    // Get technician profile data
    const TechnicianProfile = (await import("./TechnicianProfile.js")).default;
    const technicianProfile = await TechnicianProfile.findOne({
      technicianId: technicianId,
    }).populate("technicianId", "firstName lastName email phone");

    if (technicianProfile && technicianProfile.technicianId) {
      availableTechnicians.push({
        _id: technicianId,
        firstName: technicianProfile.technicianId.firstName,
        lastName: technicianProfile.technicianId.lastName,
        email: technicianProfile.technicianId.email,
        phone: technicianProfile.technicianId.phone,
        specializations: technicianProfile.specializations || [],
      });
    } else {
      // Fallback: just add the ID
      availableTechnicians.push({
        _id: technicianId,
        firstName: "Unknown",
        lastName: "Technician",
        email: "",
        phone: "",
        specializations: [],
      });
    }
  }

  console.log(
    `✅ [getAvailableTechniciansOptimized] Found ${availableTechnicians.length} available technicians for slot ${this._id}`
  );

  return availableTechnicians;
};

// OPTIMIZED: Method to get technician workload in slot
slotSchema.methods.getTechnicianWorkloadInSlot = async function (technicianId) {
  const Appointment = (await import("./Appointment.js")).default;
  // Include all active appointment statuses that count towards technician workload
  const appointments = await Appointment.find({
    slotId: this._id,
    assignedTechnician: technicianId,
    status: {
      $in: [
        "confirmed", // Appointment confirmed, technician assigned
        "customer_arrived", // Customer arrived, technician still assigned
        "reception_created", // Reception created, technician still assigned
        "reception_approved", // Reception approved, technician still assigned
        "in_progress", // Work in progress, technician actively working
      ],
    },
  }).select("_id status scheduledDate");

  // Calculate technician capacity in this slot (same logic as isTechnicianAvailableOptimized)
  const totalTechnicians = this.technicianIds.length;
  const slotCapacity = this.capacity;
  const remainingCapacity = slotCapacity - this.bookedCount;

  // If no remaining capacity, technician has 0 capacity
  if (remainingCapacity <= 0) {
    return {
      technicianId,
      currentWorkload: appointments.length,
      maxCapacity: 0,
      slotCapacity: slotCapacity,
      remainingCapacity: remainingCapacity,
      technicianSlotCapacity: 0,
      appointments: appointments.map((apt) => ({
        id: apt._id,
        status: apt.status,
        scheduledDate: apt.scheduledDate,
      })),
    };
  }

  // Each technician gets equal share of REMAINING capacity
  const technicianSlotCapacity = Math.floor(
    remainingCapacity / totalTechnicians
  );

  // If technician gets 0 capacity from slot distribution, check if they can take remaining slots
  let maxCapacity = technicianSlotCapacity;

  // If this technician gets 0 from distribution but there are remaining slots,
  // they might still be available (first-come-first-served)
  if (technicianSlotCapacity === 0 && remainingCapacity > 0) {
    // Check if this technician is among the first ones who can take remaining slots
    const technicianIndex = this.technicianIds.findIndex(
      (id) => id.toString() === technicianId.toString()
    );

    // Only allow technicians with index < remainingCapacity to be available
    // This ensures only the first N technicians are available for remaining slots
    if (technicianIndex < remainingCapacity) {
      maxCapacity = 1; // This technician can take 1 remaining slot
    } else {
      maxCapacity = 0; // This technician is not available for remaining slots
    }
  }

  // Get technician profile for personal capacity
  const TechnicianProfile = (await import("./TechnicianProfile.js")).default;
  const technicianProfile = await TechnicianProfile.findOne({
    technicianId: technicianId,
  });

  const technicianPersonalCapacity = technicianProfile?.workload?.capacity || 1;
  maxCapacity = Math.min(maxCapacity, technicianPersonalCapacity);

  return {
    technicianId,
    currentWorkload: appointments.length,
    maxCapacity: maxCapacity,
    slotCapacity: slotCapacity,
    remainingCapacity: remainingCapacity,
    technicianSlotCapacity: technicianSlotCapacity,
    appointments: appointments.map((apt) => ({
      id: apt._id,
      status: apt.status,
      scheduledDate: apt.scheduledDate,
    })),
  };
};

// Method to assign appointment to technician in this slot
slotSchema.methods.assignAppointmentToTechnician = async function (
  technicianId,
  appointmentId
) {
  // Initialize technicianAppointments if not exists
  await this.initializeTechnicianAppointments();

  const technicianSlot = this.technicianAppointments.find(
    (ta) => ta.technicianId.toString() === technicianId.toString()
  );

  if (!technicianSlot) {
    throw new Error("Technician not found in this slot");
  }

  if (technicianSlot.currentWorkload >= technicianSlot.maxCapacity) {
    throw new Error("Technician is at full capacity in this slot");
  }

  technicianSlot.appointmentIds.push(appointmentId);
  technicianSlot.currentWorkload += 1;

  // Update overall slot status
  this.bookedCount += 1;
  if (this.bookedCount >= this.capacity) {
    this.status = "full";
  } else {
    this.status = "partially_booked";
  }

  return this.save();
};

// Method to remove appointment from technician in this slot
slotSchema.methods.removeAppointmentFromTechnician = function (
  technicianId,
  appointmentId
) {
  const technicianSlot = this.technicianAppointments.find(
    (ta) => ta.technicianId.toString() === technicianId.toString()
  );

  if (!technicianSlot) {
    throw new Error("Technician not found in this slot");
  }

  technicianSlot.appointmentIds = technicianSlot.appointmentIds.filter(
    (id) => id.toString() !== appointmentId.toString()
  );
  technicianSlot.currentWorkload = Math.max(
    0,
    technicianSlot.currentWorkload - 1
  );

  // Update overall slot status
  this.bookedCount = Math.max(0, this.bookedCount - 1);
  if (this.bookedCount === 0) {
    this.status = "available";
  } else {
    this.status = "partially_booked";
  }

  return this.save();
};

// Compound unique index to prevent duplicate slots for same time period
slotSchema.index({ date: 1, startTime: 1, endTime: 1 }, { unique: true });
slotSchema.index({ technicianIds: 1, date: 1, startTime: 1 });
slotSchema.index({ start: 1, end: 1 });
slotSchema.index({ technicianIds: 1, start: 1, end: 1 });

export default mongoose.model("Slot", slotSchema);
