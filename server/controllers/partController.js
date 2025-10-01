import Part from '../models/Part.js';
import Appointment from '../models/Appointment.js';

// @desc    Get all parts with filtering
// @route   GET /api/parts
// @access  Private (Staff, Technician)
export const getParts = async (req, res) => {
  try {
    const {
      category,
      make,
      model,
      year,
      search,
      inStock = true,
      page = 1,
      limit = 20
    } = req.query;

    let filter = { isActive: true };

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Compatibility filters
    if (make) {
      filter['compatibility.makes'] = { $in: [make] };
    }

    if (model) {
      filter['compatibility.models'] = { $in: [model] };
    }

    if (year) {
      const yearNum = parseInt(year);
      filter.$and = [
        { 'compatibility.years.min': { $lte: yearNum } },
        { 'compatibility.years.max': { $gte: yearNum } }
      ];
    }

    // Stock filter
    if (inStock === 'true' || inStock === true) {
      filter['inventory.currentStock'] = { $gt: 0 };
    }

    // Text search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { partNumber: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const parts = await Part.find(filter)
      .select('partNumber name description category subcategory brand model pricing inventory compatibility warranty isActive tags createdAt updatedAt images.url images.isPrimary') // <-- THÊM images
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Part.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: parts.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum), // <-- nhớ dùng số
      data: parts,
    });
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching parts'
    });
  }
};

// @desc    Get single part details
// @route   GET /api/parts/:id
// @access  Private (Staff, Technician)
export const getPart = async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);

    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }

    res.status(200).json({
      success: true,
      data: part
    });
  } catch (error) {
    console.error('Error fetching part:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching part'
    });
  }
};

// @desc    Get parts by service category (for technician recommendations)
// @route   GET /api/parts/by-service/:category
// @access  Private (Staff, Technician)
export const getPartsByServiceCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { vehicleMake, vehicleModel, vehicleYear } = req.query;

    let filter = {
      category: category,
      isActive: true,
      'inventory.currentStock': { $gt: 0 }
    };

    // Add vehicle compatibility filters if provided
    if (vehicleMake) {
      filter['compatibility.makes'] = { $in: [vehicleMake] };
    }

    if (vehicleModel) {
      filter['compatibility.models'] = { $in: [vehicleModel] };
    }

    if (vehicleYear) {
      const yearNum = parseInt(vehicleYear);
      filter.$and = [
        { 'compatibility.years.min': { $lte: yearNum } },
        { 'compatibility.years.max': { $gte: yearNum } }
      ];
    }

    const parts = await Part.find(filter)
      .select('partNumber name description brand model pricing inventory isRecommended')
      .sort({ isRecommended: -1, name: 1 })
      .limit(50);

    // Categorize parts by usage frequency/type
    const categorizedParts = {
      recommended: parts.filter(part => part.isRecommended),
      common: parts.filter(part => !part.isRecommended && part.inventory.averageUsage > 5),
      available: parts.filter(part => !part.isRecommended && part.inventory.averageUsage <= 5)
    };

    res.status(200).json({
      success: true,
      serviceCategory: category,
      data: categorizedParts,
      total: parts.length
    });
  } catch (error) {
    console.error('Error fetching parts by service category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching parts for service category'
    });
  }
};

