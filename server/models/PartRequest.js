import mongoose from 'mongoose';

const partRequestSchema = new mongoose.Schema({
  requestNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  type: {
    type: String,
    enum: ['initial_service', 'additional_during_service'],
    required: true,
    default: 'initial_service'
  },
  
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  
  serviceReceptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceReception'
  },
  
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  requestedParts: [{
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    reason: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal'
    },
    availableQuantity: {
      type: Number,
      default: 0
    },
    shortfall: {
      type: Number,
      default: 0
    },
    unitPrice: Number,
    totalPrice: Number,
    // Performance optimization: cache frequently accessed part info
    partInfo: {
      name: String,
      partNumber: String,
      category: String
    }
  }],
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'partially_approved', 'rejected', 'fulfilled'],
    default: 'pending'
  },
  
  reviewDetails: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    decision: {
      type: String,
      enum: ['approve_all', 'approve_partial', 'reject_insufficient_stock', 'reject_unnecessary']
    },
    staffNotes: String,
    alternativeParts: [{
      originalPartId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Part'
      },
      alternativePartId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Part'
      },
      reason: String
    }]
  },
  
  fulfillmentInfo: {
    fulfilledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fulfilledAt: Date,
    actualPartsUsed: [{
      partId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Part'
      },
      quantity: Number,
      condition: {
        type: String,
        enum: ['new', 'refurbished', 'used'],
        default: 'new'
      }
    }]
  },
  
  urgency: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  estimatedCost: {
    type: Number,
    default: 0
  },
  
  actualCost: {
    type: Number,
    default: 0
  },
  
  customerApprovalRequired: {
    type: Boolean,
    default: false
  },
  
  customerApproved: {
    type: Boolean,
    default: false
  },
  
  customerApprovalDetails: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    customerNotes: String,
    communicationMethod: {
      type: String,
      enum: ['phone', 'email', 'sms', 'in_person']
    }
  },
  
  expectedDelivery: {
    orderDate: Date,
    expectedArrival: Date,
    actualArrival: Date,
    supplierInfo: {
      name: String,
      contact: String,
      orderReference: String
    }
  },
  
  requestNotes: String,
  internalNotes: String,
  
  // Workflow tracking
  workflowHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String,
    notes: String
  }]
}, {
  timestamps: true
});

// Generate request number
partRequestSchema.pre('save', async function(next) {
  if (!this.requestNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      }
    });
    
    this.requestNumber = `PRQ${year}${month}${day}${(count + 1).toString().padStart(3, '0')}`;
  }
  next();
});

// Calculate estimated cost
partRequestSchema.methods.calculateEstimatedCost = function() {
  let total = 0;
  this.requestedParts.forEach(part => {
    if (part.unitPrice && part.quantity) {
      part.totalPrice = part.unitPrice * part.quantity;
      total += part.totalPrice;
    }
  });
  this.estimatedCost = total;
  return total;
};

// Update status with history tracking
partRequestSchema.methods.updateStatus = function(newStatus, userId, reason = '', notes = '') {
  // Add to workflow history
  this.workflowHistory.push({
    status: this.status, // Previous status
    changedBy: userId,
    changedAt: new Date(),
    reason,
    notes
  });
  
  this.status = newStatus;
  return this.save();
};

// Check if request can be fulfilled
partRequestSchema.methods.canBeFulfilled = function() {
  return this.status === 'approved' || this.status === 'partially_approved';
};

// Check availability of all requested parts (optimized)
partRequestSchema.methods.checkPartsAvailability = async function() {
  const Part = mongoose.model('Part');
  
  // Batch fetch all parts in one query
  const partIds = this.requestedParts.map(item => item.partId);
  const parts = await Part.find(
    { _id: { $in: partIds } },
    { 
      _id: 1, 
      name: 1, 
      partNumber: 1,
      'inventory.currentStock': 1, 
      'inventory.reservedStock': 1 
    }
  );
  
  // Create a map for O(1) lookup
  const partMap = new Map(parts.map(part => [part._id.toString(), part]));
  
  const availabilityCheck = this.requestedParts.map((item) => {
    const part = partMap.get(item.partId.toString());
    if (!part) {
      return {
        partId: item.partId,
        available: false,
        reason: 'Part not found'
      };
    }
    
    const availableStock = part.getAvailableStock ? part.getAvailableStock() : 
      (part.inventory.currentStock - part.inventory.reservedStock);
    const shortfall = Math.max(0, item.quantity - availableStock);
    
    // Update the item in place
    item.availableQuantity = availableStock;
    item.shortfall = shortfall;
    
    return {
      partId: item.partId,
      partName: part.name,
      partNumber: part.partNumber,
      requested: item.quantity,
      available: availableStock,
      shortfall,
      canFulfill: shortfall === 0
    };
  });
  
  const canFulfillAll = availabilityCheck.every(check => check.canFulfill);
  
  return {
    canFulfillAll,
    details: availabilityCheck
  };
};

