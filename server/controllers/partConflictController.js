import PartConflict from "../models/PartConflict.js";
import Part from "../models/Part.js";
import ServiceReception from "../models/ServiceReception.js";
import PartRequest from "../models/PartRequest.js";
import Appointment from "../models/Appointment.js";
import {
  detectPartConflicts,
  detectAllConflicts,
  prioritizeRequests,
} from "../services/partConflictService.js";
import mongoose from "mongoose";

/**
 * @desc    Get all part conflicts
 * @route   GET /api/part-conflicts
 * @access  Private (Staff/Admin)
 */
export const getConflicts = async (req, res) => {
  try {
    const { status, partId } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (partId) {
      filter.partId = partId;
    }

    const conflicts = await PartConflict.find(filter)
      .populate("partId", "name partNumber inventory")
      .populate(
        "conflictingRequests.appointmentId",
        "appointmentNumber scheduledDate scheduledTime priority customerId"
      )
      .populate(
        "conflictingRequests.customerId",
        "firstName lastName email phone"
      )
      .populate("conflictingRequests.technicianId", "firstName lastName")
      .populate("resolvedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: conflicts.length,
      data: conflicts,
    });
  } catch (error) {
    console.error("Error getting conflicts:", error);
    res.status(500).json({
      success: false,
      message: "Error getting conflicts",
      error: error.message,
    });
  }
};

/**
 * @desc    Get conflict statistics
 * @route   GET /api/part-conflicts/stats
 * @access  Private (Staff/Admin)
 */
