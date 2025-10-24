import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  Battery100Icon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface ChecklistItem {
  id: string;
  label: string;
  category: 'battery' | 'charging' | 'motor' | 'safety' | 'general';
  checked: boolean;
  status?: 'good' | 'warning' | 'critical';
  notes?: string;
}

interface EVChecklistTabProps {
  value?: ChecklistItem[];
  onChange?: (items: ChecklistItem[]) => void;
  readOnly?: boolean;
}

const defaultChecklistItems: ChecklistItem[] = [
  // Battery System
  { id: 'battery_soc', label: 'Kiểm tra % pin (SOC)', category: 'battery', checked: false, status: 'good' },
  { id: 'battery_soh', label: 'Tình trạng sức khỏe pin (SOH)', category: 'battery', checked: false, status: 'good' },
  { id: 'battery_voltage', label: 'Điện áp các cell', category: 'battery', checked: false, status: 'good' },
  { id: 'battery_temp', label: 'Nhiệt độ pin', category: 'battery', checked: false, status: 'good' },
  { id: 'battery_cooling', label: 'Hệ thống làm mát pin', category: 'battery', checked: false, status: 'good' },
  { id: 'battery_balance', label: 'Cân bằng cell', category: 'battery', checked: false, status: 'good' },

  // Charging System
  { id: 'charging_port', label: 'Tình trạng cổng sạc', category: 'charging', checked: false, status: 'good' },
  { id: 'charging_cable', label: 'Dây và đầu nối sạc', category: 'charging', checked: false, status: 'good' },
  { id: 'charging_onboard', label: 'Bộ sạc tích hợp', category: 'charging', checked: false, status: 'good' },
  { id: 'charging_speed', label: 'Tốc độ sạc', category: 'charging', checked: false, status: 'good' },

  // Motor & Drivetrain
  { id: 'motor_performance', label: 'Hiệu suất động cơ', category: 'motor', checked: false, status: 'good' },
  { id: 'motor_inverter', label: 'Bộ biến tần (Inverter)', category: 'motor', checked: false, status: 'good' },
  { id: 'motor_regen', label: 'Phanh tái sinh', category: 'motor', checked: false, status: 'good' },
  { id: 'motor_vibration', label: 'Mức độ rung động', category: 'motor', checked: false, status: 'good' },
  { id: 'motor_cooling', label: 'Làm mát động cơ', category: 'motor', checked: false, status: 'good' },

  // High Voltage Safety
  { id: 'safety_isolation', label: 'Kiểm tra cách điện cao thế (≥500Ω/V)', category: 'safety', checked: false, status: 'good' },
  { id: 'safety_ground', label: 'Phát hiện lỗi tiếp đất', category: 'safety', checked: false, status: 'good' },
  { id: 'safety_shutoff', label: 'Hệ thống ngắt khẩn cấp', category: 'safety', checked: false, status: 'good' },
  { id: 'safety_thermal', label: 'Bảo vệ quá nhiệt', category: 'safety', checked: false, status: 'good' },
  { id: 'safety_labels', label: 'Nhãn cảnh báo cao thế', category: 'safety', checked: false, status: 'good' },

  // General Checks
  { id: 'general_brakes', label: 'Phanh và dầu phanh', category: 'general', checked: false, status: 'good' },
  { id: 'general_tires', label: 'Lốp xe (áp suất, độ mòn)', category: 'general', checked: false, status: 'good' },
  { id: 'general_coolant', label: 'Chất làm mát', category: 'general', checked: false, status: 'good' },
  { id: 'general_12v', label: 'Pin 12V phụ trợ', category: 'general', checked: false, status: 'good' },
  { id: 'general_lights', label: 'Đèn chiếu sáng', category: 'general', checked: false, status: 'good' },
];

