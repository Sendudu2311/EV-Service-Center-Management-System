import axios, { AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Replace with your actual API URL
const API_URL = 'http://localhost:3000'; // Update this for production

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Error throttling to prevent spam
const errorThrottle = new Map<string, number>();
const THROTTLE_DURATION = 5000; // 5 seconds

// Response interceptor with optimized error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const errorData = error.response?.data as any;

    // Create throttle key
    const throttleKey = `${status}-${errorData?.error || 'generic'}`;
    const now = Date.now();
    const lastShown = errorThrottle.get(throttleKey);

    // Skip notification if recently shown
    if (lastShown && now - lastShown < THROTTLE_DURATION) {
      return Promise.reject(error);
    }

    if (status === 401) {
      // Check for specific auth error codes
      const authErrors: Record<string, string> = {
        TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        TOKEN_INVALID: 'Mã xác thực không hợp lệ. Vui lòng đăng nhập lại.',
        AUTH_REQUIRED: 'Vui lòng đăng nhập để tiếp tục.',
        USER_NOT_FOUND: 'Tài khoản không tồn tại. Vui lòng đăng nhập lại.',
        ACCOUNT_DISABLED: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.',
      };

      const message =
        authErrors[errorData?.error] ||
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

      await AsyncStorage.removeItem('token');
      errorThrottle.set(throttleKey, now);
      Alert.alert('Lỗi xác thực', message);
    } else if (status === 403) {
      errorThrottle.set(throttleKey, now);
      Alert.alert('Không có quyền', 'Bạn không có quyền truy cập chức năng này.');
    } else if (status && status >= 500) {
      const message =
        errorData?.message || 'Lỗi máy chủ. Vui lòng thử lại sau.';
      errorThrottle.set(throttleKey, now);
      Alert.alert('Lỗi hệ thống', message);
    }

    return Promise.reject(error);
  }
);

// Generic API response type
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

// Authentication API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ user: any; token: string }>>('/api/auth/login', {
      email,
      password,
    }),

  register: (userData: any) =>
    api.post<ApiResponse<{ user: any; token: string }>>(
      '/api/auth/register',
      userData
    ),

  googleAuth: (credential: string) =>
    api.post<ApiResponse<{ user: any; token: string; isNewUser?: boolean; isLinked?: boolean }>>(
      '/api/auth/google-auth',
      { credential }
    ),

  getProfile: () => api.get<ApiResponse<{ user: any }>>('/api/auth/me'),

  updateProfile: (userData: any) =>
    api.put<ApiResponse<{ user: any }>>('/api/auth/profile', userData),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<ApiResponse>('/api/auth/change-password', {
      currentPassword,
      newPassword,
    }),
};

// Vietnamese error messages mapping
const vietnameseErrorMessages: Record<number, string> = {
  400: 'Tham số không hợp lệ. Vui lòng kiểm tra thông tin.',
  401: 'Vui lòng đăng nhập để tiếp tục.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu.',
  409: 'Khung giờ đã có lịch. Vui lòng chọn khung khác.',
  500: 'Có lỗi xảy ra. Vui lòng thử lại.',
};

// Enhanced error handler
const handleApiError = (error: AxiosError): never => {
  const status = error.response?.status || 500;
  const serverMessage = (error.response?.data as any)?.message;
  const vietnameseMessage = vietnameseErrorMessages[status];

  const finalMessage =
    serverMessage && serverMessage.includes('không')
      ? serverMessage
      : vietnameseMessage;

  const enhancedError = new Error(finalMessage) as any;
  enhancedError.status = status;
  enhancedError.response = error.response;
  enhancedError.reasonCode = (error.response?.data as any)?.reasonCode;
  enhancedError.conflicts = (error.response?.data as any)?.conflicts;

  throw enhancedError;
};

