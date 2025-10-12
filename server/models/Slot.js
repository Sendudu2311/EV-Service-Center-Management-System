import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  technicianIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Date and time fields for appointment form compatibility
  date: {
    type: String,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  capacity: {
    type: Number,
    default: 1
  },
  bookedCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['available', 'partially_booked', 'full', 'blocked'],
    default: 'available'
  },
  meta: mongoose.Schema.Types.Mixed
}, { timestamps: true });

slotSchema.methods.canBook = function() {
  return this.status === 'available' || this.status === 'partially_booked';
};

slotSchema.methods.book = function() {
  if (this.bookedCount + 1 >= this.capacity) {
    this.bookedCount = this.capacity;
    this.status = 'full';
  } else {
    this.bookedCount += 1;
    this.status = 'partially_booked';
  }
  return this.save();
};

slotSchema.methods.release = function() {
  this.bookedCount = Math.max(0, this.bookedCount - 1);
  if (this.bookedCount === 0) this.status = 'available';
  else this.status = 'partially_booked';
  return this.save();
};

// Compound unique index to prevent duplicate slots for same time period
slotSchema.index({ date: 1, startTime: 1, endTime: 1 }, { unique: true });
slotSchema.index({ 'technicianIds': 1, date: 1, startTime: 1 });
slotSchema.index({ start: 1, end: 1 });
slotSchema.index({ 'technicianIds': 1, start: 1, end: 1 });

export default mongoose.model('Slot', slotSchema);
