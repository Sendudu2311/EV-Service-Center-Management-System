import ServiceCenter from '../models/ServiceCenter.js';
import Service from '../models/Service.js';

// @desc    Get all service centers
// @route   GET /api/service-centers
// @access  Public
export const getServiceCenters = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      city, 
      services,
      lat, 
      lng, 
      radius = 50 // radius in km
    } = req.query;

    const skip = (page - 1) * limit;
    let filter = { isActive: true };

    // Text search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } }
      ];
    }

    // City filter
    if (city) {
      filter['address.city'] = { $regex: city, $options: 'i' };
    }

    // Services filter
    if (services) {
      const serviceIds = services.split(',');
      filter.services = { $in: serviceIds };
    }

    let query = ServiceCenter.find(filter);

    // Geospatial search
    if (lat && lng) {
      const coordinates = [parseFloat(lng), parseFloat(lat)];
      query = ServiceCenter.find({
        ...filter,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            $maxDistance: radius * 1000 // Convert km to meters
          }
        }
      });
    }

    const serviceCenters = await query
      .populate('services', 'name category')
      .populate('manager', 'firstName lastName email phone')
      .select('-__v')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ServiceCenter.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: serviceCenters.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: serviceCenters
    });
  } catch (error) {
    console.error('Error fetching service centers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service centers'
    });
  }
};

// @desc    Get single service center
// @route   GET /api/service-centers/:id
// @access  Public
export const getServiceCenter = async (req, res) => {
  try {
    const serviceCenter = await ServiceCenter.findOne({
      _id: req.params.id,
      isActive: true
    })
      .populate('services', 'name category description basePrice estimatedDuration')
      .populate('manager', 'firstName lastName email phone');

    if (!serviceCenter) {
      return res.status(404).json({
        success: false,
        message: 'Service center not found'
      });
    }

    res.status(200).json({
      success: true,
      data: serviceCenter
    });
  } catch (error) {
    console.error('Error fetching service center:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service center'
    });
  }
};

// @desc    Get services offered by a service center
// @route   GET /api/service-centers/:id/services
// @access  Public
export const getServiceCenterServices = async (req, res) => {
  try {
    const { category } = req.query;

    const serviceCenter = await ServiceCenter.findOne({
      _id: req.params.id,
      isActive: true
    }).populate({
      path: 'services',
      match: category ? { category: category, isActive: true } : { isActive: true },
      select: 'name category description basePrice estimatedDuration skillLevel tags'
    });

    if (!serviceCenter) {
      return res.status(404).json({
        success: false,
        message: 'Service center not found'
      });
    }

    // Group services by category
    const servicesByCategory = serviceCenter.services.reduce((acc, service) => {
      const cat = service.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(service);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        serviceCenter: {
          _id: serviceCenter._id,
          name: serviceCenter.name,
          address: serviceCenter.address
        },
        services: serviceCenter.services,
        servicesByCategory
      }
    });
  } catch (error) {
    console.error('Error fetching service center services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching services'
    });
  }
};

// @desc    Get service center availability
// @route   GET /api/service-centers/:id/availability
// @access  Private
export const getServiceCenterAvailability = async (req, res) => {
  try {
    const { date, duration = 60 } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const serviceCenter = await ServiceCenter.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!serviceCenter) {
      return res.status(404).json({
        success: false,
        message: 'Service center not found'
      });
    }

    // Get working hours for the requested date
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const workingHours = serviceCenter.workingHours[dayOfWeek];

    if (!workingHours || !workingHours.isOpen) {
      return res.status(200).json({
        success: true,
        data: {
          isOpen: false,
          availableSlots: [],
          workingHours: null
        }
      });
    }

    // Import Appointment model to avoid circular dependency
    const { default: Appointment } = await import('../models/Appointment.js');

    // Get existing appointments for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await Appointment.find({
      serviceCenterId: req.params.id,
      scheduledDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['pending', 'confirmed', 'in_progress'] }
    }).select('scheduledTime estimatedCompletion services');

    // Calculate total estimated duration for each appointment
    const appointmentsWithDuration = existingAppointments.map(apt => {
      const totalDuration = apt.services.reduce((total, service) => {
        return total + (service.estimatedDuration * (service.quantity || 1));
      }, 0);
      return {
        ...apt.toObject(),
        totalDuration
      };
    });

    // Generate available time slots
    const availableSlots = generateAvailabilitySlots(
      workingHours.open,
      workingHours.close,
      duration,
      appointmentsWithDuration,
      serviceCenter.capacity.totalBays
    );

    res.status(200).json({
      success: true,
      data: {
        isOpen: true,
        workingHours,
        availableSlots,
        capacity: serviceCenter.capacity,
        currentBookings: existingAppointments.length
      }
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching availability'
    });
  }
};

