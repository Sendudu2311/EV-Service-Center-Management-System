import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Battery100Icon,
  BoltIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhotoIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
// import { api } from '../../services/api'; // Reserved for future API integration

// Vietnamese EV Checklist Schema
const evChecklistSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  vehicleInfo: z.object({
    make: z.string(),
    model: z.string(),
    year: z.number(),
    licensePlate: z.string(),
    vin: z.string(),
    mileage: z.number().min(0, 'Số km phải >= 0')
  }),
  batteryChecks: z.object({
    voltage: z.number().min(0, 'Điện áp phải >= 0'),
    current: z.number().min(0, 'Dòng điện phải >= 0'),
    temperature: z.number().min(-50).max(100, 'Nhiệt độ không hợp lệ'),
    stateOfCharge: z.number().min(0).max(100, 'Mức sạc phải từ 0-100%'),
    stateOfHealth: z.number().min(0).max(100, 'Sức khỏe pin phải từ 0-100%'),
    cellBalance: z.enum(['good', 'fair', 'poor'], {
      errorMap: () => ({ message: 'Chọn trạng thái cân bằng cell' })
    }),
    thermalManagement: z.enum(['normal', 'warning', 'critical'], {
      errorMap: () => ({ message: 'Chọn trạng thái quản lý nhiệt' })
    }),
    coolingSystem: z.enum(['working', 'reduced', 'failed'], {
      errorMap: () => ({ message: 'Chọn trạng thái hệ thống làm mát' })
    }),
    isolationResistance: z.number().min(0, 'Điện trở cách ly phải >= 0'),
    notes: z.string().optional()
  }),
  chargingSystemChecks: z.object({
    chargingPortCondition: z.enum(['excellent', 'good', 'fair', 'poor'], {
      errorMap: () => ({ message: 'Chọn tình trạng cổng sạc' })
    }),
    cableCondition: z.enum(['excellent', 'good', 'fair', 'poor'], {
      errorMap: () => ({ message: 'Chọn tình trạng dây cáp' })
    }),
    onboardCharger: z.enum(['working', 'reduced', 'failed'], {
      errorMap: () => ({ message: 'Chọn trạng thái sạc tích hợp' })
    }),
    dcFastCharging: z.enum(['working', 'reduced', 'failed', 'not_available'], {
      errorMap: () => ({ message: 'Chọn trạng thái sạc nhanh DC' })
    }),
    chargingSpeed: z.number().min(0, 'Tốc độ sạc phải >= 0'),
    powerDelivery: z.enum(['normal', 'reduced', 'intermittent'], {
      errorMap: () => ({ message: 'Chọn trạng thái cung cấp điện' })
    }),
    notes: z.string().optional()
  }),
  motorSystemChecks: z.object({
    motorPerformance: z.enum(['excellent', 'good', 'reduced', 'poor'], {
      errorMap: () => ({ message: 'Chọn hiệu suất động cơ' })
    }),
    inverterCondition: z.enum(['normal', 'warning', 'critical'], {
      errorMap: () => ({ message: 'Chọn tình trạng inverter' })
    }),
    transmissionCondition: z.enum(['smooth', 'rough', 'noisy'], {
      errorMap: () => ({ message: 'Chọn tình trạng hộp số' })
    }),
    regenerativeBraking: z.enum(['working', 'reduced', 'failed'], {
      errorMap: () => ({ message: 'Chọn trạng thái phanh tái sinh' })
    }),
    coolingSystem: z.enum(['working', 'reduced', 'failed'], {
      errorMap: () => ({ message: 'Chọn hệ thống làm mát động cơ' })
    }),
    vibrationLevel: z.enum(['none', 'minimal', 'moderate', 'excessive'], {
      errorMap: () => ({ message: 'Chọn mức độ rung động' })
    }),
    notes: z.string().optional()
  }),
  safetyChecks: z.object({
    highVoltageIsolation: z.boolean(),
    emergencyShutoff: z.boolean(),
    groundFaultDetection: z.boolean(),
    thermalRunawayProtection: z.boolean(),
    overcurrentProtection: z.boolean(),
    shortCircuitProtection: z.boolean(),
    insultationResistance: z.boolean(),
    warningLabels: z.boolean(),
    serviceDisconnect: z.boolean(),
    notes: z.string().optional()
  }),
  diagnosticCodes: z.array(z.object({
    code: z.string().min(1, 'Mã lỗi không được trống'),
    description: z.string().min(1, 'Mô tả không được trống'),
    severity: z.enum(['info', 'warning', 'critical'], {
      errorMap: () => ({ message: 'Chọn mức độ nghiêm trọng' })
    }),
    status: z.enum(['active', 'pending', 'resolved'], {
      errorMap: () => ({ message: 'Chọn trạng thái' })
    })
  })),
  photos: z.array(z.object({
    type: z.enum(['battery', 'charging', 'motor', 'general'], {
      errorMap: () => ({ message: 'Chọn loại ảnh' })
    }),
    description: z.string().min(1, 'Mô tả ảnh không được trống'),
    url: z.string().url('URL ảnh không hợp lệ')
  })),
  technicianNotes: z.string().optional(),
  recommendedActions: z.array(z.string()),
  overallCondition: z.enum(['excellent', 'good', 'fair', 'poor', 'unsafe'], {
    errorMap: () => ({ message: 'Chọn tình trạng tổng thể' })
  }),
  estimatedLifeRemaining: z.number().min(0).max(100, 'Tuổi thọ còn lại phải từ 0-100%'),
  nextMaintenanceDate: z.string().min(1, 'Ngày bảo trì tiếp theo là bắt buộc')
});

