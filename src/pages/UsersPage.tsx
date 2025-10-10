import React, { useState, useEffect } from "react";
import {
  UserIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  TruckIcon,
  CalendarIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { usersAPI, appointmentsAPI, vehiclesAPI } from "../services/api";
import toast from "react-hot-toast";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  // serviceCenterId removed - single center architecture
  code: string;
  specializations?: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    validUntil: string;
  }>;
  vehicleCount?: number;
  appointmentCount?: number;
}

interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  batteryType: string;
  color: string;
  isActive: boolean;
}

interface Appointment {
  _id: string;
  appointmentNumber: string;
  scheduledDate: string;
  status: string;
  services: Array<{
    serviceId: {
      name: string;
      category: string;
    };
  }>;
  totalCost: number;
}

type UserRole = "customer" | "staff" | "technician";

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [userAppointments, setUserAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [activeTab, setActiveTab] = useState<UserRole>("customer");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<
    "profile" | "vehicles" | "appointments" | "edit"
  >("profile");
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    role: "",
    isActive: true,
    // serviceCenterId removed - single center architecture
  });

  useEffect(() => {
    fetchUsers();
  }, [activeTab, searchTerm, filterStatus]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const filters: any = {
        role: activeTab,
      };

      if (searchTerm) {
        filters.search = searchTerm;
      }

      if (filterStatus !== "all") {
        filters.isActive = filterStatus === "active";
      }

      const response = await usersAPI.getAll(filters);

      // For customers, get additional stats
      if (activeTab === "customer") {
        const userData = response.data?.data || response.data || [];
        const usersWithStats = await Promise.all(
          (Array.isArray(userData) ? userData : []).map(async (user: User) => {
            try {
              // Get vehicle count
              const vehiclesResponse = await vehiclesAPI.getAll({
                customerId: user._id,
              });
              const vehicleCount = vehiclesResponse.data.count || 0;

              // Get appointment count
              const appointmentsResponse = await appointmentsAPI.getAll({
                customerId: user._id,
              });
              const appointmentCount = appointmentsResponse.data.count || 0;

              return {
                ...user,
                vehicleCount,
                appointmentCount,
              };
            } catch (error) {
              return {
                ...user,
                vehicleCount: 0,
                appointmentCount: 0,
              };
            }
          })
        );
        setUsers(usersWithStats);
      } else {
        setUsers(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (
    userId: string,
    type: "profile" | "vehicles" | "appointments"
  ) => {
    try {
      setLoading(true);

      if (type === "vehicles" && activeTab === "customer") {
        const response = await vehiclesAPI.getAll({ customerId: userId });
        setUserVehicles(response.data.data || []);
      } else if (type === "appointments" && activeTab === "customer") {
        const response = await appointmentsAPI.getAll({ customerId: userId });
        setUserAppointments(response.data.data || []);
      }

      setModalType(type);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await usersAPI.update(userId, { isActive: !currentStatus });
      toast.success(
        `User ${!currentStatus ? "activated" : "deactivated"} successfully`
      );
      fetchUsers();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update user status"
      );
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      // serviceCenterId removed - single center architecture
    });
    setModalType("edit");
    setShowModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await usersAPI.update(selectedUser._id, editFormData);
      toast.success("User updated successfully");
      setShowModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update user");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "staff":
        return "bg-blue-100 text-blue-800";
      case "technician":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!["staff", "admin"].includes(currentUser?.role || "")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">
            You need staff privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage customers, staff, and technicians
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("customer")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "customer"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-4 w-4" />
                  <span>Customers</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("staff")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "staff"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BuildingOfficeIcon className="h-4 w-4" />
                  <span>Staff</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("technician")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "technician"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <WrenchScrewdriverIcon className="h-4 w-4" />
                  <span>Technicians</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab}s...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="block border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}s (
              {users.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No {activeTab}s found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards View (hidden on lg screens) */}
              <div className="block lg:hidden space-y-4 p-4">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {user._id.slice(-8)}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center text-sm text-gray-900">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {user.phone}
                      </div>
                      {activeTab === "customer" && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-gray-500">
                            <TruckIcon className="h-4 w-4 mr-1 text-gray-400" />
                            <span>{user.vehicleCount || 0} vehicles</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                            <span>
                              {user.appointmentCount || 0} appointments
                            </span>
                          </div>
                        </div>
                      )}
                      {/* Service Center information removed - single center architecture */}
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Last Login:</span>{" "}
                        {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          fetchUserDetails(user._id, "profile");
                        }}
                        className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-900"
                        title="View Profile"
                      >
                        <EyeIcon className="h-3 w-3 mr-1" />
                        Profile
                      </button>
                      {activeTab === "customer" && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              fetchUserDetails(user._id, "vehicles");
                            }}
                            className="inline-flex items-center px-2 py-1 text-xs text-green-600 hover:text-green-900"
                            title="View Vehicles"
                          >
                            <TruckIcon className="h-3 w-3 mr-1" />
                            Vehicles
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              fetchUserDetails(user._id, "appointments");
                            }}
                            className="inline-flex items-center px-2 py-1 text-xs text-purple-600 hover:text-purple-900"
                            title="View Appointments"
                          >
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            Appointments
                          </button>
                        </>
                      )}
                      {currentUser?.role === "admin" && (
                        <button
                          onClick={() => handleEditUser(user)}
                          className="inline-flex items-center px-2 py-1 text-xs text-orange-600 hover:text-orange-900"
                          title="Edit User"
                        >
                          <PencilIcon className="h-3 w-3 mr-1" />
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() =>
                          toggleUserStatus(user._id, user.isActive)
                        }
                        className={`inline-flex items-center px-2 py-1 text-xs ${
                          user.isActive
                            ? "text-red-600 hover:text-red-900"
                            : "text-green-600 hover:text-green-900"
                        }`}
                        title={user.isActive ? "Deactivate" : "Activate"}
                      >
                        <PencilIcon className="h-3 w-3 mr-1" />
                        {user.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (hidden on mobile) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {activeTab}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      {activeTab === "customer" && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vehicles
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Appointments
                          </th>
                        </>
                      )}
                      {activeTab !== "customer" && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service Center
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <UserIcon className="h-5 w-5 text-gray-500" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {user._id.slice(-8)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-900">
                              <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
                              {user.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                              {user.phone}
                            </div>
                          </div>
                        </td>
                        {activeTab === "customer" && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <TruckIcon className="h-4 w-4 mr-1 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {user.vehicleCount || 0}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {user.appointmentCount || 0}
                                </span>
                              </div>
                            </td>
                          </>
                        )}
                        {/* Service Center column removed - single center architecture */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin
                            ? formatDate(user.lastLogin)
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                fetchUserDetails(user._id, "profile");
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Profile"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            {activeTab === "customer" && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    fetchUserDetails(user._id, "vehicles");
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                  title="View Vehicles"
                                >
                                  <TruckIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    fetchUserDetails(user._id, "appointments");
                                  }}
                                  className="text-purple-600 hover:text-purple-900"
                                  title="View Appointments"
                                >
                                  <CalendarIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {currentUser?.role === "admin" && (
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-orange-600 hover:text-orange-900"
                                title="Edit User"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() =>
                                toggleUserStatus(user._id, user.isActive)
                              }
                              className={`${
                                user.isActive
                                  ? "text-red-600 hover:text-red-900"
                                  : "text-green-600 hover:text-green-900"
                              }`}
                              title={user.isActive ? "Deactivate" : "Activate"}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal */}
        {showModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {modalType === "profile" &&
                      `${
                        activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
                      } Profile`}
                    {modalType === "vehicles" && "Customer Vehicles"}
                    {modalType === "appointments" && "Customer Appointments"}
                    {modalType === "edit" && "Edit User"}:{" "}
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {modalType === "profile" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          First Name
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedUser.firstName}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Last Name
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedUser.lastName}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedUser.email}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Phone
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedUser.phone}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <p className="mt-1">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                              selectedUser.role
                            )}`}
                          >
                            {selectedUser.role}
                          </span>
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <p className="mt-1">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              selectedUser.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {selectedUser.isActive ? "Active" : "Inactive"}
                          </span>
                        </p>
                      </div>
                      {/* Service Center information removed - single center architecture */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Member Since
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {formatDate(selectedUser.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {modalType === "edit" && (
                  <form onSubmit={handleUpdateUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          First Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editFormData.firstName}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              firstName: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Last Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editFormData.lastName}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              lastName: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Phone
                        </label>
                        <input
                          type="tel"
                          required
                          value={editFormData.phone}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              phone: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <select
                          value={editFormData.role}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              role: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="customer">Customer</option>
                          <option value="staff">Staff</option>
                          <option value="technician">Technician</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          value={editFormData.isActive.toString()}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              isActive: e.target.value === "true",
                            })
                          }
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Update User
                      </button>
                    </div>
                  </form>
                )}

                {modalType === "vehicles" && (
                  <div className="space-y-4">
                    {userVehicles.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        No vehicles registered
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userVehicles.map((vehicle) => (
                          <div
                            key={vehicle._id}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <h4 className="font-medium text-gray-900">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </h4>
                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                              <p>
                                <span className="font-medium">VIN:</span>{" "}
                                {vehicle.vin}
                              </p>
                              <p>
                                <span className="font-medium">Color:</span>{" "}
                                {vehicle.color}
                              </p>
                              <p>
                                <span className="font-medium">Battery:</span>{" "}
                                {vehicle.batteryType}
                              </p>
                              <p>
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    vehicle.isActive
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {vehicle.isActive ? "Active" : "Inactive"}
                                </span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {modalType === "appointments" && (
                  <div className="space-y-4">
                    {userAppointments.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        No appointments found
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {userAppointments.map((appointment) => (
                          <div
                            key={appointment._id}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">
                                #{appointment.appointmentNumber}
                              </h4>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  appointment.status
                                )}`}
                              >
                                {appointment.status}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>
                                <span className="font-medium">Date:</span>{" "}
                                {formatDate(appointment.scheduledDate)}
                              </p>
                              <p>
                                <span className="font-medium">Services:</span>{" "}
                                {appointment.services
                                  ?.map((s) => s.serviceId?.name || "Unknown")
                                  .filter(Boolean)
                                  .join(", ") || "No services"}
                              </p>
                              <p>
                                <span className="font-medium">Total:</span> $
                                {appointment.totalCost?.toFixed(2) || "N/A"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {modalType !== "edit" && (
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
