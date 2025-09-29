import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import ServiceCenter from '../models/ServiceCenter.js';
import Service from '../models/Service.js';
import Vehicle from '../models/Vehicle.js';
import Appointment from '../models/Appointment.js';
import Part from '../models/Part.js';
import TechnicianProfile from '../models/TechnicianProfile.js';
import ServiceReception from '../models/ServiceReception.js';
import EVChecklist from '../models/EVChecklist.js';
import ChecklistInstance from '../models/ChecklistInstance.js';
import PartRequest from '../models/PartRequest.js';
import Invoice from '../models/Invoice.js';

// Load env vars
dotenv.config();

// Connect to DB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
};

// Clear existing data (optional)
const clearData = async () => {
  try {
    await Invoice.deleteMany({});
    await PartRequest.deleteMany({});
    await ChecklistInstance.deleteMany({});
    await EVChecklist.deleteMany({});
    await ServiceReception.deleteMany({});
    await TechnicianProfile.deleteMany({});
    await Appointment.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});
    await ServiceCenter.deleteMany({});
    await Service.deleteMany({});
    await Part.deleteMany({});
    console.log('Existing data cleared');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};

// Create comprehensive services
const createServices = async () => {
  try {
    const services = [
      // Battery Services
      {
        name: 'Battery Health Check',
        code: 'BAT001',
        description: 'Comprehensive battery health assessment and diagnostic',
        category: 'battery',
        subcategory: 'diagnostic',
        basePrice: 200000,
        estimatedDuration: 60,
        skillLevel: 'intermediate',
        requiredCertifications: ['EV Battery Certification'],
        checklist: [
          { step: 'Check battery voltage', category: 'preparation', isRequired: true, estimatedTime: 15 },
          { step: 'Test charging capacity', category: 'execution', isRequired: true, estimatedTime: 30 },
          { step: 'Inspect battery connections', category: 'verification', isRequired: true, estimatedTime: 15 }
        ],
        warranty: { duration: 30, description: '30 days warranty on diagnostic results' },
        tags: ['battery', 'diagnostic', 'health-check']
      },
      {
        name: 'Battery Replacement',
        code: 'BAT002',
        description: 'Complete battery pack replacement service',
        category: 'battery',
        subcategory: 'replacement',
        basePrice: 15000000,
        estimatedDuration: 240,
        skillLevel: 'expert',
        requiredCertifications: ['EV Battery Certification', 'High Voltage Safety'],
        checklist: [
          { step: 'Safety protocol setup', category: 'safety', isRequired: true, estimatedTime: 30 },
          { step: 'Remove old battery pack', category: 'execution', isRequired: true, estimatedTime: 90 },
          { step: 'Install new battery pack', category: 'execution', isRequired: true, estimatedTime: 90 },
          { step: 'System calibration', category: 'verification', isRequired: true, estimatedTime: 30 }
        ],
        warranty: { duration: 365, description: '1 year warranty on battery replacement' },
        tags: ['battery', 'replacement', 'major-service']
      },

      // Motor Services
      {
        name: 'Motor Diagnostic',
        code: 'MOT001',
        description: 'Electric motor performance diagnostic and analysis',
        category: 'motor',
        subcategory: 'diagnostic',
        basePrice: 300000,
        estimatedDuration: 90,
        skillLevel: 'intermediate',
        requiredCertifications: ['EV Motor Systems'],
        checklist: [
          { step: 'Motor performance test', category: 'execution', isRequired: true, estimatedTime: 45 },
          { step: 'Check motor mounts', category: 'verification', isRequired: true, estimatedTime: 20 },
          { step: 'Inspect wiring harness', category: 'verification', isRequired: true, estimatedTime: 25 }
        ],
        warranty: { duration: 30, description: '30 days warranty on diagnostic' },
        tags: ['motor', 'diagnostic', 'performance']
      },
      {
        name: 'Motor Repair',
        code: 'MOT002',
        description: 'Electric motor repair and maintenance service',
        category: 'motor',
        subcategory: 'repair',
        basePrice: 2500000,
        estimatedDuration: 300,
        skillLevel: 'expert',
        requiredCertifications: ['EV Motor Systems', 'Advanced Electrical'],
        checklist: [
          { step: 'Disassemble motor components', category: 'preparation', isRequired: true, estimatedTime: 90 },
          { step: 'Replace worn parts', category: 'execution', isRequired: true, estimatedTime: 120 },
          { step: 'Reassemble and test', category: 'verification', isRequired: true, estimatedTime: 90 }
        ],
        warranty: { duration: 180, description: '6 months warranty on motor repair' },
        tags: ['motor', 'repair', 'major-service']
      },

      // Charging Services
      {
        name: 'Charging System Diagnostic',
        code: 'CHG001',
        description: 'Complete charging system inspection and diagnostic',
        category: 'charging',
        subcategory: 'diagnostic',
        basePrice: 250000,
        estimatedDuration: 75,
        skillLevel: 'intermediate',
        requiredCertifications: ['EV Charging Systems'],
        checklist: [
          { step: 'Test onboard charger', category: 'execution', isRequired: true, estimatedTime: 30 },
          { step: 'Check charging port', category: 'verification', isRequired: true, estimatedTime: 20 },
          { step: 'Verify charging protocols', category: 'verification', isRequired: true, estimatedTime: 25 }
        ],
        warranty: { duration: 30, description: '30 days warranty on diagnostic' },
        tags: ['charging', 'diagnostic', 'onboard-charger']
      },
      {
        name: 'Charging Port Repair',
        code: 'CHG002',
        description: 'Charging port maintenance and repair service',
        category: 'charging',
        subcategory: 'repair',
        basePrice: 800000,
        estimatedDuration: 120,
        skillLevel: 'intermediate',
        requiredCertifications: ['EV Charging Systems'],
        checklist: [
          { step: 'Remove damaged port', category: 'preparation', isRequired: true, estimatedTime: 45 },
          { step: 'Install new charging port', category: 'execution', isRequired: true, estimatedTime: 60 },
          { step: 'Test charging functionality', category: 'verification', isRequired: true, estimatedTime: 15 }
        ],
        warranty: { duration: 90, description: '3 months warranty on charging port' },
        tags: ['charging', 'port', 'repair']
      },

      // Electronics Services
      {
        name: 'Electronics Diagnostic',
        code: 'ELC001',
        description: 'Complete vehicle electronics system diagnostic',
        category: 'electronics',
        subcategory: 'diagnostic',
        basePrice: 350000,
        estimatedDuration: 90,
        skillLevel: 'advanced',
        requiredCertifications: ['EV Electronics', 'Automotive Diagnostics'],
        checklist: [
          { step: 'OBD system scan', category: 'execution', isRequired: true, estimatedTime: 30 },
          { step: 'Check control modules', category: 'execution', isRequired: true, estimatedTime: 40 },
          { step: 'Test communication networks', category: 'verification', isRequired: true, estimatedTime: 20 }
        ],
        warranty: { duration: 30, description: '30 days warranty on diagnostic' },
        tags: ['electronics', 'diagnostic', 'obd', 'modules']
      },

      // General Services
      {
        name: 'Annual Maintenance',
        code: 'GEN001',
        description: 'Comprehensive annual maintenance service',
        category: 'general',
        subcategory: 'maintenance',
        basePrice: 800000,
        estimatedDuration: 180,
        skillLevel: 'intermediate',
        requiredCertifications: ['General EV Maintenance'],
        checklist: [
          { step: 'Multi-point inspection', category: 'execution', isRequired: true, estimatedTime: 60 },
          { step: 'Fluid level checks', category: 'execution', isRequired: true, estimatedTime: 30 },
          { step: 'Brake system check', category: 'safety', isRequired: true, estimatedTime: 45 },
          { step: 'Tire rotation and inspection', category: 'execution', isRequired: true, estimatedTime: 45 }
        ],
        warranty: { duration: 90, description: '3 months warranty on maintenance service' },
        tags: ['maintenance', 'annual', 'comprehensive', 'inspection']
      },
      {
        name: 'Pre-Purchase Inspection',
        code: 'GEN002',
        description: 'Thorough inspection for used EV purchase',
        category: 'general',
        subcategory: 'inspection',
        basePrice: 500000,
        estimatedDuration: 120,
        skillLevel: 'advanced',
        requiredCertifications: ['EV Inspector Certification'],
        checklist: [
          { step: 'Battery health assessment', category: 'execution', isRequired: true, estimatedTime: 45 },
          { step: 'Motor performance check', category: 'execution', isRequired: true, estimatedTime: 30 },
          { step: 'Body and interior inspection', category: 'verification', isRequired: true, estimatedTime: 45 }
        ],
        warranty: { duration: 14, description: '14 days warranty on inspection report' },
        tags: ['inspection', 'pre-purchase', 'assessment', 'used-car']
      }
    ];

    const createdServices = [];
    for (const service of services) {
      const exists = await Service.findOne({ code: service.code });
      if (!exists) {
        const newService = await Service.create(service);
        createdServices.push(newService);
      } else {
        createdServices.push(exists);
      }
    }
    console.log(`✅ ${createdServices.length} services created successfully`);
    return createdServices;
  } catch (error) {
    console.error('Error creating services:', error);
    throw error;
  }
};

