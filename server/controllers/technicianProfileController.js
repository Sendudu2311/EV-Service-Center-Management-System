import TechnicianProfile from "../models/TechnicianProfile.js";
import User from "../models/User.js";
import Appointment from "../models/Appointment.js";

// @desc    Get current technician's profile
// @route   GET /api/technicians/profile
// @access  Private (Technician)
export const getTechnicianProfile = async (req, res) => {
  try {
    let profile = await TechnicianProfile.findOne({
      technicianId: req.user._id,
    })
      .populate(
        "technicianId",
        "firstName lastName email phone specializations certifications"
      )
      .populate(
        "workload.queuedAppointments",
        "appointmentNumber scheduledDate status"
      );

    // If no profile exists, create a default one
    if (!profile) {
      profile = await createDefaultTechnicianProfile(req.user._id);
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Error fetching technician profile:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching technician profile",
    });
  }
};

// @desc    Update technician profile
// @route   PUT /api/technicians/profile
// @access  Private (Technician)
export const updateTechnicianProfile = async (req, res) => {
  try {
    const allowedUpdates = [
      "workShift",
      "preferences",
      "availability.scheduleNotes",
    ];

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const profile = await TechnicianProfile.findOneAndUpdate(
      { technicianId: req.user._id },
      updates,
      { new: true, runValidators: true }
    ).populate("technicianId", "firstName lastName email phone");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Technician profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (error) {
    console.error("Error updating technician profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
};

// @desc    Get all technicians (for staff/admin)
// @route   GET /api/technicians
// @access  Private (Staff/Admin)
export const getTechnicians = async (req, res) => {
  try {
    const {
      status,
      skillCategory,
      availability,
      page = 1,
      limit = 10,
    } = req.query;

    // Check authorization - customers can view technicians for booking, staff/admin can manage
    if (!["customer", "staff", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view technician data",
      });
    }

    const skip = (page - 1) * limit;
    let filter = { isActive: true };

    // Build filter based on query parameters
    if (availability) {
      filter["availability.status"] = availability;
    }

    if (skillCategory) {
      filter["skillMatrix.serviceCategory"] = skillCategory;
    }

    // Single center architecture - no service center filtering needed
    // All technicians belong to the single center

    const profiles = await TechnicianProfile.find(filter)
      .populate(
        "technicianId",
        "firstName lastName email phone specializations"
      )
      .populate(
        "availability.currentAppointment",
        "appointmentNumber scheduledDate"
      )
      .populate(
        "workload.queuedAppointments",
        "appointmentNumber scheduledDate status priority"
      )
      .sort({ "performance.efficiency": -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TechnicianProfile.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: profiles.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: profiles,
    });
  } catch (error) {
    console.error("Error fetching technicians:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching technicians",
    });
  }
};

// @desc    Update technician availability
// @route   PUT /api/technicians/:id/availability
// @access  Private (Technician for own, Staff/Admin for others)
export const updateTechnicianAvailability = async (req, res) => {
  try {
    const { status, scheduleNotes } = req.body;
    const { id } = req.params;

    // Check if user can update this technician's availability
    const profile = await TechnicianProfile.findById(id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Technician profile not found",
      });
    }

    // Authorization check
    const canUpdate =
      req.user._id.equals(profile.technicianId) ||
      ["staff", "admin"].includes(req.user.role);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this technician's availability",
      });
    }

    // Update availability
    profile.availability.status = status;
    profile.availability.scheduleNotes =
      scheduleNotes || profile.availability.scheduleNotes;
    profile.availability.lastStatusUpdate = new Date();

    await profile.save();

    const updatedProfile = await TechnicianProfile.findById(id).populate(
      "technicianId",
      "firstName lastName email"
    );

    res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating availability:", error);
    res.status(500).json({
      success: false,
      message: "Error updating availability",
    });
  }
};

