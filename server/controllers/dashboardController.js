import Vehicle from "../models/Vehicle.js";
import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import Service from "../models/Service.js";
import Invoice from "../models/Invoice.js";
import Part from "../models/Part.js";

// @desc    Get customer dashboard data
// @route   GET /api/dashboard/customer
// @access  Private (Customer only)
export const getCustomerDashboard = async (req, res) => {
  try {
    const customerId = req.user._id;

    // Get customer's vehicles
    const vehicles = await Vehicle.find({
      customerId,
      isActive: true,
    }).populate("customerId", "firstName lastName email phone");

    // Get customer's appointments
    const appointments = await Appointment.find({
      customerId,
    })
      .populate("services.serviceId", "name category duration price")
      // serviceCenterId populate removed - single center architecture
      .populate("vehicleId", "make model year")
      .sort({ scheduledDate: -1 })
      .limit(10);

    // Get invoices to calculate actual total spent (including parts and additional services)
    const invoices = await Invoice.find({
      customerId,
      status: { $in: ["paid", "sent", "approved"] }, // Only count finalized invoices
    });

    // Calculate stats
    const stats = {
      activeVehicles: vehicles.length,
      upcomingAppointments: appointments.filter(
        (a) =>
          ["pending", "confirmed"].includes(a.status) &&
          new Date(a.scheduledDate) > new Date()
      ).length,
      completedServices: appointments.filter((a) =>
        ["completed", "invoiced"].includes(a.status)
      ).length,
      totalSpent: invoices.reduce((total, invoice) => {
        // Use invoice totals which include services, parts, labor, and additional charges
        return total + (invoice.totals?.totalAmount || 0);
      }, 0),
    };

    // Get vehicles with maintenance info
    const vehiclesWithMaintenance = vehicles.map((vehicle) => ({
      _id: vehicle._id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin,
      mileage: vehicle.mileage,
      batteryCapacity: vehicle.batteryCapacity,
      range: vehicle.range,
      maxChargingPower: vehicle.maxChargingPower,
      isMaintenanceDue: vehicle.isMaintenanceDue,
      nextMaintenanceDate: vehicle.nextMaintenanceDate,
      images: vehicle.images,
    }));

    // Get recent appointments with details
    const recentAppointments = appointments.slice(0, 5).map((appointment) => ({
      _id: appointment._id,
      appointmentNumber: appointment.appointmentNumber,
      scheduledDate: appointment.scheduledDate,
      scheduledTime: appointment.scheduledTime,
      status: appointment.status,
      services: appointment.services
        .map((s) => s.serviceId?.name)
        .filter(Boolean),
      vehicle: `${appointment.vehicleId?.year} ${appointment.vehicleId?.make} ${appointment.vehicleId?.model}`,
      serviceCenter: "EV Service Center", // Single center architecture
      totalPrice: appointment.totalAmount || 0, // Use totalAmount which includes services + parts
    }));

    res.json({
      success: true,
      data: {
        stats,
        vehicles: vehiclesWithMaintenance,
        recentAppointments,
      },
    });
  } catch (error) {
    console.error("Customer dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customer dashboard data",
    });
  }
};

