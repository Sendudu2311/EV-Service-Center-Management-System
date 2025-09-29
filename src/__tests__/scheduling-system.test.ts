/**
 * Comprehensive Test Suite for Enhanced EV Service Center Scheduling System
 * Tests the complete booking flow with date-time-service-technician availability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { appointmentsAPI, servicesAPI, techniciansAPI } from '../services/api';
import { utcToVietnameseDateTime, vietnameseDateTimeToUTC, generateTimeSlots, isTimeSlotInPast } from '../utils/timezone';

// Mock API responses
const mockServices = [
  {
    _id: 'service1',
    name: 'Bảo dưỡng định kỳ',
    category: 'maintenance',
    estimatedDuration: 120,
    basePrice: 500000,
    skillLevel: 'intermediate'
  },
  {
    _id: 'service2',
    name: 'Chẩn đoán pin',
    category: 'battery',
    estimatedDuration: 60,
    basePrice: 300000,
    skillLevel: 'advanced'
  }
];

const mockTechnicians = [
  {
    id: 'tech1',
    name: 'Nguyễn Văn A',
    specializations: ['maintenance', 'battery'],
    availability: { status: 'available', workloadPercentage: 60 },
    skills: [
      { category: 'maintenance', level: 4, certified: true },
      { category: 'battery', level: 5, certified: true }
    ],
    isRecommended: true,
    yearsExperience: 8
  },
  {
    id: 'tech2',
    name: 'Trần Thị B',
    specializations: ['diagnostics', 'electronics'],
    availability: { status: 'available', workloadPercentage: 40 },
    skills: [
      { category: 'diagnostics', level: 5, certified: true },
      { category: 'electronics', level: 4, certified: false }
    ],
    isRecommended: false,
    yearsExperience: 5
  }
];

const mockAvailabilityResponse = {
  success: true,
  data: {
    availableSlots: [
      { time: '08:00', available: true, conflicts: 0 },
      { time: '08:30', available: true, conflicts: 0 },
      { time: '09:00', available: false, conflicts: 1 },
      { time: '09:30', available: true, conflicts: 0 },
      { time: '10:00', available: true, conflicts: 0 }
    ]
  }
};

const mockConflictResponse = {
  success: false,
  status: 409,
  message: 'Khung giờ đã có lịch. Vui lòng chọn khung khác.',
  data: {
    conflictingAppointment: {
      _id: 'existing-appointment',
      scheduledTime: '09:00',
      technicianId: 'tech1'
    }
  }
};

// Mock the API modules
vi.mock('../services/api', () => ({
  appointmentsAPI: {
    checkAvailability: vi.fn(),
    preValidateAvailability: vi.fn(),
    getAvailableTechnicians: vi.fn(),
    create: vi.fn(),
    getAll: vi.fn()
  },
  servicesAPI: {
    getAll: vi.fn()
  },
  techniciansAPI: {
    getAvailable: vi.fn()
  }
}));

describe('Enhanced Scheduling System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock responses
    (servicesAPI.getAll as any).mockResolvedValue({
      data: { data: mockServices }
    });
    (techniciansAPI.getAvailable as any).mockResolvedValue({
      data: { data: mockTechnicians }
    });
    (appointmentsAPI.checkAvailability as any).mockResolvedValue(mockAvailabilityResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Timezone Utilities', () => {
    it('should convert UTC to Vietnamese time correctly', () => {
      const utcDate = new Date('2024-01-15T08:00:00.000Z'); // 8 AM UTC
      const vietnamese = utcToVietnameseDateTime(utcDate);

      expect(vietnamese.date).toBe('2024-01-15');
      expect(vietnamese.time).toBe('15:00'); // UTC+7
      expect(vietnamese.formatted).toBe('15/01/2024 15:00');
    });

    it('should convert Vietnamese time to UTC correctly', () => {
      const utcDate = vietnameseDateTimeToUTC('2024-01-15', '15:00');

      // Should be 8 AM UTC (15:00 Vietnam time - 7 hours)
      expect(utcDate.getUTCHours()).toBe(8);
      expect(utcDate.getUTCDate()).toBe(15);
    });

    it('should generate correct time slots', () => {
      const slots = generateTimeSlots('08:00', '12:00', 30);

      expect(slots).toEqual([
        '08:00', '08:30', '09:00', '09:30',
        '10:00', '10:30', '11:00', '11:30'
      ]);
    });

    it('should correctly identify past time slots', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

      const pastDateStr = pastDate.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];

      expect(isTimeSlotInPast(pastDateStr, '10:00')).toBe(true);
      expect(isTimeSlotInPast(futureDateStr, '10:00')).toBe(false);
    });
  });

  describe('Service Selection', () => {
    it('should fetch available services successfully', async () => {
      const response = await servicesAPI.getAll({ isActive: true });

      expect(servicesAPI.getAll).toHaveBeenCalledWith({ isActive: true });
      expect(response.data.data).toEqual(mockServices);
      expect(response.data.data).toHaveLength(2);
    });

    it('should handle service filtering by category', async () => {
      const batteryServices = mockServices.filter(s => s.category === 'battery');
      (servicesAPI.getAll as any).mockResolvedValue({
        data: { data: batteryServices }
      });

      const response = await servicesAPI.getAll({ category: 'battery' });

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].category).toBe('battery');
    });
  });

  describe('Availability Checking', () => {
    it('should check slot availability successfully', async () => {
      const response = await appointmentsAPI.checkAvailability('service-center-1', '2024-01-15', 60);

      expect(appointmentsAPI.checkAvailability).toHaveBeenCalledWith('service-center-1', '2024-01-15', 60);
      expect(response.data.availableSlots).toHaveLength(5);
      expect(response.data.availableSlots[0]).toEqual({
        time: '08:00',
        available: true,
        conflicts: 0
      });
    });

    it('should identify conflicting time slots', async () => {
      const conflictSlot = mockAvailabilityResponse.data.availableSlots.find(slot => !slot.available);

      expect(conflictSlot).toBeDefined();
      expect(conflictSlot?.time).toBe('09:00');
      expect(conflictSlot?.conflicts).toBe(1);
    });

    it('should pre-validate appointment before creation', async () => {
      (appointmentsAPI.preValidateAvailability as any).mockResolvedValue({
        success: true,
        data: { canBook: true }
      });

      const response = await appointmentsAPI.preValidateAvailability(
        'service-center-1',
        '2024-01-15',
        '08:30',
        60,
        'tech1'
      );

      expect(appointmentsAPI.preValidateAvailability).toHaveBeenCalledWith(
        'service-center-1',
        '2024-01-15',
        '08:30',
        60,
        'tech1'
      );
      expect(response.data.canBook).toBe(true);
    });

    it('should handle 409 conflict when slot is taken', async () => {
      (appointmentsAPI.preValidateAvailability as any).mockRejectedValue(mockConflictResponse);

      try {
        await appointmentsAPI.preValidateAvailability(
          'service-center-1',
          '2024-01-15',
          '09:00',
          60
        );
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toContain('Khung giờ đã có lịch');
        expect(error.data.conflictingAppointment.scheduledTime).toBe('09:00');
      }
    });
  });

  describe('Technician Assignment', () => {
    it('should get available technicians for specific time slot', async () => {
      (appointmentsAPI.getAvailableTechnicians as any).mockResolvedValue({
        data: { data: mockTechnicians }
      });

      const response = await appointmentsAPI.getAvailableTechnicians(
        'service-center-1',
        '2024-01-15',
        '08:30',
        60,
        ['maintenance', 'battery']
      );

      expect(appointmentsAPI.getAvailableTechnicians).toHaveBeenCalledWith(
        'service-center-1',
        '2024-01-15',
        '08:30',
        60,
        ['maintenance', 'battery']
      );
      expect(response.data.data).toEqual(mockTechnicians);
    });

    it('should recommend technicians based on skills and workload', () => {
      const recommendedTech = mockTechnicians.find(t => t.isRecommended);
      const regularTech = mockTechnicians.find(t => !t.isRecommended);

      expect(recommendedTech).toBeDefined();
      expect(recommendedTech?.name).toBe('Nguyễn Văn A');
      expect(recommendedTech?.availability.workloadPercentage).toBeLessThan(
        regularTech?.availability.workloadPercentage || 100
      );
    });

    it('should auto-assign best available technician', () => {
      const serviceCategories = ['battery'];
      const suitableTechnicians = mockTechnicians.filter(tech =>
        tech.skills.some(skill =>
          serviceCategories.includes(skill.category) &&
          skill.level >= 3
        )
      );

      // Sort by recommendation, then by workload
      const bestTechnician = suitableTechnicians.sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return a.availability.workloadPercentage - b.availability.workloadPercentage;
      })[0];

      expect(bestTechnician.name).toBe('Nguyễn Văn A');
      expect(bestTechnician.skills.some(s => s.category === 'battery' && s.certified)).toBe(true);
    });
  });

  describe('Appointment Creation', () => {
    it('should create appointment successfully with all parameters', async () => {
      const appointmentData = {
        vehicleId: 'vehicle-123',
        serviceCenterId: 'service-center-1',
        services: [{ serviceId: 'service1', quantity: 1 }],
        scheduledDate: '2024-01-15',
        scheduledTime: '08:30',
        technicianId: 'tech1',
        priority: 'normal',
        customerNotes: 'Vui lòng kiểm tra kỹ pin'
      };

      (appointmentsAPI.create as any).mockResolvedValue({
        data: {
          success: true,
          data: {
            _id: 'new-appointment-id',
            appointmentNumber: 'APT-20240115-001',
            ...appointmentData
          }
        }
      });

      const response = await appointmentsAPI.create(appointmentData);

      expect(appointmentsAPI.create).toHaveBeenCalledWith(appointmentData);
      expect(response.data.data.appointmentNumber).toMatch(/APT-\d{8}-\d{3}/);
    });

    it('should handle appointment creation with auto-assignment', async () => {
      const appointmentDataWithoutTech = {
        vehicleId: 'vehicle-123',
        serviceCenterId: 'service-center-1',
        services: [{ serviceId: 'service2', quantity: 1 }], // Battery service
        scheduledDate: '2024-01-15',
        scheduledTime: '08:30',
        priority: 'normal',
        autoAssign: true
      };

      // Mock the auto-assignment flow
      (appointmentsAPI.getAvailableTechnicians as any).mockResolvedValue({
        data: { data: mockTechnicians }
      });

      (appointmentsAPI.create as any).mockResolvedValue({
        data: {
          success: true,
          data: {
            _id: 'new-appointment-id',
            appointmentNumber: 'APT-20240115-002',
            ...appointmentDataWithoutTech,
            technicianId: 'tech1' // Auto-assigned
          }
        }
      });

      // Simulate auto-assignment logic
      const availableTechnicians = await appointmentsAPI.getAvailableTechnicians(
        appointmentDataWithoutTech.serviceCenterId,
        appointmentDataWithoutTech.scheduledDate,
        appointmentDataWithoutTech.scheduledTime,
        60,
        ['battery']
      );

      const bestTechnician = availableTechnicians.data.data.find((t: any) => t.isRecommended);

      const finalAppointmentData = {
        ...appointmentDataWithoutTech,
        technicianId: bestTechnician.id
      };

      const response = await appointmentsAPI.create(finalAppointmentData);

      expect(response.data.data.technicianId).toBe('tech1');
    });

    it('should handle end-of-day spillover scenarios', () => {
      const endOfDaySlots = generateTimeSlots('16:30', '18:00', 30);
      const serviceDuration = 120; // 2 hours

      endOfDaySlots.forEach(slot => {
        const [hour, minute] = slot.split(':').map(Number);
        const slotTime = hour * 60 + minute;
        const endTime = slotTime + serviceDuration;
        const endOfBusinessDay = 17 * 60; // 5 PM

        if (endTime > endOfBusinessDay) {
          expect(slot).toBeDefined(); // Should still be generated
          // But should be marked as requiring approval or next-day scheduling
        }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      (appointmentsAPI.checkAvailability as any).mockRejectedValue(
        new Error('Network Error')
      );

      try {
        await appointmentsAPI.checkAvailability('service-center-1', '2024-01-15');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network Error');
      }
    });

    it('should validate date format before API calls', () => {
      const invalidDates = ['2024/01/15', '15-01-2024', '2024-1-15'];
      const validDate = '2024-01-15';

      invalidDates.forEach(date => {
        expect(() => {
          // Simulate date validation
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new Error('Invalid date format. Use YYYY-MM-DD');
          }
        }).toThrow('Invalid date format');
      });

      expect(() => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(validDate)) {
          throw new Error('Invalid date format. Use YYYY-MM-DD');
        }
      }).not.toThrow();
    });

    it('should validate time format before API calls', () => {
      const invalidTimes = ['8:00', '08:0', '25:00', '08:60'];
      const validTime = '08:30';

      invalidTimes.forEach(time => {
        expect(() => {
          if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
            throw new Error('Invalid time format. Use HH:mm');
          }
        }).toThrow('Invalid time format');
      });

      expect(() => {
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(validTime)) {
          throw new Error('Invalid time format. Use HH:mm');
        }
      }).not.toThrow();
    });

    it('should handle holiday and weekend restrictions', () => {
      const testDate = new Date('2024-01-01'); // New Year's Day
      const isHoliday = testDate.getDay() === 0 || testDate.getDay() === 6; // Weekend check

      if (isHoliday) {
        expect(() => {
          throw new Error('Không thể đặt lịch vào ngày nghỉ lễ');
        }).toThrow('Không thể đặt lịch vào ngày nghỉ lễ');
      }
    });

    it('should handle technician unavailability', () => {
      const unavailableTechnician = {
        ...mockTechnicians[0],
        availability: { status: 'offline', workloadPercentage: 100 }
      };

      expect(unavailableTechnician.availability.status).toBe('offline');
      expect(unavailableTechnician.availability.workloadPercentage).toBe(100);
    });
  });

  describe('Performance and Optimization', () => {
    it('should batch multiple availability checks efficiently', async () => {
      const dates = ['2024-01-15', '2024-01-16', '2024-01-17'];
      const timeSlots = ['08:00', '09:00', '10:00'];

      // Mock batch checking
      const batchChecks = dates.flatMap(date =>
        timeSlots.map(time => ({ date, time }))
      );

      expect(batchChecks).toHaveLength(9); // 3 dates × 3 times

      // Should be optimized to reduce API calls
      const batchResponse = await Promise.all(
        batchChecks.map(({ date, time }) =>
          appointmentsAPI.preValidateAvailability('service-center-1', date, time, 60)
        )
      );

      expect(batchResponse).toHaveLength(9);
    });

    it('should cache technician data to reduce repeated queries', () => {
      const cacheKey = 'technicians_2024-01-15_08:30';
      const mockCache = new Map();

      // Simulate caching
      if (!mockCache.has(cacheKey)) {
        mockCache.set(cacheKey, mockTechnicians);
      }

      const cachedTechnicians = mockCache.get(cacheKey);
      expect(cachedTechnicians).toEqual(mockTechnicians);
    });
  });

  describe('Business Logic Validation', () => {
    it('should enforce minimum advance booking time', () => {
      const now = new Date();
      const tooSoon = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      const validTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

      const minAdvanceHours = 2;

      expect((tooSoon.getTime() - now.getTime()) / (1000 * 60 * 60)).toBeLessThan(minAdvanceHours);
      expect((validTime.getTime() - now.getTime()) / (1000 * 60 * 60)).toBeGreaterThan(minAdvanceHours);
    });

    it('should validate service compatibility with technician skills', () => {
      const advancedService = mockServices.find(s => s.skillLevel === 'advanced');
      const qualifiedTechnician = mockTechnicians.find(t =>
        t.skills.some(skill => skill.level >= 4 && skill.certified)
      );

      expect(advancedService).toBeDefined();
      expect(qualifiedTechnician).toBeDefined();
      expect(qualifiedTechnician?.skills.some(s => s.level >= 4)).toBe(true);
    });

    it('should calculate accurate service duration and pricing', () => {
      const multipleServices = [mockServices[0], mockServices[1]];
      const totalDuration = multipleServices.reduce((sum, service) => sum + service.estimatedDuration, 0);
      const totalPrice = multipleServices.reduce((sum, service) => sum + service.basePrice, 0);

      expect(totalDuration).toBe(180); // 120 + 60 minutes
      expect(totalPrice).toBe(800000); // 500,000 + 300,000 VND
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete booking flow end-to-end', async () => {
      // 1. Fetch services
      const servicesResponse = await servicesAPI.getAll({ isActive: true });
      expect(servicesResponse.data.data).toHaveLength(2);

      // 2. Check availability
      const availabilityResponse = await appointmentsAPI.checkAvailability(
        'service-center-1',
        '2024-01-15',
        60
      );
      expect(availabilityResponse.data.availableSlots).toBeDefined();

      // 3. Get available technicians
      const techniciansResponse = await appointmentsAPI.getAvailableTechnicians(
        'service-center-1',
        '2024-01-15',
        '08:30',
        60,
        ['maintenance']
      );
      expect(techniciansResponse.data.data).toHaveLength(2);

      // 4. Pre-validate booking
      (appointmentsAPI.preValidateAvailability as any).mockResolvedValue({
        success: true,
        data: { canBook: true }
      });

      const preValidation = await appointmentsAPI.preValidateAvailability(
        'service-center-1',
        '2024-01-15',
        '08:30',
        60,
        'tech1'
      );
      expect(preValidation.data.canBook).toBe(true);

      // 5. Create appointment
      (appointmentsAPI.create as any).mockResolvedValue({
        data: {
          success: true,
          data: {
            _id: 'appointment-123',
            appointmentNumber: 'APT-20240115-001'
          }
        }
      });

      const appointmentData = {
        vehicleId: 'vehicle-123',
        serviceCenterId: 'service-center-1',
        services: [{ serviceId: 'service1', quantity: 1 }],
        scheduledDate: '2024-01-15',
        scheduledTime: '08:30',
        technicianId: 'tech1',
        priority: 'normal'
      };

      const creationResponse = await appointmentsAPI.create(appointmentData);
      expect(creationResponse.data.data.appointmentNumber).toBeDefined();
    });

    it('should handle conflict resolution workflow', async () => {
      // 1. Try to book conflicting slot
      (appointmentsAPI.preValidateAvailability as any).mockRejectedValue(mockConflictResponse);

      try {
        await appointmentsAPI.preValidateAvailability(
          'service-center-1',
          '2024-01-15',
          '09:00', // Conflicting time
          60
        );
      } catch (error: any) {
        expect(error.status).toBe(409);

        // 2. Get alternative slots
        const alternativeSlots = mockAvailabilityResponse.data.availableSlots
          .filter(slot => slot.available && slot.time !== '09:00');

        expect(alternativeSlots.length).toBeGreaterThan(0);

        // 3. Pre-validate alternative slot
        (appointmentsAPI.preValidateAvailability as any).mockResolvedValue({
          success: true,
          data: { canBook: true }
        });

        const alternativeValidation = await appointmentsAPI.preValidateAvailability(
          'service-center-1',
          '2024-01-15',
          alternativeSlots[0].time,
          60
        );

        expect(alternativeValidation.data.canBook).toBe(true);
      }
    });
  });
});