type EVChecklistFormData = z.infer<typeof evChecklistSchema>;

interface Props {
  appointmentId: string;
  vehicleData: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    vin: string;
    mileage: number;
  };
  initialData?: Partial<EVChecklistFormData>;
  onSave: (data: EVChecklistFormData) => void;
  onCancel: () => void;
  readOnly?: boolean;
}

const EVChecklistComponent: React.FC<Props> = ({
  appointmentId,
  vehicleData,
  initialData,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const [activeTab, setActiveTab] = useState<'battery' | 'charging' | 'motor' | 'safety' | 'diagnostics' | 'photos'>('battery');
  const [loading, setLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<EVChecklistFormData>({
    resolver: zodResolver(evChecklistSchema),
    defaultValues: {
      appointmentId,
      vehicleInfo: vehicleData,
      batteryChecks: {
        voltage: 0,
        current: 0,
        temperature: 25,
        stateOfCharge: 0,
        stateOfHealth: 100,
        cellBalance: 'good',
        thermalManagement: 'normal',
        coolingSystem: 'working',
        isolationResistance: 0,
        notes: ''
      },
      chargingSystemChecks: {
        chargingPortCondition: 'good',
        cableCondition: 'good',
        onboardCharger: 'working',
        dcFastCharging: 'working',
        chargingSpeed: 0,
        powerDelivery: 'normal',
        notes: ''
      },
      motorSystemChecks: {
        motorPerformance: 'good',
        inverterCondition: 'normal',
        transmissionCondition: 'smooth',
        regenerativeBraking: 'working',
        coolingSystem: 'working',
        vibrationLevel: 'minimal',
        notes: ''
      },
      safetyChecks: {
        highVoltageIsolation: true,
        emergencyShutoff: true,
        groundFaultDetection: true,
        thermalRunawayProtection: true,
        overcurrentProtection: true,
        shortCircuitProtection: true,
        insultationResistance: true,
        warningLabels: true,
        serviceDisconnect: true,
        notes: ''
      },
      diagnosticCodes: [],
      photos: [],
      technicianNotes: '',
      recommendedActions: [],
      overallCondition: 'good',
      estimatedLifeRemaining: 85,
      nextMaintenanceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ...initialData
    }
  });

  const { fields: diagnosticFields, append: appendDiagnostic, remove: removeDiagnostic } = useFieldArray({
    control,
    name: 'diagnosticCodes'
  });

  const { fields: photoFields, append: appendPhoto, remove: removePhoto } = useFieldArray({
    control,
    name: 'photos'
  });

  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({
    control,
    name: 'recommendedActions'
  });

  const watchedBattery = watch('batteryChecks');
  const watchedOverallCondition = watch('overallCondition');

  const getBatteryHealthColor = (soh: number) => {
    if (soh >= 80) return 'text-green-600';
    if (soh >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-green-600 bg-green-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      case 'unsafe': return 'text-red-800 bg-red-200';
      default: return 'text-text-secondary bg-dark-100';
    }
  };

  const tabs = [
    { key: 'battery', label: 'Pin & Điện', icon: Battery100Icon },
    { key: 'charging', label: 'Hệ thống sạc', icon: BoltIcon },
    { key: 'motor', label: 'Động cơ', icon: WrenchScrewdriverIcon },
    { key: 'safety', label: 'An toàn', icon: ShieldCheckIcon },
    { key: 'diagnostics', label: 'Chẩn đoán', icon: DocumentTextIcon },
    { key: 'photos', label: 'Hình ảnh', icon: PhotoIcon }
  ];

  const onSubmit = async (data: EVChecklistFormData) => {
    try {
      setLoading(true);
      await onSave(data);
      toast.success('Lưu checklist EV thành công');
    } catch (error) {
      console.error('Error saving EV checklist:', error);
      toast.error('Không thể lưu checklist EV');
    } finally {
      setLoading(false);
    }
  };

  const addDiagnosticCode = () => {
    appendDiagnostic({
      code: '',
      description: '',
      severity: 'info',
      status: 'active'
    });
  };

  const addPhoto = () => {
    appendPhoto({
      type: 'general',
      description: '',
      url: ''
    });
  };

  const addAction = () => {
    appendAction('');
  };

  return (
    <div className="bg-dark-300 rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Checklist Xe Điện EV
            </h2>
            <p className="text-text-secondary">
              {vehicleData.make} {vehicleData.model} {vehicleData.year} - {vehicleData.licensePlate}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full text-text-muted ${getConditionColor(watchedOverallCondition)}`}>
            Tình trạng: {
              {
                'excellent': 'Xuất sắc',
                'good': 'Tốt',
                'fair': 'Khá',
                'poor': 'Kém',
                'unsafe': 'Không an toàn'
              }[watchedOverallCondition] || 'Chưa đánh giá'
            }
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center py-2 px-1 border-b-2 text-text-muted text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-lime-600'
                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border-dark-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Battery Checks Tab */}
        {activeTab === 'battery' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Kiểm tra Pin và Hệ thống Điện</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Điện áp (V)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('batteryChecks.voltage', { valueAsNumber: true })}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
                {errors.batteryChecks?.voltage && (
                  <p className="text-red-600 text-xs mt-1">{errors.batteryChecks.voltage.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Dòng điện (A)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('batteryChecks.current', { valueAsNumber: true })}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
                {errors.batteryChecks?.current && (
                  <p className="text-red-600 text-xs mt-1">{errors.batteryChecks.current.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Nhiệt độ (°C)
                </label>
                <input
                  type="number"
                  {...register('batteryChecks.temperature', { valueAsNumber: true })}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
                {errors.batteryChecks?.temperature && (
                  <p className="text-red-600 text-xs mt-1">{errors.batteryChecks.temperature.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Mức sạc (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  {...register('batteryChecks.stateOfCharge', { valueAsNumber: true })}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
                {errors.batteryChecks?.stateOfCharge && (
                  <p className="text-red-600 text-xs mt-1">{errors.batteryChecks.stateOfCharge.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Sức khỏe pin (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  {...register('batteryChecks.stateOfHealth', { valueAsNumber: true })}
                  disabled={readOnly}
                  className={`w-full px-3 py-2 border border-dark-200 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400 ${getBatteryHealthColor(watchedBattery.stateOfHealth)}`}
                />
                {errors.batteryChecks?.stateOfHealth && (
                  <p className="text-red-600 text-xs mt-1">{errors.batteryChecks.stateOfHealth.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Điện trở cách ly (MΩ)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('batteryChecks.isolationResistance', { valueAsNumber: true })}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
                {errors.batteryChecks?.isolationResistance && (
                  <p className="text-red-600 text-xs mt-1">{errors.batteryChecks.isolationResistance.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Cân bằng Cell
                </label>
                <select
                  {...register('batteryChecks.cellBalance')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="good">Tốt</option>
                  <option value="fair">Khá</option>
                  <option value="poor">Kém</option>
                </select>
                {errors.batteryChecks?.cellBalance && (
                  <p className="text-red-600 text-xs mt-1">{errors.batteryChecks.cellBalance.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Quản lý nhiệt
                </label>
                <select
                  {...register('batteryChecks.thermalManagement')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="normal">Bình thường</option>
                  <option value="warning">Cảnh báo</option>
                  <option value="critical">Nguy hiểm</option>
                </select>
                {errors.batteryChecks?.thermalManagement && (
                  <p className="text-red-600 text-xs mt-1">{errors.batteryChecks.thermalManagement.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Hệ thống làm mát
                </label>
                <select
                  {...register('batteryChecks.coolingSystem')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="working">Hoạt động tốt</option>
                  <option value="reduced">Giảm hiệu suất</option>
                  <option value="failed">Hỏng</option>
                </select>
                {errors.batteryChecks?.coolingSystem && (
                  <p className="text-red-600 text-xs mt-1">{errors.batteryChecks.coolingSystem.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Ghi chú kiểm tra pin
              </label>
              <textarea
                rows={3}
                {...register('batteryChecks.notes')}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="Ghi chú thêm về tình trạng pin..."
              />
            </div>
          </div>
        )}

        {/* Charging System Tab */}
        {activeTab === 'charging' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Kiểm tra Hệ thống Sạc</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Tình trạng cổng sạc
                </label>
                <select
                  {...register('chargingSystemChecks.chargingPortCondition')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="excellent">Xuất sắc</option>
                  <option value="good">Tốt</option>
                  <option value="fair">Khá</option>
                  <option value="poor">Kém</option>
                </select>
                {errors.chargingSystemChecks?.chargingPortCondition && (
                  <p className="text-red-600 text-xs mt-1">{errors.chargingSystemChecks.chargingPortCondition.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Tình trạng dây cáp
                </label>
                <select
                  {...register('chargingSystemChecks.cableCondition')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="excellent">Xuất sắc</option>
                  <option value="good">Tốt</option>
                  <option value="fair">Khá</option>
                  <option value="poor">Kém</option>
                </select>
                {errors.chargingSystemChecks?.cableCondition && (
                  <p className="text-red-600 text-xs mt-1">{errors.chargingSystemChecks.cableCondition.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Sạc tích hợp (AC)
                </label>
                <select
                  {...register('chargingSystemChecks.onboardCharger')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="working">Hoạt động tốt</option>
                  <option value="reduced">Giảm hiệu suất</option>
                  <option value="failed">Hỏng</option>
                </select>
                {errors.chargingSystemChecks?.onboardCharger && (
                  <p className="text-red-600 text-xs mt-1">{errors.chargingSystemChecks.onboardCharger.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Sạc nhanh DC
                </label>
                <select
                  {...register('chargingSystemChecks.dcFastCharging')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="working">Hoạt động tốt</option>
                  <option value="reduced">Giảm hiệu suất</option>
                  <option value="failed">Hỏng</option>
                  <option value="not_available">Không có</option>
                </select>
                {errors.chargingSystemChecks?.dcFastCharging && (
                  <p className="text-red-600 text-xs mt-1">{errors.chargingSystemChecks.dcFastCharging.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Tốc độ sạc (kW)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('chargingSystemChecks.chargingSpeed', { valueAsNumber: true })}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
                {errors.chargingSystemChecks?.chargingSpeed && (
                  <p className="text-red-600 text-xs mt-1">{errors.chargingSystemChecks.chargingSpeed.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Cung cấp điện
                </label>
                <select
                  {...register('chargingSystemChecks.powerDelivery')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="normal">Bình thường</option>
                  <option value="reduced">Giảm</option>
                  <option value="intermittent">Không ổn định</option>
                </select>
                {errors.chargingSystemChecks?.powerDelivery && (
                  <p className="text-red-600 text-xs mt-1">{errors.chargingSystemChecks.powerDelivery.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Ghi chú hệ thống sạc
              </label>
              <textarea
                rows={3}
                {...register('chargingSystemChecks.notes')}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="Ghi chú thêm về hệ thống sạc..."
              />
            </div>
          </div>
        )}

        {/* Motor System Tab */}
        {activeTab === 'motor' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Kiểm tra Hệ thống Động cơ</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Hiệu suất động cơ
                </label>
                <select
                  {...register('motorSystemChecks.motorPerformance')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="excellent">Xuất sắc</option>
                  <option value="good">Tốt</option>
                  <option value="reduced">Giảm</option>
                  <option value="poor">Kém</option>
                </select>
                {errors.motorSystemChecks?.motorPerformance && (
                  <p className="text-red-600 text-xs mt-1">{errors.motorSystemChecks.motorPerformance.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Tình trạng inverter
                </label>
                <select
                  {...register('motorSystemChecks.inverterCondition')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="normal">Bình thường</option>
                  <option value="warning">Cảnh báo</option>
                  <option value="critical">Nguy hiểm</option>
                </select>
                {errors.motorSystemChecks?.inverterCondition && (
                  <p className="text-red-600 text-xs mt-1">{errors.motorSystemChecks.inverterCondition.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Tình trạng hộp số
                </label>
                <select
                  {...register('motorSystemChecks.transmissionCondition')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="smooth">Êm ái</option>
                  <option value="rough">Giật cục</option>
                  <option value="noisy">Ồn ào</option>
                </select>
                {errors.motorSystemChecks?.transmissionCondition && (
                  <p className="text-red-600 text-xs mt-1">{errors.motorSystemChecks.transmissionCondition.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Phanh tái sinh
                </label>
                <select
                  {...register('motorSystemChecks.regenerativeBraking')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="working">Hoạt động tốt</option>
                  <option value="reduced">Giảm hiệu suất</option>
                  <option value="failed">Hỏng</option>
                </select>
                {errors.motorSystemChecks?.regenerativeBraking && (
                  <p className="text-red-600 text-xs mt-1">{errors.motorSystemChecks.regenerativeBraking.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Làm mát động cơ
                </label>
                <select
                  {...register('motorSystemChecks.coolingSystem')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="working">Hoạt động tốt</option>
                  <option value="reduced">Giảm hiệu suất</option>
                  <option value="failed">Hỏng</option>
                </select>
                {errors.motorSystemChecks?.coolingSystem && (
                  <p className="text-red-600 text-xs mt-1">{errors.motorSystemChecks.coolingSystem.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-muted text-text-secondary mb-1">
                  Mức độ rung động
                </label>
                <select
                  {...register('motorSystemChecks.vibrationLevel')}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <option value="none">Không có</option>
                  <option value="minimal">Tối thiểu</option>
                  <option value="moderate">Vừa phải</option>
                  <option value="excessive">Quá mức</option>
                </select>
                {errors.motorSystemChecks?.vibrationLevel && (
                  <p className="text-red-600 text-xs mt-1">{errors.motorSystemChecks.vibrationLevel.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Ghi chú hệ thống động cơ
              </label>
              <textarea
                rows={3}
                {...register('motorSystemChecks.notes')}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="Ghi chú thêm về động cơ..."
              />
            </div>
          </div>
        )}

        {/* Safety Checks Tab */}
        {activeTab === 'safety' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Kiểm tra An toàn</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'highVoltageIsolation', label: 'Cách ly điện áp cao' },
                { key: 'emergencyShutoff', label: 'Ngắt khẩn cấp' },
                { key: 'groundFaultDetection', label: 'Phát hiện lỗi đất' },
                { key: 'thermalRunawayProtection', label: 'Bảo vệ nhiệt thoát' },
                { key: 'overcurrentProtection', label: 'Bảo vệ quá dòng' },
                { key: 'shortCircuitProtection', label: 'Bảo vệ ngắn mạch' },
                { key: 'insultationResistance', label: 'Điện trở cách điện' },
                { key: 'warningLabels', label: 'Nhãn cảnh báo' },
                { key: 'serviceDisconnect', label: 'Ngắt dịch vụ' }
              ].map((check) => (
                <div key={check.key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...register(`safetyChecks.${check.key}` as any)}
                    disabled={readOnly}
                    className="h-4 w-4 text-lime-600 focus:ring-lime-400 border-dark-300 rounded"
                  />
                  <label className="text-sm text-text-muted text-text-secondary">
                    {check.label}
                  </label>
                  {watch(`safetyChecks.${check.key}` as any) ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-red-600" />
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Ghi chú an toàn
              </label>
              <textarea
                rows={3}
                {...register('safetyChecks.notes')}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                placeholder="Ghi chú thêm về an toàn..."
              />
            </div>
          </div>
        )}

        {/* Diagnostics Tab */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Mã lỗi chẩn đoán</h3>
              {!readOnly && (
                <button
                  type="button"
                  onClick={addDiagnosticCode}
                  className="px-4 py-2 bg-lime-600 text-dark-900 rounded-md hover:bg-lime-100 transition-all duration-200 transform hover:scale-105"
                >
                  Thêm mã lỗi
                </button>
              )}
            </div>

            <div className="space-y-4">
              {diagnosticFields.map((field, index) => (
                <div key={field.id} className="border border-dark-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-text-muted text-white">Mã lỗi #{index + 1}</h4>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeDiagnostic(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Xóa
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-1">
                        Mã lỗi
                      </label>
                      <input
                        type="text"
                        {...register(`diagnosticCodes.${index}.code`)}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                        placeholder="P0001, B1234, ..."
                      />
                      {errors.diagnosticCodes?.[index]?.code && (
                        <p className="text-red-600 text-xs mt-1">{errors.diagnosticCodes[index]?.code?.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-1">
                        Mức độ
                      </label>
                      <select
                        {...register(`diagnosticCodes.${index}.severity`)}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                      >
                        <option value="info">Thông tin</option>
                        <option value="warning">Cảnh báo</option>
                        <option value="critical">Nghiêm trọng</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm text-text-muted text-text-secondary mb-1">
                        Mô tả
                      </label>
                      <textarea
                        rows={2}
                        {...register(`diagnosticCodes.${index}.description`)}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                        placeholder="Mô tả chi tiết về lỗi..."
                      />
                      {errors.diagnosticCodes?.[index]?.description && (
                        <p className="text-red-600 text-xs mt-1">{errors.diagnosticCodes[index]?.description?.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-1">
                        Trạng thái
                      </label>
                      <select
                        {...register(`diagnosticCodes.${index}.status`)}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                      >
                        <option value="active">Đang hoạt động</option>
                        <option value="pending">Chờ xử lý</option>
                        <option value="resolved">Đã giải quyết</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {diagnosticFields.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-text-muted" />
                  <p>Chưa có mã lỗi nào được ghi nhận</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Hình ảnh</h3>
              {!readOnly && (
                <button
                  type="button"
                  onClick={addPhoto}
                  className="px-4 py-2 bg-lime-600 text-dark-900 rounded-md hover:bg-lime-100 transition-all duration-200 transform hover:scale-105"
                >
                  Thêm ảnh
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {photoFields.map((field, index) => (
                <div key={field.id} className="border border-dark-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-text-muted text-white">Ảnh #{index + 1}</h4>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Xóa
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-1">
                        Loại ảnh
                      </label>
                      <select
                        {...register(`photos.${index}.type`)}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                      >
                        <option value="battery">Pin</option>
                        <option value="charging">Hệ thống sạc</option>
                        <option value="motor">Động cơ</option>
                        <option value="general">Chung</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-1">
                        Mô tả
                      </label>
                      <input
                        type="text"
                        {...register(`photos.${index}.description`)}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                        placeholder="Mô tả ảnh..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted text-text-secondary mb-1">
                        URL ảnh
                      </label>
                      <input
                        type="url"
                        {...register(`photos.${index}.url`)}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              ))}

              {photoFields.length === 0 && (
                <div className="col-span-2 text-center py-8 text-text-muted">
                  <PhotoIcon className="h-12 w-12 mx-auto mb-4 text-text-muted" />
                  <p>Chưa có ảnh nào được thêm</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary Section */}
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold text-white">Tổng kết</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Tình trạng tổng thể
              </label>
              <select
                {...register('overallCondition')}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                <option value="excellent">Xuất sắc</option>
                <option value="good">Tốt</option>
                <option value="fair">Khá</option>
                <option value="poor">Kém</option>
                <option value="unsafe">Không an toàn</option>
              </select>
              {errors.overallCondition && (
                <p className="text-red-600 text-xs mt-1">{errors.overallCondition.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Tuổi thọ còn lại (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                {...register('estimatedLifeRemaining', { valueAsNumber: true })}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
              {errors.estimatedLifeRemaining && (
                <p className="text-red-600 text-xs mt-1">{errors.estimatedLifeRemaining.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-text-muted text-text-secondary mb-1">
                Ngày bảo trì tiếp theo
              </label>
              <input
                type="date"
                {...register('nextMaintenanceDate')}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
              {errors.nextMaintenanceDate && (
                <p className="text-red-600 text-xs mt-1">{errors.nextMaintenanceDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-muted text-text-secondary mb-1">
              Ghi chú của kỹ thuật viên
            </label>
            <textarea
              rows={4}
              {...register('technicianNotes')}
              disabled={readOnly}
              className="w-full px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
              placeholder="Ghi chú tổng thể về tình trạng xe..."
            />
          </div>

          {/* Recommended Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-text-muted text-text-secondary">
                Hành động khuyến nghị
              </label>
              {!readOnly && (
                <button
                  type="button"
                  onClick={addAction}
                  className="text-sm px-3 py-1 bg-lime-600 text-dark-900 rounded-md hover:bg-lime-100 transition-all duration-200 transform hover:scale-105"
                >
                  Thêm
                </button>
              )}
            </div>

            <div className="space-y-2">
              {actionFields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <input
                    type="text"
                    {...register(`recommendedActions.${index}`)}
                    disabled={readOnly}
                    className="flex-1 px-3 py-2 border border-dark-200 bg-dark-300 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-lime-400"
                    placeholder="Hành động khuyến nghị..."
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeAction(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              ))}

              {actionFields.length === 0 && (
                <p className="text-text-muted text-sm italic">Chưa có hành động khuyến nghị nào</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-dark-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-dark-200 rounded-md text-text-secondary hover:bg-dark-900"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !isValid}
              className="px-6 py-2 bg-lime-600 text-dark-900 rounded-md hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 disabled:bg-dark-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang lưu...' : 'Lưu Checklist'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default EVChecklistComponent;
