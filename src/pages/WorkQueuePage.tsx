import React, { useState, useEffect } from "react";
import {
  ClockIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import PartsSelection from "../components/Parts/PartsSelection";
import StatusActionButton from "../components/Common/StatusActionButton";
import ServiceReceptionModal from "../components/ServiceReception/ServiceReceptionModal";
import { DetailedAppointmentStatus } from "../types/appointment";

interface WorkQueueStats {
  pendingAppointments: number;
  inProgressAppointments: number;
  completedToday: number;
  averageCompletionTime: number;
}

interface Appointment {
  _id: string;
  appointmentNumber: string;
  customerId: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  vehicleId: {
    make: string;
    model: string;
    year: number;
    vin: string;
  };
  services: Array<{
    serviceId: {
      name: string;
      category: string;
      estimatedDuration: number;
    };
    quantity: number;
  }>;
  scheduledDate: string;
  scheduledTime: string;
  status: DetailedAppointmentStatus;
  priority: string;
  customerNotes?: string;
  serviceNotes: Array<{
    note: string;
    addedBy: {
      firstName: string;
      lastName: string;
    };
    addedAt: string;
  }>;
  checklistItems: Array<{
    _id: string;
    item: string;
    isCompleted: boolean;
    completedBy?: {
      firstName: string;
      lastName: string;
    };
    completedAt?: string;
    notes?: string;
  }>;
  estimatedCompletion?: string;
}

const WorkQueuePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<WorkQueueStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [activeTab, setActiveTab] = useState<
    "create_reception" | "in_progress" | "completed"
  >("create_reception");
  const [detailsTab, setDetailsTab] = useState<
    "overview" | "checklist" | "parts"
  >("overview");
  const [newNote, setNewNote] = useState("");
  const [showReceptionModal, setShowReceptionModal] = useState(false);
  const [creatingReception, setCreatingReception] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchWorkQueueData();
  }, [activeTab]);

  const fetchWorkQueueData = async () => {
    try {
      setLoading(true);

      // Fetch technician dashboard stats
      const statsResponse = await api.get("/api/dashboard/technician");
      setStats(statsResponse.data.data);

      // Fetch appointments based on active tab - filter by status for each workflow stage
      let statusFilter = "";

      switch (activeTab) {
        case "create_reception":
          // Tab 1: Tạo phiếu tiếp nhận - appointments chờ technician tạo reception
          statusFilter = "customer_arrived";
          break;
        case "start_work":
          // Tab 2: Bắt đầu làm việc - appointments đã được duyệt hoặc đang làm việc (đã thanh toán)
          // Include both "reception_approved" (approved but not paid yet) and "in_progress" (paid and work started)
          statusFilter = "reception_approved,in_progress";
          break;
        case "completed":
          // Tab 3: Hoàn thành - appointments đã hoàn thành
          statusFilter = "completed";
          break;
      }

      const queueResponse = await api.get("/api/appointments/work-queue", {
        params: {
          technicianId: user?._id,
          status: statusFilter,
          dateRange: "all",
          limit: 100,
        },
      });
      setAppointments(
        queueResponse.data.data?.appointments || queueResponse.data.data || []
      );
    } catch (error) {
      console.error("Error fetching work queue data:", error);
      toast.error("Failed to load work queue data");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    appointmentId: string,
    newStatus: DetailedAppointmentStatus
  ) => {
    try {
      await api.put(`/api/appointments/${appointmentId}`, {
        status: newStatus,
      });
      toast.success("Status updated successfully");
      fetchWorkQueueData();
      if (selectedAppointment && selectedAppointment._id === appointmentId) {
        setSelectedAppointment({ ...selectedAppointment, status: newStatus });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleStatusAction = async (action: string, appointmentId: string) => {
    const appointment =
      appointments.find((apt) => apt._id === appointmentId) ||
      selectedAppointment;
    if (!appointment) return;

    // Map action to status or handle special cases
    let newStatus: DetailedAppointmentStatus | null = null;

    switch (action) {
      case "confirm":
      case "confirm_appointment":
        newStatus = "confirmed";
        break;
      case "checkIn":
      case "mark_customer_arrived":
        newStatus = "customer_arrived";
        break;
      case "createReception":
      case "create_reception":
        if (appointment.status === "customer_arrived") {
          // Open the service reception modal instead of direct status change
          setSelectedAppointment(appointment);
          setShowReceptionModal(true);
          return;
        }
        newStatus = "reception_created";
        break;
      case "approveReception":
      case "approve_reception":
        newStatus = "reception_approved";
        break;
      case "startWork":
      case "start_work":
        newStatus = "in_progress";
        break;
      case "requestParts":
      case "request_parts":
        newStatus = "parts_requested";
        break;
      case "complete":
      case "complete_work":
        newStatus = "completed";
        break;
      case "invoice":
      case "generate_invoice":
        newStatus = "invoiced";
        break;
      case "cancel":
      case "cancel_appointment":
        // Handle cancellation with confirmation
        const confirmMessage = `Are you sure you want to cancel appointment #${appointment.appointmentNumber}?`;
        if (window.confirm(confirmMessage)) {
          newStatus = "cancelled";
        } else {
          return;
        }
        break;
      case "reschedule":
      case "reschedule_appointment":
        newStatus = "rescheduled";
        break;
      case "view_details":
      case "view_reception":
      case "send_reminder":
      case "contact_customer":
        // These are view/notification actions that don't change status
        console.log(
          `Handling view/action: ${action} for appointment ${appointmentId}`
        );
        return;
      default:
        // Only set as status if it's a valid status, otherwise log warning
        const validStatuses = [
          "pending",
          "confirmed",
          "customer_arrived",
          "reception_created",
          "reception_approved",
          "in_progress",
          "parts_insufficient",
          "parts_requested",
          "completed",
          "invoiced",
          "cancelled",
          "no_show",
          "rescheduled",
        ];
        if (validStatuses.includes(action)) {
          newStatus = action as DetailedAppointmentStatus;
        } else {
          console.warn(`Unknown action: ${action}. Ignoring status update.`);
          return;
        }
    }

    if (newStatus) {
      await handleStatusUpdate(appointmentId, newStatus);
    }
  };

  const handleCreateServiceReception = async (receptionData: any) => {
    if (!selectedAppointment) return;

    try {
      setCreatingReception(true);

      // NOTE: Initial booked service is already paid, not included in reception
      // Only send recommendedServices (discovered during inspection) and requestedParts
      const payload = {
        evChecklistItems: receptionData.evChecklistItems || [],
        recommendedServices: receptionData.recommendedServices || [],
        requestedParts: receptionData.requestedParts || [],
        vehicleCondition: receptionData.vehicleCondition,
        customerItems: receptionData.customerItems,
        preServicePhotos: [],
        diagnosticCodes: [],
        specialInstructions: receptionData.specialInstructions,
        estimatedServiceTime: receptionData.estimatedServiceTime,
      };

      console.log(
        "🔍 [handleCreateServiceReception] receptionData:",
        receptionData
      );
      console.log(
        "🔍 [handleCreateServiceReception] recommendedServices:",
        receptionData.recommendedServices
      );
      console.log(
        "🔍 [handleCreateServiceReception] recommendedServices.length:",
        receptionData.recommendedServices?.length
      );
      console.log("🔍 [handleCreateServiceReception] payload:", payload);

      const response = await api.post(
        `/api/service-receptions/${selectedAppointment._id}/create`,
        payload
      );

      if (response.data.success) {
        toast.success("Tạo phiếu tiếp nhận thành công!");
        setShowReceptionModal(false);
        setSelectedAppointment(null);
        fetchWorkQueueData();
      }
    } catch (error: any) {
      console.error("Error creating service reception:", error);
      toast.error(
        error.response?.data?.message || "Không thể tạo phiếu tiếp nhận"
      );
    } finally {
      setCreatingReception(false);
    }
  };

  const handleAddServiceNote = async (appointmentId: string) => {
    if (!newNote.trim()) return;

    try {
      await api.put(`/api/appointments/${appointmentId}`, {
        addServiceNote: newNote,
      });
      setNewNote("");
      toast.success("Service note added");
      fetchWorkQueueData();

      // Update selected appointment
      if (selectedAppointment && selectedAppointment._id === appointmentId) {
        const response = await api.get(`/api/appointments/${appointmentId}`);
        setSelectedAppointment(response.data.data);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to add service note"
      );
    }
  };

  const handleChecklistItemUpdate = async (
    appointmentId: string,
    itemId: string,
    isCompleted: boolean,
    notes?: string
  ) => {
    try {
      await api.put(`/api/appointments/${appointmentId}`, {
        updateChecklistItem: {
          itemId,
          isCompleted,
          notes,
        },
      });
      toast.success("Checklist updated");

      // Update selected appointment
      if (selectedAppointment && selectedAppointment._id === appointmentId) {
        const response = await api.get(`/api/appointments/${appointmentId}`);
        setSelectedAppointment(response.data.data);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update checklist"
      );
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "normal":
        return "bg-lime-100 text-lime-800";
      case "low":
        return "bg-dark-100 text-gray-800";
      default:
        return "bg-dark-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-lime-100 text-lime-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-dark-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Work Queue</h1>
          <p className="text-text-secondary mt-2">
            Manage your assigned appointments and work tasks
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-dark-300 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm text-text-muted text-text-muted truncate">
                        Pending
                      </dt>
                      <dd className="text-lg text-text-muted text-white">
                        {stats.pendingAppointments}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-dark-300 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <WrenchScrewdriverIcon className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm text-text-muted text-text-muted truncate">
                        In Progress
                      </dt>
                      <dd className="text-lg text-text-muted text-white">
                        {stats.inProgressAppointments}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-dark-300 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm text-text-muted text-text-muted truncate">
                        Completed Today
                      </dt>
                      <dd className="text-lg text-text-muted text-white">
                        {stats.completedToday}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-dark-300 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClipboardDocumentListIcon className="h-6 w-6 text-lime-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm text-text-muted text-text-muted truncate">
                        Avg. Time (hours)
                      </dt>
                      <dd className="text-lg text-text-muted text-white">
                        {stats.averageCompletionTime}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Appointments List */}
          <div className="lg:col-span-2">
            <div className="bg-dark-300 shadow rounded-lg">
              <div className="px-6 py-4 border-b border-dark-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    Appointments
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveTab("create_reception")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                        activeTab === "create_reception"
                          ? "bg-lime-600 text-dark-900"
                          : "bg-dark-200 text-text-secondary hover:bg-dark-100"
                      }`}
                    >
                      <ClipboardDocumentListIcon className="h-4 w-4" />
                      <span>Tạo phiếu tiếp nhận</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("in_progress")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                        activeTab === "in_progress"
                          ? "bg-lime-600 text-dark-900"
                          : "bg-dark-200 text-text-secondary hover:bg-dark-100"
                      }`}
                    >
                      <WrenchScrewdriverIcon className="h-4 w-4" />
                      <span>Đang thực hiện</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("completed")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                        activeTab === "completed"
                          ? "bg-lime-600 text-dark-900"
                          : "bg-dark-200 text-text-secondary hover:bg-dark-100"
                      }`}
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>Hoàn thành</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {appointments.length === 0 ? (
                  <div className="p-6 text-center">
                    <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-text-muted" />
                    <h3 className="mt-2 text-sm text-text-muted text-white">
                      No appointments
                    </h3>
                    <p className="mt-1 text-sm text-text-muted">
                      {activeTab === "create_reception"
                        ? "Không có lịch hẹn nào cần tạo phiếu tiếp nhận"
                        : activeTab === "in_progress"
                        ? "Không có lịch hẹn nào đang thực hiện"
                        : "Không có lịch hẹn nào đã hoàn thành"}
                    </p>
                  </div>
                ) : (
                  (() => {
                    // Status priority sorting
                    const statusPriority: Record<string, number> = {
                      customer_arrived: 1,
                      reception_created: 2,
                      reception_approved: 3,
                      in_progress: 4,
                      parts_requested: 5,
                      parts_insufficient: 5,
                      confirmed: 6,
                      pending: 7,
                      completed: 10,
                      invoiced: 11,
                      closed: 12,
                      cancelled: 13,
                      no_show: 13,
                      rescheduled: 8,
                    };

                    const sortedAppointments = [...appointments].sort(
                      (a, b) => {
                        const statusDiff =
                          (statusPriority[a.status] || 99) -
                          (statusPriority[b.status] || 99);
                        if (statusDiff !== 0) return statusDiff;
                        const dateA = new Date(a.scheduledDate).getTime();
                        const dateB = new Date(b.scheduledDate).getTime();
                        return dateA - dateB;
                      }
                    );

                    const paginatedAppointments = sortedAppointments.slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage
                    );

                    return paginatedAppointments.map((appointment) => (
                      <div
                        key={appointment._id}
                        className={`p-6 hover:bg-dark-900 cursor-pointer ${
                          selectedAppointment?._id === appointment._id
                            ? "bg-dark-900"
                            : ""
                        }`}
                        onClick={() => setSelectedAppointment(appointment)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-white">
                                  #{appointment.appointmentNumber}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs text-text-muted ${getPriorityColor(
                                    appointment.priority
                                  )}`}
                                >
                                  {appointment.priority}
                                </span>
                              </div>
                              <p className="text-sm text-text-secondary mt-1">
                                {appointment.customerId.firstName}{" "}
                                {appointment.customerId.lastName} •{" "}
                                {appointment.vehicleId.make}{" "}
                                {appointment.vehicleId.model}
                              </p>
                              <p className="text-sm text-text-muted">
                                {formatDate(appointment.scheduledDate)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs text-text-muted ${getStatusColor(
                                appointment.status
                              )}`}
                            >
                              {appointment.status.replace("_", " ")}
                            </span>
                            {appointment.priority === "urgent" && (
                              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        </div>

                        {/* Status Actions */}
                        <div className="mt-3">
                          <StatusActionButton
                            appointmentId={appointment._id}
                            currentStatus={appointment.status}
                            userRole="technician"
                            onAction={handleStatusAction}
                          />
                        </div>

                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {appointment.services?.map((service, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded text-xs bg-dark-300 text-text-secondary"
                              >
                                {service?.serviceId?.name || "Unknown Service"}
                                {(service?.quantity || 0) > 1 &&
                                  ` (${service.quantity})`}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>

              {/* Pagination */}
              {appointments.length > itemsPerPage && (
                <div className="flex items-center justify-between border-t border-dark-200 bg-dark-300 px-4 py-3 sm:px-6">
                  {/* Mobile pagination */}
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-dark-200 bg-dark-300 px-4 py-2 text-sm text-text-muted text-text-secondary hover:bg-dark-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage(
                          Math.min(
                            Math.ceil(appointments.length / itemsPerPage),
                            currentPage + 1
                          )
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(appointments.length / itemsPerPage)
                      }
                      className="relative ml-3 inline-flex items-center rounded-md border border-dark-200 bg-dark-300 px-4 py-2 text-sm text-text-muted text-text-secondary hover:bg-dark-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sau
                    </button>
                  </div>

                  {/* Desktop pagination */}
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-text-secondary">
                        Hiển thị{" "}
                        <span className="text-text-muted">
                          {(currentPage - 1) * itemsPerPage + 1}
                        </span>{" "}
                        đến{" "}
                        <span className="text-text-muted">
                          {Math.min(
                            currentPage * itemsPerPage,
                            appointments.length
                          )}
                        </span>{" "}
                        trong{" "}
                        <span className="text-text-muted">
                          {appointments.length}
                        </span>{" "}
                        công việc
                      </p>
                    </div>
                    <div>
                      <nav
                        className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-text-muted ring-1 ring-inset ring-gray-300 hover:bg-dark-900 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Trước</span>
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        {Array.from(
                          {
                            length: Math.ceil(
                              appointments.length / itemsPerPage
                            ),
                          },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                              currentPage === page
                                ? "z-10 bg-lime-200 text-dark-900 focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
                                : "text-white ring-1 ring-inset ring-gray-300 hover:bg-dark-900 focus:z-20 focus:outline-offset-0"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() =>
                            setCurrentPage(
                              Math.min(
                                Math.ceil(appointments.length / itemsPerPage),
                                currentPage + 1
                              )
                            )
                          }
                          disabled={
                            currentPage ===
                            Math.ceil(appointments.length / itemsPerPage)
                          }
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-text-muted ring-1 ring-inset ring-gray-300 hover:bg-dark-900 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Sau</span>
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Appointment Details */}
          <div>
            {selectedAppointment ? (
              <div className="bg-dark-300 shadow rounded-lg">
                <div className="px-6 py-4 border-b border-dark-200">
                  <h3 className="text-lg font-semibold text-white">
                    Appointment #{selectedAppointment.appointmentNumber}
                  </h3>

                  {/* Detail Tabs */}
                  <div className="mt-4 flex space-x-4">
                    <button
                      onClick={() => setDetailsTab("overview")}
                      className={`px-3 py-1 rounded-md text-sm text-text-muted ${
                        detailsTab === "overview"
                          ? "bg-lime-100 text-lime-700"
                          : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setDetailsTab("checklist")}
                      className={`px-3 py-1 rounded-md text-sm text-text-muted ${
                        detailsTab === "checklist"
                          ? "bg-lime-100 text-lime-700"
                          : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      Checklist
                    </button>
                    <button
                      onClick={() => setDetailsTab("parts")}
                      className={`px-3 py-1 rounded-md text-sm text-text-muted ${
                        detailsTab === "parts"
                          ? "bg-lime-100 text-lime-700"
                          : "text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      <CubeIcon className="w-4 h-4 inline mr-1" />
                      Parts
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Overview Tab */}
                  {detailsTab === "overview" && (
                    <div className="space-y-6">
                      {/* Customer & Vehicle Info */}
                      <div>
                        <h4 className="text-sm text-text-muted text-white mb-2">
                          Customer & Vehicle
                        </h4>
                        <div className="space-y-1 text-sm text-text-secondary">
                          <p>
                            <span className="text-text-muted">Customer:</span>{" "}
                            {selectedAppointment.customerId.firstName}{" "}
                            {selectedAppointment.customerId.lastName}
                          </p>
                          <p>
                            <span className="text-text-muted">Phone:</span>{" "}
                            {selectedAppointment.customerId.phone}
                          </p>
                          <p>
                            <span className="text-text-muted">Vehicle:</span>{" "}
                            {selectedAppointment.vehicleId.year}{" "}
                            {selectedAppointment.vehicleId.make}{" "}
                            {selectedAppointment.vehicleId.model}
                          </p>
                          <p>
                            <span className="text-text-muted">VIN:</span>{" "}
                            {selectedAppointment.vehicleId.vin}
                          </p>
                        </div>
                      </div>

                      {/* Services */}
                      <div>
                        <h4 className="text-sm text-text-muted text-white mb-2">
                          Services
                        </h4>
                        <div className="space-y-2">
                          {(selectedAppointment.services || []).map(
                            (service, index) => (
                              <div
                                key={index}
                                className="bg-dark-900 p-3 rounded-lg"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-text-muted text-white">
                                    {service?.serviceId?.name ||
                                      "Unknown Service"}
                                  </span>
                                  <span className="text-sm text-text-secondary">
                                    {service?.serviceId?.estimatedDuration || 0}{" "}
                                    mins
                                  </span>
                                </div>
                                <p className="text-sm text-text-secondary mt-1">
                                  Category:{" "}
                                  {service?.serviceId?.category || "Unknown"}
                                </p>
                                {service.quantity > 1 && (
                                  <p className="text-sm text-text-secondary">
                                    Quantity: {service.quantity}
                                  </p>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Status Actions */}
                      <div>
                        <h4 className="text-sm text-text-muted text-white mb-2">
                          Status Actions
                        </h4>
                        <StatusActionButton
                          appointmentId={selectedAppointment._id}
                          currentStatus={selectedAppointment.status}
                          userRole="technician"
                          onAction={handleStatusAction}
                        />
                      </div>

                      {/* Service Notes */}
                      <div>
                        <h4 className="text-sm text-text-muted text-white mb-2">
                          Service Notes
                        </h4>
                        <div className="space-y-2">
                          {(selectedAppointment.serviceNotes || []).map(
                            (note, index) => (
                              <div
                                key={index}
                                className="bg-dark-900 p-3 rounded text-sm"
                              >
                                <p className="text-white">{note.note}</p>
                                <p className="text-text-muted text-xs mt-1">
                                  By {note.addedBy.firstName}{" "}
                                  {note.addedBy.lastName} on{" "}
                                  {formatDate(note.addedAt)}
                                </p>
                              </div>
                            )
                          )}
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              placeholder="Add service note..."
                              className="flex-1 border border-dark-200 rounded-md px-3 py-1 text-sm"
                            />
                            <button
                              onClick={() =>
                                handleAddServiceNote(selectedAppointment._id)
                              }
                              className="px-3 py-1 bg-lime-200 text-dark-900 text-sm rounded hover:bg-lime-100 transition-all duration-200 transform hover:scale-105"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Checklist Tab */}
                  {detailsTab === "checklist" && (
                    <div className="space-y-4">
                      {selectedAppointment.checklistItems &&
                      selectedAppointment.checklistItems.length > 0 ? (
                        <div className="space-y-2">
                          {(selectedAppointment.checklistItems || []).map(
                            (item) => (
                              <div
                                key={item._id}
                                className="flex items-center space-x-2 p-3 bg-dark-900 rounded-lg"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.isCompleted}
                                  onChange={(e) =>
                                    handleChecklistItemUpdate(
                                      selectedAppointment._id,
                                      item._id,
                                      e.target.checked
                                    )
                                  }
                                  className="h-4 w-4 text-lime-600 focus:ring-lime-500 border-dark-200 rounded"
                                />
                                <span
                                  className={`text-sm flex-1 ${
                                    item.isCompleted
                                      ? "line-through text-text-muted"
                                      : "text-white"
                                  }`}
                                >
                                  {item.item}
                                </span>
                                {item.isCompleted && item.completedBy && (
                                  <span className="text-xs text-text-muted">
                                    by {item.completedBy.firstName}
                                  </span>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-text-muted">
                          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-text-secondary mb-4" />
                          <p className="text-white">
                            No checklist items for this appointment
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Parts Tab */}
                  {detailsTab === "parts" && (
                    <PartsSelection
                      appointmentId={selectedAppointment._id}
                      serviceCategories={
                        selectedAppointment.services
                          ?.map((s) => s?.serviceId?.category)
                          .filter(Boolean) || []
                      }
                      vehicleInfo={{
                        make: selectedAppointment.vehicleId.make,
                        model: selectedAppointment.vehicleId.model,
                        year: selectedAppointment.vehicleId.year,
                      }}
                      mode={
                        selectedAppointment.status === "in_progress"
                          ? "use"
                          : "reserve"
                      }
                      disabled={selectedAppointment.status === "completed"}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-dark-300 shadow rounded-lg p-6">
                <div className="text-center">
                  <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-text-muted" />
                  <h3 className="mt-2 text-sm text-text-muted text-white">
                    Select an appointment
                  </h3>
                  <p className="mt-1 text-sm text-text-muted">
                    Choose an appointment from the list to view details and take
                    actions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Reception Modal */}
      {showReceptionModal && selectedAppointment && (
        <ServiceReceptionModal
          appointment={selectedAppointment}
          isOpen={showReceptionModal}
          onClose={() => {
            setShowReceptionModal(false);
            setSelectedAppointment(null);
          }}
          onSubmit={handleCreateServiceReception}
          isLoading={creatingReception}
        />
      )}
    </div>
  );
};

export default WorkQueuePage;
