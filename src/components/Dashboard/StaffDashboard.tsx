import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  CalendarIcon as Calendar,
  ClockIcon as Clock,
  CheckCircleIcon as CheckCircle,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon as Users,
  UserPlusIcon,
  XMarkIcon as X,
  UserIcon as User,
  BoltIcon as Zap,
  ArrowPathIcon as RefreshCw,
  ClipboardDocumentCheckIcon as ClipboardCheck,
} from "@heroicons/react/24/outline";
import {
  dashboardAPI,
  appointmentsAPI,
  serviceReceptionAPI,
  partConflictsAPI,
} from "../../services/api";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useDebouncedFetch } from "../../hooks/useDebouncedFetch";
import { format } from "date-fns";
import TechnicianSelection from "../Appointment/TechnicianSelection";
import ServiceReceptionReview from "../ServiceReception/ServiceReceptionReview";
import ReceptionPaymentModal from "../Payment/ReceptionPaymentModal";

interface DashboardData {
  stats: {
    todayAppointments: number;
    weeklyAppointments: number;
    pendingAppointments: number;
    completedToday: number;
  };
  todaysAppointments: Array<{
    _id: string;
    appointmentNumber: string;
    scheduledTime: string;
    status: string;
    customer: string;
    vehicle: string;
    services: string[];
    technician: string;
    estimatedDuration: number;
  }>;
  totalVehicles: number;
  totalAppointmentsToday: number;
  pendingAppointments: number;
  inProgressAppointments: number;
  completedThisWeek: number;
  recentAppointments: any[];
  availableTechnicians: any[];
}

