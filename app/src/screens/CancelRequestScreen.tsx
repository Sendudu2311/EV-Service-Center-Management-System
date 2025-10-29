import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { appointmentsAPI, uploadAPI } from "../services/api";
import { RootStackParamList } from "../navigation/RootNavigator";

type CancelRequestScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "CancelRequest"
>;
type CancelRequestScreenRouteProp = RouteProp<
  RootStackParamList,
  "CancelRequest"
>;

const CANCEL_REASONS = [
  { value: "schedule_conflict", label: "Xung đột lịch trình" },
  { value: "vehicle_issue", label: "Vấn đề về phương tiện" },
  { value: "service_not_needed", label: "Không còn cần dịch vụ" },
  { value: "found_alternative", label: "Đã tìm được lựa chọn khác" },
  { value: "financial_reason", label: "Lý do tài chính" },
  { value: "emergency", label: "Trường hợp khẩn cấp" },
  { value: "dissatisfied_service", label: "Không hài lòng với dịch vụ" },
  { value: "other", label: "Lý do khác" },
];

// Map enum values to Vietnamese text (matching web version)
const REASON_MAP: Record<string, string> = {
  schedule_conflict: "Thay đổi kế hoạch",
  vehicle_issue: "Xe gặp sự cố khác",
  service_not_needed: "Không còn cần dịch vụ",
  found_alternative: "Tìm được dịch vụ khác",
  financial_reason: "Lý do cá nhân",
  emergency: "Trường hợp khẩn cấp",
  dissatisfied_service: "Không hài lòng với dịch vụ",
};

