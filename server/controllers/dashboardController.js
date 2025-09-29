import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import ServiceCenter from '../models/ServiceCenter.js';
import Service from '../models/Service.js';

// @desc    Get customer dashboard data
// @route   GET /api/dashboard/customer
// @access  Private (Customer only)
export const getCustomerDashboard = async (req, res) => {
  try {
    const customerId = req.user._id;

    // Get customer's vehicles
    const vehicles = await Vehicle.find({ 
      customerId, 
      isActive: true 
    }).populate('customerId', 'firstName lastName email phone');

    // Get customer's appointments
    const appointments = await Appointment.find({ 
      customerId 
    })
    .populate('services.serviceId', 'name category duration price')
    .populate('serviceCenterId', 'name')
    .populate('vehicleId', 'make model year')
    .sort({ scheduledDate: -1 })
    .limit(10);

    // Calculate stats
    const stats = {
      activeVehicles: vehicles.length,
      upcomingAppointments: appointments.filter(a => 
        ['pending', 'confirmed'].includes(a.status) && 
        new Date(a.scheduledDate) > new Date()
      ).length,
      completedServices: appointments.filter(a => a.status === 'completed').length,
      totalSpent: appointments
        .filter(a => a.status === 'completed')
        .reduce((total, appointment) => {
          const appointmentTotal = appointment.services.reduce((sum, service) => 
            sum + (service.serviceId?.price || 0), 0
          );
          return total + appointmentTotal;
        }, 0)
    };

    // Get vehicles with maintenance info
    const vehiclesWithMaintenance = vehicles.map(vehicle => ({
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
      images: vehicle.images
    }));

    // Get recent appointments with details
    const recentAppointments = appointments.slice(0, 5).map(appointment => ({
      _id: appointment._id,
      appointmentNumber: appointment.appointmentNumber,
      scheduledDate: appointment.scheduledDate,
      scheduledTime: appointment.scheduledTime,
      status: appointment.status,
      services: appointment.services.map(s => s.serviceId?.name).filter(Boolean),
      vehicle: `${appointment.vehicleId?.year} ${appointment.vehicleId?.make} ${appointment.vehicleId?.model}`,
      serviceCenter: appointment.serviceCenterId?.name,
      totalPrice: appointment.services.reduce((sum, service) => 
        sum + (service.serviceId?.price || 0), 0
      )
    }));

    res.json({
      success: true,
      data: {
        stats,
        vehicles: vehiclesWithMaintenance,
        recentAppointments
      }
    });
  } catch (error) {
    console.error('Customer dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer dashboard data'
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
      serviceCenterId: staffUser.serviceCenterId
    })
    .populate('customerId', 'firstName lastName email phone')
    .populate('vehicleId', 'make model year vin')
    .populate('services.serviceId', 'name category duration price')
    .populate('assignedTechnician', 'firstName lastName')
    .sort({ scheduledDate: -1 });

    // Get vehicles serviced at this center
    const vehicles = await Vehicle.find({ isActive: true })
      .populate('customerId', 'firstName lastName email phone');

    // Calculate stats for today and this week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const stats = {
      todayAppointments: appointments.filter(a => {
        const apptDate = new Date(a.scheduledDate);
        return apptDate >= today && apptDate < tomorrow;
      }).length,
      weeklyAppointments: appointments.filter(a => {
        const apptDate = new Date(a.scheduledDate);
        return apptDate >= thisWeekStart;
      }).length,
      pendingAppointments: appointments.filter(a => a.status === 'pending').length,
      completedToday: appointments.filter(a => {
        const apptDate = new Date(a.scheduledDate);
        return apptDate >= today && apptDate < tomorrow && a.status === 'completed';
      }).length
    };

    // Get today's schedule
    const todaysAppointments = appointments
      .filter(a => {
        const apptDate = new Date(a.scheduledDate);
        return apptDate >= today && apptDate < tomorrow;
      })
      .map(appointment => ({
        _id: appointment._id,
        appointmentNumber: appointment.appointmentNumber,
        scheduledTime: appointment.scheduledTime,
        status: appointment.status,
        customer: `${appointment.customerId?.firstName} ${appointment.customerId?.lastName}`,
        vehicle: `${appointment.vehicleId?.year} ${appointment.vehicleId?.make} ${appointment.vehicleId?.model}`,
        services: appointment.services.map(s => s.serviceId?.name).filter(Boolean),
        technician: appointment.assignedTechnician ? 
          `${appointment.assignedTechnician.firstName} ${appointment.assignedTechnician.lastName}` : 'Unassigned',
        estimatedDuration: appointment.services.reduce((total, service) => 
          total + (service.serviceId?.duration || 0), 0
        )
      }));

    res.json({
      success: true,
      data: {
        stats,
        todaysAppointments,
        totalVehicles: vehicles.length
      }
    });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching staff dashboard data'
    });
  }
};

