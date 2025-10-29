import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { appointmentsAPI } from "../services/api";
import CancelRequestStatusCard from "../components/CancelRequestStatusCard";
import { RootStackParamList } from "../navigation/RootNavigator";

type AppointmentDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "AppointmentDetails"
>;
type AppointmentDetailsScreenRouteProp = RouteProp<
  RootStackParamList,
  "AppointmentDetails"
>;

const AppointmentDetailsScreen: React.FC = () => {
  const navigation = useNavigation<AppointmentDetailsScreenNavigationProp>();
  const route = useRoute<AppointmentDetailsScreenRouteProp>();
  const { appointmentId } = route.params;
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAppointmentDetails();
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      const response = await appointmentsAPI.getById(appointmentId);
      setAppointment(response.data?.data);
    } catch (error) {
      console.error("Error fetching appointment details:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin lịch hẹn");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointmentDetails();
  };

  const handleCancelRequest = () => {
    // Check if can cancel
    if (
      !["pending", "confirmed"].includes(appointment.status) ||
      appointment.cancelRequest
    ) {
      Alert.alert("Thông báo", "Lịch hẹn này không thể hủy");
      return;
    }

    navigation.navigate("CancelRequest", { appointment });
  };

  const getStatusBadge = (status: string) => {
    // Web version logic: check refundProcessedAt for cancelled status
    let badgeLabel = "";
    let badgeColor = "#FFFFFF";
    let badgeBgColor = "#6B7280";

    switch (status) {
      case "pending":
        badgeLabel = "Chờ xác nhận";
        badgeColor = "#FFFFFF";
        badgeBgColor = "#F59E0B";
        break;
      case "confirmed":
        badgeLabel = "Đã xác nhận";
        badgeColor = "#111827"; // text-dark-900 (web: bg-lime-200 text-dark-900)
        badgeBgColor = "#D9F99D"; // bg-lime-200
        break;
      case "customer_arrived":
        badgeLabel = "Khách đã đến";
        badgeColor = "#FFFFFF";
        badgeBgColor = "#4B5563"; // bg-dark-600
        break;
      case "reception_created":
        badgeLabel = "Đã tạo phiếu tiếp nhận";
        badgeColor = "#FFFFFF";
        badgeBgColor = "#9333EA"; // bg-purple-600
        break;
      case "reception_approved":
        badgeLabel = "Đã duyệt phiếu";
        badgeColor = "#111827";
        badgeBgColor = "#D9F99D"; // bg-lime-200
        break;
      case "in_progress":
        badgeLabel = "Đang thực hiện";
        badgeColor = "#FFFFFF";
        badgeBgColor = "#F59E0B";
        break;
      case "completed":
        badgeLabel = "Hoàn thành";
        badgeColor = "#FFFFFF";
        badgeBgColor = "#16A34A"; // bg-green-600
        break;
      case "invoiced":
        badgeLabel = "Đã xuất hóa đơn";
        badgeColor = "#FFFFFF";
        badgeBgColor = "#6B7280"; // bg-text-muted
        break;
      case "cancelled":
        // Web logic: check if refundProcessedAt exists
        if (appointment?.cancelRequest?.refundProcessedAt) {
          badgeLabel = "Đã hủy và hoàn tiền";
        } else {
          badgeLabel = "Đã hủy";
        }
        badgeColor = "#FFFFFF";
        badgeBgColor = "#DC2626"; // bg-red-600
        break;
      case "cancel_requested":
        badgeLabel = "Yêu cầu hủy";
        badgeColor = "#FFFFFF";
        badgeBgColor = "#F59E0B";
        break;
      case "cancel_approved":
        badgeLabel = "Đã duyệt hủy";
        badgeColor = "#FFFFFF";
        badgeBgColor = "#F59E0B";
        break;
      case "cancel_refunded":
        badgeLabel = "Đã hoàn tiền";
        badgeColor = "#FFFFFF";
        badgeBgColor = "#16A34A"; // bg-green-600 (web)
        break;
      default:
        badgeLabel = status;
        badgeColor = "#FFFFFF";
        badgeBgColor = "#6B7280";
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: badgeBgColor }]}>
        <Text style={[styles.statusText, { color: badgeColor }]}>
          {badgeLabel}
        </Text>
      </View>
    );
  };

  const formatDateTime = (date: string, time?: string) => {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString("vi-VN");
    return time ? `${dateStr} lúc ${time}` : dateStr;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#84CC16" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Không tìm thấy lịch hẹn</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canCancel =
    ["pending", "confirmed"].includes(appointment.status) &&
    !appointment.cancelRequest;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết lịch hẹn</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#84CC16"
          />
        }
      >
        {/* Appointment Number & Status */}
        <View style={styles.topCard}>
          <Text style={styles.appointmentNumber}>
            {appointment.appointmentNumber}
          </Text>
          {getStatusBadge(appointment.status)}
        </View>

        {/* Cancel Request Status - Only show if actually has cancel request data */}
        {appointment.cancelRequest &&
          appointment.cancelRequest.requestedAt &&
          (appointment.status === "cancel_requested" ||
            appointment.status === "cancel_approved" ||
            appointment.status === "cancelled") && (
            <CancelRequestStatusCard
              cancelRequest={appointment.cancelRequest}
              status={appointment.status}
            />
          )}

        {/* Basic Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={20} color="#84CC16" />
            <Text style={styles.cardTitle}>Thông tin cơ bản</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày hẹn:</Text>
            <Text style={styles.infoValue}>
              {formatDateTime(
                appointment.scheduledDate,
                appointment.scheduledTime
              )}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Độ ưu tiên:</Text>
            <Text
              style={[
                styles.infoValue,
                appointment.priority === "high" && { color: "#EF4444" },
                appointment.priority === "medium" && { color: "#F59E0B" },
                appointment.priority === "normal" && { color: "#10B981" },
              ]}
            >
              {appointment.priority === "high" && "Cao"}
              {appointment.priority === "medium" && "Trung bình"}
              {appointment.priority === "normal" && "Bình thường"}
            </Text>
          </View>
        </View>

        {/* Vehicle Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="car-outline" size={20} color="#84CC16" />
            <Text style={styles.cardTitle}>Thông tin xe</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Xe:</Text>
            <Text style={styles.infoValue}>
              {appointment.vehicleId?.make} {appointment.vehicleId?.model} (
              {appointment.vehicleId?.year})
            </Text>
          </View>
          {appointment.vehicleId?.licensePlate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Biển số:</Text>
              <Text style={styles.infoValue}>
                {appointment.vehicleId.licensePlate}
              </Text>
            </View>
          )}
        </View>

        {/* Services */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="construct-outline" size={20} color="#84CC16" />
            <Text style={styles.cardTitle}>Dịch vụ đã đặt</Text>
          </View>
          {appointment.services && appointment.services.length > 0 ? (
            appointment.services.map((service: any, index: number) => (
              <View key={index} style={styles.serviceItem}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>
                    {service.serviceId?.name || "Dịch vụ không xác định"}
                  </Text>
                  <Text style={styles.serviceDetail}>
                    Thời gian: {service.estimatedDuration} phút
                  </Text>
                </View>
                <View style={styles.servicePricing}>
                  <Text style={styles.servicePrice}>
                    {formatCurrency(service.price)}
                  </Text>
                  <Text style={styles.serviceQuantity}>
                    SL: {service.quantity}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>Chưa có dịch vụ</Text>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(appointment.totalAmount || 0)}
            </Text>
          </View>
        </View>

        {/* Customer Notes */}
        {appointment.customerNotes && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbox-outline" size={20} color="#84CC16" />
              <Text style={styles.cardTitle}>Ghi chú khách hàng</Text>
            </View>
            <Text style={styles.notesText}>{appointment.customerNotes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer - Cancel Button */}
      {canCancel && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelRequest}
          >
            <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.cancelButtonText}>Yêu cầu hủy lịch hẹn</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#9CA3AF",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#EF4444",
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#84CC16",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  topCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  appointmentNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  serviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 4,
  },
  serviceDetail: {
    fontSize: 12,
    color: "#6B7280",
  },
  servicePricing: {
    alignItems: "flex-end",
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  serviceQuantity: {
    fontSize: 12,
    color: "#6B7280",
  },
  noDataText: {
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#84CC16",
  },
  notesText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    borderRadius: 8,
    padding: 16,
  },
  cancelButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default AppointmentDetailsScreen;
