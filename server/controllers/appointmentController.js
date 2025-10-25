import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Vehicle from "../models/Vehicle.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import TechnicianProfile from "../models/TechnicianProfile.js";
import Slot from "../models/Slot.js";
import {
  vietnamDateTimeToUTC,
  utcToVietnamDateTime,
  roundToSlotBoundary,
} from "../utils/timezone.js";
import { sendEmail } from "../utils/email.js";
import { generateRefundNotificationTemplate } from "../utils/emailTemplates.js";

// @desc    Check if vehicle has pending appointments
// @route   GET /api/appointments/vehicle-status/:vehicleId
// @access  Private
export const checkVehicleBookingStatus = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const userId = req.user?._id;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID is required",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Check if vehicle belongs to user
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      customerId: userId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found or not owned by user",
      });
    }

    // Pending statuses - appointment is still active
    const pendingStatuses = [
      "pending",
      "confirmed",
      "customer_arrived",
      "reception_created",
      "reception_approved",
      "parts_insufficient",
      "waiting_for_parts",
      "in_progress",
      "parts_requested",
      "cancel_requested",
      "cancel_approved",
    ];

    // Check for pending appointments
    const pendingAppointments = await Appointment.find({
      vehicleId: vehicleId,
      status: { $in: pendingStatuses },
    }).select(
      "appointmentNumber scheduledDate scheduledTime status coreStatus"
    );

    const hasPendingAppointments = pendingAppointments.length > 0;

    res.json({
      success: true,
      data: {
        vehicleId,
        vehicleInfo: {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          vin: vehicle.vin,
        },
        hasPendingAppointments,
        pendingAppointments: hasPendingAppointments ? pendingAppointments : [],
        message: hasPendingAppointments
          ? "Vehicle has pending appointments"
          : "Vehicle is available for booking",
      },
    });
  } catch (error) {
    console.error("❌ [checkVehicleBookingStatus] Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check vehicle booking status",
      error: error.message,
    });
  }
};

// @desc    Get appointments for current user (role-based)
// @route   GET /api/appointments
// @access  Private
export const getAppointments = async (req, res) => {
  try {
    let appointments;
    const {
      status,
      page = 1,
      limit = 10,
      customerId,
      assignedTechnician,
      dateRange,
    } = req.query;
    const skip = (page - 1) * limit;

    // Build filter based on user role
    let filter = {};

    // Check for customerId query parameter first (for getting specific customer's appointments)
    if (customerId) {
      filter.customerId = customerId;
    } else if (assignedTechnician === "true") {
      // Explicitly filter by assigned technician
      filter.assignedTechnician = req.user._id;
    } else {
      // Role-based filtering when no specific customerId is requested
      if (req.user.role === "customer") {
        filter.customerId = req.user._id;
      } else if (req.user.role === "technician") {
        filter.assignedTechnician = req.user._id;
      }
      // Staff and admin can see all appointments (no additional filter)
    }

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    // Add date range filter if provided
    if (dateRange && dateRange !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      switch (dateRange) {
        case "today":
          filter.scheduledDate = {
            $gte: today,
            $lt: tomorrow,
          };
          break;
        case "week":
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          filter.scheduledDate = {
            $gte: today,
            $lt: weekEnd,
          };
          break;
        case "month":
          const monthEnd = new Date(today);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          filter.scheduledDate = {
            $gte: today,
            $lt: monthEnd,
          };
          break;
      }
    }

    // Define status priority order for Vietnamese EV workflow
    const statusPriority = {
      pending: 1, // Highest priority - needs confirmation
      customer_arrived: 2, // Customer is here - needs reception
      reception_created: 3, // Needs staff approval
      confirmed: 4, // Confirmed - waiting for customer
      reception_approved: 5, // Ready to start work
      in_progress: 6, // Currently working
      parts_requested: 7, // Waiting for parts
      parts_insufficient: 8, // Parts shortage
      quality_check: 9, // Quality inspection
      ready_for_pickup: 10, // Ready for customer pickup
      completed: 11, // Service completed
      cancelled: 12, // Cancelled appointments
      no_show: 13, // Lowest priority - no shows
    };

    appointments = await Appointment.find(filter)
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year vin")
      .populate(
        "services.serviceId",
        "name category basePrice estimatedDuration"
      )
      .populate("assignedTechnician", "firstName lastName specializations")
      .skip(skip)
      .limit(parseInt(limit));

    // Sort by status priority first, then by scheduled date
    appointments = appointments.sort((a, b) => {
      const priorityA = statusPriority[a.status] || 99;
      const priorityB = statusPriority[b.status] || 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same status priority, sort by scheduled date (newest first)
      return new Date(b.scheduledDate) - new Date(a.scheduledDate);
    });

    const total = await Appointment.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: appointments.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: appointments,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching appointments",
    });
  }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
export const getAppointment = async (req, res) => {
  try {
    let appointment = await Appointment.findById(req.params.id)
      .populate("customerId", "firstName lastName email phone")
      .populate(
        "vehicleId",
        "make model year vin color batteryType batteryCapacity"
      )
      .populate(
        "services.serviceId",
        "name category description basePrice estimatedDuration"
      )
      .populate(
        "assignedTechnician",
        "firstName lastName specializations phone"
      )
      .populate("serviceNotes.addedBy", "firstName lastName role")
      .populate("checklistItems.completedBy", "firstName lastName");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check authorization based on role
    if (
      req.user.role === "customer" &&
      appointment.customerId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this appointment",
      });
    }

    if (
      req.user.role === "technician" &&
      appointment.assignedTechnician &&
      appointment.assignedTechnician._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this appointment",
      });
    }

    // Staff and admin can view all appointments (no center restriction)

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching appointment",
    });
  }
};

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private (Customer)
export const createAppointment = async (req, res) => {
  try {
    debugger;
    const {
      vehicleId,
      services, // array of { serviceId, quantity }
      scheduledDate,
      scheduledTime,
      customerNotes,
      priority = "normal",
      technicianId, // optional technician selection by customer
      slotId, // optional slot reservation id
    } = req.body;

    // Validate vehicle belongs to customer
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      customerId: req.user._id,
      isActive: true,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Validate services exist - convert codes to ObjectIds first
    const serviceIds = services.map((s) => s.serviceId);

    // Separate ObjectId and code serviceIds
    const objectIdServiceIds = serviceIds.filter(
      (id) => typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/)
    );
    const codeServiceIds = serviceIds.filter(
      (id) => typeof id === "string" && !id.match(/^[0-9a-fA-F]{24}$/)
    );

    // First, find services by code to get their ObjectIds
    let servicesByCode = [];
    if (codeServiceIds.length > 0) {
      servicesByCode = await Service.find({
        code: { $in: codeServiceIds },
        isActive: true,
      });
    }

    // Then find services by ObjectId
    let servicesById = [];
    if (objectIdServiceIds.length > 0) {
      servicesById = await Service.find({
        _id: { $in: objectIdServiceIds },
        isActive: true,
      });
    }

    // Combine all valid services
    const validServices = [...servicesByCode, ...servicesById];

    if (validServices.length !== serviceIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more services not found",
      });
    }

    // Validate technician if provided
    let assignedTechnician = null;
    if (technicianId) {
      const technician = await User.findOne({
        _id: technicianId,
        role: "technician",
        isActive: true,
      });

      if (!technician) {
        return res.status(400).json({
          success: false,
          message: "Selected technician not available",
        });
      }

      // Check technician availability for the scheduled time
      const appointmentDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      const totalDuration = services.reduce((total, service) => {
        const serviceData = validServices.find(
          (s) => s._id.toString() === service.serviceId
        );
        // Add safety check for serviceData and estimatedDuration
        const estimatedDuration = serviceData?.estimatedDuration || 60; // Default to 60 minutes
        return total + estimatedDuration * (service.quantity || 1);
      }, 0);
      const estimatedCompletion = new Date(
        appointmentDateTime.getTime() + totalDuration * 60000
      );

      // Check for time slot conflicts - proper time overlap check
      console.log("- Technician ID:", technicianId);
      console.log("- Appointment time:", appointmentDateTime);
      console.log("- Estimated completion:", estimatedCompletion);

      const conflictingAppointments = await Appointment.find({
        assignedTechnician: technicianId,
        scheduledDate: {
          $gte: new Date(appointmentDateTime.toDateString()),
          $lt: new Date(appointmentDateTime.getTime() + 24 * 60 * 60 * 1000), // Next day
        },
        status: { $in: ["confirmed", "in_progress"] },
      });

      console.log(
        "🔍 [createAppointment] Found appointments for technician on this date:",
        conflictingAppointments.length
      );
      conflictingAppointments.forEach((appointment, index) => {
        console.log(
          `  ${index + 1}. ${appointment.scheduledDate} ${
            appointment.scheduledTime
          } (${appointment.status})`
        );
      });

      // Filter for actual time conflicts
      const actualConflicts = conflictingAppointments.filter((existing) => {
        const existingStart = new Date(
          `${existing.scheduledDate}T${existing.scheduledTime}`
        );
        const existingEnd = existing.estimatedCompletion
          ? new Date(existing.estimatedCompletion)
          : new Date(existingStart.getTime() + 60 * 60 * 1000); // Default 1 hour if no estimatedCompletion

        console.log(`  Existing: ${existingStart} to ${existingEnd}`);
        console.log(
          `  Requested: ${appointmentDateTime} to ${estimatedCompletion}`
        );

        // Check for time overlap
        const hasOverlap =
          appointmentDateTime < existingEnd &&
          estimatedCompletion > existingStart;

        console.log(`  Has overlap: ${hasOverlap}`);
        return hasOverlap;
      });

      if (actualConflicts.length > 0) {
        console.log(
          "- Requested time:",
          appointmentDateTime,
          "to",
          estimatedCompletion
        );
        console.log("- Conflicting appointments:", actualConflicts.length);
        actualConflicts.forEach((conflict, index) => {
          console.log(
            `  ${index + 1}. ${conflict.scheduledDate} ${
              conflict.scheduledTime
            } (${conflict.status})`
          );
        });

        return res.status(400).json({
          success: false,
          message: "Selected technician is not available during this time slot",
          conflictingAppointments: actualConflicts.length,
        });
      }

      // ==============================================================================
      // WORKLOAD CHECK FOR TECHNICIAN ASSIGNMENT - DISABLED
      // ==============================================================================
      // This section checks if the selected technician has available capacity
      // to handle the new appointment based on their current workload
      // COMMENTED OUT TO DISABLE WORKLOAD CHECKING

      // Check technician workload capacity
      // try {
      //   // Find the technician's profile to get their current workload status
      //   const technicianProfile = await TechnicianProfile.findOne({
      //     technicianId,
      //   });

      //   if (technicianProfile) {
      //     // Check if technician is available for appointment duration
      //     // This method checks:
      //     // 1. Basic availability status (available/busy)
      //     // 2. Current workload vs capacity
      //     // 3. Working hours/days
      //     if (
      //       !technicianProfile.isAvailableForAppointment(
      //         appointmentDateTime,
      //         totalDuration
      //       )
      //     ) {
      //       // Return error with detailed workload information
      //       return res.status(400).json({
      //         success: false,
      //         message:
      //           "Selected technician is not available due to workload or schedule constraints",
      //         workloadPercentage: technicianProfile.workloadPercentage,
      //         currentWorkload: technicianProfile.workload.current,
      //         capacity: technicianProfile.workload.capacity,
      //       });
      //     }
      //   }
      // } catch (error) {
      //   console.error("Error checking technician availability:", error);
      //   // Continue without failing - basic conflict check was already done
      //   // This ensures appointment creation doesn't fail if workload check fails
      // }

      assignedTechnician = technicianId;
    }

    // Build services array with pricing
    const appointmentServices = services.map((service) => {
      const serviceData = validServices.find(
        (s) =>
          s._id.toString() === service.serviceId || s.code === service.serviceId
      );

      if (!serviceData) {
        throw new Error(`Service not found: ${service.serviceId}`);
      }

      return {
        serviceId: serviceData._id, // Use actual _id for storage
        quantity: service.quantity || 1,
        price: serviceData.basePrice || 0,
        estimatedDuration: serviceData.estimatedDuration || 60,
      };
    });

    // Calculate estimated completion time
    const totalDuration = appointmentServices.reduce((total, service) => {
      return total + service.estimatedDuration * service.quantity;
    }, 0);

    const appointmentDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const estimatedCompletion = new Date(
      appointmentDateTime.getTime() + totalDuration * 60000
    );

    // Generate appointment number
    const today = new Date();
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD format
    const randomNum = Math.floor(Math.random() * 900) + 100; // 3-digit random number
    const appointmentNumber = `APT${dateStr}${randomNum}`;

    // Create appointment
    const appointmentPayload = {
      appointmentNumber,
      customerId: req.user._id,
      vehicleId,
      services: appointmentServices,
      scheduledDate: appointmentDateTime,
      scheduledTime,
      customerNotes,
      priority,
      estimatedCompletion,
      assignedTechnician: assignedTechnician,
      status: req.body.paymentInfo ? "confirmed" : "pending", // Auto-confirm if payment completed
      coreStatus: req.body.paymentInfo ? "Scheduled" : "Scheduled", // Both are Scheduled but status differs
      totalAmount: 0, // Will be calculated below
      paymentStatus: req.body.paymentInfo ? "paid" : "pending",
      remindersSent: 0,
      reschedulingInfo: {
        customerAgreed: false,
      },
      staffConfirmation: {
        modificationsRequired: [],
      },
      customerArrival: {
        customerItems: [],
      },
      serviceNotes: [],
      checklistItems: [],
      partsUsed: [],
      images: [],
      workflowHistory: [],
    };

    // If slotId provided, attempt to reserve it and attach
    // NOTE: frontend may reserve the slot first (to hold it during payment). In that case
    // it should send skipSlotReservation=true to avoid double-incrementing bookedCount.
    if (slotId) {
      const slot = await Slot.findById(slotId);
      if (!slot) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid slotId" });
      }

      // If caller didn't pre-reserve, perform reservation here
      if (!req.body.skipSlotReservation) {
        if (!slot.canBook()) {
          return res.status(400).json({
            success: false,
            message: "Selected slot is not available",
          });
        }
        // Reserve slot (increment bookedCount)
        slot.bookedCount += 1;
        if (slot.bookedCount >= slot.capacity) slot.status = "full";
        else slot.status = "partially_booked";
        await slot.save();
      } else {
        // If skipSlotReservation is true, validate that slot is still valid
        // Allow both "partially_booked" and "full" if skipSlotReservation is true
        // because the slot was already reserved during payment process
        if (slot.status === "booked" && slot.bookedCount >= slot.capacity) {
          return res.status(400).json({
            success: false,
            message: "Slot is no longer available",
          });
        }
      }

      appointmentPayload.slotId = slot._id;
      // If slot has technicianIds, set assignedTechnician if not already set
      if (
        !appointmentPayload.assignedTechnician &&
        slot.technicianIds &&
        slot.technicianIds.length > 0
      ) {
        // Use the first available technician from the slot
        appointmentPayload.assignedTechnician = slot.technicianIds[0];
      }
    }

    const appointment = await Appointment.create(appointmentPayload);

    // Calculate total
    appointment.calculateTotal();
    await appointment.save();

    // Update technician workload if assigned
    if (assignedTechnician) {
      try {
        const technicianProfile = await TechnicianProfile.findOne({
          technicianId: assignedTechnician,
        });
        if (technicianProfile) {
          await technicianProfile.assignAppointment(appointment._id);
        }
      } catch (error) {
        console.error("Error updating technician workload:", error);
        // Don't fail the appointment creation, just log the error
      }
    }

    // Send appointment confirmation email if appointment is confirmed (payment completed)
    if (appointment.status === "confirmed" && req.body.paymentInfo) {
      try {
        console.log(
          "📧 [createAppointment] Sending appointment confirmation email..."
        );

        // Get user data for email
        const user = await User.findById(req.user._id);
        if (user && user.email) {
          // Get service details for email - handle both ObjectId and code
          const objectIdServiceIds = serviceIds.filter(
            (id) => typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/)
          );
          const codeServiceIds = serviceIds.filter(
            (id) => typeof id === "string" && !id.match(/^[0-9a-fA-F]{24}$/)
          );

          let serviceDetails = [];
          if (objectIdServiceIds.length > 0) {
            const servicesById = await Service.find({
              _id: { $in: objectIdServiceIds },
            });
            serviceDetails = [...serviceDetails, ...servicesById];
          }
          if (codeServiceIds.length > 0) {
            const servicesByCode = await Service.find({
              code: { $in: codeServiceIds },
            });
            serviceDetails = [...serviceDetails, ...servicesByCode];
          }

          // Prepare appointment data for email
          const appointmentData = {
            appointmentNumber: appointment.appointmentNumber,
            scheduledDate: appointment.scheduledDate,
            scheduledTime: appointment.scheduledTime,
            services: serviceDetails.map((service) => ({
              serviceName: service.name,
              estimatedDuration: service.estimatedDuration,
              basePrice: service.basePrice,
            })),
            serviceCenter: {
              name: "EV Service Center",
              address: "123 Main Street, Ho Chi Minh City",
              phone: "+84 28 1234 5678",
            },
          };

          const userData = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          };

          // Import email functions
          const { sendAppointmentConfirmation } = await import(
            "../utils/paymentNotifications.js"
          );

          await sendAppointmentConfirmation(appointmentData, userData);
          console.log(
            "✅ [createAppointment] Appointment confirmation email sent"
          );
        }
      } catch (emailError) {
        console.error(
          "❌ [createAppointment] Failed to send appointment confirmation email:",
          emailError
        );
        // Don't fail the appointment creation if email fails
      }
    }

    // Populate for response
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("vehicleId", "make model year")
      .populate("services.serviceId", "name category")
      .populate("assignedTechnician", "firstName lastName specializations");

    res.status(201).json({
      success: true,
      message: req.body.paymentInfo
        ? "Appointment booked and confirmed successfully"
        : "Appointment booked successfully, awaiting confirmation",
      data: populatedAppointment,
    });
  } catch (error) {
    console.error("Error creating appointment:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating appointment",
    });
  }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private (Customer for own appointments, Staff/Admin)
