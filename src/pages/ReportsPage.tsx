import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import toast from 'react-hot-toast';
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
import { format } from 'date-fns';

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
  };
  charts: {
    appointmentsTrend: Array<{ month: string; appointments: number; completed: number; cancelled: number }>;
    revenueTrend: Array<{ month: string; revenue: number; transactions: number }>;
    serviceDistribution: Array<{ name: string; value: number; color: string }>;
    appointmentStatus: Array<{ status: string; count: number; color: string }>;
    technicianPerformance: Array<{ name: string; appointments: number; completed: number; efficiency: number; rating: number }>;
  };
}

interface KPIData {
  revenueKPI: { value: number; target: number; unit: string; trend: string };
  appointmentKPI: { value: number; target: number; unit: string; trend: string };
  customerKPI: { value: number; target: number; unit: string; trend: string };
  vehicleKPI: { value: number; target: number; unit: string; trend: string };
  invoiceCollectionRate: { value: number; total: number; percentage: number; unit: string; trend: string };
}

const ReportsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'1month' | '3months' | '6months' | '1year'>('1month');

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, kpisRes] = await Promise.all([
        reportsAPI.getAnalytics({ period }),
        reportsAPI.getKPI(),
      ]);

      console.log('Analytics Response:', analyticsRes);
      console.log('KPIs Response:', kpisRes);

      // Axios wraps response in .data, ApiResponse wraps data in .data
      // So: analyticsRes = Axios response, analyticsRes.data = ApiResponse, analyticsRes.data.data = actual data
      if (analyticsRes?.data?.success && analyticsRes.data.data) {
        console.log('Setting analytics:', analyticsRes.data.data);
        setAnalytics(analyticsRes.data.data as AnalyticsData);
      }
      if (kpisRes?.data?.success && kpisRes.data.data) {
        console.log('Setting KPIs:', kpisRes.data.data);
        setKpis(kpisRes.data.data as KPIData);
      }
    } catch (error: any) {
      toast.error('Failed to load analytics data');
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="mt-2 text-gray-600">Comprehensive system statistics and performance metrics</p>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2">
            {(['1month', '3months', '6months', '1year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p === '1month' && '1 Month'}
                {p === '3months' && '3 Months'}
                {p === '6months' && '6 Months'}
                {p === '1year' && '1 Year'}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {/* Revenue KPI */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(kpis.revenueKPI.value)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                  </p>
                </div>
                <div className={`text-2xl font-bold ${getTrendColor(kpis.revenueKPI.trend)}`}>
                </div>
              </div>
            </div>

            {/* Appointments KPI */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Appointments</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatNumber(kpis.appointmentKPI.value)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                  </p>
                </div>
                <div className={`text-2xl font-bold ${getTrendColor(kpis.appointmentKPI.trend)}`}>
                </div>
              </div>
            </div>

            {/* Customers KPI */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Customers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatNumber(kpis.customerKPI.value)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                  </p>
                </div>
                <div className={`text-2xl font-bold ${getTrendColor(kpis.customerKPI.trend)}`}>
                </div>
              </div>
            </div>

            {/* Vehicles KPI */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vehicles</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatNumber(kpis.vehicleKPI.value)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                  </p>
                </div>
                <div className={`text-2xl font-bold ${getTrendColor(kpis.vehicleKPI.trend)}`}>
                </div>
              </div>
            </div>

            {/* Invoice Collection Rate */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Invoice Collection</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {kpis.invoiceCollectionRate.percentage}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                  </p>
                </div>
                <div className={`text-2xl font-bold ${getTrendColor(kpis.invoiceCollectionRate.trend)}`}>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">Completion Rate</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {analytics.stats.completionRate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.stats.completedAppointments} completed
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">Customer Retention</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {analytics.stats.customerRetentionRate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.stats.uniqueCustomers} unique customers
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">Payment Collection</h3>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {analytics.stats.paymentCollectionRate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.stats.paidInvoices}/{analytics.stats.totalInvoices} invoices
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600">Average Revenue</h3>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {formatCurrency(analytics.stats.averageRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                per appointment
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        {analytics && (
          <>
            {/* Revenue Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Revenue Trend</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.charts.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
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
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Appointments Trend</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.charts.appointmentsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="appointments" fill="#3b82f6" name="Total" />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" />
                    <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Service Distribution & Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Service Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Service Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.charts.serviceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.charts.serviceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Appointment Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Appointment Status</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.charts.appointmentStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.status}: ${entry.count}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.charts.appointmentStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Technician Performance */}
            {analytics.charts.technicianPerformance.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Technician Performance</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Technician</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Appointments</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Completed</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Efficiency</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.charts.technicianPerformance.map((tech, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-900">{tech.name}</td>
                          <td className="text-right py-3 px-4 text-gray-900">
                            {tech.appointments}
                          </td>
                          <td className="text-right py-3 px-4 text-gray-900">
                            {tech.completed}
                          </td>
                          <td className="text-right py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              {tech.efficiency}%
                            </span>
                          </td>
                          <td className="text-right py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
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
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