// @desc    Get workload distribution
// @route   GET /api/technicians/workload
// @access  Private (Staff/Admin)
export const getWorkloadDistribution = async (req, res) => {
  try {
    if (!["staff", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view workload data",
      });
    }

    const { serviceCenterId } = req.query;
    let filter = { isActive: true };

    // Filter by service center if specified
    if (serviceCenterId) {
      const technicians = await User.find({
        role: "technician",
        serviceCenterId: serviceCenterId,
        isActive: true,
      }).select("_id");

      filter.technicianId = { $in: technicians.map((t) => t._id) };
    } else if (req.user.role === "staff" && req.user.serviceCenterId) {
      // Staff can only see their service center
      const technicians = await User.find({
        role: "technician",
        serviceCenterId: req.user.serviceCenterId,
        isActive: true,
      }).select("_id");

      filter.technicianId = { $in: technicians.map((t) => t._id) };
    }

    const profiles = await TechnicianProfile.find(filter)
      .populate("technicianId", "firstName lastName")
      // serviceCenterId nested populate removed - single center architecture
      .select("technicianId workload availability performance statistics");

    // Calculate workload distribution
    const distribution = profiles.map((profile) => ({
      technician: {
        id: profile.technicianId._id,
        name: `${profile.technicianId.firstName} ${profile.technicianId.lastName}`,
        serviceCenter: profile.technicianId.serviceCenterId,
      },
      workload: {
        current: profile.workload.current,
        capacity: profile.workload.capacity,
        percentage: profile.workloadPercentage,
        queuedCount: profile.workload.queuedAppointments.length,
      },
      availability: profile.availability.status,
      performance: {
        efficiency: profile.performance.efficiency,
        completedJobs: profile.performance.completedJobs,
        averageRating: profile.performance.customerRating,
      },
      statistics: profile.statistics,
    }));

    // Calculate summary statistics
    const summary = {
      totalTechnicians: distribution.length,
      availableTechnicians: distribution.filter(
        (t) => t.availability === "available"
      ).length,
      busyTechnicians: distribution.filter((t) => t.availability === "busy")
        .length,
      offlineTechnicians: distribution.filter((t) =>
        ["offline", "break", "sick_leave", "vacation"].includes(t.availability)
      ).length,
      averageWorkload:
        distribution.length > 0
          ? Math.round(
              distribution.reduce((sum, t) => sum + t.workload.percentage, 0) /
                distribution.length
            )
          : 0,
      totalCapacity: distribution.reduce(
        (sum, t) => sum + t.workload.capacity,
        0
      ),
      totalCurrent: distribution.reduce(
        (sum, t) => sum + t.workload.current,
        0
      ),
    };

    res.status(200).json({
      success: true,
      data: {
        summary,
        distribution: distribution.sort(
          (a, b) => b.workload.percentage - a.workload.percentage
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching workload distribution:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching workload data",
    });
  }
};

// @desc    Find best technician for appointment
// @route   POST /api/technicians/find-best
// @access  Private (Staff/Admin)
export const findBestTechnician = async (req, res) => {
  try {
    if (!["staff", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to assign technicians",
      });
    }

    const {
      serviceCategories,
      scheduledDate,
      estimatedDuration,
      priority,
      serviceCenterId,
    } = req.body;

    if (!serviceCategories || !scheduledDate || !serviceCenterId) {
      return res.status(400).json({
        success: false,
        message:
          "Service categories, scheduled date, and service center are required",
      });
    }

    // Get technicians from the service center
    const technicians = await User.find({
      role: "technician",
      serviceCenterId: serviceCenterId,
      isActive: true,
    }).select("_id");

    const technicianIds = technicians.map((t) => t._id);

    // Find available technicians
    const profiles = await TechnicianProfile.find({
      technicianId: { $in: technicianIds },
      isActive: true,
      "availability.status": { $in: ["available", "busy"] },
    })
      .populate("technicianId", "firstName lastName specializations")
      .populate("workload.queuedAppointments");

    // Score each technician based on multiple factors
    const scoredTechnicians = profiles
      .filter((profile) =>
        profile.isAvailableForAppointment(
          new Date(scheduledDate),
          estimatedDuration
        )
      )
      .map((profile) => {
        let score = 0;

        // Skill matching (40% of score)
        const skillScore = calculateSkillMatch(
          profile.skillMatrix,
          serviceCategories
        );
        score += skillScore * 0.4;

        // Workload factor (30% of score) - lower workload is better
        const workloadScore = Math.max(0, 100 - profile.workloadPercentage);
        score += workloadScore * 0.3;

        // Performance factor (20% of score)
        const performanceScore =
          (profile.performance.efficiency +
            profile.performance.customerRating * 20) /
          2;
        score += performanceScore * 0.2;

        // Availability factor (10% of score)
        const availabilityScore =
          profile.availability.status === "available" ? 100 : 50;
        score += availabilityScore * 0.1;

        return {
          technician: profile.technicianId,
          profile: profile,
          score: Math.round(score),
          factors: {
            skillMatch: Math.round(skillScore),
            workloadScore: Math.round(workloadScore),
            performanceScore: Math.round(performanceScore),
            availabilityScore: availabilityScore,
          },
        };
      })
      .sort((a, b) => b.score - a.score);

    res.status(200).json({
      success: true,
      data: {
        recommendations: scoredTechnicians.slice(0, 5), // Top 5 recommendations
        totalCandidates: scoredTechnicians.length,
        bestMatch: scoredTechnicians[0] || null,
      },
    });
  } catch (error) {
    console.error("Error finding best technician:", error);
    res.status(500).json({
      success: false,
      message: "Error finding best technician",
    });
  }
};