// @desc    Get staff dashboard data
// @route   GET /api/dashboard/staff
// @access  Private (Staff only)
export const getStaffDashboard = async (req, res) => {
  try {
    const staffUser = req.user;

    // Get appointments for staff's service center
    const appointments = await Appointment.find({
      // serviceCenterId removed - single center architecture
    })
      .populate("customerId", "firstName lastName email phone")
      .populate("vehicleId", "make model year vin")
      .populate("services.serviceId", "name category duration price")
      .populate("assignedTechnician", "firstName lastName")
      .sort({ scheduledDate: -1 });

    // Get vehicles serviced at this center
    const vehicles = await Vehicle.find({ isActive: true }).populate(
      "customerId",
      "firstName lastName email phone"
    );

    // Calculate stats for today and this week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const stats = {
      todayAppointments: appointments.filter((a) => {
        const apptDate = new Date(a.scheduledDate);
        return apptDate >= today && apptDate < tomorrow;
      }).length,
      weeklyAppointments: appointments.filter((a) => {
        const apptDate = new Date(a.scheduledDate);
        return apptDate >= thisWeekStart;
      }).length,
      pendingAppointments: appointments.filter((a) => a.status === "pending")
        .length,
      completedToday: appointments.filter((a) => {
        const apptDate = new Date(a.scheduledDate);
        return (
          apptDate >= today && apptDate < tomorrow && a.status === "completed"
        );
      }).length,
    };

    // Get today's schedule
    const todaysAppointments = appointments
      .filter((a) => {
        const apptDate = new Date(a.scheduledDate);
        return apptDate >= today && apptDate < tomorrow;
      })
      .map((appointment) => ({
        _id: appointment._id,
        appointmentNumber: appointment.appointmentNumber,
        scheduledTime: appointment.scheduledTime,
        status: appointment.status,
        customer: `${appointment.customerId?.firstName} ${appointment.customerId?.lastName}`,
        vehicle: `${appointment.vehicleId?.year} ${appointment.vehicleId?.make} ${appointment.vehicleId?.model}`,
        services: appointment.services
          .map((s) => s.serviceId?.name)
          .filter(Boolean),
        technician: appointment.assignedTechnician
          ? `${appointment.assignedTechnician.firstName} ${appointment.assignedTechnician.lastName}`
          : "Unassigned",
        estimatedDuration: appointment.services.reduce(
          (total, service) => total + (service.serviceId?.duration || 0),
          0
        ),
      }));

    res.json({
      success: true,
      data: {
        stats,
        todaysAppointments,
        totalVehicles: vehicles.length,
      },
    });
  } catch (error) {
    console.error("Staff dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching staff dashboard data",
    });
  }
};

