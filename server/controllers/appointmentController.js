import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Vehicle from "../models/Vehicle.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import TechnicianProfile from "../models/TechnicianProfile.js";
import {
  vietnamDateTimeToUTC,
  utcToVietnamDateTime,
  roundToSlotBoundary,
} from "../utils/timezone.js";

// @desc    Get appointments for current user (role-based)
// @route   GET /api/appointments
// @access  Private
export const getAppointments = async (req, res) => {
  try {
    let appointments;
    const { status, page = 1, limit = 10, customerId } = req.query;
    const skip = (page - 1) * limit;

    // Build filter based on user role
    let filter = {};

    // Check for customerId query parameter first (for getting specific customer's appointments)
    if (customerId) {
      filter.customerId = customerId;
    } else {
      // Role-based filtering when no specific customerId is requested
      if (req.user.role === "customer") {
        filter.customerId = req.user._id;
      } else if (req.user.role === "technician") {
        filter.assignedTechnician = req.user._id;
      } else if (req.user.role === "staff") {
        filter.serviceCenterId = req.user.serviceCenterId;
      }
      // Admin can see all appointments (no additional filter)
    }

    // Add status filter if provided
    if (status) {
      filter.status = status;
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
      // serviceCenterId populate removed - single center architecture
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
      // serviceCenterId populate removed - single center architecture
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

    if (
      req.user.role === "staff" &&
      appointment.serviceCenterId._id.toString() !==
        req.user.serviceCenterId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this appointment",
      });
    }

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
    const {
      vehicleId,
      serviceCenterId,
      services, // array of { serviceId, quantity }
      scheduledDate,
      scheduledTime,
      customerNotes,
      priority = "normal",
      technicianId, // optional technician selection by customer
      paymentInfo, // payment information for paid appointments
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

    // Single center architecture - no service center validation needed

    // Validate services exist
    const serviceIds = services.map((s) => s.serviceId);
    const validServices = await Service.find({
      _id: { $in: serviceIds },
      isActive: true,
    });

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
        serviceCenterId: serviceCenterId,
        isActive: true,
      });

      if (!technician) {
        return res.status(400).json({
          success: false,
          message: "Selected technician not available at this service center",
        });
      }

      // Check technician availability for the scheduled time
      const appointmentDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      const totalDuration = services.reduce((total, service) => {
        const serviceData = validServices.find(
          (s) => s._id.toString() === service.serviceId
        );
        return total + serviceData.estimatedDuration * (service.quantity || 1);
      }, 0);
      const estimatedCompletion = new Date(
        appointmentDateTime.getTime() + totalDuration * 60000
      );

      // Check for time slot conflicts
      const conflictingAppointments = await Appointment.find({
        assignedTechnician: technicianId,
        $or: [
          {
            scheduledDate: {
              $gte: appointmentDateTime,
              $lt: estimatedCompletion,
            },
          },
          {
            estimatedCompletion: {
              $gt: appointmentDateTime,
              $lte: estimatedCompletion,
            },
          },
          {
            scheduledDate: { $lte: appointmentDateTime },
            estimatedCompletion: { $gte: estimatedCompletion },
          },
        ],
        status: { $in: ["confirmed", "in_progress"] },
      });

      if (conflictingAppointments.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Selected technician is not available during this time slot",
          conflictingAppointments: conflictingAppointments.length,
        });
      }

      // Check technician workload capacity
      try {
        const technicianProfile = await TechnicianProfile.findOne({
          technicianId,
        });

        if (technicianProfile) {
          // Check if technician is available for appointment duration
          if (
            !technicianProfile.isAvailableForAppointment(
              appointmentDateTime,
              totalDuration
            )
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Selected technician is not available due to workload or schedule constraints",
              workloadPercentage: technicianProfile.workloadPercentage,
              currentWorkload: technicianProfile.workload.current,
              capacity: technicianProfile.workload.capacity,
            });
          }
        }
      } catch (error) {
        console.error("Error checking technician availability:", error);
        // Continue without failing - basic conflict check was already done
      }

      assignedTechnician = technicianId;
    }

    // Build services array with pricing
    const appointmentServices = services.map((service) => {
      const serviceData = validServices.find(
        (s) => s._id.toString() === service.serviceId
      );
      return {
        serviceId: service.serviceId,
        quantity: service.quantity || 1,
        price: serviceData.basePrice,
        estimatedDuration: serviceData.estimatedDuration,
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
    const appointment = await Appointment.create({
      appointmentNumber,
      customerId: req.user._id,
      vehicleId,
      serviceCenterId,
      services: appointmentServices,
      scheduledDate: appointmentDateTime,
      scheduledTime,
      customerNotes,
      priority,
      estimatedCompletion,
      assignedTechnician: assignedTechnician,
      status: "pending", // Always pending, requires staff confirmation
      paymentInfo: paymentInfo, // Include payment information if provided
      paymentStatus: paymentInfo ? "paid" : "pending", // Set payment status
    });

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

    // Populate for response
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("vehicleId", "make model year")
      // serviceCenterId populate removed - single center architecture
      .populate("services.serviceId", "name category")
      .populate("assignedTechnician", "firstName lastName specializations");

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
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

    // Handle refund for customer cancellations with payment
    let refundInfo = null;
    if (req.user.role === "customer" && appointment.paymentInfo) {
      try {
        // Import VNPAYTransaction here to avoid circular dependency
        const { default: VNPAYTransaction } = await import(
          "../models/VNPAYTransaction.js"
        );

        // Find the transaction associated with this appointment
        const transaction = await VNPAYTransaction.findOne({
          transactionRef: appointment.paymentInfo.transactionRef,
          userId: req.user._id,
        });

        if (transaction && transaction.status === "completed") {
          // Create a new refund transaction record
          const refundTransactionRef = `REFUND_${
            transaction.transactionRef
          }_${Date.now()}`;

          const refundTransaction = new VNPAYTransaction({
            transactionRef: refundTransactionRef,
            paymentType: "refund",
            orderInfo: `Refund for appointment ${appointment.appointmentNumber} - Customer cancellation`,
            orderType: "refund",
            userId: req.user._id,
            appointmentId: appointment._id,
            amount: transaction.paidAmount,
            paidAmount: transaction.paidAmount,
            currency: "VND",
            status: "completed", // Refund is immediately processed
            responseCode: "00", // Success code for refund
            vnpayData: {
              bankCode: transaction.vnpayData?.bankCode,
              cardType: transaction.vnpayData?.cardType,
              paymentDate: new Date(),
            },
            settlementInfo: {
              settled: true,
              settlementDate: new Date(),
              settlementAmount: transaction.paidAmount,
              settlementReference: `REFUND${Date.now()}`,
            },
            metadata: {
              originalTransactionId: transaction._id,
              originalTransactionRef: transaction.transactionRef,
              refundReason: "Customer requested cancellation",
              refundedBy: req.user._id,
              refundDate: new Date(),
              refundType: "customer_cancellation",
              appointmentNumber: appointment.appointmentNumber,
            },
          });

          await refundTransaction.save();

          // Update original transaction status to refunded
          await transaction.updateStatus("refunded", {
            metadata: {
              ...transaction.metadata,
              refundTransactionId: refundTransaction._id,
              refundTransactionRef: refundTransactionRef,
              refundReason: "Customer requested cancellation",
              refundedBy: req.user._id,
              refundDate: new Date(),
              refundType: "customer_cancellation",
            },
          });

          refundInfo = {
            refundAmount: transaction.paidAmount,
            refundReference: refundTransactionRef,
            refundDate: new Date(),
            status: "refunded",
            refundTransactionId: refundTransaction._id,
          };

          console.log(
            `[Appointment Cancellation] Refund transaction created for appointment ${appointment._id}: ${refundInfo.refundAmount} VND (Refund ID: ${refundTransaction._id})`
          );
        }
      } catch (refundError) {
        console.error(
          "Error processing refund for appointment cancellation:",
          refundError
        );
        // Don't fail the cancellation if refund fails
      }
    }

    await appointment.save();

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
        refundInfo: refundInfo,
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

// @desc    Get available technicians for specific time slot and services
// @route   GET /api/appointments/available-technicians
// @access  Private
export const getAvailableTechnicians = async (req, res) => {
  try {
    // Log: Incoming request details
    console.log(
      "🔍 [getAvailableTechnicians] Called with query params:",
      req.query
    );
    console.log("👤 [getAvailableTechnicians] User role:", req.user?.role);
    console.log("👤 [getAvailableTechnicians] User ID:", req.user?._id);

    const { date, time, duration = 60, serviceCategories } = req.query;

    // Log: Parameter validation
    console.log("📅 [getAvailableTechnicians] Date:", date);
    console.log("⏰ [getAvailableTechnicians] Time:", time);
    console.log("⏱️ [getAvailableTechnicians] Duration:", duration);
    console.log(
      "🔧 [getAvailableTechnicians] Service Categories:",
      serviceCategories
    );

    if (!date || !time) {
      console.error(
        "❌ [getAvailableTechnicians] Missing required parameters - date or time"
      );
      return res.status(400).json({
        success: false,
        message: "Date and time are required",
      });
    }

    // Create appointment datetime
    const appointmentDateTime = new Date(`${date}T${time}`);
    const estimatedCompletion = new Date(
      appointmentDateTime.getTime() + parseInt(duration) * 60000
    );

    console.log(
      "📅 [getAvailableTechnicians] Appointment DateTime:",
      appointmentDateTime
    );
    console.log(
      "📅 [getAvailableTechnicians] Estimated Completion:",
      estimatedCompletion
    );

    // Single center architecture - get all active technicians
    const technicians = await User.find({
      role: "technician",
      isActive: true,
    }).select("_id firstName lastName specializations");

    console.log(
      "👨‍🔧 [getAvailableTechnicians] Found technicians:",
      technicians.length
    );

    if (technicians.length === 0) {
      console.warn("⚠️ [getAvailableTechnicians] No technicians found");
      return res.status(200).json({
        success: true,
        data: [],
        message: "No technicians found",
      });
    }

    const technicianIds = technicians.map((t) => t._id);
    console.log("🆔 [getAvailableTechnicians] Technician IDs:", technicianIds);

    // Get technician profiles
    const profiles = await TechnicianProfile.find({
      technicianId: { $in: technicianIds },
      isActive: true,
    }).populate("technicianId", "firstName lastName specializations");

    console.log(
      "📋 [getAvailableTechnicians] Found profiles:",
      profiles.length
    );

    // Check availability for each technician
    const availableTechnicians = [];

    for (const profile of profiles) {
      console.log(
        `🔍 [getAvailableTechnicians] Checking technician: ${profile.technicianId?.firstName} ${profile.technicianId?.lastName}`
      );

      // Check basic availability
      const isBasicallyAvailable = profile.isAvailableForAppointment(
        appointmentDateTime,
        parseInt(duration)
      );

      console.log(
        `📊 [getAvailableTechnicians] Basic availability: ${isBasicallyAvailable}`
      );

      if (!isBasicallyAvailable) {
        console.log(
          `❌ [getAvailableTechnicians] Technician ${profile.technicianId?.firstName} not basically available`
        );
        continue;
      }

      // Check for conflicting appointments
      const conflictingAppointments = await Appointment.find({
        assignedTechnician: profile.technicianId._id,
        $or: [
          {
            scheduledDate: {
              $gte: appointmentDateTime,
              $lt: estimatedCompletion,
            },
          },
          {
            estimatedCompletion: {
              $gt: appointmentDateTime,
              $lte: estimatedCompletion,
            },
          },
          {
            scheduledDate: { $lte: appointmentDateTime },
            estimatedCompletion: { $gte: estimatedCompletion },
          },
        ],
        status: { $in: ["confirmed", "in_progress"] },
      });

      if (conflictingAppointments.length === 0) {
        console.log(
          `✅ [getAvailableTechnicians] Technician ${profile.technicianId?.firstName} is available`
        );

        // Calculate skill matching score if service categories provided
        let skillMatchScore = 0;
        if (serviceCategories) {
          const categories = Array.isArray(serviceCategories)
            ? serviceCategories
            : [serviceCategories];
          skillMatchScore = calculateSkillMatch(
            profile.skillMatrix,
            categories
          );
          console.log(
            `🎯 [getAvailableTechnicians] Skill match score: ${skillMatchScore}`
          );
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
          isRecommended: skillMatchScore > 70, // High skill match
          yearsExperience: profile.yearsExperience ?? 0,
        });
      }
    }

    console.log(
      `📊 [getAvailableTechnicians] Available technicians: ${availableTechnicians.length}`
    );

    // Sort by recommendation, then by performance
    availableTechnicians.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return b.performance.customerRating - a.performance.customerRating;
    });

    console.log(
      "✅ [getAvailableTechnicians] Returning available technicians:",
      availableTechnicians.length
    );

    res.status(200).json({
      success: true,
      data: availableTechnicians,
      availableCount: availableTechnicians.length,
      totalTechnicians: technicians.length,
      timeSlot: {
        date,
        time,
        duration: parseInt(duration),
      },
    });
  } catch (error) {
    console.error(
      "❌ [getAvailableTechnicians] Error fetching available technicians:",
      error
    );
    console.error("📊 [getAvailableTechnicians] Stack trace:", error.stack);
    console.error("📊 [getAvailableTechnicians] Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
    });

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

    // Get technician profile
    const technicianProfile = await TechnicianProfile.findOne({
      technicianId,
    }).populate("technicianId", "firstName lastName specializations");

    if (!technicianProfile) {
      return res.status(404).json({
        success: false,
        message: "Technician profile not found",
      });
    }

    // Create appointment datetime
    const appointmentDateTime = new Date(`${date}T${time}`);
    const estimatedCompletion = new Date(
      appointmentDateTime.getTime() + duration * 60000
    );

    // Check basic availability
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
          technicianStatus: technicianProfile.availability.status,
          workloadPercentage: technicianProfile.workloadPercentage,
        },
      });
    }

    // Check for conflicting appointments with improved overlap detection
    const conflictingAppointments = await Appointment.find({
      assignedTechnician: technicianId,
      $or: [
        {
          scheduledDate: {
            $gte: appointmentDateTime,
            $lt: estimatedCompletion,
          },
        },
        {
          estimatedCompletion: {
            $gt: appointmentDateTime,
            $lte: estimatedCompletion,
          },
        },
        {
          scheduledDate: { $lte: appointmentDateTime },
          estimatedCompletion: { $gte: estimatedCompletion },
        },
      ],
      status: { $in: ["confirmed", "in_progress"] },
    });

    const hasConflicts = conflictingAppointments.length > 0;

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
        conflictingAppointments: hasConflicts
          ? conflictingAppointments.length
          : 0,
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
  serviceCenterId,
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
    serviceCenterId,
    $or: [
      {
        scheduledDate: {
          $gte: appointmentDateTime,
          $lt: estimatedCompletion,
        },
      },
      {
        estimatedCompletion: {
          $gt: appointmentDateTime,
          $lte: estimatedCompletion,
        },
      },
      {
        scheduledDate: { $lte: appointmentDateTime },
        estimatedCompletion: { $gte: estimatedCompletion },
      },
    ],
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
    const {
      serviceCenterId,
      date,
      time,
      duration = 60,
      technicianId,
    } = req.query;

    if (!serviceCenterId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Service center ID, date, and time are required",
      });
    }

    // Check service center availability
    const centerConflicts = await enhancedAvailabilityCheck(
      serviceCenterId,
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
      const techConflicts = await Appointment.find({
        assignedTechnician: technicianId,
        $or: [
          {
            scheduledDate: {
              $gte: new Date(`${date}T${time}`),
              $lt: new Date(
                new Date(`${date}T${time}`).getTime() + duration * 60000
              ),
            },
          },
        ],
        status: { $in: ["pending", "confirmed", "in_progress"] },
      });

      if (techConflicts.length > 0) {
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
    const { serviceCenterId, date, duration = 60 } = req.query;

    if (!serviceCenterId || !date) {
      return res.status(400).json({
        success: false,
        message: "Service center ID and date are required",
      });
    }

    // Single center architecture - use default service center data
    const serviceCenter = {
      name: "EV Service Center",
      capacity: {
        totalBays: 10,
        availableBays: 8,
        maxDailyAppointments: 50,
      },
      workingHours: {
        monday: { open: "08:00", close: "18:00", isOpen: true },
        tuesday: { open: "08:00", close: "18:00", isOpen: true },
        wednesday: { open: "08:00", close: "18:00", isOpen: true },
        thursday: { open: "08:00", close: "18:00", isOpen: true },
        friday: { open: "08:00", close: "18:00", isOpen: true },
        saturday: { open: "08:00", close: "16:00", isOpen: true },
        sunday: { open: "09:00", close: "15:00", isOpen: false },
      },
    };

    // Get working hours for the requested day
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.toLocaleDateString("en-US", {
      weekday: "lowercase",
    });
    const workingHours = serviceCenter.workingHours[dayOfWeek];

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

    // Get existing appointments for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await Appointment.find({
      serviceCenterId,
      scheduledDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ["pending", "confirmed", "in_progress"] },
    }).select("scheduledTime estimatedCompletion");

    // Generate available time slots
    const availableSlots = generateTimeSlots(
      workingHours.open,
      workingHours.close,
      duration,
      existingAppointments,
      serviceCenter.capacity.totalBays
    );

    res.status(200).json({
      success: true,
      data: {
        isOpen: true,
        workingHours,
        availableSlots,
        totalBays: serviceCenter.capacity.totalBays,
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

      // Get technicians from the appointment's service center
      const technicians = await User.find({
        role: "technician",
        serviceCenterId: appointment.serviceCenterId,
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

    // Additional availability check
    const conflictingAppointments = await Appointment.find({
      assignedTechnician: selectedTechnicianId,
      scheduledDate: {
        $gte: appointment.scheduledDate,
        $lte: appointment.estimatedCompletion || appointment.scheduledDate,
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

    // Update technician profiles

    // Remove from previous technician's workload if reassigning
    if (
      previousTechnician &&
      !previousTechnician.equals(selectedTechnicianId)
    ) {
      const prevProfile = await TechnicianProfile.findOne({
        technicianId: previousTechnician,
      });
      if (prevProfile) {
        await prevProfile.completeAppointment(appointment._id);
      }
    }

    // Add to new technician's workload
    const newProfile = await TechnicianProfile.findOne({
      technicianId: selectedTechnicianId,
    });
    if (newProfile) {
      await newProfile.assignAppointment(appointment._id);
    }

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
      serviceCenterId,
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

    // Service center filter
    if (serviceCenterId) {
      filter.serviceCenterId = serviceCenterId;
    } else if (req.user.role === "staff" && req.user.serviceCenterId) {
      filter.serviceCenterId = req.user.serviceCenterId;
    }

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
      // serviceCenterId populate removed - single center architecture
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

          // Filter technicians by service center
          const centerTechnicians = availableTechnicians.filter(
            (profile) =>
              profile.technicianId.serviceCenterId &&
              profile.technicianId.serviceCenterId.equals(
                appointment.serviceCenterId._id
              )
          );

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

    // Staff can only see appointments for their service center
    if (req.user.role === "staff") {
      filter.serviceCenterId = req.user.serviceCenterId;
    }

    const appointments = await Appointment.find(filter)
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year vin licensePlate")
      // serviceCenterId populate removed - single center architecture
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

    // Filter by service center for staff
    if (req.user.role === "staff") {
      filter.serviceCenterId = req.user.serviceCenterId;
    }

    const pendingReceptions = await ServiceReception.find(filter)
      .populate(
        "appointmentId",
        "appointmentNumber scheduledDate scheduledTime"
      )
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year vin licensePlate")
      // serviceCenterId populate removed - single center architecture
      .populate("submissionStatus.submittedBy", "firstName lastName")
      .populate("bookedServices.serviceId", "name category basePrice")
      .populate(
        "requestedParts.partId",
        "name partNumber currentStock unitPrice"
      )
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
