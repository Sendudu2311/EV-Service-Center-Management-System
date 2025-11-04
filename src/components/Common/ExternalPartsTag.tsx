import React from "react";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";

interface ExternalPartsTagProps {
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const ExternalPartsTag: React.FC<ExternalPartsTagProps> = ({
  size = "md",
  showIcon = true,
}) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClasses[size]} bg-amber-100 text-amber-800 border border-amber-300 rounded-full font-semibold animate-pulse`}
      title="Appointment có linh kiện đặt từ bên ngoài - Xe để lại"
    >
      {showIcon && <ShoppingBagIcon className={iconSizes[size]} />}
      <span>ĐẶT NGOÀI</span>
    </span>
  );
};

export default ExternalPartsTag;
