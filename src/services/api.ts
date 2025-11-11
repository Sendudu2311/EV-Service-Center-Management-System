import axios, { AxiosResponse, AxiosError } from "axios";
import toast from "react-hot-toast";

// In production (Vercel), use empty string because API is on same domain via rewrites
// In development, use localhost:3000
const API_URL = import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? "" : "http://localhost:3000");

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
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
  (error: AxiosError) => {
    const status = error.response?.status;
    const errorData = error.response?.data as any;
    const url = error.config?.url || "";

    // Create throttle key
    const throttleKey = `${status}-${errorData?.error || "generic"}`;
    const now = Date.now();
    const lastShown = errorThrottle.get(throttleKey);

    // Skip notification if recently shown
    if (lastShown && now - lastShown < THROTTLE_DURATION) {
      return Promise.reject(error);
    }

    if (status === 401) {
      // Check for specific auth error codes
      const authErrors: Record<string, string> = {
        TOKEN_EXPIRED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        TOKEN_INVALID: "Mã xác thực không hợp lệ. Vui lòng đăng nhập lại.",
        AUTH_REQUIRED: "Vui lòng đăng nhập để tiếp tục.",
        USER_NOT_FOUND: "Tài khoản không tồn tại. Vui lòng đăng nhập lại.",
        ACCOUNT_DISABLED:
          "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.",
      };

      const message =
        authErrors[errorData?.error] ||
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";

      localStorage.removeItem("token");
      window.location.href = "/login";

      errorThrottle.set(throttleKey, now);
      toast.error(message, { duration: 4000 });
    } else if (status === 403) {
      // Skip 403 errors since we removed role restrictions
      console.warn(
        "403 error (should not happen after removing role restrictions):",
        errorData
      );
    } else if (status >= 500) {
      // Only show server errors for critical operations, not background requests
      const isCriticalOperation =
        url.includes("/login") ||
        url.includes("/register") ||
        (url.includes("/appointments") && error.config?.method !== "get");

      if (isCriticalOperation) {
        errorThrottle.set(throttleKey, now);
        toast.error("Có lỗi máy chủ. Vui lòng thử lại.", { duration: 4000 });
      }
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
    api.post<ApiResponse<{ user: any; token: string }>>("/api/auth/login", {
      email,
      password,
    }),

  register: (userData: any) =>
    api.post<ApiResponse<{ user: any; token: string }>>(
      "/api/auth/register",
      userData
    ),

  getProfile: () => api.get<ApiResponse<{ user: any }>>("/api/auth/me"),

  updateProfile: (userData: any) =>
    api.put<ApiResponse<{ user: any }>>("/api/auth/profile", userData),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<ApiResponse>("/api/auth/change-password", {
      currentPassword,
      newPassword,
    }),
};

// Vietnamese error messages mapping
const vietnameseErrorMessages: Record<number, string> = {
  400: "Tham số không hợp lệ. Vui lòng kiểm tra ngày/giờ/dịch vụ.",
  401: "Vui lòng đăng nhập để tiếp tục.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu.",
  409: "Khung giờ đã có lịch. Vui lòng chọn khung khác.",
  500: "Có lỗi xảy ra. Vui lòng thử lại.",
};

// Enhanced error handler
const handleApiError = (error: AxiosError): never => {
  const status = error.response?.status || 500;
  const serverMessage = (error.response?.data as any)?.message;
  const vietnameseMessage = vietnameseErrorMessages[status];

  // Use server message if it's already in Vietnamese, otherwise use our mapping
  const finalMessage =
    serverMessage && serverMessage.includes("không")
      ? serverMessage
      : vietnameseMessage;

  const enhancedError = new Error(finalMessage) as any;
  enhancedError.status = status;
  enhancedError.response = error.response;
  enhancedError.reasonCode = (error.response?.data as any)?.reasonCode;
  enhancedError.conflicts = (error.response?.data as any)?.conflicts;

  throw enhancedError;
};

// Appointments API with enhanced error handling and proper typing
export const appointmentsAPI = {
  getAll: (params?: any) =>
    api
      .get<ApiResponse<any[]>>("/api/appointments", { params })
      .catch(handleApiError),

  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/api/appointments/${id}`).catch(handleApiError),

  create: (appointmentData: any) =>
    api
      .post<ApiResponse<any>>("/api/appointments", appointmentData)
      .catch(handleApiError),

  update: (id: string, updateData: any) =>
    api
      .put<ApiResponse<any>>(`/api/appointments/${id}`, updateData)
      .catch(handleApiError),

  // Availability checking with pre-validation - single center architecture
  checkAvailability: (date: string, duration?: number) =>
    api
      .get<ApiResponse<any>>("/api/appointments/availability", {
        params: { date, duration },
      })
      .catch(handleApiError),

  checkVehicleBookingStatus: (vehicleId: string) =>
    api
      .get<ApiResponse<any>>(`/api/appointments/vehicle-status/${vehicleId}`)
      .catch(handleApiError),

  preValidateAvailability: (
    date: string,
    time: string,
    duration?: number,
    technicianId?: string
  ) =>
    api
      .get<ApiResponse<any>>("/api/appointments/pre-validate", {
        params: { date, time, duration, technicianId },
      })
      .catch(handleApiError),

  getAvailableTechnicians: (
    date: string,
    time: string,
    duration?: number,
    serviceCategories?: string[]
  ) =>
    api
      .get<ApiResponse<any>>("/api/appointments/available-technicians", {
        params: { date, time, duration, serviceCategories },
      })
      .catch(handleApiError),

  checkTechnicianAvailability: (
    technicianId: string,
    date: string,
    time: string,
    duration?: number
  ) =>
    api
      .get<ApiResponse<any>>("/api/appointments/technician-availability", {
        params: { technicianId, date, time, duration },
      })
      .catch(handleApiError),

  // Fixed: Map to correct backend routes
  confirm: (id: string, notes?: string) =>
    api
      .put<ApiResponse<any>>(`/api/appointments/${id}/staff-confirm`, { notes })
      .catch(handleApiError),

  checkin: (id: string) =>
    api
      .put<ApiResponse<any>>(`/api/appointments/${id}/customer-arrived`)
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

  assignTechnicians: (id: string, technicianIds: string[]) =>
    api
      .put<ApiResponse<any>>(`/api/appointments/${id}/assign`, {
        technicianId: technicianIds[0],
      })
      .catch(handleApiError),

  // New: Smart status mapping to specific workflow endpoints
  updateStatus: (id: string, status: string, notes?: string) => {
    const request = (() => {
      switch (status) {
        case "confirmed":
          return api.put<ApiResponse<any>>(
            `/api/appointments/${id}/staff-confirm`,
            { notes }
          );
        case "customer_arrived":
          return api.put<ApiResponse<any>>(
            `/api/appointments/${id}/customer-arrived`
          );
        case "in_progress":
          return api.put<ApiResponse<any>>(
            `/api/appointments/${id}/start-work`,
            { notes }
          );
        case "completed":
          return api.put<ApiResponse<any>>(`/api/appointments/${id}/complete`, {
            notes,
          });
        case "cancelled":
          return api.delete<ApiResponse<any>>(`/api/appointments/${id}`, {
            data: { reason: notes },
          });
        default:
          return api.put<ApiResponse<any>>(`/api/appointments/${id}`, {
            status,
            notes,
          });
      }
    })();

    return request.catch(handleApiError);
  },

  // New: Backend-specific workflow operations
  staffReject: (id: string, reason: string) =>
    api.put<ApiResponse<any>>(`/api/appointments/${id}/staff-reject`, {
      reason,
    }),

  startWork: (id: string, notes?: string) =>
    api.put<ApiResponse<any>>(`/api/appointments/${id}/start-work`, { notes }),

  complete: (id: string, notes?: string) =>
    api.put<ApiResponse<any>>(`/api/appointments/${id}/complete`, { notes }),

  handlePartsDecision: (id: string, decision: any) =>
    api.put<ApiResponse<any>>(
      `/api/appointments/${id}/parts-decision`,
      decision
    ),

  // Workflow queues
  getPendingStaffConfirmation: (params?: any) =>
    api.get<ApiResponse<any[]>>(
      "/api/appointments/pending-staff-confirmation",
      { params }
    ),

  getWorkQueue: (params?: any) =>
    api.get<ApiResponse<any[]>>("/api/appointments/work-queue", { params }),

  // Cancel request APIs
  requestCancellation: (
    id: string,
    data: {
      reason: string;
      refundMethod?: "cash" | "bank_transfer";
      customerBankInfo?: {
        bankName: string;
        accountNumber: string;
        accountHolder: string;
      };
      customerBankProofImage?: string;
    }
  ) =>
    api.post<ApiResponse<any>>(`/api/appointments/${id}/request-cancel`, data),

  approveCancellation: (id: string, notes?: string) =>
    api.post<ApiResponse<any>>(`/api/appointments/${id}/approve-cancel`, {
      notes,
    }),

  processRefund: (
    id: string,
    data: {
      notes?: string;
      refundProofImage?: string;
    }
  ) =>
    api.post<ApiResponse<any>>(`/api/appointments/${id}/process-refund`, data),

  // Payment confirmation
  confirmFinalPayment: (appointmentId: string, formData: FormData) =>
    api.post<ApiResponse<any>>(
      `/api/appointments/${appointmentId}/confirm-payment`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    ),

  // Payment confirmation after reception approval (NEW WORKFLOW)
  confirmPaymentAfterReception: (appointmentId: string, formData: FormData) =>
    api.post<ApiResponse<any>>(
      `/api/appointments/${appointmentId}/confirm-payment-after-reception`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    ),

  // Staff final confirmation after technician completes (NEW WORKFLOW)
  staffFinalConfirm: (appointmentId: string) =>
    api.post<ApiResponse<any>>(
      `/api/appointments/${appointmentId}/staff-final-confirm`
    ),

  // Get invoice by appointment
  getInvoiceByAppointment: (appointmentId: string) =>
    api.get<ApiResponse<any>>(`/api/invoices/appointment/${appointmentId}`),

  bulkUpdate: (updates: any[]) =>
    api.put<ApiResponse<any>>("/api/appointments/bulk-update", { updates }),

  // Customer-specific methods
  getCustomerAppointments: (params?: any) =>
    api.get<ApiResponse<any[]>>("/api/appointments", {
      params: { ...params, customerOnly: true },
    }),

  getAvailableTimeSlots: (date: string, duration: number = 60) =>
    api.get<ApiResponse<any[]>>("/api/appointments/available-slots", {
      params: { date, duration },
    }),

  customerReschedule: (
    id: string,
    rescheduleData: {
      newDate: string;
      newTime: string;
      reason: string;
      reasonCategory: string;
    }
  ) =>
    api.put<ApiResponse<any>>(
      `/api/appointments/${id}/customer-reschedule`,
      rescheduleData
    ),

  customerCancel: (
    id: string,
    cancelData: {
      reason: string;
      reasonCategory: string;
    }
  ) =>
    api.put<ApiResponse<any>>(
      `/api/appointments/${id}/customer-cancel`,
      cancelData
    ),

  getAppointmentTimeline: (id: string) =>
    api.get<ApiResponse<any[]>>(`/api/appointments/${id}/timeline`),

  uploadAppointmentFiles: (id: string, files: FormData) =>
    api.post<ApiResponse<any>>(`/api/appointments/${id}/files`, files, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  addCustomerNotes: (id: string, notes: string) =>
    api.put<ApiResponse<any>>(`/api/appointments/${id}/customer-notes`, {
      notes,
    }),

  // Customer check-in (self-service)
  customerCheckin: (id: string, location?: { lat: number; lng: number }) =>
    api.put<ApiResponse<any>>(`/api/appointments/${id}/customer-checkin`, {
      location,
    }),

  // Get customer appointment statistics
  getCustomerStats: () => api.get<ApiResponse<any>>("/api/dashboard/customer"),

  // Get customer available actions for appointment
  getCustomerActions: (id: string) =>
    api
      .get<ApiResponse<any>>(`/api/appointments/${id}/customer-actions`)
      .catch(handleApiError),

  // Export appointments (for customer records)
  exportCustomerAppointments: (format: "pdf" | "csv" = "pdf", params?: any) =>
    api.get(`/api/appointments/export`, {
      params: { format, ...params },
      responseType: "blob",
    }),
};

// Upload API
export const uploadAPI = {
  uploadImage: (file: File, description?: string) => {
    const formData = new FormData();
    formData.append("image", file);
    if (description) {
      formData.append("description", description);
    }

    return api.post<{
      success: boolean;
      message: string;
      imageUrl: string;
      publicId: string;
    }>("/api/upload/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// Service Reception API (part of appointments)
export const serviceReceptionAPI = {
  getPendingApprovals: (params?: any) =>
    api.get<ApiResponse<any[]>>(
      "/api/appointments/receptions/pending-approval",
      { params }
    ),

  create: (appointmentId: string, receptionData: any) =>
    api.post<ApiResponse<any>>(
      `/api/service-receptions/${appointmentId}/create`,
      receptionData
    ),

  submit: (appointmentId: string, receptionData: any) =>
    api.put<ApiResponse<any>>(
      `/api/appointments/${appointmentId}/submit-reception`,
      receptionData
    ),

  review: (appointmentId: string, reviewData: any) =>
    api.put<ApiResponse<any>>(
      `/api/appointments/${appointmentId}/review-reception`,
      reviewData
    ),

  // Legacy methods for backward compatibility - these will map to appointment-based endpoints
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>(
      "/api/appointments/receptions/pending-approval",
      { params }
    ),

  getById: (serviceReceptionId: string) =>
    api.get<ApiResponse<any>>(`/api/service-receptions/${serviceReceptionId}`),

  getByAppointment: (appointmentId: string) =>
    api.get<ApiResponse<any>>(
      `/api/service-receptions/appointment/${appointmentId}`
    ),

  update: (appointmentId: string, updateData: any) =>
    api.put<ApiResponse<any>>(
      `/api/appointments/${appointmentId}/submit-reception`,
      updateData
    ),

  approve: (appointmentId: string, approvalData: any) =>
    api.put<ApiResponse<any>>(
      `/api/appointments/${appointmentId}/review-reception`,
      approvalData
    ),

  // Confirm payment for service reception
  confirmPayment: (serviceReceptionId: string, formData: FormData) =>
    api.post<ApiResponse<any>>(
      `/api/service-receptions/${serviceReceptionId}/confirm-payment`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    ),
};

// Parts API
export const partsAPI = {
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>("/api/parts", { params }),

  getById: (id: string) => api.get<ApiResponse<any>>(`/api/parts/${id}`),

  // Fixed: Use backend's category-based search
  search: (query: string, filters?: any) =>
    api.get<ApiResponse<any[]>>(`/api/parts/by-service/${query}`, {
      params: filters,
    }),

  // Fixed: Map to reservation system for availability checking
  checkAvailability: (partIds: string[]) =>
    api.post<ApiResponse<any>>("/api/parts/reserve", {
      partIds,
      appointmentId: null,
      checkOnly: true,
    }),

  // Fixed: Use parts usage endpoint for stock updates
  updateStock: (id: string, stockData: any) =>
    api.put<ApiResponse<any>>("/api/parts/use", {
      parts: [{ partId: id, ...stockData }],
    }),

  // New: Backend-specific operations
  getByServiceCategory: (category: string) =>
    api.get<ApiResponse<any[]>>(`/api/parts/by-service/${category}`),

  reserveParts: (appointmentId: string, partIds: string[]) =>
    api.post<ApiResponse<any>>("/api/parts/reserve", {
      appointmentId,
      partIds,
    }),

  getAppointmentParts: (appointmentId: string) =>
    api.get<ApiResponse<any[]>>(`/api/parts/appointment/${appointmentId}`),

  useReservedParts: (parts: any[]) =>
    api.put<ApiResponse<any>>("/api/parts/use", { parts }),

  // Analytics endpoints
  getAnalytics: () => api.get<ApiResponse<any>>("/api/parts/analytics"),

  getLowStock: () => api.get<ApiResponse<any[]>>("/api/parts/low-stock"),
};

// Part Requests API
export const partRequestsAPI = {
  // Fixed: Use pending-approval endpoint for general listing
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>("/api/part-requests/pending-approval", {
      params,
    }),

  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/api/part-requests/${id}`),

  create: (requestData: any) =>
    api.post<ApiResponse<any>>("/api/part-requests", requestData),

  // Fixed: Map to backend review system
  approve: (id: string, approvalData: any) =>
    api.put<ApiResponse<any>>(`/api/part-requests/${id}/review`, {
      ...approvalData,
      approved: true,
    }),

  // Fixed: Map to backend status system
  fulfill: (id: string, fulfillmentData: any) =>
    api.put<ApiResponse<any>>(`/api/part-requests/${id}/status`, {
      status: "fulfilled",
      ...fulfillmentData,
    }),

  // Fixed: Use pending approvals as summary
  getSummary: (filters?: any) =>
    api.get<ApiResponse<any>>("/api/part-requests/pending-approval", {
      params: filters,
    }),

  // New: Backend-specific operations
  review: (id: string, reviewData: any) =>
    api.put<ApiResponse<any>>(`/api/part-requests/${id}/review`, reviewData),

  updateStatus: (id: string, status: string, data?: any) =>
    api.put<ApiResponse<any>>(`/api/part-requests/${id}/status`, {
      status,
      ...data,
    }),

  getByAppointment: (appointmentId: string) =>
    api.get<ApiResponse<any[]>>(
      `/api/part-requests/appointment/${appointmentId}`
    ),

  getPendingApprovals: (params?: any) =>
    api.get<ApiResponse<any[]>>("/api/part-requests/pending-approval", {
      params,
    }),
};

