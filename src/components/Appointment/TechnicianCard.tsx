import React from "react";
import { StarIcon, UserIcon, CheckBadgeIcon } from "@heroicons/react/24/solid";
import { ClockIcon, CpuChipIcon } from "@heroicons/react/24/outline";

interface Technician {
  id: string;
  name: string;
  specializations: string[];
  availability: {
    status: string;
    workloadPercentage: number;
  };
  performance: {
    customerRating: number;
    completedJobs: number;
    efficiency: number;
  };
  skills: Array<{
    category: string;
    level: number;
    certified: boolean;
  }>;
  isRecommended: boolean;
  yearsExperience: number;
}

interface TechnicianCardProps {
  technician: Technician;
  isSelected: boolean;
  onSelect: (technicianId: string) => void;
  selectedServices?: string[];
  isAvailableForSlot?: boolean;
  disabled?: boolean;
}

const TechnicianCard: React.FC<TechnicianCardProps> = ({
  technician,
  isSelected,
  onSelect,
  selectedServices = [],
  isAvailableForSlot = true,
  disabled = false,
}) => {
  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case "available":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "busy":
        return "text-amber-700 bg-amber-50 border-amber-200";
      case "offline":
        return "text-gray-700 bg-gray-50 border-gray-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getAvailabilityText = (status: string) => {
    switch (status) {
      case "available":
        return "Available Now";
      case "busy":
        return "Busy";
      case "offline":
        return "Offline";
      default:
        return "Unknown";
    }
  };

  const getSkillLevel = (level: number) => {
    const levels = ["Beginner", "Basic", "Intermediate", "Advanced", "Expert"];
    return levels[level - 1] || "Unknown";
  };

  const getRelevantSkills = () => {
    if (selectedServices.length === 0) return technician.skills;
    return technician.skills.filter((skill) =>
      selectedServices.includes(skill.category)
    );
  };

  const relevantSkills = getRelevantSkills();
  const hasRelevantSkills = relevantSkills.length > 0;

  return (
    <div
      className={`relative p-5 rounded-xl transition-all duration-300 ${
        disabled
          ? "cursor-not-allowed opacity-50 bg-gray-50"
          : isSelected
          ? "shadow-lg ring-2 ring-blue-500 ring-offset-2 cursor-pointer scale-[1.02]"
          : "shadow-sm hover:shadow-md cursor-pointer hover:scale-[1.01] bg-white"
      } ${isSelected ? "bg-gradient-to-br from-blue-50 to-white" : ""}`}
      onClick={disabled ? undefined : () => onSelect(technician.id)}
    >
      {/* Recommended Badge */}
      {technician.isRecommended && (
        <div className="absolute -top-2 -right-2 z-10">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md">
            <CheckBadgeIcon className="w-4 h-4 mr-1" />
            Recommended
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
            <UserIcon className="w-8 h-8 text-white" />
          </div>
          {isSelected && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
              <CheckBadgeIcon className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">
            {technician.name}
          </h3>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>{technician.yearsExperience} years</span>
            </div>
            <span className="text-gray-400">•</span>
            <div className="flex items-center gap-1">
              <StarIcon className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-gray-900">
                {(technician.performance.customerRating || 0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Availability Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${getAvailabilityColor(
              technician.availability.status
            )}`}
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${
                technician.availability.status === "available"
                  ? "bg-emerald-500 animate-pulse"
                  : technician.availability.status === "busy"
                  ? "bg-amber-500"
                  : "bg-gray-400"
              }`}
            />
            {getAvailabilityText(technician.availability.status)}
          </span>
          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
            {Math.round(technician.availability.workloadPercentage)}% workload
          </span>
        </div>
        {!isAvailableForSlot && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
            <ClockIcon className="w-4 h-4 flex-shrink-0" />
            Not available for selected time slot
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2.5 text-center border border-gray-200 min-h-[60px] flex flex-col justify-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <StarIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="font-bold text-sm text-gray-900 truncate">
              {(technician.performance.customerRating || 0).toFixed(1)}
            </span>
          </div>
          <div className="text-xs font-medium text-gray-600 leading-tight">
            Rating
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2.5 text-center border border-gray-200 min-h-[60px] flex flex-col justify-center">
          <div className="font-bold text-sm text-gray-900 mb-1 truncate">
            {technician.performance.completedJobs}
          </div>
          <div className="text-xs font-medium text-gray-600 leading-tight">
            Jobs Done
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2.5 text-center border border-gray-200 min-h-[60px] flex flex-col justify-center">
          <div className="font-bold text-sm text-gray-900 mb-1 truncate">
            {Math.round(technician.performance.efficiency)}%
          </div>
          <div className="text-xs font-medium text-gray-600 leading-tight">
            Efficiency
          </div>
        </div>
      </div>

      {/* Specializations */}
      {technician.specializations.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Specializations
          </div>
          <div className="flex flex-wrap gap-1.5">
            {technician.specializations.map((spec) => (
              <span
                key={spec}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Relevant Skills for Selected Services */}
      {hasRelevantSkills && (
        <div className="border-t border-gray-200 pt-4">
          <div className="text-xs font-semibold text-gray-700 mb-2.5 uppercase tracking-wide">
            Skills Match
          </div>
          <div className="space-y-2">
            {relevantSkills.slice(0, 3).map((skill) => (
              <div
                key={skill.category}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CpuChipIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="capitalize text-sm font-medium text-gray-900 truncate">
                    {skill.category}
                  </span>
                  {skill.certified && (
                    <CheckBadgeIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                </div>
                <span className="text-xs font-semibold text-gray-700 bg-white px-2 py-1 rounded border border-gray-300 ml-2 flex-shrink-0">
                  {getSkillLevel(skill.level)}
                </span>
              </div>
            ))}
            {relevantSkills.length > 3 && (
              <div className="text-xs font-medium text-gray-500 text-center pt-1">
                +{relevantSkills.length - 3} more skills
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianCard;