// @desc    Get admin dashboard data
// @route   GET /api/dashboard/admin
// @access  Private (Admin only)
export const getAdminDashboard = async (req, res) => {
  try {
    // Single center architecture - use default service center data
    const serviceCenters = [
      {
        _id: "single-center",
        name: "EV Service Center",
        address: {
          city: "Ho Chi Minh City",
          state: "Vietnam"
        },
        isActive: true,
        manager: { firstName: "Admin", lastName: "Manager" },
      },
    ];

    // Get all users
    const users = await User.countDocuments({ isActive: true });
    const customers = await User.countDocuments({
      role: "customer",
      isActive: true,
    });
    const staff = await User.countDocuments({ role: "staff", isActive: true });
    const technicians = await User.countDocuments({
      role: "technician",
      isActive: true,
    });

    // Get all appointments
    const appointments = await Appointment.find().populate(
      "services.serviceId",
      "name category price"
    );
    // serviceCenterId populate removed - single center architecture;

    // Get all vehicles
    const vehicles = await Vehicle.countDocuments({ isActive: true });

    // Calculate revenue and appointment stats by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentAppointments = appointments.filter(
      (a) => new Date(a.createdAt) >= sixMonthsAgo
    );

    // Group by month for charts
    const monthlyData = {};
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

    recentAppointments.forEach((appointment) => {
      const date = new Date(appointment.createdAt);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthName = monthNames[date.getMonth()];

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          appointments: 0,
          revenue: 0,
        };
      }

      monthlyData[monthKey].appointments += 1;
      if (appointment.status === "completed") {
        const appointmentRevenue = appointment.services.reduce(
          (sum, service) => sum + (service.serviceId?.price || 0),
          0
        );
        monthlyData[monthKey].revenue += appointmentRevenue;
      }
    });

    const revenueData = Object.values(monthlyData).slice(-6);

    // Calculate service distribution
    const serviceDistribution = {};
    appointments.forEach((appointment) => {
      appointment.services.forEach((service) => {
        const category = service.serviceId?.category || "Other";
        serviceDistribution[category] =
          (serviceDistribution[category] || 0) + 1;
      });
    });

    const serviceDistributionArray = Object.entries(serviceDistribution).map(
      ([name, value]) => ({
        name,
        value,
        color: getRandomColor(),
      })
    );

    // Calculate total revenue from invoices
    const allInvoices = await Invoice.find({});
    const totalRevenue = allInvoices.reduce((total, invoice) => {
      return total + (invoice.totals?.totalAmount || 0);
    }, 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = allInvoices
      .filter((invoice) => {
        const invoiceDate = new Date(invoice.createdAt);
        return (
          invoiceDate.getMonth() === currentMonth &&
          invoiceDate.getFullYear() === currentYear
        );
      })
      .reduce((total, invoice) => {
        return total + (invoice.totals?.totalAmount || 0);
      }, 0);

    // Service center performance
    const serviceCenterPerformance = serviceCenters.map((center) => {
      const centerAppointments = appointments.filter(
        (a) => true // Single center architecture - all appointments belong to same center
      );

      // Calculate revenue from all invoices (single center)
      const centerRevenue = allInvoices.reduce((total, invoice) => {
        return total + (invoice.totals?.totalAmount || 0);
      }, 0);

      const completedAppointments = centerAppointments.filter(
        (a) => a.coreStatus === "Closed"
      );
      const efficiency =
        centerAppointments.length > 0
          ? Math.round(
              (completedAppointments.length / centerAppointments.length) * 100
            )
          : 0;

      return {
        _id: center._id,
        name: center.name,
        location: `${center.address.city}, ${center.address.state}`,
        status: center.isActive ? "active" : "inactive",
        appointments: centerAppointments.length,
        revenue: centerRevenue,
        efficiency,
        manager: center.manager
          ? `${center.manager.firstName} ${center.manager.lastName}`
          : "No Manager",
      };
    });

    const stats = {
      serviceCenters: serviceCenters.length,
      totalUsers: users,
      totalRevenue,
      monthlyRevenue,
      totalVehicles: vehicles,
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter(
        (a) => a.status === "completed"
      ).length,
      userBreakdown: {
        customers,
        staff,
        technicians,
      },
    };

    // Calculate Top 10 data
    // Top 10 Customers by revenue (using correct nested field path)
    const topCustomers = await Invoice.aggregate([
      { $match: { 'totals.totalAmount': { $gt: 0 } } }, // Match invoices with amount > 0
      {
        $group: {
          _id: '$customerId',
          totalSpent: { $sum: '$totals.totalAmount' }, // Correct path: totals.totalAmount
          appointmentCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $project: {
          _id: 1,
          name: { $concat: ['$customer.firstName', ' ', '$customer.lastName'] },
          email: '$customer.email',
          totalSpent: 1,
          appointmentCount: 1
        }
      }
    ]).catch(() => []); // Return empty array on error

    // Top 10 Services by booking count (include all statuses except cancelled)
    const topServices = await Appointment.aggregate([
      { $match: { coreStatus: { $in: ['Scheduled', 'CheckedIn', 'InService', 'ReadyForPickup', 'Closed'] } } },
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services.serviceId',
          bookingCount: { $sum: 1 },
          revenue: { $sum: '$services.price' }
        }
      },
      { $sort: { bookingCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'service'
        }
      },
      { $unwind: '$service' },
      {
        $project: {
          _id: 1,
          name: '$service.name',
          category: '$service.category',
          bookingCount: 1,
          revenue: 1
        }
      }
    ]).catch(() => []); // Return empty array on error

    // Top 10 Parts by usage (totalUsed from inventory)
    let topParts = [];
    try {
      const parts = await Part.find({ isActive: true })
        .select('partNumber name category pricing inventory')
        .sort({ 'inventory.usedStock': -1 })
        .limit(10)
        .lean();
      
      topParts = parts.map((part) => ({
        _id: part._id,
        partNumber: part.partNumber,
        name: part.name,
        category: part.category,
        usedStock: part.inventory?.usedStock || 0,
        currentStock: part.inventory?.currentStock || 0,
        retailPrice: part.pricing?.retail || 0
      }));
    } catch (error) {
      console.error('Error fetching top parts:', error);
      topParts = [];
    }

    // Top 10 Vehicles by service count (include all statuses)
    const topVehicles = await Appointment.aggregate([
      { $match: { coreStatus: { $in: ['Scheduled', 'CheckedIn', 'InService', 'ReadyForPickup', 'Closed'] } } },
      {
        $group: {
          _id: '$vehicleId',
          serviceCount: { $sum: 1 },
          lastService: { $max: '$scheduledDate' }
        }
      },
      { $sort: { serviceCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'vehicles',
          localField: '_id',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      { $unwind: '$vehicle' },
      {
        $lookup: {
          from: 'users',
          localField: 'vehicle.customerId',
          foreignField: '_id',
          as: 'owner'
        }
      },
      { $unwind: '$owner' },
      {
        $project: {
          _id: 1,
          vehicleInfo: {
            $concat: [
              '$vehicle.make',
              ' ',
              '$vehicle.model',
              ' (',
              { $toString: '$vehicle.year' },
              ')'
            ]
          },
          owner: { $concat: ['$owner.firstName', ' ', '$owner.lastName'] },
          serviceCount: 1,
          lastService: 1
        }
      }
    ]).catch(() => []); // Return empty array on error

    const top10 = {
      customers: topCustomers,
      services: topServices,
      vehicles: topVehicles,
      parts: topParts
    };

    res.json({
      success: true,
      data: {
        stats,
        revenueData,
        serviceDistribution: serviceDistributionArray,
        serviceCenterPerformance,
        top10,
        recentActivity: appointments
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
          .map((appointment) => ({
            _id: appointment._id,
            type: "appointment",
            message: `New appointment scheduled`,
            time: appointment.createdAt,
            appointmentNumber: appointment.appointmentNumber,
          })),
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admin dashboard data",
    });
  }
};

// @desc    Get technician dashboard data
// @route   GET /api/dashboard/technician
// @access  Private (Technician only)
export const getTechnicianDashboard = async (req, res) => {
  try {
    const technicianId = req.user._id;

    // Get appointments assigned to this technician
    const assignments = await Appointment.find({
      assignedTechnician: technicianId,
    })
      .populate("customerId", "firstName lastName phone")
      .populate("vehicleId", "make model year vin")
      .populate("services.serviceId", "name category duration")
      // serviceCenterId populate removed - single center architecture
      .sort({ scheduledDate: -1 });

    // Get today's assignments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysAssignments = assignments.filter((a) => {
      const apptDate = new Date(a.scheduledDate);
      return apptDate >= today && apptDate < tomorrow;
    });

    const stats = {
      todaysJobs: todaysAssignments.length,
      inProgress: assignments.filter((a) => a.status === "in_progress").length,
      completedThisWeek: assignments.filter((a) => {
        const apptDate = new Date(a.actualCompletion || a.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return apptDate >= weekAgo && a.status === "completed";
      }).length,
      totalAssignments: assignments.length,
    };

    // Format today's assignments
    const workQueue = todaysAssignments.map((appointment) => ({
      _id: appointment._id,
      appointmentNumber: appointment.appointmentNumber,
      scheduledTime: appointment.scheduledTime,
      status: appointment.status,
      priority: appointment.priority || "normal",
      customer: `${appointment.customerId?.firstName} ${appointment.customerId?.lastName}`,
      customerPhone: appointment.customerId?.phone,
      vehicle: `${appointment.vehicleId?.year} ${appointment.vehicleId?.make} ${appointment.vehicleId?.model}`,
      vin: appointment.vehicleId?.vin,
      services: appointment.services.map((s) => ({
        name: s.serviceId?.name,
        category: s.serviceId?.category,
        duration: s.serviceId?.duration,
        status: s.status,
      })),
      estimatedDuration: appointment.services.reduce(
        (total, service) => total + (service.serviceId?.duration || 0),
        0
      ),
      serviceCenter: "EV Service Center", // Single center architecture
    }));

    res.json({
      success: true,
      data: {
        stats,
        workQueue,
        allAssignments: assignments.slice(0, 20).map((appointment) => ({
          _id: appointment._id,
          appointmentNumber: appointment.appointmentNumber,
          scheduledDate: appointment.scheduledDate,
          status: appointment.status,
          customer: `${appointment.customerId?.firstName} ${appointment.customerId?.lastName}`,
          vehicle: `${appointment.vehicleId?.make} ${appointment.vehicleId?.model}`,
          services: appointment.services.length,
        })),
      },
    });
  } catch (error) {
    console.error("Technician dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching technician dashboard data",
    });
  }
};