// Approve parts request
partRequestSchema.methods.approve = function(staffId, decision, notes = '', alternatives = []) {
  this.reviewDetails = {
    reviewedBy: staffId,
    reviewedAt: new Date(),
    decision,
    staffNotes: notes,
    alternativeParts: alternatives
  };
  
  switch(decision) {
    case 'approve_all':
      this.status = 'approved';
      break;
    case 'approve_partial':
      this.status = 'partially_approved';
      break;
    case 'reject_insufficient_stock':
    case 'reject_unnecessary':
      this.status = 'rejected';
      break;
  }
  
  return this.save();
};

// Mark as fulfilled
partRequestSchema.methods.fulfill = function(staffId, actualParts) {
  this.fulfillmentInfo = {
    fulfilledBy: staffId,
    fulfilledAt: new Date(),
    actualPartsUsed: actualParts
  };
  
  // Calculate actual cost
  let actualCost = 0;
  actualParts.forEach(part => {
    // This would need to fetch part price from Part model
    // For now, we'll use the estimated cost
  });
  
  this.status = 'fulfilled';
  return this.save();
};

// Optimized compound indexes for efficient querying (requestNumber already has unique index from schema)
partRequestSchema.index({ appointmentId: 1, status: 1 }); // Common query pattern
partRequestSchema.index({ serviceReceptionId: 1, status: 1 });
partRequestSchema.index({ requestedBy: 1, createdAt: -1 }); // User's request history
partRequestSchema.index({ status: 1, urgency: -1, createdAt: -1 }); // Priority queue
partRequestSchema.index({ type: 1, status: 1 }); // Type filtering with status
partRequestSchema.index({ 'requestedParts.partId': 1 }); // Part lookup
partRequestSchema.index({ 'reviewDetails.reviewedBy': 1, 'reviewDetails.reviewedAt': -1 }); // Staff workload
partRequestSchema.index({ customerApprovalRequired: 1, customerApproved: 1 }); // Customer approval tracking

// Static methods for aggregation queries
partRequestSchema.statics.getRequestsSummary = function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalCost: { $sum: '$estimatedCost' },
        avgCost: { $avg: '$estimatedCost' }
      }
    },
    { $sort: { count: -1 } }
  ];
  return this.aggregate(pipeline);
};

partRequestSchema.statics.getPartUsageStats = function(dateRange = {}) {
  const pipeline = [
    { $match: dateRange },
    { $unwind: '$requestedParts' },
    {
      $group: {
        _id: '$requestedParts.partId',
        totalRequested: { $sum: '$requestedParts.quantity' },
        avgQuantity: { $avg: '$requestedParts.quantity' },
        requestCount: { $sum: 1 },
        categories: { $addToSet: '$requestedParts.partInfo.category' }
      }
    },
    { $sort: { totalRequested: -1 } },
    { $limit: 50 }
  ];
  return this.aggregate(pipeline);
};

partRequestSchema.statics.getStaffWorkload = function(staffId, dateRange = {}) {
  const pipeline = [
    {
      $match: {
        'reviewDetails.reviewedBy': mongoose.Types.ObjectId(staffId),
        ...dateRange
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$reviewDetails.reviewedAt' } }
        },
        requestsReviewed: { $sum: 1 },
        avgReviewTime: { 
          $avg: { 
            $subtract: ['$reviewDetails.reviewedAt', '$createdAt'] 
          } 
        }
      }
    },
    { $sort: { '_id.date': -1 } }
  ];
  return this.aggregate(pipeline);
};

export default mongoose.model('PartRequest', partRequestSchema);