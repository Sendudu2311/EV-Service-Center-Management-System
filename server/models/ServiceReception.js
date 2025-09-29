import mongoose from 'mongoose';

const serviceReceptionSchema = new mongoose.Schema({
  receptionNumber: {
    type: String,
    unique: true,
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  serviceCenterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceCenter',
    required: true
  },
  vehicleCondition: {
    exterior: {
      condition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
        required: true
      },
      damages: [{
        location: String,
        type: {
          type: String,
          enum: ['scratch', 'dent', 'crack', 'rust', 'paint_damage', 'missing_part']
        },
        severity: {
          type: String,
          enum: ['minor', 'moderate', 'major']
        },
        description: String,
        photoUrl: String
      }],
      notes: String
    },
    interior: {
      condition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
        required: true
      },
      cleanliness: {
        type: String,
        enum: ['very_clean', 'clean', 'moderate', 'dirty', 'very_dirty']
      },
      damages: [{
        location: String,
        type: {
          type: String,
          enum: ['stain', 'tear', 'wear', 'burn', 'missing_part']
        },
        description: String,
        photoUrl: String
      }],
      notes: String
    },
    battery: {
      level: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      },
      health: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'replace_soon']
      },
      temperature: Number,
      chargingStatus: {
        type: String,
        enum: ['not_charging', 'charging', 'fully_charged', 'error']
      },
      lastChargeDate: Date,
      cycleCount: Number,
      notes: String
    },
    mileage: {
      current: {
        type: Number,
        required: true,
        min: 0
      },
      lastService: Number,
      mileageSinceLastService: Number,
      odometerPhoto: String
    },
    fluids: {
      brakeFluid: {
        level: {
          type: String,
          enum: ['full', 'adequate', 'low', 'empty']
        },
        condition: {
          type: String,
          enum: ['clear', 'amber', 'dark', 'contaminated']
        }
      },
      coolant: {
        level: {
          type: String,
          enum: ['full', 'adequate', 'low', 'empty']
        },
        condition: {
          type: String,
          enum: ['clear', 'clean', 'dirty', 'contaminated']
        }
      },
      washerFluid: {
        level: {
          type: String,
          enum: ['full', 'adequate', 'low', 'empty']
        }
      }
    },
    tires: {
      frontLeft: {
        treadDepth: Number,
        pressure: Number,
        condition: {
          type: String,
          enum: ['new', 'good', 'fair', 'replace_soon', 'replace_now']
        }
      },
      frontRight: {
        treadDepth: Number,
        pressure: Number,
        condition: {
          type: String,
          enum: ['new', 'good', 'fair', 'replace_soon', 'replace_now']
        }
      },
      rearLeft: {
        treadDepth: Number,
        pressure: Number,
        condition: {
          type: String,
          enum: ['new', 'good', 'fair', 'replace_soon', 'replace_now']
        }
      },
      rearRight: {
        treadDepth: Number,
        pressure: Number,
        condition: {
          type: String,
          enum: ['new', 'good', 'fair', 'replace_soon', 'replace_now']
        }
      },
      spare: {
        condition: {
          type: String,
          enum: ['available', 'good', 'fair', 'poor', 'missing']
        },
        pressure: Number
      }
    },
    lights: {
      headlights: {
        type: String,
        enum: ['working', 'dim', 'not_working']
      },
      taillights: {
        type: String,
        enum: ['working', 'dim', 'not_working']
      },
      indicators: {
        type: String,
        enum: ['working', 'not_working']
      },
      interiorLights: {
        type: String,
        enum: ['working', 'not_working']
      }
    },
    generalIssues: [{
      category: {
        type: String,
        enum: ['engine', 'transmission', 'brakes', 'suspension', 'electrical', 'hvac', 'other']
      },
      issue: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      customerReported: {
        type: Boolean,
        default: false
      }
    }]
  },
  customerItems: [{
    item: String,
    location: String,
    value: Number,
    notes: String
  }],
  preServicePhotos: [{
    url: String,
    category: {
      type: String,
      enum: ['exterior_front', 'exterior_back', 'exterior_left', 'exterior_right', 
             'interior_front', 'interior_back', 'dashboard', 'trunk', 'engine', 'other']
    },
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  diagnosticCodes: [{
    code: String,
    description: String,
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical']
    },
    system: String,
    detectedAt: {
      type: Date,
      default: Date.now
    }
  }],
  estimatedCompletionTime: {
    type: Date,
    required: true
  },
  specialInstructions: {
    fromCustomer: String,
    fromStaff: String,
    safetyPrecautions: [String],
    warningNotes: [String]
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  customerSignature: {
    signatureUrl: String,
    signedAt: Date,
    ipAddress: String
  },
  status: {
    type: String,
    enum: ['received', 'inspected', 'approved', 'in_service', 'completed', 'ready_for_pickup'],
    default: 'received'
  },
  priorityLevel: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  estimatedServiceTime: {
    type: Number, // in minutes
    required: true
  },
  actualServiceTime: Number, // in minutes
  qualityCheck: {
    performed: {
      type: Boolean,
      default: false
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: Date,
    checklist: [{
      item: String,
      checked: Boolean,
      notes: String
    }],
    finalInspectionNotes: String,
    customerSatisfaction: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      feedback: String,
      followUpRequired: Boolean
    }
  },
  invoicing: {
    laborCost: {
      type: Number,
      default: 0
    },
    partsCost: {
      type: Number,
      default: 0
    },
    additionalCharges: [{
      description: String,
      amount: Number
    }],
    totalCost: {
      type: Number,
      default: 0
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    grandTotal: {
      type: Number,
      default: 0
    }
  },
  handoverDetails: {
    handedOverBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    handedOverAt: Date,
    customerSignature: String,
    vehicleConditionAtHandover: String,
    workPerformed: [String],
    followUpInstructions: String,
    warrantyInfo: String,
    nextServiceDue: Date
  },
  
  // Services từ appointment và thêm trong reception
  bookedServices: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    serviceName: String,
    category: String,
    quantity: {
      type: Number,
      default: 1
    },
    estimatedDuration: Number, // minutes
    actualDuration: Number, // minutes
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: Date,
    technicianNotes: String,
    customerInstructions: String,
    qualityCheckPassed: {
      type: Boolean,
      default: false
    }
  }],
  
  additionalServices: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    serviceName: String,
    category: String,
    quantity: {
      type: Number,
      default: 1
    },
    reason: {
      type: String,
      required: true
    },
    discoveredDuring: String, // Which stage was this discovered
    customerApproved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    estimatedCost: Number,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    technicianNotes: String
  }],
  
  // Parts yêu cầu trong reception
  requestedParts: [{
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part',
      required: true
    },
    partName: String,
    partNumber: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    reason: {
      type: String,
      required: true
    },
    urgency: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal'
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    isAvailable: {
      type: Boolean,
      default: false
    },
    availableQuantity: Number,
    shortfall: Number,
    alternativePartSuggested: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part'
    },
    customerApprovalRequired: {
      type: Boolean,
      default: false
    },
    customerApproved: Boolean,
    estimatedCost: Number,
    actualCost: Number
  }],
  
  // Workflow submission và approval
  submissionStatus: {
    submittedToStaff: {
      type: Boolean,
      default: false
    },
    submittedAt: Date,
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    staffReviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'needs_modification', 'partially_approved'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewNotes: String,
    approvalDecision: {
      servicesApproved: [{
        serviceId: mongoose.Schema.Types.ObjectId,
        approved: Boolean,
        reason: String
      }],
      partsApproved: [{
        partId: mongoose.Schema.Types.ObjectId,
        approvedQuantity: Number,
        originalQuantity: Number,
        reason: String
      }],
      estimatedTotalCost: Number,
      customerNotificationRequired: Boolean
    }
  },
  
  // EV Checklist tracking
  evChecklistProgress: {
    checklistInstanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChecklistInstance'
    },
    totalItems: Number,
    completedItems: Number,
    progressPercentage: {
      type: Number,
      default: 0
    },
    safetyItemsCompleted: Number,
    criticalIssuesFound: [{
      item: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      description: String,
      actionTaken: String,
      resolvedAt: Date
    }],
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  },
  
  // Part requests made during service
  additionalPartRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PartRequest'
  }],
  
  // Workflow history tracking
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
    notes: String,
    systemGenerated: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Generate reception number
