import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
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
  
  // Service items from appointment
  serviceItems: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    serviceName: {
      type: String,
      required: true
    },
    description: String,
    category: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timeSpent: Number, // minutes
    isAdditionalService: {
      type: Boolean,
      default: false
    }
  }],
  
  // Parts used during service
  partItems: [{
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part',
      required: true
    },
    partName: {
      type: String,
      required: true
    },
    partNumber: {
      type: String,
      required: true
    },
    brand: String,
    category: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    isWarrantyItem: {
      type: Boolean,
      default: false
    },
    warrantyPeriod: Number // months
  }],
  
  // Labor charges
  laborCharges: {
    standardLabor: {
      hours: {
        type: Number,
        default: 0
      },
      rate: {
        type: Number,
        default: 0
      },
      amount: {
        type: Number,
        default: 0
      }
    },
    overtimeLabor: {
      hours: {
        type: Number,
        default: 0
      },
      rate: {
        type: Number,
        default: 0
      },
      amount: {
        type: Number,
        default: 0
      }
    },
    totalLaborHours: {
      type: Number,
      default: 0
    },
    totalLaborCost: {
      type: Number,
      default: 0
    }
  },
  
  // Additional charges (fees, discounts, etc.)
  additionalCharges: [{
    description: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['fee', 'discount', 'tax', 'environmental_fee', 'disposal_fee', 'other'],
      required: true
    },
    isPercentage: {
      type: Boolean,
      default: false
    },
    applyTo: {
      type: String,
      enum: ['services', 'parts', 'labor', 'subtotal'],
      default: 'subtotal'
    }
  }],
  
  // Totals calculation
  totals: {
    subtotalServices: {
      type: Number,
      default: 0
    },
    subtotalParts: {
      type: Number,
      default: 0
    },
    subtotalLabor: {
      type: Number,
      default: 0
    },
    subtotalAdditional: {
      type: Number,
      default: 0
    },
    subtotal: {
      type: Number,
      default: 0
    },
    taxRate: {
      type: Number,
      default: 10 // VAT 10% in Vietnam
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    }
  },
  
  // Payment information
  paymentInfo: {
    method: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'e_wallet', 'cheque', 'installment'],
      default: 'cash'
    },
    status: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid', 'overdue', 'refunded'],
      default: 'unpaid'
    },
    dueDate: Date,
    paidAmount: {
      type: Number,
      default: 0
    },
    remainingAmount: {
      type: Number,
      default: 0
    },
    paymentDate: Date,
    transactionRef: String,
    paymentNotes: String,
    installmentPlan: {
      totalInstallments: Number,
      installmentAmount: Number,
      paidInstallments: {
        type: Number,
        default: 0
      },
      nextDueDate: Date
    }
  },
  
  // Customer information (snapshot at time of invoice)
  customerInfo: {
    name: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'Vietnam'
      }
    },
    taxId: String // For business customers
  },
  
  // Vehicle information (snapshot)
  vehicleInfo: {
    make: String,
    model: String,
    year: Number,
    vin: String,
    licensePlate: String,
    mileage: Number
  },
  
  // Invoice metadata
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: Date,
  
  sentToCustomer: {
    type: Boolean,
    default: false
  },
  
  sentAt: Date,
  
  sentVia: {
    type: String,
    enum: ['email', 'sms', 'print', 'portal'],
    default: 'email'
  },
  
  customerViewed: {
    type: Boolean,
    default: false
  },
  
  customerViewedAt: Date,
  
  // Notes and special instructions
  notes: String,
  internalNotes: String,
  customerNotes: String,
  
  // Terms and conditions
  terms: {
    paymentTerms: {
      type: String,
      default: 'Payment due upon receipt'
    },
    warrantyTerms: String,
    additionalTerms: [String]
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft'
  },
  
  // Revision tracking
  revisionNumber: {
    type: Number,
    default: 1
  },
  
  originalInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  
  revisionReason: String,
  
  // Digital signature/verification
  digitalSignature: {
    hash: String,
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    signedAt: Date,
    isValid: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
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
    
    this.invoiceNumber = `INV${year}${month}${day}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Calculate all totals
invoiceSchema.methods.calculateTotals = function() {
  // Calculate service items subtotal
  this.totals.subtotalServices = this.serviceItems.reduce((sum, item) => {
    return sum + (item.totalPrice || 0);
  }, 0);
  
  // Calculate parts subtotal
  this.totals.subtotalParts = this.partItems.reduce((sum, item) => {
    return sum + (item.totalPrice || 0);
  }, 0);
  
  // Calculate labor subtotal
  this.totals.subtotalLabor = this.laborCharges.totalLaborCost || 0;
  
  // Calculate additional charges
  this.totals.subtotalAdditional = this.additionalCharges.reduce((sum, charge) => {
    if (charge.type === 'discount') {
      return sum - Math.abs(charge.amount);
    }
    return sum + charge.amount;
  }, 0);
  
  // Calculate subtotal before tax
  this.totals.subtotal = this.totals.subtotalServices + 
                         this.totals.subtotalParts + 
                         this.totals.subtotalLabor;
  
  // Calculate tax amount
  this.totals.taxAmount = (this.totals.subtotal * this.totals.taxRate) / 100;
  
  // Calculate final total
  this.totals.totalAmount = this.totals.subtotal + 
                           this.totals.taxAmount + 
                           this.totals.subtotalAdditional;
  
  // Update payment remaining amount
  this.paymentInfo.remainingAmount = this.totals.totalAmount - (this.paymentInfo.paidAmount || 0);
  
  return this.totals;
};

// Add service item
invoiceSchema.methods.addServiceItem = function(serviceData) {
  const totalPrice = serviceData.unitPrice * serviceData.quantity;
  
  this.serviceItems.push({
    ...serviceData,
    totalPrice
  });
  
  this.calculateTotals();
  return this.save();
};

// Add part item
invoiceSchema.methods.addPartItem = function(partData) {
  const totalPrice = partData.unitPrice * partData.quantity;
  
  this.partItems.push({
    ...partData,
    totalPrice
  });
  
  this.calculateTotals();
  return this.save();
};

// Record payment
invoiceSchema.methods.recordPayment = function(paymentData) {
  const { amount, method, transactionRef, notes } = paymentData;
  
  this.paymentInfo.paidAmount = (this.paymentInfo.paidAmount || 0) + amount;
  this.paymentInfo.method = method;
  this.paymentInfo.paymentDate = new Date();
  this.paymentInfo.transactionRef = transactionRef;
  this.paymentInfo.paymentNotes = notes;
  
  // Update payment status
  if (this.paymentInfo.paidAmount >= this.totals.totalAmount) {
    this.paymentInfo.status = 'paid';
    this.status = 'paid';
  } else if (this.paymentInfo.paidAmount > 0) {
    this.paymentInfo.status = 'partially_paid';
  }
  
  this.calculateTotals();
  return this.save();
};

// Send to customer
invoiceSchema.methods.sendToCustomer = function(method = 'email') {
  this.sentToCustomer = true;
  this.sentAt = new Date();
  this.sentVia = method;
  this.status = 'sent';
  
  return this.save();
};

// Mark as viewed by customer
invoiceSchema.methods.markAsViewed = function() {
  this.customerViewed = true;
  this.customerViewedAt = new Date();
  if (this.status === 'sent') {
    this.status = 'viewed';
  }
  
  return this.save();
};

// Check if invoice is overdue
invoiceSchema.methods.isOverdue = function() {
  if (!this.paymentInfo.dueDate || this.paymentInfo.status === 'paid') {
    return false;
  }
  
  return new Date() > this.paymentInfo.dueDate;
};

// Create revision
invoiceSchema.methods.createRevision = function(reason) {
  const revision = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    invoiceNumber: undefined, // Will be auto-generated
    revisionNumber: this.revisionNumber + 1,
    originalInvoiceId: this._id,
    revisionReason: reason,
    status: 'draft',
    sentToCustomer: false,
    sentAt: null,
    customerViewed: false,
    customerViewedAt: null
  });
  
  return revision.save();
};

// Indexes for efficient querying (invoiceNumber already has unique index from schema)
invoiceSchema.index({ appointmentId: 1 });
invoiceSchema.index({ customerId: 1 });
invoiceSchema.index({ serviceCenterId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ 'paymentInfo.status': 1 });
invoiceSchema.index({ 'paymentInfo.dueDate': 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ sentAt: -1 });

export default mongoose.model('Invoice', invoiceSchema);