// Part Conflicts API
export const partConflictsAPI = {
  getConflicts: (params?: { status?: string; partId?: string }) =>
    api.get<ApiResponse<any[]>>("/api/part-conflicts", { params }),

  getConflict: (id: string) =>
    api.get<ApiResponse<any>>(`/api/part-conflicts/${id}`),

  getConflictStats: () =>
    api.get<ApiResponse<any>>("/api/part-conflicts/stats"),

  resolveConflict: (
    id: string,
    data: {
      approvedRequestIds: string[];
      rejectedRequestIds?: string[];
      notes?: string;
    }
  ) => api.post<ApiResponse<any>>(`/api/part-conflicts/${id}/resolve`, data),

  detectConflicts: (partId?: string) =>
    api.post<ApiResponse<any>>("/api/part-conflicts/detect", { partId }),

  checkReceptionConflicts: (receptionId: string) =>
    api.get<
      ApiResponse<{
        hasConflict: boolean;
        conflictCount: number;
        conflicts: any[];
      }>
    >(`/api/part-conflicts/check-reception/${receptionId}`),

  getSuggestedResolution: (conflictId: string) =>
    api.get<
      ApiResponse<{
        suggested: Array<{
          requestId: string;
          receptionNumber: string;
          priority: string;
          scheduledDate: string;
          requestedQuantity: number;
          reasoning: string;
        }>;
        availableStock: number;
        totalRequested: number;
      }>
    >(`/api/part-conflicts/${conflictId}/suggestion`),

  approveRequest: (
    conflictId: string,
    data: {
      requestId: string;
      notes?: string;
    }
  ) =>
    api.post<
      ApiResponse<{
        requestId: string;
        conflictStatus: string;
        newAvailableStock: number;
        receptionStatus: string;
      }>
    >(`/api/part-conflicts/${conflictId}/approve-request`, data),

  rejectRequest: (
    conflictId: string,
    data: {
      requestId: string;
      reason: string;
    }
  ) =>
    api.post<
      ApiResponse<{
        requestId: string;
        conflictStatus: string;
        receptionStatus: string;
      }>
    >(`/api/part-conflicts/${conflictId}/reject-request`, data),
};