serviceReceptionSchema.pre('save', async function(next) {
  if (!this.receptionNumber) {
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
    
    this.receptionNumber = `RCP${year}${month}${day}${(count + 1).toString().padStart(3, '0')}`;
  }
  next();
});

// Calculate total costs
serviceReceptionSchema.methods.calculateTotalCost = function() {
  let total = this.invoicing.laborCost + this.invoicing.partsCost;
  
  this.invoicing.additionalCharges.forEach(charge => {
    total += charge.amount;
  });
  
  this.invoicing.totalCost = total;
  this.invoicing.grandTotal = total + this.invoicing.taxAmount;
  
  return this.invoicing.grandTotal;
};

// Update status method
serviceReceptionSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  
  // Log status changes for audit trail
  if (!this.statusHistory) {
    this.statusHistory = [];
  }
  
  this.statusHistory.push({
    status: newStatus,
    changedBy: userId,
    changedAt: new Date()
  });
  
  return this.save();
};

// Submit reception to staff for approval
serviceReceptionSchema.methods.submitToStaff = function(technicianId) {
  this.submissionStatus.submittedToStaff = true;
  this.submissionStatus.submittedAt = new Date();
  this.submissionStatus.submittedBy = technicianId;
  this.submissionStatus.staffReviewStatus = 'pending';
  
  // Add to workflow history
  this.workflowHistory.push({
    status: 'submitted_for_approval',
    changedBy: technicianId,
    changedAt: new Date(),
    reason: 'Technician submitted reception for staff approval',
    systemGenerated: false
  });
  
  return this.save();
};

