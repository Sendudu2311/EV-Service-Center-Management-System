import mongoose from "mongoose";
import { sendSuccess, sendError } from "../utils/response.js";

// Import models
const ChecklistInstance = mongoose.model("ChecklistInstance");
const EVChecklist = mongoose.model("EVChecklist");
const ServiceReception = mongoose.model("ServiceReception");
const Appointment = mongoose.model("Appointment");

// @desc    Get all checklist instances
// @route   GET /api/checklist-instances
// @access  Private (Technician/Staff/Admin)
export const getChecklistInstances = async (req, res) => {
  try {
    const { status, appointmentId, technicianId } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (appointmentId) filter.appointmentId = appointmentId;
    if (technicianId) filter.assignedTo = technicianId;

    const checklistInstances = await ChecklistInstance.find(filter)
      .populate("checklistId", "name code description category")
      .populate("appointmentId", "appointmentNumber customerId vehicleId")
      .populate("assignedTo", "firstName lastName email")
      .populate("serviceReceptionId", "receptionNumber status")
      .sort({ createdAt: -1 });

    return sendSuccess(
      res,
      200,
      "Checklist instances retrieved successfully",
      checklistInstances
    );
  } catch (error) {
    console.error("Error getting checklist instances:", error);
    return sendError(
      res,
      500,
      "Error getting checklist instances",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};

// @desc    Get checklist instance by ID
// @route   GET /api/checklist-instances/:id
// @access  Private (Technician/Staff/Admin)
export const getChecklistInstance = async (req, res) => {
  try {
    const { id } = req.params;

    const checklistInstance = await ChecklistInstance.findById(id)
      .populate(
        "checklistId",
        "name code description category estimatedDuration"
      )
      .populate("appointmentId", "appointmentNumber customerId vehicleId")
      .populate("assignedTo", "firstName lastName email")
      .populate("serviceReceptionId", "receptionNumber status");

    if (!checklistInstance) {
      return sendError(
        res,
        404,
        "Checklist instance not found",
        null,
        "CHECKLIST_INSTANCE_NOT_FOUND"
      );
    }

    return sendSuccess(
      res,
      200,
      "Checklist instance retrieved successfully",
      checklistInstance
    );
  } catch (error) {
    console.error("Error getting checklist instance:", error);
    return sendError(
      res,
      500,
      "Error getting checklist instance",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};

// @desc    Start checklist instance
// @route   PUT /api/checklist-instances/:id/start
// @access  Private (Technician)
export const startChecklistInstance = async (req, res) => {
  try {
    const { id } = req.params;

    const checklistInstance = await ChecklistInstance.findById(id);
    if (!checklistInstance) {
      return sendError(
        res,
        404,
        "Checklist instance not found",
        null,
        "CHECKLIST_INSTANCE_NOT_FOUND"
      );
    }

    // Verify authorization
    if (
      checklistInstance.assignedTo?.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return sendError(
        res,
        403,
        "Only assigned technician can start checklist",
        null,
        "UNAUTHORIZED_TECHNICIAN"
      );
    }

    await checklistInstance.startChecklist(req.user._id);

    return sendSuccess(
      res,
      200,
      "Checklist instance started successfully",
      checklistInstance
    );
  } catch (error) {
    console.error("Error starting checklist instance:", error);
    return sendError(
      res,
      500,
      "Error starting checklist instance",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};

// @desc    Complete checklist instance
// @route   PUT /api/checklist-instances/:id/complete
// @access  Private (Technician)
export const completeChecklistInstance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      finalNotes,
      recommendations,
      nextServiceDate,
      followUpRequired,
      followUpDetails,
    } = req.body;

    const checklistInstance = await ChecklistInstance.findById(id);
    if (!checklistInstance) {
      return sendError(
        res,
        404,
        "Checklist instance not found",
        null,
        "CHECKLIST_INSTANCE_NOT_FOUND"
      );
    }

    // Verify authorization
    if (
      checklistInstance.assignedTo?.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return sendError(
        res,
        403,
        "Only assigned technician can complete checklist",
        null,
        "UNAUTHORIZED_TECHNICIAN"
      );
    }

    // Update completion details
    checklistInstance.finalNotes = finalNotes;
    checklistInstance.recommendations = recommendations;
    checklistInstance.nextServiceDate = nextServiceDate;
    checklistInstance.followUpRequired = followUpRequired;
    checklistInstance.followUpDetails = followUpDetails;

    await checklistInstance.completeChecklist(req.user._id);

    // Update ServiceReception progress if linked
    if (checklistInstance.serviceReceptionId) {
      const serviceReception = await ServiceReception.findById(
        checklistInstance.serviceReceptionId
      );
      if (serviceReception) {
        serviceReception.evChecklistProgress.isCompleted = true;
        serviceReception.evChecklistProgress.completedAt = new Date();
        serviceReception.evChecklistProgress.progressPercentage = 100;
        await serviceReception.save();
      }
    }

    return sendSuccess(
      res,
      200,
      "Checklist instance completed successfully",
      checklistInstance
    );
  } catch (error) {
    console.error("Error completing checklist instance:", error);
    return sendError(
      res,
      500,
      "Error completing checklist instance",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};

// @desc    Get checklist instance items
// @route   GET /api/checklist-instances/:id/items
// @access  Private (Technician/Staff/Admin)
export const getChecklistInstanceItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, status } = req.query;

    const checklistInstance = await ChecklistInstance.findById(id);
    if (!checklistInstance) {
      return sendError(
        res,
        404,
        "Checklist instance not found",
        null,
        "CHECKLIST_INSTANCE_NOT_FOUND"
      );
    }

    let items = checklistInstance.items;

    // Filter by category if provided
    if (category) {
      items = items.filter((item) => item.category === category);
    }

    // Filter by status if provided
    if (status) {
      items = items.filter(
        (item) => item.isCompleted === (status === "completed")
      );
    }

    return sendSuccess(
      res,
      200,
      "Checklist instance items retrieved successfully",
      {
        checklistInstanceId: checklistInstance._id,
        totalItems: checklistInstance.items.length,
        filteredItems: items.length,
        items,
      }
    );
  } catch (error) {
    console.error("Error getting checklist instance items:", error);
    return sendError(
      res,
      500,
      "Error getting checklist instance items",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};

// @desc    Update checklist instance item
// @route   PUT /api/checklist-instances/:id/items/:stepNumber
// @access  Private (Technician)
export const updateChecklistInstanceItem = async (req, res) => {
  try {
    const { id, stepNumber } = req.params;
    const { result, notes, photos, measurements, issues, actualTime } =
      req.body;

    const checklistInstance = await ChecklistInstance.findById(id);
    if (!checklistInstance) {
      return sendError(
        res,
        404,
        "Checklist instance not found",
        null,
        "CHECKLIST_INSTANCE_NOT_FOUND"
      );
    }

    // Verify authorization
    if (
      checklistInstance.assignedTo?.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return sendError(
        res,
        403,
        "Only assigned technician can update checklist items",
        null,
        "UNAUTHORIZED_TECHNICIAN"
      );
    }

    // Update the item
    await checklistInstance.completeItem(stepNumber, result, {
      completedBy: req.user._id,
      notes,
      photos,
      measurements,
      issues,
      actualTime,
    });

    // Update ServiceReception progress if linked
    if (checklistInstance.serviceReceptionId) {
      const serviceReception = await ServiceReception.findById(
        checklistInstance.serviceReceptionId
      );
      if (serviceReception) {
        serviceReception.evChecklistProgress.completedItems =
          checklistInstance.completedItems;
        serviceReception.evChecklistProgress.progressPercentage =
          checklistInstance.progressPercentage;
        await serviceReception.save();
      }
    }

    return sendSuccess(res, 200, "Checklist item updated successfully", {
      checklistInstance,
      updatedItem: checklistInstance.items.find(
        (item) => item.stepNumber === parseInt(stepNumber)
      ),
    });
  } catch (error) {
    console.error("Error updating checklist item:", error);
    return sendError(
      res,
      500,
      "Error updating checklist item",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};

// @desc    Get checklist statistics
// @route   GET /api/checklist-instances/statistics
// @access  Private (Staff/Admin)
export const getChecklistStatistics = async (req, res) => {
  try {
    const { startDate, endDate, technicianId } = req.query;

    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (technicianId) filter.assignedTo = technicianId;

    const statistics = await ChecklistInstance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalInstances: { $sum: 1 },
          completedInstances: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          inProgressInstances: {
            $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
          },
          pendingInstances: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          averageCompletionTime: { $avg: "$totalTime" },
          averageProgress: { $avg: "$progressPercentage" },
        },
      },
    ]);

    return sendSuccess(
      res,
      200,
      "Checklist statistics retrieved successfully",
      statistics[0] || {
        totalInstances: 0,
        completedInstances: 0,
        inProgressInstances: 0,
        pendingInstances: 0,
        averageCompletionTime: 0,
        averageProgress: 0,
      }
    );
  } catch (error) {
    console.error("Error getting checklist statistics:", error);
    return sendError(
      res,
      500,
      "Error getting checklist statistics",
      null,
      "INTERNAL_SERVER_ERROR"
    );
  }
};
