/**
 * Safe helper functions to prevent UI crashes from array operations and nested object access
 */
import React from 'react';

// Safe array operations
export const safeMap = <T, R>(
  array: T[] | undefined | null,
  callback: (item: T, index: number) => R,
  fallback: R[] = []
): R[] => {
  try {
    if (!Array.isArray(array)) return fallback;
    return array.map(callback);
  } catch (error) {
    console.error('safeMap error:', error);
    return fallback;
  }
};

export const safeFilter = <T>(
  array: T[] | undefined | null,
  callback: (item: T, index: number) => boolean,
  fallback: T[] = []
): T[] => {
  try {
    if (!Array.isArray(array)) return fallback;
    return array.filter(callback);
  } catch (error) {
    console.error('safeFilter error:', error);
    return fallback;
  }
};

export const safeReduce = <T, R>(
  array: T[] | undefined | null,
  callback: (acc: R, item: T, index: number) => R,
  initialValue: R
): R => {
  try {
    if (!Array.isArray(array)) return initialValue;
    return array.reduce(callback, initialValue);
  } catch (error) {
    console.error('safeReduce error:', error);
    return initialValue;
  }
};

// Safe nested object access
export const safeGet = <T>(
  obj: any,
  path: string,
  defaultValue: T = undefined as T
): T => {
  try {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = result[key];
    }

    return result !== undefined ? result : defaultValue;
  } catch (error) {
    console.error('safeGet error:', error);
    return defaultValue;
  }
};

// Safe join operation for arrays
export const safeJoin = (
  array: any[] | undefined | null,
  separator: string = ', ',
  fallback: string = 'No items'
): string => {
  try {
    if (!Array.isArray(array) || array.length === 0) return fallback;
    return array.filter(Boolean).join(separator) || fallback;
  } catch (error) {
    console.error('safeJoin error:', error);
    return fallback;
  }
};

// Safe service name extraction for appointments
export const safeGetServiceNames = (
  services: any[] | undefined | null,
  fallback: string = 'No services'
): string => {
  return safeJoin(
    safeMap(services || [], (service) =>
      safeGet(service, 'serviceId.name', safeGet(service, 'serviceName', 'Unknown Service'))
    ),
    ', ',
    fallback
  );
};

// Safe date formatting
export const safeDateFormat = (
  date: string | Date | undefined | null,
  formatter: (date: string | Date) => string,
  fallback: string = 'Invalid date'
): string => {
  try {
    if (!date) return fallback;
    return formatter(date);
  } catch (error) {
    console.error('safeDateFormat error:', error);
    return fallback;
  }
};

// Safe number formatting
export const safeNumberFormat = (
  value: number | undefined | null,
  formatter: (num: number) => string,
  fallback: string = '0'
): string => {
  try {
    if (typeof value !== 'number' || isNaN(value)) return fallback;
    return formatter(value);
  } catch (error) {
    console.error('safeNumberFormat error:', error);
    return fallback;
  }
};

// Safe appointment status check
export const safeGetAppointmentStatus = (
  appointment: any,
  fallback: string = 'Unknown'
): string => {
  return safeGet(appointment, 'status', fallback);
};

// Safe vehicle info extraction
export const safeGetVehicleInfo = (vehicle: any): {
  make: string;
  model: string;
  year: string;
  licensePlate: string;
} => {
  return {
    make: safeGet(vehicle, 'make', 'Unknown'),
    model: safeGet(vehicle, 'model', 'Vehicle'),
    year: safeGet(vehicle, 'year', 'N/A'),
    licensePlate: safeGet(vehicle, 'licensePlate', 'N/A')
  };
};

// Safe customer info extraction
export const safeGetCustomerInfo = (customer: any): {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
} => {
  const firstName = safeGet(customer, 'firstName', '');
  const lastName = safeGet(customer, 'lastName', 'Unknown Customer');

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim() || 'Unknown Customer',
    email: safeGet(customer, 'email', 'No email'),
    phone: safeGet(customer, 'phone', 'No phone')
  };
};

// Safe try-catch wrapper for any operation
export const safeTry = <T>(
  operation: () => T,
  fallback: T,
  onError?: (error: Error) => void
): T => {
  try {
    return operation();
  } catch (error) {
    console.error('safeTry caught error:', error);
    onError?.(error as Error);
    return fallback;
  }
};

// Safe async operation wrapper
export const safeAsync = async <T>(
  operation: () => Promise<T>,
  fallback: T,
  onError?: (error: Error) => void
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error('safeAsync caught error:', error);
    onError?.(error as Error);
    return fallback;
  }
};

// Type guard functions
export const isValidArray = (value: any): value is any[] => {
  return Array.isArray(value) && value.length > 0;
};

export const isValidObject = (value: any): value is object => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const isValidString = (value: any): value is string => {
  return typeof value === 'string' && value.length > 0;
};

export const isValidNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

// Safe array rendering for React components
export const safeRenderArray = <T>(
  array: T[] | undefined | null,
  renderItem: (item: T, index: number) => React.ReactNode,
  EmptyComponent?: React.ComponentType,
  fallbackMessage = 'No items available'
): React.ReactNode => {
  if (!Array.isArray(array) || array.length === 0) {
    if (EmptyComponent) {
      return <EmptyComponent />;
    }
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{fallbackMessage}</p>
      </div>
    );
  }

  return array.map(renderItem);
};

// Safe array check for conditions
export const safeArrayLength = (array: any[] | undefined | null): number => {
  return Array.isArray(array) ? array.length : 0;
};

// Safe array check for empty state
export const isArrayEmpty = (array: any[] | undefined | null): boolean => {
  return !Array.isArray(array) || array.length === 0;
};

// Enhanced safe mapping with error boundary
export const safeMappingWithFallback = <T, R>(
  array: T[] | undefined | null,
  mapFunction: (item: T, index: number) => R,
  fallbackValue: R[] = [],
  onError?: (error: Error, item: T, index: number) => void
): R[] => {
  try {
    if (!Array.isArray(array)) return fallbackValue;

    return array.map((item, index) => {
      try {
        return mapFunction(item, index);
      } catch (error) {
        console.error(`Error mapping item at index ${index}:`, error);
        onError?.(error as Error, item, index);
        return null as any;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error('Error in safeMappingWithFallback:', error);
    return fallbackValue;
  }
};

// React hook for safe array state
export const useSafeArray = <T>(initialValue: T[] = []): [T[], (value: T[] | ((prev: T[]) => T[])) => void] => {
  const [array, setArray] = React.useState<T[]>(Array.isArray(initialValue) ? initialValue : []);

  const setSafeArray = React.useCallback((value: T[] | ((prev: T[]) => T[])) => {
    if (typeof value === 'function') {
      setArray(prev => {
        const newValue = value(Array.isArray(prev) ? prev : []);
        return Array.isArray(newValue) ? newValue : [];
      });
    } else {
      setArray(Array.isArray(value) ? value : []);
    }
  }, []);

  return [array, setSafeArray];
};