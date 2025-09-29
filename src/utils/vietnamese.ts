import { format, parseISO, formatDistanceToNow, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';

// Vietnamese currency formatting
export const formatVND = (amount: number): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0 ₫';
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format VND without currency symbol
export const formatVNDNumber = (amount: number): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0';
  }

  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Vietnamese phone number validation
export const isValidVietnamesePhone = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Vietnamese phone number patterns:
  // Mobile: 09x, 08x, 07x, 05x, 03x (10 digits)
  // Landline: Area code + 7-8 digits
  const mobilePattern = /^(09|08|07|05|03)[0-9]{8}$/;
  const landlinePattern = /^(02[4-9]|024|028|023|025|026|027|029|022)[0-9]{7,8}$/;

  return mobilePattern.test(cleaned) || landlinePattern.test(cleaned);
};

// Format Vietnamese phone number
export const formatVietnamesePhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10 && /^(09|08|07|05|03)/.test(cleaned)) {
    // Mobile format: 0xxx xxx xxx
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  } else if (cleaned.length >= 10 && /^02/.test(cleaned)) {
    // Landline format: 0xx xxxx xxxx
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
  }

  return phone; // Return original if doesn't match pattern
};

// Vietnamese date formatting
export const formatVietnameseDate = (date: string | Date, formatString: string = 'dd/MM/yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatString, { locale: vi });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Ngày không hợp lệ';
  }
};

// Vietnamese datetime formatting
export const formatVietnameseDateTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      console.warn('Invalid date provided to formatVietnameseDateTime:', date);
      return 'Ngày giờ không hợp lệ';
    }
    return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: vi });
  } catch (error) {
    console.error('DateTime formatting error:', error, 'Input:', date);
    return 'Ngày giờ không hợp lệ';
  }
};

// Safe datetime combining function for Vietnamese appointments
export const combineDateTime = (dateStr: string, timeStr: string): string => {
  try {
    // Validate inputs
    if (!dateStr || !timeStr) {
      console.warn('Missing date or time:', { dateStr, timeStr });
      return new Date().toISOString();
    }

    // Handle various date formats
    let isoDateStr: string;

    if (dateStr.includes('T') || dateStr.includes('Z')) {
      // Already in ISO format - extract date part
      isoDateStr = dateStr.split('T')[0];
    } else if (dateStr.includes('/')) {
      // DD/MM/YYYY or MM/DD/YYYY format - convert to ISO
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [first, second, third] = parts;
        // Assume DD/MM/YYYY format for Vietnamese context
        if (third.length === 4) {
          isoDateStr = `${third}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
        } else {
          // Assume MM/DD/YYYY
          isoDateStr = `${third}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
        }
      } else {
        console.warn('Invalid date format:', dateStr);
        return new Date().toISOString();
      }
    } else if (dateStr.includes('-') && dateStr.length === 10) {
      // Already YYYY-MM-DD format
      isoDateStr = dateStr;
    } else {
      console.warn('Unrecognized date format:', dateStr);
      return new Date().toISOString();
    }

    // Handle time format - ensure HH:MM format
    let timeFormatted: string;
    if (timeStr.includes(':')) {
      const timeParts = timeStr.split(':');
      if (timeParts.length >= 2) {
        const hours = timeParts[0].padStart(2, '0');
        const minutes = timeParts[1].padStart(2, '0');
        timeFormatted = `${hours}:${minutes}`;
      } else {
        console.warn('Invalid time format:', timeStr);
        timeFormatted = '09:00'; // Default fallback
      }
    } else {
      // Assume it's hour only
      const hour = parseInt(timeStr, 10);
      if (isNaN(hour) || hour < 0 || hour > 23) {
        console.warn('Invalid hour:', timeStr);
        timeFormatted = '09:00';
      } else {
        timeFormatted = `${hour.toString().padStart(2, '0')}:00`;
      }
    }

    // Validate date components
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(isoDateStr)) {
      console.warn('Invalid ISO date format after conversion:', isoDateStr);
      return new Date().toISOString();
    }

    // Combine and validate - don't add Z suffix for local datetime
    const combined = `${isoDateStr}T${timeFormatted}:00`;
    const testDate = new Date(combined);

    if (isNaN(testDate.getTime())) {
      console.warn('Invalid date/time combination:', { dateStr, timeStr, isoDateStr, timeFormatted, combined });
      return new Date().toISOString();
    }

    return testDate.toISOString();
  } catch (error) {
    console.error('Error combining date/time:', error, { dateStr, timeStr });
    return new Date().toISOString();
  }
};

