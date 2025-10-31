import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  TruckIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { dashboardAPI, reportsAPI, servicesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { formatVND } from '../../utils/vietnamese';
import { format } from 'date-fns';
import AdminAppointmentModal from './AdminAppointmentModal';

type TabType = 'overview' | 'analytics';
type DetailModalType = 'users' | 'customers' | 'revenue' | 'invoices' | 'vehicles' | 'appointments' | 'parts' | null;

interface DetailModalData {
  users?: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
  customers?: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
  revenue?: Array<{
    _id: string;
    appointmentNumber: string;
    customer: { firstName: string; lastName: string };
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
  invoices?: Array<{
    _id: string;
    invoiceNumber: string;
    appointmentNumber: string;
    customer: { firstName: string; lastName: string };
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
  vehicles?: Array<{
    _id: string;
    make: string;
    model: string;
    licensePlate: string;
    owner: { firstName: string; lastName: string };
    createdAt: string;
  }>;
  appointments?: Array<{
    _id: string;
    appointmentNumber: string;
    customer: { firstName: string; lastName: string };
    vehicle: { make: string; model: string };
    status: string;
    scheduledDate: string;
  }>;
}

interface DashboardData {
  stats: {
    totalUsers: number;
    totalRevenue: number;
    monthlyRevenue: number;
    totalVehicles: number;
    totalAppointments: number;
    completedAppointments: number;
    userBreakdown: {
      customers: number;
      staff: number;
      technicians: number;
    };
  };
  revenueData: Array<{
    month: string;
    appointments: number;
    revenue: number;
  }>;
  serviceDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  recentActivity: Array<{
    _id: string;
    appointmentId?: string;
    type: string;
    message: string;
    time: string;
    appointmentNumber: string;
  }>;
  top10?: {
    customers: Array<{
      _id: string;
      name: string;
      email: string;
      totalSpent: number;
      appointmentCount: number;
    }>;
    services: Array<{
      _id: string;
      name: string;
      category: string;
      bookingCount: number;
      revenue: number;
    }>;
    vehicles: Array<{
      _id: string;
      vehicleInfo: string;
      owner: string;
      serviceCount: number;
      lastService: string;
    }>;
    parts: Array<{
      _id: string;
      partNumber: string;
      name: string;
      category: string;
      usedStock: number;
      currentStock: number;
      retailPrice: number;
    }>;
  };
}

interface AnalyticsData {
  stats: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    pendingAppointments: number;
    totalRevenue: number;
    averageRevenue: number;
    completionRate: number;
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    paymentCollectionRate: number;
    uniqueCustomers: number;
    customerRetentionRate: number;
    totalAppointmentsCount: number;
    completedAndInvoicedCount: number;
  };
  charts: {
    appointmentsTrend: Array<{
      month: string;
      appointments: number;
      completed: number;
      cancelled: number;
    }>;
    revenueTrend: Array<{ month: string; revenue: number; transactions: number }>;
    serviceDistribution: Array<{ name: string; value: number; color: string }>;
    appointmentStatus: Array<{ status: string; count: number; color: string }>;
    technicianPerformance: Array<{
      name: string;
      appointments: number;
      completed: number;
      efficiency: number;
      rating: number;
    }>;
  };
}

interface KPIData {
  revenueKPI: { value: number; target: number; unit: string; trend: string };
  appointmentKPI: { value: number; target: number; unit: string; trend: string };
  customerKPI: { value: number; target: number; unit: string; trend: string };
  vehicleKPI: { value: number; target: number; unit: string; trend: string };
  invoiceCollectionRate: {
    value: number;
    total: number;
    percentage: number;
    unit: string;
    trend: string;
  };
}

const EnhancedAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'1month' | '3months' | '6months' | '1year'>('1month');
  const [modalType, setModalType] = useState<DetailModalType>(null);
  const [modalData, setModalData] = useState<DetailModalData>({});
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchDashboardData();
    } else {
      fetchAnalyticsData();
    }
  }, [activeTab, period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getStats('admin');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, kpisRes] = await Promise.all([
        reportsAPI.getAnalytics({ period }),
        reportsAPI.getKPI(),
      ]);

      if (analyticsRes?.data?.success && analyticsRes.data.data) {
        setAnalyticsData(analyticsRes.data.data as AnalyticsData);
      }
      if (kpisRes?.data?.success && kpisRes.data.data) {
        setKpis(kpisRes.data.data as KPIData);
      }
    } catch (error: any) {
      toast.error('Failed to load analytics data');
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const openDetailModal = async (type: Exclude<DetailModalType, null>) => {
    setModalType(type);
    setModalLoading(true);

    try {
      const response = await dashboardAPI.getDetails(type);
      setModalData({ [type]: response.data.data });
    } catch (error) {
      console.error(`Error fetching ${type} details:`, error);
      toast.error(`Failed to load ${type} details`);
      setModalType(null);
    } finally {
      setModalLoading(false);
    }
  };

  const closeDetailModal = () => {
    setModalType(null);
    setModalData({});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-2 text-text-secondary">
            Comprehensive system overview and analytics
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-dark-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'border-lime-400 text-lime-200'
                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border-dark-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="h-5 w-5" />
                  <span>Overview</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                  activeTab === 'analytics'
                    ? 'border-lime-400 text-lime-200'
                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border-dark-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <DocumentChartBarIcon className="h-5 w-5" />
                  <span>Analytics & Reports</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && dashboardData && (
          <OverviewTab
            data={dashboardData}
            formatNumber={formatNumber}
            onCardClick={openDetailModal}
            onAppointmentClick={setSelectedAppointmentId}
          />
        )}

        {activeTab === 'analytics' && analyticsData && kpis && (
          <AnalyticsTab
            analyticsData={analyticsData}
            kpis={kpis}
            period={period}
            setPeriod={setPeriod}
            formatNumber={formatNumber}
            onCardClick={openDetailModal}
          />
        )}

        {/* Detail Modal */}
        {modalType && (
          <DetailModal
            type={modalType}
            data={modalData}
            loading={modalLoading}
            onClose={closeDetailModal}
          />
        )}

        {/* Appointment Detail Modal */}
        {selectedAppointmentId && (
          <AdminAppointmentModal
            appointmentId={selectedAppointmentId}
            onClose={() => setSelectedAppointmentId(null)}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component - Simplified to show only Top 10 and Recent Activity
const OverviewTab: React.FC<{
  data: DashboardData;
  formatNumber: (num: number) => string;
  onCardClick: (type: Exclude<DetailModalType, null>) => void;
  onAppointmentClick: (appointmentId: string) => void;
}> = ({ data, onAppointmentClick }) => {
  const [activityPage, setActivityPage] = React.useState(0);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(data.recentActivity.length / itemsPerPage);
  const startIdx = activityPage * itemsPerPage;
  const paginatedActivity = data.recentActivity.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Recent Activity */}
      <div className="bg-dark-300 shadow rounded-lg border border-dark-200">
        <div className="px-4 py-5 sm:px-6 border-b border-dark-200">
          <h3 className="text-lg font-medium text-white">Recent Activity</h3>
          <p className="mt-1 text-sm text-text-muted">Latest system activities</p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <ul className="space-y-3">
            {paginatedActivity.map((activity) => (
              <li
                key={activity._id}
                className="flex items-center justify-between py-3 px-4 bg-dark-900 rounded-lg hover:bg-dark-800 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm text-white">{activity.message}</p>
                  <div className="flex items-center mt-1 space-x-3">
                    <p className="text-xs text-text-muted">{activity.time}</p>
                    {activity.appointmentNumber && (
                      <span className="text-xs text-lime-400">
                        #{activity.appointmentNumber}
                      </span>
                    )}
                  </div>
                </div>
                {activity.appointmentNumber && (
                  <button
                    onClick={() => {
                      // Open modal with appointment details
                      if (activity.appointmentId || activity._id) {
                        onAppointmentClick(activity.appointmentId || activity._id);
                      }
                    }}
                    className="ml-4 px-3 py-1 text-xs bg-lime-600 hover:bg-lime-700 text-dark-900 rounded transition-colors"
                  >
                    View Detail
                  </button>
                )}
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-dark-200">
              <button
                onClick={() => setActivityPage(Math.max(0, activityPage - 1))}
                disabled={activityPage === 0}
                className="px-3 py-1 text-sm bg-dark-900 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-800 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-text-muted">
                Page {activityPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setActivityPage(Math.min(totalPages - 1, activityPage + 1))}
                disabled={activityPage === totalPages - 1}
                className="px-3 py-1 text-sm bg-dark-900 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-800 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top 10 Sections - New Layout: Customer & Vehicle (top), Service & Part (bottom) */}
      {data.top10 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top 10 Customers */}
          <div className="bg-dark-300 shadow rounded-lg border border-dark-200">
            <div className="px-4 py-5 sm:px-6 border-b border-dark-200">
              <h3 className="text-lg font-medium text-white">Top 10 Customers</h3>
              <p className="mt-1 text-sm text-text-muted">By total revenue generated</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-200">
                <thead className="bg-dark-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Customer</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Visits</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-200">
                  {data.top10.customers.map((customer, idx) => (
                    <tr key={customer._id} className="hover:bg-dark-900">
                      <td className="px-4 py-3 text-sm text-lime-400 font-semibold">#{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">{customer.name}</div>
                        <div className="text-xs text-text-muted">{customer.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white text-right">{customer.appointmentCount}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-lime-400 text-right">
                        {formatVND(customer.totalSpent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top 10 Vehicles */}
          <div className="bg-dark-300 shadow rounded-lg border border-dark-200">
            <div className="px-4 py-5 sm:px-6 border-b border-dark-200">
              <h3 className="text-lg font-medium text-white">Top 10 Vehicles</h3>
              <p className="mt-1 text-sm text-text-muted">Most serviced vehicles</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-200">
                <thead className="bg-dark-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Vehicle</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Services</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Last Service</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-200">
                  {data.top10.vehicles.map((vehicle, idx) => (
                    <tr key={vehicle._id} className="hover:bg-dark-900">
                      <td className="px-4 py-3 text-sm text-lime-400 font-semibold">#{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">{vehicle.vehicleInfo}</div>
                        <div className="text-xs text-text-muted">{vehicle.owner}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white text-right">{vehicle.serviceCount}</td>
                      <td className="px-4 py-3 text-sm text-text-muted text-right">
                        {format(new Date(vehicle.lastService), 'MMM dd, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top 10 Services */}
          <div className="bg-dark-300 shadow rounded-lg border border-dark-200">
            <div className="px-4 py-5 sm:px-6 border-b border-dark-200">
              <h3 className="text-lg font-medium text-white">Top 10 Services</h3>
              <p className="mt-1 text-sm text-text-muted">Most booked services</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-200">
                <thead className="bg-dark-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Service</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Bookings</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-200">
                  {data.top10.services.map((service, idx) => (
                    <tr key={service._id} className="hover:bg-dark-900">
                      <td className="px-4 py-3 text-sm text-lime-400 font-semibold">#{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">{service.name}</div>
                        <div className="text-xs text-text-muted">{service.category}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white text-right">{service.bookingCount}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-lime-400 text-right">
                        {formatVND(service.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top 10 Parts */}
          <div className="bg-dark-300 shadow rounded-lg border border-dark-200">
            <div className="px-4 py-5 sm:px-6 border-b border-dark-200">
              <h3 className="text-lg font-medium text-white">Top 10 Parts</h3>
              <p className="mt-1 text-sm text-text-muted">Most used parts</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-200">
                <thead className="bg-dark-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Part</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Used</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-200">
                  {data.top10.parts &&
                    data.top10.parts.map((part: any, idx: number) => (
                      <tr key={part._id} className="hover:bg-dark-900">
                        <td className="px-4 py-3 text-sm text-lime-400 font-semibold">#{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-white">{part.name}</div>
                          <div className="text-xs text-text-muted">{part.partNumber}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-white text-right">{part.usedStock}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-lime-400 text-right">
                          {part.currentStock}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Analytics Tab Component - with clickable KPI cards
const AnalyticsTab: React.FC<{
  analyticsData: AnalyticsData;
  kpis: KPIData;
  period: string;
  setPeriod: (period: '1month' | '3months' | '6months' | '1year') => void;
  formatNumber: (num: number) => string;
  onCardClick: (type: Exclude<DetailModalType, null>) => void;
}> = ({ analyticsData, kpis, period, setPeriod, formatNumber, onCardClick }) => {
  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end gap-2">
        {(['1month', '3months', '6months', '1year'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              period === p
                ? 'bg-lime-200 text-dark-900 font-medium'
                : 'bg-dark-300 text-text-secondary border border-dark-200 hover:border-lime-400'
            }`}
          >
            {p === '1month' && '1 Month'}
            {p === '3months' && '3 Months'}
            {p === '6months' && '6 Months'}
            {p === '1year' && '1 Year'}
          </button>
        ))}
      </div>

      {/* Stats Summary - Main KPI Cards - 2 Rows x 4 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Row 1 */}
        <div
          onClick={() => onCardClick('revenue')}
          className="bg-dark-300 rounded-lg shadow p-8 border-2 border-lime-600 cursor-pointer hover:border-lime-400 transition-colors"
        >
          <p className="text-sm text-text-secondary uppercase tracking-wider">Total Revenue</p>
          <p className="text-3xl font-bold text-lime-600 mt-3">
            {formatVND(analyticsData.stats.totalRevenue)}
          </p>
          <p className="text-xs text-text-muted mt-2">from completed & invoiced</p>
        </div>

        <div
          onClick={() => onCardClick('appointments')}
          className="bg-dark-300 rounded-lg shadow p-6 border border-dark-200 cursor-pointer hover:border-lime-400 transition-colors"
        >
          <p className="text-sm text-text-secondary">Appointments</p>
          <p className="text-2xl font-bold text-white mt-2">
            {analyticsData.stats.completedAndInvoicedCount}/{analyticsData.stats.totalAppointmentsCount}
          </p>
          <p className="text-xs text-text-muted mt-2">completed & invoiced</p>
        </div>

        <div
          onClick={() => onCardClick('customers')}
          className="bg-dark-300 rounded-lg shadow p-6 border border-dark-200 cursor-pointer hover:border-lime-400 transition-colors"
        >
          <p className="text-sm text-text-secondary">Customers</p>
          <p className="text-2xl font-bold text-white mt-2">
            {formatNumber(kpis.customerKPI.value)}
          </p>
          <p className="text-xs text-text-muted mt-2">active customers</p>
        </div>

        <div
          onClick={() => onCardClick('vehicles')}
          className="bg-dark-300 rounded-lg shadow p-6 border border-dark-200 cursor-pointer hover:border-lime-400 transition-colors"
        >
          <p className="text-sm text-text-secondary">Vehicles</p>
          <p className="text-2xl font-bold text-white mt-2">
            {formatNumber(kpis.vehicleKPI.value)}
          </p>
          <p className="text-xs text-text-muted mt-2">registered vehicles</p>
        </div>

        {/* Row 2 */}
        <div
          onClick={() => onCardClick('revenue')}
          className="bg-dark-300 rounded-lg shadow p-8 border-2 border-lime-600 cursor-pointer hover:border-lime-400 transition-colors"
        >
          <p className="text-sm text-text-secondary uppercase tracking-wider">Average Revenue</p>
          <p className="text-3xl font-bold text-lime-600 mt-3">
            {formatVND(analyticsData.stats.averageRevenue)}
          </p>
          <p className="text-xs text-text-muted mt-2">per appointment</p>
        </div>

        <div
          onClick={() => onCardClick('invoices')}
          className="bg-dark-300 rounded-lg shadow p-6 border border-dark-200 cursor-pointer hover:border-lime-400 transition-colors"
        >
          <h3 className="text-sm text-text-secondary">Total Invoices</h3>
          <p className="text-3xl font-bold text-white mt-2">
            {analyticsData.stats.totalInvoices}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {analyticsData.stats.paidInvoices} paid
          </p>
        </div>

        <div
          onClick={() => onCardClick('appointments')}
          className="bg-dark-300 rounded-lg shadow p-6 border border-dark-200 cursor-pointer hover:border-lime-400 transition-colors"
        >
          <h3 className="text-sm text-text-secondary">Completion Rate</h3>
          <p className="text-3xl font-bold text-white mt-2">
            {analyticsData.stats.completionRate}%
          </p>
          <p className="text-xs text-text-muted mt-1">
            {analyticsData.stats.completedAppointments} completed
          </p>
        </div>

        <div
          onClick={() => onCardClick('parts')}
          className="bg-dark-300 rounded-lg shadow p-6 border border-dark-200 cursor-pointer hover:border-lime-400 transition-colors"
        >
          <h3 className="text-sm text-text-secondary">Parts & Services</h3>
          <p className="text-3xl font-bold text-white mt-2">
            📊
          </p>
          <p className="text-xs text-text-muted mt-1">view inventory stats</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-dark-300 rounded-lg shadow p-6 border border-dark-200">
          <h2 className="text-lg font-bold text-white mb-6">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.charts.revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                formatter={(value) => formatVND(value as number)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                name="Revenue"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Appointments Trend */}
        <div className="bg-dark-300 rounded-lg shadow p-6 border border-dark-200">
          <h2 className="text-lg font-bold text-white mb-6">Appointments Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.charts.appointmentsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
              <Legend />
              <Bar dataKey="appointments" fill="#3b82f6" name="Total" />
              <Bar dataKey="completed" fill="#10b981" name="Completed" />
              <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service Distribution & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-300 rounded-lg shadow p-6 border border-dark-200">
          <h2 className="text-lg font-bold text-white mb-6">Service Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.charts.serviceDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analyticsData.charts.serviceDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-dark-300 rounded-lg shadow p-6 border border-dark-200">
          <h2 className="text-lg font-bold text-white mb-6">Appointment Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.charts.appointmentStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.status}: ${entry.count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {analyticsData.charts.appointmentStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Technician Performance */}
      {analyticsData.charts.technicianPerformance.length > 0 && (
        <div className="bg-dark-300 rounded-lg shadow p-6 border border-dark-200">
          <h2 className="text-lg font-bold text-white mb-6">Technician Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200">
                  <th className="text-left py-3 px-4 font-semibold text-white">Technician</th>
                  <th className="text-right py-3 px-4 font-semibold text-white">Appointments</th>
                  <th className="text-right py-3 px-4 font-semibold text-white">Completed</th>
                  <th className="text-right py-3 px-4 font-semibold text-white">Efficiency</th>
                  <th className="text-right py-3 px-4 font-semibold text-white">Rating</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.charts.technicianPerformance.map((tech, idx) => (
                  <tr key={idx} className="border-b border-dark-100">
                    <td className="py-3 px-4 text-white">{tech.name}</td>
                    <td className="text-right py-3 px-4 text-white">{tech.appointments}</td>
                    <td className="text-right py-3 px-4 text-white">{tech.completed}</td>
                    <td className="text-right py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium text-white bg-green-600">
                        {tech.efficiency}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium text-white bg-dark-600">
                        {tech.rating.toFixed(1)} ★
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Parts and Services Modal Component with Tabs
const PartsAndServicesModal: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'parts' | 'services'>('parts');
  const [parts, setParts] = React.useState<any[]>([]);
  const [services, setServices] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [partsRes, servicesRes] = await Promise.all([
          dashboardAPI.getDetails('parts'),
          servicesAPI.getAll(),
        ]);
        
        setParts(partsRes?.data?.data || []);
        setServices(servicesRes?.data?.data || []);
      } catch (error) {
        console.error('Error fetching parts/services:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-dark-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('parts')}
            className={`py-2 px-1 border-b-2 text-sm font-medium ${
              activeTab === 'parts'
                ? 'border-lime-400 text-lime-400'
                : 'border-transparent text-text-muted hover:text-text-secondary hover:border-dark-300'
            }`}
          >
            Parts ({parts.length})
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`py-2 px-1 border-b-2 text-sm font-medium ${
              activeTab === 'services'
                ? 'border-lime-400 text-lime-400'
                : 'border-transparent text-text-muted hover:text-text-secondary hover:border-dark-300'
            }`}
          >
            Services ({services.length})
          </button>
        </nav>
      </div>

      {/* Parts Tab */}
      {activeTab === 'parts' && (
        <div>
          <table className="min-w-full divide-y divide-dark-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Part Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                  Used
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                  Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-200">
              {parts.map((part: any) => (
                <tr key={part._id} className="hover:bg-dark-900">
                  <td className="px-4 py-3 text-sm text-white font-medium">
                    {part.partNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-white">{part.name}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{part.category}</td>
                  <td className="px-4 py-3 text-sm text-white text-right">
                    {part.currentStock || 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-lime-400 text-right">
                    {part.usedStock || 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right">
                    {formatVND(part.retailPrice || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-4 border-t border-dark-200">
            <p className="text-sm text-text-muted">
              Total Parts: <span className="text-white font-semibold">{parts.length}</span>
            </p>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div>
          <table className="min-w-full divide-y divide-dark-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Service Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-200">
              {services.map((service: any) => (
                <tr key={service._id} className="hover:bg-dark-900">
                  <td className="px-4 py-3 text-sm text-white font-medium">
                    {service.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{service.category}</td>
                  <td className="px-4 py-3 text-sm text-text-muted max-w-xs truncate">
                    {service.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-lime-400 text-right">
                    {formatVND(service.basePrice || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right">
                    {service.estimatedDuration || 'N/A'} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-4 border-t border-dark-200">
            <p className="text-sm text-text-muted">
              Total Services: <span className="text-white font-semibold">{services.length}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Detail Modal Component
const DetailModal: React.FC<{
  type: Exclude<DetailModalType, null>;
  data: DetailModalData;
  loading: boolean;
  onClose: () => void;
}> = ({ type, data, loading, onClose }) => {
  const getTitle = () => {
    switch (type) {
      case 'users':
        return 'All Users';
      case 'customers':
        return 'All Customers';
      case 'revenue':
        return 'Appointment Revenue';
      case 'invoices':
        return 'All Invoices';
      case 'vehicles':
        return 'All Vehicles';
      case 'appointments':
        return 'All Appointments';
      case 'parts':
        return 'Parts & Services Statistics';
      default:
        return 'Details';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Scheduled: 'bg-blue-100 text-blue-800',
      CheckedIn: 'bg-yellow-100 text-yellow-800',
      InService: 'bg-purple-100 text-purple-800',
      OnHold: 'bg-orange-100 text-orange-800',
      ReadyForPickup: 'bg-green-100 text-green-800',
      Closed: 'bg-gray-100 text-gray-800',
      Cancelled: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      customer: 'bg-blue-100 text-blue-800',
      staff: 'bg-purple-100 text-purple-800',
      technician: 'bg-green-100 text-green-800',
      admin: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          colors[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-dark-300 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-dark-900 px-6 py-4 flex items-center justify-between border-b border-dark-200">
            <h3 className="text-lg font-semibold text-white">{getTitle()}</h3>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
              </div>
            ) : (
              <>
                {/* Users Table */}
                {type === 'users' && data.users && (
                  <table className="min-w-full divide-y divide-dark-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Joined
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-200">
                      {data.users.map((user) => (
                        <tr key={user._id} className="hover:bg-dark-900">
                          <td className="px-4 py-3 text-sm text-white">
                            {user.firstName} {user.lastName}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-muted">{user.email}</td>
                          <td className="px-4 py-3 text-sm">{getStatusBadge(user.role)}</td>
                          <td className="px-4 py-3 text-sm text-text-muted">
                            {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Customers Table */}
                {type === 'customers' && data.customers && (
                  <div>
                    <div className="mb-4 p-4 bg-dark-900 rounded-lg border border-lime-400">
                      <p className="text-sm text-text-muted">
                        Showing <span className="text-lime-400 font-bold text-lg">{data.customers.length}</span> customers (role: customer only)
                      </p>
                    </div>
                    <table className="min-w-full divide-y divide-dark-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                            Joined
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-200">
                        {data.customers.map((customer) => (
                          <tr key={customer._id} className="hover:bg-dark-900">
                            <td className="px-4 py-3 text-sm text-white">
                              {customer.firstName} {customer.lastName}
                            </td>
                            <td className="px-4 py-3 text-sm text-text-muted">{customer.email}</td>
                            <td className="px-4 py-3 text-sm text-text-muted">
                              {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 pt-4 border-t border-dark-200">
                      <p className="text-sm text-text-muted">
                        Total Customers: <span className="text-white font-semibold">{data.customers.length}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Revenue Table (from Appointments) */}
                {type === 'revenue' && data.revenue && (
                  <div>
                    <table className="min-w-full divide-y divide-dark-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                            Apt #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-200">
                        {data.revenue.map((apt) => (
                          <tr key={apt._id} className="hover:bg-dark-900">
                            <td className="px-4 py-3 text-sm text-white font-medium">
                              {apt.appointmentNumber}
                            </td>
                            <td className="px-4 py-3 text-sm text-text-muted">
                              {apt.customer.firstName} {apt.customer.lastName}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-lime-400 text-right">
                              {formatVND(apt.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-sm">{getStatusBadge(apt.status)}</td>
                            <td className="px-4 py-3 text-sm text-text-muted">
                              {format(new Date(apt.createdAt), 'MMM dd, yyyy')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-6 pt-6 border-t-2 border-dark-200 bg-dark-900 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-text-muted mb-1">Total Appointments:</p>
                          <p className="text-2xl font-bold text-white">{data.revenue.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-text-muted mb-1">Total Revenue:</p>
                          <p className="text-2xl font-bold text-lime-400">
                            {formatVND(
                              data.revenue.reduce((sum, apt) => sum + apt.totalAmount, 0)
                            )}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-sm text-text-muted mb-1">Average Revenue per Appointment:</p>
                          <p className="text-2xl font-bold text-lime-200">
                            {formatVND(
                              data.revenue.length > 0
                                ? data.revenue.reduce((sum, apt) => sum + apt.totalAmount, 0) /
                                    data.revenue.length
                                : 0
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoices Table */}
                {type === 'invoices' && data.invoices && (
                  <div>
                    <table className="min-w-full divide-y divide-dark-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                            Invoice #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                            Apt #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                            Total Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-200">
                        {data.invoices.map((invoice) => (
                          <tr key={invoice._id} className="hover:bg-dark-900">
                            <td className="px-4 py-3 text-sm text-white font-medium">
                              {invoice.invoiceNumber}
                            </td>
                            <td className="px-4 py-3 text-sm text-white">
                              {invoice.appointmentNumber}
                            </td>
                            <td className="px-4 py-3 text-sm text-text-muted">
                              {invoice.customer.firstName} {invoice.customer.lastName}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-lime-400 text-right">
                              {formatVND(invoice.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-sm">{getStatusBadge(invoice.status)}</td>
                            <td className="px-4 py-3 text-sm text-text-muted">
                              {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-6 pt-6 border-t-2 border-dark-200 bg-dark-900 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-text-muted mb-1">Total Invoices:</p>
                          <p className="text-2xl font-bold text-white">{data.invoices.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-text-muted mb-1">Total Amount:</p>
                          <p className="text-2xl font-bold text-lime-400">
                            {formatVND(
                              data.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vehicles Table */}
                {type === 'vehicles' && data.vehicles && (
                  <table className="min-w-full divide-y divide-dark-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Vehicle
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          License Plate
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Registered
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-200">
                      {data.vehicles.map((vehicle) => (
                        <tr key={vehicle._id} className="hover:bg-dark-900">
                          <td className="px-4 py-3 text-sm text-white">
                            {vehicle.make} {vehicle.model}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-muted">
                            {vehicle.licensePlate}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-muted">
                            {vehicle.owner.firstName} {vehicle.owner.lastName}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-muted">
                            {format(new Date(vehicle.createdAt), 'MMM dd, yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Appointments Table */}
                {type === 'appointments' && data.appointments && (
                  <table className="min-w-full divide-y divide-dark-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Apt #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Vehicle
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-200">
                      {data.appointments.map((apt) => (
                        <tr key={apt._id} className="hover:bg-dark-900">
                          <td className="px-4 py-3 text-sm text-white">
                            {apt.appointmentNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-muted">
                            {apt.customer.firstName} {apt.customer.lastName}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-muted">
                            {apt.vehicle.make} {apt.vehicle.model}
                          </td>
                          <td className="px-4 py-3 text-sm">{getStatusBadge(apt.status)}</td>
                          <td className="px-4 py-3 text-sm text-text-muted">
                            {format(new Date(apt.scheduledDate), 'MMM dd, yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Parts & Services Modal with Tabs */}
                {type === 'parts' && (
                  <PartsAndServicesModal />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;