export const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check authorization
    if (
      req.user.role === "customer" &&
      appointment.customerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this appointment",
      });
    }

    const allowedUpdates = [];

    // Define allowed updates based on role
    if (req.user.role === "customer") {
      // Customers can only update if status is pending
      if (appointment.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Cannot update appointment after it has been confirmed",
        });
      }
      allowedUpdates.push(
        "scheduledDate",
        "scheduledTime",
        "customerNotes",
        "services"
      );
    } else if (["staff", "admin"].includes(req.user.role)) {
      allowedUpdates.push(
        "status",
        "assignedTechnician",
        "internalNotes",
        "priority",
        "estimatedCompletion"
      );
    } else if (req.user.role === "technician") {
      allowedUpdates.push("serviceNotes", "checklistItems", "status");
    }

    // Filter update fields
    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Handle service notes addition
    if (req.body.addServiceNote) {
      appointment.serviceNotes.push({
        note: req.body.addServiceNote,
        addedBy: req.user._id,
        addedAt: new Date(),
      });
    }

    // Handle checklist item updates
    if (req.body.updateChecklistItem) {
      const { itemId, isCompleted, notes } = req.body.updateChecklistItem;
      const item = appointment.checklistItems.id(itemId);
      if (item) {
        item.isCompleted = isCompleted;
        item.completedBy = isCompleted ? req.user._id : null;
        item.completedAt = isCompleted ? new Date() : null;
        if (notes) item.notes = notes;
      }
    }

    // Apply updates
    Object.assign(appointment, updates);

    // Update completion time if status changed to completed
    if (updates.status === "completed" && !appointment.actualCompletion) {
      appointment.actualCompletion = new Date();
    }

    await appointment.save();

    // Populate for response
    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate("customerId", "firstName lastName")
      .populate("vehicleId", "make model year")
      .populate("assignedTechnician", "firstName lastName");

    res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      data: updatedAppointment,
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error updating appointment",
    });
  }
};

// @desc    Cancel appointment
// @route   DELETE /api/appointments/:id
// @access  Private (Customer for own appointments, Staff/Admin)
export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // For customer role, use business logic validation
    if (req.user.role === "customer") {
      const canCancelCheck = appointment.canBeCancelledByCustomer(req.user._id);

      if (!canCancelCheck.canCancel) {
        return res.status(400).json({
          success: false,
          message: canCancelCheck.reason,
          details: {
            hoursLeft: canCancelCheck.hoursLeft,
            status: appointment.status,
            scheduledDate: appointment.scheduledDate,
          },
        });
      }
    } else {
      // Staff/admin/technician can cancel with fewer restrictions
      if (
        appointment.customerId.toString() !== req.user._id.toString() &&
        req.user.role !== "staff" &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to cancel this appointment",
        });
      }
    }

    // Check if appointment can be cancelled
    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel completed appointment",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Appointment is already cancelled",
      });
    }

    // Add cancellation info to workflow history
    appointment.workflowHistory.push({
      status: appointment.status, // Previous status
      changedAt: new Date(),
      changedBy: req.user._id,
      reason: `Cancelled by ${req.user.role}`,
      notes: req.body.reason || "No reason provided",
    });

    appointment.status = "cancelled";
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = req.user._id;
    appointment.cancellationReason = req.body.reason || "No reason provided";

    await appointment.save();

    // Release slot if appointment has one
    if (appointment.slotId) {
      try {
        const Slot = (await import("../models/Slot.js")).default;
        const slot = await Slot.findById(appointment.slotId);

        if (slot) {
          console.log(
            `🔓 [cancelAppointment] Releasing slot ${appointment.slotId} for appointment ${appointment.appointmentNumber}`
          );
          await slot.release();
          console.log(`✅ [cancelAppointment] Slot released successfully`);
        }
      } catch (slotError) {
        console.error(
          "Error releasing slot during appointment cancellation:",
          slotError
        );
        // Don't fail the cancellation process if slot release fails
      }
    }

    res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      data: {
        appointmentId: appointment._id,
        appointmentNumber: appointment.appointmentNumber,
        status: appointment.status,
        cancelledAt: appointment.cancelledAt,
        cancelledBy: req.user.role,
        reason: appointment.cancellationReason,
      },
    });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling appointment",
    });
  }
};

// @desc    Request appointment cancellation
// @route   POST /api/appointments/:id/request-cancel
// @access  Private (Customer for own appointments)
export const requestCancellation = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Only customers can request cancellation
    if (req.user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can request cancellation",
      });
    }

    // Check if it's the right customer
    if (appointment.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not your appointment",
      });
    }

    const canCancelCheck = appointment.canBeCancelledByCustomer(req.user._id);

    if (!canCancelCheck.canCancel) {
      return res.status(400).json({
        success: false,
        message: canCancelCheck.reason,
        details: {
          hoursLeft: canCancelCheck.hoursLeft,
          status: appointment.status,
          scheduledDate: appointment.scheduledDate,
        },
      });
    }

    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required",
      });
    }

    // Request cancellation
    await appointment.requestCancellation(reason, req.user._id);

    res.status(200).json({
      success: true,
      message: "Cancel request submitted successfully",
      data: {
        appointmentId: appointment._id,
        appointmentNumber: appointment.appointmentNumber,
        status: appointment.status,
        refundPercentage: appointment.cancelRequest.refundPercentage,
        refundMessage: canCancelCheck.refundMessage,
        requestedAt: appointment.cancelRequest.requestedAt,
      },
    });
  } catch (error) {
    console.error("Error requesting cancellation:", error);
    res.status(500).json({
      success: false,
      message: "Error requesting cancellation",
    });
  }
};

// @desc    Approve appointment cancellation
// @route   POST /api/appointments/:id/approve-cancel
// @access  Private (Staff/Admin)
export const approveCancellation = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Only staff/admin can approve cancellation
    if (req.user.role !== "staff" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to approve cancellation",
      });
    }

    if (appointment.status !== "cancel_requested") {
      return res.status(400).json({
        success: false,
        message: "Appointment is not in cancel_requested status",
      });
    }

    const { notes } = req.body;

    // Approve cancellation
    await appointment.approveCancellation(req.user._id, notes || "");

    // Release slot if appointment has one
    if (appointment.slotId) {
      try {
        const Slot = (await import("../models/Slot.js")).default;
        const slot = await Slot.findById(appointment.slotId);

        if (slot) {
          console.log(
            `🔓 [approveCancellation] Releasing slot ${appointment.slotId} for appointment ${appointment.appointmentNumber}`
          );
          await slot.release();
          console.log(`✅ [approveCancellation] Slot released successfully`);
        }
      } catch (slotError) {
        console.error(
          "Error releasing slot during cancellation approval:",
          slotError
        );
        // Don't fail the cancellation process if slot release fails
      }
    }

    res.status(200).json({
      success: true,
      message: "Cancel request approved successfully",
      data: {
        appointmentId: appointment._id,
        appointmentNumber: appointment.appointmentNumber,
        status: appointment.status,
        approvedAt: appointment.cancelRequest.approvedAt,
        approvedBy: req.user.role,
        refundPercentage: appointment.cancelRequest.refundPercentage,
      },
    });
  } catch (error) {
    console.error("Error approving cancellation:", error);
    res.status(500).json({
      success: false,
      message: "Error approving cancellation",
    });
  }
};

// @desc    Process refund for cancelled appointment
// @route   POST /api/appointments/:id/process-refund
// @access  Private (Staff/Admin)
export const processRefund = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Only staff/admin can process refund
    if (req.user.role !== "staff" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to process refund",
      });
    }

    if (appointment.status !== "cancel_approved") {
      return res.status(400).json({
        success: false,
        message: "Appointment is not in cancel_approved status",
      });
    }

    // Calculate refund amount
    const refundPercentage = appointment.cancelRequest.refundPercentage;
    const refundAmount = Math.round(
      (appointment.totalAmount * refundPercentage) / 100
    );

    // Create refund transaction
    const VNPAYTransaction = (await import("../models/VNPAYTransaction.js"))
      .default;

    const refundTransactionRef = `REFUND_${
      appointment.appointmentNumber
    }_${Date.now()}`;

    const refundTransaction = new VNPAYTransaction({
      transactionRef: refundTransactionRef,
      paymentType: "refund",
      orderInfo: `Refund for appointment ${appointment.appointmentNumber} - ${appointment.cancelRequest.reason}`,
      orderType: "refund",
      userId: appointment.customerId,
      appointmentId: appointment._id,
      amount: refundAmount,
      paidAmount: refundAmount,
      currency: "VND",
      status: "completed",
      responseCode: "00",
      vnpayData: {
        paymentDate: new Date(),
      },
      settlementInfo: {
        settled: true,
        settlementDate: new Date(),
        settlementAmount: refundAmount,
        settlementReference: `REFUND${Date.now()}`,
      },
      metadata: {
        refundReason: appointment.cancelRequest.reason,
        refundedBy: req.user._id,
        refundDate: new Date(),
        refundType: "appointment_cancellation",
        refundPercentage,
      },
    });

    await refundTransaction.save();

    // Get notes from request body
    const { notes } = req.body;

    // Process refund in appointment
    await appointment.processRefund(req.user._id, refundTransaction._id, notes);

    // Release slot if appointment has one (in case it wasn't released during approval)
    if (appointment.slotId) {
      try {
        const Slot = (await import("../models/Slot.js")).default;
        const slot = await Slot.findById(appointment.slotId);

        if (slot) {
          console.log(
            `🔓 [processRefund] Releasing slot ${appointment.slotId} for appointment ${appointment.appointmentNumber}`
          );
          await slot.release();
          console.log(`✅ [processRefund] Slot released successfully`);
        }
      } catch (slotError) {
        console.error(
          "Error releasing slot during refund processing:",
          slotError
        );
        // Don't fail the refund process if slot release fails
      }
    }

    // Send refund notification email to customer
    try {
      // Get customer information
      const customer = await User.findById(appointment.customerId);

      if (customer && customer.email) {
        const refundData = {
          refundAmount,
          refundPercentage,
          refundTransactionRef,
          refundDate: new Date(),
          refundReason: appointment.cancelRequest.reason,
        };

        const userData = {
          firstName: customer.firstName,
          lastName: customer.lastName,
        };

        const appointmentData = {
          appointmentNumber: appointment.appointmentNumber,
          scheduledDate: appointment.scheduledDate,
          scheduledTime: appointment.scheduledTime,
        };

        const emailContent = generateRefundNotificationTemplate(
          refundData,
          userData,
          appointmentData
        );

        await sendEmail({
          to: customer.email,
          subject: `Refund Processed - Appointment ${appointment.appointmentNumber}`,
          html: emailContent,
        });
      }
    } catch (emailError) {
      console.error("Error sending refund notification email:", emailError);
      // Don't fail the refund process if email fails
    }

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: {
        appointmentId: appointment._id,
        appointmentNumber: appointment.appointmentNumber,
        status: appointment.status,
        refundAmount,
        refundPercentage,
        refundTransactionId: refundTransaction._id,
        refundTransactionRef: refundTransactionRef,
        processedAt: appointment.cancelRequest.refundProcessedAt,
      },
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({
      success: false,
      message: "Error processing refund",
    });
  }
};

