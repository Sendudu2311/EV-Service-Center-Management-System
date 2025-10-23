import mongoose from "mongoose";
import { sendSuccess, sendError } from "../utils/response.js";

// Import models - avoid importing Appointment to prevent circular dependency
const ServiceReception = mongoose.model("ServiceReception");
const User = mongoose.model("User");
const Vehicle = mongoose.model("Vehicle");
const Service = mongoose.model("Service");
const Part = mongoose.model("Part");

export const createServiceReception = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const {
      vehicleCondition,
      customerItems,
      specialInstructions,
      estimatedServiceTime,
      recommendedServices,
      requestedParts,
      preServicePhotos,
      diagnosticCodes,
    } = req.body;

    // Check if service reception already exists for this appointment
    const existingReception = await ServiceReception.findOne({ appointmentId });
    if (existingReception) {
      return sendError(
        res,
        400,
        "Service reception already exists for this appointment",
        null,
        "RECEPTION_EXISTS"
      );
    }

    // Get appointment data
    const Appointment = mongoose.model("Appointment");
    const appointment = await Appointment.findById(appointmentId)
      .populate("customerId")
      .populate("vehicleId");

    if (!appointment) {
      return sendError(
        res,
        404,
        "Appointment not found",
        null,
        "APPOINTMENT_NOT_FOUND"
      );
    }

    // Verify appointment status
    if (appointment.status !== "customer_arrived") {
      return sendError(
        res,
        400,
        "Cannot create service reception. Customer must be marked as arrived first",
        null,
        "INVALID_STATUS"
      );
    }

    // Verify technician authorization
    if (
      req.user.role !== "admin" &&
      appointment.assignedTechnician?.toString() !== req.user._id.toString()
    ) {
      return sendError(
        res,
        403,
        "Only assigned technician can create service reception",
        null,
        "UNAUTHORIZED_TECHNICIAN"
      );
    }

    // Validate recommended services exist
    if (recommendedServices && recommendedServices.length > 0) {
      const serviceIds = recommendedServices.map((s) => s.serviceId);
      const services = await Service.find({ _id: { $in: serviceIds } });
      if (services.length !== serviceIds.length) {
        return sendError(
          res,
          400,
          "One or more recommended services not found",
          null,
          "INVALID_SERVICES"
        );
      }
    }

    // Validate requested parts exist (don't check stock - staff will do that during approval)
    if (requestedParts && requestedParts.length > 0) {
      const partIds = requestedParts.map((p) => p.partId);
      const parts = await Part.find({ _id: { $in: partIds } });
      if (parts.length !== partIds.length) {
        return sendError(
          res,
          400,
          "One or more requested parts not found",
          null,
          "INVALID_PARTS"
        );
      }
    }

    // Calculate estimated completion time
    const completionTime = estimatedServiceTime
      ? new Date(Date.now() + estimatedServiceTime * 60 * 1000)
      : new Date(Date.now() + 2 * 60 * 60 * 1000);

    // Generate reception number (format: REC-YYMMDD-XXX)
    const today = new Date();
    const dateStr =
      today.getFullYear().toString().slice(-2) +
      (today.getMonth() + 1).toString().padStart(2, "0") +
      today.getDate().toString().padStart(2, "0");

    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const todayCount = await ServiceReception.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd },
    });

    const receptionNumber = `REC-${dateStr}-${(todayCount + 1)
      .toString()
      .padStart(3, "0")}`;

    // Process recommended services - add addedBy field
    const processedRecommendedServices = (recommendedServices || []).map(service => ({
      ...service,
      addedBy: req.user._id,
      addedAt: new Date()
    }));

    // Create service reception
    // NOTE: Initial booked service is already paid and NOT tracked in reception
    // Only recommendedServices (discovered during inspection) are tracked
    const serviceReception = new ServiceReception({
      receptionNumber,
      appointmentId,
      customerId: appointment.customerId._id,
      vehicleId: appointment.vehicleId._id,
      receivedBy: req.user._id,
      estimatedCompletionTime: completionTime,
      vehicleCondition: vehicleCondition || {},
      customerItems: customerItems || [],
      specialInstructions: specialInstructions || {},
      estimatedServiceTime: estimatedServiceTime || 120,
      recommendedServices: processedRecommendedServices,
      requestedParts: requestedParts || [],
      preServicePhotos: preServicePhotos || [],
      diagnosticCodes: diagnosticCodes || [],
      status: "received",
      // Auto-submit to staff for review
      submissionStatus: {
        submittedToStaff: true,
        submittedBy: req.user._id,
        submittedAt: new Date(),
        staffReviewStatus: 'pending'
      }
    });

    await serviceReception.save();

    // Update appointment status to reception_created
    appointment.status = "reception_created";
    appointment.serviceReceptionId = serviceReception._id;
    appointment.workflowHistory.push({
      status: "reception_created",
      changedBy: req.user._id,
      changedAt: new Date(),
      notes: "Service reception created by technician",
    });
    await appointment.save();

    // Populate the response
    const populatedReception = await ServiceReception.findById(
      serviceReception._id
    )
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      .populate("receivedBy", "firstName lastName email")
      .populate("recommendedServices.serviceId", "name description basePrice")
      .populate("requestedParts.partId", "name partNumber price");

    return sendSuccess(
      res,
      201,
      "Service reception created successfully",
      populatedReception
    );
  } catch (error) {
    console.error("Error creating service reception:", error);
    return sendError(
      res,
      500,
      "Error creating service reception",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};;

export const getServiceReception = async (req, res) => {
  try {
    const { id } = req.params;

    const serviceReception = await ServiceReception.findById(id)
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      .populate("receivedBy", "firstName lastName email")
      .populate("recommendedServices.serviceId", "name description basePrice category estimatedDuration")
      .populate("recommendedServices.addedBy", "firstName lastName")
      .populate("requestedParts.partId", "name partNumber pricing");

    if (!serviceReception) {
      return sendError(
        res,
        404,
        "Service reception not found",
        null,
        "RECEPTION_NOT_FOUND"
      );
    }

    return sendSuccess(
      res,
      200,
      "Service reception retrieved successfully",
      serviceReception
    );
  } catch (error) {
    console.error("Error retrieving service reception:", error);
    return sendError(
      res,
      500,
      "Error retrieving service reception",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};


// Get service receptions by technician
export const getServiceReceptionsByTechnician = async (req, res) => {
  try {
    const technicianId = req.user._id;

    const serviceReceptions = await ServiceReception.find({
      receivedBy: technicianId
    })
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      .populate("receivedBy", "firstName lastName email")
      .populate("submissionStatus.reviewedBy", "firstName lastName email")
      .populate("recommendedServices.serviceId", "name description basePrice category estimatedDuration")
      .populate("recommendedServices.addedBy", "firstName lastName")
      .populate("requestedParts.partId", "name partNumber pricing")
      .sort({ createdAt: -1 });

    return sendSuccess(
      res,
      200,
      "Service receptions retrieved successfully",
      serviceReceptions
    );
  } catch (error) {
    console.error("Error retrieving service receptions by technician:", error);
    return sendError(
      res,
      500,
      "Error retrieving service receptions",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};

export const updateServiceReception = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const serviceReception = await ServiceReception.findById(id);
    if (!serviceReception) {
      return sendError(
        res,
        404,
        "Service reception not found",
        null,
        "RECEPTION_NOT_FOUND"
      );
    }

    // Verify authorization
    if (
      req.user.role !== "admin" &&
      serviceReception.receivedBy?.toString() !== req.user._id.toString()
    ) {
      return sendError(
        res,
        403,
        "Only assigned technician can update service reception",
        null,
        "UNAUTHORIZED_TECHNICIAN"
      );
    }

    // Update fields
    Object.keys(updates).forEach((key) => {
      if (key !== "_id" && key !== "appointmentId" && key !== "createdAt") {
        serviceReception[key] = updates[key];
      }
    });

    serviceReception.updatedAt = new Date();
    await serviceReception.save();

    const populatedReception = await ServiceReception.findById(
      serviceReception._id
    )
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      // serviceCenterId populate removed - single center architecture
      .populate("receivedBy", "firstName lastName email")
      .populate("recommendedServices.serviceId", "name description basePrice category estimatedDuration")
      .populate("recommendedServices.addedBy", "firstName lastName")
      .populate("requestedParts.partId", "name partNumber pricing");

    return sendSuccess(
      res,
      200,
      "Service reception updated successfully",
      populatedReception
    );
  } catch (error) {
    console.error("Error updating service reception:", error);
    return sendError(
      res,
      500,
      "Error updating service reception",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};

// Re-submit service reception after update (for rejected receptions)
export const resubmitServiceReception = async (req, res) => {
  try {
    const { id } = req.params;

    const serviceReception = await ServiceReception.findById(id);
    if (!serviceReception) {
      return sendError(
        res,
        404,
        "Service reception not found",
        null,
        "RECEPTION_NOT_FOUND"
      );
    }

    // Verify authorization
    if (
      req.user.role !== "admin" &&
      serviceReception.receivedBy?.toString() !== req.user._id.toString()
    ) {
      return sendError(
        res,
        403,
        "Only assigned technician can resubmit service reception",
        null,
        "UNAUTHORIZED_TECHNICIAN"
      );
    }

    // Only allow resubmit if rejected
    if (serviceReception.submissionStatus.staffReviewStatus !== "rejected") {
      return sendError(
        res,
        400,
        "Can only resubmit rejected service receptions",
        null,
        "INVALID_STATUS"
      );
    }

    // Reset submission status
    serviceReception.submissionStatus.submittedToStaff = true;
    serviceReception.submissionStatus.staffReviewStatus = "pending";
    serviceReception.submissionStatus.submittedBy = req.user._id;
    serviceReception.submissionStatus.submittedAt = new Date();
    // Clear previous review
    serviceReception.submissionStatus.reviewedBy = undefined;
    serviceReception.submissionStatus.reviewedAt = undefined;
    serviceReception.submissionStatus.reviewNotes = "";

    serviceReception.updatedAt = new Date();
    await serviceReception.save();

    const populatedReception = await ServiceReception.findById(
      serviceReception._id
    )
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      .populate("receivedBy", "firstName lastName email")
      .populate("recommendedServices.serviceId", "name description basePrice category estimatedDuration")
      .populate("recommendedServices.addedBy", "firstName lastName")
      .populate("requestedParts.partId", "name partNumber pricing");

    return sendSuccess(
      res,
      200,
      "Service reception resubmitted successfully",
      populatedReception
    );
  } catch (error) {
    console.error("Error resubmitting service reception:", error);
    return sendError(
      res,
      500,
      "Error resubmitting service reception",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};

export const approveServiceReception = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, reviewNotes, approved, staffNotes } = req.body;

    // Support both old format (approved: boolean) and new format (decision: 'approved'/'rejected')
    const isApproved = decision ? decision === 'approved' : approved;
    const notes = reviewNotes || staffNotes || '';

    const serviceReception = await ServiceReception.findById(id);
    if (!serviceReception) {
      return sendError(
        res,
        404,
        "Service reception not found",
        null,
        "RECEPTION_NOT_FOUND"
      );
    }

    // Only staff or admin can approve
    if (!["staff", "admin"].includes(req.user.role)) {
      return sendError(
        res,
        403,
        "Only staff can approve service reception",
        null,
        "UNAUTHORIZED_ROLE"
      );
    }

    // Update approval info
    // Note: Only update serviceReception.status to 'approved' if approved
    // If rejected, keep current status (usually 'received')
    if (isApproved) {
      serviceReception.status = "approved";
    }
    serviceReception.submissionStatus.staffReviewStatus = isApproved
      ? "approved"
      : "rejected";
    serviceReception.submissionStatus.reviewedBy = req.user._id;
    serviceReception.submissionStatus.reviewedAt = new Date();
    serviceReception.submissionStatus.reviewNotes = notes;
    serviceReception.updatedAt = new Date();

    await serviceReception.save();

    // Update appointment status
    const Appointment = mongoose.model("Appointment");
    const appointment = await Appointment.findById(
      serviceReception.appointmentId
    );
    if (appointment && isApproved) {
      // Only update appointment status when approved
      appointment.status = "reception_approved";
      appointment.workflowHistory.push({
        status: "reception_approved",
        changedBy: req.user._id,
        changedAt: new Date(),
        notes: "Service reception approved by staff",
      });
      await appointment.save();
    } else if (appointment && !isApproved) {
      // When rejected, just add to history but keep current status
      appointment.workflowHistory.push({
        status: appointment.status, // Keep current status
        changedBy: req.user._id,
        changedAt: new Date(),
        notes: `Service reception rejected by staff: ${notes || 'No reason provided'}`,
      });
      await appointment.save();
    }

    const populatedReception = await ServiceReception.findById(
      serviceReception._id
    )
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      .populate("receivedBy", "firstName lastName email")
      .populate("submissionStatus.reviewedBy", "firstName lastName email")
      .populate("recommendedServices.serviceId", "name description basePrice category estimatedDuration")
      .populate("recommendedServices.addedBy", "firstName lastName")
      .populate("requestedParts.partId", "name partNumber pricing");

    return sendSuccess(
      res,
      200,
      `Service reception ${isApproved ? "approved" : "rejected"} successfully`,
      populatedReception
    );
  } catch (error) {
    console.error("Error approving service reception:", error);
    return sendError(
      res,
      500,
      "Error approving service reception",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};
