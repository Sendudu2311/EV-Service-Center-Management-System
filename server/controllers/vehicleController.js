import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';

// @desc    Get vehicles based on user role
// @route   GET /api/vehicles
// @access  Private (All authenticated users)
export const getVehicles = async (req, res) => {
  try {
    let filter = { isActive: true };
    
    // Check for customerId query parameter first (for getting specific customer's vehicles)
    if (req.query.customerId) {
      filter.customerId = req.query.customerId;
    } else {
      // Role-based filtering when no specific customerId is requested
      if (req.user.role === 'customer') {
        // Customers only see their own vehicles
        filter.customerId = req.user._id;
      } else if (req.user.role === 'staff') {
        // Staff can see all vehicles from their service center's customers
        // For now, show all vehicles (can be refined later with customer-service center relationship)
      } else if (req.user.role === 'admin') {
        // Admin can see all vehicles (no additional filter needed)
      } else if (req.user.role === 'technician') {
        // Technicians can see vehicles they are working on (for now, show all)
      }
    }
    
    const vehicles = await Vehicle.find(filter)
      .populate('customerId', 'firstName lastName email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicles'
    });
  }
};;

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
// @access  Private (Role-based access)
export const getVehicle = async (req, res) => {
  try {
    let filter = { _id: req.params.id, isActive: true };
    
    // Role-based access control
    if (req.user.role === 'customer') {
      // Customers can only access their own vehicles
      filter.customerId = req.user._id;
    }
    // Staff, admin, and technicians can access any vehicle (no additional filter)
    
    const vehicle = await Vehicle.findOne(filter)
      .populate('customerId', 'firstName lastName email phone');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicle'
    });
  }
};

// @desc    Create new vehicle
// @route   POST /api/vehicles
// @access  Private (Customer)
export const createVehicle = async (req, res) => {
  try {
    const {
      vin,
      make,
      model,
      year,
      color,
      batteryType,
      batteryCapacity,
      maxChargingPower,
      range,
      purchaseDate,
      mileage,
      maintenanceInterval,
      timeBasedInterval,
      warrantyExpiry
    } = req.body;

    // Check if VIN already exists
    const existingVehicle = await Vehicle.findOne({ vin: vin.toUpperCase() });
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle with this VIN already exists'
      });
    }

    // Create vehicle
    const vehicle = await Vehicle.create({
      customerId: req.user._id,
      vin: vin.toUpperCase(),
      make,
      model,
      year,
      color,
      batteryType,
      batteryCapacity,
      maxChargingPower,
      range,
      purchaseDate,
      mileage: mileage || 0,
      maintenanceInterval: maintenanceInterval || 10000,
      timeBasedInterval: timeBasedInterval || 6,
      warrantyExpiry
    });

    // Calculate next maintenance date
    vehicle.calculateNextMaintenance();
    await vehicle.save();

    res.status(201).json({
      success: true,
      message: 'Vehicle registered successfully',
      data: vehicle
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating vehicle'
    });
  }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (Customer - own vehicle only)
export const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      customerId: req.user._id,
      isActive: true
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const {
      make,
      model,
      year,
      color,
      batteryType,
      batteryCapacity,
      maxChargingPower,
      range,
      purchaseDate,
      mileage,
      maintenanceInterval,
      timeBasedInterval,
      warrantyExpiry
    } = req.body;

    // Update fields
    const updatedFields = {
      make,
      model,
      year,
      color,
      batteryType,
      batteryCapacity,
      maxChargingPower,
      range,
      purchaseDate,
      mileage,
      maintenanceInterval,
      timeBasedInterval,
      warrantyExpiry
    };

    // Remove undefined fields
    Object.keys(updatedFields).forEach(key => {
      if (updatedFields[key] === undefined) {
        delete updatedFields[key];
      }
    });

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      {
        new: true,
        runValidators: true
      }
    );

    // Recalculate next maintenance if relevant fields changed
    if (mileage !== undefined || maintenanceInterval !== undefined || timeBasedInterval !== undefined) {
      updatedVehicle.calculateNextMaintenance();
      await updatedVehicle.save();
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: updatedVehicle
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating vehicle'
    });
  }
};

// @desc    Delete vehicle (soft delete)
// @route   DELETE /api/vehicles/:id
// @access  Private (Customer - own vehicle only)
export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      customerId: req.user._id,
      isActive: true
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Soft delete
    vehicle.isActive = false;
    await vehicle.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle removed successfully'
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing vehicle'
    });
  }
};

// @desc    Update vehicle mileage
// @route   PUT /api/vehicles/:id/mileage
// @access  Private (Customer - own vehicle only)
export const updateMileage = async (req, res) => {
  try {
    const { mileage } = req.body;

    if (!mileage || mileage < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid mileage is required'
      });
    }

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      customerId: req.user._id,
      isActive: true
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Update mileage
    vehicle.mileage = mileage;
    vehicle.calculateNextMaintenance();
    await vehicle.save();

    res.status(200).json({
      success: true,
      message: 'Mileage updated successfully',
      data: vehicle
    });
  } catch (error) {
    console.error('Error updating mileage:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating mileage'
    });
  }
};

// @desc    Get vehicle maintenance history
// @route   GET /api/vehicles/:id/maintenance
// @access  Private (Role-based access)
export const getVehicleMaintenance = async (req, res) => {
  try {
    let filter = { _id: req.params.id, isActive: true };
    
    // Role-based access control
    if (req.user.role === 'customer') {
      // Customers can only access maintenance history for their own vehicles
      filter.customerId = req.user._id;
    }
    // Staff, admin, and technicians can access maintenance history for any vehicle
    
    const vehicle = await Vehicle.findOne(filter);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Import Appointment model here to avoid circular dependency
    const { default: Appointment } = await import('../models/Appointment.js');
    
    const appointments = await Appointment.find({
      vehicleId: req.params.id,
      status: { $in: ['completed'] }
    })
    .populate('services.serviceId', 'name category')
    .populate('assignedTechnician', 'firstName lastName')
    .sort({ actualCompletion: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error('Error fetching maintenance history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching maintenance history'
    });
  }
};

// @desc    Add vehicle image with file upload
// @route   POST /api/vehicles/:id/images
// @access  Private (Customer - own vehicle only)
export const addVehicleImage = async (req, res) => {
  try {
    const { description } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required'
      });
    }

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      customerId: req.user._id,
      isActive: true
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Add image with uploaded file URL
    vehicle.images.push({
      url: req.file.path, // Cloudinary URL
      description: description || '',
      uploadDate: new Date()
    });

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: 'Image added successfully',
      data: vehicle
    });
  } catch (error) {
    console.error('Error adding vehicle image:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding image'
    });
  }
};