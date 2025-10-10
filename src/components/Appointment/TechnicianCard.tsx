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
        return "text-green-600 bg-green-100";
      case "busy":
        return "text-yellow-600 bg-yellow-100";
      case "offline":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getAvailabilityText = (status: string) => {
    switch (status) {
      case "available":
        return "Available";
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
      className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
        disabled
          ? "cursor-not-allowed opacity-60 bg-gray-50 border-gray-200"
          : isSelected
          ? "border-blue-500 bg-blue-50 shadow-md cursor-pointer"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm cursor-pointer"
      }`}
      onClick={disabled ? undefined : () => onSelect(technician.id)}
    >
      {/* Recommended Badge */}
      {technician.isRecommended && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gold-100 text-gold-800">
            <CheckBadgeIcon className="w-3 h-3 mr-1" />
            Recommended
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
            <UserIcon className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{technician.name}</h3>
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="w-4 h-4 mr-1" />
              {technician.yearsExperience} years experience
            </div>
          </div>
        </div>
      </div>

      {/* Availability Status */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(
              technician.availability.status
            )}`}
          >
            {getAvailabilityText(technician.availability.status)}
          </span>
          <span className="text-sm text-gray-600">
            {technician.availability.workloadPercentage}% workload
          </span>
        </div>
        {!isAvailableForSlot && (
          <div className="flex items-center text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            <ClockIcon className="w-3 h-3 mr-1" />
            Not available for selected time slot
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="bg-gray-50 rounded p-2">
          <div className="flex items-center justify-center mb-1">
            <StarIcon className="w-4 h-4 text-yellow-500" />
            <span className="ml-1 font-semibold text-sm">
              {(technician.performance.customerRating || 0).toFixed(1)}
            </span>
          </div>
          <div className="text-xs text-gray-600">Rating</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="font-semibold text-sm mb-1">
            {technician.performance.completedJobs}
          </div>
          <div className="text-xs text-gray-600">Jobs</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="font-semibold text-sm mb-1">
            {technician.performance.efficiency}%
          </div>
          <div className="text-xs text-gray-600">Efficiency</div>
        </div>
      </div>

      {/* Specializations */}
      {technician.specializations.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-medium text-gray-700 mb-1">
            Specializations:
          </div>
          <div className="flex flex-wrap gap-1">
            {technician.specializations.map((spec) => (
              <span
                key={spec}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Relevant Skills for Selected Services */}
      {hasRelevantSkills && (
        <div className="mb-3">
          <div className="text-sm font-medium text-gray-700 mb-1">
            Skills for your services:
          </div>
          <div className="space-y-1">
            {relevantSkills.slice(0, 3).map((skill) => (
              <div
                key={skill.category}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center">
                  <CpuChipIcon className="w-3 h-3 mr-1 text-gray-500" />
                  <span className="capitalize">{skill.category}</span>
                  {skill.certified && (
                    <CheckBadgeIcon className="w-3 h-3 ml-1 text-green-500" />
                  )}
                </div>
                <span className="font-medium text-gray-600">
                  {getSkillLevel(skill.level)}
                </span>
              </div>
            ))}
            {relevantSkills.length > 3 && (
              <div className="text-xs text-gray-500">
                +{relevantSkills.length - 3} more skills
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute inset-0 rounded-lg border-2 border-blue-500 bg-blue-50 bg-opacity-20 pointer-events-none">
          <div className="absolute top-3 right-3">
            <CheckBadgeIcon className="w-6 h-6 text-blue-500" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianCard;