// @desc    Update technician performance metrics
// @route   PUT /api/technicians/:id/performance
// @access  Private (Admin only)
export const updatePerformanceMetrics = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update performance metrics",
      });
    }

    const { id } = req.params;
    const profile = await TechnicianProfile.findById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Technician profile not found",
      });
    }

    // Update performance metrics if provided
    if (req.body.appointmentData) {
      await profile.updatePerformanceMetrics(req.body.appointmentData);
    }

    // Manual updates for other metrics
    const allowedUpdates = ["qualityRating", "efficiency"];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        profile.performance[field] = req.body[field];
      }
    });

    profile.performance.lastUpdated = new Date();
    await profile.save();

    res.status(200).json({
      success: true,
      message: "Performance metrics updated successfully",
      data: profile.performance,
    });
  } catch (error) {
    console.error("Error updating performance metrics:", error);
    res.status(500).json({
      success: false,
      message: "Error updating performance metrics",
    });
  }
};

// Helper function to create default technician profile
async function createDefaultTechnicianProfile(technicianId) {
  const user = await User.findById(technicianId);

  // Generate employee ID
  const count = await TechnicianProfile.countDocuments({});
  const employeeId = `TECH${(count + 1).toString().padStart(4, "0")}`;

  const profile = new TechnicianProfile({
    technicianId: technicianId,
    employeeId: employeeId,
    workShift: {
      type: "flexible",
      startTime: "08:00",
      endTime: "17:00",
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    },
    skillMatrix: user.specializations
      ? user.specializations.map((spec) => ({
          serviceCategory: spec,
          proficiencyLevel: 3,
          lastAssessment: new Date(),
        }))
      : [],
  });

  return await profile.save();
}

// Helper function to calculate skill match score
function calculateSkillMatch(skillMatrix, requiredCategories) {
  if (!requiredCategories || requiredCategories.length === 0) return 50;

  let totalScore = 0;
  let matchedCategories = 0;

  requiredCategories.forEach((category) => {
    const skill = skillMatrix.find((s) => s.serviceCategory === category);
    if (skill) {
      totalScore += skill.proficiencyLevel * 20; // Convert 1-5 scale to 20-100
      matchedCategories++;
    }
  });

  // If no skills match, return low score
  if (matchedCategories === 0) return 10;

  // Calculate average score for matched skills
  return totalScore / matchedCategories;
}

export default {
  getTechnicianProfile,
  updateTechnicianProfile,
  getTechnicians,
  updateTechnicianAvailability,
  getWorkloadDistribution,
  findBestTechnician,
  updatePerformanceMetrics,
};
