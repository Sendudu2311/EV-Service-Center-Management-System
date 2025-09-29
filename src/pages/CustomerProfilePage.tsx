import React, { useState, useEffect, useCallback } from 'react';
import {
  UserIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { appointmentsAPI, vehiclesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { formatVietnameseDateTime, formatVND } from '../utils/vietnamese';
import { appointmentStatusTranslations } from '../types/appointment';

interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  batteryType: string;
  batteryCapacity: number;
  chargingPort: string;
  maxChargingPower: number;
  color: string;
  isDefault: boolean;
  purchaseDate?: string;
  warrantyExpiry?: string;
  mileage?: number;
  lastServiceDate?: string;
}

interface CustomerAppointment {
  _id: string;
  appointmentNumber: string;
  vehicle: {
    make: string;
    model: string;
    licensePlate: string;
  };
  services: Array<{
    name: string;
    price: number;
  }>;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  priority: string;
  totalAmount: number;
  technician?: {
    name: string;
  };
  serviceCenter: {
    name: string;
    address: string;
  };
  createdAt: string;
  completedAt?: string;
}

interface CustomerStats {
  totalAppointments: number;
  completedAppointments: number;
  totalSpent: number;
  avgRating: number;
  lastServiceDate?: string;
  nextRecommendedService?: string;
}

const CustomerProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'vehicles' | 'history'>('profile');
  const [loading, setLoading] = useState(true);

  // Profile and stats
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);

  // Vehicles management
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    batteryType: '',
    batteryCapacity: 0,
    chargingPort: '',
    maxChargingPower: 0,
    color: '',
    isDefault: false
  });

  // Appointment history
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<CustomerAppointment | null>(null);
  const [appointmentFilters, setAppointmentFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    vehicleId: ''
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [updating, setUpdating] = useState(false);

  /**
   * Fetch customer statistics
   */
  const fetchCustomerStats = useCallback(async () => {
    try {
      const response = await appointmentsAPI.getCustomerStats();
      setCustomerStats(response.data.data);
    } catch (error: unknown) {
      console.error('Error fetching customer stats:', error);
      toast.error('Không thể tải thống kê khách hàng');
    }
  }, []);

  /**
   * Fetch customer vehicles
   */
  const fetchVehicles = useCallback(async () => {
    try {
      const response = await vehiclesAPI.getCustomerVehicles();
      setVehicles(response.data.data || []);
    } catch (error: unknown) {
      console.error('Error fetching vehicles:', error);
      toast.error('Không thể tải danh sách xe');
    }
  }, []);

  /**
   * Fetch appointment history
   */
  const fetchAppointments = useCallback(async () => {
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...appointmentFilters,
        customerOnly: true
      };

      const response = await appointmentsAPI.getCustomerAppointments(params);
      const data = response.data;

      setAppointments(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.totalPages || 1
      }));
    } catch (error: unknown) {
      console.error('Error fetching appointments:', error);
      toast.error('Không thể tải lịch sử lịch hẹn');
    }
  }, [pagination.page, pagination.limit, appointmentFilters]);

  /**
   * Add new vehicle
   */
  const addVehicle = useCallback(async () => {
    if (!vehicleForm.make || !vehicleForm.model || !vehicleForm.licensePlate) {
      toast.error('Vui lòng điền đầy đủ thông tin xe');
      return;
    }

    try {
      setUpdating(true);
      await vehiclesAPI.create(vehicleForm);

      toast.success('Đã thêm xe thành công');
      setShowAddVehicle(false);
      setVehicleForm({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        licensePlate: '',
        batteryType: '',
        batteryCapacity: 0,
        chargingPort: '',
        maxChargingPower: 0,
        color: '',
        isDefault: false
      });
      fetchVehicles();
    } catch (error: unknown) {
      console.error('Error adding vehicle:', error);
      toast.error('Không thể thêm xe');
    } finally {
      setUpdating(false);
    }
  }, [vehicleForm, fetchVehicles]);

  /**
   * Update vehicle
   */
  const updateVehicle = useCallback(async () => {
    if (!editingVehicle || !vehicleForm.make || !vehicleForm.model || !vehicleForm.licensePlate) {
      toast.error('Vui lòng điền đầy đủ thông tin xe');
      return;
    }

    try {
      setUpdating(true);
      await vehiclesAPI.update(editingVehicle._id, vehicleForm);

      toast.success('Đã cập nhật thông tin xe thành công');
      setEditingVehicle(null);
      setVehicleForm({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        licensePlate: '',
        batteryType: '',
        batteryCapacity: 0,
        chargingPort: '',
        maxChargingPower: 0,
        color: '',
        isDefault: false
      });
      fetchVehicles();
    } catch (error: unknown) {
      console.error('Error updating vehicle:', error);
      toast.error('Không thể cập nhật thông tin xe');
    } finally {
      setUpdating(false);
    }
  }, [editingVehicle, vehicleForm, fetchVehicles]);

  /**
   * Delete vehicle
   */
  const deleteVehicle = useCallback(async (vehicleId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa xe này?')) {
      return;
    }

    try {
      setUpdating(true);
      await vehiclesAPI.delete(vehicleId);

      toast.success('Đã xóa xe thành công');
      fetchVehicles();
    } catch (error: unknown) {
      console.error('Error deleting vehicle:', error);
      toast.error('Không thể xóa xe');
    } finally {
      setUpdating(false);
    }
  }, [fetchVehicles]);

  /**
   * Set default vehicle
   */
  const setDefaultVehicle = useCallback(async (vehicleId: string) => {
    try {
      setUpdating(true);
      await vehiclesAPI.setDefault(vehicleId);

      toast.success('Đã đặt xe mặc định thành công');
      fetchVehicles();
    } catch (error: unknown) {
      console.error('Error setting default vehicle:', error);
      toast.error('Không thể đặt xe mặc định');
    } finally {
      setUpdating(false);
    }
  }, [fetchVehicles]);

  /**
   * Cancel appointment
   */
  const cancelAppointment = useCallback(async (appointmentId: string, reason: string) => {
    try {
      setUpdating(true);
      await appointmentsAPI.customerCancel(appointmentId, {
        reason,
        reasonCategory: 'customer_request'
      });

      toast.success('Đã hủy lịch hẹn thành công');
      fetchAppointments();
    } catch (error: unknown) {
      console.error('Error cancelling appointment:', error);
      toast.error('Không thể hủy lịch hẹn');
    } finally {
      setUpdating(false);
    }
  }, [fetchAppointments]);

  // Effects
  useEffect(() => {
    if (user?.role === 'customer') {
      setLoading(true);
      Promise.all([
        fetchCustomerStats(),
        fetchVehicles(),
        fetchAppointments()
      ]).finally(() => setLoading(false));
    }
  }, [user, fetchCustomerStats, fetchVehicles, fetchAppointments]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canCancelAppointment = (appointment: CustomerAppointment) => {
    const appointmentDate = new Date(`${appointment.scheduledDate}T${appointment.scheduledTime}`);
    const now = new Date();
    const hoursDiff = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return ['pending', 'confirmed'].includes(appointment.status) && hoursDiff > 24;
  };

  if (user?.role !== 'customer') {
    return (
      <div className="text-center py-12">
        <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-500">Trang này chỉ dành cho khách hàng.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Đang tải thông tin hồ sơ...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserIcon className="h-12 w-12 text-gray-400" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-gray-500">{user?.email}</p>
              <p className="text-gray-500">{user?.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {customerStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tổng lịch hẹn</p>
                <p className="text-2xl font-bold text-gray-900">{customerStats.totalAppointments}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Đã hoàn thành</p>
                <p className="text-2xl font-bold text-gray-900">{customerStats.completedAppointments}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TruckIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tổng chi tiêu</p>
                <p className="text-2xl font-bold text-gray-900">{formatVND(customerStats.totalSpent)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Đánh giá TB</p>
                <p className="text-2xl font-bold text-gray-900">{(customerStats.avgRating || 0).toFixed(1)}/5</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {[
              { id: 'profile', label: 'Thông tin cá nhân', icon: UserIcon },
              { id: 'vehicles', label: `Xe của tôi (${vehicles.length})`, icon: TruckIcon },
              { id: 'history', label: `Lịch sử dịch vụ (${appointments.length})`, icon: ClipboardDocumentListIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin liên hệ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.address || 'Chưa cập nhật'}</p>
                  </div>
                </div>
              </div>

              {customerStats && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin dịch vụ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Lần bảo dưỡng gần nhất</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {customerStats.lastServiceDate ? formatVietnameseDateTime(customerStats.lastServiceDate) : 'Chưa có'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Dịch vụ khuyến nghị tiếp theo</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {customerStats.nextRecommendedService || 'Chưa có khuyến nghị'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vehicles Tab */}
          {activeTab === 'vehicles' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Danh sách xe</h3>
                <button
                  onClick={() => setShowAddVehicle(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Thêm xe
                </button>
              </div>

              {/* Add/Edit Vehicle Form */}
              {(showAddVehicle || editingVehicle) && (
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-4">
                    {editingVehicle ? 'Chỉnh sửa thông tin xe' : 'Thêm xe mới'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hãng xe</label>
                      <input
                        type="text"
                        value={vehicleForm.make}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="VinFast, Tesla, ..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mẫu xe</label>
                      <input
                        type="text"
                        value={vehicleForm.model}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="VF8, Model 3, ..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Năm sản xuất</label>
                      <input
                        type="number"
                        value={vehicleForm.year}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, year: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        min="2000"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Biển số xe</label>
                      <input
                        type="text"
                        value={vehicleForm.licensePlate}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value.toUpperCase() })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="30A-12345"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loại pin</label>
                      <select
                        value={vehicleForm.batteryType}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, batteryType: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Chọn loại pin</option>
                        <option value="LiFePO4">LiFePO4</option>
                        <option value="Li-ion">Li-ion</option>
                        <option value="NMC">NMC</option>
                        <option value="LTO">LTO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dung lượng pin (kWh)</label>
                      <input
                        type="number"
                        value={vehicleForm.batteryCapacity}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, batteryCapacity: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cổng sạc</label>
                      <select
                        value={vehicleForm.chargingPort}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, chargingPort: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Chọn cổng sạc</option>
                        <option value="CCS2">CCS2</option>
                        <option value="CHAdeMO">CHAdeMO</option>
                        <option value="Type2">Type 2</option>
                        <option value="Tesla">Tesla Supercharger</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Công suất sạc tối đa (kW)</label>
                      <input
                        type="number"
                        value={vehicleForm.maxChargingPower}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, maxChargingPower: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Màu sắc</label>
                      <input
                        type="text"
                        value={vehicleForm.color}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="Đen, Trắng, Xanh, ..."
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={vehicleForm.isDefault || false}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, isDefault: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-2"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Đặt làm xe mặc định
                      </label>
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <button
                      onClick={editingVehicle ? updateVehicle : addVehicle}
                      disabled={updating}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updating ? 'Đang lưu...' : (editingVehicle ? 'Cập nhật' : 'Thêm xe')}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddVehicle(false);
                        setEditingVehicle(null);
                        setVehicleForm({
                          make: '',
                          model: '',
                          year: new Date().getFullYear(),
                          licensePlate: '',
                          batteryType: '',
                          batteryCapacity: 0,
                          chargingPort: '',
                          maxChargingPower: 0,
                          color: '',
                          isDefault: false
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* Vehicles List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {vehicles.map((vehicle) => (
                  <div key={vehicle._id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">
                            {vehicle.make} {vehicle.model} ({vehicle.year})
                          </h4>
                          {vehicle.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Mặc định
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          <span className="font-medium">Biển số:</span> {vehicle.licensePlate}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <p><span className="font-medium">Pin:</span> {vehicle.batteryType} - {vehicle.batteryCapacity}kWh</p>
                          <p><span className="font-medium">Cổng sạc:</span> {vehicle.chargingPort}</p>
                          <p><span className="font-medium">Công suất sạc:</span> {vehicle.maxChargingPower}kW</p>
                          <p><span className="font-medium">Màu:</span> {vehicle.color}</p>
                        </div>
                        {vehicle.lastServiceDate && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Bảo dưỡng gần nhất:</span> {formatVietnameseDateTime(vehicle.lastServiceDate)}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        {!vehicle.isDefault && (
                          <button
                            onClick={() => setDefaultVehicle(vehicle._id)}
                            disabled={updating}
                            className="p-2 text-gray-400 hover:text-blue-500 disabled:opacity-50"
                            title="Đặt làm mặc định"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingVehicle(vehicle);
                            setVehicleForm(vehicle);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-500"
                          title="Chỉnh sửa"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteVehicle(vehicle._id)}
                          disabled={updating || vehicle.isDefault}
                          className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
                          title="Xóa"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {vehicles.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-gray-500">
                    <TruckIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Chưa có xe nào được thêm.</p>
                    <p className="text-sm">Hãy thêm xe để đặt lịch dịch vụ.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Lịch sử dịch vụ</h3>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select
                    value={appointmentFilters.status}
                    onChange={(e) => setAppointmentFilters({ ...appointmentFilters, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="in_progress">Đang thực hiện</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Xe</label>
                  <select
                    value={appointmentFilters.vehicleId}
                    onChange={(e) => setAppointmentFilters({ ...appointmentFilters, vehicleId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Tất cả xe</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle._id} value={vehicle._id}>
                        {vehicle.licensePlate} - {vehicle.make} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                  <input
                    type="date"
                    value={appointmentFilters.dateFrom}
                    onChange={(e) => setAppointmentFilters({ ...appointmentFilters, dateFrom: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                  <input
                    type="date"
                    value={appointmentFilters.dateTo}
                    onChange={(e) => setAppointmentFilters({ ...appointmentFilters, dateTo: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Appointments List */}
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div key={appointment._id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <h4 className="text-lg font-medium text-gray-900">
                            #{appointment.appointmentNumber}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointmentStatusTranslations[appointment.status as keyof typeof appointmentStatusTranslations]}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Xe:</span> {appointment.vehicle.make} {appointment.vehicle.model} ({appointment.vehicle.licensePlate})
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Thời gian:</span> {formatVietnameseDateTime(appointment.scheduledDate, appointment.scheduledTime)}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Trung tâm:</span> {appointment.serviceCenter.name}
                            </p>
                            {appointment.technician && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Kỹ thuật viên:</span> {appointment.technician.name}
                              </p>
                            )}
                          </div>
                          <div>
                            <div className="mb-2">
                              <p className="text-sm font-medium text-gray-600 mb-1">Dịch vụ:</p>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {appointment.services.map((service, index) => (
                                  <li key={index}>• {service.name} - {formatVND(service.price)}</li>
                                ))}
                              </ul>
                            </div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Tổng tiền:</span> <span className="font-semibold text-green-600">{formatVND(appointment.totalAmount)}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Đặt lúc:</span> {formatVietnameseDateTime(appointment.createdAt)}
                            </p>
                            {appointment.completedAt && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Hoàn thành:</span> {formatVietnameseDateTime(appointment.completedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => setSelectedAppointment(appointment)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-1 inline" />
                          Chi tiết
                        </button>
                        {canCancelAppointment(appointment) && (
                          <button
                            onClick={() => cancelAppointment(appointment._id, 'Khách hàng yêu cầu hủy')}
                            disabled={updating}
                            className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircleIcon className="h-4 w-4 mr-1 inline" />
                            Hủy lịch
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {appointments.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Chưa có lịch hẹn nào.</p>
                    <p className="text-sm">Hãy đặt lịch dịch vụ để bắt đầu sử dụng.</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Hiển thị {appointments.length} trong tổng số {pagination.total} lịch hẹn
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <span className="px-3 py-2 text-sm text-gray-700">
                      Trang {pagination.page}/{pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Chi tiết lịch hẹn #{selectedAppointment.appointmentNumber}
                </h3>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Xe:</span> {selectedAppointment.vehicle.make} {selectedAppointment.vehicle.model}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Biển số:</span> {selectedAppointment.vehicle.licensePlate}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Thời gian:</span> {formatVietnameseDateTime(selectedAppointment.scheduledDate, selectedAppointment.scheduledTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Trạng thái:</span>
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                          {appointmentStatusTranslations[selectedAppointment.status as keyof typeof appointmentStatusTranslations]}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Trung tâm:</span> {selectedAppointment.serviceCenter.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Địa chỉ:</span> {selectedAppointment.serviceCenter.address}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Dịch vụ</h4>
                  <div className="space-y-2">
                    {selectedAppointment.services.map((service, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded">
                        <span className="text-sm text-gray-900">{service.name}</span>
                        <span className="text-sm font-medium text-gray-900">{formatVND(service.price)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded font-medium">
                      <span className="text-sm text-gray-900">Tổng cộng</span>
                      <span className="text-sm text-green-600">{formatVND(selectedAppointment.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                {selectedAppointment.technician && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Kỹ thuật viên</h4>
                    <p className="text-sm text-gray-600">{selectedAppointment.technician.name}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Đóng
                </button>
                {canCancelAppointment(selectedAppointment) && (
                  <button
                    onClick={() => {
                      cancelAppointment(selectedAppointment._id, 'Khách hàng yêu cầu hủy');
                      setSelectedAppointment(null);
                    }}
                    disabled={updating}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircleIcon className="h-4 w-4 mr-1 inline" />
                    Hủy lịch hẹn
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfilePage;