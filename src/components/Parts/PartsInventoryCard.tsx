import React from 'react';
import {
  CubeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import { formatVND } from '../../utils/vietnamese';

interface Part {
  _id: string;
  partNumber: string;
  name: string;
  description: string;
  category: string;
  manufacturer: string;
  compatibleVehicles: string[];
  specifications: Record<string, any>;
  pricing: {
    unitCost: number;
    sellingPrice: number;
    currency: string;
  };
  inventory: {
    currentStock: number;
    reservedStock: number;
    minimumStock: number;
    maximumStock: number;
    reorderPoint: number;
  };
  supplier: {
    name: string;
    contactInfo: {
      email: string;
      phone: string;
    };
    leadTimeDays: number;
    minimumOrderQuantity: number;
  };
  location: {
    warehouse: string;
    section: string;
    shelf: string;
    bin: string;
  };
  qualityInfo: {
    warrantyMonths: number;
    certifications: string[];
    qualityGrade: 'OEM' | 'OES' | 'Aftermarket';
  };
  isActive: boolean;
  lastUpdated: string;
}

interface Props {
  part: Part;
  requestedQuantity?: number;
  onRequestPart?: (partId: string, quantity: number) => void;
  onViewDetails?: (partId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

const PartsInventoryCard: React.FC<Props> = ({
  part,
  requestedQuantity = 1,
  onRequestPart,
  onViewDetails,
  showActions = true,
  compact = false
}) => {
  const getStockStatus = () => {
    const available = part.inventory.currentStock - part.inventory.reservedStock;

    if (available <= 0) {
      return { status: 'out', color: 'red', text: 'Hết hàng', icon: ExclamationTriangleIcon };
    } else if (available <= part.inventory.reorderPoint) {
      return { status: 'low', color: 'yellow', text: 'Sắp hết', icon: ExclamationTriangleIcon };
    } else if (available >= requestedQuantity) {
      return { status: 'available', color: 'green', text: 'Có sẵn', icon: CheckCircleIcon };
    } else {
      return { status: 'insufficient', color: 'orange', text: 'Không đủ', icon: ExclamationTriangleIcon };
    }
  };

  const getQualityBadgeColor = (grade: string) => {
    switch (grade) {
      case 'OEM': return 'bg-lime-100 text-lime-800';
      case 'OES': return 'bg-green-100 text-green-800';
      case 'Aftermarket': return 'bg-dark-100 text-gray-800';
      default: return 'bg-dark-100 text-gray-800';
    }
  };

  const stockStatus = getStockStatus();
  const StatusIcon = stockStatus.icon;
  const available = part.inventory.currentStock - part.inventory.reservedStock;

  if (compact) {
    return (
      <div className="bg-dark-300 border border-dark-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="text-sm font-semibold text-white truncate">
                {part.name}
              </h4>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs text-text-muted ${getQualityBadgeColor(part.qualityInfo.qualityGrade)}`}>
                {part.qualityInfo.qualityGrade}
              </span>
            </div>
            <p className="text-xs text-text-secondary mb-1">#{part.partNumber}</p>
            <p className="text-xs text-text-muted truncate">{part.description}</p>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-1">
                <StatusIcon className={`h-4 w-4 text-${stockStatus.color}-500`} />
                <span className={`text-xs text-text-muted text-${stockStatus.color}-600`}>
                  {available} có sẵn
                </span>
              </div>
              <span className="text-sm font-bold text-white">
                {formatVND(part.pricing.sellingPrice)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-300 border border-dark-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-lime-100 rounded-lg">
            <CubeIcon className="h-6 w-6 text-lime-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{part.name}</h3>
            <p className="text-sm text-text-secondary">#{part.partNumber}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs text-text-muted ${getQualityBadgeColor(part.qualityInfo.qualityGrade)}`}>
            {part.qualityInfo.qualityGrade}
          </span>
          <div className="flex items-center space-x-1">
            <StatusIcon className={`h-5 w-5 text-${stockStatus.color}-500`} />
            <span className={`text-sm text-text-muted text-${stockStatus.color}-600`}>
              {stockStatus.text}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-text-secondary mb-4">{part.description}</p>

      {/* Specifications Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide">Nhà sản xuất</p>
          <p className="text-sm text-text-muted text-white">{part.manufacturer}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide">Danh mục</p>
          <p className="text-sm text-text-muted text-white">{part.category}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide">Bảo hành</p>
          <p className="text-sm text-text-muted text-white">{part.qualityInfo.warrantyMonths} tháng</p>
        </div>
      </div>

      {/* Stock Information */}
      <div className="bg-dark-900 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-text-muted uppercase tracking-wide">Tồn kho</p>
            <p className="text-lg font-bold text-white">{part.inventory.currentStock}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted uppercase tracking-wide">Có sẵn</p>
            <p className={`text-lg font-bold text-${stockStatus.color}-600`}>{available}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted uppercase tracking-wide">Đã đặt</p>
            <p className="text-lg font-bold text-yellow-600">{part.inventory.reservedStock}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted uppercase tracking-wide">Tối thiểu</p>
            <p className="text-lg font-bold text-red-600">{part.inventory.minimumStock}</p>
          </div>
        </div>
      </div>

      {/* Location & Supplier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Vị trí kho</p>
          <div className="flex items-center space-x-2 text-sm text-text-secondary">
            <TruckIcon className="h-4 w-4" />
            <span>
              {part.location.warehouse} - {part.location.section} - {part.location.shelf} - {part.location.bin}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Nhà cung cấp</p>
          <div className="flex items-center space-x-2 text-sm text-text-secondary">
            <ClockIcon className="h-4 w-4" />
            <span>
              {part.supplier.name} ({part.supplier.leadTimeDays} ngày)
            </span>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide">Giá bán</p>
          <p className="text-xl font-bold text-white">
            {formatVND(part.pricing.sellingPrice)}
          </p>
        </div>
        {requestedQuantity > 1 && (
          <div className="text-right">
            <p className="text-xs text-text-muted uppercase tracking-wide">Tổng ({requestedQuantity} cái)</p>
            <p className="text-lg font-bold text-lime-600">
              {formatVND(part.pricing.sellingPrice * requestedQuantity)}
            </p>
          </div>
        )}
      </div>

      {/* Compatible Vehicles */}
      {part.compatibleVehicles.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Xe tương thích</p>
          <div className="flex flex-wrap gap-1">
            {part.compatibleVehicles.slice(0, 3).map((vehicle, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-lime-100 text-lime-800"
              >
                {vehicle}
              </span>
            ))}
            {part.compatibleVehicles.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-dark-100 text-text-secondary">
                +{part.compatibleVehicles.length - 3} khác
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center justify-between pt-4 border-t border-dark-200">
          <button
            onClick={() => onViewDetails?.(part._id)}
            className="text-sm text-text-secondary hover:text-gray-800 text-text-muted"
          >
            Xem chi tiết →
          </button>

          {available >= requestedQuantity && onRequestPart && (
            <button
              onClick={() => onRequestPart(part._id, requestedQuantity)}
              className="inline-flex items-center px-4 py-2 bg-lime-600 text-dark-900 text-sm rounded-md hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 transition-colors"
            >
              <CubeIcon className="h-4 w-4 mr-2" />
              Yêu cầu {requestedQuantity} cái
            </button>
          )}

          {available < requestedQuantity && available > 0 && onRequestPart && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onRequestPart(part._id, available)}
                className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white text-sm text-text-muted rounded-md hover:bg-yellow-700 transition-colors"
              >
                Yêu cầu {available} cái
              </button>
              <span className="text-xs text-text-muted">
                (Thiếu {requestedQuantity - available})
              </span>
            </div>
          )}

          {available === 0 && (
            <span className="inline-flex items-center px-4 py-2 bg-red-100 text-red-800 text-sm text-text-muted rounded-md">
              <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
              Hết hàng
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PartsInventoryCard;