// Create service centers
const createServiceCenters = async (services) => {
  try {
    const serviceCenters = [
      {
        name: 'EV Central Service Hub',
        code: 'SC001',
        address: {
          street: '123 Nguyen Hue Boulevard',
          city: 'Ho Chi Minh City',
          state: 'Ho Chi Minh',
          zipCode: '70000',
          country: 'Vietnam'
        },
        contact: {
          phone: '+84-28-1234-5678',
          email: 'central@evservice.com',
          website: 'https://evservice.com'
        },
        location: {
          type: 'Point',
          coordinates: [106.7017, 10.7756] // District 1, HCMC
        },
        capacity: {
          totalBays: 15,
          availableBays: 15,
          maxDailyAppointments: 30
        },
        services: services.map(service => service._id),
        workingHours: {
          monday: { open: '07:00', close: '18:00', isOpen: true },
          tuesday: { open: '07:00', close: '18:00', isOpen: true },
          wednesday: { open: '07:00', close: '18:00', isOpen: true },
          thursday: { open: '07:00', close: '18:00', isOpen: true },
          friday: { open: '07:00', close: '18:00', isOpen: true },
          saturday: { open: '08:00', close: '17:00', isOpen: true },
          sunday: { open: '09:00', close: '15:00', isOpen: true }
        },
        amenities: ['wifi', 'waiting_area', 'coffee', 'parking', 'shuttle', 'lounge'],
        certifications: [
          { name: 'ISO 9001:2015', issuer: 'ISO', validUntil: new Date('2025-12-31') },
          { name: 'EV Service Excellence', issuer: 'EV Association', validUntil: new Date('2025-06-30') }
        ],
        isActive: true
      },
      {
        name: 'EV District 7 Branch',
        code: 'SC002',
        address: {
          street: '456 Nguyen Thi Thap Street',
          city: 'Ho Chi Minh City',
          state: 'Ho Chi Minh',
          zipCode: '70000',
          country: 'Vietnam'
        },
        contact: {
          phone: '+84-28-2345-6789',
          email: 'district7@evservice.com',
          website: 'https://evservice.com'
        },
        location: {
          type: 'Point',
          coordinates: [106.6954, 10.7355] // District 7, HCMC
        },
        capacity: {
          totalBays: 10,
          availableBays: 10,
          maxDailyAppointments: 20
        },
        services: services.filter(s => s.category !== 'motor').map(service => service._id), // Smaller branch, no major motor services
        workingHours: {
          monday: { open: '08:00', close: '17:00', isOpen: true },
          tuesday: { open: '08:00', close: '17:00', isOpen: true },
          wednesday: { open: '08:00', close: '17:00', isOpen: true },
          thursday: { open: '08:00', close: '17:00', isOpen: true },
          friday: { open: '08:00', close: '17:00', isOpen: true },
          saturday: { open: '08:00', close: '14:00', isOpen: true },
          sunday: { open: '', close: '', isOpen: false }
        },
        amenities: ['wifi', 'waiting_area', 'parking', 'charging_station'],
        certifications: [
          { name: 'EV Service Excellence', issuer: 'EV Association', validUntil: new Date('2025-06-30') }
        ],
        isActive: true
      }
    ];

    const createdServiceCenters = [];
    for (const center of serviceCenters) {
      const exists = await ServiceCenter.findOne({ code: center.code });
      if (!exists) {
        const newCenter = await ServiceCenter.create(center);
        createdServiceCenters.push(newCenter);
      } else {
        createdServiceCenters.push(exists);
      }
    }
    console.log(`✅ ${createdServiceCenters.length} service centers created successfully`);
    return createdServiceCenters;
  } catch (error) {
    console.error('Error creating service centers:', error);
    throw error;
  }
};

// Create users with different roles
const createUsers = async (serviceCenters) => {
  try {
    const users = [
      // Admin User - Enhanced with strong password
      {
        email: 'admin@evservice.com',
        password: 'Admin123!@#',
        firstName: 'System',
        lastName: 'Administrator',
        phone: '0901234567', // Vietnamese format
        role: 'admin',
        serviceCenterId: serviceCenters[0]._id,
        isActive: true,
        lastLogin: new Date()
      },

      // Staff Users - Enhanced with Vietnamese names and proper phone format
      {
        email: 'staff.central@evservice.com',
        password: 'Staff123!@#',
        firstName: 'Nguyễn Thị',
        lastName: 'Mai',
        phone: '0902345678', // Vietnamese format
        role: 'staff',
        serviceCenterId: serviceCenters[0]._id,
        isActive: true,
        lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        email: 'staff.d7@evservice.com',
        password: 'Staff123!@#',
        firstName: 'Trần Văn',
        lastName: 'Đức',
        phone: '0903456789', // Vietnamese format
        role: 'staff',
        serviceCenterId: serviceCenters[1]._id,
        isActive: true,
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },

      // Technician Users - Enhanced with proper certifications structure
      {
        email: 'tech1@evservice.com',
        password: 'Tech123!@#',
        firstName: 'Lê Minh',
        lastName: 'An',
        phone: '0904567890', // Vietnamese format
        role: 'technician',
        serviceCenterId: serviceCenters[0]._id,
        specializations: ['battery', 'motor', 'charging'],
        certifications: [
          {
            name: 'EV Battery Certification',
            issuer: 'EV Institute Vietnam',
            issueDate: new Date('2023-01-01'),
            expiryDate: new Date('2026-01-01'),
            certificateUrl: 'https://certificates.evinstitute.vn/battery/cert-001'
          },
          {
            name: 'High Voltage Safety Level 3',
            issuer: 'Vietnam Safety Council',
            issueDate: new Date('2023-06-01'),
            expiryDate: new Date('2025-06-01'),
            certificateUrl: 'https://certificates.safety.vn/hv3/cert-001'
          }
        ],
        isActive: true,
        lastLogin: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        email: 'tech2@evservice.com',
        password: 'Tech123!@#',
        firstName: 'Phạm Thị',
        lastName: 'Linh',
        phone: '0905678901', // Vietnamese format
        role: 'technician',
        serviceCenterId: serviceCenters[0]._id,
        specializations: ['electronics', 'general'],
        certifications: [
          {
            name: 'EV Electronics Specialist',
            issuer: 'EV Institute Vietnam',
            issueDate: new Date('2023-03-01'),
            expiryDate: new Date('2026-03-01'),
            certificateUrl: 'https://certificates.evinstitute.vn/electronics/cert-002'
          },
          {
            name: 'Automotive Diagnostics Advanced',
            issuer: 'Vietnam Auto Academy',
            issueDate: new Date('2022-12-01'),
            expiryDate: new Date('2025-12-01'),
            certificateUrl: 'https://certificates.autoacademy.vn/diag/cert-002'
          }
        ],
        isActive: true,
        lastLogin: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      },
      {
        email: 'tech3@evservice.com',
        password: 'Tech123!@#',
        firstName: 'Võ Minh',
        lastName: 'Khang',
        phone: '0906789012', // Vietnamese format
        role: 'technician',
        serviceCenterId: serviceCenters[1]._id,
        specializations: ['charging', 'electronics', 'general'],
        certifications: [
          {
            name: 'EV Charging Systems Expert',
            issuer: 'EV Institute Vietnam',
            issueDate: new Date('2023-02-01'),
            expiryDate: new Date('2026-02-01'),
            certificateUrl: 'https://certificates.evinstitute.vn/charging/cert-003'
          }
        ],
        isActive: true
      },

      // Customer Users - Enhanced with Vietnamese customer profiles
      {
        email: 'customer1@gmail.com',
        password: 'Customer123!@#',
        firstName: 'Nguyễn Văn',
        lastName: 'Hùng',
        phone: '0907890123', // Vietnamese format
        role: 'customer',
        isActive: true,
        lastLogin: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
      },
      {
        email: 'customer2@gmail.com',
        password: 'Customer123!@#',
        firstName: 'Trần Thị',
        lastName: 'Lan',
        phone: '0908901234', // Vietnamese format
        role: 'customer',
        isActive: true,
        lastLogin: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      },
      {
        email: 'customer3@gmail.com',
        password: 'Customer123!@#',
        firstName: 'Lê Minh',
        lastName: 'Tuấn',
        phone: '0909012345', // Vietnamese format
        role: 'customer',
        isActive: true,
        lastLogin: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      },
      {
        email: 'customer4@gmail.com',
        password: 'Customer123!@#',
        firstName: 'Phạm Thị',
        lastName: 'Hoa',
        phone: '0930123456', // Vietnamese format
        role: 'customer',
        isActive: true,
        lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        email: 'customer5@gmail.com',
        password: 'Customer123!@#',
        firstName: 'Hoàng Văn',
        lastName: 'Nam',
        phone: '0931234567', // Vietnamese format
        role: 'customer',
        isActive: true,
        lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
      }
    ];

    const createdUsers = [];
    for (const user of users) {
      const exists = await User.findOne({ email: user.email });
      if (!exists) {
        const newUser = await User.create(user);
        createdUsers.push(newUser);
      } else {
        createdUsers.push(exists);
      }
    }

    // Update service center managers
    if (createdUsers.length > 0) {
      const adminUser = createdUsers.find(u => u.role === 'admin');
      const staff1 = createdUsers.find(u => u.email === 'staff.central@evservice.com');
      const staff2 = createdUsers.find(u => u.email === 'staff.d7@evservice.com');

      if (adminUser && staff1) {
        await ServiceCenter.findByIdAndUpdate(serviceCenters[0]._id, { manager: staff1._id });
      }
      if (adminUser && staff2) {
        await ServiceCenter.findByIdAndUpdate(serviceCenters[1]._id, { manager: staff2._id });
      }
    }

    console.log(`✅ ${createdUsers.length} users created successfully`);
    return createdUsers;
  } catch (error) {
    console.error('Error creating users:', error);
    throw error;
  }
};

