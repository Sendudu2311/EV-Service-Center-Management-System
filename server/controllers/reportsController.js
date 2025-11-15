import {
  User,
  Appointment,
  Service,
  Vehicle,
  Invoice,
  TechnicianProfile,
} from "../models/index.js";
import { sendSuccess, sendError, asyncHandler } from "../utils/response.js";

// Helper: Random color generator for charts
const getRandomColor = () => {
  const colors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Helper: Get date range based on filter
const getDateRange = (period = "6months") => {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "1month":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "3months":
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case "6months":
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case "1year":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(startDate.getMonth() - 6);
  }

  return { startDate, endDate };
};

// @desc    Get comprehensive analytics and reports data
// @route   GET /api/reports/analytics
// @access  Private (Admin only)
export const getAnalytics = asyncHandler(async (req, res) => {
  const { startDate: startDateParam, endDate: endDateParam, serviceId, technicianId } = req.query;

  // Use provided dates or default to last 30 days
  let startDate, endDate;
  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
    // Set endDate to end of day
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Default to last 30 days if no dates provided
    endDate = new Date();
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
  }

  // Build filter for appointments
  let appointmentFilter = {
    createdAt: { $gte: startDate, $lte: endDate },
  };

  if (serviceId) {
    appointmentFilter["services.serviceId"] = serviceId;
  }

  if (technicianId) {
    appointmentFilter["technician"] = technicianId;
  }

  // 1. Get appointment metrics
  const appointments = await Appointment.find(appointmentFilter).populate(
    "services.serviceId",
    "name category price"
  );

  const completedAppointments = appointments.filter(
    (a) => a.status === "completed"
  );
  const cancelledAppointments = appointments.filter(
    (a) => a.status === "cancelled"
  );
  const pendingAppointments = appointments.filter(
    (a) => a.status === "pending" || a.status === "confirmed"
  );
  
  // Appointments that generate revenue (completed OR invoiced)
  const revenueGeneratingAppointments = appointments.filter(
    (a) => a.status === "completed" || a.status === "invoiced"
  );

  // 2. Calculate revenue using totalAmount field
  const totalRevenue = revenueGeneratingAppointments.reduce((sum, appt) => {
    return sum + (appt.totalAmount || 0);
  }, 0);

  const averageRevenue =
    revenueGeneratingAppointments.length > 0
      ? totalRevenue / revenueGeneratingAppointments.length
      : 0;

  // Count total appointments
  const totalAppointmentsCount = await Appointment.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
  });

  // Count completed + invoiced appointments
  const completedAndInvoicedCount = await Appointment.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $in: ['completed', 'invoiced'] },
  });

  // 3. Get invoices for payment data
  const invoices = await Invoice.find({
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const paidInvoices = invoices.filter((inv) => inv.paymentInfo?.status === "paid");
  const pendingInvoices = invoices.filter(
    (inv) => inv.paymentInfo?.status === "pending" || inv.paymentInfo?.status === "unpaid"
  );

  // 4. Monthly trends (appointments)
  const monthlyAppointmentsTrend = {};
  const monthlyRevenueTrend = {};
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  appointments.forEach((appt) => {
    const date = new Date(appt.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(
      2,
      "0"
    )}`;
    const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

    if (!monthlyAppointmentsTrend[monthKey]) {
      monthlyAppointmentsTrend[monthKey] = {
        month: monthLabel,
        appointments: 0,
        completed: 0,
        cancelled: 0,
      };
    }

    monthlyAppointmentsTrend[monthKey].appointments += 1;

    if (appt.status === "completed") {
      monthlyAppointmentsTrend[monthKey].completed += 1;
    } else if (appt.status === "cancelled") {
      monthlyAppointmentsTrend[monthKey].cancelled += 1;
    }

    // Revenue trend - include both completed AND invoiced
    if (appt.status === "completed" || appt.status === "invoiced") {
      if (!monthlyRevenueTrend[monthKey]) {
        monthlyRevenueTrend[monthKey] = {
          month: monthLabel,
          revenue: 0,
          transactions: 0,
        };
      }

      monthlyRevenueTrend[monthKey].revenue += appt.totalAmount || 0;
      monthlyRevenueTrend[monthKey].transactions += 1;
    }
  });

  const appointmentsTrendData = Object.values(monthlyAppointmentsTrend);
  const revenueTrendData = Object.values(monthlyRevenueTrend);

  // 5. Service distribution (pie chart)
  const serviceDistribution = {};
  appointments.forEach((appt) => {
    appt.services.forEach((svc) => {
      const serviceName = svc.serviceId?.name || "Unknown Service";
      serviceDistribution[serviceName] =
        (serviceDistribution[serviceName] || 0) + 1;
    });
  });

  const serviceDistributionData = Object.entries(serviceDistribution).map(
    ([name, value]) => ({
      name,
      value,
      color: getRandomColor(),
    })
  );

  // 6. Appointment status distribution
  const appointmentStatusData = [
    { status: "Completed", count: completedAppointments.length, color: "#10b981" },
    { status: "Cancelled", count: cancelledAppointments.length, color: "#ef4444" },
    { status: "Pending", count: pendingAppointments.length, color: "#f59e0b" },
  ];

  // 7. Technician performance (if not filtered by specific technician)
  let technicianPerformanceData = [];
  if (!technicianId) {
    const technicianStats = {};
    appointments.forEach((appt) => {
      if (appt.technician) {
        if (!technicianStats[appt.technician]) {
          technicianStats[appt.technician] = {
            appointments: 0,
            completed: 0,
            rating: 0,
            totalRating: 0,
          };
        }
        technicianStats[appt.technician].appointments += 1;
        if (appt.status === "completed") {
          technicianStats[appt.technician].completed += 1;
        }
      }
    });

    // Fetch technician details and ratings
    technicianPerformanceData = await Promise.all(
      Object.entries(technicianStats).map(async ([techId, stats]) => {
        const tech = await User.findById(techId).select("firstName lastName");
        const profile = await TechnicianProfile.findOne({ userId: techId });

        return {
          name: tech
            ? `${tech.firstName} ${tech.lastName}`
            : "Unknown Technician",
          appointments: stats.appointments,
          completed: stats.completed,
          efficiency: Math.round(
            (stats.completed / stats.appointments) * 100 || 0
          ),
          rating: profile?.averageRating || 0,
        };
      })
    );
  }

  // 8. Key metrics summary
  const stats = {
    totalAppointments: appointments.length,
    completedAppointments: completedAppointments.length,
    cancelledAppointments: cancelledAppointments.length,
    pendingAppointments: pendingAppointments.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageRevenue: Math.round(averageRevenue * 100) / 100,
    completionRate:
      appointments.length > 0
        ? Math.round((completedAppointments.length / appointments.length) * 100)
        : 0,
    totalInvoices: invoices.length,
    paidInvoices: paidInvoices.length,
    pendingInvoices: pendingInvoices.length,
    paymentCollectionRate:
      invoices.length > 0
        ? Math.round((paidInvoices.length / invoices.length) * 100)
        : 0,
    // Add counts for appointment display (completed+invoiced / total)
    totalAppointmentsCount,
    completedAndInvoicedCount,
  };

  // 9. Customer insights
  const uniqueCustomers = new Set(
    appointments.map((a) => a.customer?.toString())
  ).size;
  const repeatCustomers = appointments.reduce((acc, appt) => {
    acc[appt.customer?.toString()] = (acc[appt.customer?.toString()] || 0) + 1;
    return acc;
  }, {});
  const repeatCustomerCount = Object.values(repeatCustomers).filter(
    (count) => count > 1
  ).length;
  const customerRetentionRate =
    uniqueCustomers > 0
      ? Math.round((repeatCustomerCount / uniqueCustomers) * 100)
      : 0;

  sendSuccess(res, 200, "Analytics retrieved successfully", {
    stats: {
      ...stats,
      uniqueCustomers,
      customerRetentionRate,
    },
    charts: {
      appointmentsTrend: appointmentsTrendData,
      revenueTrend: revenueTrendData,
      serviceDistribution: serviceDistributionData,
      appointmentStatus: appointmentStatusData,
      technicianPerformance: technicianPerformanceData,
    },
    dateRange: {
      startDate,
      endDate,
    },
  });
});

// @desc    Get detailed report for export
// @route   GET /api/reports/detailed
// @access  Private (Admin only)
export const getDetailedReport = asyncHandler(async (req, res) => {
  const { startDate: startDateParam, endDate: endDateParam, format = "json" } = req.query;

  // Use provided dates or default to last 30 days
  let startDate, endDate;
  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
    // Set endDate to end of day
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Default to last 30 days if no dates provided
    endDate = new Date();
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
  }

  // Fetch all relevant data
  const appointments = await Appointment.find({
    createdAt: { $gte: startDate, $lte: endDate },
  })
    .populate("customer", "firstName lastName email")
    .populate("services.serviceId", "name category price")
    .populate("technician", "firstName lastName")
    .sort({ createdAt: -1 });

  const invoices = await Invoice.find({
    createdAt: { $gte: startDate, $lte: endDate },
  }).sort({ createdAt: -1 });

  const report = {
    dateRange: { startDate, endDate },
    generatedAt: new Date(),
    appointments: appointments.map((appt) => ({
      appointmentNumber: appt.appointmentNumber,
      customer: appt.customer?.firstName + " " + appt.customer?.lastName,
      date: appt.createdAt,
      status: appt.status,
      technician:
        appt.technician?.firstName + " " + appt.technician?.lastName,
      services: appt.services.map((s) => ({
        name: s.serviceId?.name,
        price: s.serviceId?.price,
      })),
      total: appt.services.reduce(
        (sum, s) => sum + (s.serviceId?.price || 0),
        0
      ),
    })),
    invoices: invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      amount: inv.totalAmount,
      paymentStatus: inv.paymentStatus,
      dueDate: inv.dueDate,
      createdAt: inv.createdAt,
    })),
  };

  if (format === "csv") {
    // Return CSV-friendly format
    res.set("Content-Type", "text/csv");
    res.set("Content-Disposition", `attachment; filename="report-${period}.csv"`);
    // CSV conversion would go here - for now return JSON
  }

  sendSuccess(res, 200, "Detailed report retrieved successfully", report);
});

// @desc    Get key performance indicators
// @route   GET /api/reports/kpi
// @access  Private (Admin only)
export const getKPI = asyncHandler(async (req, res) => {
  // Get last 12 months data
  const { startDate, endDate } = getDateRange("1year");

  const appointments = await Appointment.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $in: ['completed', 'invoiced'] }, // Both completed and invoiced generate revenue
  }).populate("services.serviceId", "price");

  const invoices = await Invoice.find({
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const users = await User.countDocuments({ isActive: true });
  const customers = await User.countDocuments({ role: 'customer', isActive: true });
  const vehicles = await Vehicle.countDocuments({ isActive: true });

  // Calculate KPIs using totalAmount field
  const totalRevenue = appointments.reduce((sum, appt) => {
    return sum + (appt.totalAmount || 0);
  }, 0);

  const kpis = {
    revenueKPI: {
      value: Math.round(totalRevenue * 100) / 100,
      unit: "VND",
    },
    appointmentKPI: {
      value: appointments.length,
      unit: "count",
    },
    customerKPI: {
      value: customers,
      unit: "count",
    },
    vehicleKPI: {
      value: vehicles,
      unit: "count",
    },
    invoiceCollectionRate: {
      value: invoices.filter((i) => i.paymentInfo?.status === "paid").length,
      total: invoices.length,
      percentage: invoices.length > 0
        ? Math.round((invoices.filter((i) => i.paymentInfo?.status === "paid").length / invoices.length) * 100)
        : 0,
      unit: "%",
    },
  };

  sendSuccess(res, 200, "KPI data retrieved successfully", kpis);
});
