import mongoose from 'mongoose';

const evChecklistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['pre_service', 'battery_check', 'motor_check', 'charging_system', 'electronics', 'safety', 'post_service', 'quality_control'],
    required: true
  },
  serviceTypes: [{
    type: String,
    enum: ['battery', 'motor', 'charging', 'electronics', 'body', 'general', 'diagnostic']
  }],
  applicableVehicleTypes: [{
    make: String,
    model: String,
    year: {
      from: Number,
      to: Number
    },
    batteryType: String
  }],
  checklistItems: [{
    stepNumber: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: String,
    category: {
      type: String,
      enum: ['safety', 'preparation', 'inspection', 'testing', 'maintenance', 'verification', 'cleanup', 'documentation'],
      required: true
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    isSafetyItem: {
      type: Boolean,
      default: false
    },
    estimatedTime: {
      type: Number, // minutes
      default: 5
    },
    tools: [{
      name: String,
      isRequired: Boolean
    }],
    safetyPrecautions: [String],
    expectedResults: [String],
    failureActions: [String],
    documentation: {
      photoRequired: {
        type: Boolean,
        default: false
      },
      measurementRequired: {
        type: Boolean,
        default: false
      },
      measurementUnit: String,
      signoffRequired: {
        type: Boolean,
        default: false
      }
    },
    subItems: [{
      title: String,
      description: String,
      isRequired: Boolean,
      expectedValue: String,
      measurementType: {
        type: String,
        enum: ['voltage', 'current', 'temperature', 'pressure', 'resistance', 'frequency', 'visual', 'boolean']
      }
    }]
  }],
  prerequisites: [{
    description: String,
    category: {
      type: String,
      enum: ['safety_equipment', 'tool_preparation', 'workspace_setup', 'documentation', 'customer_authorization']
    }
  }],
  safetyRequirements: {
    personalProtectionEquipment: [{
      item: String,
      isRequired: Boolean,
      specification: String
    }],
    environmentalSafety: [{
      requirement: String,
      description: String
    }],
    emergencyProcedures: [{
      scenario: String,
      procedure: String,
      contactInfo: String
    }]
  },
  qualityCriteria: [{
    criterion: String,
    measurement: String,
    acceptableRange: {
      min: Number,
      max: Number,
      unit: String
    },
    passCriteria: String,
    failCriteria: String
  }],
  estimatedDuration: {
    type: Number, // total minutes
    required: true
  },
  skillLevel: {
    type: String,
    enum: ['basic', 'intermediate', 'advanced', 'expert'],
    required: true
  },
  requiredCertifications: [String],
  version: {
    type: String,
    required: true,
    default: '1.0'
  },
  revisionHistory: [{
    version: String,
    date: Date,
    changes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String],
  relatedChecklists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EVChecklist'
  }],
  usage: {
    timesUsed: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    averageCompletionTime: Number,
    successRate: {
      type: Number,
      default: 100
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying (code already has unique index from schema)
evChecklistSchema.index({ category: 1 });
evChecklistSchema.index({ serviceTypes: 1 });
evChecklistSchema.index({ skillLevel: 1 });
evChecklistSchema.index({ isActive: 1 });
evChecklistSchema.index({ 'applicableVehicleTypes.make': 1 });

// Virtual for total checklist items
evChecklistSchema.virtual('totalItems').get(function() {
  return this.checklistItems.length;
});

// Virtual for required items count
evChecklistSchema.virtual('requiredItemsCount').get(function() {
  return this.checklistItems.filter(item => item.isRequired).length;
});

// Virtual for safety items count
evChecklistSchema.virtual('safetyItemsCount').get(function() {
  return this.checklistItems.filter(item => item.isSafetyItem).length;
});

// Method to check if checklist is applicable to vehicle
evChecklistSchema.methods.isApplicableToVehicle = function(vehicleData) {
  if (this.applicableVehicleTypes.length === 0) return true;
  
  return this.applicableVehicleTypes.some(vehicleType => {
    const makeMatch = !vehicleType.make || vehicleType.make.toLowerCase() === vehicleData.make.toLowerCase();
    const modelMatch = !vehicleType.model || vehicleType.model.toLowerCase() === vehicleData.model.toLowerCase();
    const yearMatch = !vehicleType.year || (
      vehicleData.year >= (vehicleType.year.from || 1900) && 
      vehicleData.year <= (vehicleType.year.to || 9999)
    );
    const batteryMatch = !vehicleType.batteryType || vehicleType.batteryType === vehicleData.batteryType;
    
    return makeMatch && modelMatch && yearMatch && batteryMatch;
  });
};

// Method to create checklist instance for appointment
evChecklistSchema.methods.createInstance = function(appointmentId, technicianId) {
  const ChecklistInstance = mongoose.model('ChecklistInstance');
  
  const instance = new ChecklistInstance({
    checklistId: this._id,
    appointmentId: appointmentId,
    assignedTo: technicianId,
    items: this.checklistItems.map(item => ({
      stepNumber: item.stepNumber,
      title: item.title,
      description: item.description,
      category: item.category,
      isRequired: item.isRequired,
      isSafetyItem: item.isSafetyItem,
      estimatedTime: item.estimatedTime,
      tools: item.tools,
      safetyPrecautions: item.safetyPrecautions,
      expectedResults: item.expectedResults,
      documentation: item.documentation,
      subItems: item.subItems.map(subItem => ({
        title: subItem.title,
        description: subItem.description,
        isRequired: subItem.isRequired,
        expectedValue: subItem.expectedValue,
        measurementType: subItem.measurementType,
        isCompleted: false
      })),
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      actualTime: 0,
      notes: '',
      photos: [],
      measurements: [],
      issues: []
    }))
  });
  
  return instance.save();
};

// Method to update usage statistics
evChecklistSchema.methods.updateUsage = function(completionTime, success = true) {
  this.usage.timesUsed += 1;
  this.usage.lastUsed = new Date();
  
  // Update average completion time
  if (completionTime) {
    const totalTime = (this.usage.averageCompletionTime || 0) * (this.usage.timesUsed - 1);
    this.usage.averageCompletionTime = (totalTime + completionTime) / this.usage.timesUsed;
  }
  
  // Update success rate
  if (success !== undefined) {
    const totalSuccesses = this.usage.successRate * (this.usage.timesUsed - 1) / 100;
    const newSuccesses = totalSuccesses + (success ? 1 : 0);
    this.usage.successRate = (newSuccesses / this.usage.timesUsed) * 100;
  }
  
  return this.save();
};

export default mongoose.model('EVChecklist', evChecklistSchema);