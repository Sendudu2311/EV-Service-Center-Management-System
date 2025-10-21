import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlusIcon,
  CalendarIcon,
  EyeIcon,
  ArrowPathIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { useSocket, useCustomEvent } from "../contexts/SocketContext";
import { appointmentsAPI, vehiclesAPI, slotsAPI } from "../services/api";
import toast from "react-hot-toast";
import AppointmentFormClean from "../components/Appointment/AppointmentForm";
import PaymentRestorationHandler from "../components/Appointment/PaymentRestorationHandler";
import AppointmentDetails from "../components/Appointment/AppointmentDetails";
import {
  Appointment,
  DetailedAppointmentStatus,
  AppointmentPriority,
  appointmentStatusTranslations,
  priorityTranslations,
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
  priorityFilter: AppointmentPriority | "";
  sortBy: "date" | "status" | "priority";
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

  // Confirmation dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [appointmentToCancel, setAppointmentToCancel] =
    useState<Appointment | null>(null);

  // Filters state
  const [filters, setFilters] = useState<FiltersState>({
    statusFilter: "",
    priorityFilter: "",
    sortBy: "status", // Backend sorts by status priority automatically
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
        if (filters.priorityFilter) params.priority = filters.priorityFilter;

        const response = await appointmentsAPI.getAll(params);
        const data = response.data as unknown as AppointmentResponse;

        const appointmentsList = data.data || [];

        // Backend already handles sorting by status priority, no client-side sorting needed

        setState((prev) => ({
          ...prev,
          appointments: appointmentsList,
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
   * Handle appointment cancellation request
   */
  const handleCancelAppointment = useCallback(
    async (appointmentId: string, reason?: string) => {
      const appointment = state.appointments.find(
        (apt) => apt._id === appointmentId
      );

      if (!appointment) {
        toast.error("Không tìm thấy lịch hẹn");
        return;
      }

      try {
        // Use new cancel request API
        const response = await appointmentsAPI.requestCancellation(
          appointmentId,
          reason || "Khách hàng yêu cầu hủy"
        );

        // const refundPercentage = response.data.data?.refundPercentage || 100;
        const refundMessage =
          response.data.data?.refundMessage || "100% refund";

        toast.success(
          `Đã gửi yêu cầu hủy thành công! ${refundMessage} sẽ được xử lý sau khi staff duyệt.`,
          { duration: 6000 }
        );
        fetchAppointments(false);
      } catch (error: unknown) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        console.error("Error requesting cancellation:", error);
        const errorMessage =
          err.response?.data?.message || "Không thể gửi yêu cầu hủy";
        toast.error(errorMessage);
      }
    },
    [state.appointments, fetchAppointments]
  );

  /**
   * Show cancel confirmation dialog
   */
  const showCancelConfirmation = useCallback((appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setCancelReason(""); // Reset reason
    setShowCancelDialog(true);
  }, []);

  /**
   * Handle cancel confirmation
   */
  const handleCancelConfirmation = useCallback(async () => {
    if (!appointmentToCancel) return;

    setShowCancelDialog(false);
    await handleCancelAppointment(appointmentToCancel._id, cancelReason);
    setAppointmentToCancel(null);
    setCancelReason("");
  }, [appointmentToCancel, cancelReason, handleCancelAppointment]);

  /**
   * Handle cancel dialog close
   */
  const handleCancelDialogClose = useCallback(() => {
    setShowCancelDialog(false);
    setAppointmentToCancel(null);
    setCancelReason("");
  }, []);

  /**
   * Handle form success callback
   */
  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    fetchAppointments(false);
    toast.success("Tạo lịch hẹn thành công!");
  }, [fetchAppointments]);

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
      priorityFilter: "",
      sortBy: "status", // Keep status priority sorting
      page: 1,
      limit: 10,
    });
  }, []);

  /**
   * Get status badge with proper styling
   */
  const getStatusBadge = useCallback((status: DetailedAppointmentStatus) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      confirmed: "bg-blue-100 text-blue-800 border-blue-200",
      customer_arrived: "bg-indigo-100 text-indigo-800 border-indigo-200",
      reception_created: "bg-purple-100 text-purple-800 border-purple-200",
      reception_approved: "bg-cyan-100 text-cyan-800 border-cyan-200",
      parts_insufficient: "bg-orange-100 text-orange-800 border-orange-200",
      waiting_for_parts: "bg-amber-100 text-amber-800 border-amber-200",
      rescheduled: "bg-gray-100 text-gray-800 border-gray-200",
      in_progress: "bg-green-100 text-green-800 border-green-200",
      parts_requested: "bg-yellow-100 text-yellow-800 border-yellow-200",
      completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
      invoiced: "bg-teal-100 text-teal-800 border-teal-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
      cancel_requested: "bg-orange-100 text-orange-800 border-orange-200",
      cancel_approved: "bg-yellow-100 text-yellow-800 border-yellow-200",
      cancel_refunded: "bg-green-100 text-green-800 border-green-200",
      no_show: "bg-gray-100 text-gray-800 border-gray-200",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200"
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
   * Get priority badge with proper styling
   */
  const getPriorityBadge = useCallback((priority: AppointmentPriority) => {
    const priorityColors = {
      low: "bg-gray-100 text-gray-800 border-gray-200",
      normal: "bg-blue-100 text-blue-800 border-blue-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      urgent: "bg-red-100 text-red-800 border-red-200",
    };

    const priorityIcon =
      priority === "urgent" ? (
        <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
      ) : null;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          priorityColors[priority] ||
          "bg-gray-100 text-gray-800 border-gray-200"
        }`}
        title={priorityTranslations[priority] || priority}
        role="status"
        aria-label={`Độ ưu tiên: ${priorityTranslations[priority] || priority}`}
      >
        {priorityIcon}
        {priorityTranslations[priority] || priority}
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
                className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-gray-500 cursor-not-allowed"
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
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
        color: "emerald",
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
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() =>
              handleFilterChange("page", Math.max(1, filters.page - 1))
            }
            disabled={filters.page <= 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
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
            className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Hiển thị{" "}
              <span className="font-medium">
                {(filters.page - 1) * filters.limit + 1}
              </span>{" "}
              đến{" "}
              <span className="font-medium">
                {Math.min(filters.page * filters.limit, pagination.total)}
              </span>{" "}
              trong tổng số{" "}
              <span className="font-medium">{pagination.total}</span> kết quả
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
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                        page === filters.page
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Đang tải lịch hẹn...
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Vui lòng đợi trong giây lát
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Quản lý lịch hẹn
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý và theo dõi lịch hẹn bảo dưỡng xe điện
            </p>
            {state.error && (
              <div className="mt-2 flex items-center text-sm text-red-600">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                {state.error}
                {retryCount > 0 && (
                  <span className="ml-2 text-xs text-gray-500">
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
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 mr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Bật/tắt bộ lọc"
            >
              <FunnelIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
              Bộ lọc
            </button>
            {state.error ? (
              <div className="mt-6">
                <button
                  onClick={() => fetchAppointments(true)}
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  <ArrowPathIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                  Thử lại
                </button>
              </div>
            ) : (
              user?.role !== "technician" && (
                <div className="mt-1">
                  {user?.role === "customer" && !hasVehicles ? (
                    <div></div>
                  ) : (
                    // Show create button for non-customers or customers with vehicles
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="status-filter"
                  className="block text-sm font-medium text-gray-700 mb-1"
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
              <div>
                <label
                  htmlFor="priority-filter"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Độ ưu tiên
                </label>
                <select
                  id="priority-filter"
                  value={filters.priorityFilter}
                  onChange={(e) =>
                    handleFilterChange(
                      "priorityFilter",
                      e.target.value as AppointmentPriority | ""
                    )
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Tất cả độ ưu tiên</option>
                  {Object.entries(priorityTranslations).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
                  aria-label="Xóa tất cả bộ lọc"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              📋 Danh sách đã được sắp xếp theo thứ tự ưu tiên trạng thái
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
                className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <IconComponent
                        className={`h-6 w-6 text-${stat.color}-600`}
                      />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-500 truncate">
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
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            {state.appointments.length === 0 && !state.loading ? (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  {state.error ? "Lỗi khi tải dữ liệu" : "Không có lịch hẹn"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {state.error
                    ? "Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ"
                    : "Bắt đầu bằng cách tạo một lịch hẹn mới."}
                </p>
                {state.error ? (
                  <div className="mt-6">
                    <button
                      onClick={() => fetchAppointments(true)}
                      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    >
                      <ArrowPathIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
                      Thử lại
                    </button>
                  </div>
                ) : (
                  user?.role !== "technician" && (
                    <div className="mt-6">
                      {user?.role === "customer" && !hasVehicles ? (
                        <div className="text-sm text-gray-500">
                          Bạn cần thêm ít nhất một xe vào hệ thống để tạo lịch
                          hẹn.{" "}
                          <a
                            href="/vehicles"
                            className="text-blue-600 hover:underline"
                          >
                            Thêm xe ngay
                          </a>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowForm(true)}
                          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
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
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors focus-within:ring-2 focus-within:ring-blue-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <header className="flex items-center space-x-4 mb-2">
                          <h2 className="text-lg font-semibold text-gray-900">
                            #{appointment.appointmentNumber}
                          </h2>
                          {getStatusBadge(appointment.status)}
                          {getPriorityBadge(appointment.priority)}
                        </header>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-3">
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">
                              Khách hàng
                            </h3>
                            <p className="text-sm text-gray-900">
                              {appointment.customerId.firstName}{" "}
                              {appointment.customerId.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              <a
                                href={`tel:${appointment.customerId.phone}`}
                                className="hover:text-blue-600"
                              >
                                {appointment.customerId.phone}
                              </a>
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">
                              Xe
                            </h3>
                            <p className="text-sm text-gray-900">
                              {appointment.vehicleId.make}{" "}
                              {appointment.vehicleId.model}{" "}
                              {appointment.vehicleId.year}
                            </p>
                            <p className="text-sm text-gray-500">
                              {appointment.vehicleId.licensePlate}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-500">
                              Lịch hẹn
                            </h3>
                            <p className="text-sm text-gray-900">
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
                            <p className="text-sm text-gray-500">
                              Chi phí ước tính:{" "}
                              {formatVND(appointment.totalAmount || 0)}
                            </p>
                          </div>
                        </div>

                        {appointment.assignedTechnician && (
                          <div className="mb-3">
                            <h3 className="text-sm font-medium text-gray-500">
                              Kỹ thuật viên
                            </h3>
                            <p className="text-sm text-gray-900">
                              {appointment.assignedTechnician.firstName}{" "}
                              {appointment.assignedTechnician.lastName}
                            </p>
                          </div>
                        )}

                        {renderStatusActions(appointment)}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleViewDetails(appointment)}
                          className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
          <AppointmentFormClean
            onCancel={() => setShowForm(false)}
            onSuccess={handleFormSuccess}
          />
        </PaymentRestorationHandler>
      )}

      {showDetails && state.selectedAppointment && (
        <AppointmentDetails
          appointment={state.selectedAppointment}
          onClose={handleDetailsClose}
          _onUpdate={handleAppointmentUpdate}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && appointmentToCancel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4 text-center">
                Yêu cầu hủy lịch hẹn
              </h3>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-4">
                  Bạn có chắc chắn muốn yêu cầu hủy lịch hẹn{" "}
                  <span className="font-semibold text-gray-900">
                    #{appointmentToCancel.appointmentNumber}
                  </span>
                  ?
                </p>

                {/* Business Rule Display */}
                {(() => {
                  let appointmentDate;
                  try {
                    if (
                      appointmentToCancel.scheduledDate.includes("T") &&
                      appointmentToCancel.scheduledDate.includes("Z")
                    ) {
                      appointmentDate = new Date(
                        appointmentToCancel.scheduledDate
                      );
                    } else if (
                      appointmentToCancel.scheduledDate.includes("/")
                    ) {
                      const [day, month, year] =
                        appointmentToCancel.scheduledDate.split("/");
                      appointmentDate = new Date(
                        `${year}-${month.padStart(2, "0")}-${day.padStart(
                          2,
                          "0"
                        )}T${appointmentToCancel.scheduledTime}`
                      );
                    } else {
                      appointmentDate = new Date(
                        `${appointmentToCancel.scheduledDate}T${appointmentToCancel.scheduledTime}`
                      );
                    }
                  } catch {
                    appointmentDate = new Date(
                      `${appointmentToCancel.scheduledDate}T${appointmentToCancel.scheduledTime}`
                    );
                  }

                  const now = new Date();
                  const hoursDiff =
                    (appointmentDate.getTime() - now.getTime()) /
                    (1000 * 60 * 60);
                  const isMoreThan24h = hoursDiff > 24;
                  // const refundPercentage = isMoreThan24h ? 100 : 80;

                  return (
                    <div
                      className={`p-3 rounded-md mb-4 ${
                        isMoreThan24h
                          ? "bg-green-50 border border-green-200"
                          : "bg-orange-50 border border-orange-200"
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`flex-shrink-0 w-2 h-2 rounded-full mr-2 ${
                            isMoreThan24h ? "bg-green-400" : "bg-orange-400"
                          }`}
                        ></div>
                        <p
                          className={`text-sm font-medium ${
                            isMoreThan24h ? "text-green-800" : "text-orange-800"
                          }`}
                        >
                          {isMoreThan24h ? "100% hoàn tiền" : "80% hoàn tiền"}
                        </p>
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          isMoreThan24h ? "text-green-600" : "text-orange-600"
                        }`}
                      >
                        {isMoreThan24h
                          ? "Hủy trước 24h sẽ được hoàn 100% tiền"
                          : "Hủy trong vòng 24h sẽ được hoàn 80% tiền"}
                      </p>
                    </div>
                  );
                })()}

                {/* Reason Dropdown */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lý do hủy lịch hẹn
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Chọn lý do hủy...</option>
                    <option value="Thay đổi kế hoạch">Thay đổi kế hoạch</option>
                    <option value="Xe gặp sự cố khác">Xe gặp sự cố khác</option>
                    <option value="Không thể đến đúng giờ">
                      Không thể đến đúng giờ
                    </option>
                    <option value="Tìm được dịch vụ khác">
                      Tìm được dịch vụ khác
                    </option>
                    <option value="Lý do cá nhân">Lý do cá nhân</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <p className="text-xs text-gray-400 mb-4">
                  Yêu cầu hủy sẽ được gửi đến staff để xem xét và xử lý hoàn
                  tiền.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={handleCancelDialogClose}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleCancelConfirmation}
                  disabled={!cancelReason}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Gửi yêu cầu hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
