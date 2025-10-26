import PartRequest from "../models/PartRequest.js";
import Appointment from "../models/Appointment.js";
import ServiceReception from "../models/ServiceReception.js";
import Part from "../models/Part.js";

// ==============================================================================
// PART REQUEST APIS (Phase 2.3)
// ==============================================================================

// @desc    Create additional part request during service
// @route   POST /api/part-requests
// @access  Private (Technician)
export const createAdditionalPartRequest = async (req, res) => {
  try {
    const {
      appointmentId,
      serviceReceptionId,
      requestedParts,
      urgency = "normal",
      requestNotes = "",
    } = req.body;

    // Validate appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment is in progress
    if (appointment.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: `Cannot request parts. Appointment status is: ${appointment.status}`,
      });
    }

    // Validate service reception exists if provided
    if (serviceReceptionId) {
      const serviceReception = await ServiceReception.findById(
        serviceReceptionId
      );
      if (!serviceReception) {
        return res.status(404).json({
          success: false,
          message: "Service reception not found",
        });
      }
    }

    // Validate requested parts
    if (!requestedParts || requestedParts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one part must be requested",
      });
    }

    // Check parts availability and calculate costs
    const processedParts = [];
    for (const requestedPart of requestedParts) {
      const part = await Part.findById(requestedPart.partId);
      if (!part) {
        return res.status(404).json({
          success: false,
          message: `Part not found: ${requestedPart.partId}`,
        });
      }

      const availableQuantity = part.currentStock;
      const shortfall = Math.max(0, requestedPart.quantity - availableQuantity);

      processedParts.push({
        partId: requestedPart.partId,
        quantity: requestedPart.quantity,
        reason: requestedPart.reason,
        priority: requestedPart.priority || "normal",
        availableQuantity,
        shortfall,
        estimatedCost: part.unitPrice * requestedPart.quantity,
      });
    }

    // Create part request
    const partRequest = new PartRequest({
      type: "additional_during_service",
      appointmentId,
      serviceReceptionId: serviceReceptionId || null,
      requestedBy: req.user._id,
      requestedParts: processedParts,
      urgency,
      requestNotes,
      status: "pending",
    });

    await partRequest.save();

    // Update appointment status to parts_requested
    await appointment.updateStatus(
      "parts_requested",
      req.user._id,
      `Additional parts requested: ${processedParts
        .map((p) => `${p.quantity}x ${p.partId}`)
        .join(", ")}`
    );

    // Add reference to service reception if exists
    if (serviceReceptionId) {
      const serviceReception = await ServiceReception.findById(
        serviceReceptionId
      );
      serviceReception.additionalPartRequests.push(partRequest._id);
      await serviceReception.save();
    }

    // Populate response
    await partRequest.populate([
      { path: "appointmentId", select: "appointmentNumber scheduledDate" },
      { path: "serviceReceptionId", select: "receptionNumber" },
      { path: "requestedBy", select: "firstName lastName" },
      {
        path: "requestedParts.partId",
        select: "name partNumber category unitPrice currentStock",
      },
    ]);

    res.status(201).json({
      success: true,
      message: "Part request created successfully",
      data: partRequest,
    });
  } catch (error) {
    console.error("Error creating part request:", error);
    res.status(500).json({
      success: false,
      message: "Error creating part request",
    });
  }
};

