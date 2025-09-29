/**
 * Test cases for common error patterns that could crash the UI
 */

import { describe, it, expect, vi } from 'vitest';
import {
  safeMap,
  safeFilter,
  safeGet,
  safeJoin,
  safeGetServiceNames,
  safeDateFormat,
  safeNumberFormat,
  safeGetVehicleInfo,
  safeGetCustomerInfo,
  safeTry,
  isValidArray,
  isValidObject
} from '../utils/safeHelpers';
import { formatVietnameseDateTime, formatVND } from '../utils/vietnamese';

describe('Error Pattern Tests', () => {
  describe('Array Operation Safety', () => {
    it('should handle null/undefined arrays safely', () => {
      expect(safeMap(null, (x) => x)).toEqual([]);
      expect(safeMap(undefined, (x) => x)).toEqual([]);
      expect(safeFilter(null, (x) => true)).toEqual([]);
      expect(safeFilter(undefined, (x) => true)).toEqual([]);
    });

    it('should handle non-array values passed to array methods', () => {
      const notArray = { length: 2, 0: 'a', 1: 'b' };
      expect(safeMap(notArray as any, (x) => x)).toEqual([]);
      expect(safeFilter(notArray as any, () => true)).toEqual([]);
    });

    it('should handle arrays with null/undefined elements', () => {
      const arrayWithNulls = [null, undefined, 'valid', null];
      expect(safeJoin(arrayWithNulls)).toBe('valid');
      expect(safeFilter(arrayWithNulls, Boolean)).toEqual(['valid']);
    });
  });

  describe('Nested Object Access Safety', () => {
    it('should handle deeply nested null/undefined access', () => {
      const obj = {
        appointment: {
          services: null,
          customer: undefined
        }
      };

      expect(safeGet(obj, 'appointment.services.map', 'fallback')).toBe('fallback');
      expect(safeGet(obj, 'appointment.customer.name', 'Unknown')).toBe('Unknown');
      expect(safeGet(null, 'any.path', 'default')).toBe('default');
    });

    it('should handle service name extraction from malformed data', () => {
      const invalidServices = [
        null,
        undefined,
        {},
        { serviceId: null },
        { serviceId: { name: null } },
        { serviceId: { name: 'Valid Service' } }
      ];

      expect(safeGetServiceNames(invalidServices)).toBe('Valid Service');
      expect(safeGetServiceNames(null)).toBe('No services');
      expect(safeGetServiceNames([])).toBe('No services');
    });
  });

  describe('Date Formatting Safety', () => {
    it('should handle invalid dates gracefully', () => {
      expect(safeDateFormat(null, formatVietnameseDateTime)).toBe('Invalid date');
      expect(safeDateFormat(undefined, formatVietnameseDateTime)).toBe('Invalid date');
      expect(safeDateFormat('invalid-date', formatVietnameseDateTime)).toBe('Ngày giờ không hợp lệ');
      expect(safeDateFormat('', formatVietnameseDateTime)).toBe('Invalid date');
    });

    it('should handle valid dates correctly', () => {
      const validDate = '2024-01-15T10:30:00Z';
      const result = safeDateFormat(validDate, formatVietnameseDateTime);
      expect(result).not.toBe('Invalid date');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });
  });

  describe('Number Formatting Safety', () => {
    it('should handle invalid numbers gracefully', () => {
      expect(safeNumberFormat(null, formatVND)).toBe('0');
      expect(safeNumberFormat(undefined, formatVND)).toBe('0');
      expect(safeNumberFormat(NaN, formatVND)).toBe('0');
      expect(safeNumberFormat('not-a-number' as any, formatVND)).toBe('0');
    });

    it('should format valid numbers correctly', () => {
      expect(safeNumberFormat(100000, formatVND)).toMatch(/₫/);
      expect(safeNumberFormat(0, formatVND)).toBe('0 ₫');
    });
  });

  describe('Data Extraction Safety', () => {
    it('should extract vehicle info safely from malformed data', () => {
      const invalidVehicle = {
        make: null,
        model: undefined,
        // missing year and licensePlate
      };

      const result = safeGetVehicleInfo(invalidVehicle);
      expect(result).toEqual({
        make: 'Unknown',
        model: 'Vehicle',
        year: 'N/A',
        licensePlate: 'N/A'
      });
    });

    it('should extract customer info safely from malformed data', () => {
      const invalidCustomer = {
        firstName: null,
        lastName: undefined,
        // missing email and phone
      };

      const result = safeGetCustomerInfo(invalidCustomer);
      expect(result).toEqual({
        firstName: '',
        lastName: 'Unknown Customer',
        fullName: 'Unknown Customer',
        email: 'No email',
        phone: 'No phone'
      });
    });

    it('should handle completely null customer data', () => {
      const result = safeGetCustomerInfo(null);
      expect(result.fullName).toBe('Unknown Customer');
    });
  });

  describe('Error Handling Wrappers', () => {
    it('should catch and handle synchronous errors', () => {
      const throwingFunction = () => {
        throw new Error('Test error');
      };

      const result = safeTry(throwingFunction, 'fallback');
      expect(result).toBe('fallback');
    });

    it('should call error handler when provided', () => {
      const errorHandler = vi.fn();
      const throwingFunction = () => {
        throw new Error('Test error');
      };

      safeTry(throwingFunction, 'fallback', errorHandler);
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify valid arrays', () => {
      expect(isValidArray([])).toBe(false); // empty array is not valid
      expect(isValidArray([1, 2, 3])).toBe(true);
      expect(isValidArray(null)).toBe(false);
      expect(isValidArray(undefined)).toBe(false);
      expect(isValidArray('not-array')).toBe(false);
    });

    it('should correctly identify valid objects', () => {
      expect(isValidObject({})).toBe(true);
      expect(isValidObject({ key: 'value' })).toBe(true);
      expect(isValidObject([])).toBe(false); // arrays are not valid objects
      expect(isValidObject(null)).toBe(false);
      expect(isValidObject(undefined)).toBe(false);
      expect(isValidObject('string')).toBe(false);
    });
  });
});