// @desc    Get nearby service centers
// @route   GET /api/service-centers/nearby
// @access  Public
export const getNearbyServiceCenters = async (req, res) => {
  try {
    const { lat, lng, radius = 50, limit = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const coordinates = [parseFloat(lng), parseFloat(lat)];

    const serviceCenters = await ServiceCenter.find({
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    })
      .populate('services', 'name category')
      .select('name address contact workingHours location capacity amenities -_id')
      .limit(parseInt(limit));

    // Calculate distances
    const serviceCentersWithDistance = serviceCenters.map(center => {
      const distance = calculateDistance(
        lat, lng,
        center.location.coordinates[1], // latitude
        center.location.coordinates[0]  // longitude
      );

      return {
        ...center.toObject(),
        distance: Math.round(distance * 10) / 10 // Round to 1 decimal place
      };
    });

    res.status(200).json({
      success: true,
      count: serviceCentersWithDistance.length,
      data: serviceCentersWithDistance
    });
  } catch (error) {
    console.error('Error fetching nearby service centers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby service centers'
    });
  }
};

// @desc    Create service center (Admin only)
// @route   POST /api/service-centers
// @access  Private (Admin)
export const createServiceCenter = async (req, res) => {
  try {
    const serviceCenter = await ServiceCenter.create({
      ...req.body,
      manager: req.body.managerId || req.user._id
    });

    const populatedServiceCenter = await ServiceCenter.findById(serviceCenter._id)
      .populate('manager', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Service center created successfully',
      data: populatedServiceCenter
    });
  } catch (error) {
    console.error('Error creating service center:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Service center with this code already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating service center'
    });
  }
};

// @desc    Update service center
// @route   PUT /api/service-centers/:id
// @access  Private (Admin)
export const updateServiceCenter = async (req, res) => {
  try {
    const serviceCenter = await ServiceCenter.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('manager', 'firstName lastName email');

    if (!serviceCenter) {
      return res.status(404).json({
        success: false,
        message: 'Service center not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service center updated successfully',
      data: serviceCenter
    });
  } catch (error) {
    console.error('Error updating service center:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating service center'
    });
  }
};