const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const { debouncedFetch, isLoading: fetchLoading } = useDebouncedFetch(300);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [assigningTechnician, setAssigningTechnician] = useState<string | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "appointments" | "reception-review" | "customer-arrival" | "pending-payment" | "completed-approval"
  >("appointments");
  const [appointmentsNeedingArrival, setAppointmentsNeedingArrival] = useState<
    any[]
  >([]);
  const [arrivalLoading, setArrivalLoading] = useState(false);
  const [pendingReceptions, setPendingReceptions] = useState<any[]>([]);
  const [receptionLoading, setReceptionLoading] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);
  const [conflictLoading, setConflictLoading] = useState(false);

  // NEW WORKFLOW: Reception Payment Modal
  const [showReceptionPaymentModal, setShowReceptionPaymentModal] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<any>(null);
  const [selectedServiceReception, setSelectedServiceReception] = useState<any>(null);
  const [pendingPaymentAppointments, setPendingPaymentAppointments] = useState<any[]>([]);
  const [pendingPaymentLoading, setPendingPaymentLoading] = useState(false);

  // NEW: Completed appointments waiting for final staff approval
  const [completedAppointments, setCompletedAppointments] = useState<any[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);

  // Confirmation modal for final approval
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [appointmentToConfirm, setAppointmentToConfirm] = useState<string | null>(null);

  const debouncedFetchDashboard = () => {
    debouncedFetch(fetchDashboardData);
  };

  const immediateFetchDashboard = () => {
    debouncedFetch(fetchDashboardData, true);
  };

  const fetchConflictStats = async () => {
    try {
      setConflictLoading(true);
      const response = await partConflictsAPI.getConflictStats();
      setConflictCount(response.data.data?.pending || 0);
    } catch (error) {
      console.error("Error fetching conflict stats:", error);
    } finally {
      setConflictLoading(false);
    }
  };

  const fetchAppointmentsNeedingArrival = async () => {
    try {
      setArrivalLoading(true);
      // Fetch appointments with status = "confirmed" that need customer arrival confirmation
      // Remove dateRange filter to get all confirmed appointments regardless of date
      // Staff needs to see all confirmed appointments waiting for customer arrival
      const response = await appointmentsAPI.getAll({
        status: "confirmed",
        dateRange: "all", // Changed from "today" to "all" to show all confirmed appointments
        limit: 100, // Increased limit to show more appointments
      });

      console.log("[fetchAppointmentsNeedingArrival] Response:", response.data);
      const appointments = response.data.data || response.data || [];
      console.log(
        "[fetchAppointmentsNeedingArrival] Found appointments:",
        appointments.length
      );

      setAppointmentsNeedingArrival(appointments);
    } catch (error: any) {
      console.error("Error fetching appointments needing arrival:", error);
      toast.error("Không thể tải danh sách lịch hẹn chờ khách đến");
    } finally {
      setArrivalLoading(false);
    }
  };

  const handleCustomerArrival = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      await appointmentsAPI.updateStatus(appointmentId, "customer_arrived");
      toast.success("Đã xác nhận khách hàng đến");
      fetchAppointmentsNeedingArrival();
      immediateFetchDashboard();
    } catch (error: any) {
      console.error("Error marking customer arrival:", error);
      toast.error(
        error.response?.data?.message || "Không thể xác nhận khách hàng đến"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // NEW WORKFLOW: Fetch appointments pending payment (reception_approved status)
  const fetchPendingPaymentAppointments = async () => {
    try {
      setPendingPaymentLoading(true);
      const response = await appointmentsAPI.getAll({ status: "reception_approved" });
      const appointments = response.data.data || response.data || [];
      setPendingPaymentAppointments(appointments);
    } catch (error: any) {
      console.error("Error fetching pending payment appointments:", error);
      toast.error("Không thể tải danh sách lịch hẹn chờ thanh toán");
    } finally {
      setPendingPaymentLoading(false);
    }
  };


  // NEW: Fetch completed appointments waiting for staff final approval
  const fetchCompletedAppointments = async () => {
    try {
      setCompletedLoading(true);
      const response = await appointmentsAPI.getAll({
        status: "completed",
        limit: 100, // Increase limit to show more completed appointments
        dateRange: "all" // Get all dates, not just today
      });
      const appointments = response.data.data || response.data || [];
      setCompletedAppointments(appointments);
    } catch (error: any) {
      console.error("Error fetching completed appointments:", error);
      toast.error("Không thể tải danh sách lịch hẹn đã hoàn thành");
    } finally {
      setCompletedLoading(false);
    }
  };

  useEffect(() => {
    debouncedFetchDashboard();
    fetchConflictStats();
    if (activeTab === "reception-review") {
      fetchPendingReceptions();
    }
    if (activeTab === "customer-arrival") {
      fetchAppointmentsNeedingArrival();
    }
    if (activeTab === "pending-payment") {
      fetchPendingPaymentAppointments();
    }
    if (activeTab === "completed-approval") {
      fetchCompletedAppointments();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getStats("staff");
      setDashboardData(response.data.data);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        toast.error("Không thể tải dữ liệu dashboard", { duration: 3000 });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingReceptions = async () => {
    try {
      setReceptionLoading(true);
      // Call the correct backend endpoint to get pending service receptions
      const response = await fetch(
        "/api/appointments/receptions/pending-approval",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPendingReceptions(data.data || []);
      } else {
        toast.error("Không thể tải danh sách phiếu tiếp nhận");
      }
    } catch (error) {
      console.error("Error fetching pending receptions:", error);
      toast.error("Không thể tải danh sách phiếu tiếp nhận");
    } finally {
      setReceptionLoading(false);
    }
  };

  const handleReceptionReview = async (
    receptionId: string,
    decision: "approve" | "reject",
    notes: string,
    externalParts?: any[]
  ) => {
    try {
      // receptionId is now the actual ServiceReception _id, not appointment ID
      const response = await fetch(
        `/api/service-receptions/${receptionId}/approve`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision: decision === "approve" ? "approved" : "rejected",
            reviewNotes: notes,
            externalParts: externalParts || [],
          }),
        }
      );

      if (response.ok) {
        fetchPendingReceptions();
        immediateFetchDashboard();
      } else {
        throw new Error("Failed to review reception");
      }
    } catch (error: any) {
      console.error("Error reviewing reception:", error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-600 text-white";
      case "pending":
        return "bg-orange-600 text-white";
      case "completed":
        return "bg-lime-200 text-dark-900";
      case "in_progress":
        return "bg-dark-600 text-white";
      case "cancelled":
        return "bg-red-600 text-white";
      default:
        return "bg-text-muted text-white";
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      await appointmentsAPI.confirm(appointmentId);
      toast.success("Appointment confirmed successfully");
      immediateFetchDashboard();
    } catch (error: any) {
      console.error("Error confirming appointment:", error);
      toast.error(
        error.response?.data?.message || "Failed to confirm appointment"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignTechnician = async (
    appointmentId: string,
    technicianId: string
  ) => {
    setActionLoading(appointmentId);
    try {
      await appointmentsAPI.assignTechnician(appointmentId, technicianId);
      toast.success("Technician assigned successfully");
      setAssigningTechnician(null);
      immediateFetchDashboard();
    } catch (error: any) {
      console.error("Error assigning technician:", error);
      toast.error(
        error.response?.data?.message || "Failed to assign technician"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleAutoAssign = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      await appointmentsAPI.assignTechnician(appointmentId, "", {
        autoAssign: true,
      });
      toast.success("Technician auto-assigned successfully");
      immediateFetchDashboard();
    } catch (error: any) {
      console.error("Error auto-assigning technician:", error);
      toast.error(
        error.response?.data?.message || "Failed to auto-assign technician"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // NEW WORKFLOW: Handle confirm payment after reception approval
  const handleConfirmPayment = async (appointmentId: string) => {
    try {
      // Fetch appointment and service reception data
      const appointmentResponse = await appointmentsAPI.getById(appointmentId);
      const appointment = appointmentResponse.data.data;

      // Fetch service reception by appointment ID
      const receptionResponse = await serviceReceptionAPI.getByAppointment(appointmentId);
      const serviceReception = receptionResponse.data.data;

      // Set state and open modal
      setSelectedAppointmentForPayment(appointment);
      setSelectedServiceReception(serviceReception);
      setShowReceptionPaymentModal(true);
    } catch (error: any) {
      console.error("Error fetching appointment/reception data:", error);
      toast.error(error.response?.data?.message || "Không thể tải dữ liệu appointment");
    }
  };

  // NEW WORKFLOW: Handle staff final confirmation
  const handleStaffFinalConfirm = async (appointmentId: string) => {
    setAppointmentToConfirm(appointmentId);
    setShowConfirmModal(true);
  };

  const confirmFinalApproval = async () => {
    if (!appointmentToConfirm) return;

    setActionLoading(appointmentToConfirm);
    setShowConfirmModal(false);
    try {
      await appointmentsAPI.staffFinalConfirm(appointmentToConfirm);
      toast.success("Xác nhận hoàn thành thành công!");
      fetchCompletedAppointments(); // Refresh completed list
      immediateFetchDashboard(); // Refresh dashboard stats
    } catch (error: any) {
      console.error("Error confirming completion:", error);
      toast.error(
        error.response?.data?.message || "Không thể xác nhận hoàn thành"
      );
    } finally {
      setActionLoading(null);
      setAppointmentToConfirm(null);
    }
  };

  // Handle payment modal success
  const handlePaymentSuccess = () => {
    setShowReceptionPaymentModal(false);
    setSelectedAppointmentForPayment(null);
    setSelectedServiceReception(null);
    immediateFetchDashboard();
    toast.success("Thanh toán thành công! Công việc đã bắt đầu.");
  };

  if (loading || fetchLoading()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-300 shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Staff Dashboard</h1>
              <p className="mt-1 text-sm text-text-muted">
                Xin chào, {user?.firstName} {user?.lastName}
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-dark-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("appointments")}
                className={`px-4 py-2 rounded-md text-sm text-text-muted transition-colors ${
                  activeTab === "appointments"
                    ? "bg-dark-300 text-lime-600 shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Lịch hẹn</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("customer-arrival")}
                className={`px-4 py-2 rounded-md text-sm text-text-muted transition-colors ${
                  activeTab === "customer-arrival"
                    ? "bg-dark-300 text-lime-600 shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Chờ khách đến</span>
                  {appointmentsNeedingArrival.length > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                      {appointmentsNeedingArrival.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab("reception-review")}
                className={`px-4 py-2 rounded-md text-sm text-text-muted transition-colors ${
                  activeTab === "reception-review"
                    ? "bg-dark-300 text-lime-600 shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ClipboardCheck className="h-4 w-4" />
                  <span>Duyệt phiếu tiếp nhận</span>
                  {pendingReceptions.length > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                      {pendingReceptions.length}
                    </span>
                  )}
                  {conflictCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-yellow-100 bg-yellow-600 rounded-full">
                      {conflictCount} xung đột
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab("pending-payment")}
                className={`px-4 py-2 rounded-md text-sm text-text-muted transition-colors ${
                  activeTab === "pending-payment"
                    ? "bg-dark-300 text-lime-600 shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Chờ thanh toán</span>
                  {pendingPaymentAppointments.length > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                      {pendingPaymentAppointments.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab("completed-approval")}
                className={`px-4 py-2 rounded-md text-sm text-text-muted transition-colors ${
                  activeTab === "completed-approval"
                    ? "bg-dark-300 text-lime-600 shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Duyệt hoàn thành</span>
                  {completedAppointments.length > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                      {completedAppointments.length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "appointments" && (
          // Appointments Tab Content
          <>
            {/* Stats Cards */}
            {dashboardData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-dark-300 p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Calendar className="h-8 w-8 text-lime-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm text-text-muted text-text-muted truncate">
                          Lịch hẹn hôm nay
                        </dt>
                        <dd className="text-lg text-text-muted text-white">
                          {dashboardData.totalAppointmentsToday}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-300 p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm text-text-muted text-text-muted truncate">
                          Chờ xác nhận
                        </dt>
                        <dd className="text-lg text-text-muted text-white">
                          {dashboardData.pendingAppointments}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-300 p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm text-text-muted text-text-muted truncate">
                          Đang thực hiện
                        </dt>
                        <dd className="text-lg text-text-muted text-white">
                          {dashboardData.inProgressAppointments}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-300 p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm text-text-muted text-text-muted truncate">
                          Hoàn thành tuần này
                        </dt>
                        <dd className="text-lg text-text-muted text-white">
                          {dashboardData.completedThisWeek}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Appointments */}
            <div className="bg-dark-300 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 text-text-muted text-white">
                    Lịch hẹn cần xử lý
                  </h3>
                  <button
                    onClick={immediateFetchDashboard}
                    className="inline-flex items-center px-3 py-2 border border-dark-200 bg-dark-300 text-white shadow-sm text-sm leading-4 text-text-muted rounded-md text-text-secondary bg-dark-300 hover:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Làm mới
                  </button>
                </div>

                {!dashboardData ||
                !dashboardData.recentAppointments ||
                dashboardData.recentAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-text-muted" />
                    <h3 className="mt-2 text-sm text-text-muted text-white">
                      Không có lịch hẹn
                    </h3>
                    <p className="mt-1 text-sm text-text-muted">
                      Hiện tại không có lịch hẹn nào cần xử lý.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                      {(dashboardData.recentAppointments || []).map(
                        (appointment: any) => (
                          <li key={appointment._id} className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                  <div className="h-10 w-10 rounded-full bg-dark-300 flex items-center justify-center">
                                    <User className="h-6 w-6 text-text-secondary" />
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-text-muted text-white truncate">
                                    {appointment.customerId?.firstName}{" "}
                                    {appointment.customerId?.lastName}
                                  </p>
                                  <p className="text-sm text-text-muted">
                                    {appointment.vehicleId?.make}{" "}
                                    {appointment.vehicleId?.model} •{" "}
                                    {appointment.vehicleId?.licensePlate}
                                  </p>
                                  <p className="text-xs text-text-muted">
                                    {format(
                                      new Date(appointment.scheduledDateTime),
                                      "dd/MM/yyyy HH:mm"
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted ${getStatusColor(
                                    appointment.status
                                  )}`}
                                >
                                  {appointment.status}
                                </span>

                                {appointment.status === "pending" && (
                                  <button
                                    onClick={() =>
                                      handleConfirmAppointment(appointment._id)
                                    }
                                    disabled={actionLoading === appointment._id}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs text-text-muted rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-green-500 disabled:opacity-50"
                                  >
                                    {actionLoading === appointment._id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                      "Xác nhận"
                                    )}
                                  </button>
                                )}

                                {appointment.status === "confirmed" &&
                                  !appointment.assignedTechnician && (
                                    <div className="flex space-x-2">
                                      {assigningTechnician ===
                                      appointment._id ? (
                                        <div className="flex items-center space-x-2">
                                          <select
                                            className="text-xs border-dark-300 rounded"
                                            onChange={(e) =>
                                              handleAssignTechnician(
                                                appointment._id,
                                                e.target.value
                                              )
                                            }
                                          >
                                            <option value="">
                                              Chọn kỹ thuật viên
                                            </option>
                                            {(
                                              dashboardData?.availableTechnicians ||
                                              []
                                            ).map((tech: any) => (
                                              <option
                                                key={tech._id}
                                                value={tech._id}
                                              >
                                                {tech.firstName} {tech.lastName}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            onClick={() =>
                                              setAssigningTechnician(null)
                                            }
                                            className="text-text-muted hover:text-text-secondary"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() =>
                                              setAssigningTechnician(
                                                appointment._id
                                              )
                                            }
                                            className="inline-flex items-center px-2 py-1 border border-dark-300 shadow-sm text-xs text-text-muted rounded text-text-secondary bg-dark-300 hover:bg-dark-900"
                                          >
                                            <User className="h-3 w-3 mr-1" />
                                            Phân công
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleAutoAssign(appointment._id)
                                            }
                                            disabled={
                                              actionLoading === appointment._id
                                            }
                                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-dark-900 bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
                                          >
                                            {actionLoading ===
                                            appointment._id ? (
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-dark-900"></div>
                                            ) : (
                                              <>
                                                <Zap className="h-3 w-3 mr-1" />
                                                Tự động
                                              </>
                                            )}
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "customer-arrival" && (
          // Customer Arrival Tab Content
          <div className="bg-dark-300 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 text-text-muted text-white">
                  Lịch hẹn chờ khách đến
                </h3>
                <button
                  onClick={fetchAppointmentsNeedingArrival}
                  disabled={arrivalLoading}
                  className="inline-flex items-center px-3 py-2 border border-dark-200 bg-dark-300 text-white shadow-sm text-sm leading-4 text-text-muted rounded-md text-text-secondary bg-dark-300 hover:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Làm mới
                </button>
              </div>

              {arrivalLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-600 mx-auto"></div>
                  <p className="mt-4 text-sm text-text-muted">Đang tải...</p>
                </div>
              ) : !appointmentsNeedingArrival ||
                appointmentsNeedingArrival.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-12 w-12 text-text-muted" />
                  <h3 className="mt-2 text-sm text-text-muted text-white">
                    Không có lịch hẹn
                  </h3>
                  <p className="mt-1 text-sm text-text-muted">
                    Hiện tại không có lịch hẹn nào đang chờ khách đến.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <div className="mb-4 text-sm text-text-muted">
                    Tìm thấy {appointmentsNeedingArrival.length} lịch hẹn chờ
                    khách đến
                  </div>
                  <ul className="divide-y divide-gray-200">
                    {appointmentsNeedingArrival.map((appointment: any) => (
                      <li key={appointment._id} className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-dark-300 flex items-center justify-center">
                                <User className="h-6 w-6 text-text-secondary" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-text-muted text-white truncate">
                                {appointment.customerId?.firstName ||
                                  appointment.customer?.firstName}{" "}
                                {appointment.customerId?.lastName ||
                                  appointment.customer?.lastName}
                              </p>
                              <p className="text-sm text-text-muted">
                                {appointment.vehicleId?.make ||
                                  appointment.vehicle?.make}{" "}
                                {appointment.vehicleId?.model ||
                                  appointment.vehicle?.model}{" "}
                                •{" "}
                                {appointment.vehicleId?.licensePlate ||
                                  appointment.vehicle?.licensePlate}
                              </p>
                              <p className="text-xs text-text-muted">
                                Số lịch hẹn: {appointment.appointmentNumber}
                              </p>
                              <p className="text-xs text-text-muted">
                                {format(
                                  new Date(
                                    appointment.scheduledDate ||
                                      appointment.scheduledDateTime
                                  ),
                                  "dd/MM/yyyy HH:mm"
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted ${getStatusColor(
                                appointment.status
                              )}`}
                            >
                              {appointment.status === "confirmed"
                                ? "Đã xác nhận"
                                : appointment.status}
                            </span>

                            <button
                              onClick={() =>
                                handleCustomerArrival(appointment._id)
                              }
                              disabled={actionLoading === appointment._id}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs text-text-muted rounded text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500 disabled:opacity-50"
                            >
                              {actionLoading === appointment._id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Khách đã đến
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "reception-review" && (
          // Reception Review Tab Content
          <>
            {/* Conflict Alert Banner */}
            {conflictCount > 0 && (
              <div className="mb-6 bg-yellow-600 border border-yellow-500 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-100" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-100">
                      Có {conflictCount} xung đột phụ tùng cần giải quyết
                    </p>
                    <p className="text-xs text-yellow-200 mt-1">
                      Nhiều đơn hàng đang yêu cầu cùng một phụ tùng nhưng kho
                      không đủ
                    </p>
                  </div>
                </div>
                <Link
                  to="/part-conflicts"
                  className="px-4 py-2 bg-yellow-700 hover:bg-yellow-800 text-white rounded-md text-sm font-semibold transition-colors"
                >
                  Giải quyết ngay
                </Link>
              </div>
            )}

            <ServiceReceptionReview
              receptions={pendingReceptions}
              loading={receptionLoading}
              onReview={handleReceptionReview}
              onReceptionUpdated={fetchConflictStats}
            />
          </>
        )}

        {activeTab === "pending-payment" && (
          // Pending Payment Tab Content (NEW WORKFLOW)
          <div className="bg-dark-300 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 text-white">
                  Lịch hẹn chờ xác nhận thanh toán
                </h3>
                <button
                  onClick={fetchPendingPaymentAppointments}
                  disabled={pendingPaymentLoading}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs rounded text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500 disabled:opacity-50"
                >
                  {pendingPaymentLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Làm mới
                    </>
                  )}
                </button>
              </div>

              {pendingPaymentLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-600"></div>
                </div>
              ) : pendingPaymentAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-12 w-12 text-text-muted" />
                  <h3 className="mt-2 text-sm text-text-muted">
                    Không có lịch hẹn chờ thanh toán
                  </h3>
                  <p className="mt-1 text-sm text-text-muted">
                    Tất cả phiếu tiếp nhận đã được xử lý thanh toán
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <ul className="divide-y divide-dark-200">
                    {pendingPaymentAppointments.map((appointment: any) => (
                      <li key={appointment._id} className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-lime-600">
                                  <span className="text-xs text-dark-900 font-bold truncate px-1">
                                    #{appointment.appointmentNumber}
                                  </span>
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">
                                  {appointment.customerId?.firstName}{" "}
                                  {appointment.customerId?.lastName}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {appointment.vehicleId?.make}{" "}
                                  {appointment.vehicleId?.model} -{" "}
                                  {appointment.vehicleId?.licensePlate}
                                </p>
                                <p className="text-xs text-text-muted mt-1">
                                  <Clock className="inline h-3 w-3 mr-1" />
                                  {appointment.scheduledDate
                                    ? `${format(
                                        new Date(appointment.scheduledDate),
                                        "dd/MM/yyyy"
                                      )} ${appointment.scheduledTime || ""}`
                                    : "N/A"}
                                </p>
                                <p className="text-xs text-yellow-400 mt-1">
                                  Phiếu tiếp nhận đã được duyệt - Chờ xác nhận thanh toán
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <button
                              onClick={() => handleConfirmPayment(appointment._id)}
                              disabled={actionLoading === appointment._id}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded text-dark-900 bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
                            >
                              {actionLoading === appointment._id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-900"></div>
                              ) : (
                                <>
                                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  Xác nhận thanh toán
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "completed-approval" && (
          // Completed Approval Tab Content (NEW WORKFLOW)
          <div className="bg-dark-300 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 text-white">
                  Lịch hẹn chờ duyệt hoàn thành
                </h3>
                <button
                  onClick={fetchCompletedAppointments}
                  disabled={completedLoading}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs rounded text-white bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500 disabled:opacity-50"
                >
                  {completedLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Làm mới
                    </>
                  )}
                </button>
              </div>

              {completedLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-600"></div>
                </div>
              ) : completedAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-12 w-12 text-text-muted" />
                  <h3 className="mt-2 text-sm text-text-muted">
                    Không có lịch hẹn chờ duyệt hoàn thành
                  </h3>
                  <p className="mt-1 text-sm text-text-muted">
                    Tất cả dịch vụ đã được xác nhận hoàn thành
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <ul className="divide-y divide-dark-200">
                    {completedAppointments.map((appointment: any) => (
                      <li key={appointment._id} className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-green-600">
                                  <span className="text-xs text-white font-bold truncate px-1">
                                    #{appointment.appointmentNumber}
                                  </span>
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">
                                  {appointment.customerId?.firstName}{" "}
                                  {appointment.customerId?.lastName}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {appointment.vehicleId?.make}{" "}
                                  {appointment.vehicleId?.model} -{" "}
                                  {appointment.vehicleId?.licensePlate}
                                </p>
                                <p className="text-xs text-text-muted mt-1">
                                  <Clock className="inline h-3 w-3 mr-1" />
                                  {appointment.scheduledDate
                                    ? `${format(
                                        new Date(appointment.scheduledDate),
                                        "dd/MM/yyyy"
                                      )} ${appointment.scheduledTime || ""}`
                                    : "N/A"}
                                </p>
                                <p className="text-xs text-green-400 mt-1">
                                  Technician đã hoàn thành công việc
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <button
                              onClick={() => handleStaffFinalConfirm(appointment._id)}
                              disabled={actionLoading === appointment._id}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded text-dark-900 bg-lime-600 hover:bg-lime-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
                            >
                              {actionLoading === appointment._id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-900"></div>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Duyệt hoàn thành
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* NEW WORKFLOW: Reception Payment Modal */}
      {showReceptionPaymentModal && selectedAppointmentForPayment && (
        <ReceptionPaymentModal
          appointment={selectedAppointmentForPayment}
          serviceReception={selectedServiceReception}
          isOpen={showReceptionPaymentModal}
          onClose={() => setShowReceptionPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Custom Confirmation Modal for Final Approval */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full mx-4 border border-dark-600 shadow-xl">
            <h3 className="text-xl font-bold text-text-primary mb-4">
              Xác nhận dịch vụ đã hoàn thành?
            </h3>
            <p className="text-text-muted mb-6">
              Bạn có chắc chắn muốn xác nhận dịch vụ đã hoàn thành? Sau khi xác nhận,
              trạng thái sẽ chuyển sang "Đã xuất hóa đơn" và không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setAppointmentToConfirm(null);
                }}
                className="px-4 py-2 bg-dark-600 text-text-muted rounded-lg hover:bg-dark-500 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmFinalApproval}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
