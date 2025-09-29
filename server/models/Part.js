import mongoose from 'mongoose';

const partSchema = new mongoose.Schema({
  partNumber: {
    type: String,
    required: [true, 'Part number is required'],
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Part name is required'],
    trim: true
  },
  description: String,
  category: {
    type: String,
    enum: ['battery', 'motor', 'charging', 'electronics', 'body', 'interior', 'safety', 'consumables'],
    required: true
  },
  subcategory: String,
  brand: {
    type: String,
    required: true
  },
  model: String,
  specifications: {
    voltage: Number,
    capacity: Number,
    power: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      weight: Number
    },
    material: String,
    color: String,
    other: mongoose.Schema.Types.Mixed
  },
  compatibility: {
    makes: [String],
    models: [String],
    years: {
      min: Number,
      max: Number
    },
    batteryTypes: [String]
  },
  pricing: {
    cost: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost cannot be negative']
    },
    retail: {
      type: Number,
      required: [true, 'Retail price is required'],
      min: [0, 'Retail price cannot be negative']
    },
    wholesale: Number,
    currency: {
      type: String,
      default: 'VND'
    }
  },
  supplierInfo: {
    name: String,
    contact: String,
    notes: String
  },
  inventory: {
    currentStock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative']
    },
    usedStock: {
      type: Number,
      default: 0,
      min: [0, 'Used stock cannot be negative']
    },
    minStockLevel: {
      type: Number,
      default: 5,
      min: [0, 'Minimum stock level cannot be negative']
    },
    maxStockLevel: {
      type: Number,
      default: 100
    },
    reorderPoint: {
      type: Number,
      default: 10
    },
    averageUsage: {
      type: Number,
      default: 0
    },
    lastRestocked: Date,
    location: String, // warehouse location/bin
    reservations: [{
      appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Reservation quantity must be at least 1']
      },
      quantityUsed: {
        type: Number,
        default: 0
      },
      reservedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      reservedAt: {
        type: Date,
        default: Date.now
      },
      usedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      usedAt: Date,
      status: {
        type: String,
        enum: ['reserved', 'used', 'cancelled'],
        default: 'reserved'
      }
    }]
  },
  leadTime: {
    type: Number,
    default: 7 // days
  },
  warranty: {
    duration: Number, // months
    type: {
      type: String,
      enum: ['manufacturer', 'supplier', 'service_center'],
      default: 'manufacturer'
    },
    description: String
  },
  images: [{
    url: String,
    description: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  documents: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['datasheet', 'manual', 'certificate', 'warranty', 'other']
    }
  }],
  usage: {
    totalUsed: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    averageMonthlyUsage: {
      type: Number,
      default: 0
    }
  },
  isRecommended: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDiscontinued: {
    type: Boolean,
    default: false
  },
  replacementParts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part'
  }],
  tags: [String]
}, {
  timestamps: true
});

// Calculate available stock
partSchema.methods.getAvailableStock = function() {
  if (!this.inventory) return 0;
  return this.inventory.currentStock - this.inventory.reservedStock;
};

// Check if reorder is needed
partSchema.methods.needsReorder = function() {
  if (!this.inventory) return false;
  return this.inventory.currentStock <= this.inventory.reorderPoint;
};

// Get active reservations for an appointment
partSchema.methods.getAppointmentReservation = function(appointmentId) {
  if (!this.inventory || !this.inventory.reservations) return null;
  return this.inventory.reservations.find(
    res => res.appointmentId.toString() === appointmentId.toString() && res.status === 'reserved'
  );
};

// Virtual getters for consistent property access patterns
partSchema.virtual('unitPrice').get(function() {
  return this.pricing?.retail || 0;
});

partSchema.virtual('currentStock').get(function() {
  return this.inventory?.currentStock || 0;
});

partSchema.virtual('reservedStock').get(function() {
  return this.inventory?.reservedStock || 0;
});

partSchema.virtual('availableStock').get(function() {
  return this.getAvailableStock();
});

// Ensure virtuals are included in JSON output
partSchema.set('toJSON', { virtuals: true });
partSchema.set('toObject', { virtuals: true });

// Index for search and filtering
partSchema.index({ 
  name: 'text', 
  description: 'text', 
  partNumber: 'text',
  tags: 'text'
});

partSchema.index({ category: 1, subcategory: 1 });
partSchema.index({ 'compatibility.makes': 1 });

export default mongoose.model('Part', partSchema);