// @desc    Get part requests pending staff approval
// @route   GET /api/part-requests/pending-approval
// @access  Private (Staff/Admin)
export const getPendingPartRequests = async (req, res) => {
  try {
    let filter = { status: "pending" };

    // Filter by service center for staff
    if (req.user.role === "staff") {
      const appointments = await Appointment.find({
        // serviceCenterId removed - single center architecture
      }).select("_id");
      const appointmentIds = appointments.map((apt) => apt._id);
      filter.appointmentId = { $in: appointmentIds };
    }

    const pendingRequests = await PartRequest.find(filter)
      .populate(
        "appointmentId",
        "appointmentNumber scheduledDate scheduledTime customerId"
      )
      .populate("serviceReceptionId", "receptionNumber")
      .populate("requestedBy", "firstName lastName")
      .populate(
        "requestedParts.partId",
        "name partNumber category unitPrice currentStock minimumStock"
      )
      .populate({
        path: "appointmentId",
        populate: [
          { path: "customerId", select: "firstName lastName email phone" },
          // serviceCenterId populate removed - single center architecture
        ],
      })
      .sort({ requestedAt: 1 });

    res.status(200).json({
      success: true,
      count: pendingRequests.length,
      data: pendingRequests,
    });
  } catch (error) {
    console.error("Error getting pending part requests:", error);
    res.status(500).json({
      success: false,
      message: "Error getting pending part requests",
    });
  }
};