// @desc    Reserve parts for appointment
// @route   POST /api/parts/reserve
// @access  Private (Staff, Technician)
export const reserveParts = async (req, res) => {
  try {
    const { appointmentId, parts } = req.body; // parts: [{ partId, quantity }]

    if (!appointmentId || !parts || !Array.isArray(parts)) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID and parts array are required'
      });
    }

    // Check appointment status and workflow restrictions
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Only allow parts reservation for confirmed appointments that haven't started work yet
    if (!['confirmed', 'pending'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reserve parts for appointment with status: ${appointment.status}. Parts can only be reserved for confirmed appointments before work begins.`,
        currentStatus: appointment.status,
        allowedStatuses: ['confirmed', 'pending']
      });
    }

    // Additional check for technician role - only assigned technician can reserve parts
    if (req.user.role === 'technician') {
      if (!appointment.assignedTechnician || appointment.assignedTechnician.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Only the assigned technician can reserve parts for this appointment'
        });
      }
    }

    const reservations = [];
    const unavailableParts = [];

    // Process each part reservation
    for (const partReq of parts) {
      const part = await Part.findById(partReq.partId);

      if (!part) {
        unavailableParts.push({ partId: partReq.partId, reason: 'Part not found' });
        continue;
      }

      if (part.inventory.currentStock < partReq.quantity) {
        unavailableParts.push({
          partId: partReq.partId,
          partName: part.name,
          reason: `Insufficient stock. Available: ${part.inventory.currentStock}, Requested: ${partReq.quantity}`
        });
        continue;
      }

      // Reserve the part
      part.inventory.currentStock -= partReq.quantity;
      part.inventory.reservedStock += partReq.quantity;

      // Add reservation record
      part.inventory.reservations.push({
        appointmentId,
        quantity: partReq.quantity,
        reservedBy: req.user._id,
        reservedAt: new Date(),
        status: 'reserved'
      });

      await part.save();

      reservations.push({
        partId: part._id,
        partName: part.name,
        partNumber: part.partNumber,
        quantity: partReq.quantity,
        unitPrice: part.pricing.retail
      });
    }

    if (unavailableParts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some parts could not be reserved',
        unavailableParts,
        partialReservations: reservations
      });
    }

    res.status(200).json({
      success: true,
      message: 'Parts reserved successfully',
      data: {
        appointmentId,
        reservedParts: reservations,
        totalParts: reservations.length
      }
    });
  } catch (error) {
    console.error('Error reserving parts:', error);
    res.status(500).json({
      success: false,
      message: 'Error reserving parts'
    });
  }
};

// @desc    Get reserved parts for appointment
// @route   GET /api/parts/appointment/:appointmentId
// @access  Private (Staff, Technician)
export const getAppointmentParts = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Get appointment details for workflow checking
    const appointment = await Appointment.findById(appointmentId).select('status assignedTechnician');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    const parts = await Part.find({
      'inventory.reservations.appointmentId': appointmentId
    }).select('partNumber name pricing inventory');

    const reservedParts = [];

    parts.forEach(part => {
      const reservation = part.inventory.reservations.find(
        res => res.appointmentId.toString() === appointmentId
      );

      if (reservation) {
        reservedParts.push({
          partId: part._id,
          partNumber: part.partNumber,
          name: part.name,
          quantity: reservation.quantity,
          unitPrice: part.pricing.retail,
          totalPrice: part.pricing.retail * reservation.quantity,
          status: reservation.status,
          reservedAt: reservation.reservedAt
        });
      }
    });

    // Determine workflow permissions
    const canReserveParts = ['confirmed', 'pending'].includes(appointment.status);
    const canModifyParts = appointment.status === 'in_progress';
    const isAssignedTechnician = req.user.role === 'technician' &&
      appointment.assignedTechnician &&
      appointment.assignedTechnician.toString() === req.user._id.toString();

    res.status(200).json({
      success: true,
      appointmentId,
      data: reservedParts,
      totalCost: reservedParts.reduce((sum, part) => sum + part.totalPrice, 0),
      workflowInfo: {
        appointmentStatus: appointment.status,
        canReserveParts: canReserveParts && (req.user.role === 'staff' || isAssignedTechnician),
        canModifyParts: canModifyParts && isAssignedTechnician,
        isAssignedTechnician,
        restrictions: {
          message: !canReserveParts ?
            'Parts can only be reserved for confirmed appointments before work begins' :
            canModifyParts ?
              'Parts selection is locked. Only usage marking is allowed during work.' :
              'Parts can be reserved and modified'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching appointment parts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment parts'
    });
  }
};

// @desc    Update part usage (mark as used)
// @route   PUT /api/parts/use
// @access  Private (Technician)
export const useReservedParts = async (req, res) => {
  try {
    const { appointmentId, usedParts } = req.body; // usedParts: [{ partId, quantityUsed }]

    if (!appointmentId || !usedParts || !Array.isArray(usedParts)) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID and used parts array are required'
      });
    }

    const updatedParts = [];

    for (const usedPart of usedParts) {
      const part = await Part.findById(usedPart.partId);

      if (!part) continue;

      // Find the reservation
      const reservationIndex = part.inventory.reservations.findIndex(
        res => res.appointmentId.toString() === appointmentId
      );

      if (reservationIndex === -1) continue;

      const reservation = part.inventory.reservations[reservationIndex];

      // Update reservation status and usage
      reservation.status = 'used';
      reservation.quantityUsed = usedPart.quantityUsed;
      reservation.usedAt = new Date();
      reservation.usedBy = req.user._id;

      // Update inventory
      const quantityNotUsed = reservation.quantity - usedPart.quantityUsed;
      if (quantityNotUsed > 0) {
        // Return unused parts to stock
        part.inventory.currentStock += quantityNotUsed;
      }

      part.inventory.reservedStock -= reservation.quantity;
      part.inventory.usedStock += usedPart.quantityUsed;

      // Update usage statistics
      part.inventory.averageUsage = Math.round(
        (part.inventory.averageUsage * 0.9) + (usedPart.quantityUsed * 0.1)
      );

      await part.save();

      updatedParts.push({
        partId: part._id,
        partName: part.name,
        quantityUsed: usedPart.quantityUsed,
        quantityReturned: quantityNotUsed
      });
    }

    res.status(200).json({
      success: true,
      message: 'Part usage updated successfully',
      data: updatedParts
    });
  } catch (error) {
    console.error('Error updating part usage:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating part usage'
    });
  }
};

// Create new part with image upload
export const createPart = async (req, res) => {
  try {
    let partData = { ...req.body };

    // Parse JSON strings from FormData
    const jsonFields = ['pricing', 'inventory', 'compatibility', 'specifications', 'supplierInfo', 'warranty', 'tags', 'usage'];
    jsonFields.forEach(field => {
      if (partData[field] && typeof partData[field] === 'string') {
        try {
          partData[field] = JSON.parse(partData[field]);
        } catch (e) {
          console.warn(`Failed to parse ${field}:`, partData[field]);
        }
      }
    });

    // Handle image uploads if present
    if (req.files && req.files.length > 0) {
      partData.images = req.files.map(file => ({
        url: file.path,
        publicId: file.filename,
        originalName: file.originalname
      }));
    }

    // Ensure inventory structure
    if (!partData.inventory) {
      partData.inventory = {
        currentStock: 0,
        reservedStock: 0,
        usedStock: 0,
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderPoint: 20,
        averageUsage: 0,
        reservations: []
      };
    }

    const part = new Part(partData);
    await part.save();

    res.status(201).json({
      success: true,
      message: 'Part created successfully',
      data: part
    });
  } catch (error) {
    console.error('Error creating part:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating part',
      error: error.message
    });
  }
};

// Update part with optional image upload
export const updatePart = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    // Parse JSON strings from FormData
    const jsonFields = ['pricing', 'inventory', 'compatibility', 'specifications', 'supplierInfo', 'warranty', 'tags', 'usage'];
    jsonFields.forEach(field => {
      if (updateData[field] && typeof updateData[field] === 'string') {
        try {
          updateData[field] = JSON.parse(updateData[field]);
        } catch (e) {
          console.warn(`Failed to parse ${field}:`, updateData[field]);
        }
      }
    });

    const part = await Part.findById(id);
    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: file.path,
        publicId: file.filename,
        originalName: file.originalname
      }));

      // Add new images to existing ones
      updateData.images = [...(part.images || []), ...newImages];
    }

    const updatedPart = await Part.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Part updated successfully',
      data: updatedPart
    });
  } catch (error) {
    console.error('Error updating part:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating part',
      error: error.message
    });
  }
};

// Delete part
export const deletePart = async (req, res) => {
  try {
    const { id } = req.params;

    const part = await Part.findById(id);
    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }

    // Check if part is used in any services
    const Service = (await import('../models/Service.js')).default;
    const servicesUsingPart = await Service.find({
      commonParts: id
    });

    if (servicesUsingPart.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete part that is used in services',
        usedInServices: servicesUsingPart.map(s => s.name)
      });
    }

    await Part.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Part deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting part:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting part'
    });
  }
};

// Adjust part stock
export const adjustPartStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason } = req.body; // type: 'add' | 'remove'

    const part = await Part.findById(id);
    if (!part) {
      return res.status(404).json({
        success: false,
        message: 'Part not found'
      });
    }

    const previousStock = part.inventory.currentStock;

    if (type === 'add') {
      part.inventory.currentStock += Math.abs(quantity);
    } else if (type === 'remove') {
      if (part.inventory.currentStock < Math.abs(quantity)) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock'
        });
      }
      part.inventory.currentStock -= Math.abs(quantity);
    }

    // Add to stock history (if we implement this feature later)
    part.stockHistory = part.stockHistory || [];
    part.stockHistory.push({
      date: new Date(),
      type,
      quantity: Math.abs(quantity),
      previousStock,
      newStock: part.inventory.currentStock,
      reason,
      user: req.user._id
    });

    await part.save();

    res.status(200).json({
      success: true,
      message: `Stock ${type === 'add' ? 'added' : 'removed'} successfully`,
      data: {
        partId: part._id,
        previousStock,
        newStock: part.inventory.currentStock,
        adjustment: type === 'add' ? quantity : -quantity
      }
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error adjusting stock'
    });
  }
};

// Get low stock parts
export const getLowStockParts = async (req, res) => {
  try {
    const lowStockParts = await Part.find({
      $expr: {
        $lte: ['$inventory.currentStock', '$inventory.reorderPoint']
      },
      isActive: true
    }).select('name partNumber inventory category brand');

    res.status(200).json({
      success: true,
      count: lowStockParts.length,
      data: lowStockParts
    });
  } catch (error) {
    console.error('Error fetching low stock parts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock parts'
    });
  }
};

// Search compatible parts
export const searchCompatibleParts = async (req, res) => {
  try {
    const { make, model, year, batteryType } = req.query;

    let filter = { isActive: true };

    if (make) {
      filter['compatibility.makes'] = { $in: [make] };
    }

    if (model) {
      filter['compatibility.models'] = { $in: [model] };
    }

    if (year) {
      filter['compatibility.years.min'] = { $lte: parseInt(year) };
      filter['compatibility.years.max'] = { $gte: parseInt(year) };
    }

    if (batteryType) {
      filter['compatibility.batteryTypes'] = { $in: [batteryType] };
    }

    const parts = await Part.find(filter)
      .select('name partNumber category inventory.currentStock pricing.retail images')
      .sort({ category: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: parts.length,
      data: parts
    });
  } catch (error) {
    console.error('Error searching compatible parts:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching compatible parts'
    });
  }
};
export default {
  getParts,
  getPart,
  getPartsByServiceCategory,
  reserveParts,
  getAppointmentParts,
  useReservedParts,
  createPart,
  updatePart,
  deletePart,
  adjustPartStock,
  getLowStockParts,
  searchCompatibleParts
};