// Create technician profiles for technician users
const createTechnicianProfiles = async (users) => {
  try {
    const technicians = users.filter(u => u.role === 'technician');
    
    const profiles = [
      {
        technicianId: technicians[0]._id,
        employeeId: 'TECH0001',
        workShift: {
          type: 'morning',
          startTime: '07:00',
          endTime: '16:00',
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        },
        skillMatrix: [
          { serviceCategory: 'battery', proficiencyLevel: 5, certifiedAt: new Date('2023-01-01'), lastAssessment: new Date('2024-11-01') },
          { serviceCategory: 'motor', proficiencyLevel: 4, certifiedAt: new Date('2023-01-01'), lastAssessment: new Date('2024-11-01') },
          { serviceCategory: 'charging', proficiencyLevel: 5, certifiedAt: new Date('2023-01-01'), lastAssessment: new Date('2024-11-01') }
        ],
        performance: {
          efficiency: 85,
          qualityRating: 4.8,
          customerRating: 4.9,
          completedJobs: 156,
          averageCompletionTime: 95
        },
        workload: {
          current: 3,
          capacity: 8,
          queuedAppointments: []
        },
        availability: {
          status: 'available',
          scheduleNotes: 'Available for all EV services'
        }
      },
      {
        technicianId: technicians[1]._id,
        employeeId: 'TECH0002',
        workShift: {
          type: 'flexible',
          startTime: '08:00',
          endTime: '17:00',
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        },
        skillMatrix: [
          { serviceCategory: 'electronics', proficiencyLevel: 5, certifiedAt: new Date('2023-03-01'), lastAssessment: new Date('2024-11-01') },
          { serviceCategory: 'general', proficiencyLevel: 4, certifiedAt: new Date('2023-03-01'), lastAssessment: new Date('2024-11-01') },
          { serviceCategory: 'charging', proficiencyLevel: 3, certifiedAt: new Date('2023-06-01'), lastAssessment: new Date('2024-11-01') }
        ],
        performance: {
          efficiency: 92,
          qualityRating: 4.9,
          customerRating: 4.7,
          completedJobs: 203,
          averageCompletionTime: 88
        },
        workload: {
          current: 2,
          capacity: 6,
          queuedAppointments: []
        },
        availability: {
          status: 'available',
          scheduleNotes: 'Specializes in electronics and diagnostics'
        }
      },
      {
        technicianId: technicians[2]._id,
        employeeId: 'TECH0003',
        workShift: {
          type: 'afternoon',
          startTime: '08:00',
          endTime: '17:00',
          daysOfWeek: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        },
        skillMatrix: [
          { serviceCategory: 'charging', proficiencyLevel: 5, certifiedAt: new Date('2023-02-01'), lastAssessment: new Date('2024-11-01') },
          { serviceCategory: 'electronics', proficiencyLevel: 3, certifiedAt: new Date('2023-08-01'), lastAssessment: new Date('2024-11-01') },
          { serviceCategory: 'general', proficiencyLevel: 4, certifiedAt: new Date('2023-02-01'), lastAssessment: new Date('2024-11-01') }
        ],
        performance: {
          efficiency: 78,
          qualityRating: 4.6,
          customerRating: 4.5,
          completedJobs: 89,
          averageCompletionTime: 102
        },
        workload: {
          current: 1,
          capacity: 5,
          queuedAppointments: []
        },
        availability: {
          status: 'available',
          scheduleNotes: 'Part-time schedule, charging specialist'
        }
      }
    ];

    const createdProfiles = [];
    for (const profile of profiles) {
      const exists = await TechnicianProfile.findOne({ technicianId: profile.technicianId });
      if (!exists) {
        const newProfile = await TechnicianProfile.create(profile);
        createdProfiles.push(newProfile);
      } else {
        createdProfiles.push(exists);
      }
    }
    
    console.log(`✅ ${createdProfiles.length} technician profiles created successfully`);
    return createdProfiles;
  } catch (error) {
    console.error('Error creating technician profiles:', error);
    throw error;
  }
};

// Create EV service checklists
const createEVChecklists = async () => {
  try {
    const checklists = [
      {
        name: 'Battery Health Assessment',
        code: 'CHK-BAT-001',
        description: 'Comprehensive battery health check and diagnostic procedure',
        category: 'battery_check',
        serviceTypes: ['battery'],
        applicableVehicleTypes: [
          { make: 'Tesla', model: 'Model 3', year: { from: 2020, to: 2024 }, batteryType: 'lithium-ion' },
          { make: 'Tesla', model: 'Model Y', year: { from: 2020, to: 2024 }, batteryType: 'lithium-ion' },
          { make: 'VinFast', model: 'VF e34', year: { from: 2022, to: 2024 }, batteryType: 'lithium-ion' },
          { make: 'Hyundai', model: 'IONIQ 5', year: { from: 2022, to: 2024 }, batteryType: 'lithium-ion' }
        ],
        estimatedDuration: 60,
        skillLevel: 'intermediate',
        safetyRequirements: [
          'High voltage safety certification required',
          'Insulated gloves mandatory',
          'Safety glasses required',
          'Fire extinguisher on standby'
        ],
        checklistItems: [
          {
            stepNumber: 1,
            title: 'Safety Protocol Setup',
            description: 'Establish safety perimeter and don protective equipment',
            category: 'safety',
            isRequired: true,
            estimatedTime: 10,
            qualityCriteria: 'All safety equipment properly worn and tested',
            skillLevel: 'beginner'
          },
          {
            stepNumber: 2,
            title: 'Battery Voltage Check',
            description: 'Measure battery pack voltage using calibrated multimeter',
            category: 'testing',
            isRequired: true,
            estimatedTime: 15,
            qualityCriteria: 'Voltage within manufacturer specifications',
            skillLevel: 'intermediate'
          },
          {
            stepNumber: 3,
            title: 'Cell Balance Analysis',
            description: 'Check individual cell voltages for balance and degradation',
            category: 'inspection',
            isRequired: true,
            estimatedTime: 20,
            qualityCriteria: 'Cell voltage variance less than 50mV',
            skillLevel: 'intermediate'
          },
          {
            stepNumber: 4,
            title: 'Charging Capacity Test',
            description: 'Test battery charging capacity and efficiency',
            category: 'testing',
            isRequired: true,
            estimatedTime: 10,
            qualityCriteria: 'Charging capacity within 95% of rated capacity',
            skillLevel: 'intermediate'
          },
          {
            stepNumber: 5,
            title: 'Thermal Management Check',
            description: 'Verify cooling system operation and thermal sensors',
            category: 'verification',
            isRequired: true,
            estimatedTime: 5,
            qualityCriteria: 'All thermal sensors responding within normal range',
            skillLevel: 'beginner'
          }
        ],
        version: '2.1',
        effectiveDate: new Date('2024-01-01'),
        createdBy: 'System Administrator'
      },
      {
        name: 'Motor Performance Diagnostic',
        code: 'CHK-MOT-001',
        description: 'Electric motor performance analysis and diagnostic procedure',
        category: 'motor_check',
        serviceTypes: ['motor'],
        applicableVehicleTypes: [
          { make: 'Tesla', model: 'Model 3', year: { from: 2020, to: 2024 }, batteryType: 'lithium-ion' },
          { make: 'Tesla', model: 'Model Y', year: { from: 2020, to: 2024 }, batteryType: 'lithium-ion' },
          { make: 'VinFast', model: 'VF e34', year: { from: 2022, to: 2024 }, batteryType: 'lithium-ion' }
        ],
        estimatedDuration: 90,
        skillLevel: 'advanced',
        safetyRequirements: [
          'Motor systems certification required',
          'Vehicle must be properly secured',
          'High voltage disconnection required'
        ],
        checklistItems: [
          {
            stepNumber: 1,
            title: 'Pre-Test Safety Check',
            description: 'Ensure vehicle is secure and high voltage is disconnected',
            category: 'safety',
            isRequired: true,
            estimatedTime: 15,
            qualityCriteria: 'High voltage isolation confirmed',
            skillLevel: 'intermediate'
          },
          {
            stepNumber: 2,
            title: 'Motor Mount Inspection',
            description: 'Check motor mounting points for wear and proper torque',
            category: 'inspection',
            isRequired: true,
            estimatedTime: 20,
            qualityCriteria: 'All mounts secure, no visible wear or damage',
            skillLevel: 'beginner'
          },
          {
            stepNumber: 3,
            title: 'Performance Analysis',
            description: 'Test motor performance under various load conditions',
            category: 'testing',
            isRequired: true,
            estimatedTime: 45,
            qualityCriteria: 'Performance within manufacturer specifications',
            skillLevel: 'advanced'
          },
          {
            stepNumber: 4,
            title: 'Vibration Analysis',
            description: 'Check for abnormal vibrations during operation',
            category: 'inspection',
            isRequired: true,
            estimatedTime: 10,
            qualityCriteria: 'Vibration levels within acceptable range',
            skillLevel: 'intermediate'
          }
        ],
        version: '1.8',
        effectiveDate: new Date('2024-01-15'),
        createdBy: 'Motor Systems Team'
      }
    ];

    const createdChecklists = [];
    for (const checklist of checklists) {
      const exists = await EVChecklist.findOne({ code: checklist.code });
      if (!exists) {
        const newChecklist = await EVChecklist.create(checklist);
        createdChecklists.push(newChecklist);
      } else {
        createdChecklists.push(exists);
      }
    }
    
    console.log(`✅ ${createdChecklists.length} EV checklists created successfully`);
    return createdChecklists;
  } catch (error) {
    console.error('Error creating EV checklists:', error);
    throw error;
  }
};

