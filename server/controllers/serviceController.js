import Service from '../models/Service.js';

// @desc    Get all services
// @route   GET /api/services
// @access  Public
export const getServices = async (req, res) => {
  try {
    const { category, isActive, withAvailability, page = 1, limit = 12, search } = req.query;
    
    let filter = {};
    
    if (category) {
      filter.category = category;
    }
    
    // Default to showing only active services
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    } else {
      filter.isActive = true;
    }

    // Add search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let services;
    let totalServices;
    
    if (withAvailability === 'true') {
      // Populate common parts to check availability
      totalServices = await Service.countDocuments(filter);
      services = await Service.find(filter)
        .populate('commonParts', 'name inventory.currentStock inventory.minStockLevel')
        .sort({ category: 1, name: 1 })
        .skip(skip)
        .limit(limitNum);
      
      // Add availability status to each service
      services = services.map(service => {
        const serviceObj = service.toObject();
        const unavailableParts = serviceObj.commonParts?.filter(part => 
          part.inventory?.currentStock < part.inventory?.minStockLevel
        ) || [];
        
        serviceObj.availability = {
          isAvailable: unavailableParts.length === 0,
          unavailableParts: unavailableParts.length,
          totalParts: serviceObj.commonParts?.length || 0
        };
        
        return serviceObj;
      });
    } else {
      totalServices = await Service.countDocuments(filter);
      services = await Service.find(filter)
        .select('name code category subcategory description basePrice estimatedDuration skillLevel isActive tags commonParts createdAt updatedAt')
        .sort({ category: 1, name: 1 })
        .skip(skip)
        .limit(limitNum);
    }

    res.status(200).json({
      success: true,
      count: services.length,
      totalServices,
      totalPages: Math.ceil(totalServices / limitNum),
      currentPage: pageNum,
      data: services
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching services'
    });
  }
};;

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Public
export const getService = async (req, res) => {
  try {
    const service = await Service.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service'
    });
  }
};

// @desc    Create service (Admin only)
// @route   POST /api/services
// @access  Private (Admin)
export const createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service
    });
  } catch (error) {
    console.error('Error creating service:', error);
    
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
        message: 'Service with this code already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating service'
    });
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private (Admin)
export const updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: service
    });
  } catch (error) {
    console.error('Error updating service:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating service'
    });
  }
};
// Get service availability based on parts stock
export const checkServiceAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findById(id)
      .populate('commonParts', 'name partNumber inventory.currentStock inventory.minStockLevel inventory.reorderPoint');
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    const partsAnalysis = service.commonParts.map(part => ({
      partId: part._id,
      name: part.name,
      partNumber: part.partNumber,
      currentStock: part.inventory.currentStock,
      minStock: part.inventory.minStockLevel,
      isAvailable: part.inventory.currentStock >= part.inventory.minStockLevel,
      stockStatus: part.inventory.currentStock >= part.inventory.minStockLevel 
        ? 'in-stock' 
        : part.inventory.currentStock > 0 
          ? 'low-stock' 
          : 'out-of-stock'
    }));
    
    const unavailableParts = partsAnalysis.filter(part => !part.isAvailable);
    
    res.status(200).json({
      success: true,
      data: {
        serviceId: service._id,
        serviceName: service.name,
        isAvailable: unavailableParts.length === 0,
        totalParts: partsAnalysis.length,
        availableParts: partsAnalysis.length - unavailableParts.length,
        unavailableParts: unavailableParts.length,
        partsAnalysis
      }
    });
  } catch (error) {
    console.error('Error checking service availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking service availability'
    });
  }
};

// Bulk check availability for multiple services
export const bulkCheckAvailability = async (req, res) => {
  try {
    const { serviceIds } = req.body;
    
    if (!serviceIds || !Array.isArray(serviceIds)) {
      return res.status(400).json({
        success: false,
        message: 'Service IDs array is required'
      });
    }
    
    const services = await Service.find({
      _id: { $in: serviceIds }
    }).populate('commonParts', 'inventory.currentStock inventory.minStockLevel');
    
    const availabilityResults = services.map(service => {
      const unavailableParts = service.commonParts.filter(part => 
        part.inventory.currentStock < part.inventory.minStockLevel
      );
      
      return {
        serviceId: service._id,
        serviceName: service.name,
        isAvailable: unavailableParts.length === 0,
        unavailablePartsCount: unavailableParts.length,
        totalPartsCount: service.commonParts.length
      };
    });
    
    res.status(200).json({
      success: true,
      data: availabilityResults
    });
  } catch (error) {
    console.error('Error in bulk availability check:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking services availability'
    });
  }
};

// @desc    Delete service (soft delete)
// @route   DELETE /api/services/:id
// @access  Private (Admin)
export const deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting service'
    });
  }
};