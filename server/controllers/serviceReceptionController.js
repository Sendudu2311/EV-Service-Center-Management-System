import mongoose from "mongoose";
import { sendSuccess, sendError } from "../utils/response.js";
import { detectPartConflicts } from "../services/partConflictService.js";

// Import models - avoid importing Appointment to prevent circular dependency
const ServiceReception = mongoose.model("ServiceReception");
const User = mongoose.model("User");
const Vehicle = mongoose.model("Vehicle");
const Service = mongoose.model("Service");
const Part = mongoose.model("Part");
const EVChecklist = mongoose.model("EVChecklist");

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
      evChecklistItems,
    } = req.body;

    // Check if service reception already exists for this appointment
    // Allow creating new reception if previous one was rejected
    const existingReception = await ServiceReception.findOne({ appointmentId });
    if (existingReception && existingReception.status !== "rejected") {
      return sendError(
        res,
        400,
        "Service reception already exists for this appointment. Previous reception must be rejected before creating a new one.",
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

    // Check if deposit is paid for deposit_booking type
    if (
      appointment.bookingType === "deposit_booking" &&
      !appointment.depositInfo?.paid
    ) {
      return sendError(
        res,
        400,
        "Deposit payment required before creating service reception",
        null,
        "DEPOSIT_REQUIRED"
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
    const processedRecommendedServices = (recommendedServices || []).map(
      (service) => ({
        ...service,
        addedBy: req.user._id,
        addedAt: new Date(),
      })
    );

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
      evChecklistItems: evChecklistItems || [],
      status: "received",
      // Auto-submit to staff for review
      submissionStatus: {
        submittedToStaff: true,
        submittedBy: req.user._id,
        submittedAt: new Date(),
        staffReviewStatus: "pending",
      },
    });

    await serviceReception.save();

    // Sync checklist data with Appointment
    await syncChecklistWithAppointment(serviceReception._id, appointment);

    // NOTE: Services are NOT added to appointment here
    // They will be added to appointment.services only when staff approves the reception
    // This prevents duplicate services (technician proposes → staff approves → services added)
    console.log(
      "ℹ️ [createServiceReception] recommendedServices stored in reception:",
      recommendedServices?.length || 0,
      "services"
    );
    console.log(
      "ℹ️ [createServiceReception] Services will be added to appointment after staff approval"
    );

    // Change booking type to full service if it was deposit booking
    if (recommendedServices && recommendedServices.length > 0 && appointment.bookingType === "deposit_booking") {
      appointment.bookingType = "full_service";
      console.log(
        "🔄 [createServiceReception] Changed booking type to full_service"
      );
    }

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
};

export const getServiceReception = async (req, res) => {
  try {
    const { id } = req.params;

    const serviceReception = await ServiceReception.findById(id)
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      .populate("receivedBy", "firstName lastName email")
      .populate(
        "recommendedServices.serviceId",
        "name description basePrice category estimatedDuration"
      )
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

// Get service reception by appointment ID
export const getServiceReceptionByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // ⚠️ FIX: Get the LATEST non-rejected reception for this appointment
    // Sort by createdAt descending to get newest first
    // Filter out rejected receptions to avoid returning old rejected ones
    const serviceReception = await ServiceReception.findOne({
      appointmentId: appointmentId,
      "submissionStatus.staffReviewStatus": { $ne: "rejected" }, // Exclude rejected
    })
      .sort({ createdAt: -1 }) // Get newest first
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      .populate("receivedBy", "firstName lastName email")
      .populate(
        "recommendedServices.serviceId",
        "name description basePrice category estimatedDuration"
      )
      .populate("recommendedServices.addedBy", "firstName lastName")
      .populate("requestedParts.partId", "name partNumber pricing");

    if (!serviceReception) {
      return sendError(
        res,
        404,
        "Service reception not found for this appointment",
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
    console.error("Error retrieving service reception by appointment:", error);
    return sendError(
      res,
      500,
      "Error retrieving service reception",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};

// Get ALL service receptions by appointment ID (returns array)
export const getAllServiceReceptionsByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Find ALL service receptions for this appointment
    const serviceReceptions = await ServiceReception.find({
      appointmentId: appointmentId,
    })
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      .populate("receivedBy", "firstName lastName email")
      .populate(
        "recommendedServices.serviceId",
        "name description basePrice category estimatedDuration"
      )
      .populate("recommendedServices.addedBy", "firstName lastName")
      .populate("requestedParts.partId", "name partNumber pricing")
      .sort({ createdAt: -1 }); // Sort by newest first

    if (!serviceReceptions || serviceReceptions.length === 0) {
      return sendError(
        res,
        404,
        "No service receptions found for this appointment",
        null,
        "RECEPTIONS_NOT_FOUND"
      );
    }

    return sendSuccess(
      res,
      200,
      "Service receptions retrieved successfully",
      serviceReceptions
    );
  } catch (error) {
    console.error("Error retrieving all service receptions by appointment:", error);
    return sendError(
      res,
      500,
      "Error retrieving service receptions",
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
      receivedBy: technicianId,
    })
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      .populate("receivedBy", "firstName lastName email")
      .populate("submissionStatus.reviewedBy", "firstName lastName email")
      .populate(
        "recommendedServices.serviceId",
        "name description basePrice category estimatedDuration"
      )
      .populate("recommendedServices.addedBy", "firstName lastName")
      .populate("requestedParts.partId", "name partNumber pricing")
      .sort({ createdAt: -1 });

    // Manually populate workflowHistory users (both old and new workflow structure)
    for (const reception of serviceReceptions) {
      if (reception.workflowHistory && reception.workflowHistory.length > 0) {
        await ServiceReception.populate(reception, [
          { path: 'workflowHistory.performedBy', select: 'firstName lastName email' },
          { path: 'workflowHistory.changedBy', select: 'firstName lastName email' }
        ]);
      }
    }

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

    // Sync checklist data with Appointment if evChecklistItems were updated
    if (updates.evChecklistItems) {
      const Appointment = mongoose.model("Appointment");
      const appointment = await Appointment.findById(
        serviceReception.appointmentId
      );
      if (appointment) {
        await syncChecklistWithAppointment(serviceReception._id, appointment);
      }
    }

    const populatedReception = await ServiceReception.findById(
      serviceReception._id
    )
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      // serviceCenterId populate removed - single center architecture
      .populate("receivedBy", "firstName lastName email")
      .populate(
        "recommendedServices.serviceId",
        "name description basePrice category estimatedDuration"
      )
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
      .populate(
        "recommendedServices.serviceId",
        "name description basePrice category estimatedDuration"
      )
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
    const { decision, reviewNotes, approved, staffNotes, externalParts, extendedCompletionDate, modifications } =
      req.body;

    // Support both old format (approved: boolean) and new format (decision: 'approved'/'rejected')
    const isApproved = decision ? decision === "approved" : approved;
    const notes = reviewNotes || staffNotes || "";

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

    // Handle staff modifications to services/parts
    if (modifications && modifications.modifiedServices && modifications.modifiedParts) {
      // Update services and parts with staff modifications
      serviceReception.recommendedServices = modifications.modifiedServices;
      serviceReception.requestedParts = modifications.modifiedParts;

      // Log modification to workflow history
      serviceReception.workflowHistory.push({
        action: "staff_modified_services_parts",
        performedBy: req.user._id,
        timestamp: new Date(),
        changes: {
          servicesAdded: modifications.servicesChanges?.added || [],
          servicesRemoved: modifications.servicesChanges?.removed || [],
          servicesModified: modifications.servicesChanges?.modified || [],
          partsAdded: modifications.partsChanges?.added || [],
          partsRemoved: modifications.partsChanges?.removed || [],
          partsModified: modifications.partsChanges?.modified || [],
        },
        notes: modifications.modificationReason,
      });
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

    // Handle external parts if provided (staff adding external part orders)
    if (
      isApproved &&
      externalParts &&
      Array.isArray(externalParts) &&
      externalParts.length > 0
    ) {
      // Add external parts to service reception
      serviceReception.externalParts = externalParts.map((part) => ({
        ...part,
        addedBy: req.user._id,
        addedAt: new Date(),
      }));
      serviceReception.hasExternalParts = true;
    }

    // Update approval info
    // Note: Update serviceReception.status to 'approved' or 'rejected'
    serviceReception.status = isApproved ? "approved" : "rejected";
    serviceReception.submissionStatus.staffReviewStatus = isApproved
      ? "approved"
      : "rejected";
    serviceReception.submissionStatus.reviewedBy = req.user._id;
    serviceReception.submissionStatus.reviewedAt = new Date();
    serviceReception.submissionStatus.reviewNotes = notes;
    serviceReception.updatedAt = new Date();

    // Auto-approve recommended services and available parts when staff approves
    if (isApproved) {
      // Set customerApproved = true for all recommended services
      serviceReception.recommendedServices.forEach((rs) => {
        rs.customerApproved = true;
      });

      // Set isApproved = true for all available parts
      serviceReception.requestedParts.forEach((part) => {
        if (part.isAvailable) {
          part.isApproved = true;
        }
      });
    }

    await serviceReception.save();

    // Update appointment status and details
    const Appointment = mongoose.model("Appointment");
    const Service = mongoose.model("Service");
    const appointment = await Appointment.findById(
      serviceReception.appointmentId
    ).populate("services.serviceId");

    if (appointment && isApproved) {
      // Calculate additional costs from service reception
      let additionalServicesCost = 0;
      let additionalPartsCost = 0;
      let laborCost = serviceReception.estimatedLabor?.totalCost || 0;

      // Add recommended services to appointment.services (only customer approved ones)
      // NOTE: This is the ONLY place where services are added to the appointment
      // Technician creates reception with recommendedServices → Staff approves → Services added here
      for (const recommendedService of serviceReception.recommendedServices ||
        []) {
        if (recommendedService.customerApproved) {
          const serviceDoc = await Service.findById(
            recommendedService.serviceId
          );
          if (serviceDoc) {
            const serviceCost =
              (serviceDoc.basePrice || recommendedService.estimatedCost) *
              (recommendedService.quantity || 1);
            additionalServicesCost += serviceCost;

            // Add to appointment services array
            appointment.services.push({
              serviceId: recommendedService.serviceId,
              name: serviceDoc.name,
              description: serviceDoc.description,
              price: serviceDoc.basePrice || recommendedService.estimatedCost,
              quantity: recommendedService.quantity || 1,
              category: serviceDoc.category,
            });
          }
        }
      }

      // Add requested parts to appointment.partsUsed (only available and approved ones)
      // NOTE: This is the ONLY place where parts are added to the appointment
      for (const requestedPart of serviceReception.requestedParts || []) {
        if (requestedPart.isAvailable && requestedPart.isApproved) {
          const unitPrice =
            requestedPart.partId?.pricing?.retail ||
            requestedPart.estimatedCost ||
            0;
          const partCost = unitPrice * requestedPart.quantity;
          additionalPartsCost += partCost;

          // Add to appointment partsUsed array
          appointment.partsUsed.push({
            partId: requestedPart.partId,
            partName: requestedPart.partId?.name || requestedPart.partName,
            quantity: requestedPart.quantity,
            unitPrice: unitPrice,
            totalPrice: partCost,
          });
        }
      }

      // ✅ IMMEDIATE PART REDUCTION: Reduce inventory when staff approves service reception
      console.log("\n🔧 [IMMEDIATE PART REDUCTION] Reducing parts inventory...");
      const Part = mongoose.model("Part");

      // METHOD 1: Reduce requestedParts (parts đề xuất trong phiếu)
      console.log("📦 [METHOD 1] Processing requestedParts...");
      for (const requestedPart of serviceReception.requestedParts || []) {
        // Only reduce parts that are available (skip out-of-stock parts)
        if (requestedPart.isAvailable) {
          try {
            const part = await Part.findById(requestedPart.partId);
            if (!part) {
              console.warn(`⚠️ Part not found: ${requestedPart.partId}`);
              continue;
            }

            console.log(`   Processing requested part: ${part.partNumber} - ${part.name} (Qty: ${requestedPart.quantity})`);
            console.log(`   - Current stock: ${part.inventory.currentStock}, Used stock: ${part.inventory.usedStock}`);

            if (part.inventory.currentStock >= requestedPart.quantity) {
              part.inventory.currentStock -= requestedPart.quantity;
              part.inventory.usedStock += requestedPart.quantity;
              part.inventory.averageUsage = Math.round(
                part.inventory.averageUsage * 0.9 + requestedPart.quantity * 0.1
              );
              await part.save();
              console.log(`   ✅ Reduced! New currentStock: ${part.inventory.currentStock}, usedStock: ${part.inventory.usedStock}`);
            } else {
              console.warn(`   ⚠️ Insufficient stock: Available ${part.inventory.currentStock}, Needed ${requestedPart.quantity}`);
            }
          } catch (partError) {
            console.error(`❌ Error reducing requested part ${requestedPart.partNumber}:`, partError);
          }
        }
      }

      // METHOD 2: Reduce commonParts from approved services (parts liên quan trong dịch vụ)
      console.log("\n📦 [METHOD 2] Processing commonParts from approved services...");
      for (const recommendedService of serviceReception.recommendedServices || []) {
        try {
          const serviceDoc = await Service.findById(recommendedService.serviceId);
          if (serviceDoc && serviceDoc.commonParts && serviceDoc.commonParts.length > 0) {
            console.log(`   Service: ${serviceDoc.name} has ${serviceDoc.commonParts.length} common parts`);

            for (const commonPart of serviceDoc.commonParts) {
              // Only reduce required parts (skip optional parts)
              if (!commonPart.isOptional) {
                const part = await Part.findById(commonPart.partId);
                if (!part) {
                  console.warn(`   ⚠️ Common part not found: ${commonPart.partId}`);
                  continue;
                }

                const quantity = commonPart.quantity * (recommendedService.quantity || 1);
                console.log(`   Processing common part: ${part.partNumber} - ${part.name} (Qty: ${quantity})`);
                console.log(`   - Current stock: ${part.inventory.currentStock}, Used stock: ${part.inventory.usedStock}`);

                if (part.inventory.currentStock >= quantity) {
                  part.inventory.currentStock -= quantity;
                  part.inventory.usedStock += quantity;
                  part.inventory.averageUsage = Math.round(
                    part.inventory.averageUsage * 0.9 + quantity * 0.1
                  );
                  await part.save();
                  console.log(`   ✅ Reduced! New currentStock: ${part.inventory.currentStock}, usedStock: ${part.inventory.usedStock}`);
                } else {
                  console.warn(`   ⚠️ Insufficient stock: Available ${part.inventory.currentStock}, Needed ${quantity}`);
                }
              }
            }
          }
        } catch (serviceError) {
          console.error(`❌ Error processing service ${recommendedService.serviceId}:`, serviceError);
        }
      }

      console.log("✅ [IMMEDIATE PART REDUCTION] Completed\n");

      // Calculate total additional cost
      const subtotalAdditional =
        additionalServicesCost + additionalPartsCost + laborCost;
      const taxAdditional = subtotalAdditional * 0.1; // 10% VAT
      const totalAdditional = subtotalAdditional + taxAdditional;

      console.log("Subtotal additional:", subtotalAdditional);
      console.log("Tax additional:", taxAdditional);
      console.log("Total additional:", totalAdditional);

      // Update appointment totalAmount
      const currentTotal = appointment.totalAmount || 0;
      appointment.totalAmount = currentTotal + totalAdditional;

      console.log("NEW totalAmount:", appointment.totalAmount);

      // Update estimatedCompletion if staff provided a new date (for external parts)
      // Staff only provides date (YYYY-MM-DD), we need to combine with original appointment time
      if (extendedCompletionDate) {
        // Get original appointment time (hour and minute)
        const originalCompletion = appointment.estimatedCompletion
          ? new Date(appointment.estimatedCompletion)
          : new Date(appointment.scheduledDate);

        // Parse the new date (format: YYYY-MM-DD)
        const newDate = new Date(extendedCompletionDate);

        // Combine new date with original time
        const newCompletionDate = new Date(
          newDate.getFullYear(),
          newDate.getMonth(),
          newDate.getDate(),
          originalCompletion.getHours(),
          originalCompletion.getMinutes(),
          originalCompletion.getSeconds()
        );

        appointment.estimatedCompletion = newCompletionDate;
        console.log("Updated estimatedCompletion to:", newCompletionDate, "(date:", extendedCompletionDate, ", time from original:", originalCompletion.toLocaleTimeString('vi-VN'), ")");
      }

      // Update appointment status
      appointment.status = "reception_approved";
      appointment.workflowHistory.push({
        status: "reception_approved",
        changedBy: req.user._id,
        changedAt: new Date(),
        notes: `Service reception approved by staff. Additional cost: ${totalAdditional} VND (Services: ${additionalServicesCost}, Parts: ${additionalPartsCost}, Labor: ${laborCost})${extendedCompletionDate ? `. Extended completion date: ${new Date(extendedCompletionDate).toLocaleDateString('vi-VN')}` : ''}`,
      });
      await appointment.save();
    } else if (appointment && !isApproved) {
      // When rejected, reset appointment to customer_arrived so technician can create new reception
      appointment.status = "customer_arrived";
      appointment.workflowHistory.push({
        status: "customer_arrived",
        changedBy: req.user._id,
        changedAt: new Date(),
        notes: `Service reception rejected by staff: ${
          notes || "No reason provided"
        }. Appointment reset to customer_arrived for new reception creation.`,
      });
      await appointment.save();
    }

    // Handle external parts if present
    if (
      isApproved &&
      serviceReception.externalParts &&
      serviceReception.externalParts.length > 0
    ) {
      console.log("=== PROCESSING EXTERNAL PARTS ===");
      console.log(
        "External parts count:",
        serviceReception.externalParts.length
      );

      // Mark service reception as having external parts
      serviceReception.hasExternalParts = true;

      // Mark appointment as having external parts
      if (appointment) {
        appointment.hasExternalParts = true;
        appointment.externalPartsInfo = {
          requiresExternalOrder: true,
          customerAgreedToLeaveVehicle: true,
          technicianNote:
            serviceReception.specialInstructions?.fromStaff ||
            "Requires external parts order",
          markedBy: req.user._id,
          markedAt: new Date(),
        };

        // Calculate external parts cost and add to appointment total
        let externalPartsCost = 0;
        serviceReception.externalParts.forEach((part) => {
          externalPartsCost += part.totalPrice;
          console.log(
            `External part: ${part.partName}, cost: ${part.totalPrice}`
          );
        });

        // Add tax to external parts cost
        const taxExternalParts = externalPartsCost * 0.1; // 10% VAT
        const totalExternalParts = externalPartsCost + taxExternalParts;

        // Update appointment total
        appointment.totalAmount =
          (appointment.totalAmount || 0) + totalExternalParts;
        console.log("External parts total (with VAT):", totalExternalParts);
        console.log("Updated appointment total:", appointment.totalAmount);

        await appointment.save();
      }

      await serviceReception.save();
    }

    // Detect conflicts for requested parts if approved
    if (
      isApproved &&
      serviceReception.requestedParts &&
      serviceReception.requestedParts.length > 0
    ) {
      try {
        // Get unique part IDs from requested parts
        const partIds = [
          ...new Set(
            serviceReception.requestedParts
              .map((p) => p.partId?.toString())
              .filter(Boolean)
          ),
        ];

        // Check conflicts for each part
        const conflictPromises = partIds.map((partId) =>
          detectPartConflicts(partId)
        );
        const conflicts = await Promise.all(conflictPromises);

        // Filter out null results (no conflicts)
        const detectedConflicts = conflicts.filter((c) => c !== null);

        // Mark service reception if it has conflicts
        if (detectedConflicts.length > 0) {
          serviceReception.hasConflict = true;
          serviceReception.conflictIds = detectedConflicts.map((c) => c._id);
          await serviceReception.save();
        }
      } catch (conflictError) {
        console.error("Error detecting conflicts:", conflictError);
        // Don't fail the approval if conflict detection fails
      }
    }

    const populatedReception = await ServiceReception.findById(
      serviceReception._id
    )
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate")
      .populate("receivedBy", "firstName lastName email")
      .populate("submissionStatus.reviewedBy", "firstName lastName email")
      .populate(
        "recommendedServices.serviceId",
        "name description basePrice category estimatedDuration"
      )
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

// Helper function to sync checklist data between ServiceReception and Appointment
const syncChecklistWithAppointment = async (
  serviceReceptionId,
  appointment
) => {
  try {
    const serviceReception =
      await ServiceReception.findById(serviceReceptionId);
    if (!serviceReception || !appointment) return;

    // Sync evChecklistItems to Appointment.checklistItems
    if (
      serviceReception.evChecklistItems &&
      serviceReception.evChecklistItems.length > 0
    ) {
      appointment.checklistItems = serviceReception.evChecklistItems.map(
        (item) => ({
          item: item.label,
          category: item.category,
          isCompleted: item.checked,
          completedBy: item.checked ? serviceReception.receivedBy : null,
          completedAt: item.checked ? new Date() : null,
          notes: item.notes || "",
        })
      );

      await appointment.save();
    }
  } catch (error) {
    console.error("Error syncing checklist with appointment:", error);
  }
};


// @desc    Get available EVChecklist templates
// @route   GET /api/service-receptions/checklist-templates
// @access  Private (Technician/Staff)
export const getChecklistTemplates = async (req, res) => {
  try {
    const { category, vehicleType } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;

    const templates = await EVChecklist.find(filter)
      .select("name code description category estimatedDuration skillLevel")
      .sort({ category: 1, name: 1 });

    return sendSuccess(
      res,
      200,
      "Checklist templates retrieved successfully",
      templates
    );
  } catch (error) {
    console.error("Error getting checklist templates:", error);
    return sendError(
      res,
      500,
      "Error getting checklist templates",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};

// @desc    Confirm payment for service reception
// @route   POST /api/service-receptions/:id/confirm-payment
// @access  Private (Staff/Admin)
export const confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paymentMethod,
      amount,
      paymentDate,
      // Bank Transfer specific
      transferRef,
      bankName,
      // Cash specific
      notes,
    } = req.body;

    // Get uploaded proof image from multer/cloudinary
    const proofImage = req.file?.path;

    // Validate required fields
    if (!paymentMethod || !amount || !paymentDate) {
      return sendError(
        res,
        400,
        "Payment method, amount, and payment date are required",
        null,
        "VALIDATION_ERROR"
      );
    }

    if (!proofImage) {
      return sendError(
        res,
        400,
        "Proof image is required",
        null,
        "VALIDATION_ERROR"
      );
    }

    // Validate payment method specific fields
    if (paymentMethod === "bank_transfer") {
      if (!transferRef || !bankName) {
        return sendError(
          res,
          400,
          "Transfer reference and bank name are required for bank transfer",
          null,
          "VALIDATION_ERROR"
        );
      }
    }

    // Find service reception - without populate first to check raw data
    let serviceReception = await ServiceReception.findById(id);

    if (!serviceReception) {
      return sendError(
        res,
        404,
        "Service reception not found",
        null,
        "RECEPTION_NOT_FOUND"
      );
    }

    // Debug: Log raw status before populate
    console.log("=== DEBUG confirmPayment ===");
    console.log("Service Reception ID:", serviceReception._id);
    console.log(
      "Raw submissionStatus:",
      JSON.stringify(serviceReception.submissionStatus, null, 2)
    );
    console.log("Raw status field:", serviceReception.status);

    // Check status early - before populate (to avoid populate overhead if not approved)
    const currentStatus =
      serviceReception.submissionStatus?.staffReviewStatus || "pending";
    console.log("Current staffReviewStatus:", currentStatus);

    if (currentStatus !== "approved") {
      return sendError(
        res,
        400,
        `Service reception must be approved first. Current status: "${currentStatus}". Please approve the reception (PUT /api/service-receptions/${id}/approve) before confirming payment.`,
        {
          currentStatus: currentStatus,
          receptionId: serviceReception._id,
          receptionNumber: serviceReception.receptionNumber,
          possibleStatuses: [
            "pending",
            "approved",
            "rejected",
            "needs_modification",
            "partially_approved",
            "pending_parts_restock",
          ],
          actionRequired:
            "Approve this service reception using PUT /api/service-receptions/:id/approve with decision='approved'",
        },
        "RECEPTION_NOT_APPROVED"
      );
    }

    // Now populate for calculation
    serviceReception = await ServiceReception.findById(id)
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate vin")
      .populate(
        "recommendedServices.serviceId",
        "name description basePrice category estimatedDuration"
      )
      .populate("requestedParts.partId", "name partNumber pricing");

    // Get appointment for deposit info
    const Appointment = mongoose.model("Appointment");
    const appointment = await Appointment.findById(
      serviceReception.appointmentId
    )
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year licensePlate vin");

    if (!appointment) {
      return sendError(
        res,
        404,
        "Appointment not found",
        null,
        "APPOINTMENT_NOT_FOUND"
      );
    }

    // Check if appointment status is already in_progress or later (payment already confirmed)
    if (["in_progress", "completed", "invoiced"].includes(appointment.status)) {
      return sendError(
        res,
        400,
        `Payment already confirmed for this appointment. Current status: ${appointment.status}`,
        {
          currentStatus: appointment.status,
          appointmentId: appointment._id,
          appointmentNumber: appointment.appointmentNumber,
        },
        "PAYMENT_ALREADY_CONFIRMED"
      );
    }

    // Calculate invoice totals from service reception
    let subtotalServices = 0;
    const serviceItems = [];

    // Recommended services (from serviceReception)
    for (const recommendedService of serviceReception.recommendedServices ||
      []) {
      const price =
        (typeof recommendedService.serviceId === "object" &&
          recommendedService.serviceId?.basePrice) ||
        recommendedService.estimatedCost ||
        0;
      const serviceTotal = price * (recommendedService.quantity || 1);
      serviceItems.push({
        serviceId:
          typeof recommendedService.serviceId === "object"
            ? recommendedService.serviceId._id
            : recommendedService.serviceId,
        serviceName: recommendedService.serviceName,
        category: recommendedService.category,
        quantity: recommendedService.quantity || 1,
        unitPrice: price,
        totalPrice: serviceTotal,
        description: recommendedService.serviceName,
      });
      subtotalServices += serviceTotal;
    }

    // Calculate parts total
    let subtotalParts = 0;
    const partItems = [];
    for (const requestedPart of serviceReception.requestedParts || []) {
      const unitPrice =
        (typeof requestedPart.partId === "object" &&
          requestedPart.partId?.pricing?.retail) ||
        requestedPart.estimatedCost ||
        0;
      const partTotal = unitPrice * (requestedPart.quantity || 1);
      partItems.push({
        partId:
          typeof requestedPart.partId === "object"
            ? requestedPart.partId._id
            : requestedPart.partId,
        partName: requestedPart.partName,
        partNumber: requestedPart.partNumber || "",
        quantity: requestedPart.quantity || 1,
        unitPrice: unitPrice,
        totalPrice: partTotal,
        description: `${requestedPart.partName}${
          requestedPart.partNumber ? ` (${requestedPart.partNumber})` : ""
        }`,
      });
      subtotalParts += partTotal;
    }

    // Calculate labor (from invoicing field or estimated)
    let subtotalLabor = serviceReception.invoicing?.laborCost || 0;
    const laborItems = [];
    if (subtotalLabor > 0) {
      laborItems.push({
        description: "Labor charges",
        hours: serviceReception.estimatedServiceTime / 60 || 0,
        hourlyRate:
          subtotalLabor / (serviceReception.estimatedServiceTime / 60 || 1),
        totalPrice: subtotalLabor,
      });
    }

    // Calculate external parts cost if hasExternalParts flag is true
    let subtotalExternalParts = 0;
    const externalPartItems = [];
    if (
      serviceReception.hasExternalParts &&
      serviceReception.externalParts &&
      serviceReception.externalParts.length > 0
    ) {
      console.log("=== Processing External Parts ===");
      console.log(
        "Has external parts flag:",
        serviceReception.hasExternalParts
      );
      console.log(
        "External parts count:",
        serviceReception.externalParts.length
      );

      for (const externalPart of serviceReception.externalParts) {
        const partTotal =
          externalPart.totalPrice ||
          externalPart.unitPrice * externalPart.quantity;
        console.log(
          `External part: ${externalPart.partName}, Total: ${partTotal}`
        );

        externalPartItems.push({
          partName: externalPart.partName,
          partNumber: externalPart.partNumber || "",
          quantity: externalPart.quantity,
          unitPrice: externalPart.unitPrice,
          totalPrice: partTotal,
          supplier: externalPart.supplier?.name || "External Supplier",
          description: `${externalPart.partName}${
            externalPart.partNumber ? ` (${externalPart.partNumber})` : ""
          } - External`,
        });
        subtotalExternalParts += partTotal;
      }

      console.log("Total external parts cost:", subtotalExternalParts);
    } else {
      console.log("=== No External Parts ===");
      console.log("hasExternalParts:", serviceReception.hasExternalParts);
      console.log("externalParts exists:", !!serviceReception.externalParts);
      console.log(
        "externalParts length:",
        serviceReception.externalParts?.length || 0
      );
    }

    // Calculate totals (including external parts)
    const subtotal =
      subtotalServices + subtotalParts + subtotalLabor + subtotalExternalParts;
    const taxAmount = subtotal * 0.1; // 10% VAT
    const totalAmount = subtotal + taxAmount;
    const depositAmount = appointment.depositInfo?.paid
      ? appointment.depositInfo.amount
      : 0;
    const remainingAmount = totalAmount - depositAmount;

    // Log calculation breakdown for debugging
    console.log("=== Payment Calculation Breakdown ===");
    console.log("Services subtotal:", subtotalServices);
    console.log("Parts subtotal:", subtotalParts);
    console.log("Labor subtotal:", subtotalLabor);
    console.log("External parts subtotal:", subtotalExternalParts);
    console.log("Subtotal (before tax):", subtotal);
    console.log("Tax amount (10%):", taxAmount);
    console.log("Total amount:", totalAmount);
    console.log("Deposit amount:", depositAmount);
    console.log("Remaining amount to pay:", remainingAmount);
    console.log("Amount from request:", amount);

    // Validate payment amount
    if (Math.abs(parseFloat(amount) - remainingAmount) > 0.01) {
      return sendError(
        res,
        400,
        `Payment amount must be ${remainingAmount.toLocaleString("vi-VN")} VND`,
        {
          expectedAmount: remainingAmount,
          calculatedTotals: {
            subtotalServices,
            subtotalParts,
            subtotalLabor,
            subtotalExternalParts,
            subtotal,
            taxAmount,
            totalAmount,
            depositAmount,
            remainingAmount,
          },
        },
        "PAYMENT_AMOUNT_MISMATCH"
      );
    }

    // Generate invoice number
    const Invoice = mongoose.model("Invoice");
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const timestamp = now.getTime().toString().slice(-6);
    const invoiceNumber = `INV${year}${month}${day}${timestamp}`;

    // Prepare additional charges for external parts
    const additionalCharges = [];
    if (externalPartItems && externalPartItems.length > 0) {
      externalPartItems.forEach((externalPart) => {
        additionalCharges.push({
          description: `External Part: ${externalPart.description}`,
          amount: externalPart.totalPrice,
          type: "other",
          isPercentage: false,
          applyTo: "subtotal",
        });
      });
    }

    // Create invoice
    const invoice = new Invoice({
      invoiceNumber,
      appointmentId: appointment._id,
      serviceReceptionId: serviceReception._id,
      customerId: serviceReception.customerId._id,
      vehicleId: serviceReception.vehicleId._id,
      serviceItems,
      partItems,
      laborItems,
      additionalCharges,
      totals: {
        subtotalServices,
        subtotalParts,
        subtotalLabor,
        subtotalAdditional: subtotalExternalParts,
        subtotal,
        taxRate: 10,
        taxAmount,
        discountAmount: 0,
        depositAmount,
        remainingAmount,
        totalAmount,
      },
      paymentInfo: {
        method: paymentMethod,
        status: "paid",
        paidAmount: totalAmount,
        remainingAmount: 0,
        paymentDate: new Date(paymentDate),
        dueDate: new Date(),
      },
      customerInfo: {
        name: `${serviceReception.customerId.firstName} ${serviceReception.customerId.lastName}`,
        email: serviceReception.customerId.email,
        phone: serviceReception.customerId.phone,
      },
      vehicleInfo: {
        make: serviceReception.vehicleId.make,
        model: serviceReception.vehicleId.model,
        year: serviceReception.vehicleId.year,
        licensePlate: serviceReception.vehicleId.licensePlate,
        vin: serviceReception.vehicleId.vin,
      },
      generatedBy: req.user._id,
      status: "paid",
    });

    await invoice.save();

    // Create transaction
    const TransactionService = (
      await import("../services/transactionService.js")
    ).default;

    const transactionData = {
      userId: serviceReception.customerId._id,
      appointmentId: appointment._id,
      serviceReceptionId: serviceReception._id,
      invoiceId: invoice._id,
      amount: parseFloat(amount),
      paymentPurpose: "invoice_payment", // Payment for service reception invoice
      status: "completed",
      processedBy: req.user._id,
      processedAt: new Date(),
      billingInfo: {
        mobile: serviceReception.customerId.phone,
        email: serviceReception.customerId.email,
        fullName: `${serviceReception.customerId.firstName} ${serviceReception.customerId.lastName}`,
      },
      notes: `Payment for service reception ${serviceReception.receptionNumber}`,
    };

    let transaction;
    if (paymentMethod === "bank_transfer") {
      transaction = await TransactionService.createTransaction(
        "bank_transfer",
        {
          ...transactionData,
          bankTransferData: {
            bankName,
            transferRef,
            transferDate: new Date(paymentDate),
            verifiedBy: req.user._id,
            verifiedAt: new Date(),
            verificationMethod: "other",
            verificationNotes: "Manual verification by staff",
            receiptImage: proofImage,
            notes: `Bank transfer verified by staff`,
          },
        }
      );
    } else if (paymentMethod === "cash") {
      transaction = await TransactionService.createTransaction("cash", {
        ...transactionData,
        cashData: {
          receivedBy: req.user._id,
          receivedAt: new Date(paymentDate),
          notes:
            notes ||
            `Cash payment received for service reception ${serviceReception.receptionNumber}`,
          receiptImage: proofImage,
        },
      });
    } else {
      return sendError(
        res,
        400,
        "Invalid payment method",
        null,
        "INVALID_PAYMENT_METHOD"
      );
    }

    // Update appointment status to in_progress
    appointment.status = "in_progress";
    appointment.paymentStatus = "paid";
    await appointment.save();

    // Update service reception invoicing (including external parts if applicable)
    const invoicingAdditionalCharges = [];
    if (subtotalExternalParts > 0) {
      invoicingAdditionalCharges.push({
        description: "External Parts",
        amount: subtotalExternalParts,
      });
    }

    serviceReception.invoicing = {
      laborCost: subtotalLabor,
      partsCost: subtotalParts + subtotalExternalParts, // Include external parts in parts cost
      totalCost: totalAmount,
      taxAmount: taxAmount,
      grandTotal: totalAmount,
      additionalCharges: invoicingAdditionalCharges,
    };
    serviceReception.status = "in_service"; // Valid enum value for ServiceReception
    await serviceReception.save();

    return sendSuccess(
      res,
      200,
      "Payment confirmed successfully. Work has started automatically.",
      {
        invoice: invoice,
        transaction: transaction,
        serviceReception: serviceReception,
        appointment: appointment,
      }
    );
  } catch (error) {
    console.error("Error confirming payment for service reception:", error);
    return sendError(
      res,
      500,
      "Error confirming payment",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};
