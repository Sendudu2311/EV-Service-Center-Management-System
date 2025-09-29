import mongoose from 'mongoose';

const checklistInstanceSchema = new mongoose.Schema({
  checklistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EVChecklist',
    required: true
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
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'on_hold', 'skipped', 'failed'],
    default: 'pending'
  },
  startedAt: Date,
  completedAt: Date,
  totalTime: {
    type: Number, // in minutes
    default: 0
  },
  items: [{
    stepNumber: Number,
    title: String,
    description: String,
    category: String,
    isRequired: Boolean,
    isSafetyItem: Boolean,
    estimatedTime: Number,
    actualTime: {
      type: Number,
      default: 0
    },
    tools: [{
      name: String,
      isRequired: Boolean,
      isAvailable: Boolean
    }],
    safetyPrecautions: [String],
    expectedResults: [String],
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    result: {
      type: String,
      enum: ['pass', 'fail', 'not_applicable', 'needs_review']
    },
    notes: String,
    photos: [{
      url: String,
      description: String,
      timestamp: Date
    }],
    measurements: [{
      type: String,
      value: mongoose.Schema.Types.Mixed,
      unit: String,
      expectedValue: String,
      withinRange: Boolean,
      timestamp: Date
    }],
    issues: [{
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      action: String,
      reportedAt: Date,
      resolvedAt: Date,
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    subItems: [{
      title: String,
      description: String,
      isRequired: Boolean,
      expectedValue: String,
      actualValue: String,
      measurementType: String,
      isCompleted: Boolean,
      result: {
        type: String,
        enum: ['pass', 'fail', 'not_applicable']
      },
      notes: String
    }],
    reviewRequired: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewNotes: String
  }],
  overallResult: {
    type: String,
    enum: ['pass', 'fail', 'needs_review', 'incomplete'],
    default: 'incomplete'
  },
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  qualityScore: {
    type: Number,
    min: 0,
    max: 100
  },
  supervisorReview: {
    required: {
      type: Boolean,
      default: false
    },
    requestedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    approved: Boolean,
    comments: String,
    additionalActions: [String]
  },
  customerNotification: {
    notified: {
      type: Boolean,
      default: false
    },
    notifiedAt: Date,
    method: {
      type: String,
      enum: ['email', 'sms', 'phone', 'in_person']
    },
    customerApproval: {
      required: Boolean,
      received: Boolean,
      receivedAt: Date,
      signature: String
    }
  },
  exceptions: [{
    itemStepNumber: Number,
    reason: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    alternativeAction: String
  }],
  additionalWork: [{
    description: String,
    category: String,
    estimatedTime: Number,
    actualTime: Number,
    cost: Number,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  finalNotes: String,
  recommendations: [String],
  nextServiceDate: Date,
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDetails: String,
  digitalSignature: {
    technicianSignature: String,
    supervisorSignature: String,
    customerSignature: String,
    signedAt: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
checklistInstanceSchema.index({ appointmentId: 1 });
checklistInstanceSchema.index({ assignedTo: 1 });
checklistInstanceSchema.index({ status: 1 });
checklistInstanceSchema.index({ completedAt: -1 });
checklistInstanceSchema.index({ checklistId: 1 });

// Virtual for completion percentage
checklistInstanceSchema.virtual('completionPercentage').get(function() {
  if (this.items.length === 0) return 0;
  const completedItems = this.items.filter(item => item.isCompleted).length;
  return Math.round((completedItems / this.items.length) * 100);
});

// Virtual for required items completion
checklistInstanceSchema.virtual('requiredItemsCompleted').get(function() {
  const requiredItems = this.items.filter(item => item.isRequired);
  const completedRequired = requiredItems.filter(item => item.isCompleted);
  return {
    completed: completedRequired.length,
    total: requiredItems.length,
    percentage: requiredItems.length > 0 ? Math.round((completedRequired.length / requiredItems.length) * 100) : 100
  };
});

// Method to start checklist
checklistInstanceSchema.methods.startChecklist = function(technicianId) {
  this.status = 'in_progress';
  this.startedAt = new Date();
  this.assignedTo = technicianId;
  
  return this.save();
};

// Method to complete checklist item
checklistInstanceSchema.methods.completeItem = function(stepNumber, result, data = {}) {
  const item = this.items.find(item => item.stepNumber === stepNumber);
  
  if (!item) {
    throw new Error(`Item with step number ${stepNumber} not found`);
  }
  
  item.isCompleted = true;
  item.completedAt = new Date();
  item.completedBy = data.completedBy || this.assignedTo;
  item.result = result;
  item.actualTime = data.actualTime || 0;
  item.notes = data.notes || '';
  item.photos = data.photos || [];
  item.measurements = data.measurements || [];
  item.issues = data.issues || [];
  
  // Update sub-items if provided
  if (data.subItems) {
    data.subItems.forEach(subItemData => {
      const subItem = item.subItems.find(si => si.title === subItemData.title);
      if (subItem) {
        Object.assign(subItem, subItemData);
      }
    });
  }
  
  // Check if review is required
  if (result === 'fail' || result === 'needs_review' || item.isSafetyItem) {
    item.reviewRequired = true;
    this.supervisorReview.required = true;
  }
  
  // Update overall progress
  this.progressPercentage = this.completionPercentage;
  
  // Check if all required items are completed
  const requiredCompletion = this.requiredItemsCompleted;
  if (requiredCompletion.percentage === 100) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.totalTime = this.items.reduce((total, item) => total + (item.actualTime || 0), 0);
    
    // Calculate overall result
    const failedItems = this.items.filter(item => item.result === 'fail');
    const needsReviewItems = this.items.filter(item => item.result === 'needs_review');
    
    if (failedItems.length > 0) {
      this.overallResult = 'fail';
    } else if (needsReviewItems.length > 0) {
      this.overallResult = 'needs_review';
    } else {
      this.overallResult = 'pass';
    }
  }
  
  return this.save();
};

// Method to add issue to item
checklistInstanceSchema.methods.addIssue = function(stepNumber, issue) {
  const item = this.items.find(item => item.stepNumber === stepNumber);
  
  if (!item) {
    throw new Error(`Item with step number ${stepNumber} not found`);
  }
  
  issue.reportedAt = new Date();
  item.issues.push(issue);
  
  // Mark for review if high or critical issue
  if (['high', 'critical'].includes(issue.severity)) {
    item.reviewRequired = true;
    this.supervisorReview.required = true;
  }
  
  return this.save();
};

// Method to request supervisor review
checklistInstanceSchema.methods.requestSupervisorReview = function(reason) {
  this.supervisorReview.required = true;
  this.supervisorReview.requestedAt = new Date();
  this.status = 'on_hold';
  
  return this.save();
};

// Method to complete supervisor review
checklistInstanceSchema.methods.completeSupervisorReview = function(supervisorId, approved, comments) {
  this.supervisorReview.reviewedBy = supervisorId;
  this.supervisorReview.reviewedAt = new Date();
  this.supervisorReview.approved = approved;
  this.supervisorReview.comments = comments;
  
  if (approved) {
    this.status = this.progressPercentage === 100 ? 'completed' : 'in_progress';
  } else {
    this.status = 'failed';
    this.overallResult = 'fail';
  }
  
  return this.save();
};

// Method to calculate quality score
checklistInstanceSchema.methods.calculateQualityScore = function() {
  let score = 0;
  let totalWeight = 0;
  
  this.items.forEach(item => {
    const weight = item.isSafetyItem ? 3 : (item.isRequired ? 2 : 1);
    totalWeight += weight;
    
    if (item.result === 'pass') {
      score += weight * 100;
    } else if (item.result === 'needs_review') {
      score += weight * 70;
    } else if (item.result === 'not_applicable') {
      // Don't count towards score
      totalWeight -= weight;
    }
    // 'fail' adds 0 to score
  });
  
  this.qualityScore = totalWeight > 0 ? Math.round(score / totalWeight) : 0;
  return this.save();
};

// Method to generate completion report
checklistInstanceSchema.methods.generateReport = function() {
  return {
    checklistInfo: {
      id: this._id,
      appointmentId: this.appointmentId,
      status: this.status,
      overallResult: this.overallResult,
      qualityScore: this.qualityScore
    },
    completion: {
      totalItems: this.items.length,
      completedItems: this.items.filter(item => item.isCompleted).length,
      percentage: this.progressPercentage,
      totalTime: this.totalTime,
      estimatedTime: this.items.reduce((total, item) => total + (item.estimatedTime || 0), 0)
    },
    results: {
      passed: this.items.filter(item => item.result === 'pass').length,
      failed: this.items.filter(item => item.result === 'fail').length,
      needsReview: this.items.filter(item => item.result === 'needs_review').length,
      notApplicable: this.items.filter(item => item.result === 'not_applicable').length
    },
    issues: this.items.reduce((issues, item) => {
      return issues.concat(item.issues.map(issue => ({
        ...issue.toObject(),
        stepNumber: item.stepNumber,
        itemTitle: item.title
      })));
    }, []),
    recommendations: this.recommendations,
    additionalWork: this.additionalWork,
    followUpRequired: this.followUpRequired
  };
};

export default mongoose.model('ChecklistInstance', checklistInstanceSchema);