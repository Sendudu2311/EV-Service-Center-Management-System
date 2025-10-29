/**
 * Warranty utility functions for calculating expiry dates and status
 */

export interface Warranty {
  duration: number; // in days
  type: string;
  description: string;
}

export interface WarrantyStatus {
  isActive: boolean;
  isExpiring: boolean; // within 30 days of expiry
  isExpired: boolean;
  expiryDate: Date;
  daysRemaining: number;
}

/**
 * Calculate warranty expiry date from appointment/service date
 * @param serviceDate - The date when service was completed
 * @param warranty - Warranty information with duration in days
 * @returns Date object representing warranty expiry
 */
export const calculateWarrantyExpiry = (
  serviceDate: string | Date,
  warranty: Warranty
): Date => {
  const startDate = new Date(serviceDate);
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + warranty.duration);
  return expiryDate;
};

/**
 * Get warranty status including expiry date and remaining days
 * @param serviceDate - The date when service was completed
 * @param warranty - Warranty information
 * @returns WarrantyStatus object with detailed status information
 */
export const getWarrantyStatus = (
  serviceDate: string | Date,
  warranty: Warranty
): WarrantyStatus => {
  const expiryDate = calculateWarrantyExpiry(serviceDate, warranty);
  const now = new Date();
  const daysRemaining = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isActive: daysRemaining > 0,
    isExpiring: daysRemaining > 0 && daysRemaining <= 30,
    isExpired: daysRemaining <= 0,
    expiryDate,
    daysRemaining: Math.max(0, daysRemaining),
  };
};

/**
 * Format warranty duration in human-readable format
 * @param duration - Duration in days
 * @returns Formatted string (e.g., "1 năm", "6 tháng", "30 ngày")
 */
export const formatWarrantyDuration = (duration: number): string => {
  if (duration >= 365) {
    const years = Math.floor(duration / 365);
    return `${years} năm`;
  } else if (duration >= 30) {
    const months = Math.floor(duration / 30);
    return `${months} tháng`;
  } else {
    return `${duration} ngày`;
  }
};

/**
 * Get warranty type label in Vietnamese
 * @param type - Warranty type
 * @returns Translated warranty type
 */
export const getWarrantyTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    manufacturer: 'Bảo hành nhà sản xuất',
    dealer: 'Bảo hành đại lý',
    extended: 'Bảo hành mở rộng',
    limited: 'Bảo hành có điều kiện',
    parts: 'Bảo hành phụ tùng',
    service: 'Bảo hành dịch vụ',
  };
  return labels[type] || type;
};

/**
 * Get warranty badge color based on status
 * @param status - Warranty status
 * @returns Tailwind CSS classes for badge styling
 */
export const getWarrantyBadgeColor = (status: WarrantyStatus): string => {
  if (status.isExpired) {
    return 'bg-dark-100 text-gray-800';
  } else if (status.isExpiring) {
    return 'bg-yellow-100 text-yellow-800';
  } else {
    return 'bg-green-100 text-green-800';
  }
};

/**
 * Get warranty status text
 * @param status - Warranty status
 * @returns Human-readable status text
 */
export const getWarrantyStatusText = (status: WarrantyStatus): string => {
  if (status.isExpired) {
    return 'Hết hạn';
  } else if (status.isExpiring) {
    return `Còn ${status.daysRemaining} ngày`;
  } else {
    return `Còn ${status.daysRemaining} ngày`;
  }
};
