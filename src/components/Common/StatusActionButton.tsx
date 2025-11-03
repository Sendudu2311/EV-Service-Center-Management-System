import React from "react";
import {
  ClipboardDocumentListIcon,
  PlayIcon,
  CheckCircleIcon,
  DocumentPlusIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  XMarkIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

interface StatusActionProps {
  appointmentId: string;
  currentStatus: string;
  userRole: "customer" | "staff" | "technician" | "admin";
  onAction: (action: string, appointmentId: string) => void;
  disabled?: boolean;
  className?: string;
  appointmentData?: any; // For additional context if needed
}

export interface StatusAction {
  action: string;
  label: string;
  icon: React.ComponentType<any>;
  variant: "primary" | "secondary" | "success" | "warning" | "danger";
  description?: string;
  roles: ("customer" | "staff" | "technician" | "admin")[];
}

const getStatusActions = (status: string): StatusAction[] => {
  const actions: StatusAction[] = [];

  switch (status) {
    case "pending":
      actions.push(
        {
          action: "confirm_appointment",
          label: "Xác nhận lịch hẹn",
          icon: CheckCircleIcon,
          variant: "primary",
          description: "Xác nhận lịch hẹn với khách hàng",
          roles: ["staff", "admin"],
        },
        {
          action: "cancel_appointment",
          label: "Hủy lịch hẹn",
          icon: XMarkIcon,
          variant: "danger",
          description: "Hủy lịch hẹn",
          roles: ["customer", "staff", "admin"],
        },
        {
          action: "reschedule_appointment",
          label: "Dời lịch hẹn",
          icon: ClockIcon,
          variant: "secondary",
          description: "Thay đổi thời gian lịch hẹn",
          roles: ["customer", "staff", "admin"],
        },
        {
          action: "contact_customer",
          label: "Liên hệ khách hàng",
          icon: PhoneIcon,
          variant: "secondary",
          description: "Gọi điện xác nhận với khách hàng",
          roles: ["staff", "admin"],
        }
      );
      break;

    case "confirmed":
      actions.push(
        {
          action: "mark_customer_arrived",
          label: "Khách đã đến",
          icon: CheckCircleIcon,
          variant: "primary",
          description: "Đánh dấu khách hàng đã đến",
          roles: ["staff", "admin"], // Only staff can confirm arrival, technician can create reception after
        },
        {
          action: "send_reminder",
          label: "Gửi nhắc nhở",
          icon: ChatBubbleLeftRightIcon,
          variant: "secondary",
          description: "Gửi tin nhắn nhắc nhở khách hàng",
          roles: ["staff", "admin"],
        },
        {
          action: "view_details",
          label: "Xem chi tiết",
          icon: EyeIcon,
          variant: "secondary",
          description: "Xem thông tin chi tiết lịch hẹn",
          roles: ["customer", "staff", "technician", "admin"],
        },
        {
          action: "cancel_appointment",
          label: "Hủy lịch hẹn",
          icon: XMarkIcon,
          variant: "danger",
          description: "Hủy lịch hẹn",
          roles: ["customer", "staff", "admin"],
        }
      );
      break;

    case "customer_arrived":
      actions.push(
        {
          action: "create_reception",
          label: "Tạo phiếu tiếp nhận",
          icon: ClipboardDocumentListIcon,
          variant: "primary",
          description: "Tạo phiếu tiếp nhận dịch vụ",
          roles: ["technician"], // Only technician can create reception, staff will see approve button after
        },
        {
          action: "view_details",
          label: "Xem chi tiết",
          icon: EyeIcon,
          variant: "secondary",
          description: "Xem thông tin lịch hẹn",
          roles: ["customer", "staff", "technician", "admin"],
        }
      );
      break;

    case "reception_created":
      actions.push(
        {
          action: "approve_reception",
          label: "Duyệt phiếu tiếp nhận",
          icon: CheckCircleIcon,
          variant: "primary",
          description: "Duyệt phiếu tiếp nhận và phụ tùng",
          roles: ["staff", "admin"],
        },
        {
          action: "view_reception",
          label: "Xem phiếu tiếp nhận",
          icon: ClipboardDocumentListIcon,
          variant: "secondary",
          description: "Xem chi tiết phiếu tiếp nhận",
          roles: ["customer", "staff", "technician", "admin"],
        },
        {
          action: "edit_reception",
          label: "Sửa phiếu tiếp nhận",
          icon: DocumentPlusIcon,
          variant: "secondary",
          description: "Chỉnh sửa phiếu tiếp nhận",
          roles: ["technician", "staff", "admin"],
        }
      );
      break;

    case "reception_approved":
      actions.push(
        {
          action: "start_work",
          label: "Bắt đầu làm việc",
          icon: PlayIcon,
          variant: "success",
          description: "Bắt đầu thực hiện dịch vụ",
          roles: ["technician"],
        },
        {
          action: "view_reception",
          label: "Xem phiếu tiếp nhận",
          icon: ClipboardDocumentListIcon,
          variant: "secondary",
          description: "Xem phiếu tiếp nhận đã duyệt",
          roles: ["customer", "staff", "technician", "admin"],
        }
      );
      break;

    case "in_progress":
      actions.push(
        {
          action: "complete_work",
          label: "Hoàn thành",
          icon: CheckCircleIcon,
          variant: "success",
          description: "Hoàn thành công việc",
          roles: ["technician"],
        },
        {
          action: "view_progress",
          label: "Xem tiến độ",
          icon: EyeIcon,
          variant: "secondary",
          description: "Xem tiến độ thực hiện",
          roles: ["customer", "staff", "admin"],
        },
        {
          action: "contact_customer",
          label: "Liên hệ khách hàng",
          icon: PhoneIcon,
          variant: "secondary",
          description: "Liên hệ cập nhật tình hình",
          roles: ["staff", "technician", "admin"],
        }
      );
      break;

    case "parts_insufficient":
      actions.push(
        {
          action: "reschedule",
          label: "Dời lịch",
          icon: ClockIcon,
          variant: "warning",
          description: "Dời lịch do thiếu phụ tùng",
          roles: ["staff", "admin"],
        },
        {
          action: "wait_for_parts",
          label: "Chờ phụ tùng",
          icon: ExclamationTriangleIcon,
          variant: "secondary",
          description: "Tiếp tục chờ phụ tùng",
          roles: ["staff", "admin"],
        },
        {
          action: "contact_customer",
          label: "Báo khách hàng",
          icon: PhoneIcon,
          variant: "primary",
          description: "Thông báo tình hình cho khách",
          roles: ["staff", "admin"],
        },
        {
          action: "view_details",
          label: "Xem chi tiết",
          icon: EyeIcon,
          variant: "secondary",
          description: "Xem thông tin chi tiết",
          roles: ["customer"],
        }
      );
      break;

    case "completed":
      actions.push(
        {
          action: "generate_invoice",
          label: "Tạo hóa đơn",
          icon: DocumentPlusIcon,
          variant: "primary",
          description: "Tạo hóa đơn thanh toán",
          roles: ["staff", "admin"],
        },
        {
          action: "final_inspection",
          label: "Kiểm tra cuối",
          icon: CheckCircleIcon,
          variant: "secondary",
          description: "Kiểm tra chất lượng cuối cùng",
          roles: ["technician", "staff", "admin"],
        },
        {
          action: "notify_customer",
          label: "Thông báo khách hàng",
          icon: ChatBubbleLeftRightIcon,
          variant: "success",
          description: "Thông báo xe đã sẵn sàng",
          roles: ["staff", "admin"],
        },
        {
          action: "view_service_report",
          label: "Xem báo cáo dịch vụ",
          icon: ClipboardDocumentListIcon,
          variant: "secondary",
          description: "Xem báo cáo chi tiết dịch vụ",
          roles: ["customer", "staff", "technician", "admin"],
        }
      );
      break;

    case "invoiced":
      actions.push(
        {
          action: "view_invoice",
          label: "Xem hóa đơn",
          icon: DocumentPlusIcon,
          variant: "secondary",
          description: "Xem chi tiết hóa đơn",
          roles: ["customer", "staff", "admin"],
        },
        {
          action: "process_payment",
          label: "Xử lý thanh toán",
          icon: CreditCardIcon,
          variant: "primary",
          description: "Thực hiện thanh toán",
          roles: ["customer", "staff", "admin"],
        },
        {
          action: "send_invoice",
          label: "Gửi hóa đơn",
          icon: ChatBubbleLeftRightIcon,
          variant: "secondary",
          description: "Gửi hóa đơn cho khách hàng",
          roles: ["staff", "admin"],
        }
      );
      break;

    case "cancelled":
    case "no_show":
      actions.push(
        {
          action: "view_details",
          label: "Xem chi tiết",
          icon: EyeIcon,
          variant: "secondary",
          description: "Xem thông tin chi tiết",
          roles: ["customer", "staff", "technician", "admin"],
        },
        {
          action: "reschedule_appointment",
          label: "Đặt lại lịch hẹn",
          icon: ClockIcon,
          variant: "primary",
          description: "Tạo lịch hẹn mới",
          roles: ["customer", "staff", "admin"],
        }
      );
      break;

    default:
      actions.push({
        action: "view_details",
        label: "Xem chi tiết",
        icon: EyeIcon,
        variant: "secondary",
        description: "Xem thông tin chi tiết",
        roles: ["customer", "staff", "technician", "admin"],
      });
      break;
  }

  return actions;
};

const getButtonClasses = (
  variant: StatusAction["variant"],
  disabled: boolean = false
) => {
  const baseClasses =
    "inline-flex items-center px-3 py-2 rounded-md text-sm text-text-muted transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  if (disabled) {
    return `${baseClasses} bg-dark-100 text-text-muted cursor-not-allowed`;
  }

  switch (variant) {
    case "primary":
      return `${baseClasses} bg-lime-600 text-dark-900 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-dark-900`;
    case "secondary":
      return `${baseClasses} bg-dark-200 text-text-secondary hover:bg-dark-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-dark-900`;
    case "success":
      return `${baseClasses} bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-dark-900`;
    case "warning":
      return `${baseClasses} bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-dark-900`;
    case "danger":
      return `${baseClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-dark-900`;
    default:
      return `${baseClasses} bg-dark-600 text-white hover:bg-dark-700`;
  }
};