// Create service reception records
const createServiceReceptions = async (vehicles, appointments, users) => {
  try {
    const receptions = [
      {
        receptionNumber: 'REC-241201-001',
        appointmentId: appointments[0]._id,
        vehicleId: vehicles[0]._id,
        customerId: appointments[0].customerId,
        serviceCenterId: appointments[0].serviceCenterId,
        receivedBy: users.find(u => u.role === 'staff')._id,
        vehicleCondition: {
          exterior: {
            condition: 'good',
            damages: [{
              location: 'front bumper',
              type: 'scratch',
              severity: 'minor',
              description: 'Small scratch on lower front bumper',
              photoUrl: '/uploads/damage_photos/front_bumper_scratch.jpg'
            }],
            notes: 'Minor cosmetic damage only'
          },
          interior: {
            condition: 'excellent',
            cleanliness: 'clean',
            damages: [],
            notes: 'Interior in excellent condition'
          },
          battery: {
            level: 45,
            health: 'good',
            temperature: 25,
            chargingStatus: 'not_charging',
            lastChargeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            cycleCount: 420,
            notes: 'Battery drains faster than expected according to customer'
          },
          mileage: {
            current: 15250,
            lastService: 10000,
            mileageSinceLastService: 5250
          },
          fluids: {
            washerFluid: {
              level: 'adequate'
            },
            brakeFluid: {
              level: 'full',
              condition: 'clear'
            },
            coolant: {
              level: 'adequate',
              condition: 'clean'
            }
          },
          tires: {
            frontLeft: { treadDepth: 6.5, pressure: 42, condition: 'good' },
            frontRight: { treadDepth: 6.8, pressure: 43, condition: 'good' },
            rearLeft: { treadDepth: 5.2, pressure: 41, condition: 'fair' },
            rearRight: { treadDepth: 5.5, pressure: 42, condition: 'fair' },
            spare: { condition: 'good', pressure: 42 }
          },
          lights: {
            headlights: 'working',
            taillights: 'working',
            indicators: 'working',
            interiorLights: 'working'
          },
          generalIssues: [{
            category: 'electrical',
            issue: 'Battery efficiency degradation',
            severity: 'medium',
            customerReported: true
          }]
        },
        diagnosticCodes: [],
        estimatedServiceTime: 60,
        estimatedCompletionTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        specialInstructions: {
          fromCustomer: 'Please check battery performance',
          fromStaff: 'Perform comprehensive battery diagnostic',
          safetyPrecautions: ['High voltage safety protocols'],
          warningNotes: ['Customer reports unusual battery behavior']
        },
        status: 'received'
      }
    ];

    const createdReceptions = [];
    for (const reception of receptions) {
      const exists = await ServiceReception.findOne({ receptionNumber: reception.receptionNumber });
      if (!exists) {
        const newReception = await ServiceReception.create(reception);
        createdReceptions.push(newReception);
      } else {
        createdReceptions.push(exists);
      }
    }
    
    console.log(`✅ ${createdReceptions.length} service receptions created successfully`);
    return createdReceptions;
  } catch (error) {
    console.error('Error creating service receptions:', error);
    throw error;
  }
};

// Create sample vehicles for customers
const createVehicles = async (users) => {
  try {
    const customers = users.filter(u => u.role === 'customer');
    const vehicles = [
      {
        customerId: customers[0]._id,
        vin: '5YJ3E1EA4NF123456', // Valid Tesla Model 3 VIN
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        color: 'Pearl White',
        batteryType: 'lithium-ion',
        batteryCapacity: 75,
        maxChargingPower: 250,
        range: 500,
        purchaseDate: new Date('2023-01-15'),
        mileage: 15000,
        lastMaintenanceDate: new Date('2024-01-15'),
        nextMaintenanceDate: new Date('2024-07-15'),
        maintenanceInterval: 15000,
        timeBasedInterval: 12,
        warrantyExpiry: new Date('2026-01-15'),
        images: [
          { url: '/uploads/vehicles/tesla-model3-front.jpg', description: 'Front view', uploadDate: new Date() }
        ],
        documents: [
          { name: 'Vehicle Registration', url: '/uploads/documents/reg1.pdf', type: 'registration', uploadDate: new Date() },
          { name: 'Insurance Certificate', url: '/uploads/documents/ins1.pdf', type: 'insurance', uploadDate: new Date() }
        ],
        isActive: true
      },
      {
        customerId: customers[0]._id,
        vin: '5YJYGDEE8MF789123', // Valid Tesla Model Y VIN
        make: 'Tesla',
        model: 'Model Y',
        year: 2022,
        color: 'Midnight Silver Metallic',
        batteryType: 'lithium-ion',
        batteryCapacity: 80,
        maxChargingPower: 250,
        range: 525,
        purchaseDate: new Date('2022-06-20'),
        mileage: 28000,
        lastMaintenanceDate: new Date('2023-12-20'),
        nextMaintenanceDate: new Date('2024-06-20'),
        maintenanceInterval: 15000,
        timeBasedInterval: 12,
        warrantyExpiry: new Date('2025-06-20'),
        isActive: true
      },
      {
        customerId: customers[1]._id,
        vin: 'LVVDB11B5NE456789', // Valid VinFast VIN format
        make: 'VinFast',
        model: 'VF e34',
        year: 2023,
        color: 'Ocean Blue',
        batteryType: 'lithium-ion',
        batteryCapacity: 42,
        maxChargingPower: 80,
        range: 285,
        purchaseDate: new Date('2023-03-10'),
        mileage: 8500,
        lastMaintenanceDate: new Date('2023-09-10'),
        nextMaintenanceDate: new Date('2024-03-10'),
        maintenanceInterval: 10000,
        timeBasedInterval: 6,
        warrantyExpiry: new Date('2026-03-10'),
        isActive: true
      },
      {
        customerId: customers[2]._id,
        vin: 'KMHL14JA7PA345678', // Valid Hyundai IONIQ 5 VIN
        make: 'Hyundai',
        model: 'IONIQ 5',
        year: 2023,
        color: 'Gravity Gold Matte',
        batteryType: 'lithium-ion',
        batteryCapacity: 72.6,
        maxChargingPower: 220,
        range: 450,
        purchaseDate: new Date('2023-08-05'),
        mileage: 5200,
        lastMaintenanceDate: new Date('2024-02-05'),
        nextMaintenanceDate: new Date('2024-08-05'),
        maintenanceInterval: 12000,
        timeBasedInterval: 12,
        warrantyExpiry: new Date('2031-08-05'), // 8 year battery warranty
        isActive: true
      },
      {
        customerId: customers[3]._id,
        vin: 'WBY8P8C59KV567890', // Valid BMW i4 VIN
        make: 'BMW',
        model: 'i4 eDrive40',
        year: 2024,
        color: 'Storm Bay',
        batteryType: 'lithium-ion',
        batteryCapacity: 83.9,
        maxChargingPower: 200,
        range: 590,
        purchaseDate: new Date('2024-01-10'),
        mileage: 2100,
        lastMaintenanceDate: null,
        nextMaintenanceDate: new Date('2024-07-10'),
        maintenanceInterval: 15000,
        timeBasedInterval: 12,
        warrantyExpiry: new Date('2032-01-10'), // 8 year battery warranty
        isActive: true
      },
      {
        customerId: customers[4]._id,
        vin: 'WMEEJ9AA2NK234567', // Valid Mercedes EQS VIN
        make: 'Mercedes-Benz',
        model: 'EQS 450+',
        year: 2023,
        color: 'Obsidian Black Metallic',
        batteryType: 'lithium-ion',
        batteryCapacity: 107.8,
        maxChargingPower: 200,
        range: 770,
        purchaseDate: new Date('2023-05-20'),
        mileage: 12300,
        lastMaintenanceDate: new Date('2023-11-20'),
        nextMaintenanceDate: new Date('2024-05-20'),
        maintenanceInterval: 20000,
        timeBasedInterval: 12,
        warrantyExpiry: new Date('2031-05-20'), // 8 year battery warranty
        isActive: true
      }
    ];

    const createdVehicles = [];
    for (const vehicle of vehicles) {
      const exists = await Vehicle.findOne({ vin: vehicle.vin });
      if (!exists) {
        const newVehicle = await Vehicle.create(vehicle);
        // Calculate next maintenance
        newVehicle.calculateNextMaintenance();
        await newVehicle.save();
        createdVehicles.push(newVehicle);
      } else {
        createdVehicles.push(exists);
      }
    }
    console.log(`✅ ${createdVehicles.length} vehicles created successfully`);
    return createdVehicles;
  } catch (error) {
    console.error('Error creating vehicles:', error);
    throw error;
  }
};

