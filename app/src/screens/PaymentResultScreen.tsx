import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { appointmentsAPI } from "../services/api";

interface PaymentResultRouteParams {
  success?: string;
  transactionRef?: string;
  amount?: string;
  error?: string;
}

type PaymentResultRouteProp = RouteProp<
  { params: PaymentResultRouteParams },
  "params"
>;

const PaymentResultScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PaymentResultRouteProp>();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [paymentInfo, setPaymentInfo] = useState<{
    success: boolean;
    transactionRef?: string;
    amount?: string;
    error?: string;
  } | null>(null);
  const [appointmentCreated, setAppointmentCreated] = useState(false);

  // Release slot when payment fails
  const releaseSlotOnPaymentFailure = async () => {
    try {
      const pendingDataStr = await AsyncStorage.getItem("pendingAppointment");
      if (pendingDataStr) {
        const pendingData = JSON.parse(pendingDataStr);
        if (pendingData.selectedSlotId) {
          // Note: Backend will auto-release expired slots
          console.log("Slot will be auto-released by backend");
        }
      }
    } catch (error) {
      console.error("Error releasing slot:", error);
    }
  };

  // Create appointment after successful payment
  const createAppointmentAfterPayment = useCallback(
    async (paymentData: { transactionRef: string; amount: string }) => {
      try {
        // Get pending appointment data
        const pendingDataStr = await AsyncStorage.getItem("pendingAppointment");
        if (!pendingDataStr) {
          throw new Error("No pending appointment data found");
        }

        const pendingData = JSON.parse(pendingDataStr);

        // Create appointment with payment info
        const appointmentPayload = {
          ...pendingData,
          services: [], // Empty services for deposit booking
          paymentInfo: {
            transactionRef: paymentData.transactionRef,
            paymentMethod: "vnpay",
            depositAmount: parseFloat(paymentData.amount),
            paidAmount: parseFloat(paymentData.amount),
            paymentDate: new Date(),
          },
          depositInfo: {
            amount: 200000,
            paid: true,
            paidAt: new Date(),
          },
          bookingType: "deposit_booking",
          status: "confirmed",
          paymentStatus: "partial",
          ...(pendingData.selectedSlotId && {
            slotId: pendingData.selectedSlotId,
            skipSlotReservation: true, // Slot already reserved
          }),
        };

        const response = await appointmentsAPI.create(appointmentPayload);

        if (response.data?.success) {
          setAppointmentCreated(true);

          // Clean up AsyncStorage
          await AsyncStorage.removeItem("pendingAppointment");
          await AsyncStorage.removeItem("paymentVerified");

          Alert.alert(
            "Thành công",
            "Đặt cọc thành công! Lịch hẹn đã được xác nhận."
          );

          // Navigate back to appointments screen after 2 seconds
          // Note: Appointments is in MainTabs, not in RootStack
          setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: "Main",
                  params: {
                    screen: "Appointments",
                  },
                } as never,
              ],
            });
          }, 2000);
        } else {
          throw new Error("Failed to create appointment");
        }
      } catch (error) {
        console.error("Failed to create appointment:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Không thể tạo lịch hẹn. Vui lòng liên hệ hỗ trợ.";
        Alert.alert("Lỗi", errorMessage);
        setStatus("error");
      }
    },
    [navigation]
  );

  useEffect(() => {
    const params = route.params;

    if (!params) {
      setStatus("error");
      setPaymentInfo({
        success: false,
        error: "No payment parameters found",
      });
      return;
    }

    const { success, transactionRef, amount, error } = params;

    if (error) {
      setStatus("error");
      setPaymentInfo({
        success: false,
        error,
      });
      releaseSlotOnPaymentFailure();
      return;
    }

    if (!success || !transactionRef) {
      setStatus("error");
      setPaymentInfo({
        success: false,
        error: "Invalid payment parameters",
      });
      releaseSlotOnPaymentFailure();
      return;
    }

    const isSuccess = success === "true";

    if (!isSuccess) {
      setStatus("error");
      setPaymentInfo({
        success: false,
        error: "Payment failed",
        transactionRef,
        amount,
      });
      releaseSlotOnPaymentFailure();
      return;
    }

    // Payment successful
    setStatus("loading");
    setPaymentInfo({
      success: true,
      transactionRef,
      amount,
    });

    // Create appointment
    createAppointmentAfterPayment({
      transactionRef,
      amount: amount || "200000",
    });
  }, [route.params, createAppointmentAfterPayment]);

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" as never }],
    });
  };

  const handleViewAppointments = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Appointments" as never }],
    });
  };

  return (
    <View style={styles.container}>
      {status === "loading" && (
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Đang xử lý thanh toán...</Text>
        </View>
      )}

      {status === "success" && appointmentCreated && (
        <View style={styles.content}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
          <Text style={styles.title}>Thanh toán thành công!</Text>
          <Text style={styles.subtitle}>
            Đặt cọc 200,000 VNĐ đã được xác nhận
          </Text>
          {paymentInfo?.transactionRef && (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Mã giao dịch:</Text>
              <Text style={styles.infoValue}>{paymentInfo.transactionRef}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.button}
            onPress={handleViewAppointments}
          >
            <Text style={styles.buttonText}>Xem lịch hẹn</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "error" && (
        <View style={styles.content}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorMark}>✕</Text>
          </View>
          <Text style={styles.title}>Thanh toán thất bại</Text>
          <Text style={styles.subtitle}>
            {paymentInfo?.error || "Đã xảy ra lỗi trong quá trình thanh toán"}
          </Text>
          {paymentInfo?.transactionRef && (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Mã giao dịch:</Text>
              <Text style={styles.infoValue}>{paymentInfo.transactionRef}</Text>
            </View>
          )}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleGoHome}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Về trang chủ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={handleViewAppointments}
            >
              <Text style={styles.buttonText}>Xem lịch hẹn</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  checkmark: {
    fontSize: 48,
    color: "#fff",
    fontWeight: "bold",
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  errorMark: {
    fontSize: 48,
    color: "#fff",
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#374151",
  },
});

export default PaymentResultScreen;