// @desc    Get available technicians for specific time slot and services (NEW IMPROVED VERSION)
// @route   GET /api/appointments/available-technicians-optimized
// @access  Private
// Get available technicians for a specific slot
export const getAvailableTechniciansForSlot = async (req, res) => {
  try {
    const { slotId, duration = 60, serviceCategories } = req.query;

    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: "Slot ID is required",
      });
    }

    console.log(
      `🔍 [getAvailableTechniciansForSlot] Searching for slot ${slotId}`
    );

    // Find the specific slot
    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }

    // Check if slot has enough duration
    const slotStart = new Date(`${slot.date}T${slot.startTime}:00`);
    const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
    const slotDurationMinutes = (slotEnd - slotStart) / (1000 * 60);

    console.log(
      `🔍 Slot ${slot._id}: duration ${slotDurationMinutes} minutes, required ${duration} minutes`
    );

    if (slotDurationMinutes < parseInt(duration)) {
      return res.status(400).json({
        success: false,
        message: `Slot duration (${slotDurationMinutes} minutes) is less than required duration (${duration} minutes)`,
      });
    }

    // Get available technicians for this specific slot
    const availableTechnicians = await slot.getAvailableTechniciansOptimized();

    console.log(
      `✅ Found ${availableTechnicians.length} available technicians for slot ${slotId}`
    );

    console.log(
      `🔍 [getAvailableTechniciansForSlot] Processing technicians with real data from TechnicianProfile`
    );

    // Format response with real data from TechnicianProfile
    const formattedTechnicians = await Promise.all(
      availableTechnicians.map(async (technician) => {
        // Get technician profile for real performance data
        const technicianProfile = await TechnicianProfile.findOne({
          technicianId: technician._id,
        }).populate("technicianId", "firstName lastName specializations");

        console.log(
          `🔍 [getAvailableTechniciansForSlot] Technician ${technician._id} profile:`,
          {
            hasProfile: !!technicianProfile,
            performance: technicianProfile?.performance,
            yearsExperience: technicianProfile?.yearsExperience,
            workload: technicianProfile?.workload,
          }
        );

        // Get workload info for this technician in this slot
        const workloadInfo = await slot.getTechnicianWorkloadInSlot(
          technician._id
        );

        // Calculate skill match score if service categories provided
        let skillMatchScore = 0;
        if (serviceCategories && serviceCategories.length > 0) {
          const categories = Array.isArray(serviceCategories)
            ? serviceCategories
            : [serviceCategories];
          skillMatchScore = calculateSkillMatch(
            technicianProfile?.skillMatrix || [],
            categories
          );
        }

        return {
          id: technician._id.toString(),
          name: `${technician.firstName} ${technician.lastName}`,
          specializations: technician.specializations || [],
          availability: {
            status: technicianProfile?.availability?.status || "available",
            workloadPercentage: technicianProfile?.workloadPercentage || 0,
          },
          performance: {
            customerRating: technicianProfile?.performance?.customerRating || 0,
            completedJobs: technicianProfile?.performance?.completedJobs || 0,
            efficiency: technicianProfile?.performance?.efficiency || 0,
          },
          skills: (technicianProfile?.skillMatrix || []).map((skill) => ({
            category: skill.serviceCategory,
            level: skill.proficiencyLevel,
            certified: skill.certificationRequired,
          })),
          isRecommended: skillMatchScore > 0.7,
          yearsExperience: technicianProfile?.yearsExperience || 0,
          isAssignedToSlot: true,
          isPreferredSlotTechnician: true,
          slotStatus: {
            slotId: slot._id.toString(),
            slotTime: `${slot.startTime}-${slot.endTime}`,
            currentWorkload: workloadInfo.currentWorkload,
            maxCapacity: workloadInfo.maxCapacity,
            slotCapacity: workloadInfo.slotCapacity,
            technicianSlotCapacity: workloadInfo.technicianSlotCapacity,
            availabilityPercentage: Math.round(
              (1 - workloadInfo.currentWorkload / workloadInfo.maxCapacity) *
                100
            ),
            isPreferred: true,
            appointments: workloadInfo.appointments,
          },
          // Additional backend data
          _id: technician._id,
          firstName: technician.firstName,
          lastName: technician.lastName,
          skillMatchScore,
          currentWorkload: technicianProfile?.workload?.current || 0,
          maxCapacity: technicianProfile?.workload?.capacity || 1,
        };
      })
    );

    res.json({
      success: true,
      data: formattedTechnicians,
      availableCount: formattedTechnicians.length,
      totalTechnicians: slot.technicianIds.length,
      slot: {
        id: slot._id.toString(),
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: slot.capacity,
        bookedCount: slot.bookedCount,
        status: slot.status,
      },
      method: "slot-specific",
    });
  } catch (error) {
    console.error("Error in getAvailableTechniciansForSlot:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAvailableTechniciansOptimized = async (req, res) => {
  try {
    const {
      date,
      time,
      duration = 60,
      serviceCategories,
      preferredSlotId,
    } = req.query;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: "Date and time are required",
      });
    }

    console.log(
      `🔍 [getAvailableTechniciansOptimized] Searching for ${date} ${time}`
    );

    // Create appointment datetime
    let appointmentDateTime;
    try {
      if (time.includes(":")) {
        appointmentDateTime = new Date(`${date}T${time}:00`);
      } else {
        appointmentDateTime = new Date(`${date}T${time}`);
      }

      if (isNaN(appointmentDateTime.getTime())) {
        return res.status(400).json({
          success: false,
          message: `Invalid date or time format: ${date} ${time}`,
        });
      }
    } catch (error) {
      console.error("Error parsing date/time:", error);
      return res.status(400).json({
        success: false,
        message: `Error parsing date/time: ${date} ${time}`,
      });
    }

    const estimatedCompletion = new Date(
      appointmentDateTime.getTime() + parseInt(duration) * 60000
    );

    // Find available slots using optimized method
    const availableSlots = await Slot.find({
      date: date,
      startTime: { $lte: time },
      endTime: { $gt: time },
      status: { $in: ["available", "partially_booked"] },
    }).populate("technicianIds", "firstName lastName specializations");

    console.log(`Found ${availableSlots.length} available slots`);

    // Filter slots that have enough duration
    const slotsWithEnoughDuration = availableSlots.filter((slot) => {
      const slotStart = new Date(`${slot.date}T${slot.startTime}:00`);
      const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
      const slotDurationMinutes = (slotEnd - slotStart) / (1000 * 60);

      console.log(
        `🔍 Slot ${slot._id}: duration ${slotDurationMinutes} minutes, required ${duration} minutes`
      );

      return slotDurationMinutes >= parseInt(duration);
    });

    console.log(
      `Found ${slotsWithEnoughDuration.length} slots with enough duration`
    );

    // Get available technicians using optimized method
    const availableTechnicians = [];

    for (const slot of slotsWithEnoughDuration) {
      console.log(`🔍 Checking slot ${slot._id} for available technicians...`);

      // Use optimized method to get available technicians
      const slotAvailableTechnicians =
        await slot.getAvailableTechniciansOptimized();

      for (const technicianData of slotAvailableTechnicians) {
        // Extract technicianId from the returned object
        const technicianId = technicianData._id || technicianData;

        // Get technician profile
        const technicianProfile = await TechnicianProfile.findOne({
          technicianId: technicianId,
        }).populate("technicianId", "firstName lastName specializations");

        if (technicianProfile) {
          const technician = technicianProfile.technicianId;

          // Calculate skill match if service categories provided
          let skillMatchScore = 0;
          if (serviceCategories && serviceCategories.length > 0) {
            skillMatchScore = calculateSkillMatch(
              technicianProfile.skillMatrix,
              serviceCategories
            );
          }

          // Check if this is the preferred slot
          const isPreferredSlot =
            preferredSlotId && slot._id.toString() === preferredSlotId;

          // Get detailed workload info for this slot
          const workloadInfo = await slot.getTechnicianWorkloadInSlot(
            technicianId
          );

          availableTechnicians.push({
            // Frontend-compatible format
            id: technician._id,
            name: `${technician.firstName} ${technician.lastName}`,
            specializations: technician.specializations,
            availability: {
              status: technicianProfile.availability.status,
              workloadPercentage: technicianProfile.workloadPercentage,
            },
            performance: {
              customerRating: technicianProfile.performance.customerRating,
              completedJobs: technicianProfile.performance.completedJobs,
              efficiency: technicianProfile.performance.efficiency,
            },
            skills: (technicianProfile.skillMatrix || []).map((skill) => ({
              category: skill.serviceCategory,
              level: skill.proficiencyLevel,
              certified: skill.certificationRequired,
            })),
            isRecommended: skillMatchScore > 0.7,
            yearsExperience: technicianProfile.yearsExperience ?? 0,
            isAssignedToSlot: true,
            isPreferredSlotTechnician: isPreferredSlot,
            // New: Detailed slot status information
            slotStatus: {
              slotId: slot._id,
              slotTime: `${slot.startTime}-${slot.endTime}`,
              currentWorkload: workloadInfo.currentWorkload,
              maxCapacity: workloadInfo.maxCapacity, // Use calculated capacity from slot
              slotCapacity: workloadInfo.slotCapacity,
              technicianSlotCapacity: workloadInfo.technicianSlotCapacity,
              availabilityPercentage: Math.round(
                (1 - workloadInfo.currentWorkload / workloadInfo.maxCapacity) *
                  100
              ),
              isPreferred: isPreferredSlot,
              appointments: workloadInfo.appointments,
            },
            // Additional backend data
            _id: technician._id,
            firstName: technician.firstName,
            lastName: technician.lastName,
            skillMatchScore,
            currentWorkload: technicianProfile.workload.current,
            maxCapacity: technicianProfile.workload.capacity,
          });
        }
      }
    }

    // Remove duplicates based on technician ID
    const uniqueTechnicians = availableTechnicians.reduce((acc, tech) => {
      if (!acc.find((t) => t._id.toString() === tech._id.toString())) {
        acc.push(tech);
      }
      return acc;
    }, []);

    // Sort by preferred slot first, then by skill match, then by performance
    uniqueTechnicians.sort((a, b) => {
      if (a.isPreferredSlotTechnician && !b.isPreferredSlotTechnician)
        return -1;
      if (!a.isPreferredSlotTechnician && b.isPreferredSlotTechnician) return 1;

      if (a.skillMatchScore > b.skillMatchScore) return -1;
      if (a.skillMatchScore < b.skillMatchScore) return 1;

      return b.performance.customerRating - a.performance.customerRating;
    });

    console.log(
      `✅ Found ${uniqueTechnicians.length} available technicians using optimized method`
    );

    // Get total technicians count for comparison
    const totalTechnicians = await User.countDocuments({
      role: "technician",
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: uniqueTechnicians,
      availableCount: uniqueTechnicians.length,
      totalTechnicians,
      timeSlot: {
        date,
        time,
        duration: parseInt(duration),
      },
      method: "optimized",
    });
  } catch (error) {
    console.error("Error fetching available technicians (optimized):", error);
    res.status(500).json({
      success: false,
      message: "Error fetching available technicians",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @route   GET /api/appointments/available-technicians
// @access  Private
export const getAvailableTechnicians = async (req, res) => {
  // Use the optimized version by default
  return getAvailableTechniciansOptimized(req, res);
};

// Legacy method - kept for backward compatibility
export const getAvailableTechniciansLegacy = async (req, res) => {
  try {
    const {
      date,
      time,
      duration = 60,
      serviceCategories,
      preferredSlotId,
    } = req.query;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: "Date and time are required",
      });
    }

    // Create appointment datetime - ensure proper format
    let appointmentDateTime;
    try {
      // Try different date formats
      if (time.includes(":")) {
        appointmentDateTime = new Date(`${date}T${time}:00`);
      } else {
        appointmentDateTime = new Date(`${date}T${time}`);
      }

      console.log(`Creating appointment datetime from: ${date}T${time}`);
      console.log(`Parsed datetime:`, appointmentDateTime);
      console.log(`Timestamp:`, appointmentDateTime.getTime());
      console.log(`Is valid date:`, !isNaN(appointmentDateTime.getTime()));

      if (isNaN(appointmentDateTime.getTime())) {
        return res.status(400).json({
          success: false,
          message: `Invalid date or time format: ${date} ${time}`,
        });
      }
    } catch (error) {
      console.error("Error parsing date/time:", error);
      return res.status(400).json({
        success: false,
        message: `Error parsing date/time: ${date} ${time}`,
      });
    }

    const estimatedCompletion = new Date(
      appointmentDateTime.getTime() + parseInt(duration) * 60000
    );
    console.log(`Estimated completion:`, estimatedCompletion);

    // First, find available slots for this date and time
    // Look for slots that contain the requested time
    const availableSlots = await Slot.find({
      date: date,
      startTime: { $lte: time }, // Slot starts at or before requested time
      endTime: { $gt: time }, // Slot ends after requested time
      status: { $in: ["available", "partially_booked"] },
    }).populate("technicianIds", "firstName lastName specializations");

    console.log(
      `Found ${availableSlots.length} available slots for ${date} ${time}`
    );

    // Get technicians assigned to available slots
    const slotTechnicians = new Map();
    availableSlots.forEach((slot) => {
      if (slot.technicianIds && slot.technicianIds.length > 0) {
        slot.technicianIds.forEach((tech) => {
          if (!slotTechnicians.has(tech._id.toString())) {
            slotTechnicians.set(tech._id.toString(), {
              technician: tech,
              slots: [],
            });
          }
          slotTechnicians.get(tech._id.toString()).slots.push(slot);
        });
      }
    });

    console.log(`Found ${slotTechnicians.size} technicians assigned to slots`);

    // Get all technicians (fallback for technicians not assigned to slots)
    const allTechnicians = await User.find({
      role: "technician",
      isActive: true,
    }).select("_id firstName lastName specializations");

    const allTechnicianIds = allTechnicians.map((t) => t._id);

    // Get technician profiles for all technicians
    const profiles = await TechnicianProfile.find({
      technicianId: { $in: allTechnicianIds },
    }).populate("technicianId", "firstName lastName specializations");

    // Check availability for each technician
    const availableTechnicians = [];

    for (const profile of profiles) {
      const technicianId = profile.technicianId._id.toString();
      const isAssignedToSlot = slotTechnicians.has(technicianId);

      // Check basic availability
      const isBasicallyAvailable = profile.isAvailableForAppointment(
        appointmentDateTime,
        parseInt(duration)
      );

      if (!isBasicallyAvailable) {
        continue;
      }

      // Check if technician is assigned to any slot for this time
      const availableSlots = await Slot.find({
        date: date,
        startTime: { $lte: time }, // Slot starts at or before requested time
        endTime: { $gt: time }, // Slot ends after requested time
        technicianIds: profile.technicianId._id,
        status: { $in: ["available", "partially_booked"] },
      });

      if (availableSlots.length === 0) {
        continue;
      }

      // Check for conflicting appointments - proper time overlap check
      const conflictingAppointments = await Appointment.find({
        assignedTechnician: profile.technicianId._id,
        scheduledDate: {
          $gte: new Date(appointmentDateTime.toDateString()),
          $lt: new Date(appointmentDateTime.getTime() + 24 * 60 * 60 * 1000), // Next day
        },
        status: { $in: ["confirmed", "in_progress"] },
      });

      // Filter for actual time conflicts
      const actualConflicts = conflictingAppointments.filter((existing) => {
        const existingStart = new Date(
          `${existing.scheduledDate}T${existing.scheduledTime}`
        );
        const existingEnd = existing.estimatedCompletion
          ? new Date(existing.estimatedCompletion)
          : new Date(existingStart.getTime() + 60 * 60 * 1000); // Default 1 hour if no estimatedCompletion

        // Check for time overlap
        return (
          appointmentDateTime < existingEnd &&
          estimatedCompletion > existingStart
        );
      });

      if (actualConflicts.length > 0) {
        continue;
      }

      // Calculate skill matching score if service categories provided
      let skillMatchScore = 0;
      if (serviceCategories) {
        const categories = Array.isArray(serviceCategories)
          ? serviceCategories
          : [serviceCategories];
        skillMatchScore = calculateSkillMatch(profile.skillMatrix, categories);
      }

      availableTechnicians.push({
        id: profile.technicianId._id,
        name: `${profile.technicianId.firstName} ${profile.technicianId.lastName}`,
        specializations: profile.technicianId.specializations,
        availability: {
          status: profile.availability.status,
          workloadPercentage: profile.workloadPercentage,
        },
        performance: {
          customerRating: profile.performance.customerRating,
          completedJobs: profile.performance.completedJobs,
          efficiency: profile.performance.efficiency,
        },
        skills: (profile.skillMatrix || []).map((skill) => ({
          category: skill.serviceCategory,
          level: skill.proficiencyLevel,
          certified: skill.certificationRequired,
        })),
        isRecommended: skillMatchScore > 70 || isAssignedToSlot, // Prioritize slot-assigned technicians
        yearsExperience: profile.yearsExperience ?? 0,
        isAssignedToSlot: isAssignedToSlot,
        availableSlots: isAssignedToSlot
          ? slotTechnicians.get(technicianId).slots.length
          : 0,
        isPreferredSlotTechnician:
          preferredSlotId && isAssignedToSlot
            ? slotTechnicians
                .get(technicianId)
                .slots.some((slot) => slot._id.toString() === preferredSlotId)
            : false,
      });
    }

    // Sort by preferred slot assignment first, then general slot assignment, then by recommendation, then by performance
    availableTechnicians.sort((a, b) => {
      // Prioritize technicians assigned to the preferred slot
      if (a.isPreferredSlotTechnician && !b.isPreferredSlotTechnician)
        return -1;
      if (!a.isPreferredSlotTechnician && b.isPreferredSlotTechnician) return 1;

      // Then prioritize technicians assigned to any slots
      if (a.isAssignedToSlot && !b.isAssignedToSlot) return -1;
      if (!a.isAssignedToSlot && b.isAssignedToSlot) return 1;

      // Then by recommendation
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;

      // Finally by performance rating
      return b.performance.customerRating - a.performance.customerRating;
    });

    res.status(200).json({
      success: true,
      data: availableTechnicians,
      availableCount: availableTechnicians.length,
      totalTechnicians: allTechnicians.length,
      timeSlot: {
        date,
        time,
        duration: parseInt(duration),
      },
      method: "legacy",
    });
  } catch (error) {
    console.error("Error fetching available technicians:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error fetching available technicians",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Helper function to calculate skill match score
const calculateSkillMatch = (skillMatrix, serviceCategories) => {
  if (
    !skillMatrix ||
    skillMatrix.length === 0 ||
    !serviceCategories ||
    serviceCategories.length === 0
  ) {
    return 0;
  }

  const matchingSkills = skillMatrix.filter((skill) =>
    serviceCategories.includes(skill.serviceCategory)
  );

  if (matchingSkills.length === 0) {
    return 0;
  }

  const totalScore = matchingSkills.reduce(
    (sum, skill) => sum + skill.proficiencyLevel,
    0
  );
  const maxPossibleScore = matchingSkills.length * 5; // Max level is 5

  return (totalScore / maxPossibleScore) * 100;
};

// @desc    Debug slot technician appointments
// @route   GET /api/appointments/debug-slots
// @access  Private
export const debugSlots = async (req, res) => {
  try {
    const { date, time } = req.query;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: "Date and time are required",
      });
    }

    // Find slots for this date and time
    const slots = await Slot.find({
      date: date,
      startTime: { $lte: time },
      endTime: { $gt: time },
    });

    const debugInfo = slots.map((slot) => ({
      slotId: slot._id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: slot.status,
      technicianIds: slot.technicianIds,
      technicianAppointments: slot.technicianAppointments,
      capacity: slot.capacity,
      bookedCount: slot.bookedCount,
    }));

    res.status(200).json({
      success: true,
      data: {
        date,
        time,
        totalSlots: slots.length,
        slots: debugInfo,
      },
    });
  } catch (error) {
    console.error("Error debugging slots:", error);
    res.status(500).json({
      success: false,
      message: "Error debugging slots",
    });
  }
};