const EVChecklistTab: React.FC<EVChecklistTabProps> = ({
  value = defaultChecklistItems,
  onChange,
  readOnly = false
}) => {
  const [items, setItems] = useState<ChecklistItem[]>(value);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);

  // Sync items with value prop
  useEffect(() => {
    if (value && value.length > 0) {
      setItems(value);
    } else {
      setItems(defaultChecklistItems);
    }
  }, [value]);

  const handleCheckChange = (itemId: string, checked: boolean) => {
    if (readOnly) return;

    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, checked } : item
    );
    setItems(updatedItems);
    onChange?.(updatedItems);
  };

  const handleStatusChange = (itemId: string, status: 'good' | 'warning' | 'critical') => {
    if (readOnly) return;

    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, status } : item
    );
    setItems(updatedItems);
    onChange?.(updatedItems);
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    if (readOnly) return;

    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, notes } : item
    );
    setItems(updatedItems);
    onChange?.(updatedItems);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'good':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <CheckCircleIcon className="h-5 w-5 text-gray-300" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'battery':
        return <Battery100Icon className="h-5 w-5 text-blue-600" />;
      case 'charging':
        return <BoltIcon className="h-5 w-5 text-yellow-600" />;
      case 'motor':
        return <WrenchScrewdriverIcon className="h-5 w-5 text-purple-600" />;
      case 'safety':
        return <ShieldCheckIcon className="h-5 w-5 text-red-600" />;
      default:
        return <CheckCircleIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      battery: 'Hệ thống Pin',
      charging: 'Hệ thống Sạc',
      motor: 'Động cơ & Truyền động',
      safety: 'An toàn Cao thế',
      general: 'Kiểm tra Chung'
    };
    return labels[category] || category;
  };

  const categories = ['battery', 'charging', 'motor', 'safety', 'general'] as const;

  const getProgress = () => {
    const total = items.length;
    const checked = items.filter(item => item.checked).length;
    return { total, checked, percentage: total > 0 ? Math.round((checked / total) * 100) : 0 };
  };

  const progress = getProgress();

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-blue-900">Tiến độ kiểm tra</h3>
          <span className="text-sm font-semibold text-blue-900">
            {progress.checked}/{progress.total} ({progress.percentage}%)
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Checklist Items by Category */}
      {categories.map(category => {
        const categoryItems = items.filter(item => item.category === category);
        const categoryProgress = {
          total: categoryItems.length,
          checked: categoryItems.filter(item => item.checked).length
        };

        return (
          <div key={category} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Category Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(category)}
                  <h4 className="text-sm font-semibold text-gray-900">
                    {getCategoryLabel(category)}
                  </h4>
                </div>
                <span className="text-xs text-gray-600">
                  {categoryProgress.checked}/{categoryProgress.total}
                </span>
              </div>
            </div>

            {/* Category Items */}
            <div className="divide-y divide-gray-100">
              {categoryItems.map(item => (
                <div key={item.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => handleCheckChange(item.id, e.target.checked)}
                      disabled={readOnly}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                    />

                    {/* Item Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-900">
                          {item.label}
                        </label>
                        {getStatusIcon(item.status)}
                      </div>

                      {/* Status Buttons */}
                      {item.checked && (
                        <div className="mt-2 flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'good')}
                            disabled={readOnly}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              item.status === 'good'
                                ? 'bg-green-100 text-green-800 font-medium'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } disabled:opacity-50`}
                          >
                            Tốt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'warning')}
                            disabled={readOnly}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              item.status === 'warning'
                                ? 'bg-yellow-100 text-yellow-800 font-medium'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } disabled:opacity-50`}
                          >
                            Cảnh báo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'critical')}
                            disabled={readOnly}
                            className={`px-2 py-1 text-xs rounded-md transition-colors ${
                              item.status === 'critical'
                                ? 'bg-red-100 text-red-800 font-medium'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } disabled:opacity-50`}
                          >
                            Nghiêm trọng
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedNotes(expandedNotes === item.id ? null : item.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            {expandedNotes === item.id ? 'Ẩn ghi chú' : 'Thêm ghi chú'}
                          </button>
                        </div>
                      )}

                      {/* Notes */}
                      {item.checked && expandedNotes === item.id && (
                        <div className="mt-2">
                          <textarea
                            value={item.notes || ''}
                            onChange={(e) => handleNotesChange(item.id, e.target.value)}
                            disabled={readOnly}
                            placeholder="Ghi chú chi tiết..."
                            rows={2}
                            className="w-full text-xs border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:opacity-50"
                          />
                        </div>
                      )}

                      {/* Display notes if exists and not editing */}
                      {item.notes && expandedNotes !== item.id && (
                        <p className="mt-1 text-xs text-gray-600 italic">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Tóm tắt</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {items.filter(i => i.status === 'good').length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Tốt</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {items.filter(i => i.status === 'warning').length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Cảnh báo</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {items.filter(i => i.status === 'critical').length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Nghiêm trọng</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EVChecklistTab;