const StatusActionButton: React.FC<StatusActionProps> = ({
  appointmentId,
  currentStatus,
  userRole,
  onAction,
  disabled = false,
  className = "",
  appointmentData,
}) => {
  const allActions = getStatusActions(currentStatus);
  const userActions = allActions.filter((action) =>
    action.roles.includes(userRole)
  );

  // Auto-start work when status is "reception_approved" and user is technician
  React.useEffect(() => {
    if (currentStatus === "reception_approved" && userRole === "technician" && !disabled) {
      const startWorkAction = userActions.find(action => action.action === "start_work");
      if (startWorkAction) {
        onAction(startWorkAction.action, appointmentId);
      }
    }
  }, [currentStatus, userRole, disabled, appointmentId, userActions, onAction]);

  if (userActions.length === 0) {
    return null;
  }

  // Filter out start_work action for reception_approved status since it's auto-triggered
  const filteredActions = currentStatus === "reception_approved" && userRole === "technician"
    ? userActions.filter(action => action.action !== "start_work")
    : userActions;

  if (filteredActions.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {filteredActions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.action}
            onClick={() => onAction(action.action, appointmentId)}
            disabled={disabled}
            className={getButtonClasses(action.variant, disabled)}
            title={action.description}
          >
            <Icon className="h-4 w-4 mr-2" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
};

export default StatusActionButton;

// Helper functions for status display
export const getVietnameseStatus = (status: string): string => {
  const statusTranslations: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    customer_arrived: "Khách đã đến",
    reception_created: "Đã tạo phiếu tiếp nhận",
    reception_approved: "Phiếu đã được duyệt",
    parts_insufficient: "Thiếu phụ tùng",
    waiting_for_parts: "Chờ phụ tùng",
    rescheduled: "Đã dời lịch",
    in_progress: "Đang thực hiện",
    parts_requested: "Đã yêu cầu phụ tùng",
    completed: "Đã hoàn thành",
    invoiced: "Đã xuất hóa đơn",
    cancelled: "Đã hủy",
    no_show: "Khách không đến",
  };

  return statusTranslations[status] || status;
};

export const getStatusColorClass = (status: string): string => {
  const statusColors: Record<string, string> = {
    pending: "bg-orange-600 text-white",
    confirmed: "bg-lime-200 text-dark-900",
    customer_arrived: "bg-dark-600 text-white",
    reception_created: "bg-purple-600 text-white",
    reception_approved: "bg-lime-200 text-dark-900",
    parts_insufficient: "bg-red-600 text-white",
    waiting_for_parts: "bg-orange-600 text-white",
    rescheduled: "bg-text-muted text-white",
    in_progress: "bg-dark-600 text-white",
    parts_requested: "bg-purple-600 text-white",
    completed: "bg-green-600 text-white",
    invoiced: "bg-green-600 text-white",
    cancelled: "bg-red-600 text-white",
    no_show: "bg-text-muted text-white",
  };

  return statusColors[status] || "bg-text-muted text-white";
};