export const getConflictStats = async (req, res) => {
  try {
    const pendingCount = await PartConflict.countDocuments({
      status: "pending",
    });
    const resolvedCount = await PartConflict.countDocuments({
      status: "resolved",
    });
    const autoResolvedCount = await PartConflict.countDocuments({
      status: "auto_resolved",
    });

    // Get conflicts with most requests
    const topConflicts = await PartConflict.find({ status: "pending" })
      .sort({ "conflictingRequests.length": -1 })
      .limit(5)
      .populate("partId", "name partNumber")
      .select(
        "conflictNumber partName partNumber conflictingRequests.length shortfall"
      );

    res.status(200).json({
      success: true,
      data: {
        pending: pendingCount,
        resolved: resolvedCount,
        autoResolved: autoResolvedCount,
        total: pendingCount + resolvedCount + autoResolvedCount,
        topConflicts,
      },
    });
  } catch (error) {
    console.error("Error getting conflict stats:", error);
    res.status(500).json({
      success: false,
      message: "Error getting conflict stats",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single conflict by ID
 * @route   GET /api/part-conflicts/:id
 * @access  Private (Staff/Admin)
 */
export const getConflict = async (req, res) => {
  try {
    const { id } = req.params;

    const conflict = await PartConflict.findById(id)
      .populate("partId", "name partNumber inventory")
      .populate(
        "conflictingRequests.appointmentId",
        "appointmentNumber scheduledDate scheduledTime priority customerId vehicleId"
      )
      .populate(
        "conflictingRequests.customerId",
        "firstName lastName email phone"
      )
      .populate(
        "conflictingRequests.technicianId",
        "firstName lastName email phone"
      )
      .populate("resolvedBy", "firstName lastName");

    if (!conflict) {
      return res.status(404).json({
        success: false,
        message: "Conflict not found",
      });
    }

    res.status(200).json({
      success: true,
      data: conflict,
    });
  } catch (error) {
    console.error("Error getting conflict:", error);
    res.status(500).json({
      success: false,
      message: "Error getting conflict",
      error: error.message,
    });
  }
};

/**
 * @desc    Resolve conflict
 * @route   POST /api/part-conflicts/:id/resolve
 * @access  Private (Staff/Admin)
 */
export const resolveConflict = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { approvedRequestIds, rejectedRequestIds, notes } = req.body;
    const staffId = req.user._id;

    // Validate staff/admin role
    if (!["staff", "admin"].includes(req.user.role)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Only staff and admin can resolve conflicts",
      });
    }

    const conflict = await PartConflict.findById(id).session(session);
    if (!conflict) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Conflict not found",
      });
    }

    if (conflict.status !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Conflict is already ${conflict.status}`,
      });
    }

    const part = await Part.findById(conflict.partId).session(session);
    if (!part) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Part not found",
      });
    }

    // Simplified: Only check currentStock (no reservedStock)
    const availableStock = part.inventory.currentStock;

    // Process approved requests
    const approvedRequests = [];
    const rejectedRequests = [];
    let totalApprovedQuantity = 0;

    for (const request of conflict.conflictingRequests) {
      const requestIdStr = request.requestId.toString();

      if (approvedRequestIds.includes(requestIdStr)) {
        // Approve request
        if (
          request.requestedQuantity <=
          availableStock - totalApprovedQuantity
        ) {
          request.status = "approved";
          request.autoApproved = false;
          approvedRequests.push(request);
          totalApprovedQuantity += request.requestedQuantity;

          // Reserve parts
          if (request.requestType === "ServiceReception") {
            const reception = await ServiceReception.findById(
              request.requestId
            ).session(session);
            if (reception) {
              const partRequest = reception.requestedParts.find(
                (p) => p.partId.toString() === conflict.partId.toString()
              );
              if (partRequest) {
                partRequest.isApproved = true;
                await reception.save({ session });
              }
            }
          } else if (request.requestType === "PartRequest") {
            const partRequest = await PartRequest.findById(
              request.requestId
            ).session(session);
            if (partRequest) {
              const requestedPart = partRequest.requestedParts.find(
                (p) => p.partId.toString() === conflict.partId.toString()
              );
              if (requestedPart) {
                requestedPart.isApproved = true;
                await partRequest.save({ session });
              }
            }
          }

          // Decrease currentStock and increase usedStock immediately
          const quantityToUse = request.requestedQuantity;
          if (part.inventory.currentStock >= quantityToUse) {
            part.inventory.currentStock -= quantityToUse;
            part.inventory.usedStock += quantityToUse;
            await part.save({ session });
          }
        } else {
          // Not enough stock, mark as deferred
          request.status = "deferred";
          request.resolutionNotes =
            "Không đủ stock để approve. Đã được staff đánh dấu deferred.";
          rejectedRequests.push(request);
        }
      } else if (
        rejectedRequestIds &&
        rejectedRequestIds.includes(requestIdStr)
      ) {
        // Reject request
        request.status = "rejected";
        request.resolutionNotes = notes || "Request bị từ chối bởi staff";
        rejectedRequests.push(request);

        // Update request status
        if (request.requestType === "ServiceReception") {
          const reception = await ServiceReception.findById(
            request.requestId
          ).session(session);
          if (reception) {
            const partRequest = reception.requestedParts.find(
              (p) => p.partId.toString() === conflict.partId.toString()
            );
            if (partRequest) {
              partRequest.isApproved = false;
              await reception.save({ session });
            }
          }
        } else if (request.requestType === "PartRequest") {
          const partRequest = await PartRequest.findById(
            request.requestId
          ).session(session);
          if (partRequest) {
            partRequest.status = "rejected";
            partRequest.reviewedBy = staffId;
            partRequest.reviewedAt = new Date();
            partRequest.reviewNotes = notes || "Request bị từ chối vì conflict";
            await partRequest.save({ session });
          }
        }
      } else {
        // Deferred by default if not explicitly approved
        if (request.status === "pending") {
          request.status = "deferred";
          request.resolutionNotes =
            notes || "Request bị trì hoãn vì thiếu linh kiện";
          rejectedRequests.push(request);
        }
      }
    }

    // Mark conflict as resolved
    conflict.status = "resolved";
    conflict.resolvedBy = staffId;
    conflict.resolvedAt = new Date();
    conflict.resolutionNotes = notes || "";
    await conflict.save({ session });

    await session.commitTransaction();

    // TODO: Send notifications
    // - Notify approved requests' technicians and customers
    // - Notify deferred/rejected requests' technicians and customers

    res.status(200).json({
      success: true,
      message: "Conflict resolved successfully",
      data: {
        conflictId: conflict._id,
        approvedCount: approvedRequests.length,
        rejectedCount: rejectedRequests.length,
        totalApprovedQuantity,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error resolving conflict:", error);
    res.status(500).json({
      success: false,
      message: "Error resolving conflict",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Manually trigger conflict detection
 * @route   POST /api/part-conflicts/detect
 * @access  Private (Staff/Admin)
 */
export const detectConflicts = async (req, res) => {
  try {
    const { partId } = req.body;

    if (partId) {
      const conflict = await detectPartConflicts(partId);
      res.status(200).json({
        success: true,
        message: conflict ? "Conflict detected" : "No conflict found",
        data: conflict,
      });
    } else {
      // Detect all conflicts
      const conflicts = await detectAllConflicts();
      res.status(200).json({
        success: true,
        message: `Detected ${conflicts.length} conflicts`,
        count: conflicts.length,
        data: conflicts,
      });
    }
  } catch (error) {
    console.error("Error detecting conflicts:", error);
    res.status(500).json({
      success: false,
      message: "Error detecting conflicts",
      error: error.message,
    });
  }
};

// Check if a service reception has conflicts
export const checkReceptionConflicts = async (req, res) => {
  try {
    const { receptionId } = req.params;

    const ServiceReception = mongoose.model("ServiceReception");
    const reception = await ServiceReception.findById(receptionId);

    if (!reception) {
      return res.status(404).json({
        success: false,
        message: "Service reception not found",
      });
    }

    if (!reception.requestedParts || reception.requestedParts.length === 0) {
      return res.status(200).json({
        success: true,
        hasConflict: false,
        conflicts: [],
      });
    }

    // Get unique part IDs from requested parts (only unapproved)
    const partIds = [
      ...new Set(
        reception.requestedParts
          .filter((p) => !p.isApproved)
          .map((p) => p.partId?.toString())
          .filter(Boolean)
      ),
    ];

    if (partIds.length === 0) {
      return res.status(200).json({
        success: true,
        hasConflict: false,
        conflicts: [],
      });
    }

    // Check conflicts for each part
    const conflictPromises = partIds.map((partId) =>
      detectPartConflicts(partId)
    );
    const conflicts = await Promise.all(conflictPromises);

    // Filter out null results (no conflicts)
    const detectedConflicts = conflicts.filter((c) => c !== null);

    res.status(200).json({
      success: true,
      hasConflict: detectedConflicts.length > 0,
      conflictCount: detectedConflicts.length,
      conflicts: detectedConflicts,
    });
  } catch (error) {
    console.error("Error checking reception conflicts:", error);
    res.status(500).json({
      success: false,
      message: "Error checking reception conflicts",
      error: error.message,
    });
  }
};

// @desc    Get auto-suggested resolution for a conflict
// @route   GET /api/part-conflicts/:id/suggestion
// @access  Private (Staff/Admin)
export const getSuggestedResolution = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conflict ID format",
      });
    }

    const conflict = await PartConflict.findById(id).populate(
      "partId",
      "name partNumber inventory"
    );

    if (!conflict) {
      return res.status(404).json({
        success: false,
        message: "Conflict not found",
      });
    }

    if (conflict.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Conflict is already ${conflict.status}. Suggestions are only available for pending conflicts.`,
      });
    }

    // Sort requests by priority and scheduled date
    const priorityWeight = {
      urgent: 4,
      high: 3,
      normal: 2,
      low: 1,
    };

    const sortedRequests = [...conflict.conflictingRequests].sort((a, b) => {
      // Higher priority first
      const priorityA = priorityWeight[a.priority] || 0;
      const priorityB = priorityWeight[b.priority] || 0;

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // Earlier date first
      const dateA = new Date(a.scheduledDate);
      const dateB = new Date(b.scheduledDate);
      return dateA - dateB;
    });

    // Greedily select requests that fit available stock
    const suggested = [];
    let remainingStock = conflict.availableStock;

    for (const request of sortedRequests) {
      if (
        request.status === "pending" &&
        request.requestedQuantity <= remainingStock
      ) {
        suggested.push({
          requestId: request.requestId,
          receptionNumber: request.appointmentNumber,
          priority: request.priority,
          scheduledDate: request.scheduledDate,
          requestedQuantity: request.requestedQuantity,
          reasoning: `Priority: ${request.priority.toUpperCase()}, Scheduled: ${new Date(
            request.scheduledDate
          ).toLocaleDateString("vi-VN")}`,
        });
        remainingStock -= request.requestedQuantity;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        suggested,
        availableStock: conflict.availableStock,
        totalRequested: conflict.totalRequested,
      },
    });
  } catch (error) {
    console.error("Error getting suggested resolution:", error);
    res.status(500).json({
      success: false,
      message: "Error getting suggested resolution",
      error: error.message,
    });
  }
};