// @desc    Staff approve/reject part request
// @route   PUT /api/part-requests/:id/review
// @access  Private (Staff/Admin)
export const reviewPartRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      decision, // 'approved', 'rejected', 'partially_approved'
      reviewNotes = "",
      approvedParts = [], // For partially approved requests
      alternativeParts = [],
    } = req.body;

    // Validate decision
    const validDecisions = ["approved", "rejected", "partially_approved"];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid decision. Must be one of: " + validDecisions.join(", "),
      });
    }

    const partRequest = await PartRequest.findById(id);
    if (!partRequest) {
      return res.status(404).json({
        success: false,
        message: "Part request not found",
      });
    }

    // Check if request can be reviewed
    if (partRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Part request cannot be reviewed. Current status: ${partRequest.status}`,
      });
    }

    // Process approval decision
    let newStatus;
    let statusMessage;
    let appointmentStatusUpdate = null;

    switch (decision) {
      case "approved":
        newStatus = "approved";
        statusMessage = "Part request approved by staff";
        appointmentStatusUpdate = "parts_approved";

        // Check if all parts are available
        const allAvailable = partRequest.requestedParts.every(
          (part) => part.shortfall === 0
        );
        if (!allAvailable) {
          appointmentStatusUpdate = "parts_insufficient";
          statusMessage =
            "Part request approved but some parts are insufficient";
        }
        break;

      case "rejected":
        newStatus = "rejected";
        statusMessage = "Part request rejected by staff";
        appointmentStatusUpdate = "in_progress"; // Back to in_progress
        break;

      case "partially_approved":
        newStatus = "partially_approved";
        statusMessage = "Part request partially approved by staff";
        appointmentStatusUpdate = "parts_approved";

        // Update approved quantities
        if (approvedParts.length > 0) {
          partRequest.requestedParts.forEach((requestedPart) => {
            const approvedPart = approvedParts.find(
              (ap) => ap.partId.toString() === requestedPart.partId.toString()
            );
            if (approvedPart) {
              requestedPart.approvedQuantity = approvedPart.approvedQuantity;
              requestedPart.approved = true;
            } else {
              requestedPart.approvedQuantity = 0;
              requestedPart.approved = false;
            }
          });
        }
        break;
    }

    // Update part request
    partRequest.status = newStatus;
    partRequest.reviewedBy = req.user._id;
    partRequest.reviewedAt = new Date();
    partRequest.reviewNotes = reviewNotes;

    if (alternativeParts.length > 0) {
      partRequest.alternativeParts = alternativeParts;
    }

    await partRequest.save();

    // Update appointment status if needed
    if (appointmentStatusUpdate) {
      const appointment = await Appointment.findById(partRequest.appointmentId);
      await appointment.updateStatus(
        appointmentStatusUpdate,
        req.user._id,
        statusMessage
      );
    }

    // Reserve parts if approved
    if (decision === "approved" || decision === "partially_approved") {
      await reserveRequestedParts(partRequest);
    }

    // Populate response
    await partRequest.populate([
      { path: "requestedBy", select: "firstName lastName" },
      { path: "reviewedBy", select: "firstName lastName" },
      { path: "requestedParts.partId", select: "name partNumber currentStock" },
    ]);

    res.status(200).json({
      success: true,
      message: `Part request ${decision}`,
      data: partRequest,
    });
  } catch (error) {
    console.error("Error reviewing part request:", error);
    res.status(500).json({
      success: false,
      message: "Error reviewing part request",
    });
  }
};

// @desc    Get part request details
// @route   GET /api/part-requests/:id
// @access  Private
export const getPartRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const partRequest = await PartRequest.findById(id)
      .populate("appointmentId", "appointmentNumber scheduledDate customerId")
      .populate("serviceReceptionId", "receptionNumber")
      .populate("requestedBy", "firstName lastName")
      .populate("reviewedBy", "firstName lastName")
      .populate(
        "requestedParts.partId",
        "name partNumber category unitPrice currentStock minimumStock"
      )
      .populate({
        path: "appointmentId",
        populate: {
          path: "customerId",
          select: "firstName lastName email phone",
        },
      });

    if (!partRequest) {
      return res.status(404).json({
        success: false,
        message: "Part request not found",
      });
    }

    // Check access permissions
    if (
      req.user.role === "technician" &&
      partRequest.requestedBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this part request",
      });
    }

    res.status(200).json({
      success: true,
      data: partRequest,
    });
  } catch (error) {
    console.error("Error getting part request:", error);
    res.status(500).json({
      success: false,
      message: "Error getting part request",
    });
  }
};

// @desc    Get part requests for appointment
// @route   GET /api/part-requests/appointment/:appointmentId
// @access  Private
export const getPartRequestsByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Validate appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const partRequests = await PartRequest.find({ appointmentId })
      .populate("requestedBy", "firstName lastName")
      .populate("reviewedBy", "firstName lastName")
      .populate(
        "requestedParts.partId",
        "name partNumber category unitPrice currentStock"
      )
      .sort({ requestedAt: -1 });

    res.status(200).json({
      success: true,
      count: partRequests.length,
      data: partRequests,
    });
  } catch (error) {
    console.error("Error getting part requests for appointment:", error);
    res.status(500).json({
      success: false,
      message: "Error getting part requests for appointment",
    });
  }
};

// @desc    Update part request status (e.g., mark as fulfilled)
// @route   PUT /api/part-requests/:id/status
// @access  Private (Staff/Admin)
export const updatePartRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes = "" } = req.body;

    // Validate status
    const validStatuses = [
      "pending",
      "approved",
      "rejected",
      "partially_approved",
      "fulfilled",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    const partRequest = await PartRequest.findById(id);
    if (!partRequest) {
      return res.status(404).json({
        success: false,
        message: "Part request not found",
      });
    }

    // Update status
    const oldStatus = partRequest.status;
    partRequest.status = status;

    // Add status history
    partRequest.statusHistory.push({
      status: status,
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: `Status updated from ${oldStatus} to ${status}`,
      notes: notes,
    });

    await partRequest.save();

    res.status(200).json({
      success: true,
      message: `Part request status updated to ${status}`,
      data: {
        id: partRequest._id,
        status: partRequest.status,
        updatedAt: partRequest.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating part request status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating part request status",
    });
  }
};

// Helper function to reserve parts
async function reserveRequestedParts(partRequest) {
  try {
    for (const requestedPart of partRequest.requestedParts) {
      const part = await Part.findById(requestedPart.partId);
      if (part) {
        const quantityToReserve =
          requestedPart.approvedQuantity || requestedPart.quantity;

        // Only reserve if we have sufficient stock
        if (part.currentStock >= quantityToReserve) {
          part.reservedStock = (part.reservedStock || 0) + quantityToReserve;
          part.currentStock -= quantityToReserve;
          await part.save();

          requestedPart.reserved = true;
          requestedPart.reservedQuantity = quantityToReserve;
          requestedPart.reservedAt = new Date();
        }
      }
    }

    await partRequest.save();
  } catch (error) {
    console.error("Error reserving parts:", error);
    throw error;
  }
}