// @desc    Initialize technician appointments for all slots
// @route   POST /api/appointments/init-slot-technicians
// @access  Private
export const initializeSlotTechnicians = async (req, res) => {
  try {
    console.log("🔄 Starting slot technicianAppointments initialization...");

    // Get all slots
    const slots = await Slot.find({});
    console.log(`Found ${slots.length} slots to initialize`);

    let initializedCount = 0;

    for (const slot of slots) {
      console.log(`\n📋 Processing slot ${slot._id}:`);
      console.log(
        `- Date: ${slot.date}, Time: ${slot.startTime}-${slot.endTime}`
      );
      console.log(`- TechnicianIds: ${slot.technicianIds.length}`);
      console.log(
        `- Current technicianAppointments: ${
          slot.technicianAppointments?.length || 0
        }`
      );

      // Initialize technicianAppointments if not exists
      if (
        !slot.technicianAppointments ||
        slot.technicianAppointments.length === 0
      ) {
        console.log("  - Initializing technicianAppointments...");

        slot.technicianAppointments = slot.technicianIds.map(
          (technicianId) => ({
            technicianId: technicianId,
            appointmentIds: [],
            currentWorkload: 0,
            maxCapacity: 1, // Default capacity
          })
        );

        await slot.save();
        initializedCount++;
        console.log("  ✅ Slot initialized successfully");
      } else {
        console.log("  ⏭️  Slot already has technicianAppointments, skipping");
      }
    }

    console.log(
      `\n🎉 Initialization completed! Initialized ${initializedCount} slots`
    );

    res.status(200).json({
      success: true,
      data: {
        totalSlots: slots.length,
        initializedSlots: initializedCount,
        message: `Initialized ${initializedCount} out of ${slots.length} slots`,
      },
    });
  } catch (error) {
    console.error("❌ Initialization error:", error);
    res.status(500).json({
      success: false,
      message: "Error initializing slot technicians",
    });
  }
};

// @desc    Check technician availability for specific time slot
// @route   GET /api/appointments/technician-availability
// @access  Private
export const checkTechnicianAvailability = async (req, res) => {
  try {
    const { technicianId, date, time, duration = 60 } = req.query;

    if (!technicianId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Technician ID, date, and time are required",
      });
    }

    // Create appointment datetime
    const appointmentDateTime = new Date(`${date}T${time}`);
    const estimatedCompletion = new Date(
      appointmentDateTime.getTime() + duration * 60000
    );

    // Step 1: Check if technician exists and is active
    const technician = await User.findOne({
      _id: technicianId,
      role: "technician",
      isActive: true,
    });

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found or inactive",
      });
    }

    // Step 2: Check technician profile and basic availability
    const technicianProfile = await TechnicianProfile.findOne({
      technicianId,
    }).populate("technicianId", "firstName lastName specializations");

    if (!technicianProfile) {
      return res.status(404).json({
        success: false,
        message: "Technician profile not found",
      });
    }

    // Check basic availability (working hours, workload, status)
    const isBasicallyAvailable = technicianProfile.isAvailableForAppointment(
      appointmentDateTime,
      duration
    );

    if (!isBasicallyAvailable) {
      return res.status(200).json({
        success: true,
        data: {
          available: false,
          reason: "Technician is not available during this time",
          details: {
            status: technicianProfile.availability.status,
            workloadPercentage: technicianProfile.workloadPercentage,
            currentWorkload: technicianProfile.workload.current,
            capacity: technicianProfile.workload.capacity,
          },
        },
      });
    }

    // Step 3: Check if technician is assigned to any slot for this time
    const availableSlots = await Slot.find({
      date: date,
      startTime: { $lte: time }, // Slot starts at or before requested time
      endTime: { $gt: time }, // Slot ends after requested time
      technicianIds: technicianId,
      status: { $in: ["available", "partially_booked"] },
    });

    if (availableSlots.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          available: false,
          reason:
            "Technician is not assigned to any available slot for this time",
          details: {
            status: technicianProfile.availability.status,
            workloadPercentage: technicianProfile.workloadPercentage,
          },
        },
      });
    }

    // Step 4: Check technician availability in each slot using new method
    console.log("🔍 [checkTechnicianAvailability] Debug info:");
    console.log("- Available slots found:", availableSlots.length);
    console.log("- Technician ID:", technicianId);

    // Debug each slot
    for (let i = 0; i < availableSlots.length; i++) {
      const slot = availableSlots[i];
      const isAvailable = await slot.isTechnicianAvailable(technicianId);
      console.log(`- Slot ${i + 1}:`, {
        slotId: slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        technicianIds: slot.technicianIds,
        technicianAppointments: slot.technicianAppointments,
        isTechnicianAvailable: isAvailable,
      });
    }

    const availableSlotsWithTechnician = [];
    for (const slot of availableSlots) {
      const isAvailable = await slot.isTechnicianAvailable(technicianId);
      if (isAvailable) {
        availableSlotsWithTechnician.push(slot);
      }
    }

    console.log(
      "- Available slots with technician:",
      availableSlotsWithTechnician.length
    );

    if (availableSlotsWithTechnician.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          available: false,
          reason:
            "Technician is at full capacity in all available slots for this time",
          details: {
            status: technicianProfile.availability.status,
            workloadPercentage: technicianProfile.workloadPercentage,
            totalSlots: availableSlots.length,
            availableSlots: 0,
            debugInfo: {
              slots: availableSlots.map((slot) => ({
                slotId: slot._id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                status: slot.status,
                technicianIds: slot.technicianIds,
                technicianAppointments: slot.technicianAppointments,
                isTechnicianAvailable: slot.isTechnicianAvailable(technicianId),
              })),
            },
          },
        },
      });
    }

    // Step 4: Check for conflicting appointments with proper time overlap
    const conflictingAppointments = await Appointment.find({
      assignedTechnician: technicianId,
      scheduledDate: {
        $gte: new Date(appointmentDateTime.toDateString()),
        $lt: new Date(appointmentDateTime.getTime() + 24 * 60 * 60 * 1000), // Next day
      },
      status: { $in: ["confirmed", "in_progress"] },
    });

    // Filter for actual time conflicts
    const actualConflicts = conflictingAppointments.filter((existing) => {
      const existingStart = new Date(
        `${existing.scheduledDate}T${existing.scheduledTime}`
      );
      const existingEnd = existing.estimatedCompletion
        ? new Date(existing.estimatedCompletion)
        : new Date(existingStart.getTime() + 60 * 60 * 1000); // Default 1 hour if no estimatedCompletion

      // Check for time overlap
      return (
        appointmentDateTime < existingEnd && estimatedCompletion > existingStart
      );
    });

    const hasConflicts = actualConflicts.length > 0;

    // Step 5: Return final result
    res.status(200).json({
      success: true,
      data: {
        available: !hasConflicts,
        reason: hasConflicts
          ? "Technician has conflicting appointments"
          : "Available",
        technicianInfo: {
          name: `${technicianProfile.technicianId.firstName} ${technicianProfile.technicianId.lastName}`,
          specializations: technicianProfile.technicianId.specializations,
          status: technicianProfile.availability.status,
          workloadPercentage: technicianProfile.workloadPercentage,
          currentAppointments: technicianProfile.workload.current,
          capacity: technicianProfile.workload.capacity,
        },
        slotInfo: {
          totalSlots: availableSlots.length,
          availableSlots: availableSlotsWithTechnician.length,
          slotDetails: availableSlotsWithTechnician.map((slot) => ({
            slotId: slot._id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: slot.status,
            capacity: slot.capacity,
            bookedCount: slot.bookedCount,
            technicianCapacity:
              slot.technicianAppointments.find(
                (ta) => ta.technicianId.toString() === technicianId.toString()
              )?.maxCapacity || 1,
            technicianCurrentWorkload:
              slot.technicianAppointments.find(
                (ta) => ta.technicianId.toString() === technicianId.toString()
              )?.currentWorkload || 0,
          })),
        },
        conflictInfo: {
          hasConflicts,
          conflictingAppointments: hasConflicts ? actualConflicts.length : 0,
          conflictDetails: hasConflicts
            ? actualConflicts.map((conflict) => ({
                appointmentNumber: conflict.appointmentNumber,
                scheduledTime: conflict.scheduledTime,
                estimatedCompletion: conflict.estimatedCompletion,
                status: conflict.status,
              }))
            : [],
        },
      },
    });
  } catch (error) {
    console.error("Error checking technician availability:", error);
    res.status(500).json({
      success: false,
      message: "Error checking technician availability",
    });
  }
};

// Enhanced availability checking with 409 conflict responses
const enhancedAvailabilityCheck = async (
  date,
  time,
  duration,
  excludeAppointmentId = null
) => {
  const appointmentDateTime = new Date(`${date}T${time}`);
  const estimatedCompletion = new Date(
    appointmentDateTime.getTime() + duration * 60000
  );

  const conflictQuery = {
    scheduledDate: {
      $gte: new Date(appointmentDateTime.toDateString()),
      $lt: new Date(appointmentDateTime.getTime() + 24 * 60 * 60 * 1000), // Next day
    },
    status: { $in: ["pending", "confirmed", "in_progress"] },
  };

  if (excludeAppointmentId) {
    conflictQuery._id = { $ne: excludeAppointmentId };
  }

  const conflicts = await Appointment.find(conflictQuery)
    .populate("assignedTechnician", "firstName lastName")
    .populate("customerId", "firstName lastName phone");

  return conflicts;
};

// Pre-validation endpoint for booking conflicts
export const preValidateAvailability = async (req, res) => {
  try {
    const { date, time, duration = 60, technicianId } = req.query;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: "Date and time are required",
      });
    }

    // Check availability (single center - no service center filtering needed)
    const centerConflicts = await enhancedAvailabilityCheck(
      date,
      time,
      duration
    );

    if (centerConflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Time slot conflicts with existing appointments",
        conflicts: centerConflicts.map((apt) => ({
          appointmentNumber: apt.appointmentNumber,
          customer: `${apt.customerId.firstName} ${apt.customerId.lastName}`,
          time: apt.scheduledTime,
          technician: apt.assignedTechnician
            ? `${apt.assignedTechnician.firstName} ${apt.assignedTechnician.lastName}`
            : null,
        })),
        reasonCode: "TIME_SLOT_CONFLICT",
      });
    }

    // Check technician availability if specified
    if (technicianId) {
      const appointmentDateTime = new Date(`${date}T${time}`);
      const estimatedCompletion = new Date(
        appointmentDateTime.getTime() + duration * 60000
      );

      const techConflicts = await Appointment.find({
        assignedTechnician: technicianId,
        scheduledDate: {
          $gte: new Date(appointmentDateTime.toDateString()),
          $lt: new Date(appointmentDateTime.getTime() + 24 * 60 * 60 * 1000), // Next day
        },
        status: { $in: ["pending", "confirmed", "in_progress"] },
      });

      // Filter for actual time conflicts
      const actualConflicts = techConflicts.filter((existing) => {
        const existingStart = new Date(
          `${existing.scheduledDate}T${existing.scheduledTime}`
        );
        const existingEnd = existing.estimatedCompletion
          ? new Date(existing.estimatedCompletion)
          : new Date(existingStart.getTime() + 60 * 60 * 1000); // Default 1 hour if no estimatedCompletion

        // Check for time overlap
        return (
          appointmentDateTime < existingEnd &&
          estimatedCompletion > existingStart
        );
      });

      if (actualConflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Technician is not available during this time slot",
          reasonCode: "TECHNICIAN_CONFLICT",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Time slot is available",
      data: {
        available: true,
        timeSlot: { date, time, duration },
      },
    });
  } catch (error) {
    console.error("Error in pre-validation:", error);
    res.status(500).json({
      success: false,
      message: "Error validating availability",
    });
  }
};