// Invoices API
export const invoicesAPI = {
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>("/api/invoices", { params }),

  getById: (id: string) => api.get<ApiResponse<any>>(`/api/invoices/${id}`),

  getByAppointment: (appointmentId: string) =>
    api.get<ApiResponse<any>>(`/api/invoices/appointment/${appointmentId}`),

  generate: (appointmentId: string, data: any) =>
    api.post<ApiResponse<any>>(`/api/invoices/generate/${appointmentId}`, data),

  // Fixed: Use generate endpoint with appointmentId
  create: (invoiceData: any) =>
    api.post<ApiResponse<any>>(
      `/api/invoices/generate/${invoiceData.appointmentId}`,
      invoiceData
    ),

  update: (id: string, updateData: any) =>
    api.put<ApiResponse<any>>(`/api/invoices/${id}`, updateData),

  // Fixed: Map to backend status system
  approve: (id: string) =>
    api.put<ApiResponse<any>>(`/api/invoices/${id}/status`, {
      status: "approved",
    }),

  // Fixed: Use correct HTTP method
  recordPayment: (id: string, paymentData: any) =>
    api.post<ApiResponse<any>>(`/api/invoices/${id}/payment`, paymentData),

  // New: Map missing operations to status updates
  sendToCustomer: (id: string, method: string = "email") =>
    api.put<ApiResponse<any>>(`/api/invoices/${id}/status`, {
      status: "sent",
      sendMethod: method,
    }),

  markAsViewed: (id: string) =>
    api.put<ApiResponse<any>>(`/api/invoices/${id}/status`, {
      status: "viewed",
      viewedAt: new Date().toISOString(),
    }),

  // New: Backend-specific operations
  updateStatus: (id: string, status: string, data?: any) =>
    api.put<ApiResponse<any>>(`/api/invoices/${id}/status`, {
      status,
      ...data,
    }),

  generatePDF: (id: string) =>
    api.get(`/api/invoices/${id}/pdf`, { responseType: "blob" }),
};