// Appointments API
export const appointmentsAPI = {
  getAll: (params?: any) =>
    api
      .get<ApiResponse<any[]>>('/api/appointments', { params })
      .catch(handleApiError),

  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/api/appointments/${id}`).catch(handleApiError),

  create: (appointmentData: any) =>
    api
      .post<ApiResponse<any>>('/api/appointments', appointmentData)
      .catch(handleApiError),

  update: (id: string, updateData: any) =>
    api
      .put<ApiResponse<any>>(`/api/appointments/${id}`, updateData)
      .catch(handleApiError),

  checkAvailability: (date: string, duration?: number) =>
    api
      .get<ApiResponse<any>>('/api/appointments/availability', {
        params: { date, duration },
      })
      .catch(handleApiError),

  cancel: (id: string, reason: string) =>
    api
      .delete<ApiResponse<any>>(`/api/appointments/${id}`, { data: { reason } })
      .catch(handleApiError),

  reschedule: (id: string, newDate: string, newTime: string, reason?: string) =>
    api
      .put<ApiResponse<any>>(`/api/appointments/${id}/reschedule`, {
        newDate,
        newTime,
        reason,
      })
      .catch(handleApiError),
};

// Vehicles API
export const vehiclesAPI = {
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>('/api/vehicles', { params }),

  getById: (id: string) => api.get<ApiResponse<any>>(`/api/vehicles/${id}`),

  create: (vehicleData: any) =>
    api.post<ApiResponse<any>>('/api/vehicles', vehicleData),

  update: (id: string, updateData: any) =>
    api.put<ApiResponse<any>>(`/api/vehicles/${id}`, updateData),

  delete: (id: string) => api.delete<ApiResponse>(`/api/vehicles/${id}`),

  getServiceHistory: (id: string) =>
    api.get<ApiResponse<any[]>>(`/api/vehicles/${id}/maintenance`),

  getByUser: (userId: string) =>
    api.get<ApiResponse<any[]>>('/api/vehicles', { params: { userId } }),
};

// Services API
export const servicesAPI = {
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>('/api/services', { params }),

  getById: (id: string) => api.get<ApiResponse<any>>(`/api/services/${id}`),

  getByCategory: (category: string) =>
    api.get<ApiResponse<any[]>>('/api/services', { params: { category } }),
};

// Dashboard API
export const dashboardAPI = {
  getCustomerDashboard: () =>
    api.get<ApiResponse<any>>('/api/dashboard/customer'),

  getStats: (role: string, filters?: any) =>
    api.get<ApiResponse<any>>(`/api/dashboard/${role}`, { params: filters }),
};

// Technicians API
export const techniciansAPI = {
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>('/api/technicians', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/api/technicians/${id}`),

  getAvailable: (date: string, time: string, serviceIds: string[]) =>
    api.post<ApiResponse<any[]>>('/api/technicians/available', {
      date,
      time,
      serviceIds,
    }),
};

// Slots API
export const slotsAPI = {
  list: (params: { from: string; to: string }) =>
    api.get<ApiResponse<any[]>>('/api/slots', { params }),

  reserve: (slotId: string) =>
    api.post<ApiResponse<any>>(`/api/slots/${slotId}/reserve`),
};

// VNPay API
export const vnpayAPI = {
  createPayment: (paymentData: any) =>
    api.post<ApiResponse<{ paymentUrl: string }>>('/api/payment/vnpay/create-payment-url', paymentData),
};

// Invoices API
export const invoicesAPI = {
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>('/api/invoices', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/api/invoices/${id}`),

  pay: (id: string, paymentMethod: string) =>
    api.post<ApiResponse<any>>(`/api/invoices/${id}/pay`, { paymentMethod }),
};

// Parts API
export const partsAPI = {
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>('/api/parts', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/api/parts/${id}`),

  search: (query: string) =>
    api.get<ApiResponse<any[]>>('/api/parts/search', { params: { query } }),
};

// Chatbot API
export const chatbotAPI = {
  sendMessage: (messageData: {
    message: string;
    language?: 'en' | 'vi';
    chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) =>
    api.post<ApiResponse<{
      message: string;
      blocked: boolean;
      timestamp?: Date;
      reason?: string;
      error?: boolean;
    }>>('/api/chatbot/message', messageData),

  getStatus: () =>
    api.get<ApiResponse<{
      available: boolean;
      model: string;
      features: string[];
      languages: string[];
    }>>('/api/chatbot/status'),
};

export default api;
