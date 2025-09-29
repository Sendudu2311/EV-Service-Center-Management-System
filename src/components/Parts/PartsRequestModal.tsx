import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  XMarkIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { formatVND } from '../../utils/vietnamese';

const partsRequestSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  partId: z.string().min(1, 'Part ID is required'),
  requestedQuantity: z.number().min(1, 'Số lượng phải >= 1'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  requestType: z.enum(['initial_service', 'additional_during_service']),
  justification: z.string().min(10, 'Lý do yêu cầu phải có ít nhất 10 ký tự'),
  expectedUsageDate: z.string().min(1, 'Ngày sử dụng dự kiến là bắt buộc'),
  alternativeAcceptable: z.boolean(),
  notes: z.string().optional()
});

type PartsRequestFormData = z.infer<typeof partsRequestSchema>;

interface Part {
  _id: string;
  partNumber: string;
  name: string;
  description: string;
  category: string;
  manufacturer: string;
  pricing: {
    sellingPrice: number;
    currency: string;
  };
  inventory: {
    currentStock: number;
    reservedStock: number;
    minimumStock: number;
  };
  supplier: {
    name: string;
    leadTimeDays: number;
    minimumOrderQuantity: number;
  };
  qualityInfo: {
    warrantyMonths: number;
    qualityGrade: 'OEM' | 'OES' | 'Aftermarket';
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PartsRequestFormData) => Promise<void>;
  part: Part;
  appointmentId: string;
  maxQuantity?: number;
  requestType?: 'initial_service' | 'additional_during_service';
}

const PartsRequestModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  part,
  appointmentId,
  maxQuantity,
  requestType = 'initial_service'
}) => {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid }
  } = useForm<PartsRequestFormData>({
    resolver: zodResolver(partsRequestSchema),
    defaultValues: {
      appointmentId,
      partId: part._id,
      requestedQuantity: 1,
      priority: 'normal',
      requestType,
      justification: '',
      expectedUsageDate: new Date().toISOString().split('T')[0],
      alternativeAcceptable: true,
      notes: ''
    }
  });

  const watchedQuantity = watch('requestedQuantity');
  const watchedPriority = watch('priority');
  const available = part.inventory.currentStock - part.inventory.reservedStock;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStockWarning = () => {
    if (watchedQuantity > available) {
      return {
        type: 'error',
        message: `Không đủ hàng tồn kho. Chỉ có ${available} cái có sẵn.`,
        icon: ExclamationTriangleIcon
      };
    } else if (watchedQuantity > available - part.inventory.minimumStock) {
      return {
        type: 'warning',
        message: `Yêu cầu này sẽ làm tồn kho xuống dưới mức tối thiểu (${part.inventory.minimumStock}).`,
        icon: ExclamationTriangleIcon
      };
    } else {
      return {
        type: 'success',
        message: `Đủ hàng tồn kho để đáp ứng yêu cầu.`,
        icon: CheckCircleIcon
      };
    }
  };

  const getLeadTimeWarning = () => {
    const today = new Date();
    const expectedDate = new Date(watch('expectedUsageDate'));
    const daysDiff = Math.ceil((expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (watchedQuantity > available && daysDiff < part.supplier.leadTimeDays) {
      return {
        type: 'error',
        message: `Cần ${part.supplier.leadTimeDays} ngày để nhập hàng, nhưng ngày sử dụng dự kiến chỉ còn ${daysDiff} ngày.`
      };
    }
    return null;
  };

  const onFormSubmit = async (data: PartsRequestFormData) => {
    try {
      setLoading(true);
      await onSubmit(data);
      toast.success('Yêu cầu phụ tùng đã được gửi');
      reset();
      onClose();
    } catch (error) {
      console.error('Error submitting parts request:', error);
      toast.error('Không thể gửi yêu cầu phụ tùng');
    } finally {
      setLoading(false);
    }
  };

  const stockWarning = getStockWarning();
  const leadTimeWarning = getLeadTimeWarning();
  const WarningIcon = stockWarning.icon;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CubeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Yêu cầu phụ tùng
                </h3>
                <p className="text-sm text-gray-600">
                  {part.name} (#{part.partNumber})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Part Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Nhà sản xuất
                </p>
                <p className="text-sm font-medium text-gray-900">{part.manufacturer}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Chất lượng
                </p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  part.qualityInfo.qualityGrade === 'OEM' ? 'bg-blue-100 text-blue-800' :
                  part.qualityInfo.qualityGrade === 'OES' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {part.qualityInfo.qualityGrade}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Giá bán
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {formatVND(part.pricing.sellingPrice)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Tồn kho
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {part.inventory.currentStock} cái
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Có sẵn
                </p>
                <p className="text-sm font-medium text-green-600">
                  {available} cái
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Nhà cung cấp
                </p>
                <div className="flex items-center space-x-1 text-sm text-gray-700">
                  <span>{part.supplier.name}</span>
                  <ClockIcon className="h-3 w-3" />
                  <span>({part.supplier.leadTimeDays} ngày)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {/* Request Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số lượng yêu cầu
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxQuantity || available}
                  {...register('requestedQuantity', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.requestedQuantity && (
                  <p className="text-red-500 text-xs mt-1">{errors.requestedQuantity.message}</p>
                )}

                {/* Quantity summary */}
                <div className="mt-2 text-sm text-gray-600">
                  Tổng giá trị: <span className="font-bold text-gray-900">
                    {formatVND(part.pricing.sellingPrice * watchedQuantity)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mức độ ưu tiên
                </label>
                <select
                  {...register('priority')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Thấp</option>
                  <option value="normal">Bình thường</option>
                  <option value="high">Cao</option>
                  <option value="urgent">Khẩn cấp</option>
                </select>
                {errors.priority && (
                  <p className="text-red-500 text-xs mt-1">{errors.priority.message}</p>
                )}

                {/* Priority indicator */}
                <div className={`mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(watchedPriority)}`}>
                  Mức độ: {
                    watchedPriority === 'urgent' ? 'Khẩn cấp' :
                    watchedPriority === 'high' ? 'Cao' :
                    watchedPriority === 'normal' ? 'Bình thường' : 'Thấp'
                  }
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại yêu cầu
                </label>
                <select
                  {...register('requestType')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="initial_service">Phụ tùng dịch vụ ban đầu</option>
                  <option value="additional_during_service">Phụ tùng bổ sung trong quá trình dịch vụ</option>
                </select>
                {errors.requestType && (
                  <p className="text-red-500 text-xs mt-1">{errors.requestType.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày sử dụng dự kiến
                </label>
                <input
                  type="date"
                  {...register('expectedUsageDate')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.expectedUsageDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.expectedUsageDate.message}</p>
                )}
              </div>
            </div>

            {/* Justification */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do yêu cầu phụ tùng
              </label>
              <textarea
                rows={3}
                {...register('justification')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mô tả chi tiết lý do cần phụ tùng này, tình trạng hiện tại của xe, và cách phụ tùng sẽ được sử dụng..."
              />
              {errors.justification && (
                <p className="text-red-500 text-xs mt-1">{errors.justification.message}</p>
              )}
            </div>

            {/* Alternative acceptable */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register('alternativeAcceptable')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">
                Tôi chấp nhận phụ tùng thay thế tương đương nếu có
              </label>
            </div>

            {/* Additional notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú thêm (tùy chọn)
              </label>
              <textarea
                rows={2}
                {...register('notes')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Thông tin bổ sung về yêu cầu..."
              />
            </div>

            {/* Stock and Lead Time Warnings */}
            <div className="space-y-3">
              {/* Stock warning */}
              <div className={`flex items-start space-x-2 p-3 rounded-md ${
                stockWarning.type === 'error' ? 'bg-red-50 border border-red-200' :
                stockWarning.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-green-50 border border-green-200'
              }`}>
                <WarningIcon className={`h-5 w-5 mt-0.5 ${
                  stockWarning.type === 'error' ? 'text-red-500' :
                  stockWarning.type === 'warning' ? 'text-yellow-500' :
                  'text-green-500'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    stockWarning.type === 'error' ? 'text-red-800' :
                    stockWarning.type === 'warning' ? 'text-yellow-800' :
                    'text-green-800'
                  }`}>
                    Tình trạng tồn kho
                  </p>
                  <p className={`text-sm ${
                    stockWarning.type === 'error' ? 'text-red-700' :
                    stockWarning.type === 'warning' ? 'text-yellow-700' :
                    'text-green-700'
                  }`}>
                    {stockWarning.message}
                  </p>
                </div>
              </div>

              {/* Lead time warning */}
              {leadTimeWarning && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">
                      Cảnh báo thời gian giao hàng
                    </p>
                    <p className="text-sm text-red-700">
                      {leadTimeWarning.message}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading || !isValid || (watchedQuantity > available && requestType === 'initial_service')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PartsRequestModal;