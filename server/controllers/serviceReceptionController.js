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
      notes,
      estimatedCompletionTime,
      checklist,
      services: requestedServices,
      parts: requestedParts,
      vehicleCondition,
      customerItems,
      specialInstructions,
      estimatedServiceTime,
      priorityLevel,
      additionalServices,
      requestedParts: frontendRequestedParts,
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

    // Get appointment data using direct mongoose query to avoid import issues
    const Appointment = mongoose.model("Appointment");
    const appointment = await Appointment.findById(appointmentId)
      .populate("customerId")
      .populate("vehicleId")
      // serviceCenterId populate removed - single center architecture
      .populate("services");

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

    // Validate requested services exist
    if (requestedServices && requestedServices.length > 0) {
      const serviceIds = requestedServices.map((s) => s.serviceId);
      const services = await Service.find({ _id: { $in: serviceIds } });
      if (services.length !== serviceIds.length) {
        return sendError(
          res,
          400,
          "One or more requested services not found",
          null,
          "INVALID_SERVICES"
        );
      }
    }

    // Validate requested parts exist and have sufficient stock
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

      // Check stock availability
      for (const requestedPart of requestedParts) {
        const part = parts.find(
          (p) => p._id.toString() === requestedPart.partId
        );
        if (part.stockQuantity < requestedPart.quantity) {
          return sendError(
            res,
            400,
            `Insufficient stock for part: ${part.name}`,
            null,
            "INSUFFICIENT_STOCK"
          );
        }
      }
    }

    // Merge parts data: prioritize frontend requestedParts if available, otherwise use legacy parts field
    const finalRequestedParts = frontendRequestedParts || requestedParts || [];

    // Calculate estimated completion time based on estimatedServiceTime
    const completionTime = estimatedServiceTime
      ? new Date(Date.now() + estimatedServiceTime * 60 * 1000)
      : estimatedCompletionTime || new Date(Date.now() + 2 * 60 * 60 * 1000);

    // Generate reception number (format: REC-YYMMDD-XXX)
    const today = new Date();
    const dateStr =
      today.getFullYear().toString().slice(-2) +
      (today.getMonth() + 1).toString().padStart(2, "0") +
      today.getDate().toString().padStart(2, "0");

    // Get count of receptions today for sequential number
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

    // Prepare booked services from appointment services
    const bookedServices = (appointment.services || []).map(
      (appointmentService) => ({
        serviceId:
          typeof appointmentService.serviceId === "string"
            ? appointmentService.serviceId
            : appointmentService.serviceId._id,
        serviceName:
          typeof appointmentService.serviceId === "string"
            ? "Unknown Service"
            : appointmentService.serviceId.name,
        category:
          typeof appointmentService.serviceId === "string"
            ? "general"
            : appointmentService.serviceId.category,
        quantity: appointmentService.quantity,
        estimatedDuration:
          typeof appointmentService.serviceId === "string"
            ? 60
            : appointmentService.serviceId.estimatedDuration,
        basePrice:
          typeof appointmentService.serviceId === "string"
            ? 0
            : appointmentService.serviceId.basePrice,
        customerInstructions: appointmentService.notes || "",
        isCompleted: false,
      })
    );

    // Create service reception
    const serviceReception = new ServiceReception({
      receptionNumber,
      appointmentId,
      customerId: appointment.customerId._id,
      vehicleId: appointment.vehicleId._id,
      serviceCenterId: appointment.serviceCenterId._id,
      receivedBy: req.user._id,
      notes: notes || specialInstructions?.fromCustomer || "",
      estimatedCompletionTime: completionTime,
      checklist: checklist || {},
      services: requestedServices || [],
      bookedServices: bookedServices,
      // Enhanced data from new frontend structure
      vehicleCondition: vehicleCondition || {},
      customerItems: customerItems || [],
      specialInstructions: specialInstructions || {},
      estimatedServiceTime: estimatedServiceTime || 120,
      priorityLevel: priorityLevel || "normal",
      additionalServices: additionalServices || [],
      requestedParts: finalRequestedParts,
      status: "received",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save service reception
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
      // serviceCenterId populate removed - single center architecture
      .populate("receivedBy", "firstName lastName email")
      .populate("bookedServices.serviceId", "name description basePrice")
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
};

export const getServiceReception = async (req, res) => {
  try {
    const { id } = req.params;

    const serviceReception = await ServiceReception.findById(id)
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      // serviceCenterId populate removed - single center architecture
      .populate("receivedBy", "firstName lastName email")
      .populate("services.serviceId", "name description basePrice")
      .populate("parts.partId", "name partNumber price");

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
      .populate("services.serviceId", "name description basePrice")
      .populate("parts.partId", "name partNumber price");

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

export const approveServiceReception = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, staffNotes } = req.body;

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

    // Update status and approval info
    serviceReception.status = approved ? "approved" : "rejected";
    serviceReception.submissionStatus.staffReviewStatus = approved
      ? "approved"
      : "rejected";
    serviceReception.submissionStatus.reviewedBy = req.user._id;
    serviceReception.submissionStatus.reviewedAt = new Date();
    serviceReception.submissionStatus.reviewNotes = staffNotes || "";
    serviceReception.updatedAt = new Date();

    await serviceReception.save();

    // Update appointment status
    const Appointment = mongoose.model("Appointment");
    const appointment = await Appointment.findById(
      serviceReception.appointmentId
    );
    if (appointment) {
      appointment.status = approved
        ? "reception_approved"
        : "reception_rejected";
      appointment.workflowHistory.push({
        status: approved ? "reception_approved" : "reception_rejected",
        changedBy: req.user._id,
        changedAt: new Date(),
        notes: `Service reception ${
          approved ? "approved" : "rejected"
        } by staff`,
      });
      await appointment.save();
    }

    const populatedReception = await ServiceReception.findById(
      serviceReception._id
    )
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      // serviceCenterId populate removed - single center architecture
      .populate("receivedBy", "firstName lastName email")
      .populate("submissionStatus.reviewedBy", "firstName lastName email")
      .populate("services.serviceId", "name description basePrice")
      .populate("parts.partId", "name partNumber price");

    return sendSuccess(
      res,
      200,
      `Service reception ${approved ? "approved" : "rejected"} successfully`,
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