// Staff approve/reject reception
serviceReceptionSchema.methods.staffReview = function(staffId, decision, notes = '', approvalDetails = {}) {
  this.submissionStatus.reviewedBy = staffId;
  this.submissionStatus.reviewedAt = new Date();
  this.submissionStatus.staffReviewStatus = decision;
  this.submissionStatus.reviewNotes = notes;
  
  if (approvalDetails) {
    this.submissionStatus.approvalDecision = approvalDetails;
  }
  
  // Add to workflow history
  this.workflowHistory.push({
    status: `staff_${decision}`,
    changedBy: staffId,
    changedAt: new Date(),
    reason: `Staff ${decision} the reception`,
    notes: notes,
    systemGenerated: false
  });
  
  return this.save();
};

// Add additional service
serviceReceptionSchema.methods.addAdditionalService = function(serviceData, technicianId) {
  this.additionalServices.push({
    ...serviceData,
    addedBy: technicianId,
    addedAt: new Date()
  });
  
  // Add to workflow history
  this.workflowHistory.push({
    status: 'additional_service_added',
    changedBy: technicianId,
    changedAt: new Date(),
    reason: `Additional service added: ${serviceData.serviceName}`,
    systemGenerated: false
  });
  
  return this.save();
};

// Mark service as completed
serviceReceptionSchema.methods.completeService = function(serviceId, technicianId, notes = '', actualDuration = null) {
  // Find in booked services
  const bookedService = this.bookedServices.find(s => s.serviceId.toString() === serviceId);
  if (bookedService) {
    bookedService.isCompleted = true;
    bookedService.completedBy = technicianId;
    bookedService.completedAt = new Date();
    bookedService.technicianNotes = notes;
    if (actualDuration) bookedService.actualDuration = actualDuration;
  }
  
  // Find in additional services
  const additionalService = this.additionalServices.find(s => s.serviceId.toString() === serviceId);
  if (additionalService) {
    additionalService.isCompleted = true;
    additionalService.technicianNotes = notes;
  }
  
  return this.save();
};

// Update EV checklist progress
serviceReceptionSchema.methods.updateChecklistProgress = function(completedItems, totalItems, criticalIssues = []) {
  this.evChecklistProgress.completedItems = completedItems;
  this.evChecklistProgress.totalItems = totalItems;
  this.evChecklistProgress.progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  if (criticalIssues.length > 0) {
    this.evChecklistProgress.criticalIssuesFound.push(...criticalIssues);
  }
  
  // Check if checklist is completed
  if (completedItems === totalItems && totalItems > 0) {
    this.evChecklistProgress.isCompleted = true;
    this.evChecklistProgress.completedAt = new Date();
  }
  
  return this.save();
};

// Check if reception can be approved
serviceReceptionSchema.methods.canBeApproved = function() {
  return this.submissionStatus.submittedToStaff && 
         this.submissionStatus.staffReviewStatus === 'pending';
};

// Check if work can start
serviceReceptionSchema.methods.canStartWork = function() {
  return this.submissionStatus.staffReviewStatus === 'approved';
};

// Get total estimated cost
serviceReceptionSchema.methods.getEstimatedCost = function() {
  let totalCost = 0;
  
  // Add parts cost
  this.requestedParts.forEach(part => {
    if (part.isApproved && part.estimatedCost) {
      totalCost += part.estimatedCost;
    }
  });
  
  // Add additional services cost
  this.additionalServices.forEach(service => {
    if (service.customerApproved && service.estimatedCost) {
      totalCost += service.estimatedCost;
    }
  });
  
  return totalCost;
};

// Check if all services are completed
serviceReceptionSchema.methods.areAllServicesCompleted = function() {
  const allBookedCompleted = this.bookedServices.every(service => service.isCompleted);
  const allAdditionalCompleted = this.additionalServices.every(service => 
    !service.customerApproved || service.isCompleted
  );
  
  return allBookedCompleted && allAdditionalCompleted;
};

// Create additional part request
serviceReceptionSchema.methods.createAdditionalPartRequest = async function(partRequestData, technicianId) {
  const PartRequest = mongoose.model('PartRequest');
  
  const partRequest = new PartRequest({
    type: 'additional_during_service',
    appointmentId: this.appointmentId,
    serviceReceptionId: this._id,
    requestedBy: technicianId,
    requestedParts: partRequestData.parts,
    urgency: partRequestData.urgency || 'normal',
    requestNotes: partRequestData.notes
  });
  
  await partRequest.save();
  
  // Add reference to this reception
  this.additionalPartRequests.push(partRequest._id);
  
  // Add to workflow history
  this.workflowHistory.push({
    status: 'additional_parts_requested',
    changedBy: technicianId,
    changedAt: new Date(),
    reason: 'Additional parts requested during service',
    notes: partRequestData.notes,
    systemGenerated: false
  });
  
  await this.save();
  return partRequest;
};

// Indexes for efficient querying (receptionNumber already has unique index from schema)
serviceReceptionSchema.index({ appointmentId: 1 });
serviceReceptionSchema.index({ status: 1 });
serviceReceptionSchema.index({ receivedAt: -1 });
serviceReceptionSchema.index({ customerId: 1 });
serviceReceptionSchema.index({ vehicleId: 1 });

export default mongoose.model('ServiceReception', serviceReceptionSchema);