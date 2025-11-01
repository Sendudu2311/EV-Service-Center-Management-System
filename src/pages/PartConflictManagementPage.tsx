import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  CalendarIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { partConflictsAPI, partsAPI } from "../services/api";
import toast from "react-hot-toast";
import { formatVietnameseDateTime, formatVND } from "../utils/vietnamese";

interface ConflictingRequest {
  requestId: string;
  requestType: "ServiceReception" | "PartRequest";
  appointmentId: {
    _id: string;
    appointmentNumber: string;
    scheduledDate: string;
    scheduledTime: string;
    priority: string;
  };
  appointmentNumber: string;
  requestedQuantity: number;
  priority: string;
  scheduledDate: string;
  scheduledTime: string;
  requestedAt: string;
  customerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  technicianId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  autoApproved: boolean;
  status: "pending" | "approved" | "deferred" | "rejected";
  resolutionNotes?: string;
}

interface PartConflict {
  _id: string;
  conflictNumber: string;
  partId: {
    _id: string;
    name: string;
    partNumber: string;
    inventory?: {
      currentStock: number;
      reservedStock: number;
    };
    availableStock?: number; // Real-time available stock (can be negative)
    currentStock?: number;
    reservedStock?: number;
  };
  partName: string;
  partNumber: string;
  availableStock: number; // Cached value (may not reflect real-time state)
  totalRequested: number;
  shortfall: number;
  status: "pending" | "resolved" | "auto_resolved";
  conflictingRequests: ConflictingRequest[];
  resolvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
}

interface SuggestedRequest {
  requestId: string;
  receptionNumber: string;
  priority: string;
  scheduledDate: string;
  requestedQuantity: number;
  reasoning: string;
}

interface Suggestions {
  suggested: SuggestedRequest[];
  availableStock: number;
  totalRequested: number;
}

const PartConflictManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conflicts, setConflicts] = useState<PartConflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<PartConflict | null>(
    null
  );
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [currentStock, setCurrentStock] = useState(0);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null
  );
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  // State to store real-time stock for each conflict
  const [realTimeStockMap, setRealTimeStockMap] = useState<Map<string, number>>(
    new Map()
  );

  // Helper function to calculate available stock from Part data (real-time)
  const calculateStockFromPart = (part: any): number => {
    if (!part) return 0;

    const current = part.inventory?.currentStock || part.currentStock || 0;
    const reserved = part.inventory?.reservedStock || part.reservedStock || 0;
    const available = current - reserved;

    console.log("[calculateStockFromPart]", {
      current,
      reserved,
      available,
      partId: part._id,
    });

    return Math.max(0, available); // Don't allow negative for display
  };

  // Fetch real-time stock from Part API
  const fetchRealTimeStock = useCallback(
    async (partId: string): Promise<number> => {
      try {
        const response = await partsAPI.getById(partId);
        if (response.data?.data) {
          const stock = calculateStockFromPart(response.data.data);
          // Update cache
          setRealTimeStockMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(partId, stock);
            return newMap;
          });
          return stock;
        }
      } catch (error: any) {
        console.error("[fetchRealTimeStock] Error fetching part:", error);
      }

      // Fallback to cached value or calculate from conflict data
      return 0;
    },
    []
  );

  // Helper function to get available stock (prefer real-time from cache or fetch fresh)
  const getAvailableStock = (conflict: PartConflict | null): number => {
    if (!conflict || !conflict.partId) return 0;

    const partId =
      typeof conflict.partId === "string"
        ? conflict.partId
        : (conflict.partId as any)?._id || (conflict.partId as any)?.id;

    if (!partId) return 0;

    // Check cache first
    if (realTimeStockMap.has(partId)) {
      return realTimeStockMap.get(partId)!;
    }

    // If not in cache, try to calculate from populated partId data
    if ((conflict.partId as any)?.inventory) {
      const current = (conflict.partId as any).inventory.currentStock || 0;
      const reserved = (conflict.partId as any).inventory.reservedStock || 0;
      const stock = Math.max(0, current - reserved);
      // Cache it
      setRealTimeStockMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(partId, stock);
        return newMap;
      });
      return stock;
    }

    // Last resort: fetch fresh from API (async, will update later)
    fetchRealTimeStock(partId);

    // Return 0 while fetching
    return 0;
  };

  // Update currentStock whenever selectedConflict changes and fetch real-time stock
  useEffect(() => {
    if (selectedConflict && selectedConflict.partId) {
      const partId =
        typeof selectedConflict.partId === "string"
          ? selectedConflict.partId
          : (selectedConflict.partId as any)?._id ||
            (selectedConflict.partId as any)?.id;

      if (partId) {
        // Always fetch fresh stock when conflict is selected
        fetchRealTimeStock(partId).then((stock) => {
          console.log(
            "[useEffect] Updated currentStock to:",
            stock,
            "for partId:",
            partId
          );
          setCurrentStock(stock);
        });
      }
    }
  }, [selectedConflict, fetchRealTimeStock]);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Approval confirmation modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveRequestId, setApproveRequestId] = useState<string | null>(null);
  const [approveNotes, setApproveNotes] = useState("");

  const fetchConflicts = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter === "pending") {
        params.status = "pending";
      }
      const response = await partConflictsAPI.getConflicts(params);
      setConflicts(response.data.data || []);
    } catch (error: any) {
      console.error("Error fetching conflicts:", error);
      toast.error("Không thể tải danh sách xung đột phụ tùng");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (user?.role === "staff" || user?.role === "admin") {
      fetchConflicts();
    }
  }, [user, fetchConflicts]);

  // Fetch suggestions when a conflict is selected
  const fetchSuggestions = useCallback(async (conflictId: string) => {
    // Validate conflictId
    if (
      !conflictId ||
      typeof conflictId !== "string" ||
      conflictId.trim() === ""
    ) {
      console.error("Invalid conflictId:", conflictId);
      toast.error("ID xung đột không hợp lệ");
      return;
    }

    try {
      const response = await partConflictsAPI.getSuggestedResolution(
        conflictId
      );
      if (response.data?.data) {
        setSuggestions(response.data.data);
      } else {
        setSuggestions(null);
      }
    } catch (error: any) {
      console.error("Error fetching suggestions:", error);

      // Handle specific error cases
      const errorMessage = error.response?.data?.message || error.message;

      if (error.response?.status === 400) {
        // Conflict already resolved or invalid status
        if (
          errorMessage?.includes("already resolved") ||
          errorMessage?.includes("resolved")
        ) {
          toast.error("Xung đột đã được giải quyết, không cần đề xuất");
          setSuggestions(null); // Clear suggestions for resolved conflicts
          return;
        }
        // Invalid ID format
        if (
          errorMessage?.includes("Invalid") ||
          errorMessage?.includes("format")
        ) {
          toast.error("ID xung đột không hợp lệ");
          return;
        }
      }

      if (error.response?.status === 404) {
        toast.error("Không tìm thấy xung đột");
        setSuggestions(null);
        return;
      }

      // Generic error
      toast.error(errorMessage || "Không thể tải đề xuất giải quyết");
      setSuggestions(null);
    }
  }, []);

  const handleConflictSelect = (conflict: PartConflict) => {
    setSelectedConflict(conflict);
    // currentStock will be updated automatically via useEffect when selectedConflict changes

    // Only fetch suggestions for pending conflicts
    if (conflict.status === "pending" && conflict._id) {
      fetchSuggestions(conflict._id);
    } else {
      // Clear suggestions for resolved conflicts
      setSuggestions(null);
    }
  };

  const handleApproveClick = (requestId: string) => {
    setApproveRequestId(requestId);
    setShowApproveModal(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedConflict || !approveRequestId) return;

    try {
      setProcessingRequestId(approveRequestId);
      const response = await partConflictsAPI.approveRequest(
        selectedConflict._id,
        {
          requestId: approveRequestId,
          notes: approveNotes,
        }
      );

      // Update current stock with new value from response
      if (response.data?.data?.newAvailableStock !== undefined) {
        const newStock = response.data.data.newAvailableStock;
        setCurrentStock(newStock);
        // Also update cache if we have partId
        if (selectedConflict?.partId) {
          const partId =
            typeof selectedConflict.partId === "string"
              ? selectedConflict.partId
              : (selectedConflict.partId as any)?._id ||
                (selectedConflict.partId as any)?.id;
          if (partId) {
            setRealTimeStockMap((prev) => {
              const newMap = new Map(prev);
              newMap.set(partId, newStock);
              return newMap;
            });
          }
        }
      }

      toast.success(
        `✅ Đã duyệt yêu cầu thành công! Phiếu được chuyển sang trạng thái "approved".`
      );

      // Close modal and reset
      setShowApproveModal(false);
      setApproveRequestId(null);
      setApproveNotes("");

      // Refresh conflict data
      await fetchConflicts();
      if (selectedConflict) {
        const updatedConflict = await partConflictsAPI.getConflict(
          selectedConflict._id
        );
        const updatedData = updatedConflict.data.data;
        setSelectedConflict(updatedData);

        // Refresh real-time stock after update
        if (updatedData.partId) {
          const partId =
            typeof updatedData.partId === "string"
              ? updatedData.partId
              : (updatedData.partId as any)?._id ||
                (updatedData.partId as any)?.id;
          if (partId) {
            fetchRealTimeStock(partId).then((stock) => {
              setCurrentStock(stock);
            });
          }
        }

        // Only fetch suggestions if conflict is still pending
        if (updatedData.status === "pending" && updatedData._id) {
          fetchSuggestions(updatedData._id);
        } else {
          setSuggestions(null);
        }
      }
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast.error(error.response?.data?.message || "Không thể duyệt yêu cầu");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectClick = (requestId: string) => {
    setRejectRequestId(requestId);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedConflict || !rejectRequestId) return;

    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      setProcessingRequestId(rejectRequestId);
      await partConflictsAPI.rejectRequest(selectedConflict._id, {
        requestId: rejectRequestId,
        reason: rejectReason,
      });

      toast.success(
        `❌ Đã từ chối yêu cầu. Phiếu được chuyển sang trạng thái "pending_parts_restock".`
      );

      // Close modal and reset
      setShowRejectModal(false);
      setRejectRequestId(null);
      setRejectReason("");

      // Refresh conflict data
      await fetchConflicts();
      if (selectedConflict) {
        const updatedConflict = await partConflictsAPI.getConflict(
          selectedConflict._id
        );
        const updatedData = updatedConflict.data.data;
        setSelectedConflict(updatedData);

        // Refresh real-time stock after update
        if (updatedData.partId) {
          const partId =
            typeof updatedData.partId === "string"
              ? updatedData.partId
              : (updatedData.partId as any)?._id ||
                (updatedData.partId as any)?.id;
          if (partId) {
            fetchRealTimeStock(partId).then((stock) => {
              setCurrentStock(stock);
            });
          }
        }

        // Only fetch suggestions if conflict is still pending
        if (updatedData.status === "pending" && updatedData._id) {
          fetchSuggestions(updatedData._id);
        } else {
          setSuggestions(null);
        }
      }
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast.error(error.response?.data?.message || "Không thể từ chối yêu cầu");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: "bg-red-100 text-red-800 border-red-300",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      normal: "bg-lime-100 text-lime-800 border-lime-300",
      low: "bg-gray-100 text-gray-800 border-gray-300",
    };
    const labels = {
      urgent: "Khẩn cấp",
      high: "Cao",
      normal: "Bình thường",
      low: "Thấp",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${
          colors[priority as keyof typeof colors] || colors.normal
        }`}
      >
        {labels[priority as keyof typeof labels] || priority}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      approved: "bg-green-100 text-green-800 border-green-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
      deferred: "bg-gray-100 text-gray-800 border-gray-300",
    };
    const labels = {
      pending: "Đang chờ",
      approved: "Đã duyệt",
      rejected: "Đã từ chối",
      deferred: "Hoãn lại",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${
          colors[status as keyof typeof colors] || colors.pending
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const isRequestSuggested = (requestId: string): boolean => {
    return (
      suggestions?.suggested.some((s) => s.requestId === requestId) || false
    );
  };

  const getSuggestionReason = (requestId: string): string | undefined => {
    return suggestions?.suggested.find((s) => s.requestId === requestId)
      ?.reasoning;
  };

  const canApproveRequest = (request: ConflictingRequest): boolean => {
    // Can't approve if already approved or rejected
    if (request.status === "approved" || request.status === "rejected") {
      return false;
    }
    // Can approve if stock is sufficient
    return currentStock >= request.requestedQuantity;
  };

  if (user?.role !== "staff" && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg text-white mb-2">Không có quyền truy cập</h3>
          <p className="text-text-muted">
            Trang này chỉ dành cho nhân viên và quản trị viên.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-600 mx-auto"></div>
          <p className="mt-4 text-text-muted">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Quản lý xung đột phụ tùng
          </h1>
          <p className="mt-2 text-text-secondary">
            Giải quyết các xung đột khi nhiều đơn hàng cùng yêu cầu một phụ tùng
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 rounded-md text-sm ${
                filter === "pending"
                  ? "bg-lime-600 text-white"
                  : "bg-dark-300 text-text-secondary hover:bg-dark-100"
              }`}
            >
              Đang chờ ({conflicts.filter((c) => c.status === "pending").length}
              )
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-md text-sm ${
                filter === "all"
                  ? "bg-lime-600 text-white"
                  : "bg-dark-300 text-text-secondary hover:bg-dark-100"
              }`}
            >
              Tất cả ({conflicts.length})
            </button>
          </div>
          <button
            onClick={fetchConflicts}
            className="px-4 py-2 border border-dark-300 rounded-md text-sm text-text-secondary bg-dark-300 hover:bg-dark-900 transition-all duration-200"
          >
            <FunnelIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Conflicts List */}
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <div
              key={conflict._id}
              className="bg-dark-300 border border-dark-200 rounded-lg p-6 hover:border-lime-600 transition-colors cursor-pointer"
              onClick={() => handleConflictSelect(conflict)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <h3 className="text-lg text-white">
                      {conflict.conflictNumber}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                        conflict.status === "pending"
                          ? "bg-yellow-600 text-yellow-100"
                          : conflict.status === "resolved"
                          ? "bg-green-600 text-green-100"
                          : "bg-blue-600 text-blue-100"
                      }`}
                    >
                      {conflict.status === "pending"
                        ? "Đang chờ"
                        : conflict.status === "resolved"
                        ? "Đã giải quyết"
                        : "Tự động giải quyết"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-text-muted mb-1">Phụ tùng</p>
                      <p className="text-sm text-white font-semibold">
                        {conflict.partName}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Mã: {conflict.partNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted mb-1">
                        Tồn kho / Yêu cầu
                      </p>
                      <p className="text-sm text-white">
                        {getAvailableStock(conflict)} /{" "}
                        {conflict.totalRequested}
                      </p>
                      <p className="text-xs text-red-400">
                        Thiếu: {conflict.shortfall}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted mb-1">
                        Số yêu cầu xung đột
                      </p>
                      <p className="text-sm text-white font-semibold">
                        {conflict.conflictingRequests.length} yêu cầu
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-text-secondary">
                    <ClockIcon className="h-4 w-4" />
                    <span>
                      Tạo lúc: {formatVietnameseDateTime(conflict.createdAt)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConflictSelect(conflict);
                  }}
                  className="ml-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm text-black font-semibold bg-lime-600 hover:bg-lime-500 transition-all duration-200"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          ))}

          {conflicts.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              <CheckCircleIcon className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-white">
                Không có xung đột nào cần giải quyết.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Resolution Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 bg-dark-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-dark-200 w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-dark-300">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-white">
                  Giải quyết xung đột - {selectedConflict.conflictNumber}
                </h3>
                <button
                  onClick={() => {
                    setSelectedConflict(null);
                    setSuggestions(null);
                  }}
                  className="text-text-muted hover:text-text-secondary"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Part Info with Real-time Stock */}
              <div className="mb-6 p-4 bg-dark-900 rounded-lg border-l-4 border-lime-600">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-text-muted mb-1">Phụ tùng</p>
                    <p className="text-sm text-white font-semibold">
                      {selectedConflict.partName}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Mã: {selectedConflict.partNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-1">
                      Tồn kho khả dụng (Real-time)
                    </p>
                    <p className="text-2xl text-lime-400 font-bold">
                      {currentStock}
                    </p>
                    <p className="text-xs text-text-secondary">đơn vị</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-1">Tổng yêu cầu</p>
                    <p className="text-sm text-white">
                      {selectedConflict.totalRequested} đơn vị
                    </p>
                    <p className="text-xs text-red-400">
                      Thiếu: {selectedConflict.shortfall} đơn vị
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-suggestion Banner */}
              {suggestions && suggestions.suggested.length > 0 && (
                <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-600 rounded-lg">
                  <div className="flex items-start">
                    <SparklesIcon className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-300 font-semibold mb-2">
                        💡 Đề xuất tự động (dựa trên ưu tiên & thời gian hẹn):
                      </p>
                      <ul className="text-xs text-blue-200 space-y-1">
                        {suggestions.suggested.map((s) => (
                          <li key={s.requestId}>
                            •{" "}
                            <span className="font-semibold">
                              {s.receptionNumber}
                            </span>{" "}
                            - {s.reasoning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Conflicting Requests - Individual Cards */}
              <div className="mb-6">
                <h4 className="text-md text-white mb-4">
                  Danh sách yêu cầu xung đột (Giải quyết từng yêu cầu)
                </h4>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedConflict.conflictingRequests.map((request) => {
                    const isSuggested = isRequestSuggested(request.requestId);
                    const suggestionReason = getSuggestionReason(
                      request.requestId
                    );
                    const canApprove = canApproveRequest(request);
                    const isProcessing =
                      processingRequestId === request.requestId;

                    return (
                      <div
                        key={request.requestId}
                        className={`p-4 border-2 rounded-lg ${
                          isSuggested
                            ? "border-blue-500 bg-blue-900 bg-opacity-20"
                            : request.status === "approved"
                            ? "border-green-500 bg-green-900 bg-opacity-20"
                            : request.status === "rejected"
                            ? "border-red-500 bg-red-900 bg-opacity-20"
                            : "border-dark-200 bg-dark-900"
                        }`}
                      >
                        {/* Request Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-white">
                              #
                              {request.appointmentNumber ||
                                request.appointmentId?.appointmentNumber}
                            </span>
                            {isSuggested && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-600 text-blue-100 border border-blue-400">
                                <SparklesIcon className="h-3 w-3 mr-1" />
                                Đề xuất
                              </span>
                            )}
                            {getPriorityBadge(request.priority)}
                            {getStatusBadge(request.status)}
                          </div>
                        </div>

                        {/* Request Details */}
                        <div className="grid grid-cols-2 gap-2 text-sm text-text-secondary mb-3">
                          <div>
                            <span className="text-text-muted">
                              Khách hàng:{" "}
                            </span>
                            <span className="text-white">
                              {request.customerId?.firstName}{" "}
                              {request.customerId?.lastName}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted">Số lượng: </span>
                            <span className="text-white font-semibold">
                              {request.requestedQuantity}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted">
                              Thời gian hẹn:{" "}
                            </span>
                            <span className="text-white">
                              {new Date(
                                request.scheduledDate
                              ).toLocaleDateString("vi-VN", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              })}{" "}
                              {request.scheduledTime}
                            </span>
                          </div>
                          {request.technicianId && (
                            <div>
                              <span className="text-text-muted">
                                Kỹ thuật viên:{" "}
                              </span>
                              <span className="text-white">
                                {request.technicianId.firstName}{" "}
                                {request.technicianId.lastName}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Suggestion Reasoning */}
                        {isSuggested && suggestionReason && (
                          <div className="mb-3 p-2 bg-blue-800 bg-opacity-30 rounded border border-blue-700">
                            <p className="text-xs text-blue-200">
                              💡{" "}
                              <span className="font-semibold">
                                Lý do đề xuất:
                              </span>{" "}
                              {suggestionReason}
                            </p>
                          </div>
                        )}

                        {/* Resolution Notes (if rejected) */}
                        {request.resolutionNotes && (
                          <div className="mb-3 p-2 bg-gray-800 bg-opacity-50 rounded border border-gray-700">
                            <p className="text-xs text-gray-300">
                              📝 <span className="font-semibold">Ghi chú:</span>{" "}
                              {request.resolutionNotes}
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {request.status === "pending" && (
                          <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-dark-200">
                            <button
                              onClick={() =>
                                handleRejectClick(request.requestId)
                              }
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-xs border border-red-600 text-red-400 rounded-md hover:bg-red-900 hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                              <XMarkIcon className="h-3 w-3 mr-1" />
                              Từ chối
                            </button>
                            <button
                              onClick={() =>
                                handleApproveClick(request.requestId)
                              }
                              disabled={!canApprove || isProcessing}
                              className={`px-3 py-1.5 text-xs rounded-md flex items-center ${
                                canApprove
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : "bg-gray-600 text-gray-400 cursor-not-allowed"
                              } disabled:opacity-50`}
                              title={
                                !canApprove
                                  ? `Không đủ tồn kho (cần ${request.requestedQuantity}, còn ${currentStock})`
                                  : "Phê duyệt yêu cầu này"
                              }
                            >
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              {isProcessing ? "Đang xử lý..." : "Phê duyệt"}
                            </button>
                          </div>
                        )}

                        {/* Already processed indicator */}
                        {request.status === "approved" && (
                          <div className="flex items-center justify-center mt-3 pt-3 border-t border-dark-200">
                            <span className="text-xs text-green-400 flex items-center">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Đã được phê duyệt
                            </span>
                          </div>
                        )}
                        {request.status === "rejected" && (
                          <div className="flex items-center justify-center mt-3 pt-3 border-t border-dark-200">
                            <span className="text-xs text-red-400 flex items-center">
                              <XCircleIcon className="h-4 w-4 mr-1" />
                              Đã bị từ chối
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSelectedConflict(null);
                    setSuggestions(null);
                  }}
                  className="px-4 py-2 border border-dark-300 rounded-md text-sm text-text-secondary bg-dark-300 hover:bg-dark-900"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Confirmation Modal */}
      {showApproveModal && approveRequestId && (
        <div className="fixed inset-0 bg-dark-900 bg-opacity-90 flex items-center justify-center z-[60]">
          <div className="bg-dark-300 border border-green-600 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
              <h3 className="text-lg text-white font-semibold">
                Xác nhận phê duyệt yêu cầu
              </h3>
            </div>
            <p className="text-text-secondary mb-4">
              Bạn có chắc chắn muốn phê duyệt yêu cầu này không?
              <br />
              <span className="text-yellow-400 text-sm">
                ⚠️ Phiếu sẽ chuyển trạng thái sang "approved" và bỏ qua tab
                duyệt phiếu.
              </span>
            </p>
            <div className="mb-4">
              <label className="block text-sm text-text-muted mb-2">
                Ghi chú (tùy chọn)
              </label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                rows={3}
                className="w-full bg-dark-900 text-white border border-dark-200 rounded-md px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-400"
                placeholder="Nhập ghi chú về quyết định phê duyệt..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApproveRequestId(null);
                  setApproveNotes("");
                }}
                className="px-4 py-2 border border-dark-300 rounded-md text-sm text-text-secondary bg-dark-300 hover:bg-dark-900"
              >
                Hủy
              </button>
              <button
                onClick={handleApproveConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 flex items-center"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Xác nhận phê duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && rejectRequestId && (
        <div className="fixed inset-0 bg-dark-900 bg-opacity-90 flex items-center justify-center z-[60]">
          <div className="bg-dark-300 border border-red-600 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <XCircleIcon className="h-8 w-8 text-red-500 mr-3" />
              <h3 className="text-lg text-white font-semibold">
                Từ chối yêu cầu
              </h3>
            </div>
            <p className="text-text-secondary mb-4">
              Vui lòng nhập lý do từ chối yêu cầu này:
              <br />
              <span className="text-yellow-400 text-sm">
                ⚠️ Phiếu sẽ chuyển sang trạng thái "pending_parts_restock".
              </span>
            </p>
            <div className="mb-4">
              <label className="block text-sm text-text-muted mb-2">
                Lý do từ chối *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full bg-dark-900 text-white border border-dark-200 rounded-md px-3 py-2 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-400"
                placeholder="Ví dụ: Không đủ tồn kho, đang chờ nhập hàng..."
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectRequestId(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 border border-dark-300 rounded-md text-sm text-text-secondary bg-dark-300 hover:bg-dark-900"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartConflictManagementPage;