// @desc    Check appointment availability
// @route   GET /api/appointments/availability
// @access  Private
export const checkAvailability = async (req, res) => {
  try {
    const { date, duration = 60 } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    // Single center - use default working hours (assuming 8:00-17:00, Monday-Friday)
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.toLocaleDateString("en-US", {
      weekday: "lowercase",
    });

    // Default working hours for single center
    const defaultWorkingHours = {
      monday: { isOpen: true, open: "08:00", close: "17:00" },
      tuesday: { isOpen: true, open: "08:00", close: "17:00" },
      wednesday: { isOpen: true, open: "08:00", close: "17:00" },
      thursday: { isOpen: true, open: "08:00", close: "17:00" },
      friday: { isOpen: true, open: "08:00", close: "17:00" },
      saturday: { isOpen: false, open: "08:00", close: "17:00" },
      sunday: { isOpen: false, open: "08:00", close: "17:00" },
    };

    const workingHours = defaultWorkingHours[dayOfWeek];

    if (!workingHours || !workingHours.isOpen) {
      return res.status(200).json({
        success: true,
        message: "Service center is closed on this day",
        data: {
          isOpen: false,
          availableSlots: [],
        },
      });
    }

    // Get existing appointments for the date (single center - no serviceCenterId filter)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await Appointment.find({
      scheduledDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ["pending", "confirmed", "in_progress"] },
    }).select("scheduledTime estimatedCompletion");

    // Generate available time slots (assume default capacity of 4 bays)
    const availableSlots = generateTimeSlots(
      workingHours.open,
      workingHours.close,
      duration,
      existingAppointments,
      4 // Default capacity for single center
    );

    res.status(200).json({
      success: true,
      data: {
        isOpen: true,
        workingHours,
        availableSlots,
        totalBays: 4, // Default capacity for single center
        currentBookings: existingAppointments.length,
      },
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({
      success: false,
      message: "Error checking availability",
    });
  }
};

// @desc    Assign technician to appointment
// @route   PUT /api/appointments/:id/assign
// @access  Private (Staff/Admin)
export const assignTechnician = async (req, res) => {
  try {
    const { technicianId, autoAssign = false } = req.body;

    const appointment = await Appointment.findById(req.params.id).populate(
      "services.serviceId",
      "category estimatedDuration"
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    let selectedTechnicianId = technicianId;

    // If autoAssign is true, find the best technician
    if (autoAssign && !technicianId) {
      const serviceCategories = appointment.services.map(
        (s) => s.serviceId.category
      );
      const estimatedDuration = appointment.services.reduce(
        (total, s) => total + s.estimatedDuration * s.quantity,
        0
      );

      // Get all technicians (single center - no service center filtering)
      const technicians = await User.find({
        role: "technician",
        isActive: true,
      }).select("_id");

      const technicianIds = technicians.map((t) => t._id);

      // Find available technicians with profiles
      const profiles = await TechnicianProfile.find({
        technicianId: { $in: technicianIds },
        isActive: true,
        "availability.status": { $in: ["available", "busy"] },
      }).populate("technicianId", "firstName lastName specializations");

      // Filter and score technicians
      const availableTechnicians = profiles
        .filter((profile) =>
          profile.isAvailableForAppointment(
            appointment.scheduledDate,
            estimatedDuration
          )
        )
        .map((profile) => {
          let score = 0;

          // Skill matching
          const skillScore = calculateSkillMatch(
            profile.skillMatrix,
            serviceCategories
          );
          score += skillScore * 0.4;

          // Workload factor - prefer less loaded technicians
          const workloadScore = Math.max(0, 100 - profile.workloadPercentage);
          score += workloadScore * 0.3;

          // Performance factor
          const performanceScore =
            (profile.performance.efficiency +
              profile.performance.customerRating * 20) /
            2;
          score += performanceScore * 0.2;

          // Availability factor
          const availabilityScore =
            profile.availability.status === "available" ? 100 : 50;
          score += availabilityScore * 0.1;

          return { profile, score: Math.round(score) };
        })
        .sort((a, b) => b.score - a.score);

      if (availableTechnicians.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No available technicians found for this appointment",
        });
      }

      selectedTechnicianId = availableTechnicians[0].profile.technicianId._id;
    }

    // Validate the selected technician
    const technician = await User.findOne({
      _id: selectedTechnicianId,
      role: "technician",
      isActive: true,
    });

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
      });
    }

    // Additional availability check - simplified to same date check
    const conflictingAppointments = await Appointment.find({
      assignedTechnician: selectedTechnicianId,
      scheduledDate: {
        $gte: new Date(appointment.scheduledDate.toDateString()),
        $lt: new Date(
          appointment.scheduledDate.getTime() + 24 * 60 * 60 * 1000
        ), // Next day
      },
      status: { $in: ["confirmed", "in_progress"] },
      _id: { $ne: appointment._id },
    });

    if (conflictingAppointments.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Technician is not available during this time slot",
      });
    }

    // Update appointment
    const previousTechnician = appointment.assignedTechnician;
    appointment.assignedTechnician = selectedTechnicianId;

    if (appointment.status === "pending") {
      appointment.status = "confirmed";
    }

    await appointment.save();

    // ==============================================================================
    // WORKLOAD MANAGEMENT FOR TECHNICIAN REASSIGNMENT - DISABLED
    // ==============================================================================
    // Update technician profiles when reassigning appointments
    // COMMENTED OUT TO DISABLE WORKLOAD MANAGEMENT

    // Remove from previous technician's workload if reassigning
    // if (
    //   previousTechnician &&
    //   !previousTechnician.equals(selectedTechnicianId)
    // ) {
    //   // Find previous technician's profile
    //   const prevProfile = await TechnicianProfile.findOne({
    //     technicianId: previousTechnician,
    //   });
    //   if (prevProfile) {
    //     // Remove appointment from previous technician's workload
    //     await prevProfile.completeAppointment(appointment._id);
    //   }
    // }

    // Add to new technician's workload
    // const newProfile = await TechnicianProfile.findOne({
    //   technicianId: selectedTechnicianId,
    // });
    // if (newProfile) {
    //   // Add appointment to new technician's workload
    //   await newProfile.assignAppointment(appointment._id);
    // }

    // Populate for response
    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate("assignedTechnician", "firstName lastName specializations")
      .populate("services.serviceId", "name category");

    res.status(200).json({
      success: true,
      message: autoAssign
        ? "Technician auto-assigned successfully"
        : "Technician assigned successfully",
      data: updatedAppointment,
      autoAssigned: autoAssign && !technicianId,
    });
  } catch (error) {
    console.error("Error assigning technician:", error);
    res.status(500).json({
      success: false,
      message: "Error assigning technician",
    });
  }
};

// @desc    Get work queue for staff/admin (advanced queue management)
// @route   GET /api/appointments/work-queue
// @access  Private (Staff/Admin/Technician)
export const getWorkQueue = async (req, res) => {
  try {
    if (!["staff", "admin", "technician"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access work queue",
      });
    }

    const {
      status = "pending,confirmed",
      priority,
      technicianId, // Add technician filter support
      dateRange = "today",
      page = 1,
      limit = 20,
      sortBy = "priority_date",
    } = req.query;

    // Build date filter
    let dateFilter = {};
    const now = new Date();

    switch (dateRange) {
      case "all":
        // No date filter - get all appointments
        dateFilter = {};
        break;
      case "today":
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const endOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );
        dateFilter = { scheduledDate: { $gte: startOfDay, $lt: endOfDay } };
        break;
      case "tomorrow":
        const startOfTomorrow = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );
        const endOfTomorrow = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 2
        );
        dateFilter = {
          scheduledDate: { $gte: startOfTomorrow, $lt: endOfTomorrow },
        };
        break;
      case "week":
        const startOfWeek = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - now.getDay()
        );
        const endOfWeek = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - now.getDay() + 7
        );
        dateFilter = { scheduledDate: { $gte: startOfWeek, $lt: endOfWeek } };
        break;
      case "overdue":
        dateFilter = {
          scheduledDate: { $lt: now },
          status: { $in: ["pending", "confirmed"] },
        };
        break;
    }

    // Build main filter
    let filter = {
      ...dateFilter,
      status: { $in: status.split(",") },
    };

    if (priority) {
      filter.priority = priority;
    }

    // Technician filter - add support for filtering by assigned technician
    if (technicianId) {
      filter.assignedTechnician = technicianId;
    } else if (req.user.role === "technician") {
      // For technician users, only show their assigned appointments
      filter.assignedTechnician = req.user._id;
    }

    // Service center filter removed - single center architecture
    // All staff can see all appointments

    // Build sort criteria
    let sortCriteria = {};
    switch (sortBy) {
      case "priority_date":
        sortCriteria = { priority: -1, scheduledDate: 1 };
        break;
      case "date":
        sortCriteria = { scheduledDate: 1 };
        break;
      case "priority":
        sortCriteria = { priority: -1 };
        break;
      case "status":
        sortCriteria = { status: 1, scheduledDate: 1 };
        break;
      default:
        sortCriteria = { priority: -1, scheduledDate: 1 };
    }

    const skip = (page - 1) * limit;

    // DEBUG: Log the filter being used
    console.log(
      "🔍 WorkQueue Debug - Filter:",
      JSON.stringify(filter, null, 2)
    );
    console.log("🔍 WorkQueue Debug - Query params:", req.query);
    console.log("🔍 WorkQueue Debug - User role:", req.user.role);
    console.log("🔍 WorkQueue Debug - User ID:", req.user._id);

    // Get appointments with full details
    const appointments = await Appointment.find(filter)
      .populate("customerId", "firstName lastName phone email")
      .populate(
        "vehicleId",
        "make model year vin color batteryType licensePlate"
      )
      .populate(
        "services.serviceId",
        "name category basePrice estimatedDuration"
      )
      .populate(
        "assignedTechnician",
        "firstName lastName specializations phone"
      )
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filter);

    // Get technician availability for unassigned appointments (only for staff/admin)
    let enrichedAppointments = appointments.map((apt) => apt.toObject());

    if (req.user.role !== "technician") {
      const unassignedAppointments = appointments.filter(
        (apt) => !apt.assignedTechnician
      );
      const availableTechnicians = await TechnicianProfile.find({
        isActive: true,
        "availability.status": { $in: ["available", "busy"] },
      })
        .populate("technicianId", "firstName lastName")
        .select("technicianId workload availability skillMatrix performance");

      // Add recommended technicians for unassigned appointments
      enrichedAppointments = appointments.map((appointment) => {
        const appointmentObj = appointment.toObject();

        if (!appointment.assignedTechnician) {
          const serviceCategories = appointment.services.map(
            (s) => s.serviceId.category
          );
          const estimatedDuration = appointment.services.reduce(
            (total, s) => total + s.estimatedDuration * s.quantity,
            0
          );

          // All technicians available in single center architecture
          const centerTechnicians = availableTechnicians;

          // Score and recommend technicians
          const recommendations = centerTechnicians
            .filter(
              (profile) =>
                profile.isAvailableForAppointment &&
                profile.isAvailableForAppointment(
                  appointment.scheduledDate,
                  estimatedDuration
                )
            )
            .map((profile) => {
              let score = 0;
              const skillScore = calculateSkillMatch
                ? calculateSkillMatch(profile.skillMatrix, serviceCategories)
                : 50;
              const workloadScore = Math.max(
                0,
                100 - (profile.workloadPercentage || 0)
              );
              const performanceScore = profile.performance
                ? (profile.performance.efficiency +
                    profile.performance.customerRating * 20) /
                  2
                : 50;
              const availabilityScore =
                profile.availability.status === "available" ? 100 : 50;

              score =
                skillScore * 0.4 +
                workloadScore * 0.3 +
                performanceScore * 0.2 +
                availabilityScore * 0.1;

              return {
                technician: {
                  id: profile.technicianId._id,
                  name: `${profile.technicianId.firstName} ${profile.technicianId.lastName}`,
                  availability: profile.availability.status,
                  workloadPercentage: profile.workloadPercentage || 0,
                },
                score: Math.round(score),
                matchReasons: {
                  skillMatch: Math.round(skillScore),
                  workloadScore: Math.round(workloadScore),
                  availability: profile.availability.status,
                },
              };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

          appointmentObj.recommendedTechnicians = recommendations;
        }

        return appointmentObj;
      });
    }

    // Calculate queue statistics
    const stats = {
      total: total,
      pending: appointments.filter((a) => a.status === "pending").length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      inProgress: appointments.filter((a) => a.status === "in_progress").length,
      unassigned: appointments.filter((a) => !a.assignedTechnician).length,
      urgent: appointments.filter((a) => a.priority === "urgent").length,
      high: appointments.filter((a) => a.priority === "high").length,
      overdue: appointments.filter(
        (a) =>
          new Date(a.scheduledDate) < now &&
          ["pending", "confirmed"].includes(a.status)
      ).length,
    };

    res.status(200).json({
      success: true,
      data: {
        appointments: enrichedAppointments,
        statistics: stats,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total: total,
          hasNext: skip + appointments.length < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching work queue:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching work queue",
    });
  }
};

// @desc    Bulk update appointments (for queue management)
// @route   PUT /api/appointments/bulk-update
// @access  Private (Staff/Admin)
export const bulkUpdateAppointments = async (req, res) => {
  try {
    if (!["staff", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to bulk update appointments",
      });
    }

    const { appointmentIds, updates } = req.body;

    if (
      !appointmentIds ||
      !Array.isArray(appointmentIds) ||
      appointmentIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Appointment IDs are required",
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Updates are required",
      });
    }

    // Define allowed bulk update fields
    const allowedFields = [
      "priority",
      "status",
      "assignedTechnician",
      "scheduledDate",
      "scheduledTime",
    ];
    const filteredUpdates = {};

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid update fields provided",
      });
    }

    // Perform bulk update
    const result = await Appointment.updateMany(
      { _id: { $in: appointmentIds } },
      { $set: filteredUpdates },
      { runValidators: true }
    );

    // If technician assignment is being updated, handle technician profiles
    if (filteredUpdates.assignedTechnician) {
      for (const appointmentId of appointmentIds) {
        const appointment = await Appointment.findById(appointmentId);
        if (appointment) {
          // Update technician profile
          const profile = await TechnicianProfile.findOne({
            technicianId: filteredUpdates.assignedTechnician,
          });
          if (profile) {
            await profile.assignAppointment(appointmentId);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} appointments`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error bulk updating appointments:", error);
    res.status(500).json({
      success: false,
      message: "Error updating appointments",
    });
  }
};

// Helper function to generate available time slots
function generateTimeSlots(
  openTime,
  closeTime,
  duration,
  existingAppointments,
  totalBays
) {
  const slots = [];
  const [openHour, openMinute] = openTime.split(":").map(Number);
  const [closeHour, closeMinute] = closeTime.split(":").map(Number);

  const startTime = openHour * 60 + openMinute; // Convert to minutes
  const endTime = closeHour * 60 + closeMinute;

  // Generate 30-minute slots
  for (let time = startTime; time <= endTime - duration; time += 30) {
    const hour = Math.floor(time / 60);
    const minute = time % 60;
    const timeString = `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;

    // Check if this slot conflicts with existing appointments
    const slotStart = time;
    const slotEnd = time + duration;

    const conflicts = existingAppointments.filter((apt) => {
      const aptTime = apt.scheduledTime.split(":").map(Number);
      const aptStart = aptTime[0] * 60 + aptTime[1];
      const aptDuration = apt.estimatedCompletion
        ? Math.ceil((new Date(apt.estimatedCompletion) - new Date()) / 60000)
        : 60;
      const aptEnd = aptStart + aptDuration;

      return slotStart < aptEnd && slotEnd > aptStart;
    });

    if (conflicts.length < totalBays) {
      slots.push({
        time: timeString,
        available: totalBays - conflicts.length,
      });
    }
  }

  return slots;
}

// ==============================================
// STAFF CONFIRMATION APIs (New Workflow)
// ==============================================

// @desc    Get appointments pending staff confirmation
// @route   GET /api/appointments/pending-staff-confirmation
// @access  Private (Staff, Admin)
export const getPendingStaffConfirmation = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = { status: "pending" };

    // Staff can see all pending appointments in single center architecture

    const appointments = await Appointment.find(filter)
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year vin licensePlate")
      .populate(
        "services.serviceId",
        "name category basePrice estimatedDuration"
      )
      .populate("assignedTechnician", "firstName lastName specializations")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: appointments.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: appointments,
    });
  } catch (error) {
    console.error("Error fetching pending staff confirmations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending confirmations",
    });
  }
};