// Create sample parts
const createParts = async () => {
  try {
    const parts = [
      // Battery Parts
      {
        partNumber: 'BAT-TESLA-M3-001',
        name: 'Tesla Model 3 Battery Pack',
        description: '75kWh Lithium-ion battery pack for Tesla Model 3',
        category: 'battery',
        subcategory: 'battery-pack',
        brand: 'Tesla',
        model: 'Model 3',
        specifications: {
          voltage: 400,
          capacity: 75,
          weight: 480,
          dimensions: {
            length: 1500,
            width: 800,
            height: 150
          },
          other: {
            cells: 4416,
            chemistry: 'NCA'
          }
        },
        compatibility: {
          makes: ['Tesla'],
          models: ['Model 3'],
          years: {
            min: 2020,
            max: 2024
          },
          batteryTypes: ['lithium-ion']
        },
        pricing: {
          cost: 12000000,
          retail: 18000000,
          wholesale: 15000000,
          currency: 'VND'
        },
        supplierInfo: {
          name: 'Tesla Parts Division',
          contact: 'parts@tesla.com',
          notes: 'Original equipment manufacturer'
        },
        inventory: {
          currentStock: 5,
          reservedStock: 0,
          usedStock: 0,
          minStockLevel: 2,
          maxStockLevel: 10,
          reorderPoint: 3,
          averageUsage: 1,
          reservations: []
        },
        leadTime: 14,
        warranty: {
          duration: 365,
          type: 'manufacturer',
          description: '1 year full replacement warranty'
        },
        usage: {
          totalUsed: 8,
          lastUsed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          averageMonthlyUsage: 2
        },
        isRecommended: true,
        isActive: true,
        tags: ['tesla', 'battery', 'model-3', 'lithium-ion']
      },
      {
        partNumber: 'BAT-VINFAST-E34-001',
        name: 'VinFast VF e34 Battery Module',
        description: '42kWh Battery module for VinFast VF e34',
        category: 'battery',
        subcategory: 'battery-module',
        brand: 'VinFast',
        model: 'VF e34',
        specifications: {
          voltage: 350,
          capacity: 42,
          weight: 280,
          dimensions: {
            length: 1200,
            width: 600,
            height: 120
          }
        },
        compatibility: {
          makes: ['VinFast'],
          models: ['VF e34'],
          years: {
            min: 2022,
            max: 2024
          },
          batteryTypes: ['lithium-ion']
        },
        pricing: {
          cost: 8000000,
          retail: 12000000,
          wholesale: 10000000,
          currency: 'VND'
        },
        supplierInfo: {
          name: 'VinFast Service Parts',
          contact: 'parts@vinfast.vn',
          notes: 'Authorized dealer parts'
        },
        inventory: {
          currentStock: 8,
          reservedStock: 1,
          usedStock: 0,
          minStockLevel: 3,
          maxStockLevel: 15,
          reorderPoint: 5,
          averageUsage: 2,
          reservations: []
        },
        leadTime: 7,
        warranty: {
          duration: 180,
          type: 'manufacturer',
          description: '6 months manufacturer warranty'
        },
        usage: {
          totalUsed: 12,
          lastUsed: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          averageMonthlyUsage: 3
        },
        isRecommended: true,
        isActive: true,
        tags: ['vinfast', 'battery', 'module', 'e34']
      },

      // Motor Parts
      {
        partNumber: 'MOT-TESLA-3-REAR-001',
        name: 'Tesla Model 3 Rear Motor',
        description: 'Permanent magnet rear motor for Tesla Model 3',
        category: 'motor',
        subcategory: 'drive-motor',
        brand: 'Tesla',
        model: 'Model 3',
        specifications: {
          power: 211,
          voltage: 400,
          weight: 31,
          dimensions: {
            length: 220,
            width: 220,
            height: 200
          },
          other: {
            type: 'permanent_magnet',
            maxRPM: 18000
          }
        },
        compatibility: {
          makes: ['Tesla'],
          models: ['Model 3'],
          years: {
            min: 2020,
            max: 2024
          },
          batteryTypes: ['lithium-ion']
        },
        pricing: {
          cost: 8000000,
          retail: 12000000,
          wholesale: 10000000,
          currency: 'VND'
        },
        supplierInfo: {
          name: 'Tesla Motors',
          contact: 'service@tesla.com',
          notes: 'OEM replacement motor'
        },
        inventory: {
          currentStock: 3,
          reservedStock: 0,
          usedStock: 0,
          minStockLevel: 1,
          maxStockLevel: 5,
          reorderPoint: 2,
          averageUsage: 0,
          reservations: []
        },
        leadTime: 21,
        warranty: {
          duration: 365,
          type: 'manufacturer',
          description: '1 year motor replacement warranty'
        },
        usage: {
          totalUsed: 2,
          lastUsed: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          averageMonthlyUsage: 0
        },
        isRecommended: false,
        isActive: true,
        tags: ['tesla', 'motor', 'rear', 'permanent-magnet']
      },

      // Charging Parts
      {
        partNumber: 'CHG-UNI-TYPE2-001',
        name: 'Type 2 Charging Port',
        description: 'Universal Type 2 charging port for electric vehicles',
        category: 'charging',
        subcategory: 'charging-port',
        brand: 'Universal',
        specifications: {
          voltage: 400,
          power: 22,
          dimensions: {
            length: 100,
            width: 80,
            height: 60
          },
          material: 'Thermoplastic',
          other: {
            connector: 'Type 2',
            phases: 3
          }
        },
        compatibility: {
          makes: ['Tesla', 'VinFast', 'Hyundai', 'BMW', 'Audi'],
          models: ['Model 3', 'Model Y', 'VF e34', 'IONIQ 5'],
          years: {
            min: 2020,
            max: 2024
          },
          batteryTypes: ['lithium-ion', 'lithium-iron-phosphate']
        },
        pricing: {
          cost: 500000,
          retail: 800000,
          wholesale: 650000,
          currency: 'VND'
        },
        supplierInfo: {
          name: 'EV Components Ltd',
          contact: 'sales@evcomponents.com',
          notes: 'Universal charging components supplier'
        },
        inventory: {
          currentStock: 25,
          reservedStock: 2,
          usedStock: 0,
          minStockLevel: 10,
          maxStockLevel: 50,
          reorderPoint: 15,
          averageUsage: 8,
          reservations: []
        },
        leadTime: 3,
        warranty: {
          duration: 90,
          type: 'supplier',
          description: '3 months parts warranty'
        },
        usage: {
          totalUsed: 45,
          lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          averageMonthlyUsage: 12
        },
        isRecommended: true,
        isActive: true,
        tags: ['charging', 'type-2', 'universal', 'port']
      },
      {
        partNumber: 'CHG-ONBOARD-22KW-001',
        name: '22kW Onboard Charger',
        description: 'High-efficiency 22kW onboard charging unit',
        category: 'charging',
        subcategory: 'onboard-charger',
        brand: 'ChargeMax',
        specifications: {
          power: 22,
          voltage: 400,
          weight: 15,
          dimensions: {
            length: 400,
            width: 300,
            height: 150
          },
          other: {
            efficiency: 95,
            cooling: 'liquid'
          }
        },
        compatibility: {
          makes: ['VinFast', 'Hyundai', 'BMW'],
          models: ['VF e34', 'IONIQ 5'],
          years: {
            min: 2022,
            max: 2024
          },
          batteryTypes: ['lithium-ion']
        },
        pricing: {
          cost: 3500000,
          retail: 5500000,
          wholesale: 4500000,
          currency: 'VND'
        },
        supplierInfo: {
          name: 'ChargeMax Technologies',
          contact: 'info@chargemax.com',
          notes: 'Specialized charging equipment manufacturer'
        },
        inventory: {
          currentStock: 12,
          reservedStock: 1,
          usedStock: 0,
          minStockLevel: 5,
          maxStockLevel: 20,
          reorderPoint: 8,
          averageUsage: 3,
          reservations: []
        },
        leadTime: 10,
        warranty: {
          duration: 180,
          type: 'manufacturer',
          description: '6 months manufacturer warranty'
        },
        usage: {
          totalUsed: 18,
          lastUsed: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
          averageMonthlyUsage: 4
        },
        isRecommended: true,
        isActive: true,
        tags: ['charging', 'onboard', '22kw', 'charger']
      },

      // Electronics Parts
      {
        partNumber: 'ELC-TESLA-MCU-001',
        name: 'Tesla MCU (Media Control Unit)',
        description: 'Media Control Unit for Tesla vehicles',
        category: 'electronics',
        subcategory: 'control-unit',
        brand: 'Tesla',
        specifications: {
          voltage: 12,
          weight: 2.5,
          dimensions: {
            length: 200,
            width: 150,
            height: 50
          },
          other: {
            processor: 'Intel Atom',
            memory: '8GB RAM',
            storage: '64GB eMMC',
            display: '15-inch touchscreen'
          }
        },
        compatibility: {
          makes: ['Tesla'],
          models: ['Model 3', 'Model Y'],
          years: {
            min: 2021,
            max: 2024
          },
          batteryTypes: ['lithium-ion']
        },
        pricing: {
          cost: 8000000,
          retail: 12000000,
          wholesale: 10000000,
          currency: 'VND'
        },
        supplierInfo: {
          name: 'Tesla Electronics',
          contact: 'electronics@tesla.com',
          notes: 'Original Tesla electronics'
        },
        inventory: {
          currentStock: 6,
          reservedStock: 0,
          usedStock: 0,
          minStockLevel: 2,
          maxStockLevel: 10,
          reorderPoint: 4,
          averageUsage: 1,
          reservations: []
        },
        leadTime: 21,
        warranty: {
          duration: 180,
          type: 'manufacturer',
          description: '6 months limited warranty'
        },
        usage: {
          totalUsed: 5,
          lastUsed: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          averageMonthlyUsage: 1
        },
        isRecommended: false,
        isActive: true,
        tags: ['tesla', 'electronics', 'mcu', 'touchscreen']
      },
      {
        partNumber: 'ELC-DC-CONVERTER-001',
        name: 'DC-DC Converter 12V',
        description: 'High voltage to 12V DC converter for auxiliary systems',
        category: 'electronics',
        subcategory: 'power-converter',
        brand: 'PowerTech',
        specifications: {
          power: 1.5,
          voltage: 12,
          weight: 3.2,
          dimensions: {
            length: 250,
            width: 180,
            height: 80
          },
          other: {
            inputVoltage: '250-450V',
            outputCurrent: '125A',
            efficiency: 92
          }
        },
        compatibility: {
          makes: ['Tesla', 'VinFast', 'Hyundai'],
          models: ['Model 3', 'Model Y', 'VF e34', 'IONIQ 5'],
          years: {
            min: 2020,
            max: 2024
          },
          batteryTypes: ['lithium-ion']
        },
        pricing: {
          cost: 2000000,
          retail: 3200000,
          wholesale: 2600000,
          currency: 'VND'
        },
        supplierInfo: {
          name: 'PowerTech Solutions',
          contact: 'support@powertech.com',
          notes: 'Automotive power electronics specialist'
        },
        inventory: {
          currentStock: 18,
          reservedStock: 2,
          usedStock: 0,
          minStockLevel: 8,
          maxStockLevel: 30,
          reorderPoint: 12,
          averageUsage: 6,
          reservations: []
        },
        leadTime: 7,
        warranty: {
          duration: 120,
          type: 'manufacturer',
          description: '4 months manufacturer warranty'
        },
        usage: {
          totalUsed: 28,
          lastUsed: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          averageMonthlyUsage: 7
        },
        isRecommended: true,
        isActive: true,
        tags: ['electronics', 'dc-converter', '12v', 'power']
      },

      // Body Parts
      {
        partNumber: 'BODY-TESLA-DOOR-001',
        name: 'Tesla Model 3 Front Door Handle',
        description: 'Retractable front door handle assembly for Tesla Model 3',
        category: 'body',
        subcategory: 'door-handle',
        brand: 'Tesla',
        model: 'Model 3',
        specifications: {
          weight: 0.8,
          dimensions: {
            length: 150,
            width: 30,
            height: 25
          },
          material: 'Aluminum',
          color: 'Chrome'
        },
        compatibility: {
          makes: ['Tesla'],
          models: ['Model 3'],
          years: {
            min: 2020,
            max: 2024
          }
        },
        pricing: {
          cost: 800000,
          retail: 1200000,
          wholesale: 1000000,
          currency: 'VND'
        },
        supplierInfo: {
          name: 'Tesla Body Parts',
          contact: 'bodyparts@tesla.com',
          notes: 'OEM body components'
        },
        inventory: {
          currentStock: 15,
          reservedStock: 0,
          usedStock: 0,
          minStockLevel: 5,
          maxStockLevel: 25,
          reorderPoint: 8,
          averageUsage: 4,
          reservations: []
        },
        leadTime: 14,
        warranty: {
          duration: 90,
          type: 'manufacturer',
          description: '3 months parts warranty'
        },
        usage: {
          totalUsed: 22,
          lastUsed: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
          averageMonthlyUsage: 5
        },
        isRecommended: false,
        isActive: true,
        tags: ['tesla', 'body', 'door', 'handle']
      },

      // Consumables
      {
        partNumber: 'CONS-BRAKE-FLUID-001',
        name: 'EV Brake Fluid DOT 4',
        description: 'High-performance brake fluid suitable for electric vehicles',
        category: 'consumables',
        subcategory: 'brake-fluid',
        brand: 'FluidMax',
        specifications: {
          weight: 1,
          other: {
            type: 'DOT 4',
            boilingPoint: '230°C',
            viscosity: 'Low temperature stable'
          }
        },
        compatibility: {
          makes: ['Tesla', 'VinFast', 'Hyundai', 'BMW', 'Audi'],
          models: ['Model 3', 'Model Y', 'VF e34', 'IONIQ 5'],
          years: {
            min: 2020,
            max: 2024
          }
        },
        pricing: {
          cost: 150000,
          retail: 250000,
          wholesale: 200000,
          currency: 'VND'
        },
        supplierInfo: {
          name: 'FluidMax Automotive',
          contact: 'orders@fluidmax.com',
          notes: 'Automotive fluids specialist'
        },
        inventory: {
          currentStock: 45,
          reservedStock: 5,
          usedStock: 0,
          minStockLevel: 20,
          maxStockLevel: 100,
          reorderPoint: 30,
          averageUsage: 15,
          reservations: []
        },
        leadTime: 2,
        warranty: {
          duration: 24,
          type: 'manufacturer',
          description: '2 years shelf life'
        },
        usage: {
          totalUsed: 85,
          lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          averageMonthlyUsage: 20
        },
        isRecommended: true,
        isActive: true,
        tags: ['consumables', 'brake', 'fluid', 'dot4']
      },
      {
        partNumber: 'CONS-COOLANT-EV-001',
        name: 'EV Coolant Concentrate',
        description: 'Specialized coolant for electric vehicle thermal management',
        category: 'consumables',
        subcategory: 'coolant',
        brand: 'CoolFlow',
        specifications: {
          weight: 5,
          other: {
            type: 'Ethylene Glycol',
            freezePoint: '-37°C',
            concentration: '50%'
          }
        },
        compatibility: {
          makes: ['Tesla', 'VinFast', 'Hyundai'],
          models: ['Model 3', 'Model Y', 'VF e34', 'IONIQ 5'],
          years: {
            min: 2020,
            max: 2024
          }
        },
        pricing: {
          cost: 300000,
          retail: 500000,
          wholesale: 400000,
          currency: 'VND'
        },
        supplierInfo: {
          name: 'CoolFlow Industries',
          contact: 'sales@coolflow.com',
          notes: 'EV thermal management fluids'
        },
        inventory: {
          currentStock: 32,
          reservedStock: 3,
          usedStock: 0,
          minStockLevel: 15,
          maxStockLevel: 60,
          reorderPoint: 25,
          averageUsage: 10,
          reservations: []
        },
        leadTime: 5,
        warranty: {
          duration: 36,
          type: 'manufacturer',
          description: '3 years shelf life'
        },
        usage: {
          totalUsed: 58,
          lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          averageMonthlyUsage: 12
        },
        isRecommended: true,
        isActive: true,
        tags: ['consumables', 'coolant', 'thermal', 'ev']
      }
    ];

    const createdParts = [];
    for (const part of parts) {
      const exists = await Part.findOne({ partNumber: part.partNumber });
      if (!exists) {
        const newPart = await Part.create(part);
        createdParts.push(newPart);
      } else {
        createdParts.push(exists);
      }
    }
    console.log(`✅ ${createdParts.length} parts created successfully`);
    return createdParts;
  } catch (error) {
    console.error('Error creating parts:', error);
    throw error;
  }
};