describe('Appointment Services Edge Cases', () => {
  it('should handle appointment with no services', () => {
    const appointment = {
      _id: '123',
      services: null
    };

    expect(safeGetServiceNames(appointment.services)).toBe('No services');
  });

  it('should handle appointment with empty services array', () => {
    const appointment = {
      _id: '123',
      services: []
    };

    expect(safeGetServiceNames(appointment.services)).toBe('No services');
  });

  it('should handle appointment with malformed service objects', () => {
    const appointment = {
      _id: '123',
      services: [
        { serviceId: null },
        { serviceId: { name: null } },
        { serviceId: { name: '' } },
        { serviceId: { name: 'Valid Service' } }
      ]
    };

    const result = safeGetServiceNames(appointment.services);
    expect(result).toBe('Valid Service');
  });
});

describe('Real World Crash Scenarios', () => {
  it('should handle the specific case from CustomersPage line 507', () => {
    // Simulating the exact data structure that could cause crashes
    const appointment = {
      services: [
        { serviceId: null },
        { serviceId: { name: undefined } },
        { serviceId: { name: 'Battery Check' } }
      ]
    };

    // This should not throw an error
    const result = safeGetServiceNames(appointment.services);
    expect(result).toBe('Battery Check');
  });

  it('should handle WorkQueuePage service mapping scenarios', () => {
    const appointment = {
      services: null
    };

    // This should not crash when trying to map over null services
    const result = safeMap(appointment.services, (service) => ({
      name: safeGet(service, 'serviceId.name', 'Unknown'),
      category: safeGet(service, 'serviceId.category', 'Unknown')
    }));

    expect(result).toEqual([]);
  });

  it('should handle InvoicePreview nested access patterns', () => {
    const invoice = {
      appointmentId: null
    };

    // These should not crash
    const customerName = safeGet(invoice, 'appointmentId.customerId.firstName', '') + ' ' +
                         safeGet(invoice, 'appointmentId.customerId.lastName', 'Unknown Customer');

    expect(customerName.trim()).toBe('Unknown Customer');

    const vehicleInfo = `${safeGet(invoice, 'appointmentId.vehicleId.make', 'Unknown')} ${safeGet(invoice, 'appointmentId.vehicleId.model', 'Vehicle')}`;
    expect(vehicleInfo).toBe('Unknown Vehicle');
  });
});