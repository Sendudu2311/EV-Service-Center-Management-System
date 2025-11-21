# Database Models - MongoDB + Mongoose

## Overview

The system uses MongoDB with Mongoose ODM, featuring 17 models with complex relationships and business logic.

## Model Relationships

```
User (Customer/Staff/Technician/Admin)
  ├─ owns → Vehicle (1:many)
  ├─ creates → Appointment (1:many)
  ├─ assigned to → Appointment (Technician) (1:many)
  ├─ has → TechnicianProfile (1:1, technician only)
  ├─ makes → PartRequest (1:many)
  ├─ creates → ServiceReception (1:many)
  ├─ generates → Invoice (1:many)
  └─ makes → Transaction (1:many)

Appointment (Core entity)
  ├─ belongs to → User (Customer)
  ├─ uses → Vehicle
  ├─ assigned to → User (Technician)
  ├─ includes → Service (many:many)
  ├─ books → Slot
  ├─ has → ServiceReception (1:1)
  ├─ has → PartRequest (1:many)
  ├─ generates → Invoice (1:1)
  └─ has → Transaction (1:many)

Part (Inventory)
  ├─ requested in → PartRequest
  ├─ used in → Appointment
  ├─ used in → Invoice
  └─ has replacement → Part (many:many)
```

## Core Models

### 1. User Model (models/User.js - 125 lines)

**File**: `server/models/User.js`

```javascript
const userSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ']
  },
  password: {
    type: String,
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
    select: false // Don't return password by default
  },
  firstName: {
    type: String,
    required: [true, 'Tên là bắt buộc'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Họ là bắt buộc'],
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ']
  },
  role: {
    type: String,
    enum: ['customer', 'staff', 'technician', 'admin'],
    default: 'customer'
  },
  avatar: String,
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allow null values
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  specializations: [String], // For technicians
  certifications: [{
    name: String,
    issuer: String,
    issueDate: Date,
    expiryDate: Date,
    certificateUrl: String
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Indexes
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ resetPasswordToken: 1 });
```

**Key Features**:
- Bcrypt password hashing (10 salt rounds)
- Virtual fullName field
- Google OAuth support
- Role-based access
- Email verification
- Password reset functionality

---

### 2. Appointment Model (models/Appointment.js - 31KB, 800+ lines)

**File**: `server/models/Appointment.js`

This is the most complex model, handling the entire 14-state workflow.

```javascript
const appointmentSchema = new Schema({
  appointmentNumber: {
    type: String,
    unique: true,
    required: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  vehicleId: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
    index: true
  },
  services: [{
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service'
    },
    serviceName: String,
    description: String,
    category: String,
    quantity: {
      type: Number,
      default: 1
    },
    price: Number,
    totalPrice: Number,
    estimatedDuration: Number // in minutes
  }],
  bookingType: {
    type: String,
    enum: ['deposit_booking', 'full_service'],
    default: 'deposit_booking'
  },
  depositInfo: {
    amount: {
      type: Number,
      default: 200000 // 200,000 VND
    },
    paid: {
      type: Boolean,
      default: false
    },
    paidAt: Date,
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'VNPAYTransaction'
    }
  },
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  scheduledTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: [
      'pending',                  // Chờ xác nhận
      'confirmed',                // Đã xác nhận
      'customer_arrived',         // Khách đến
      'reception_created',        // Đã tạo phiếu
      'reception_approved',       // Đã duyệt phiếu
      'parts_insufficient',       // Thiếu linh kiện
      'waiting_for_parts',        // Đợi linh kiện
      'rescheduled',             // Đã lên lại lịch
      'in_progress',             // Đang thực hiện
      'parts_requested',         // Yêu cầu linh kiện thêm
      'completed',               // Hoàn thành
      'invoiced',                // Đã xuất hóa đơn
      'cancelled',               // Đã hủy
      'no_show',                 // Không đến
      'cancel_requested',        // Yêu cầu hủy
      'cancel_approved',         // Chấp thuận hủy
      'cancel_refunded'          // Đã hoàn tiền
    ],
    default: 'pending',
    index: true
  },
  coreStatus: {
    type: String,
    enum: ['Scheduled', 'CheckedIn', 'InService', 'OnHold', 'ReadyForPickup', 'Closed'],
    default: 'Scheduled',
    index: true
  },
  reasonCode: {
    type: String,
    enum: [
      'parts_shortage',          // Thiếu linh kiện
      'customer_request',        // Khách yêu cầu
      'technician_unavailable',  // Kỹ thuật viên không có
      'equipment_malfunction',   // Thiết bị hỏng
      'requires_external_service', // Cần dịch vụ bên ngoài
      'customer_no_show',        // Khách không đến
      'weather_conditions',      // Thời tiết
      'payment_issue',           // Vấn đề thanh toán
      'other'
    ]
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  assignedTechnician: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  estimatedCompletion: Date,
  actualCompletion: Date,
  customerNotes: String,
  internalNotes: String, // Staff/technician only
  serviceNotes: [{
    note: String,
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  checklistItems: [{
    item: String,
    category: String,
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: Date
  }],
  partsUsed: [{
    partId: {
      type: Schema.Types.ObjectId,
      ref: 'Part'
    },
    partName: String,
    partNumber: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    installedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    installedAt: Date
  }],
  images: [{
    url: String,
    description: String,
    category: {
      type: String,
      enum: ['before', 'during', 'after', 'damage', 'part', 'other']
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentInfo: {
    transactionRef: String,
    paymentMethod: String,
    paidAmount: Number,
    paymentDate: Date
  },
  transactions: [{
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  reschedulingInfo: {
    reason: String,
    reasonCode: String,
    previousDate: Date,
    previousTime: String,
    rescheduledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    rescheduledAt: Date
  },
  cancellationInfo: {
    reason: String,
    reasonCode: String,
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    refundAmount: Number,
    refundStatus: String
  },
  cancelRequest: {
    requestedAt: Date,
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    refundPercentage: Number,
    refundMethod: {
      type: String,
      enum: ['cash', 'bank_transfer']
    },
    customerBankInfo: {
      bankName: String,
      accountNumber: String,
      accountHolder: String,
      bankProofUrl: String // Image of bank account proof
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String,
    refundProcessedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    refundProcessedAt: Date,
    refundProofUrl: String, // Image of refund proof
    previousStatus: String // Status before cancellation
  },
  workflowHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    reason: String
  }],
  notificationsSent: {
    confirmation: {
      type: Boolean,
      default: false
    },
    reminder: {
      type: Boolean,
      default: false
    },
    completion: {
      type: Boolean,
      default: false
    },
    invoice: {
      type: Boolean,
      default: false
    }
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
appointmentSchema.index({ customerId: 1, scheduledDate: -1 });
appointmentSchema.index({ status: 1, coreStatus: 1 });
appointmentSchema.index({ assignedTechnician: 1, status: 1 });
appointmentSchema.index({ scheduledDate: -1 });

// Virtual: Check if overdue
appointmentSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > new Date(this.scheduledDate);
});

// Virtual: Formatted scheduled date
appointmentSchema.virtual('formattedScheduledDate').get(function() {
  return new Date(this.scheduledDate).toLocaleDateString('vi-VN');
});

// Method: Generate appointment number
appointmentSchema.methods.generateAppointmentNumber = async function() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const count = await this.constructor.countDocuments({
    createdAt: {
      $gte: new Date(today.setHours(0, 0, 0, 0)),
      $lt: new Date(today.setHours(23, 59, 59, 999))
    }
  });

  const sequence = String(count + 1).padStart(3, '0');
  this.appointmentNumber = `APT${dateStr}${sequence}`;
};

// Method: Calculate total amount
appointmentSchema.methods.calculateTotalAmount = function() {
  const servicesTotal = this.services.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const partsTotal = this.partsUsed.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  this.totalAmount = servicesTotal + partsTotal;
  return this.totalAmount;
};

// Method: Validate status transition
appointmentSchema.methods.canTransitionTo = function(newStatus) {
  const validTransitions = {
    pending: ['confirmed', 'cancelled', 'cancel_requested'],
    confirmed: ['customer_arrived', 'cancelled', 'rescheduled', 'no_show', 'cancel_requested'],
    customer_arrived: ['reception_created', 'cancelled'],
    reception_created: ['reception_approved', 'parts_insufficient'],
    reception_approved: ['in_progress'],
    parts_insufficient: ['waiting_for_parts', 'rescheduled'],
    waiting_for_parts: ['in_progress'],
    in_progress: ['parts_requested', 'completed'],
    parts_requested: ['in_progress'],
    completed: ['invoiced'],
    invoiced: [],
    cancelled: [],
    no_show: [],
    cancel_requested: ['cancel_approved', 'confirmed'],
    cancel_approved: ['cancel_refunded'],
    cancel_refunded: []
  };

  return validTransitions[this.status]?.includes(newStatus) || false;
};

// Method: Add to workflow history
appointmentSchema.methods.addToHistory = async function(status, userId, notes, reason) {
  this.workflowHistory.push({
    status,
    changedBy: userId,
    notes,
    reason,
    timestamp: new Date()
  });
};

// Method: Calculate refund amount
appointmentSchema.methods.calculateRefundAmount = function(hoursBefore) {
  let percentage;

  if (hoursBefore >= 24) percentage = 100;
  else if (hoursBefore >= 12) percentage = 70;
  else if (hoursBefore >= 6) percentage = 50;
  else percentage = 30;

  return percentage;
};

// Method: Check if reschedulable
appointmentSchema.methods.isReschedulable = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

// Method: Check if cancellable
appointmentSchema.methods.isCancellable = function() {
  return [
    'pending',
    'confirmed',
    'customer_arrived',
    'reception_created'
  ].includes(this.status);
};

// Pre-save hook: Auto-generate appointment number
appointmentSchema.pre('save', async function(next) {
  if (this.isNew && !this.appointmentNumber) {
    await this.generateAppointmentNumber();
  }
  next();
});

// Pre-save hook: Update core status based on detailed status
appointmentSchema.pre('save', function(next) {
  const statusMapping = {
    pending: 'Scheduled',
    confirmed: 'Scheduled',
    rescheduled: 'Scheduled',
    customer_arrived: 'CheckedIn',
    reception_created: 'CheckedIn',
    reception_approved: 'InService',
    in_progress: 'InService',
    parts_requested: 'InService',
    parts_insufficient: 'OnHold',
    waiting_for_parts: 'OnHold',
    completed: 'ReadyForPickup',
    invoiced: 'ReadyForPickup',
    cancelled: 'Closed',
    no_show: 'Closed',
    cancel_requested: 'Closed',
    cancel_approved: 'Closed',
    cancel_refunded: 'Closed'
  };

  this.coreStatus = statusMapping[this.status] || 'Scheduled';
  next();
});
```

**Key Features**:
- 14 detailed statuses + 6 core statuses
- Automatic appointment number generation: `APT + YYYYMMDD + sequence`
- Status transition validation
- Workflow history tracking
- Refund calculation based on cancellation time
- Virtual fields (isOverdue, formattedScheduledDate)
- Compound indexes for performance
- Bank transfer refund support

---

[Continue with remaining models in next file due to length...]
