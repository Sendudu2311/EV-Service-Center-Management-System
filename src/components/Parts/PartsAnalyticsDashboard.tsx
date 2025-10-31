import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  FireIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { formatVND } from '../../utils/vietnamese';
import toast from 'react-hot-toast';

interface AnalyticsData {
  overview: {
    totalParts: number;
    lowStockCount: number;
    urgentCount: number;
    activePartsValue: number;
  };
  usageDistribution: {
    high: number;
    medium: number;
    low: number;
    unused: number;
  };
  topUsedParts: Array<{
    _id: string;
    name: string;
    partNumber: string;
    category: string;
    totalUsed: number;
    averageMonthlyUsage: number;
    currentStock: number;
    usageCategory: string;
  }>;
  highUsageParts: Array<{
    _id: string;
    name: string;
    partNumber: string;
    currentStock: number;
    dynamicReorderPoint: number;
    averageMonthlyUsage: number;
    daysUntilStockout: number;
    isLowStock: boolean;
    isUrgent: boolean;
  }>;
  categoryStats: Record<string, {
    total: number;
    lowStock: number;
    highUsage: number;
    totalValue: number;
  }>;
}

interface LowStockPart {
  _id: string;
  name: string;
  partNumber: string;
  category: string;
  brand: string;
  inventory: {
    currentStock: number;
  };
  dynamicReorderPoint: number;
  usageCategory: string;
  daysUntilStockout: number;
  isUrgent: boolean;
  isLowStock: boolean;
}

interface PartsAnalyticsDashboardProps {
  onEditPart?: (part: any) => void;
}

const PartsAnalyticsDashboard: React.FC<PartsAnalyticsDashboardProps> = ({ onEditPart }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [lowStockParts, setLowStockParts] = useState<LowStockPart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
    fetchLowStockParts();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/parts/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAnalyticsData(result.data);
      } else {
        toast.error('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStockParts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/parts/low-stock', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setLowStockParts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching low stock parts:', error);
    }
  };

  const getUsageCategoryBadge = (category: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
      unused: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      high: 'High Usage',
      medium: 'Medium Usage',
      low: 'Low Usage',
      unused: 'Unused',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[category as keyof typeof colors] || colors.unused}`}>
        {labels[category as keyof typeof labels] || category}
      </span>
    );
  };

  const getPriorityBadge = (isUrgent: boolean, daysUntilStockout: number) => {
    if (isUrgent) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <FireIcon className="h-3 w-3 mr-1" />
          URGENT
        </span>
      );
    }

    if (daysUntilStockout < 30) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          Warning
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Low Priority
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-dark-300 overflow-hidden shadow rounded-lg border border-dark-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CubeIcon className="h-6 w-6 text-lime-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-muted truncate">Total Parts</dt>
                  <dd className="text-lg font-semibold text-white">{analyticsData.overview.totalParts}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-dark-300 overflow-hidden shadow rounded-lg border border-dark-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-muted truncate">Low Stock Alerts</dt>
                  <dd className="text-lg font-semibold text-white">{analyticsData.overview.lowStockCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-dark-300 overflow-hidden shadow rounded-lg border border-dark-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FireIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-muted truncate">Urgent Orders</dt>
                  <dd className="text-lg font-semibold text-white">{analyticsData.overview.urgentCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-dark-300 overflow-hidden shadow rounded-lg border border-dark-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-text-muted truncate">Inventory Value</dt>
                  <dd className="text-lg font-semibold text-white">{formatVND(analyticsData.overview.activePartsValue)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Table */}
      <div className="bg-dark-300 shadow rounded-lg border border-dark-200">
        <div className="px-4 py-5 border-b border-dark-200 sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-white">Low Stock Alerts (Dynamic Threshold)</h3>
            <span className="text-sm text-text-muted">{lowStockParts.length} parts need attention</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-dark-200">
            <thead className="bg-dark-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Part
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Current Stock
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Dynamic Threshold
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Usage
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Days Until Stockout
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Priority
                </th>
                {onEditPart && (
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-200">
              {lowStockParts.map((part) => (
                <tr key={part._id} className="hover:bg-dark-900">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{part.name}</div>
                    <div className="text-sm text-text-muted">{part.partNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${part.inventory.currentStock < 5 ? 'text-red-400' : 'text-white'}`}>
                      {part.inventory.currentStock}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-text-muted">{part.dynamicReorderPoint}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getUsageCategoryBadge(part.usageCategory)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">
                      {part.daysUntilStockout === Infinity ? '∞' : `${part.daysUntilStockout} days`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPriorityBadge(part.isUrgent, part.daysUntilStockout)}
                  </td>
                  {onEditPart && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onEditPart(part)}
                        className="text-lime-400 hover:text-lime-300"
                      >
                        Restock
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Usage Distribution */}
        <div className="bg-dark-300 shadow rounded-lg border border-dark-200">
          <div className="px-4 py-5 border-b border-dark-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-white">Usage Category Distribution</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                  <span className="text-sm text-white">High Usage (≥10/month)</span>
                </div>
                <span className="text-sm font-semibold text-white">{analyticsData.usageDistribution.high} parts</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                  <span className="text-sm text-white">Medium Usage (2-10/month)</span>
                </div>
                <span className="text-sm font-semibold text-white">{analyticsData.usageDistribution.medium} parts</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                  <span className="text-sm text-white">Low Usage (&lt;2/month)</span>
                </div>
                <span className="text-sm font-semibold text-white">{analyticsData.usageDistribution.low} parts</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-500 rounded mr-3"></div>
                  <span className="text-sm text-white">Unused</span>
                </div>
                <span className="text-sm font-semibold text-white">{analyticsData.usageDistribution.unused} parts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Used Parts */}
        <div className="bg-dark-300 shadow rounded-lg border border-dark-200">
          <div className="px-4 py-5 border-b border-dark-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-white">Top 10 Most Used Parts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {analyticsData.topUsedParts.map((part, index) => (
                <div key={part._id} className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <span className="flex-shrink-0 w-6 text-sm font-semibold text-lime-400">#{index + 1}</span>
                    <div className="ml-3 truncate">
                      <p className="text-sm font-medium text-white truncate">{part.name}</p>
                      <p className="text-xs text-text-muted">{part.partNumber}</p>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 text-right">
                    <p className="text-sm font-semibold text-white">{part.totalUsed} uses</p>
                    <p className="text-xs text-text-muted">{part.averageMonthlyUsage.toFixed(1)}/month</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartsAnalyticsDashboard;
