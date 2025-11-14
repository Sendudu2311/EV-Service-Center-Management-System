import React from "react";
import { ClockIcon, UserIcon, PencilIcon } from "@heroicons/react/24/outline";

interface WorkflowHistoryEntry {
  action: string;
  performedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  } | string;
  timestamp: string | Date;
  changes?: {
    servicesAdded?: any[];
    servicesRemoved?: any[];
    servicesModified?: Array<{ before: any; after: any }>;
    partsAdded?: any[];
    partsRemoved?: any[];
    partsModified?: Array<{ before: any; after: any }>;
  };
  notes?: string;
}

interface WorkflowHistoryViewerProps {
  history: WorkflowHistoryEntry[];
}

const WorkflowHistoryViewer: React.FC<WorkflowHistoryViewerProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="bg-dark-900 rounded-lg p-6 text-center">
        <ClockIcon className="h-12 w-12 text-text-muted mx-auto mb-2" />
        <p className="text-text-muted">Chưa có lịch sử thay đổi</p>
      </div>
    );
  }

  // Filter for staff modification entries
  const modificationEntries = history.filter(
    (entry) => entry.action === "staff_modified_services_parts"
  );

  if (modificationEntries.length === 0) {
    return (
      <div className="bg-dark-900 rounded-lg p-6 text-center">
        <p className="text-text-muted">Không có thay đổi nào từ staff</p>
      </div>
    );
  }

  const getStaffName = (performedBy: any) => {
    if (typeof performedBy === "object" && performedBy !== null) {
      return `${performedBy.firstName} ${performedBy.lastName}`;
    }
    return "Staff";
  };

  return (
    <div className="bg-dark-900 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <ClockIcon className="h-5 w-5 text-blue-400" />
        Lịch sử thay đổi
      </h3>

      <div className="space-y-6">
        {modificationEntries.map((entry, index) => (
          <div
            key={index}
            className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-900/10 rounded-r-lg"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <PencilIcon className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-yellow-400">
                Staff đã chỉnh sửa Services/Parts
              </span>
            </div>

            {/* Staff info and timestamp */}
            <div className="flex items-center gap-4 text-sm text-text-secondary mb-3">
              <div className="flex items-center gap-1">
                <UserIcon className="h-4 w-4" />
                <span>{getStaffName(entry.performedBy)}</span>
              </div>
              <div className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                <span>
                  {new Date(entry.timestamp).toLocaleString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Changes Details */}
            {entry.changes && (
              <div className="space-y-3 mb-3">
                {/* Services Changes */}
                {((entry.changes.servicesAdded && entry.changes.servicesAdded.length > 0) ||
                  (entry.changes.servicesRemoved && entry.changes.servicesRemoved.length > 0) ||
                  (entry.changes.servicesModified && entry.changes.servicesModified.length > 0)) && (
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Dịch vụ:</h4>
                    <div className="space-y-1 text-sm">
                      {entry.changes.servicesAdded?.map((service, i) => (
                        <div key={i} className="text-green-400 flex items-center gap-2">
                          <span className="text-lg">🟢</span>
                          <span>Đã thêm: {service.serviceName} (x{service.quantity})</span>
                        </div>
                      ))}
                      {entry.changes.servicesModified?.map((mod, i) => (
                        <div key={i} className="text-yellow-400 flex items-center gap-2">
                          <span className="text-lg">🟡</span>
                          <span>
                            Đã sửa: {mod.after.serviceName} ({mod.before.quantity} → {mod.after.quantity})
                          </span>
                        </div>
                      ))}
                      {entry.changes.servicesRemoved?.map((service, i) => (
                        <div key={i} className="text-red-400 flex items-center gap-2">
                          <span className="text-lg">🔴</span>
                          <span>Đã xóa: {service.serviceName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parts Changes */}
                {((entry.changes.partsAdded && entry.changes.partsAdded.length > 0) ||
                  (entry.changes.partsRemoved && entry.changes.partsRemoved.length > 0) ||
                  (entry.changes.partsModified && entry.changes.partsModified.length > 0)) && (
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Phụ tùng:</h4>
                    <div className="space-y-1 text-sm">
                      {entry.changes.partsAdded?.map((part, i) => (
                        <div key={i} className="text-green-400 flex items-center gap-2">
                          <span className="text-lg">🟢</span>
                          <span>Đã thêm: {part.partName} (x{part.quantity})</span>
                        </div>
                      ))}
                      {entry.changes.partsModified?.map((mod, i) => (
                        <div key={i} className="text-yellow-400 flex items-center gap-2">
                          <span className="text-lg">🟡</span>
                          <span>
                            Đã sửa: {mod.after.partName} ({mod.before.quantity} → {mod.after.quantity})
                          </span>
                        </div>
                      ))}
                      {entry.changes.partsRemoved?.map((part, i) => (
                        <div key={i} className="text-red-400 flex items-center gap-2">
                          <span className="text-lg">🔴</span>
                          <span>Đã xóa: {part.partName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            {entry.notes && (
              <div className="bg-dark-300 border border-yellow-600/30 rounded-lg p-3 mt-3">
                <p className="text-sm font-semibold text-yellow-500 mb-1">📝 Lý do:</p>
                <p className="text-sm text-text-secondary italic">{entry.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowHistoryViewer;