// @desc    Get detail data for dashboard modals
// @route   GET /api/dashboard/details/:type
// @access  Private (Admin only)
export const getDashboardDetails = async (req, res) => {
  try {
    const { type } = req.params;
    let data;

    switch (type) {
      case 'users':
        data = await User.find()
          .select('firstName lastName email role createdAt')
          .sort({ createdAt: -1 })
          .limit(100);
        break;

      case 'customers':
        // Only customers, not all users
        data = await User.find({ role: 'customer' })
          .select('firstName lastName email role createdAt')
          .sort({ createdAt: -1 })
          .limit(100);
        break;

      case 'revenue':
        // Get COMPLETED and INVOICED appointments (both generate revenue)
        data = await Appointment.find({ status: { $in: ['completed', 'invoiced'] } })
          .populate('customerId', 'firstName lastName')
          .select('appointmentNumber customerId totalAmount status createdAt')
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();

        // Transform to match expected format
        data = data.map(apt => ({
          _id: apt._id,
          appointmentNumber: apt.appointmentNumber,
          customer: {
            firstName: apt.customerId?.firstName || 'N/A',
            lastName: apt.customerId?.lastName || ''
          },
          totalAmount: apt.totalAmount || 0,
          status: apt.status,
          createdAt: apt.createdAt
        }));
        break;

      case 'invoices':
        // Get all invoices with their totals
        data = await Invoice.find()
          .populate('customerId', 'firstName lastName')
          .populate('appointmentId', 'appointmentNumber')
          .select('invoiceNumber appointmentId customerId totals status createdAt')
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();

        // Transform to match expected format
        data = data.map(invoice => ({
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          appointmentNumber: invoice.appointmentId?.appointmentNumber || 'N/A',
          customer: {
            firstName: invoice.customerId?.firstName || 'N/A',
            lastName: invoice.customerId?.lastName || ''
          },
          totalAmount: invoice.totals?.totalAmount || 0,
          status: invoice.status,
          createdAt: invoice.createdAt
        }));
        break;

      case 'vehicles':
        data = await Vehicle.find({ isActive: true })
          .populate('customerId', 'firstName lastName')
          .select('make model licensePlate customerId createdAt')
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();

        // Transform to match expected format
        data = data.map(vehicle => ({
          _id: vehicle._id,
          make: vehicle.make,
          model: vehicle.model,
          licensePlate: vehicle.licensePlate,
          owner: {
            firstName: vehicle.customerId?.firstName || 'N/A',
            lastName: vehicle.customerId?.lastName || ''
          },
          createdAt: vehicle.createdAt
        }));
        break;

      case 'appointments':
        data = await Appointment.find()
          .populate('customerId', 'firstName lastName')
          .populate('vehicleId', 'make model')
          .select('appointmentNumber customerId vehicleId coreStatus scheduledDate')
          .sort({ scheduledDate: -1 })
          .limit(100)
          .lean();

        // Transform to match expected format
        data = data.map(apt => ({
          _id: apt._id,
          appointmentNumber: apt.appointmentNumber,
          customer: {
            firstName: apt.customerId?.firstName || 'N/A',
            lastName: apt.customerId?.lastName || ''
          },
          vehicle: {
            make: apt.vehicleId?.make || 'N/A',
            model: apt.vehicleId?.model || ''
          },
          status: apt.coreStatus,
          scheduledDate: apt.scheduledDate
        }));
        break;

      case 'parts':
        // Get all parts ordered by inventory
        data = await Part.find({ isActive: true })
          .select('partNumber name category inventory pricing createdAt')
          .sort({ 'inventory.currentStock': -1 })
          .limit(100)
          .lean();

        // Transform to match expected format
        data = data.map(part => ({
          _id: part._id,
          partNumber: part.partNumber,
          name: part.name,
          category: part.category,
          currentStock: part.inventory?.currentStock || 0,
          usedStock: part.inventory?.usedStock || 0,
          retailPrice: part.pricing?.retail || 0,
          createdAt: part.createdAt
        }));
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid detail type'
        });
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching dashboard details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard details'
    });
  }
};;

// Helper function to generate random colors for charts
function getRandomColor() {
  const colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EF4444",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#EC4899",
    "#6366F1",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