// Create sample appointments
const createAppointments = async (users, vehicles, services, serviceCenters) => {
  try {
    const customers = users.filter(u => u.role === 'customer');
    const technicians = users.filter(u => u.role === 'technician');
    
    const appointments = [
      // Confirmed appointment with full workflow tracking
      {
        appointmentNumber: 'APT251201001',
        customerId: customers[0]._id,
        vehicleId: vehicles[0]._id,
        serviceCenterId: serviceCenters[0]._id,
        services: [
          { serviceId: services[0]._id, quantity: 1, price: services[0].basePrice, estimatedDuration: services[0].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        scheduledTime: '09:00',
        status: 'confirmed',
        priority: 'normal',
        customerNotes: 'Battery seems to be draining faster than usual. Please check charging efficiency.',
        assignedTechnician: technicians[0]._id,
        estimatedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        workflowHistory: [
          {
            status: 'pending',
            changedBy: customers[0]._id,
            changedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            reason: 'appointment_created',
            notes: 'Customer booked appointment online'
          },
          {
            status: 'confirmed',
            changedBy: users.find(u => u.role === 'staff')._id,
            changedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
            reason: 'staff_confirmation',
            notes: 'Appointment confirmed and technician assigned'
          }
        ],
        customerArrival: {
          expectedAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          arrivedAt: null
        }
      },

      // Pending appointment awaiting staff confirmation
      {
        appointmentNumber: 'APT251201002',
        customerId: customers[1]._id,
        vehicleId: vehicles[2]._id,
        serviceCenterId: serviceCenters[1]._id,
        services: [
          { serviceId: services[2]._id, quantity: 1, price: services[2].basePrice, estimatedDuration: services[2].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        scheduledTime: '14:00',
        status: 'pending',
        priority: 'high',
        customerNotes: 'Charging port not working properly. Urgent repair needed for business use.',
        estimatedCompletion: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000),
        workflowHistory: [
          {
            status: 'pending',
            changedBy: customers[1]._id,
            changedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            reason: 'appointment_created',
            notes: 'Customer booked appointment with high priority'
          }
        ],
        customerArrival: {
          expectedAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
        }
      },

      // Completed appointment with full service history
      {
        appointmentNumber: 'APT251201003',
        customerId: customers[0]._id,
        vehicleId: vehicles[1]._id,
        serviceCenterId: serviceCenters[0]._id,
        services: [
          { serviceId: services[6]._id, quantity: 1, price: services[6].basePrice, estimatedDuration: services[6].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        scheduledTime: '10:00',
        status: 'completed',
        priority: 'normal',
        customerNotes: 'Annual maintenance service. Please check all systems thoroughly.',
        assignedTechnician: technicians[1]._id,
        actualCompletion: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 180 * 60 * 1000),
        workflowHistory: [
          {
            status: 'pending',
            changedBy: customers[0]._id,
            changedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            reason: 'appointment_created',
            notes: 'Annual maintenance scheduled'
          },
          {
            status: 'confirmed',
            changedBy: users.find(u => u.role === 'staff')._id,
            changedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000),
            reason: 'staff_confirmation',
            notes: 'Appointment confirmed, technician assigned'
          },
          {
            status: 'customer_arrived',
            changedBy: users.find(u => u.role === 'staff')._id,
            changedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            reason: 'customer_arrival',
            notes: 'Customer arrived on time'
          },
          {
            status: 'in_progress',
            changedBy: technicians[1]._id,
            changedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
            reason: 'service_started',
            notes: 'Started comprehensive maintenance check'
          },
          {
            status: 'completed',
            changedBy: technicians[1]._id,
            changedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 180 * 60 * 1000),
            reason: 'service_completed',
            notes: 'All maintenance tasks completed successfully'
          }
        ],
        customerArrival: {
          expectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          arrivedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        serviceNotes: [
          {
            note: 'Battery health: 98% - Excellent condition',
            addedBy: technicians[1]._id,
            addedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000)
          },
          {
            note: 'Motor performance: All parameters within normal range',
            addedBy: technicians[1]._id,
            addedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)
          },
          {
            note: 'Charging system: Functioning optimally, no issues detected',
            addedBy: technicians[1]._id,
            addedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000)
          }
        ],
        feedback: {
          rating: 5,
          comment: 'Excellent service! Very thorough inspection and clear explanation of results.',
          submittedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
        }
      },

      // Customer arrived and waiting for reception
      {
        appointmentNumber: 'APT251201004',
        customerId: customers[1]._id,
        vehicleId: vehicles[3]._id,
        serviceCenterId: serviceCenters[0]._id,
        services: [
          { serviceId: services[1]._id, quantity: 1, price: services[1].basePrice, estimatedDuration: services[1].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        scheduledTime: '11:00',
        status: 'customer_arrived',
        priority: 'normal',
        customerNotes: 'Motor making unusual noise during acceleration. Need diagnostic check.',
        assignedTechnician: technicians[0]._id,
        workflowHistory: [
          {
            status: 'pending',
            changedBy: customers[1]._id,
            changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            reason: 'appointment_created',
            notes: 'Customer reported motor noise issue'
          },
          {
            status: 'confirmed',
            changedBy: users.find(u => u.role === 'staff')._id,
            changedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            reason: 'staff_confirmation',
            notes: 'Confirmed for motor diagnostic service'
          },
          {
            status: 'customer_arrived',
            changedBy: users.find(u => u.role === 'staff')._id,
            changedAt: new Date(Date.now() - 30 * 60 * 1000),
            reason: 'customer_arrival',
            notes: 'Customer checked in, ready for service reception'
          }
        ],
        customerArrival: {
          expectedAt: new Date(Date.now() - 30 * 60 * 1000),
          arrivedAt: new Date(Date.now() - 30 * 60 * 1000)
        }
      },
      {
        appointmentNumber: 'APT251201005',
        customerId: customers[0]._id,
        vehicleId: vehicles[3]._id,
        serviceCenterId: serviceCenters[1]._id,
        services: [
          { serviceId: services[3]._id, quantity: 1, price: services[3].basePrice, estimatedDuration: services[3].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        scheduledTime: '13:30',
        status: 'in_progress', // InService core status
        priority: 'high',
        customerNotes: 'Motor making unusual noises during acceleration',
        assignedTechnician: technicians[1]._id,
        serviceNotes: [
          { note: 'Started diagnostic tests on motor system', addedBy: technicians[1]._id, addedAt: new Date() }
        ]
      },
      {
        appointmentNumber: 'APT251201006',
        customerId: customers[1]._id,
        vehicleId: vehicles[2]._id,
        serviceCenterId: serviceCenters[0]._id,
        services: [
          { serviceId: services[4]._id, quantity: 1, price: services[4].basePrice, estimatedDuration: services[4].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
        scheduledTime: '15:00',
        status: 'parts_insufficient', // OnHold core status
        priority: 'normal',
        customerNotes: 'Need brake pad replacement',
        assignedTechnician: technicians[0]._id,
        serviceNotes: [
          { note: 'Brake pads out of stock, waiting for customer decision', addedBy: technicians[0]._id, addedAt: new Date() }
        ]
      },
      {
        appointmentNumber: 'APT251201007',
        customerId: customers[0]._id,
        vehicleId: vehicles[1]._id,
        serviceCenterId: serviceCenters[1]._id,
        services: [
          { serviceId: services[5]._id, quantity: 1, price: services[5].basePrice, estimatedDuration: services[5].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        scheduledTime: '09:30',
        status: 'invoiced', // ReadyForPickup core status
        priority: 'normal',
        customerNotes: 'AC system not cooling properly',
        assignedTechnician: technicians[1]._id,
        actualCompletion: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000),
        serviceNotes: [
          { note: 'AC system cleaned and recharged', addedBy: technicians[1]._id, addedAt: new Date() }
        ]
      },
      {
        appointmentNumber: 'APT251201008',
        customerId: customers[1]._id,
        vehicleId: vehicles[0]._id,
        serviceCenterId: serviceCenters[0]._id,
        services: [
          { serviceId: services[7]._id, quantity: 1, price: services[7].basePrice, estimatedDuration: services[7].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        scheduledTime: '08:00',
        status: 'cancelled', // Closed core status
        priority: 'low',
        customerNotes: 'Customer cancelled due to travel plans'
      },
      {
        appointmentNumber: 'APT251201009',
        customerId: customers[0]._id,
        vehicleId: vehicles[2]._id,
        serviceCenterId: serviceCenters[1]._id,
        services: [
          { serviceId: services[8]._id, quantity: 1, price: services[8].basePrice, estimatedDuration: services[8].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        scheduledTime: '16:00',
        status: 'waiting_for_parts', // OnHold core status
        priority: 'high',
        customerNotes: 'Charging cable needs replacement',
        assignedTechnician: technicians[0]._id,
        serviceNotes: [
          { note: 'Customer agreed to wait for new charging cable, ETA 2 days', addedBy: technicians[0]._id, addedAt: new Date() }
        ]
      },
      // Additional statuses to cover full workflow
      {
        appointmentNumber: 'APT251201010',
        customerId: customers[1]._id,
        vehicleId: vehicles[1]._id,
        serviceCenterId: serviceCenters[0]._id,
        services: [
          { serviceId: services[0]._id, quantity: 1, price: services[0].basePrice, estimatedDuration: services[0].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        scheduledTime: '14:30',
        status: 'reception_created', // CheckedIn core status
        priority: 'normal',
        customerNotes: 'Service reception form created, waiting for staff approval',
        assignedTechnician: technicians[1]._id
      },
      {
        appointmentNumber: 'APT251201011',
        customerId: customers[0]._id,
        vehicleId: vehicles[0]._id,
        serviceCenterId: serviceCenters[1]._id,
        services: [
          { serviceId: services[1]._id, quantity: 1, price: services[1].basePrice, estimatedDuration: services[1].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
        scheduledTime: '16:00',
        status: 'reception_approved', // CheckedIn core status
        priority: 'normal',
        customerNotes: 'Parts approved, ready to start work',
        assignedTechnician: technicians[0]._id
      },
      {
        appointmentNumber: 'APT251201012',
        customerId: customers[1]._id,
        vehicleId: vehicles[2]._id,
        serviceCenterId: serviceCenters[0]._id,
        services: [
          { serviceId: services[2]._id, quantity: 1, price: services[2].basePrice, estimatedDuration: services[2].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
        scheduledTime: '10:30',
        status: 'parts_requested', // OnHold core status
        priority: 'high',
        customerNotes: 'Additional parts requested during service',
        assignedTechnician: technicians[1]._id,
        serviceNotes: [
          { note: 'Found additional issue, waiting for extra part approval', addedBy: technicians[1]._id, addedAt: new Date() }
        ]
      },
      {
        appointmentNumber: 'APT251201013',
        customerId: customers[0]._id,
        vehicleId: vehicles[1]._id,
        serviceCenterId: serviceCenters[1]._id,
        services: [
          { serviceId: services[3]._id, quantity: 1, price: services[3].basePrice, estimatedDuration: services[3].estimatedDuration }
        ],
        scheduledDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        scheduledTime: '11:00',
        status: 'no_show', // Closed core status
        priority: 'low',
        customerNotes: 'Customer did not arrive for scheduled appointment',
        reasonCode: 'no_show'
      }
    ];

    const createdAppointments = [];
    for (const appointment of appointments) {
      const newAppointment = await Appointment.create(appointment);
      newAppointment.calculateTotal();
      await newAppointment.save();
      createdAppointments.push(newAppointment);
    }
    console.log(`✅ ${createdAppointments.length} appointments created successfully`);
    return createdAppointments;
  } catch (error) {
    console.error('Error creating appointments:', error);
    throw error;
  }
};

// Create part requests for testing workflow
const createPartRequests = async (appointments, parts, users) => {
  try {
    const technicians = users.filter(u => u.role === 'technician');
    const staff = users.filter(u => u.role === 'staff');
    
    // Get completed and in-progress appointments that would have part requests
    const relevantAppointments = appointments.filter(apt => 
      ['reception_created', 'reception_approved', 'in_progress', 'parts_requested', 'completed'].includes(apt.status)
    );
    
    const partRequests = [];
    
    // Create initial service part requests
    for (let i = 0; i < Math.min(3, relevantAppointments.length); i++) {
      const appointment = relevantAppointments[i];
      const selectedParts = parts.slice(i * 2, (i * 2) + 2); // Select different parts for each request
      
      // Generate request number manually
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const requestNumber = `PRQ${year}${month}${day}${(i + 1).toString().padStart(3, '0')}`;
      
      const partRequest = await PartRequest.create({
        requestNumber,
        appointmentId: appointment._id,
        requestedBy: technicians[i % technicians.length]._id,
        type: 'initial_service',
        requestedParts: selectedParts.map(part => ({
          partId: part._id,
          quantity: Math.floor(Math.random() * 3) + 1,
          reason: `Required for ${appointment.services[0]?.serviceId ? 'service' : 'maintenance'}`,
          priority: ['normal', 'high'][Math.floor(Math.random() * 2)],
          partInfo: {
            name: part.name,
            partNumber: part.partNumber,
            category: part.category
          }
        })),
        urgency: ['normal', 'high'][Math.floor(Math.random() * 2)],
        requestNotes: 'Parts needed for scheduled service',
        status: ['approved', 'pending', 'fulfilled'][Math.floor(Math.random() * 3)]
      });
      
      // Add review details for approved/rejected requests
      if (partRequest.status === 'approved') {
        partRequest.reviewDetails = {
          reviewedBy: staff[0]._id,
          reviewedAt: new Date(),
          decision: 'approve_all',
          staffNotes: 'All parts available in stock'
        };
        await partRequest.save();
      }
      
      partRequests.push(partRequest);
    }
    
    // Create additional part requests during service
    if (relevantAppointments.length > 0) {
      const date2 = new Date();
      const year2 = date2.getFullYear().toString().slice(-2);
      const month2 = (date2.getMonth() + 1).toString().padStart(2, '0');
      const day2 = date2.getDate().toString().padStart(2, '0');
      const additionalRequestNumber = `PRQ${year2}${month2}${day2}${(partRequests.length + 1).toString().padStart(3, '0')}`;
      
      const additionalRequest = await PartRequest.create({
        requestNumber: additionalRequestNumber,
        appointmentId: relevantAppointments[0]._id,
        requestedBy: technicians[0]._id,
        type: 'additional_during_service',
        requestedParts: [{
          partId: parts[5]._id,
          quantity: 1,
          reason: 'Additional part needed after inspection',
          priority: 'high',
          partInfo: {
            name: parts[5].name,
            partNumber: parts[5].partNumber,
            category: parts[5].category
          }
        }],
        urgency: 'high',
        requestNotes: 'Found additional issue during service',
        status: 'pending'
      });
      
      partRequests.push(additionalRequest);
    }
    
    return partRequests;
  } catch (error) {
    console.error('Error creating part requests:', error);
    throw error;
  }
};

// Create invoices for completed appointments
const createInvoices = async (appointments, users, parts) => {
  try {
    const staff = users.filter(u => u.role === 'staff');
    
    // Get completed appointments that should have invoices
    const completedAppointments = appointments.filter(apt => 
      ['completed', 'invoiced'].includes(apt.status)
    );
    
    const invoices = [];
    
    for (let i = 0; i < completedAppointments.length; i++) {
      const appointment = completedAppointments[i];
      
      // Generate invoice number manually
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const invoiceNumber = `INV${year}${month}${day}${(i + 1).toString().padStart(3, '0')}`;
      
      const invoice = await Invoice.create({
        invoiceNumber,
        appointmentId: appointment._id,
        customerId: appointment.customerId,
        vehicleId: appointment.vehicleId,
        serviceCenterId: appointment.serviceCenterId,
        generatedBy: staff[0]._id,
        services: [
          {
            name: 'EV Battery Health Check',
            description: 'Comprehensive battery diagnostic and health assessment',
            quantity: 1,
            unitPrice: 500000,
            totalPrice: 500000,
            category: 'diagnostic'
          },
          {
            name: 'Charging System Inspection',
            description: 'Charging port and cable inspection',
            quantity: 1,
            unitPrice: 300000,
            totalPrice: 300000,
            category: 'inspection'
          }
        ],
        parts: [
          {
            partId: parts[0]._id,
            name: parts[0].name,
            quantity: 1,
            unitPrice: parts[0].pricing.retail,
            totalPrice: parts[0].pricing.retail
          }
        ],
        labor: {
          hours: 2.5,
          hourlyRate: 200000,
          totalCost: 500000
        },
        notes: 'Service completed successfully with Vietnamese VAT compliance',
        status: appointment.status === 'invoiced' ? 'sent' : 'draft'
      });
      
      // Calculate totals using the model method
      invoice.calculateTotals();
      
      // Add payment for some invoices
      if (Math.random() > 0.5) {
        invoice.payment = {
          method: ['cash', 'bank_transfer', 'card'][Math.floor(Math.random() * 3)],
          status: 'paid',
          amountPaid: invoice.totals.grandTotal,
          paidAt: new Date(),
          notes: 'Paid in full at service completion'
        };
      }
      
      await invoice.save();
      invoices.push(invoice);
    }
    
    return invoices;
  } catch (error) {
    console.error('Error creating invoices:', error);
    throw error;
  }
};

// Run seeder
const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    await connectDB();
    
    // Optional: Clear existing data (uncomment if needed)
    await clearData();
    
    console.log('📝 Creating services...');
    const services = await createServices();
    
    console.log('🏢 Creating service centers...');
    const serviceCenters = await createServiceCenters(services);
    
    console.log('👥 Creating users...');
    const users = await createUsers(serviceCenters);
    
    console.log('🚗 Creating vehicles...');
    const vehicles = await createVehicles(users);
    
    console.log('🔧 Creating parts...');
    const parts = await createParts();
    
    console.log('📅 Creating appointments...');
    const appointments = await createAppointments(users, vehicles, services, serviceCenters);
    
    console.log('👨‍🔧 Creating technician profiles...');
    const technicianProfiles = await createTechnicianProfiles(users);
    
    console.log('✅ Creating EV checklists...');
    const evChecklists = await createEVChecklists();
    
    console.log('📋 Creating service receptions...');
    const serviceReceptions = await createServiceReceptions(vehicles, appointments, users);
    
    console.log('📦 Creating part requests...');
    const partRequests = await createPartRequests(appointments, parts, users);
    
    console.log('💰 Creating invoices...');
    const invoices = await createInvoices(appointments, users, parts);
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Services: ${services.length} (EV-specific service catalog)`);
    console.log(`   - Service Centers: ${serviceCenters.length} (Vietnamese locations)`);
    console.log(`   - Users: ${users.length} (All roles with Vietnamese data)`);
    console.log(`   - Vehicles: ${vehicles.length} (Valid VINs, Vietnamese EV brands)`);
    console.log(`   - Parts: ${parts.length} (Enhanced inventory management)`);
    console.log(`   - Appointments: ${appointments.length} (Complete workflow states)`);
    console.log(`   - Technician Profiles: ${technicianProfiles.length}`);
    console.log(`   - EV Checklists: ${evChecklists.length}`);
    console.log(`   - Service Receptions: ${serviceReceptions.length}`);
    console.log(`   - Part Requests: ${partRequests.length}`);
    console.log(`   - Invoices: ${invoices.length} (Vietnamese VAT compliance)`);

    console.log('\n🔑 Enhanced Test Accounts (Strong Passwords):');
    console.log('   Admin:      admin@evservice.com      / Admin123!@#');
    console.log('   Staff 1:    staff.central@evservice.com / Staff123!@#');
    console.log('   Staff 2:    staff.d7@evservice.com   / Staff123!@#');
    console.log('   Tech 1:     tech1@evservice.com      / Tech123!@#');
    console.log('   Tech 2:     tech2@evservice.com      / Tech123!@#');
    console.log('   Tech 3:     tech3@evservice.com      / Tech123!@#');
    console.log('   Customer 1: customer1@gmail.com      / Customer123!@#');
    console.log('   Customer 2: customer2@gmail.com      / Customer123!@#');
    console.log('   Customer 3: customer3@gmail.com      / Customer123!@#');
    console.log('   Customer 4: customer4@gmail.com      / Customer123!@#');
    console.log('   Customer 5: customer5@gmail.com      / Customer123!@#');

    console.log('\n🚗 Vehicle Data:');
    console.log('   - Valid 17-character VINs (no I/O/Q characters)');
    console.log('   - Tesla Model 3, Model Y');
    console.log('   - VinFast VF e34');
    console.log('   - Hyundai IONIQ 5');
    console.log('   - BMW i4 eDrive40');
    console.log('   - Mercedes EQS 450+');

    console.log('\n📋 Appointment Workflow States:');
    console.log('   - pending: Awaiting staff confirmation');
    console.log('   - confirmed: Staff confirmed, technician assigned');
    console.log('   - customer_arrived: Customer checked in');
    console.log('   - reception_created: Service reception form created');
    console.log('   - in_progress: Service work started');
    console.log('   - completed: Service work finished');
    console.log('   - invoiced: Invoice generated');

    console.log('\n🔧 Enhanced Features:');
    console.log('   - Vietnamese phone number format (09xxxxxxxx)');
    console.log('   - VND currency pricing throughout');
    console.log('   - Comprehensive workflow history tracking');
    console.log('   - Parts inventory with reservation system');
    console.log('   - Role-based access control');
    console.log('   - Enhanced validation patterns');
    console.log('   - Socket.IO ready data structure');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();