// Vietnamese time formatting
export const formatVietnameseTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'HH:mm', { locale: vi });
  } catch (error) {
    console.error('Time formatting error:', error);
    return 'Giờ không hợp lệ';
  }
};

// Vietnamese relative time (time ago)
export const formatVietnameseTimeAgo = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: vi });
  } catch (error) {
    console.error('Time ago formatting error:', error);
    return 'Thời gian không hợp lệ';
  }
};

// Vietnamese ID number validation (CCCD/CMND)
export const isValidVietnameseID = (id: string): boolean => {
  const cleaned = id.replace(/\D/g, '');

  // CCCD: 12 digits
  // CMND: 9 digits
  return cleaned.length === 12 || cleaned.length === 9;
};

// Format Vietnamese ID number
export const formatVietnameseID = (id: string): string => {
  const cleaned = id.replace(/\D/g, '');

  if (cleaned.length === 12) {
    // CCCD format: xxx xxx xxx xxx
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  } else if (cleaned.length === 9) {
    // CMND format: xxx xxx xxx
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }

  return id; // Return original if doesn't match pattern
};

// Vietnamese business tax code validation
export const isValidVietnameseTaxCode = (taxCode: string): boolean => {
  const cleaned = taxCode.replace(/\D/g, '');

  // Vietnamese business tax code: 10-13 digits
  return cleaned.length >= 10 && cleaned.length <= 13;
};

// Vietnamese address formatting
export const formatVietnameseAddress = (address: {
  street?: string;
  ward?: string;
  district?: string;
  city?: string;
  country?: string;
}): string => {
  const parts = [
    address.street,
    address.ward,
    address.district,
    address.city,
  ].filter(Boolean);

  return parts.join(', ');
};

// Vietnamese number to words (for invoice amounts)
export const numberToVietnameseWords = (amount: number): string => {
  if (amount === 0) return 'Không đồng';

  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];

  const convertHundreds = (num: number): string => {
    let result = '';
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;

    if (hundred > 0) {
      result += ones[hundred] + ' trăm';
    }

    if (remainder > 0) {
      if (result) result += ' ';

      if (remainder < 10) {
        if (hundred > 0) result += 'lẻ ';
        result += ones[remainder];
      } else if (remainder < 20) {
        result += 'mười';
        if (remainder > 10) result += ' ' + ones[remainder - 10];
      } else {
        const ten = Math.floor(remainder / 10);
        const one = remainder % 10;
        result += tens[ten];
        if (one > 0) result += ' ' + ones[one];
      }
    }

    return result;
  };

  let result = '';
  let scaleIndex = 0;

  while (amount > 0) {
    const chunk = amount % 1000;
    if (chunk > 0) {
      const chunkWords = convertHundreds(chunk);
      if (scaleIndex > 0) {
        result = chunkWords + ' ' + scales[scaleIndex] + (result ? ' ' + result : '');
      } else {
        result = chunkWords;
      }
    }
    amount = Math.floor(amount / 1000);
    scaleIndex++;
  }

  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
};

