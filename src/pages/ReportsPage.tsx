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

  // Date range state - default to last 30 days
  const getDefaultDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, kpisRes] = await Promise.all([
        reportsAPI.getAnalytics({ startDate, endDate }),
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

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    if (newStartDate && endDate && newStartDate > endDate) {
      toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      return;
    }
    setStartDate(newStartDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    if (newEndDate && startDate && newEndDate < startDate) {
      toast.error('Ngày kết thúc không được nhỏ hơn ngày bắt đầu');
      return;
    }
    setEndDate(newEndDate);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics & Reports</h1>
            <p className="mt-2 text-text-secondary">Comprehensive system statistics and performance metrics</p>
          </div>

          {/* Date Range Selector */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary font-medium">Từ ngày:</label>
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                max={endDate}
                className="px-3 py-2 bg-dark-300 text-white border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary font-medium">Đến ngày:</label>
              <input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 bg-dark-300 text-white border border-dark-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Revenue KPI - Larger */}
            <div className="bg-dark-300 rounded-lg shadow p-8 border-2 border-lime-600">
              <div className="flex flex-col">
                <p className="text-sm text-text-muted text-text-secondary uppercase tracking-wider">Total Revenue</p>
                <p className="text-3xl font-bold text-lime-600 mt-3">
                  {formatCurrency(kpis.revenueKPI.value)}
                </p>
              </div>
            </div>

            {/* Appointments KPI */}
            <div className="bg-dark-300 rounded-lg shadow p-6">
              <div className="flex flex-col">
                <p className="text-sm text-text-muted text-text-secondary">Appointments</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {formatNumber(kpis.appointmentKPI.value)}
                </p>
              </div>
            </div>

            {/* Customers KPI */}
            <div className="bg-dark-300 rounded-lg shadow p-6">
              <div className="flex flex-col">
                <p className="text-sm text-text-muted text-text-secondary">Customers</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {formatNumber(kpis.customerKPI.value)}
                </p>
              </div>
            </div>

            {/* Vehicles KPI */}
            <div className="bg-dark-300 rounded-lg shadow p-6">
              <div className="flex flex-col">
                <p className="text-sm text-text-muted text-text-secondary">Vehicles</p>
                <p className="text-2xl font-bold text-white mt-2">
                  {formatNumber(kpis.vehicleKPI.value)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Average Revenue - Highlighted */}
            <div className="lg:col-span-1 bg-dark-300 rounded-lg shadow p-8 border-2 border-lime-600">
              <div>
                <p className="text-sm text-text-muted text-text-secondary uppercase tracking-wider">Average Revenue</p>
                <p className="text-3xl font-bold text-lime-600 mt-3">
                  {formatCurrency(analytics.stats.averageRevenue)}
                </p>
                <p className="text-xs text-text-muted mt-2">
                  per appointment
                </p>
              </div>
            </div>

            <div className="bg-dark-300 rounded-lg shadow p-6">
              <h3 className="text-sm text-text-muted text-text-secondary">Completion Rate</h3>
              <p className="text-3xl font-bold text-white mt-2">
                {analytics.stats.completionRate}%
              </p>
              <p className="text-xs text-text-muted mt-1">
                {analytics.stats.completedAppointments} completed
              </p>
            </div>

            <div className="bg-dark-300 rounded-lg shadow p-6">
              <h3 className="text-sm text-text-muted text-text-secondary">Customer Retention</h3>
              <p className="text-3xl font-bold text-white mt-2">
                {analytics.stats.customerRetentionRate}%
              </p>
              <p className="text-xs text-text-muted mt-1">
              </p>
            </div>

            <div className="bg-dark-300 rounded-lg shadow p-6">
              <h3 className="text-sm text-text-muted text-text-secondary">Total Invoices</h3>
              <p className="text-3xl font-bold text-white mt-2">
                {analytics.stats.totalInvoices}
              </p>
              <p className="text-xs text-text-muted mt-1">
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        {analytics && (
          <>
            {/* Revenue Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-dark-300 rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-white mb-6">Revenue Trend</h2>
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
              <div className="bg-dark-300 rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-white mb-6">Appointments Trend</h2>
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
              <div className="bg-dark-300 rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-white mb-6">Service Distribution</h2>
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
              <div className="bg-dark-300 rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-white mb-6">Appointment Status</h2>
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
              <div className="bg-dark-300 rounded-lg shadow p-6 mb-6">
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
                      {analytics.charts.technicianPerformance.map((tech, idx) => (
                        <tr key={idx} className="border-b border-dark-100">
                          <td className="py-3 px-4 text-white">{tech.name}</td>
                          <td className="text-right py-3 px-4 text-white">
                            {tech.appointments}
                          </td>
                          <td className="text-right py-3 px-4 text-white">
                            {tech.completed}
                          </td>
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
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
