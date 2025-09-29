import mongoose from 'mongoose';

const serviceCenterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service center name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Service center code is required'],
    unique: true,
    uppercase: true
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'Vietnam' }
  },
  contact: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
    website: String
  },
  workingHours: {
    monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
  },
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  capacity: {
    totalBays: { type: Number, required: true, min: 1 },
    availableBays: { type: Number, required: true },
    maxDailyAppointments: { type: Number, required: true }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  amenities: [{
    type: String,
    enum: ['wifi', 'waiting_area', 'coffee', 'charging_station', 'shuttle', 'lounge', 'parking']
  }],
  certifications: [{
    name: String,
    issuer: String,
    validUntil: Date
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
serviceCenterSchema.index({ location: '2dsphere' });

// Virtual for full address
serviceCenterSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
});

export default mongoose.model('ServiceCenter', serviceCenterSchema);