// Vietnamese appointment status translations
export const appointmentStatusTranslations: Record<string, string> = {
  // Detailed statuses
  'pending': 'Chờ xác nhận',
  'confirmed': 'Đã xác nhận',
  'customer_arrived': 'Khách hàng đã đến',
  'reception_created': 'Đã tạo phiếu tiếp nhận',
  'reception_approved': 'Phiếu tiếp nhận đã duyệt',
  'parts_insufficient': 'Thiếu phụ tùng',
  'waiting_for_parts': 'Chờ phụ tùng',
  'rescheduled': 'Đã đổi lịch',
  'in_progress': 'Đang thực hiện',
  'parts_requested': 'Đã yêu cầu phụ tùng',
  'completed': 'Hoàn thành',
  'invoiced': 'Đã xuất hóa đơn',
  'cancelled': 'Đã hủy',
  'no_show': 'Không đến',

  // Core statuses
  'Scheduled': 'Đã lên lịch',
  'CheckedIn': 'Đã check-in',
  'InService': 'Đang bảo dưỡng',
  'OnHold': 'Tạm dừng',
  'ReadyForPickup': 'Sẵn sàng nhận xe',
  'Closed': 'Đã đóng',
};

// Vietnamese service type translations
export const serviceTypeTranslations: Record<string, string> = {
  'battery': 'Pin/Ắc quy',
  'motor': 'Động cơ điện',
  'charging': 'Hệ thống sạc',
  'electronics': 'Hệ thống điện tử',
  'body': 'Thân vỏ',
  'general': 'Bảo dưỡng tổng quát',
  'diagnostic': 'Chẩn đoán',
};

// Vietnamese priority translations
export const priorityTranslations: Record<string, string> = {
  'low': 'Thấp',
  'normal': 'Bình thường',
  'high': 'Cao',
  'urgent': 'Khẩn cấp',
  'critical': 'Rất khẩn cấp',
};

// Vietnamese role translations
export const roleTranslations: Record<string, string> = {
  'customer': 'Khách hàng',
  'staff': 'Nhân viên',
  'technician': 'Kỹ thuật viên',
  'admin': 'Quản trị viên',
};

// Vietnamese payment method translations
export const paymentMethodTranslations: Record<string, string> = {
  'cash': 'Tiền mặt',
  'card': 'Thẻ ngân hàng',
  'bank_transfer': 'Chuyển khoản',
  'e_wallet': 'Ví điện tử',
  'cheque': 'Séc',
  'installment': 'Trả góp',
};

// Vietnamese payment status translations
export const paymentStatusTranslations: Record<string, string> = {
  'unpaid': 'Chưa thanh toán',
  'partially_paid': 'Thanh toán một phần',
  'paid': 'Đã thanh toán',
  'overdue': 'Quá hạn',
  'refunded': 'Đã hoàn tiền',
};

// Calculate Vietnamese VAT (10%)
export const calculateVAT = (amount: number, rate: number = 10): number => {
  return Math.round(amount * rate / 100);
};

// Format Vietnamese invoice number
export const formatInvoiceNumber = (invoiceNumber: string): string => {
  // Format: INV241218001 -> INV-24/12/18-001
  if (invoiceNumber.match(/^INV\d{9}$/)) {
    const year = invoiceNumber.slice(3, 5);
    const month = invoiceNumber.slice(5, 7);
    const day = invoiceNumber.slice(7, 9);
    const sequence = invoiceNumber.slice(9);

    return `INV-${year}/${month}/${day}-${sequence}`;
  }

  return invoiceNumber;
};

// Generate Vietnamese appointment number
export const generateAppointmentNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  return `APT${year}${month}${day}${random}`;
};

// Vietnamese input validation patterns
export const vietnameseValidationPatterns = {
  phone: /^(09|08|07|05|03)[0-9]{8}$|^(02[4-9]|024|028|023|025|026|027|029|022)[0-9]{7,8}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  vietnameseName: /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/,
  vin: /^[A-HJ-NPR-Z0-9]{17}$/,
  licensePlate: /^[0-9]{2}[A-Z]{1,2}-[0-9]{4,5}$/,
  taxCode: /^[0-9]{10,13}$/,
  cccd: /^[0-9]{12}$/,
  cmnd: /^[0-9]{9}$/,
};