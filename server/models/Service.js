import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Service code is required'],
    unique: true,
    uppercase: true
  },
  description: {
    type: String,
    required: [true, 'Service description is required']
  },
  category: {
    type: String,
    enum: ['battery', 'motor', 'charging', 'electronics', 'body', 'general', 'diagnostic'],
    required: true
  },
  subcategory: String,
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Price cannot be negative']
  },
  estimatedDuration: {
    type: Number,
    required: [true, 'Estimated duration is required'],
    min: [15, 'Duration must be at least 15 minutes']
  },
  skillLevel: {
    type: String,
    enum: ['basic', 'intermediate', 'advanced', 'expert'],
    default: 'basic'
  },
  requiredCertifications: [{
    type: String
  }],
  requiredTools: [{
    name: String,
    isRequired: {
      type: Boolean,
      default: true
    }
  }],
  checklist: [{
    step: String,
    category: {
      type: String,
      enum: ['safety', 'preparation', 'execution', 'verification', 'cleanup']
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    estimatedTime: Number // minutes
  }],
  commonParts: [{
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part'
    },
    partName: {
      type: String,
      description: 'Denormalized part name for quick access'
    },
    quantity: {
      type: Number,
      default: 1
    },
    isOptional: {
      type: Boolean,
      default: false
    }
  }],
  warranty: {
    duration: Number, // days
    description: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableVehicles: {
    makes: [String],
    models: [String],
    years: {
      min: Number,
      max: Number
    },
    batteryTypes: [String]
  },
  seasonality: {
    peak: [String], // months when service is in high demand
    low: [String]   // months when service is in low demand
  },
  tags: [String]
}, {
  timestamps: true
});

// Index for search functionality
serviceSchema.index({ 
  name: 'text', 
  description: 'text', 
  tags: 'text' 
});

export default mongoose.model('Service', serviceSchema);