// @desc    Get service center statistics
// @route   GET /api/service-centers/:id/stats
// @access  Private (Staff, Admin)
export const getServiceCenterStats = async (req, res) => {
  try {
    // Import models to avoid circular dependency
    const { default: Appointment } = await import('../models/Appointment.js');
    const { default: User } = await import('../models/User.js');

    const serviceCenter = await ServiceCenter.findById(req.params.id);
    if (!serviceCenter) {
      return res.status(404).json({
        success: false,
        message: 'Service center not found'
      });
    }

    // Get date ranges
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

    // Get statistics
    const [
      totalAppointments,
      monthlyAppointments,
      weeklyAppointments,
      completedAppointments,
      staffCount,
      technicianCount
    ] = await Promise.all([
      Appointment.countDocuments({ serviceCenterId: req.params.id }),
      Appointment.countDocuments({ 
        serviceCenterId: req.params.id,
        createdAt: { $gte: startOfMonth }
      }),
      Appointment.countDocuments({ 
        serviceCenterId: req.params.id,
        createdAt: { $gte: startOfWeek }
      }),
      Appointment.countDocuments({ 
        serviceCenterId: req.params.id,
        status: 'completed'
      }),
      User.countDocuments({ 
        serviceCenterId: req.params.id,
        role: 'staff',
        isActive: true
      }),
      User.countDocuments({ 
        serviceCenterId: req.params.id,
        role: 'technician',
        isActive: true
      })
    ]);

    const stats = {
      appointments: {
        total: totalAppointments,
        monthly: monthlyAppointments,
        weekly: weeklyAppointments,
        completed: completedAppointments,
        completionRate: totalAppointments > 0 ? 
          Math.round((completedAppointments / totalAppointments) * 100) : 0
      },
      staff: {
        total: staffCount + technicianCount,
        staff: staffCount,
        technicians: technicianCount
      },
      capacity: serviceCenter.capacity
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching service center stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
};

// @desc    Get technicians for a service center
// @route   GET /api/service-centers/:id/technicians
// @access  Public
export const getServiceCenterTechnicians = async (req, res) => {
  try {
    const { id } = req.params;
    const { availability, specialization } = req.query;

    // Import models to avoid circular dependency
    const { default: User } = await import('../models/User.js');
    const { default: TechnicianProfile } = await import('../models/TechnicianProfile.js');

    // Verify service center exists
    const serviceCenter = await ServiceCenter.findById(id);
    if (!serviceCenter) {
      return res.status(404).json({
        success: false,
        message: 'Service center not found'
      });
    }

    // Get technicians for this service center
    const technicians = await User.find({
      role: 'technician',
      serviceCenterId: id,
      isActive: true
    }).select('_id firstName lastName specializations');

    if (technicians.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // Get technician profiles with public information
    let filter = {
      technicianId: { $in: technicians.map(t => t._id) },
      isActive: true
    };

    // Filter by availability if specified
    if (availability) {
      filter['availability.status'] = availability;
    }

    const profiles = await TechnicianProfile.find(filter)
      .populate('technicianId', 'firstName lastName specializations phone')
      .select('technicianId skillMatrix performance availability workload statistics')
      .lean();

    // Filter by specialization if specified
    let filteredProfiles = profiles;
    if (specialization) {
      filteredProfiles = profiles.filter(profile => 
        profile.skillMatrix.some(skill => 
          skill.serviceCategory === specialization && skill.proficiencyLevel >= 3
        )
      );
    }

    // Format response with customer-friendly information
    const techniciansData = filteredProfiles.map(profile => ({
      id: profile.technicianId._id,
      name: `${profile.technicianId.firstName} ${profile.technicianId.lastName}`,
      specializations: profile.technicianId.specializations || [],
      availability: {
        status: profile.availability.status,
        workloadPercentage: Math.round((profile.workload.current / profile.workload.capacity) * 100)
      },
      performance: {
        customerRating: profile.performance.customerRating || 0,
        completedJobs: profile.performance.completedJobs || 0,
        efficiency: profile.performance.efficiency || 0
      },
      skills: profile.skillMatrix.map(skill => ({
        category: skill.serviceCategory,
        level: skill.proficiencyLevel,
        certified: skill.certifiedAt ? true : false
      })),
      isRecommended: profile.performance.customerRating >= 4.5 && profile.performance.efficiency >= 85,
      yearsExperience: profile.statistics?.totalWorkingDays ? Math.round(profile.statistics.totalWorkingDays / 365 * 10) / 10 : 0
    }));

    // Sort by recommendation, then by customer rating
    techniciansData.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return b.performance.customerRating - a.performance.customerRating;
    });

    res.status(200).json({
      success: true,
      count: techniciansData.length,
      data: techniciansData
    });
  } catch (error) {
    console.error('Error fetching service center technicians:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching technicians'
    });
  }
};

// Helper function to generate available time slots
function generateAvailabilitySlots(openTime, closeTime, duration, existingAppointments, totalBays) {
  const slots = [];
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);

  const startTime = openHour * 60 + openMinute; // Convert to minutes
  const endTime = closeHour * 60 + closeMinute;

  // Generate 30-minute slots
  for (let time = startTime; time <= endTime - duration; time += 30) {
    const hour = Math.floor(time / 60);
    const minute = time % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // Check availability for this slot
    const slotStart = time;
    const slotEnd = time + parseInt(duration);
    
    const conflicts = existingAppointments.filter(apt => {
      const aptTime = apt.scheduledTime.split(':').map(Number);
      const aptStart = aptTime[0] * 60 + aptTime[1];
      const aptEnd = aptStart + (apt.totalDuration || 60);
      
      return (slotStart < aptEnd && slotEnd > aptStart);
    });

    const available = Math.max(0, totalBays - conflicts.length);
    
    if (available > 0) {
      slots.push({
        time: timeString,
        available: available,
        total: totalBays
      });
    }
  }

  return slots;
}

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}