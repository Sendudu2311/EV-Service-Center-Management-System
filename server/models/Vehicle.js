import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vin: {
    type: String,
    required: [true, 'VIN is required'],
    unique: true,
    uppercase: true,
    minlength: [17, 'VIN must be exactly 17 characters'],
    maxlength: [17, 'VIN must be exactly 17 characters'],
    validate: {
      validator: function(v) {
        return /^[A-HJ-NPR-Z0-9]{17}$/i.test(v);
      },
      message: 'VIN must be 17 characters and contain only valid characters (no I, O, Q)'
    }
  },
  make: {
    type: String,
    required: [true, 'Vehicle make is required']
  },
  model: {
    type: String,
    required: [true, 'Vehicle model is required']
  },
  year: {
    type: Number,
    required: [true, 'Vehicle year is required'],
    min: [2010, 'Year must be 2010 or later'],
    max: [new Date().getFullYear() + 1, 'Invalid year']
  },
  color: {
    type: String,
    required: true
  },
  batteryType: {
    type: String,
    enum: ['lithium-ion', 'lithium-polymer', 'nickel-metal-hydride', 'solid-state'],
    required: true
  },
  batteryCapacity: {
    type: Number,
    required: [true, 'Battery capacity is required'],
    min: [10, 'Battery capacity must be at least 10 kWh']
  },
  maxChargingPower: {
    type: Number,
    required: [true, 'Max charging power is required'],
    min: [3, 'Charging power must be at least 3 kW']
  },
  range: {
    type: Number,
    required: [true, 'Vehicle range is required'],
    min: [50, 'Range must be at least 50 km']
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  mileage: {
    type: Number,
    default: 0,
    min: [0, 'Mileage cannot be negative']
  },
  lastMaintenanceDate: Date,
  nextMaintenanceDate: Date,
  maintenanceInterval: {
    type: Number,
    default: 10000 // km
  },
  timeBasedInterval: {
    type: Number,
    default: 6 // months
  },
  warrantyExpiry: Date,
  images: [{
    url: String,
    description: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  documents: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['registration', 'insurance', 'warranty', 'manual', 'other']
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Calculate next maintenance date based on mileage and time
vehicleSchema.methods.calculateNextMaintenance = function() {
  const lastMaintenance = this.lastMaintenanceDate || this.purchaseDate;
  const timeBasedNext = new Date(lastMaintenance);
  timeBasedNext.setMonth(timeBasedNext.getMonth() + this.timeBasedInterval);
  
  // For mileage-based, we'd need current mileage tracking
  this.nextMaintenanceDate = timeBasedNext;
  return timeBasedNext;
};

// Check if maintenance is due
vehicleSchema.virtual('isMaintenanceDue').get(function() {
  if (!this.nextMaintenanceDate) return false;
  return new Date() >= this.nextMaintenanceDate;
});

export default mongoose.model('Vehicle', vehicleSchema);