// @desc    Staff confirm appointment
// @route   PUT /api/appointments/:id/staff-confirm
// @access  Private (Staff, Admin)
export const staffConfirmAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { confirmationNotes, modifications = [] } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment can be confirmed by staff
    if (
      !appointment.canTransitionTo("confirmed", req.user.role, req.user._id)
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm appointment with status: ${appointment.status}`,
      });
    }

    // Apply any modifications requested by staff
    if (modifications && modifications.length > 0) {
      modifications.forEach((mod) => {
        if (mod.field === "scheduledDate" && mod.newValue) {
          appointment.scheduledDate = new Date(mod.newValue);
        } else if (mod.field === "scheduledTime" && mod.newValue) {
          appointment.scheduledTime = mod.newValue;
        } else if (mod.field === "assignedTechnician" && mod.newValue) {
          appointment.assignedTechnician = mod.newValue;
        }
      });
    }

    // Set staff confirmation details
    appointment.staffConfirmation = {
      confirmedBy: req.user._id,
      confirmedAt: new Date(),
      confirmationNotes,
      modificationsRequired: modifications,
    };

    // Update status using the model method with correct parameter order
    await appointment.updateStatus(
      "confirmed",
      req.user._id,
      req.user.role,
      "Staff confirmed appointment",
      confirmationNotes
    );

    // Populate for response
    await appointment.populate([
      { path: "customerId", select: "firstName lastName email phone" },
      { path: "vehicleId", select: "make model year vin" },
      { path: "assignedTechnician", select: "firstName lastName" },
    ]);

    res.status(200).json({
      success: true,
      message: "Appointment confirmed successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Error confirming appointment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error confirming appointment",
    });
  }
};

// @desc    Staff reject appointment
// @route   PUT /api/appointments/:id/staff-reject
// @access  Private (Staff, Admin)
export const staffRejectAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { rejectionReason, suggestedAction } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment can be cancelled by staff
    if (
      !appointment.canTransitionTo("cancelled", req.user.role, req.user._id)
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot reject appointment with status: ${appointment.status}`,
      });
    }

    // Update status to cancelled with rejection details
    await appointment.updateStatus(
      "cancelled",
      req.user._id,
      req.user.role,
      "Staff rejected appointment",
      rejectionReason
    );

    // Add rejection details to internal notes
    appointment.internalNotes = `REJECTED by staff: ${rejectionReason}. Suggested action: ${
      suggestedAction || "None"
    }`;
    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Appointment rejected successfully",
      data: {
        appointmentId,
        status: "cancelled",
        rejectionReason,
        suggestedAction,
      },
    });
  } catch (error) {
    console.error("Error rejecting appointment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error rejecting appointment",
    });
  }
};

// @desc    Handle customer arrival
// @route   PUT /api/appointments/:id/customer-arrived
// @access  Private (Staff, Technician, Admin)
export const handleCustomerArrival = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { vehicleConditionNotes, customerItems = [] } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment can transition to customer_arrived
    if (
      !appointment.canTransitionTo(
        "customer_arrived",
        req.user.role,
        req.user._id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark customer as arrived for appointment with status: ${appointment.status}`,
      });
    }

    // Set customer arrival details
    appointment.customerArrival = {
      arrivedAt: new Date(),
      receivedBy: req.user._id,
      vehicleConditionNotes,
      customerItems,
    };

    // Update status with correct parameters
    await appointment.updateStatus(
      "customer_arrived",
      req.user._id,
      req.user.role,
      "Customer arrived at service center"
    );

    res.status(200).json({
      success: true,
      message: "Customer arrival recorded successfully",
      data: {
        appointmentId,
        arrivedAt: appointment.customerArrival.arrivedAt,
        status: appointment.status,
      },
    });
  } catch (error) {
    console.error("Error handling customer arrival:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error recording customer arrival",
    });
  }
};

// @desc    Reschedule appointment
// @route   PUT /api/appointments/:id/reschedule
// @access  Private (Staff, Admin)
export const rescheduleAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const {
      newDate,
      newTime,
      reason,
      customerAgreed = false,
      estimatedPartsArrival,
    } = req.body;

    if (!newDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "New date and reason are required",
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // For customer role, use business logic validation
    if (req.user.role === "customer") {
      const canRescheduleCheck = appointment.canBeRescheduledByCustomer(
        req.user._id
      );

      if (!canRescheduleCheck.canReschedule) {
        return res.status(400).json({
          success: false,
          message: canRescheduleCheck.reason,
          details: {
            hoursLeft: canRescheduleCheck.hoursLeft,
            rescheduleCount: canRescheduleCheck.rescheduleCount,
            status: appointment.status,
            scheduledDate: appointment.scheduledDate,
          },
        });
      }
    } else {
      // Staff/admin can reschedule with fewer restrictions
      if (
        appointment.customerId.toString() !== req.user._id.toString() &&
        req.user.role !== "staff" &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to reschedule this appointment",
        });
      }
    }

    // Validate new date is in the future
    const newAppointmentDate = new Date(newDate);
    const now = new Date();
    if (newAppointmentDate <= now) {
      return res.status(400).json({
        success: false,
        message: "New appointment date must be in the future",
      });
    }

    // Use the model's reschedule method
    await appointment.reschedule(
      newAppointmentDate,
      reason,
      req.user._id,
      customerAgreed
    );

    // Update time if provided
    if (newTime) {
      appointment.scheduledTime = newTime;
    }

    // Add parts arrival date if provided
    if (estimatedPartsArrival) {
      appointment.reschedulingInfo.estimatedPartsArrival = new Date(
        estimatedPartsArrival
      );
    }

    // Add to workflow history
    appointment.workflowHistory.push({
      status: "rescheduled",
      changedAt: new Date(),
      changedBy: req.user._id,
      reason: `Rescheduled by ${req.user.role}: ${reason}`,
      notes: `From ${appointment.reschedulingInfo.previousDate} to ${newAppointmentDate}`,
    });

    await appointment.save();

    // Get updated customer actions for response
    const customerActions =
      req.user.role === "customer"
        ? appointment.getCustomerActions(req.user._id)
        : null;

    res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully",
      data: {
        appointmentId,
        appointmentNumber: appointment.appointmentNumber,
        oldDate: appointment.reschedulingInfo.previousDate,
        newDate: appointment.scheduledDate,
        newTime: appointment.scheduledTime,
        status: appointment.status,
        customerAgreed,
        reason,
        rescheduleCount: appointment.reschedulingInfo.rescheduleCount,
        customerActions,
      },
    });
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error rescheduling appointment",
    });
  }
};

// ==============================================================================
// SERVICE RECEPTION APIS (Phase 2.2)
// ==============================================================================

// @desc    Submit Service Reception to Staff for approval
// @route   PUT /api/appointments/:id/submit-reception
// @access  Private (Technician)
export const submitServiceReception = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { submissionNotes = "" } = req.body;

    // Find appointment and reception
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const { ServiceReception } = await import("../models/index.js");
    const serviceReception = await ServiceReception.findOne({ appointmentId });
    if (!serviceReception) {
      return res.status(404).json({
        success: false,
        message: "Service reception not found",
      });
    }

    // Check if already submitted
    if (serviceReception.submissionStatus.submittedToStaff) {
      return res.status(400).json({
        success: false,
        message: "Service reception already submitted to staff",
      });
    }

    // Submit to staff
    await serviceReception.submitToStaff(req.user._id);

    // Add submission notes if provided
    if (submissionNotes) {
      serviceReception.workflowHistory.push({
        status: "submission_notes_added",
        changedBy: req.user._id,
        changedAt: new Date(),
        reason: "Technician added submission notes",
        notes: submissionNotes,
        systemGenerated: false,
      });
      await serviceReception.save();
    }

    res.status(200).json({
      success: true,
      message: "Service reception submitted to staff for approval",
      data: {
        submissionStatus: serviceReception.submissionStatus,
        submittedAt: serviceReception.submissionStatus.submittedAt,
      },
    });
  } catch (error) {
    console.error("Error submitting service reception:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting service reception",
    });
  }
};

// @desc    Get Service Receptions pending staff approval
// @route   GET /api/appointments/receptions/pending-approval
// @access  Private (Staff/Admin)
export const getPendingReceptionApprovals = async (req, res) => {
  try {
    const { ServiceReception } = await import("../models/index.js");

    let filter = {
      "submissionStatus.submittedToStaff": true,
      "submissionStatus.staffReviewStatus": "pending",
    };

    // Single center architecture - no service center filtering needed

    const pendingReceptions = await ServiceReception.find(filter)
      .populate(
        "appointmentId",
        "appointmentNumber scheduledDate scheduledTime"
      )
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year vin licensePlate")
      .populate("submissionStatus.submittedBy", "firstName lastName")
      .populate(
        "recommendedServices.serviceId",
        "name category basePrice estimatedDuration"
      )
      .populate("recommendedServices.addedBy", "firstName lastName")
      .populate("requestedParts.partId", "name partNumber pricing")
      .sort({ "submissionStatus.submittedAt": 1 });

    res.status(200).json({
      success: true,
      count: pendingReceptions.length,
      data: pendingReceptions,
    });
  } catch (error) {
    console.error("Error getting pending reception approvals:", error);
    res.status(500).json({
      success: false,
      message: "Error getting pending reception approvals",
    });
  }
};

// @desc    Staff approve/reject Service Reception
// @route   PUT /api/appointments/:id/review-reception
// @access  Private (Staff/Admin)
export const reviewServiceReception = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const {
      decision, // 'approved', 'rejected', 'needs_modification', 'partially_approved'
      reviewNotes = "",
      approvalDecision = {}, // { servicesApproved: [], partsApproved: [], estimatedTotalCost: 0 }
    } = req.body;

    // Validate decision
    const validDecisions = [
      "approved",
      "rejected",
      "needs_modification",
      "partially_approved",
    ];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid decision. Must be one of: " + validDecisions.join(", "),
      });
    }

    // Find appointment and reception
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const { ServiceReception } = await import("../models/index.js");
    const serviceReception = await ServiceReception.findOne({ appointmentId });
    if (!serviceReception) {
      return res.status(404).json({
        success: false,
        message: "Service reception not found",
      });
    }

    // Check if reception can be reviewed
    if (!serviceReception.canBeApproved()) {
      return res.status(400).json({
        success: false,
        message: "Service reception cannot be reviewed at this time",
      });
    }

    // Staff review the reception
    await serviceReception.staffReview(
      req.user._id,
      decision,
      reviewNotes,
      approvalDecision
    );

    // Update appointment status based on decision
    let newAppointmentStatus;
    let statusMessage;

    switch (decision) {
      case "approved":
        newAppointmentStatus = "reception_approved";
        statusMessage = "Service reception approved by staff";
        break;
      case "rejected":
        newAppointmentStatus = "confirmed"; // Back to previous status
        statusMessage = "Service reception rejected by staff";
        break;
      case "needs_modification":
        newAppointmentStatus = "reception_created"; // Back to technician
        statusMessage = "Service reception needs modification";
        break;
      case "partially_approved":
        newAppointmentStatus = "reception_approved";
        statusMessage = "Service reception partially approved by staff";
        break;
      default:
        newAppointmentStatus = appointment.status; // No change
        statusMessage = "Service reception reviewed";
    }

    await appointment.updateStatus(
      newAppointmentStatus,
      req.user._id,
      req.user.role,
      statusMessage
    );

    // Handle parts availability check for approved receptions
    if (decision === "approved" || decision === "partially_approved") {
      await checkPartsAvailability(serviceReception, appointment, req.user._id);
    }

    res.status(200).json({
      success: true,
      message: `Service reception ${decision}`,
      data: {
        decision,
        reviewStatus: serviceReception.submissionStatus.staffReviewStatus,
        appointmentStatus: appointment.status,
        reviewedAt: serviceReception.submissionStatus.reviewedAt,
      },
    });
  } catch (error) {
    console.error("Error reviewing service reception:", error);
    res.status(500).json({
      success: false,
      message: "Error reviewing service reception",
    });
  }
};

// @desc    Start work on appointment (move to in_progress)
// @route   PUT /api/appointments/:id/start-work
// @access  Private (Technician/Admin)
export const startAppointmentWork = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { workStartNotes = "" } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment can start work - now supports direct transition from waiting_for_parts
    if (
      !appointment.canTransitionTo("in_progress", req.user.role, req.user._id)
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot start work. Appointment status is: ${appointment.status}. Expected status: reception_approved, waiting_for_parts, or parts_requested`,
      });
    }

    // Direct transition to in_progress - no intermediate steps needed
    await appointment.updateStatus(
      "in_progress",
      req.user._id,
      req.user.role,
      "Work started on appointment",
      workStartNotes
    );

    res.status(200).json({
      success: true,
      message: "Work started on appointment",
      data: {
        appointmentId: appointment._id,
        status: appointment.status,
        updatedAt: appointment.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error starting appointment work:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error starting appointment work",
    });
  }
};