// Vehicles API
export const vehiclesAPI = {
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>("/api/vehicles", { params }),

  getById: (id: string) => api.get<ApiResponse<any>>(`/api/vehicles/${id}`),

  create: (vehicleData: any) =>
    api.post<ApiResponse<any>>("/api/vehicles", vehicleData),

  update: (id: string, updateData: any) =>
    api.put<ApiResponse<any>>(`/api/vehicles/${id}`, updateData),

  delete: (id: string) => api.delete<ApiResponse>(`/api/vehicles/${id}`),

  // Fixed: Map to correct backend route
  getServiceHistory: (id: string) =>
    api.get<ApiResponse<any[]>>(`/api/vehicles/${id}/maintenance`),

  // Fixed: Updated endpoint to match backend route
  updateMileage: (id: string, mileage: number) =>
    api.put<ApiResponse<any>>(`/api/vehicles/${id}/mileage`, { mileage }),

  // Fixed: Use correct backend endpoint for images
  addImage: (id: string, imageData: FormData) =>
    api.post<ApiResponse<any>>(`/api/vehicles/${id}/images`, imageData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getByUser: (userId: string) =>
    api.get<ApiResponse<any[]>>("/api/vehicles", { params: { userId } }),
};

// Services API
export const servicesAPI = {
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>("/api/services", { params }),

  getById: (id: string) => api.get<ApiResponse<any>>(`/api/services/${id}`),

  // Note: Backend doesn't have category endpoint, use filtering
  getByCategory: (category: string) =>
    api.get<ApiResponse<any[]>>("/api/services", { params: { category } }),
};

// Technicians API
export const techniciansAPI = {
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>("/api/technicians", { params }),

  // Note: Backend uses profile approach
  getById: (id: string) =>
    api.get<ApiResponse<any>>("/api/technicians/profile", {
      params: { technicianId: id },
    }),

  // Fixed: Use appointments system for availability - single center architecture
  getAvailable: (date: string) =>
    api.get<ApiResponse<any[]>>("/api/appointments/available-technicians", {
      params: { date },
    }),

  // Note: Backend doesn't have individual availability update
  updateAvailability: (status: string) =>
    api.put<ApiResponse<any>>("/api/technicians/profile", {
      availability: status,
    }),

  // Fixed: Use workload endpoint without ID
  getWorkload: (technicianId?: string, dateRange?: any) =>
    api.get<ApiResponse<any>>("/api/technicians/workload", {
      params: { technicianId, ...dateRange },
    }),

  // New: Backend-specific operations
  getProfile: () => api.get<ApiResponse<any>>("/api/technicians/profile"),

  updateProfile: (profileData: any) =>
    api.put<ApiResponse<any>>("/api/technicians/profile", profileData),

  getWorkloadDistribution: (params?: any) =>
    api.get<ApiResponse<any>>("/api/technicians/workload", { params }),

  findBestTechnician: (criteria: any) =>
    api.get<ApiResponse<any>>("/api/technicians", {
      params: { ...criteria, findBest: true },
    }),
};

// Slots API - new endpoints for full time-slot booking system
export const slotsAPI = {
  // List slots with optional filters (date, technicianId, duration)
  list: (params?: any) =>
    api.get<ApiResponse<any[]>>("/api/slots", { params }).catch(handleApiError),

  // Reserve a slot (increment bookedCount)
  reserve: (slotId: string) =>
    api
      .post<ApiResponse<any>>(`/api/slots/${slotId}/reserve`)
      .catch(handleApiError),

  // Release a previously reserved slot
  release: (slotId: string) =>
    api
      .post<ApiResponse<any>>(`/api/slots/${slotId}/release`)
      .catch(handleApiError),

  // Staff: create a slot
  create: (slotData: any) =>
    api.post<ApiResponse<any>>("/api/slots", slotData).catch(handleApiError),

  // Staff: update a slot
  update: (slotId: string, updateData: any) =>
    api
      .put<ApiResponse<any>>(`/api/slots/${slotId}`, updateData)
      .catch(handleApiError),

  // Staff: assign/unassign technicians to a slot
  assignTechnicians: (slotId: string, technicianIds?: string[]) =>
    api
      .put<ApiResponse<any>>(`/api/slots/${slotId}/assign`, { technicianIds })
      .catch(handleApiError),
};

// Dashboard API
export const dashboardAPI = {
  // Single endpoint for complete customer dashboard data
  getCustomerDashboard: () =>
    api.get<ApiResponse<any>>("/api/dashboard/customer"),

  // Individual endpoints for granular updates (if needed)
  getStats: (role: string, filters?: any) =>
    api.get<ApiResponse<any>>(`/api/dashboard/${role}`, { params: filters }),

  // Get detail data for modal (users, revenue, vehicles, appointments)
  getDetails: (type: string) =>
    api.get<ApiResponse<any>>(`/api/dashboard/details/${type}`),

  // Legacy method - now uses main dashboard endpoint
  getUpcomingAppointments: (params?: any) =>
    api.get<ApiResponse<any[]>>("/api/appointments", {
      params: {
        status: "confirmed",
        startDate: new Date().toISOString(),
        limit: 10,
        ...params,
      },
    }),

  // For future notification system
  getNotifications: (params?: any) =>
    api.get<ApiResponse<any>>("/api/notifications", {
      params: { limit: 5, ...params },
    }),

  // Mark notification as read
  markNotificationRead: (notificationId: string) =>
    api.patch<ApiResponse<any>>(`/api/notifications/${notificationId}/read`),

  // Get vehicle maintenance info
  getVehicleMaintenanceInfo: (vehicleId: string) =>
    api.get<ApiResponse<any>>(`/api/vehicles/${vehicleId}/maintenance`),
};

// Users API (Admin/Staff only - part of auth routes)
export const usersAPI = {
  getAll: (params?: any) =>
    api.get<ApiResponse<any[]>>("/api/auth/users", { params }),

  getById: (id: string) => api.get<ApiResponse<any>>(`/api/auth/users/${id}`),

  create: (userData: any) =>
    api.post<ApiResponse<any>>("/api/auth/users", userData),

  update: (id: string, updateData: any) =>
    api.put<ApiResponse<any>>(`/api/auth/users/${id}`, updateData),

  delete: (id: string) => api.delete<ApiResponse>(`/api/auth/users/${id}`),

  updateStatus: (id: string, isActive: boolean) =>
    api.put<ApiResponse<any>>(`/api/auth/users/${id}/status`, { isActive }),
};

// VNPay API
export const vnpayAPI = {
  createPayment: (paymentData: any) =>
    api.post<ApiResponse<any>>("/api/vnpay/create-payment", paymentData),

  checkTransaction: (transactionRef: string) =>
    api.post<ApiResponse<any>>("/api/vnpay/check-transaction", {
      transactionRef,
    }),

  verifyAppointmentPayment: (paymentData: any) =>
    api.post<ApiResponse<any>>(
      "/api/vnpay/verify-appointment-payment",
      paymentData
    ),

  getPaymentMethods: () =>
    api.get<ApiResponse<any[]>>("/api/vnpay/payment-methods"),

  // Transaction Management APIs
  getUserTransactions: (params?: any) =>
    api.get<ApiResponse<any>>("/api/vnpay/transactions", { params }),

  getAllTransactions: (params?: any) =>
    api.get<ApiResponse<any>>("/api/vnpay/transactions/all", { params }),

  getTransactionById: (transactionId: string) =>
    api.get<ApiResponse<any>>(`/api/vnpay/transactions/${transactionId}`),

  getTransactionStats: (params?: any) =>
    api.get<ApiResponse<any>>("/api/vnpay/transactions/stats", { params }),

  updateTransactionStatus: (transactionId: string, statusData: any) =>
    api.put<ApiResponse<any>>(
      `/api/vnpay/transactions/${transactionId}/status`,
      statusData
    ),

  refundTransaction: (transactionId: string, refundData: any) =>
    api.post<ApiResponse<any>>(
      `/api/vnpay/transactions/${transactionId}/refund`,
      refundData
    ),

  getExpiredTransactions: () =>
    api.get<ApiResponse<any>>("/api/vnpay/transactions/expired"),

  cleanupExpiredTransactions: () =>
    api.post<ApiResponse<any>>("/api/vnpay/transactions/cleanup-expired"),

  // Update transaction with appointment ID after appointment creation
  updateTransactionAppointmentId: (data: {
    transactionRef: string;
    appointmentId: string;
  }) =>
    api.put<ApiResponse<any>>(
      "/api/vnpay/update-transaction-appointment",
      data
    ),
};

// Chatbot API
export const chatbotAPI = {
  sendMessage: (messageData: {
    message: string;
    language?: "en" | "vi";
    chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  }) =>
    api.post<
      ApiResponse<{
        message: string;
        blocked: boolean;
        timestamp?: Date;
        reason?: string;
        error?: boolean;
      }>
    >("/api/chatbot/message", messageData),

  getStatus: () =>
    api.get<
      ApiResponse<{
        available: boolean;
        model: string;
        features: string[];
        languages: string[];
      }>
    >("/api/chatbot/status"),

  clearHistory: () =>
    api.post<
      ApiResponse<{
        cleared: boolean;
        timestamp: Date;
      }>
    >("/api/chatbot/clear"),
};

// Contacts API
export const contactsAPI = {
  // Public endpoint for creating contact messages (no auth required)
  create: (contactData: {
    name: string;
    email: string;
    subject:
      | "service"
      | "appointment"
      | "parts"
      | "warranty"
      | "feedback"
      | "other";
    message: string;
  }) =>
    api
      .post<ApiResponse<any>>("/api/contacts", contactData, {
        headers: {
          "Content-Type": "application/json",
          // Explicitly remove Authorization header for public endpoint
          Authorization: undefined,
        },
      })
      .catch(handleApiError),

  // Staff/Admin endpoints
  getAll: (params?: {
    status?: "all" | "open" | "in-progress" | "closed";
    assignedTo?: string;
    subject?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) =>
    api
      .get<ApiResponse<any>>("/api/contacts", { params })
      .catch(handleApiError),

  getById: (id: string) =>
    api.get<ApiResponse<any>>(`/api/contacts/${id}`).catch(handleApiError),

  updateStatus: (
    id: string,
    statusData: {
      status?: "open" | "in-progress" | "closed";
      assignedTo?: string | null;
    }
  ) =>
    api
      .put<ApiResponse<any>>(`/api/contacts/${id}/status`, statusData)
      .catch(handleApiError),

  addNote: (id: string, noteData: { content: string }) =>
    api
      .post<ApiResponse<any>>(`/api/contacts/${id}/notes`, noteData)
      .catch(handleApiError),

  getStats: () =>
    api.get<ApiResponse<any>>("/api/contacts/stats").catch(handleApiError),
};

// Reports API
export const reportsAPI = {
  getAnalytics: (params?: {
    period?: "1month" | "3months" | "6months" | "1year";
    serviceId?: string;
    technicianId?: string;
  }) =>
    api
      .get<ApiResponse<any>>("/api/reports/analytics", { params })
      .catch(handleApiError),

  getDetailedReport: (params?: {
    period?: "1month" | "3months" | "6months" | "1year";
    format?: "json" | "csv";
  }) =>
    api
      .get<ApiResponse<any>>("/api/reports/detailed", { params })
      .catch(handleApiError),

  getKPI: () =>
    api.get<ApiResponse<any>>("/api/reports/kpi").catch(handleApiError),
};

// Transaction API calls
export const transactionApi = {
  // Get all transactions (Admin/Staff only)
  getTransactions: (filters?: {
    page?: number;
    limit?: number;
    transactionType?: string;
    status?: string;
    paymentPurpose?: string;
    userId?: string;
    appointmentId?: string;
    invoiceId?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    api
      .get<ApiResponse<any>>("/api/transactions", { params: filters })
      .catch(handleApiError),

  // Get user's transactions
  getMyTransactions: (filters?: {
    transactionType?: string;
    status?: string;
    paymentPurpose?: string;
    limit?: number;
  }) =>
    api
      .get<ApiResponse<any>>("/api/transactions/my", { params: filters })
      .catch(handleApiError),

  // Get transaction by ID
  getTransactionById: (id: string) =>
    api.get<ApiResponse<any>>(`/api/transactions/${id}`).catch(handleApiError),

  // Record cash payment
  recordCashPayment: (data: {
    userId: string;
    appointmentId?: string;
    invoiceId?: string;
    amount: number;
    billingInfo?: {
      mobile?: string;
      email?: string;
      fullName?: string;
      address?: string;
    };
    notes?: string;
    customerNotes?: string;
    cashData?: {
      denomination?: Record<string, number>;
      changeGiven?: number;
      notes?: string;
    };
  }) =>
    api
      .post<ApiResponse<any>>("/api/transactions/cash", data)
      .catch(handleApiError),

  // Record card payment
  recordCardPayment: (data: {
    userId: string;
    appointmentId?: string;
    invoiceId?: string;
    amount: number;
    billingInfo?: {
      mobile?: string;
      email?: string;
      fullName?: string;
      address?: string;
    };
    notes?: string;
    customerNotes?: string;
    cardData: {
      cardType: string;
      last4Digits: string;
      authCode?: string;
      transactionId?: string;
      terminalId?: string;
      merchantId?: string;
      batchNumber?: string;
      notes?: string;
    };
  }) =>
    api
      .post<ApiResponse<any>>("/api/transactions/card", data)
      .catch(handleApiError),

  // Record bank transfer payment
  recordBankTransferPayment: (data: {
    userId: string;
    appointmentId?: string;
    invoiceId?: string;
    amount: number;
    billingInfo?: {
      mobile?: string;
      email?: string;
      fullName?: string;
      address?: string;
    };
    notes?: string;
    customerNotes?: string;
    bankTransferData: {
      bankName: string;
      bankCode?: string;
      transferRef?: string;
      accountNumber?: string;
      accountHolder?: string;
      transferDate?: string;
      verificationMethod?: string;
      verificationNotes?: string;
      receiptImage?: string;
      notes?: string;
    };
  }) =>
    api
      .post<ApiResponse<any>>("/api/transactions/bank-transfer", data)
      .catch(handleApiError),

  // Process refund for a transaction
  processRefund: (
    id: string,
    data: {
      amount?: number;
      reason: string;
      customerNotes?: string;
    }
  ) =>
    api
      .post<ApiResponse<any>>(`/api/transactions/${id}/refund`, data)
      .catch(handleApiError),

  // Update transaction status
  updateTransactionStatus: (
    id: string,
    data: {
      status: string;
      additionalData?: Record<string, any>;
    }
  ) =>
    api
      .put<ApiResponse<any>>(`/api/transactions/${id}/status`, data)
      .catch(handleApiError),

  // Get transaction statistics
  getTransactionStatistics: (filters?: {
    startDate?: string;
    endDate?: string;
  }) =>
    api
      .get<ApiResponse<any>>("/api/transactions/statistics", {
        params: filters,
      })
      .catch(handleApiError),

  // Process expired transactions
  processExpiredTransactions: () =>
    api
      .post<ApiResponse<any>>("/api/transactions/process-expired")
      .catch(handleApiError),
};

export default api;
