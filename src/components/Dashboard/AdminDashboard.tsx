import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { dashboardAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface DashboardData {
  stats: {
    serviceCenters: number;
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
  serviceCenterPerformance: Array<{
    _id: string;
    name: string;
    location: string;
    status: string;
    appointments: number;
    revenue: number;
    efficiency: number;
    manager: string;
  }>;
  recentActivity: Array<{
    _id: string;
    type: string;
    message: string;
    time: string;
    appointmentNumber: string;
  }>;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Failed to load dashboard</h2>
          <button 
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Service Centers',
      value: dashboardData.stats.serviceCenters.toString(),
      icon: BuildingOfficeIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: `${dashboardData.serviceCenterPerformance.filter(sc => sc.status === 'active').length} active`,
      trend: 'up'
    },
    {
      name: 'Total Users',
      value: formatNumber(dashboardData.stats.totalUsers),
      icon: UserGroupIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: `${dashboardData.stats.userBreakdown.customers} customers`,
      trend: 'up'
    },
    {
      name: 'Monthly Revenue',
      value: formatCurrency(dashboardData.stats.monthlyRevenue),
      icon: CurrencyDollarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: `Total: ${formatCurrency(dashboardData.stats.totalRevenue)}`,
      trend: 'up'
    },
    {
      name: 'Vehicles Serviced',
      value: formatNumber(dashboardData.stats.totalVehicles),
      icon: TruckIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: `${dashboardData.stats.completedAppointments} completed services`,
      trend: 'up'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user?.firstName}! Here's your system overview and analytics.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <p className="text-sm text-green-600">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Appointments Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'revenue' ? formatCurrency(value as number) : value,
                  name === 'revenue' ? 'Revenue' : 'Appointments'
                ]}
              />
              <Bar yAxisId="right" dataKey="appointments" fill="#3B82F6" opacity={0.3} />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Service Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Distribution</h3>
          {dashboardData.serviceDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.serviceDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {dashboardData.serviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              <p>No service data available</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Service Centers */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Service Centers Performance</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {dashboardData.serviceCenterPerformance.map((center) => (
                  <div key={center._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{center.name}</h3>
                        <p className="text-sm text-gray-600">{center.location}</p>
                        <p className="text-xs text-gray-500">Manager: {center.manager}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(center.status)}`}>
                        {center.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{center.appointments}</p>
                        <p className="text-sm text-gray-600">Appointments</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(center.revenue)}</p>
                        <p className="text-sm text-gray-600">Revenue</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{center.efficiency}%</p>
                        <p className="text-sm text-gray-600">Efficiency</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Efficiency</span>
                        <span className="text-gray-900 font-medium">{center.efficiency}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${center.efficiency >= 90 ? 'bg-green-500' : center.efficiency >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(center.efficiency, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {dashboardData.recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                ) : (
                  dashboardData.recentActivity.map((activity) => (
                    <div key={activity._id} className="border-l-4 border-blue-500 p-4 rounded-r-lg bg-blue-50">
                      <div className="flex items-start">
                        <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          <p className="text-sm text-gray-600">#{activity.appointmentNumber}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(activity.time).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* System Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-8">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">System Overview</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Total Appointments</span>
                  <span className="text-sm text-gray-900">{formatNumber(dashboardData.stats.totalAppointments)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Completed Services</span>
                  <span className="text-sm text-gray-900">{formatNumber(dashboardData.stats.completedAppointments)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Staff Members</span>
                  <span className="text-sm text-gray-900">{dashboardData.stats.userBreakdown.staff}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Technicians</span>
                  <span className="text-sm text-gray-900">{dashboardData.stats.userBreakdown.technicians}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;