// @desc    Complete appointment after EV checklist is done
// @route   PUT /api/appointments/:id/complete
// @access  Private (Technician/Admin)
export const completeAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { completionNotes = "" } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment can be completed
    if (
      !appointment.canTransitionTo("completed", req.user.role, req.user._id)
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete appointment. Status is: ${appointment.status}. User role: ${req.user.role}`,
      });
    }

    // Optional: Check if EV checklist is completed (but don't block completion for testing)
    try {
      const { ServiceReception } = await import("../models/index.js");
      const serviceReception = await ServiceReception.findOne({
        appointmentId,
      });

      if (
        serviceReception &&
        !serviceReception.evChecklistProgress?.isCompleted
      ) {
        console.warn("EV checklist not completed, but allowing completion");
      }

      if (serviceReception && !serviceReception.areAllServicesCompleted?.()) {
        console.warn("Not all services completed, but allowing completion");
      }
    } catch (checklistError) {
      console.warn(
        "Could not check service reception:",
        checklistError.message
      );
      // Continue with completion even if checklist check fails
    }

    // Update appointment status with correct parameters
    await appointment.updateStatus(
      "completed",
      req.user._id,
      req.user.role,
      "Appointment completed",
      completionNotes
    );

    res.status(200).json({
      success: true,
      message: "Appointment completed successfully",
      data: {
        appointmentId: appointment._id,
        status: appointment.status,
        completedAt: appointment.updatedAt,
        canGenerateInvoice: true,
      },
    });
  } catch (error) {
    console.error("Error completing appointment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error completing appointment",
    });
  }
};

// @desc    Handle customer decision for insufficient parts
// @route   PUT /api/appointments/:id/parts-decision
// @access  Private (Staff/Admin)
export const handlePartsDecision = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const {
      decision, // 'wait', 'cancel', 'reschedule', 'proceed_without', 'mark_insufficient', 'resume_work'
      customerAgreed = false,
      newScheduledDate = null,
      rescheduleReason = "",
      estimatedPartsArrival = null,
      insufficientParts = [],
      reason = "",
    } = req.body;

    const validDecisions = [
      "wait",
      "cancel",
      "reschedule",
      "proceed_without",
      "mark_insufficient",
      "resume_work",
    ];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid decision. Must be one of: " + validDecisions.join(", "),
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Allow handling parts from multiple statuses
    const allowedStatuses = [
      "parts_insufficient",
      "in_progress",
      "reception_approved",
      "waiting_for_parts",
      "parts_requested",
    ];
    if (!allowedStatuses.includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot handle parts decision. Status is: ${
          appointment.status
        }. Expected: ${allowedStatuses.join(", ")}`,
      });
    }

    let newStatus;
    let statusMessage;

    switch (decision) {
      case "mark_insufficient":
        newStatus = "parts_insufficient";
        statusMessage = "Parts marked as insufficient during work";
        appointment.partsShortage = {
          shortageDate: new Date(),
          insufficientParts,
          reportedBy: req.user._id,
          reason,
        };
        break;

      case "wait":
        newStatus = "waiting_for_parts";
        statusMessage = "Customer agreed to wait for parts";
        if (estimatedPartsArrival) {
          if (!appointment.partsShortage) {
            appointment.partsShortage = {};
          }
          appointment.partsShortage.estimatedPartsArrival = new Date(
            estimatedPartsArrival
          );
        }
        break;

      case "cancel":
        newStatus = "cancelled";
        statusMessage = "Appointment cancelled due to parts issues";
        break;

      case "reschedule":
        if (!newScheduledDate) {
          return res.status(400).json({
            success: false,
            message: "New scheduled date is required for rescheduling",
          });
        }
        newStatus = "rescheduled";
        statusMessage = "Appointment rescheduled due to parts issues";
        appointment.reschedulingInfo = {
          reason: "parts_issues",
          originalDate: appointment.scheduledDate,
          newScheduledDate: new Date(newScheduledDate),
          rescheduledBy: req.user._id,
          rescheduledAt: new Date(),
          customerAgreed,
          reschedulingNotes: rescheduleReason,
        };
        appointment.scheduledDate = new Date(newScheduledDate);
        break;

      case "proceed_without":
        newStatus = "in_progress";
        statusMessage = "Customer agreed to proceed without all parts";
        break;

      case "resume_work":
        newStatus = "in_progress";
        statusMessage = "Parts are now available, resuming work";
        break;
    }

    // Update appointment with correct parameters
    await appointment.updateStatus(
      newStatus,
      req.user._id,
      req.user.role,
      statusMessage,
      reason
    );

    res.status(200).json({
      success: true,
      message: `Parts decision processed: ${decision}`,
      data: {
        appointmentId: appointment._id,
        status: appointment.status,
        decision,
        updatedAt: appointment.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error handling parts decision:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error handling parts decision",
    });
  }
};

// Get customer available actions for an appointment
export const getCustomerActions = async (req, res) => {
  try {
    const appointmentId = req.params.id;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // For customers, check if it's their appointment
    if (
      req.user.role === "customer" &&
      appointment.customerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this appointment",
      });
    }

    // Get customer actions using model method
    const actions = appointment.getCustomerActions(req.user._id);

    // Add appointment details for context
    res.status(200).json({
      success: true,
      data: {
        appointmentId,
        appointmentNumber: appointment.appointmentNumber,
        status: appointment.status,
        scheduledDate: appointment.scheduledDate,
        scheduledTime: appointment.scheduledTime,
        actions: {
          canCancel: actions.canCancel,
          canReschedule: actions.canReschedule,
          cancelReason: actions.cancelReason,
          rescheduleReason: actions.rescheduleReason,
          hoursLeft: actions.hoursLeft,
          rescheduleCount: actions.rescheduleCount,
          remainingReschedules: actions.remainingReschedules,
        },
      },
    });
  } catch (error) {
    console.error("Error getting customer actions:", error);
    res.status(500).json({
      success: false,
      message: "Error getting customer actions",
    });
  }
};

// Helper function to check parts availability
async function checkPartsAvailability(serviceReception, appointment, staffId) {
  try {
    const { Part } = await import("../models/index.js");
    let allPartsAvailable = true;
    let insufficientParts = [];

    // Check each requested part
    for (const requestedPart of serviceReception.requestedParts) {
      const part = await Part.findById(requestedPart.partId);
      if (part) {
        requestedPart.availableQuantity = part.currentStock;

        if (part.currentStock < requestedPart.quantity) {
          allPartsAvailable = false;
          requestedPart.shortfall = requestedPart.quantity - part.currentStock;
          insufficientParts.push({
            partName: part.name,
            partNumber: part.partNumber,
            requested: requestedPart.quantity,
            available: part.currentStock,
            shortfall: requestedPart.shortfall,
          });
        }

        requestedPart.isAvailable = part.currentStock >= requestedPart.quantity;
      }
    }

    await serviceReception.save();

    // Update appointment status based on parts availability
    if (!allPartsAvailable) {
      await appointment.updateStatus(
        "parts_insufficient",
        staffId,
        `Insufficient parts: ${insufficientParts
          .map((p) => p.partName)
          .join(", ")}`
      );

      // Add parts shortage details to appointment
      appointment.partsShortage = {
        insufficientParts,
        detectedAt: new Date(),
        detectedBy: staffId,
      };
      await appointment.save();
    }

    return { allPartsAvailable, insufficientParts };
  } catch (error) {
    console.error("Error checking parts availability:", error);
    throw error;
  }
}
