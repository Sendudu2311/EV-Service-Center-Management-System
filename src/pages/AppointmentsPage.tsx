import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlusIcon,
  CalendarIcon,
  EyeIcon,
  ArrowPathIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { useSocket, useCustomEvent } from "../contexts/SocketContext";
import {
  appointmentsAPI,
  vehiclesAPI,
  slotsAPI,
  invoicesAPI,
  serviceReceptionAPI,
} from "../services/api";
import toast from "react-hot-toast";
import AppointmentFormClean from "../components/Appointment/AppointmentForm";
import PaymentRestorationHandler from "../components/Appointment/PaymentRestorationHandler";
import AppointmentDetails from "../components/Appointment/AppointmentDetails";
import CancelRequestModal from "../components/Appointment/CancelRequestModal";
import InvoiceGenerationModal from "../components/Invoice/InvoiceGenerationModal";
import PaymentConfirmationModal from "../components/Payment/PaymentConfirmationModal";
import InvoiceDisplayModal from "../components/Invoice/InvoiceDisplayModal";
import {
  Appointment,
  DetailedAppointmentStatus,
  appointmentStatusTranslations,
  canTransitionStatus,
  getNextStatuses,
} from "../types/appointment";
import {
  formatVietnameseDateTime,
  formatVND,
  combineDateTime,
} from "../utils/vietnamese";

/**
 * Interface for API response with pagination
 */
interface AppointmentResponse {
  success: boolean;
  data: Appointment[];
  total: number;
  page: number;
  totalPages: number;
  count: number;
}

/**
 * Interface for component state management
 */
interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  selectedAppointment: Appointment | null;
  updatingStatus: string | null;
}

/**
 * Interface for filters state
 */
interface FiltersState {
  statusFilter: DetailedAppointmentStatus | "";
  sortBy: "date" | "status";
  page: number;
  limit: number;
}

const AppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { emitStatusUpdate } = useSocket();

  // Main component state
  const [state, setState] = useState<AppointmentState>({
    appointments: [],
    loading: true,
    error: null,
    selectedAppointment: null,
    updatingStatus: null,
  });

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasVehicles, setHasVehicles] = useState(false);

  // Cancel request modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] =
    useState<Appointment | null>(null);

  // Payment info display state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAppointmentForInvoice, setSelectedAppointmentForInvoice] =
    useState<Appointment | null>(null);
  const [invoiceModalServiceReception, setInvoiceModalServiceReception] = useState<any>(null);
  // const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Payment confirmation modal state
  const [showPaymentConfirmationModal, setShowPaymentConfirmationModal] =
    useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] =
    useState<Appointment | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<any>(null);
  const [paymentModalServiceReception, setPaymentModalServiceReception] = useState<any>(null);

  // Invoice display modal state
  const [showInvoiceDisplayModal, setShowInvoiceDisplayModal] = useState(false);
  const [
    selectedAppointmentForInvoiceDisplay,
    setSelectedAppointmentForInvoiceDisplay,
  ] = useState<Appointment | null>(null);

  // Filters state
  const [filters, setFilters] = useState<FiltersState>({
    statusFilter: "",
    sortBy: "date", // Sort by newest date first
    page: 1,
    limit: 10,
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
  });

  /**
   * Fetch appointments with error handling and retry logic
   */
  const fetchAppointments = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setState((prev) => ({ ...prev, loading: true, error: null }));
        }

        const params: Record<string, string | number> = {
          page: filters.page,
          limit: filters.limit,
        };

        if (filters.statusFilter) params.status = filters.statusFilter;

        const response = await appointmentsAPI.getAll(params);
        const data = response.data as unknown as AppointmentResponse;

        const appointmentsList = data.data || [];

        // Sort appointments by newest date first (client-side for immediate UI update)
        const sortedAppointments = appointmentsList.sort((a, b) => {
          const dateA = new Date(a.scheduledDate).getTime();
          const dateB = new Date(b.scheduledDate).getTime();
          return dateB - dateA; // Descending order (newest first)
        });

        setState((prev) => ({
          ...prev,
          appointments: sortedAppointments,
          loading: false,
          error: null,
        }));

        setPagination({
          total: data.total || appointmentsList.length,
          totalPages: data.totalPages || 1,
          currentPage: data.page || 1,
        });

        setRetryCount(0);
      } catch (error: unknown) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
          code?: string;
        };
        console.error("Error fetching appointments:", error);

        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Không thể tải danh sách lịch hẹn";

        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));

        // Auto-retry for network errors (max 3 times)
        if (retryCount < 3 && err.code === "NETWORK_ERROR") {
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            fetchAppointments(false);
          }, 2000);
        } else {
          toast.error(errorMessage);
        }
      }
    },
    [filters, retryCount]
  );
  const checkUserVehicles = useCallback(async () => {
    if (user?.role !== "customer") return; // Only check for customers

    try {
      const response = await vehiclesAPI.getByUser(user._id);
      const data = response.data; // Assume API returns { data: Vehicle[] } or { data: { count: number, ... } }

      // Handle both array and object responses
      let vehicleCount = 0;
      if (Array.isArray(data)) {
        vehicleCount = data.length;
      } else if (data && "count" in data && typeof data.count === "number") {
        vehicleCount = data.count;
      }

      setHasVehicles(vehicleCount > 0);
    } catch (error) {
      console.error("Error fetching user vehicles:", error);
      setHasVehicles(false); // Default to false on error
    }
  }, [user]);
  useEffect(() => {
    if (user?.role === "customer") {
      checkUserVehicles();
    }
  }, [user, checkUserVehicles]);

  /**
   * Effect to fetch appointments when filters change
   */
  useEffect(() => {
    fetchAppointments();

    // Check if user is coming from successful payment
    const urlParams = new URLSearchParams(window.location.search);
    const showFormParam = urlParams.get("showForm") === "true";
    const paymentSuccess = urlParams.get("payment") === "success";

    if (showFormParam && paymentSuccess) {
      // Show the appointment form automatically
      setShowForm(true);

      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (showFormParam && !paymentSuccess) {
      // User came back from VNPay but payment was not successful
      // Check for pending slot and release it
      const pendingAppointmentStr = localStorage.getItem("pendingAppointment");
      if (pendingAppointmentStr) {
        try {
          const pendingAppointment = JSON.parse(pendingAppointmentStr);
          if (pendingAppointment.selectedSlotId) {
            console.log(
              "⚠️ [AppointmentsPage] User back from VNPay without payment success, releasing slot..."
            );
            slotsAPI
              .release(pendingAppointment.selectedSlotId)
              .then(() => {
                console.log("✅ [AppointmentsPage] Slot released successfully");
                toast.success("Previous slot reservation has been released.");
              })
              .catch((error) => {
                console.error(
                  "❌ [AppointmentsPage] Failed to release slot:",
                  error
                );
                toast.error(
                  "Failed to release previous slot. Please contact support."
                );
              });

            // Clean up localStorage
            localStorage.removeItem("pendingAppointment");
            localStorage.removeItem("paymentVerified");
          }
        } catch (error) {
          console.error(
            "❌ [AppointmentsPage] Error parsing pending appointment:",
            error
          );
          // Clean up corrupted data
          localStorage.removeItem("pendingAppointment");
          localStorage.removeItem("paymentVerified");
        }
      }

      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchAppointments]);

  /**
   * Real-time appointment status updates
   */
  useCustomEvent(
    "appointmentStatusUpdate",
    useCallback((data) => {
      setState((prev) => ({
        ...prev,
        appointments: prev.appointments.map((apt) =>
          apt._id === data.appointmentId
            ? { ...apt, status: data.status, updatedAt: data.updatedAt }
            : apt
        ),
      }));
    }, [])
  );

  /**
   * Real-time new appointment notifications
   */
  useCustomEvent(
    "newAppointment",
    useCallback(
      (data) => {
        if (user?.role !== "customer" || data.customerId === user._id) {
          fetchAppointments(false);
        }
      },
      [user, fetchAppointments]
    )
  );

  /**
   * Handle status updates with proper API mapping and optimistic updates
   */
  const handleStatusUpdate = useCallback(
    async (
      appointmentId: string,
      newStatus: DetailedAppointmentStatus,
      notes?: string
    ) => {
      const appointment = state.appointments.find(
        (apt) => apt._id === appointmentId
      );

      if (!user || !appointment) {
        toast.error("Không tìm thấy thông tin lịch hẹn");
        return;
      }

      if (!canTransitionStatus(appointment.status, newStatus, user.role)) {
        toast.error("Bạn không có quyền thay đổi trạng thái này");
        return;
      }

      try {
        setState((prev) => ({ ...prev, updatingStatus: appointmentId }));

        // Optimistic update
        setState((prev) => ({
          ...prev,
          appointments: prev.appointments.map((apt) =>
            apt._id === appointmentId
              ? {
                  ...apt,
                  status: newStatus,
                  updatedAt: new Date().toISOString(),
                }
              : apt
          ),
        }));

        // Handle cancellation specially to include refund logic
        if (newStatus === "cancelled") {
          const response = await appointmentsAPI.cancel(
            appointmentId,
            "Khách hàng yêu cầu hủy"
          );

          // Check if refund was processed
          if (
            response.data &&
            "refundInfo" in response.data &&
            response.data.refundInfo
          ) {
            const refundInfo = response.data.refundInfo as {
              refundAmount: number;
            };
            const refundAmount = new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(refundInfo.refundAmount);

            toast.success(
              `Đã hủy lịch hẹn thành công! Hoàn tiền ${refundAmount} sẽ được xử lý trong 3-5 ngày làm việc.`,
              { duration: 6000 }
            );
          } else {
            toast.success("Đã hủy lịch hẹn thành công");
          }
        } else {
          // Call the correct API endpoint based on status
          await appointmentsAPI.updateStatus(appointmentId, newStatus, notes);

          toast.success(
            `Đã cập nhật trạng thái: ${appointmentStatusTranslations[newStatus]}`
          );
        }

        // Emit real-time update
        emitStatusUpdate(appointmentId, newStatus);

        // Refresh to ensure data consistency
        fetchAppointments(false);
      } catch (error: unknown) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        console.error("Error updating status:", error);

        // Revert optimistic update on error
        setState((prev) => ({
          ...prev,
          appointments: prev.appointments.map((apt) =>
            apt._id === appointmentId
              ? {
                  ...apt,
                  status: appointment.status,
                  updatedAt: appointment.updatedAt,
                }
              : apt
          ),
        }));

        const errorMessage =
          err.response?.data?.message || "Không thể cập nhật trạng thái";
        toast.error(errorMessage);
      } finally {
        setState((prev) => ({ ...prev, updatingStatus: null }));
      }
    },
    [state.appointments, user, emitStatusUpdate, fetchAppointments]
  );

  /**
   * Show cancel request modal
   */
  const showCancelConfirmation = useCallback((appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setShowCancelModal(true);
  }, []);

  /**
   * Handle cancel request success
   */
  const handleCancelRequestSuccess = useCallback(() => {
    setShowCancelModal(false);
    setAppointmentToCancel(null);
    fetchAppointments(); // Refresh the list
  }, [fetchAppointments]);

  const handleGenerateInvoice = async (appointmentId: string) => {
    try {
      await invoicesAPI.generate(appointmentId, {});
      toast.success("Hóa đơn đã được tạo thành công!");
      setShowPaymentModal(false);
      setSelectedAppointmentForInvoice(null);
      fetchAppointments(); // Refresh list
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Không thể tạo hóa đơn");
    }
  };

  /**
   * Handle details modal close
   */
  const handleDetailsClose = useCallback(() => {
    setShowDetails(false);
    setState((prev) => ({ ...prev, selectedAppointment: null }));
  }, []);

  /**
   * Handle appointment details view
   */
  const handleViewDetails = useCallback((appointment: Appointment) => {
    setState((prev) => ({ ...prev, selectedAppointment: appointment }));
    setShowDetails(true);
  }, []);

  /**
   * Handle appointment details update
   */
  const handleAppointmentUpdate = useCallback(async () => {
    if (state.selectedAppointment) {
      // Fetch updated appointment data
      try {
        const response = await appointmentsAPI.getById(
          state.selectedAppointment._id
        );
        setState((prev) => ({
          ...prev,
          selectedAppointment: response.data.data,
        }));
        // Also refresh the appointments list to keep it in sync
        fetchAppointments(false);
      } catch (error) {
        console.error("Error fetching updated appointment:", error);
        // Fallback to refresh all appointments
        fetchAppointments(false);
      }
    }
  }, [state.selectedAppointment, fetchAppointments]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback(
    (filterType: keyof FiltersState, value: string | number) => {
      setFilters((prev) => ({
        ...prev,
        [filterType]: value,
        page: filterType !== "page" ? 1 : typeof value === "number" ? value : 1, // Reset to page 1 when filters change
      }));
    },
    []
  );

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({
      statusFilter: "",
      sortBy: "date", // Sort by newest date first
      page: 1,
      limit: 10,
    });
  }, []);

  /**
   * Get status badge with proper styling
   */
  const getStatusBadge = useCallback((status: DetailedAppointmentStatus) => {
    const statusColors = {
      pending: "bg-orange-600 text-white border-orange-700",
      confirmed: "bg-lime-200 text-dark-900 border-lime-300",
      customer_arrived: "bg-dark-600 text-white border-blue-700",
      reception_created: "bg-purple-600 text-white border-purple-700",
      reception_approved: "bg-lime-200 text-dark-900 border-lime-300",
      parts_insufficient: "bg-red-600 text-white border-red-700",
      waiting_for_parts: "bg-orange-600 text-white border-orange-700",
      rescheduled: "bg-text-muted text-white border-dark-200",
      in_progress: "bg-dark-600 text-white border-blue-700",
      parts_requested: "bg-orange-600 text-white border-orange-700",
      completed: "bg-green-600 text-white border-green-700",
      invoiced: "bg-green-600 text-white border-green-700",
      cancelled: "bg-red-600 text-white border-red-700",
      cancel_requested: "bg-orange-600 text-white border-orange-700",
      cancel_approved: "bg-orange-600 text-white border-orange-700",
      cancel_refunded: "bg-green-600 text-white border-green-700",
      no_show: "bg-text-muted text-white border-dark-200",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          statusColors[status] || "bg-text-muted text-white border-dark-200"
        }`}
        title={appointmentStatusTranslations[status] || status}
        role="status"
        aria-label={`Trạng thái: ${
          appointmentStatusTranslations[status] || status
        }`}
      >
        {appointmentStatusTranslations[status] || status}
      </span>
    );
  }, []);

  /**
   * Render status action buttons
   */
  const renderStatusActions = useCallback(
    (appointment: Appointment) => {
      if (!user) return null;

      // Special case for pending appointments - show "Yêu cầu hủy" button only for customers
      // Check 24-hour rule for cancellation
      if (appointment.status === "pending" && user?.role === "customer") {
        // More robust date parsing
        let appointmentDate;
        try {
          // Check if scheduledDate is already a full ISO datetime
          if (
            appointment.scheduledDate.includes("T") &&
            appointment.scheduledDate.includes("Z")
          ) {
            // It's already a full ISO datetime, use it directly
            appointmentDate = new Date(appointment.scheduledDate);
          } else if (appointment.scheduledDate.includes("/")) {
            // Handle DD/MM/YYYY format
            const [day, month, year] = appointment.scheduledDate.split("/");
            appointmentDate = new Date(
              `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${
                appointment.scheduledTime
              }`
            );
          } else {
            // Handle YYYY-MM-DD format
            appointmentDate = new Date(
              `${appointment.scheduledDate}T${appointment.scheduledTime}`
            );
          }
        } catch (error) {
          console.error("Error parsing appointment date:", error);
          appointmentDate = new Date(
            `${appointment.scheduledDate}T${appointment.scheduledTime}`
          );
        }

        const now = new Date();
        const hoursDiff =
          (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Only show cancel button if more than 24 hours before appointment
        if (hoursDiff > 24) {
          return (
            <div
              className="flex items-center space-x-1 mt-2"
              role="group"
              aria-label="Hành động trạng thái"
            >
              <button
                onClick={() => showCancelConfirmation(appointment)}
                disabled={state.updatingStatus === appointment._id}
                className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-dark-900"
                aria-label="Yêu cầu hủy lịch hẹn"
              >
                {state.updatingStatus === appointment._id ? (
                  <ArrowPathIcon className="w-3 h-3 animate-spin" />
                ) : (
                  "Yêu cầu hủy"
                )}
              </button>
            </div>
          );
        }
        // If less than 24 hours, don't show cancel button
        return null;
      }

      // Handle cancellation statuses
      if (appointment.status === "cancelled") {
        return (
          <div
            className="flex items-center space-x-1 mt-2"
            role="group"
            aria-label="Hành động trạng thái"
          >
            <button
              disabled
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-dark-9000 cursor-not-allowed"
              aria-label="Đã hủy"
            >
              Đã hủy
            </button>
          </div>
        );
      }

      // Handle cancellation request statuses
      if (appointment.status === "cancel_requested") {
        return (
          <div
            className="flex items-center space-x-1 mt-2"
            role="group"
            aria-label="Hành động trạng thái"
          >
            <button
              disabled
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-orange-500 cursor-not-allowed"
              aria-label="Đã gửi yêu cầu hủy"
            >
              Đã gửi yêu cầu hủy
            </button>
          </div>
        );
      }

      if (appointment.status === "cancel_approved") {
        return (
          <div
            className="flex items-center space-x-1 mt-2"
            role="group"
            aria-label="Hành động trạng thái"
          >
            <button
              disabled
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-yellow-500 cursor-not-allowed"
              aria-label="Đã duyệt hủy"
            >
              Đã duyệt hủy
            </button>
          </div>
        );
      }

      if (appointment.status === "cancel_refunded") {
        return (
          <div
            className="flex items-center space-x-1 mt-2"
            role="group"
            aria-label="Hành động trạng thái"
          >
            <button
              disabled
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-green-500 cursor-not-allowed"
              aria-label="Đã hoàn tiền"
            >
              Đã hoàn tiền
            </button>
          </div>
        );
      }

      // Handle statuses where customer can request cancellation
      const cancellableStatuses = ["pending", "confirmed", "customer_arrived"];
      if (
        cancellableStatuses.includes(appointment.status) &&
        user?.role === "customer"
      ) {
        // Always show cancel button for cancellable appointments
        return (
          <div
            className="flex items-center space-x-1 mt-2"
            role="group"
            aria-label="Hành động trạng thái"
          >
            <button
              onClick={() => showCancelConfirmation(appointment)}
              disabled={state.updatingStatus === appointment._id}
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-dark-900"
              aria-label="Yêu cầu hủy lịch hẹn"
            >
              {state.updatingStatus === appointment._id ? (
                <ArrowPathIcon className="w-3 h-3 animate-spin" />
              ) : (
                "Yêu cầu hủy"
              )}
            </button>
          </div>
        );
      }

      // Add invoice display button for in_progress appointments (after payment confirmed)
      if (
        appointment.status === "in_progress" &&
        (user.role === "staff" || user.role === "admin" || user.role === "customer")
      ) {
        return (
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={() => {
                setSelectedAppointmentForInvoiceDisplay(appointment);
                setShowInvoiceDisplayModal(true);
              }}
              disabled={state.updatingStatus === appointment._id}
              className="inline-flex items-center px-2 py-1 border border-dark-200 text-xs rounded text-text-secondary bg-dark-300 hover:bg-dark-900 disabled:opacity-50"
            >
              Xem hóa đơn
            </button>
          </div>
        );
      }

      // Add invoice generation button for completed appointments
      if (
        appointment.status === "reception_approved" &&
        (user.role === "staff" || user.role === "admin")
      ) {
        console.log(
          "Showing buttons for reception_approved appointment:",
          appointment.appointmentNumber,
          "Status:",
          appointment.status,
          "User role:",
          user.role
        );
        return (
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={async () => {
                setSelectedAppointmentForPayment(appointment);

                // Fetch service reception (most complete data source)
                try {
                  const srResponse = await serviceReceptionAPI.getByAppointment(appointment._id);
                  if (srResponse.data.success) {
                    setPaymentModalServiceReception(srResponse.data.data);
                  }
                } catch (error) {
                  console.error('Error fetching service reception:', error);
                  setPaymentModalServiceReception(null);
                }

                // Also fetch invoice if available (for pre-calculated totals)
                try {
                  const invoiceResponse = await invoicesAPI.getByAppointment(appointment._id);
                  if (invoiceResponse.data.success) {
                    setPaymentModalInvoice(invoiceResponse.data.data);
                  }
                } catch (error) {
                  console.error('Error fetching invoice:', error);
                  setPaymentModalInvoice(null);
                }

                setShowPaymentConfirmationModal(true);
              }}
              disabled={state.updatingStatus === appointment._id}
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              Xác nhận thanh toán
            </button>
          </div>
        );
      }

      // Add invoice display button for completed appointments
      if (
        appointment.status === "completed" &&
        (user.role === "staff" || user.role === "admin")
      ) {
        return (
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={() => {
                setSelectedAppointmentForInvoiceDisplay(appointment);
                setShowInvoiceDisplayModal(true);
              }}
              disabled={state.updatingStatus === appointment._id}
              className="inline-flex items-center px-2 py-1 border border-dark-200 text-xs rounded text-text-secondary bg-dark-300 hover:bg-dark-900 disabled:opacity-50"
            >
              Xem hóa đơn chi tiết
            </button>
          </div>
        );
      }

      // Add invoice display button for invoiced appointments
      if (
        appointment.status === "invoiced" &&
        (user.role === "staff" ||
          user.role === "admin" ||
          user.role === "customer")
      ) {
        console.log(
          "Showing invoice button for invoiced appointment:",
          appointment.appointmentNumber,
          "Status:",
          appointment.status,
          "User role:",
          user.role
        );
        return (
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={() => {
                setSelectedAppointmentForInvoiceDisplay(appointment);
                setShowInvoiceDisplayModal(true);
              }}
              disabled={state.updatingStatus === appointment._id}
              className="inline-flex items-center px-2 py-1 border border-dark-200 text-xs rounded text-text-secondary bg-dark-300 hover:bg-dark-900 disabled:opacity-50"
            >
              Xem hóa đơn chi tiết
            </button>
          </div>
        );
      }

      const nextStatuses = getNextStatuses(appointment.status, user.role);

      if (nextStatuses.length === 0) return null;

      return (
        <div
          className="flex items-center space-x-1 mt-2"
          role="group"
          aria-label="Hành động trạng thái"
        >
          {nextStatuses.slice(0, 2).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusUpdate(appointment._id, status)}
              disabled={state.updatingStatus === appointment._id}
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-dark-900 bg-lime-200 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-offset-dark-900"
              aria-label={`Cập nhật trạng thái: ${appointmentStatusTranslations[status]}`}
            >
              {state.updatingStatus === appointment._id ? (
                <ArrowPathIcon className="w-3 h-3 animate-spin" />
              ) : (
                appointmentStatusTranslations[status]
              )}
            </button>
          ))}
        </div>
      );
    },
    [user, handleStatusUpdate, state.updatingStatus, showCancelConfirmation]
  );

  /**
   * Calculate dashboard statistics
   */
  const dashboardStats = useMemo(
    () => [
      {
        label: "Tổng lịch hẹn",
        value: pagination.total || state.appointments.length,
        color: "blue",
        icon: CalendarIcon,
      },
      {
        label: "Chờ xác nhận",
        value: state.appointments.filter((a) => a.status === "pending").length,
        color: "yellow",
        icon: ClockIcon,
      },
      {
        label: "Đang thực hiện",
        value: state.appointments.filter((a) => a.status === "in_progress")
          .length,
        color: "green",
        icon: ArrowPathIcon,
      },
      {
        label: "Hoàn thành",
        value: state.appointments.filter((a) => a.status === "completed")
          .length,
        color: "green",
        icon: CheckCircleIcon,
      },
    ],
    [state.appointments, pagination.total]
  );

  /**
   * Render pagination controls
   */
  const renderPagination = useCallback(() => {
    if (pagination.totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-dark-300 border-t border-dark-200 sm:px-6">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() =>
              handleFilterChange("page", Math.max(1, filters.page - 1))
            }
            disabled={filters.page <= 1}
            className="relative inline-flex items-center px-4 py-2 text-sm text-text-muted text-text-secondary bg-dark-300 border border-dark-200 rounded-md hover:bg-dark-900 disabled:opacity-50"
          >
            Trước
          </button>
          <button
            onClick={() =>
              handleFilterChange(
                "page",
                Math.min(pagination.totalPages, filters.page + 1)
              )
            }
            disabled={filters.page >= pagination.totalPages}
            className="relative ml-3 inline-flex items-center px-4 py-2 text-sm text-text-muted text-text-secondary bg-dark-300 border border-dark-200 rounded-md hover:bg-dark-900 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-text-secondary">
              Hiển thị{" "}
              <span className="text-text-muted">
                {(filters.page - 1) * filters.limit + 1}
              </span>{" "}
              đến{" "}
              <span className="text-text-muted">
                {Math.min(filters.page * filters.limit, pagination.total)}
              </span>{" "}
              trong tổng số{" "}
              <span className="text-text-muted">{pagination.total}</span> kết quả
            </p>
          </div>
          <div>
            <nav
              className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
              aria-label="Pagination"
            >
              {[...Array(Math.min(5, pagination.totalPages))].map(
                (_, index) => {
                  const page = index + Math.max(1, filters.page - 2);
                  if (page > pagination.totalPages) return null;

                  return (
                    <button
                      key={page}
                      onClick={() => handleFilterChange("page", page)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm text-text-muted ${
                        page === filters.page
                          ? "z-10 bg-dark-50 border-blue-500 text-lime-600"
                          : "bg-dark-300 border-dark-200 text-text-muted hover:bg-dark-900"
                      } border ${index === 0 ? "rounded-l-md" : ""} ${
                        index === Math.min(4, pagination.totalPages - 1)
                          ? "rounded-r-md"
                          : ""
                      }`}
                    >
                      {page}
                    </button>
                  );
                }
              )}
            </nav>
          </div>
        </div>
      </div>
    );
  }, [pagination, filters, handleFilterChange]);

  // Loading state
  if (state.loading && state.appointments.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-lime-600 animate-spin" />
          <h3 className="mt-2 text-sm text-text-muted text-white">
            Đang tải lịch hẹn...
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Vui lòng đợi trong giây lát
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
              Quản lý lịch hẹn
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Quản lý và theo dõi lịch hẹn bảo dưỡng xe điện
            </p>
            {state.error && (
              <div className="mt-2 text-sm text-red-400">
                {state.error}
                {retryCount > 0 && (
                  <span className="ml-2 text-xs text-text-muted">
                    (Đang thử lại lần {retryCount}/3)
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 h-[40px] ">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center rounded-md bg-dark-300 px-3 py-2 text-sm font-semibold text-lime-600 shadow-sm ring-1 ring-inset ring-dark-200 hover:bg-dark-200 mr-3 focus:outline-none focus:ring-2 focus:ring-lime-600"
              aria-label="Bật/tắt bộ lọc"
            >
              <FunnelIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
              Bộ lọc
            </button>
            {state.error ? (
              <div className="mt-6">
                <button
                  onClick={() => fetchAppointments(true)}
                  className="inline-flex items-center rounded-md bg-lime-200 px-3 py-2 text-sm font-semibold text-dark-900 shadow-sm hover:bg-lime-100"
                >
                  <ArrowPathIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                  Thử lại
                </button>
              </div>
            ) : (
              user?.role === "customer" && (
                <div className="mt-1">
                  {!hasVehicles ? (
                    <div></div>
                  ) : (
                    // Show create button only for customers with vehicles
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center rounded-md bg-lime-200 px-3 py-2 text-sm font-semibold text-dark-900 shadow-sm hover:bg-lime-100"
                    >
                      <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                      Tạo lịch hẹn mới
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-dark-300 rounded-lg shadow-sm border border-dark-200 p-4 mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="status-filter"
                  className="block text-sm text-text-muted text-white mb-1"
                >
                  Trạng thái
                </label>
                <select
                  id="status-filter"
                  value={filters.statusFilter}
                  onChange={(e) =>
                    handleFilterChange(
                      "statusFilter",
                      e.target.value as DetailedAppointmentStatus | ""
                    )
                  }
                  className="block w-full rounded-md bg-dark-300 text-white border border-dark-300 focus:border-lime-400 focus:ring-2 focus:ring-lime-400 shadow-sm sm:text-sm"
                >
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(appointmentStatusTranslations).map(
                    ([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full bg-dark-200 hover:bg-dark-100 text-text-secondary px-4 py-2 rounded-md text-sm text-text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-dark-900"
                  aria-label="Xóa tất cả bộ lọc"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              📋 Danh sách sắp xếp theo ngày mới nhất
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
          {dashboardStats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-dark-300 overflow-hidden shadow-sm rounded-lg border border-dark-200"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <IconComponent
                        className={`h-6 w-6 text-${stat.color}-600`}
                      />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm text-text-muted text-text-muted truncate">
                        {stat.label}
                      </p>
                      <p
                        className={`text-2xl font-semibold text-${stat.color}-600`}
                      >
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Appointments List */}
        <div className="bg-dark-300 shadow-sm rounded-lg border border-dark-200">
          <div className="px-4 py-5 sm:p-6">
            {state.appointments.length === 0 && !state.loading ? (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-text-muted" />
                <h3 className="mt-2 text-sm font-semibold text-white">
                  {state.error ? "Lỗi khi tải dữ liệu" : "Không có lịch hẹn"}
                </h3>
                <p className="mt-1 text-sm text-text-muted">
                  {state.error
                    ? "Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ"
                    : "Bắt đầu bằng cách tạo một lịch hẹn mới."}
                </p>
                {state.error ? (
                  <div className="mt-6">
                    <button
                      onClick={() => fetchAppointments(true)}
                      className="inline-flex items-center rounded-md bg-lime-200 px text-dark-900 shadow-sm hover:bg-lime-100"
                    >
                      <ArrowPathIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                      Thử lại
                    </button>
                  </div>
                ) : (
                  user?.role === "customer" && (
                    <div className="mt-6">
                      {!hasVehicles ? (
                        <div className="text-sm text-text-muted">
                          Bạn cần thêm ít nhất một xe vào hệ thống để tạo lịch
                          hẹn.{" "}
                          <a
                            href="/vehicles"
                            className="text-lime-600 hover:underline"
                          >
                            Thêm xe ngay
                          </a>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowForm(true)}
                          className="inline-flex items-center rounded-md bg-lime-200 px text-dark-900 shadow-sm hover:bg-lime-100"
                        >
                          <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                          Tạo lịch hẹn mới
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {state.appointments.map((appointment) => (
                  <article
                    key={appointment._id}
                    className="border border-dark-200 rounded-lg p-4 hover:bg-dark-900 transition-colors focus-within:ring-2 focus-within:ring-blue-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <header className="flex items-center space-x-4 mb-2">
                          <h2 className="text-lg font-semibold text-white">
                            #{appointment.appointmentNumber}
                          </h2>
                          {getStatusBadge(appointment.status)}
                        </header>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-3">
                          <div>
                            <h3 className="text-sm text-text-muted text-text-muted">
                              Khách hàng
                            </h3>
                            <p className="text-sm text-white">
                              {appointment.customerId.firstName}{" "}
                              {appointment.customerId.lastName}
                            </p>
                            <p className="text-sm text-text-muted">
                              <a
                                href={`tel:${appointment.customerId.phone}`}
                                className="hover:text-lime-600"
                              >
                                {appointment.customerId.phone}
                              </a>
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm text-text-muted text-text-muted">
                              Xe
                            </h3>
                            <p className="text-sm text-white">
                              {appointment.vehicleId.make}{" "}
                              {appointment.vehicleId.model}{" "}
                              {appointment.vehicleId.year}
                            </p>
                            <p className="text-sm text-text-muted">
                              {appointment.vehicleId.licensePlate}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm text-text-muted text-text-muted">
                              Lịch hẹn
                            </h3>
                            <p className="text-sm text-white">
                              <time
                                dateTime={combineDateTime(
                                  appointment.scheduledDate,
                                  appointment.scheduledTime
                                )}
                              >
                                {formatVietnameseDateTime(
                                  combineDateTime(
                                    appointment.scheduledDate,
                                    appointment.scheduledTime
                                  )
                                )}
                              </time>
                            </p>
                            <p className="text-sm text-text-muted">
                              Chi phí ước tính:{" "}
                              {formatVND(appointment.totalAmount || 0)}
                            </p>
                          </div>
                        </div>

                        {appointment.assignedTechnician && (
                          <div className="mb-3">
                            <h3 className="text-sm text-text-muted text-text-muted">
                              Kỹ thuật viên
                            </h3>
                            <p className="text-sm text-white">
                              {appointment.assignedTechnician.firstName}{" "}
                              {appointment.assignedTechnician.lastName}
                            </p>
                          </div>
                        )}

                        {renderStatusActions(appointment)}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {/* Show invoice button for in_progress, completed, and invoiced statuses */}
                        {["in_progress", "completed", "invoiced"].includes(appointment.status) && (
                          <button
                            onClick={() => {
                              setSelectedAppointmentForInvoiceDisplay(appointment);
                              setShowInvoiceDisplayModal(true);
                            }}
                            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-dark-900"
                            aria-label={`Xem hóa đơn #${appointment.appointmentNumber}`}
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetails(appointment)}
                          className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-dark-900 bg-lime-200 hover:bg-lime-100 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-dark-900"
                          aria-label={`Xem chi tiết lịch hẹn #${appointment.appointmentNumber}`}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          {renderPagination()}
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <PaymentRestorationHandler>
          <AppointmentFormClean onCancel={() => setShowForm(false)} />
        </PaymentRestorationHandler>
      )}

      {showDetails && state.selectedAppointment && (
        <AppointmentDetails
          appointment={state.selectedAppointment}
          onClose={handleDetailsClose}
          _onUpdate={handleAppointmentUpdate}
        />
      )}

      {/* Cancel Request Modal */}
      {appointmentToCancel && (
        <CancelRequestModal
          appointment={appointmentToCancel}
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setAppointmentToCancel(null);
          }}
          onSuccess={handleCancelRequestSuccess}
        />
      )}

      {/* Payment Info Modal */}
      {showPaymentModal && selectedAppointmentForInvoice && (
        <InvoiceGenerationModal
          appointment={selectedAppointmentForInvoice}
          serviceReception={invoiceModalServiceReception}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedAppointmentForInvoice(null);
            setInvoiceModalServiceReception(null);
          }}
          onConfirm={handleGenerateInvoice}
        />
      )}

      {/* Payment Confirmation Modal */}
      {showPaymentConfirmationModal && selectedAppointmentForPayment && (
        <PaymentConfirmationModal
          appointment={selectedAppointmentForPayment}
          invoice={paymentModalInvoice}
          serviceReception={paymentModalServiceReception}
          isOpen={showPaymentConfirmationModal}
          onClose={() => {
            setShowPaymentConfirmationModal(false);
            setSelectedAppointmentForPayment(null);
            setPaymentModalInvoice(null);
            setPaymentModalServiceReception(null);
          }}
          onSuccess={() => {
            // Refresh appointments list
            fetchAppointments();
            toast.success("Thanh toán đã được xác nhận thành công!");
          }}
        />
      )}

      {/* Invoice Display Modal */}
      {showInvoiceDisplayModal && selectedAppointmentForInvoiceDisplay && (
        <InvoiceDisplayModal
          appointmentId={selectedAppointmentForInvoiceDisplay._id}
          isOpen={showInvoiceDisplayModal}
          onClose={() => {
            setShowInvoiceDisplayModal(false);
            setSelectedAppointmentForInvoiceDisplay(null);
          }}
        />
      )}
    </div>
  );
};

export default AppointmentsPage;