const CancelRequestScreen: React.FC = () => {
  const navigation = useNavigation<CancelRequestScreenNavigationProp>();
  const route = useRoute<CancelRequestScreenRouteProp>();
  const { appointment } = route.params;
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "bank_transfer">(
    "cash"
  );
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);

  useEffect(() => {
    // Calculate refund amount based on 24h rule
    calculateRefundAmount();
  }, []);

  const calculateRefundAmount = () => {
    const depositAmount = appointment.depositInfo?.amount || 200000;
    const scheduledDateTime = new Date(
      `${appointment.scheduledDate} ${appointment.scheduledTime}`
    );
    const now = new Date();
    const hoursUntilAppointment =
      (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 100% refund if > 24h, 80% if <= 24h
    const refundPercentage = hoursUntilAppointment > 24 ? 100 : 80;
    const calculatedRefund = (depositAmount * refundPercentage) / 100;
    setRefundAmount(calculatedRefund);
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Lỗi", "Cần cấp quyền truy cập thư viện ảnh");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setQrCodeImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedReason) {
      Alert.alert("Lỗi", "Vui lòng chọn lý do hủy");
      return;
    }

    if (selectedReason === "other" && !otherReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do khác");
      return;
    }

    if (refundMethod === "bank_transfer") {
      if (!accountName.trim() || !accountNumber.trim() || !bankName.trim()) {
        Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin tài khoản");
        return;
      }
      if (!qrCodeImage) {
        Alert.alert("Lỗi", "Vui lòng upload ảnh QR code tài khoản");
        return;
      }
    }

    setLoading(true);
    try {
      // Map reason to Vietnamese text (matching web version)
      let reasonText: string;
      if (selectedReason === "other") {
        // If "other", use the custom reason text
        reasonText = otherReason.trim();
      } else {
        // Map enum value to Vietnamese text
        reasonText = REASON_MAP[selectedReason] || selectedReason;
      }

      // Upload image first if bank_transfer method (matching web version)
      let uploadedImageUrl: string | undefined;
      if (refundMethod === "bank_transfer" && qrCodeImage) {
        try {
          const uploadResponse = await uploadAPI.uploadImage(
            qrCodeImage,
            `Bank proof image for appointment ${appointment.appointmentNumber}`
          );
          // Axios wraps response in .data, backend returns: { success: true, imageUrl: string, publicId: string }
          uploadedImageUrl = uploadResponse.data?.imageUrl;
          if (!uploadedImageUrl) {
            throw new Error("Failed to upload image");
          }
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          Alert.alert("Lỗi", "Không thể upload ảnh. Vui lòng thử lại.");
          setLoading(false);
          return;
        }
      }

      // Build API payload with correct field names (matching backend/web)
      const cancelData: {
        reason: string;
        refundMethod: "cash" | "bank_transfer";
        customerBankInfo?: {
          bankName: string;
          accountNumber: string;
          accountHolder: string;
        };
        customerBankProofImage?: string;
      } = {
        reason: reasonText,
        refundMethod,
      };

      // Add bank transfer info if method is bank_transfer
      if (refundMethod === "bank_transfer") {
        cancelData.customerBankInfo = {
          bankName,
          accountNumber,
          accountHolder: accountName, // Map accountName → accountHolder
        };
        cancelData.customerBankProofImage = uploadedImageUrl; // Use uploaded image URL
      }

      await appointmentsAPI.requestCancellation(appointment._id, cancelData);

      Alert.alert(
        "Thành công",
        "Yêu cầu hủy lịch hẹn đã được gửi. Chúng tôi sẽ xử lý và thông báo kết quả sớm nhất có thể.",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
              // Navigate to Appointments tab in MainTabs to refresh
              // Note: Appointments is in MainTabs, not in RootStack
              setTimeout(() => {
                navigation.navigate(
                  "Main" as never,
                  {
                    screen: "Appointments",
                    params: { refresh: true },
                  } as never
                );
              }, 100);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error requesting cancellation:", error);
      Alert.alert(
        "Lỗi",
        error instanceof Error
          ? error.message
          : "Không thể gửi yêu cầu hủy. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yêu cầu hủy lịch hẹn</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Refund Amount Info */}
        <View style={styles.refundInfoCard}>
          <View style={styles.refundHeader}>
            <Ionicons name="cash-outline" size={24} color="#10B981" />
            <Text style={styles.refundLabel}>Số tiền hoàn dự kiến</Text>
          </View>
          <Text style={styles.refundAmount}>
            {formatCurrency(refundAmount)}
          </Text>
          <Text style={styles.refundNote}>
            {refundAmount === (appointment.depositInfo?.amount || 200000)
              ? "✓ Hoàn 100% (hủy trước 24h)"
              : "✓ Hoàn 80% (hủy trong vòng 24h)"}
          </Text>
        </View>

        {/* Cancel Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Lý do hủy <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.reasonContainer}>
            {CANCEL_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonButton,
                  selectedReason === reason.value && styles.reasonButtonActive,
                ]}
                onPress={() => setSelectedReason(reason.value)}
              >
                <Ionicons
                  name={
                    selectedReason === reason.value
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={20}
                  color={
                    selectedReason === reason.value ? "#84CC16" : "#9CA3AF"
                  }
                />
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason.value && styles.reasonTextActive,
                  ]}
                >
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedReason === "other" && (
            <TextInput
              style={styles.textArea}
              placeholder="Nhập lý do chi tiết..."
              placeholderTextColor="#6B7280"
              value={otherReason}
              onChangeText={setOtherReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          )}
        </View>

        {/* Refund Method */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Phương thức hoàn tiền <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.methodContainer}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                refundMethod === "cash" && styles.methodButtonActive,
              ]}
              onPress={() => setRefundMethod("cash")}
            >
              <Ionicons
                name="cash"
                size={24}
                color={refundMethod === "cash" ? "#84CC16" : "#9CA3AF"}
              />
              <Text
                style={[
                  styles.methodText,
                  refundMethod === "cash" && styles.methodTextActive,
                ]}
              >
                Tiền mặt
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodButton,
                refundMethod === "bank_transfer" && styles.methodButtonActive,
              ]}
              onPress={() => setRefundMethod("bank_transfer")}
            >
              <Ionicons
                name="card"
                size={24}
                color={refundMethod === "bank_transfer" ? "#84CC16" : "#9CA3AF"}
              />
              <Text
                style={[
                  styles.methodText,
                  refundMethod === "bank_transfer" && styles.methodTextActive,
                ]}
              >
                Chuyển khoản
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bank Account Info (if bank_transfer) */}
        {refundMethod === "bank_transfer" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Thông tin tài khoản <Text style={styles.required}>*</Text>
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Tên chủ tài khoản"
              placeholderTextColor="#6B7280"
              value={accountName}
              onChangeText={setAccountName}
            />

            <TextInput
              style={styles.input}
              placeholder="Số tài khoản"
              placeholderTextColor="#6B7280"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Tên ngân hàng"
              placeholderTextColor="#6B7280"
              value={bankName}
              onChangeText={setBankName}
            />

            {/* QR Code Upload */}
            <View style={styles.qrUploadContainer}>
              <Text style={styles.qrLabel}>
                Ảnh QR Code tài khoản <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={32}
                  color="#84CC16"
                />
                <Text style={styles.uploadText}>
                  {qrCodeImage ? "Thay đổi ảnh" : "Chọn ảnh"}
                </Text>
              </TouchableOpacity>

              {qrCodeImage && (
                <Image
                  source={{ uri: qrCodeImage }}
                  style={styles.qrPreview}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
        )}

        {/* Notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.noticeText}>
            Sau khi gửi yêu cầu hủy, staff sẽ xem xét và thông báo kết quả cho
            bạn. Thời gian xử lý thường từ 1-3 ngày làm việc.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Gửi yêu cầu hủy</Text>
          )}
        </TouchableOpacity>
      </View>
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
  backButton: {
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
  refundInfoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#10B981",
  },
  refundHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  refundLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
  },
  refundAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#10B981",
    marginBottom: 8,
  },
  refundNote: {
    fontSize: 14,
    color: "#374151",
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  required: {
    color: "#EF4444",
  },
  reasonContainer: {
    gap: 12,
  },
  reasonButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  reasonButtonActive: {
    borderColor: "#84CC16",
    backgroundColor: "#F9FAFB",
  },
  reasonText: {
    marginLeft: 12,
    fontSize: 14,
    color: "#374151",
  },
  reasonTextActive: {
    color: "#111827",
    fontWeight: "500",
  },
  textArea: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    color: "#111827",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 12,
    minHeight: 100,
  },
  methodContainer: {
    flexDirection: "row",
    gap: 12,
  },
  methodButton: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  methodButtonActive: {
    borderColor: "#84CC16",
    backgroundColor: "#F9FAFB",
  },
  methodText: {
    marginTop: 8,
    fontSize: 14,
    color: "#374151",
  },
  methodTextActive: {
    color: "#111827",
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    color: "#111827",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  qrUploadContainer: {
    marginTop: 8,
  },
  qrLabel: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  uploadButton: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    color: "#84CC16",
    fontWeight: "500",
  },
  qrPreview: {
    width: "100%",
    height: 200,
    marginTop: 12,
    borderRadius: 8,
  },
  noticeCard: {
    flexDirection: "row",
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  noticeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  submitButton: {
    backgroundColor: "#84CC16",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default CancelRequestScreen;