// @desc    Approve a single request within a conflict
// @route   POST /api/part-conflicts/:id/approve-request
// @access  Private (Staff/Admin)
export const approveConflictRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { requestId, notes } = req.body;
    const staffId = req.user._id;

    // Validate staff/admin role
    if (!["staff", "admin"].includes(req.user.role)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Only staff and admin can approve requests",
      });
    }

    const conflict = await PartConflict.findById(id).session(session);
    if (!conflict) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Conflict not found",
      });
    }

    if (conflict.status !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Conflict is already ${conflict.status}`,
      });
    }

    // Find the request
    const request = conflict.conflictingRequests.find(
      (r) => r.requestId.toString() === requestId
    );

    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Request not found in conflict",
      });
    }

    if (request.status !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`,
      });
    }

    const part = await Part.findById(conflict.partId).session(session);
    if (!part) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Part not found",
      });
    }

    const availableStock = part.inventory.currentStock;

    // Check if enough stock
    if (request.requestedQuantity > availableStock) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Need ${request.requestedQuantity}, available ${availableStock}`,
      });
    }

    // Approve the request
    request.status = "approved";
    request.autoApproved = false;
    request.resolutionNotes = notes || "Approved via conflict resolution";

    // Update ServiceReception
    const reception =
      await ServiceReception.findById(requestId).session(session);
    if (!reception) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Service reception not found",
      });
    }

    const partRequest = reception.requestedParts.find(
      (p) => p.partId.toString() === conflict.partId.toString()
    );

    if (partRequest) {
      partRequest.isApproved = true;
    }

    // Set reception status to APPROVED directly (skip dashboard approval)
    reception.status = "approved";
    reception.submissionStatus.staffReviewStatus = "approved";
    reception.submissionStatus.reviewedBy = staffId;
    reception.submissionStatus.reviewedAt = new Date();
    reception.submissionStatus.reviewNotes =
      notes || "Approved via conflict resolution";

    await reception.save({ session });

    // Decrease currentStock and increase usedStock
    part.inventory.currentStock -= request.requestedQuantity;
    part.inventory.usedStock += request.requestedQuantity;
    await part.save({ session });

    // Check if all parts in reception are approved, then update appointment status
    const allPartsApproved = reception.requestedParts.every(
      (p) => p.isApproved === true
    );

    if (allPartsApproved && reception.appointmentId) {
      try {
        const appointment = await Appointment.findById(
          reception.appointmentId
        ).session(session);

        if (appointment) {
          // Check if appointment can transition to reception_approved
          // Only update if current status allows this transition
          const allowedStatuses = [
            "reception_created",
            "waiting_for_parts",
            "parts_insufficient",
            "parts_requested",
          ];

          if (allowedStatuses.includes(appointment.status)) {
            await appointment.updateStatus(
              "reception_approved",
              staffId,
              "staff",
              "All parts approved via conflict resolution",
              notes || "Parts approved and reserved via conflict resolution"
            );
          }
        }
      } catch (appointmentError) {
        console.error(
          `Error updating appointment status for ${reception.appointmentId}:`,
          appointmentError
        );
        // Don't fail the transaction if appointment update fails
      }
    }

    // Check if all requests in conflict are resolved
    const allResolved = conflict.conflictingRequests.every(
      (r) => r.status !== "pending"
    );

    if (allResolved) {
      conflict.status = "resolved";
      conflict.resolvedBy = staffId;
      conflict.resolvedAt = new Date();
      conflict.resolutionNotes = notes || "";
    }

    await conflict.save({ session });

    // Recalculate available stock for response
    const newAvailableStock = part.inventory.currentStock;

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Request approved successfully",
      data: {
        requestId,
        conflictStatus: conflict.status,
        newAvailableStock,
        receptionStatus: reception.submissionStatus.staffReviewStatus,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error approving conflict request:", error);
    res.status(500).json({
      success: false,
      message: "Error approving request",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// @desc    Reject a single request within a conflict
// @route   POST /api/part-conflicts/:id/reject-request
// @access  Private (Staff/Admin)
export const rejectConflictRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { requestId, reason } = req.body;
    const staffId = req.user._id;

    // Validate staff/admin role
    if (!["staff", "admin"].includes(req.user.role)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Only staff and admin can reject requests",
      });
    }

    if (!reason || reason.trim() === "") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Reason for rejection is required",
      });
    }

    const conflict = await PartConflict.findById(id).session(session);
    if (!conflict) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Conflict not found",
      });
    }

    // Find the request
    const request = conflict.conflictingRequests.find(
      (r) => r.requestId.toString() === requestId
    );

    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Request not found in conflict",
      });
    }

    if (request.status !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`,
      });
    }

    // Reject the request
    request.status = "rejected";
    request.resolutionNotes = reason;

    // Update ServiceReception status to pending_parts_restock
    const reception =
      await ServiceReception.findById(requestId).session(session);
    if (!reception) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Service reception not found",
      });
    }

    reception.status = "rejected";
    reception.submissionStatus.staffReviewStatus = "rejected";
    reception.submissionStatus.reviewedBy = staffId;
    reception.submissionStatus.reviewedAt = new Date();
    reception.submissionStatus.reviewNotes = reason;

    await reception.save({ session });

    // Update appointment status to parts_insufficient when staff rejects
    // This follows the workflow: reception_created → (reject due to parts) → parts_insufficient
    if (reception.appointmentId) {
      try {
        const appointment = await Appointment.findById(
          reception.appointmentId
        ).session(session);

        if (appointment) {
          // Store rejection reason for customer visibility
          appointment.status = "parts_insufficient";
          appointment.staffRejectionReason = reason;
          appointment.rejectedAt = new Date();
          appointment.rejectedBy = staffId;

          appointment.workflowHistory.push({
            status: "parts_insufficient",
            changedBy: staffId,
            changedAt: new Date(),
            notes: `Parts request rejected via conflict resolution: ${reason}`,
          });

          await appointment.save({ session });

          console.log(
            `✅ Updated appointment ${appointment.appointmentNumber} status to parts_insufficient`
          );
        }
      } catch (appointmentError) {
        console.error(
          `Error updating appointment status for ${reception.appointmentId}:`,
          appointmentError
        );
        // Don't fail the transaction if appointment update fails
      }
    }

    // Check if all requests in conflict are resolved
    const allResolved = conflict.conflictingRequests.every(
      (r) => r.status !== "pending"
    );

    if (allResolved) {
      conflict.status = "resolved";
      conflict.resolvedBy = staffId;
      conflict.resolvedAt = new Date();
    }

    await conflict.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Request rejected successfully",
      data: {
        requestId,
        conflictStatus: conflict.status,
        receptionStatus: reception.submissionStatus.staffReviewStatus,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error rejecting conflict request:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting request",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};