// @desc    Get admin dashboard data
// @route   GET /api/dashboard/admin
// @access  Private (Admin only)
export const getAdminDashboard = async (req, res) => {
  try {
    // Get all service centers
    const serviceCenters = await ServiceCenter.find({ isActive: true })
      .populate('manager', 'firstName lastName');

    // Get all users
    const users = await User.countDocuments({ isActive: true });
    const customers = await User.countDocuments({ role: 'customer', isActive: true });
    const staff = await User.countDocuments({ role: 'staff', isActive: true });
    const technicians = await User.countDocuments({ role: 'technician', isActive: true });

    // Get all appointments
    const appointments = await Appointment.find()
      .populate('services.serviceId', 'name category price')
      .populate('serviceCenterId', 'name');

    // Get all vehicles
    const vehicles = await Vehicle.countDocuments({ isActive: true });

    // Calculate revenue and appointment stats by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentAppointments = appointments.filter(a => 
      new Date(a.createdAt) >= sixMonthsAgo
    );

    // Group by month for charts
    const monthlyData = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    recentAppointments.forEach(appointment => {
      const date = new Date(appointment.createdAt);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthName = monthNames[date.getMonth()];
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          appointments: 0,
          revenue: 0
        };
      }
      
      monthlyData[monthKey].appointments += 1;
      if (appointment.status === 'completed') {
        const appointmentRevenue = appointment.services.reduce((sum, service) => 
          sum + (service.serviceId?.price || 0), 0
        );
        monthlyData[monthKey].revenue += appointmentRevenue;
      }
    });

    const revenueData = Object.values(monthlyData).slice(-6);

    // Calculate service distribution
    const serviceDistribution = {};
    appointments.forEach(appointment => {
      appointment.services.forEach(service => {
        const category = service.serviceId?.category || 'Other';
        serviceDistribution[category] = (serviceDistribution[category] || 0) + 1;
      });
    });

    const serviceDistributionArray = Object.entries(serviceDistribution).map(([name, value]) => ({
      name,
      value,
      color: getRandomColor()
    }));

    // Calculate total revenue
    const totalRevenue = appointments
      .filter(a => a.status === 'completed')
      .reduce((total, appointment) => {
        const appointmentTotal = appointment.services.reduce((sum, service) => 
          sum + (service.serviceId?.price || 0), 0
        );
        return total + appointmentTotal;
      }, 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = appointments
      .filter(a => {
        const apptDate = new Date(a.createdAt);
        return apptDate.getMonth() === currentMonth && 
               apptDate.getFullYear() === currentYear &&
               a.status === 'completed';
      })
      .reduce((total, appointment) => {
        const appointmentTotal = appointment.services.reduce((sum, service) => 
          sum + (service.serviceId?.price || 0), 0
        );
        return total + appointmentTotal;
      }, 0);

    // Service center performance
    const serviceCenterPerformance = serviceCenters.map(center => {
      const centerAppointments = appointments.filter(a => 
        a.serviceCenterId?._id.toString() === center._id.toString()
      );
      
      const centerRevenue = centerAppointments
        .filter(a => a.status === 'completed')
        .reduce((total, appointment) => {
          const appointmentTotal = appointment.services.reduce((sum, service) => 
            sum + (service.serviceId?.price || 0), 0
          );
          return total + appointmentTotal;
        }, 0);

      const completedAppointments = centerAppointments.filter(a => a.status === 'completed');
      const efficiency = centerAppointments.length > 0 ? 
        Math.round((completedAppointments.length / centerAppointments.length) * 100) : 0;

      return {
        _id: center._id,
        name: center.name,
        location: `${center.address.city}, ${center.address.state}`,
        status: center.isActive ? 'active' : 'inactive',
        appointments: centerAppointments.length,
        revenue: centerRevenue,
        efficiency,
        manager: center.manager ? 
          `${center.manager.firstName} ${center.manager.lastName}` : 'No Manager'
      };
    });

    const stats = {
      serviceCenters: serviceCenters.length,
      totalUsers: users,
      totalRevenue,
      monthlyRevenue,
      totalVehicles: vehicles,
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter(a => a.status === 'completed').length,
      userBreakdown: {
        customers,
        staff,
        technicians
      }
    };

    res.json({
      success: true,
      data: {
        stats,
        revenueData,
        serviceDistribution: serviceDistributionArray,
        serviceCenterPerformance,
        recentActivity: appointments
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
          .map(appointment => ({
            _id: appointment._id,
            type: 'appointment',
            message: `New appointment scheduled`,
            time: appointment.createdAt,
            appointmentNumber: appointment.appointmentNumber
          }))
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin dashboard data'
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
      assignedTechnician: technicianId
    })
    .populate('customerId', 'firstName lastName phone')
    .populate('vehicleId', 'make model year vin')
    .populate('services.serviceId', 'name category duration')
    .populate('serviceCenterId', 'name')
    .sort({ scheduledDate: -1 });

    // Get today's assignments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysAssignments = assignments.filter(a => {
      const apptDate = new Date(a.scheduledDate);
      return apptDate >= today && apptDate < tomorrow;
    });

    const stats = {
      todaysJobs: todaysAssignments.length,
      inProgress: assignments.filter(a => a.status === 'in_progress').length,
      completedThisWeek: assignments.filter(a => {
        const apptDate = new Date(a.actualCompletion || a.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return apptDate >= weekAgo && a.status === 'completed';
      }).length,
      totalAssignments: assignments.length
    };

    // Format today's assignments
    const workQueue = todaysAssignments.map(appointment => ({
      _id: appointment._id,
      appointmentNumber: appointment.appointmentNumber,
      scheduledTime: appointment.scheduledTime,
      status: appointment.status,
      priority: appointment.priority || 'normal',
      customer: `${appointment.customerId?.firstName} ${appointment.customerId?.lastName}`,
      customerPhone: appointment.customerId?.phone,
      vehicle: `${appointment.vehicleId?.year} ${appointment.vehicleId?.make} ${appointment.vehicleId?.model}`,
      vin: appointment.vehicleId?.vin,
      services: appointment.services.map(s => ({
        name: s.serviceId?.name,
        category: s.serviceId?.category,
        duration: s.serviceId?.duration,
        status: s.status
      })),
      estimatedDuration: appointment.services.reduce((total, service) => 
        total + (service.serviceId?.duration || 0), 0
      ),
      serviceCenter: appointment.serviceCenterId?.name
    }));

    res.json({
      success: true,
      data: {
        stats,
        workQueue,
        allAssignments: assignments.slice(0, 20).map(appointment => ({
          _id: appointment._id,
          appointmentNumber: appointment.appointmentNumber,
          scheduledDate: appointment.scheduledDate,
          status: appointment.status,
          customer: `${appointment.customerId?.firstName} ${appointment.customerId?.lastName}`,
          vehicle: `${appointment.vehicleId?.make} ${appointment.vehicleId?.model}`,
          services: appointment.services.length
        }))
      }
    });
  } catch (error) {
    console.error('Technician dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching technician dashboard data'
    });
  }
};

// Helper function to generate random colors for charts
function getRandomColor() {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}