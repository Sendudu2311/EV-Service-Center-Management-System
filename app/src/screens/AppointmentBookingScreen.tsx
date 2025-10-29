import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  AppState,
  Linking,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  appointmentsAPI,
  vehiclesAPI,
  vnpayAPI,
  slotsAPI,
} from "../services/api";

interface Vehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
}

interface Technician {
  _id: string;
  firstName: string;
  lastName: string;
  specializations?: string[];
  specialization?: string[];
  availability?: {
    status: string;
    workloadPercentage: number;
  };
  performance?: {
    customerRating: number;
    completedJobs: number;
    efficiency: number;
  };
  yearsExperience?: number;
  isRecommended?: boolean;
}

interface Slot {
  _id: string;
  start: string;
  status: string;
  availableCapacity: number;
  capacity?: number;
  bookedCount?: number;
}

interface AppointmentFormProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const AppointmentBookingScreen: React.FC<AppointmentFormProps> = ({
  visible,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [checkingVehicle, setCheckingVehicle] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [reservedSlotId, setReservedSlotId] = useState<string | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    vehicleId: "",
    scheduledDate: "",
    scheduledTime: "08:00",
    customerNotes: "",
    priority: "normal",
    technicianId: null as string | null,
  });

  const appState = useRef(AppState.currentState);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchVehicles();
      generateAvailableDates();

      // Restore reserved slot ID from AsyncStorage if exists
      AsyncStorage.getItem("reservedSlotId").then((slotId) => {
        if (slotId) {
          console.log("📝 Restored reserved slot from storage:", slotId);
          setReservedSlotId(slotId);
        }
      });
    }
  }, [visible]);

  // Listen for app state changes (when user returns from browser)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        console.log(
          "🔄 AppState changed:",
          appState.current,
          "→",
          nextAppState
        );

        // User returned to app from background
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          console.log(
            "✅ App has come to the foreground - checking payment status and restoring state"
          );

          // Restore reserved slot ID if exists
          const storedSlotId = await AsyncStorage.getItem("reservedSlotId");
          if (storedSlotId && !reservedSlotId) {
            console.log(
              "📝 Restored reserved slot on app resume:",
              storedSlotId
            );
            setReservedSlotId(storedSlotId);
          }

          await checkPendingPayment();
        }
        appState.current = nextAppState;
      }
    );

    console.log("👂 AppState listener registered");

    return () => {
      console.log("🔇 AppState listener removed");
      subscription.remove();
    };
  }, []);

  // Cleanup function to release slot if app closes or component unmounts
  const releaseReservedSlot = async (slotId: string | null) => {
    if (!slotId) return;

    try {
      console.log("🔓 Releasing reserved slot:", slotId);
      await slotsAPI.release(slotId);
      console.log("✅ Slot released successfully");
      setReservedSlotId(null);
    } catch (error) {
      console.error("❌ Error releasing slot:", error);
    }
  };

  // Cleanup on unmount or when component becomes invisible - release slot if payment not completed
  useEffect(() => {
    if (!visible && reservedSlotId) {
      // Component is being closed - check if we should release slot
      AsyncStorage.getItem("currentTransactionRef").then((transactionRef) => {
        // Only release if no transaction ref (payment never started)
        // OR if transaction exists but payment not completed
        if (!transactionRef) {
          console.log(
            "🔓 No transaction ref - releasing slot on component close"
          );
          releaseReservedSlot(reservedSlotId);
        } else {
          // Check payment status before releasing
          vnpayAPI
            .checkTransaction(transactionRef)
            .then((response) => {
              const responseData = response.data?.data || response.data;
              if (responseData?.status !== "completed") {
                console.log(
                  "🔓 Payment not completed - releasing slot on component close"
                );
                releaseReservedSlot(reservedSlotId);
              } else {
                console.log("✅ Payment completed - keeping slot");
              }
            })
            .catch(() => {
              // If check fails, release slot to be safe
              console.log(
                "🔓 Check failed - releasing slot on component close"
              );
              releaseReservedSlot(reservedSlotId);
            });
        }
      });
    }
  }, [visible, reservedSlotId]);

  const checkPendingPayment = async () => {
    console.log(
      "💳 checkPendingPayment called, isCheckingPayment:",
      isCheckingPayment
    );

    if (isCheckingPayment) {
      console.log("⏭️ Already checking payment, skipping...");
      return; // Prevent multiple checks
    }

    try {
      const transactionRef = await AsyncStorage.getItem(
        "currentTransactionRef"
      );

      console.log("📝 Transaction ref from storage:", transactionRef);

      if (!transactionRef) {
        console.log("❌ No pending transaction found");
        return;
      }

      console.log(
        "🔍 Checking payment status for transaction:",
        transactionRef
      );
      setIsCheckingPayment(true);
      setLoading(true);

      // Verify payment status
      const verifyResponse = await vnpayAPI.checkTransaction(transactionRef);
      const verifyData = verifyResponse.data?.data || verifyResponse.data;

      console.log(
        "📊 Payment verification response:",
        JSON.stringify(verifyData, null, 2)
      );

      if (verifyData?.success && verifyData?.status === "completed") {
        console.log("✅ Payment successful!");
        console.log("📋 Transaction data:", verifyData);

        // Check if backend already created appointment
        const appointmentId = verifyData?.appointmentId;

        if (appointmentId) {
          console.log(
            "✅ Appointment already created by backend:",
            appointmentId
          );

          // Clean up and show success
          await AsyncStorage.removeItem("pendingAppointment");
          await AsyncStorage.removeItem("currentTransactionRef");

          setLoading(false);
          setIsCheckingPayment(false);

          Alert.alert("Thành công", "Thanh toán và đặt lịch thành công!", [
            {
              text: "Xem lịch hẹn",
              onPress: () => {
                if (onCancel) onCancel();
              },
            },
          ]);
        } else {
          console.log(
            "⚠️ No appointmentId in transaction - creating appointment now..."
          );

          // Get pending appointment data
          const pendingDataStr = await AsyncStorage.getItem(
            "pendingAppointment"
          );
          if (!pendingDataStr) {
            throw new Error("No pending appointment data found");
          }

          const pendingData = JSON.parse(pendingDataStr);
          console.log("📋 Creating appointment with data:", pendingData);

          // Get reserved slot ID from AsyncStorage if not in state
          let slotIdToRelease = reservedSlotId;
          if (!slotIdToRelease) {
            const storedSlotId = await AsyncStorage.getItem("reservedSlotId");
            slotIdToRelease = storedSlotId;
          }

          // Create appointment
          const appointmentPayload = {
            ...pendingData,
            services: [],
            paymentInfo: {
              transactionRef: transactionRef,
              paymentMethod: "vnpay",
              depositAmount: 200000,
              paidAmount: 200000,
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
              skipSlotReservation: true,
            }),
          };

          console.log("📤 Sending appointment creation request...");
          const createResponse = await appointmentsAPI.create(
            appointmentPayload
          );
          console.log("📥 Appointment creation response:", createResponse.data);

          if (createResponse.data?.success) {
            console.log("✅ Appointment created successfully!");

            // Release reserved slot since appointment is created (slot will be reassigned to appointment)
            if (slotIdToRelease) {
              try {
                console.log("🔓 Appointment created - releasing reserved slot");
                await releaseReservedSlot(slotIdToRelease);
              } catch (releaseError) {
                console.error(
                  "Error releasing slot after appointment creation:",
                  releaseError
                );
              }
            }

            // Clean up
            await AsyncStorage.removeItem("pendingAppointment");
            await AsyncStorage.removeItem("currentTransactionRef");
            await AsyncStorage.removeItem("reservedSlotId");
            setReservedSlotId(null);

            setLoading(false);
            setIsCheckingPayment(false);

            Alert.alert("Thành công", "Thanh toán và đặt lịch thành công!", [
              {
                text: "Xem lịch hẹn",
                onPress: () => {
                  if (onCancel) onCancel();
                },
              },
            ]);
          } else {
            // If appointment creation fails, release slot
            if (slotIdToRelease) {
              try {
                await releaseReservedSlot(slotIdToRelease);
              } catch (releaseError) {
                console.error(
                  "Error releasing slot after appointment creation failure:",
                  releaseError
                );
              }
            }

            throw new Error(
              createResponse.data?.message || "Failed to create appointment"
            );
          }
        }
      } else {
        console.log(
          "❌ Payment not completed yet or failed. Status:",
          verifyData?.status
        );

        // Release slot if payment failed or not completed
        if (reservedSlotId) {
          try {
            console.log("🔓 Payment failed - releasing reserved slot");
            await releaseReservedSlot(reservedSlotId);
          } catch (error) {
            console.error("Error releasing slot:", error);
          }
        }

        // Clean up AsyncStorage
        await AsyncStorage.removeItem("pendingAppointment");
        await AsyncStorage.removeItem("currentTransactionRef");
        await AsyncStorage.removeItem("reservedSlotId");
        setReservedSlotId(null);

        setLoading(false);
        setIsCheckingPayment(false);

        Alert.alert(
          "Thanh toán chưa hoàn tất",
          "Vui lòng thử lại hoặc chọn khung giờ khác.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("❌ Error checking payment:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));

      // Release slot on error
      if (reservedSlotId) {
        try {
          console.log("🔓 Error checking payment - releasing reserved slot");
          await releaseReservedSlot(reservedSlotId);
        } catch (releaseError) {
          console.error("Error releasing slot:", releaseError);
        }
      }

      setLoading(false);
      setIsCheckingPayment(false);

      // Show error to user
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Không thể kiểm tra trạng thái thanh toán";

      Alert.alert(
        "Lỗi",
        `${errorMessage}\n\nVui lòng kiểm tra mục "Lịch hẹn" để xem lịch đã được tạo chưa.`,
        [
          {
            text: "Xem lịch hẹn",
            onPress: () => {
              if (onCancel) onCancel();
            },
          },
          { text: "OK" },
        ]
      );
    }
  };

  const generateAvailableDates = () => {
    const dates: string[] = [];
    const today = new Date();

    // Generate next 14 days
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const formattedDate = date.toISOString().split("T")[0];
      dates.push(formattedDate);
    }

    setAvailableDates(dates);
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() === today.getTime()) {
      return "Hôm nay";
    } else if (target.getTime() === tomorrow.getTime()) {
      return "Ngày mai";
    }

    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("vi-VN", options);
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayNames = [
      "Chủ nhật",
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
    ];
    return dayNames[date.getDay()];
  };

  const getShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const fetchVehicles = async () => {
    try {
      const response = await vehiclesAPI.getAll();
      const vehicleData = (response.data?.data || response.data || []) as any;
      setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setVehicles([]);
    }
  };

  // Fetch slots when date is selected
  useEffect(() => {
    if (formData.scheduledDate) {
      fetchSlots();
    } else {
      setSlots([]);
      setSelectedSlotId(null);
      setFormData((prev) => ({ ...prev, technicianId: null }));
    }
  }, [formData.scheduledDate]);

  // Fetch technicians when slot is selected
  useEffect(() => {
    if (selectedSlotId) {
      fetchTechnicians();
    } else {
      setTechnicians([]);
      setFormData((prev) => ({ ...prev, technicianId: null }));
    }
  }, [selectedSlotId]);

  const fetchTechnicians = async () => {
    if (!selectedSlotId) return;

    try {
      const response = await appointmentsAPI.getAvailableTechniciansForSlot(
        selectedSlotId
      );
      const techData = (response.data?.data || response.data || []) as any;
      setTechnicians(Array.isArray(techData) ? techData : []);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      setTechnicians([]);
    }
  };

  const fetchSlots = async () => {
    try {
      const response = await slotsAPI.list({
        from: formData.scheduledDate,
        to: formData.scheduledDate,
      });

      // Backend returns { count: 4, data: [...] }
      let slotData: any;
      if (response.data?.data) {
        slotData = response.data.data;
      } else if (response.data) {
        slotData = response.data;
      } else {
        slotData = [];
      }

      console.log("📅 Raw response:", JSON.stringify(response.data, null, 2));

      // Handle object with data array OR direct array
      let slotsArray = [];
      if (
        slotData &&
        typeof slotData === "object" &&
        "data" in slotData &&
        Array.isArray(slotData.data)
      ) {
        slotsArray = slotData.data;
      } else if (Array.isArray(slotData)) {
        slotsArray = slotData;
      }

      console.log("📅 Slots array:", slotsArray.length, "slots");

      const formattedSlots = slotsArray.map((slot: any) => ({
        _id: slot._id,
        start: slot.start,
        status: slot.status,
        availableCapacity: slot.capacity - (slot.bookedCount || 0),
        capacity: slot.capacity,
        bookedCount: slot.bookedCount || 0,
      }));

      console.log("📅 Formatted slots:", formattedSlots);
      setSlots(formattedSlots);
    } catch (error) {
      console.error("Error fetching slots:", error);
      setSlots([]);
    }
  };

  // Format slot time for display
  const formatSlotTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle slot selection - update selectedSlotId
  const handleSlotSelect = (slotId: string) => {
    const slot = slots.find((s) => s._id === slotId);
    if (slot) {
      setSelectedSlotId(slotId);
      setFormData((prev) => ({
        ...prev,
        scheduledTime: formatSlotTime(slot.start),
      }));
    }
  };

  // Filter available slots
  const availableSlots = slots.filter(
    (slot) =>
      (slot.status === "available" || slot.status === "partially_booked") &&
      slot.availableCapacity > 0
  );

  console.log(
    "🎫 Available slots count:",
    availableSlots.length,
    "from",
    slots.length,
    "total slots"
  );

  const handleSubmit = async () => {
    // Validation
    if (!formData.vehicleId) {
      Alert.alert("Lỗi", "Vui lòng chọn xe");
      return;
    }
    if (!formData.scheduledDate) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày");
      return;
    }

    setLoading(true);
    try {
      const depositAmount = 200000; // Fixed deposit amount

      // Validate selected slot
      if (!selectedSlotId) {
        Alert.alert("Lỗi", "Vui lòng chọn khung giờ");
        setLoading(false);
        return;
      }

      const slot = slots.find((s) => s._id === selectedSlotId);
      if (!slot) {
        Alert.alert(
          "Lỗi",
          "Khung giờ không khả dụng. Vui lòng chọn khung giờ khác."
        );
        setLoading(false);
        return;
      }

      // Check vehicle booking status first (like web)
      setCheckingVehicle(true);
      try {
        const vehicleCheckResponse =
          await appointmentsAPI.checkVehicleBookingStatus(formData.vehicleId);

        const vehicleData = vehicleCheckResponse.data?.data;
        if (vehicleData?.hasPendingAppointments) {
          const pendingAppointments = vehicleData.pendingAppointments;
          const appointmentList = pendingAppointments
            .map(
              (apt: {
                appointmentNumber: string;
                scheduledDate: string;
                scheduledTime: string;
              }) =>
                `- ${apt.appointmentNumber} (${apt.scheduledDate} ${apt.scheduledTime})`
            )
            .join("\n");

          Alert.alert(
            "Xe đã có lịch hẹn",
            `Xe ${vehicleData.vehicleInfo.make} ${vehicleData.vehicleInfo.model} đã có lịch hẹn đang chờ xử lý:\n${appointmentList}\n\nVui lòng hoàn thành hoặc hủy lịch hẹn hiện tại trước khi đặt lịch mới.`,
            [{ text: "OK" }]
          );
          setLoading(false);
          setCheckingVehicle(false);
          return;
        }
      } catch (vehicleError) {
        console.error("Error checking vehicle status:", vehicleError);
        Alert.alert(
          "Lỗi",
          "Không thể kiểm tra trạng thái xe. Vui lòng thử lại."
        );
        setLoading(false);
        setCheckingVehicle(false);
        return;
      } finally {
        setCheckingVehicle(false);
      }

      // Reserve slot first
      try {
        const reserveResponse = await slotsAPI.reserve(selectedSlotId);
        const reservedSlotIdValue =
          reserveResponse.data?.data?._id || selectedSlotId;
        setReservedSlotId(reservedSlotIdValue);

        // Prepare appointment data (not create yet, will be created after payment)
        const appointmentData = {
          vehicleId: formData.vehicleId,
          scheduledDate: formData.scheduledDate,
          scheduledTime: formatSlotTime(slot.start),
          customerNotes: formData.customerNotes,
          priority: formData.priority,
          services: [], // Empty services for deposit booking
          ...(formData.technicianId && { technicianId: formData.technicianId }),
        };

        // Store appointment data in AsyncStorage for payment result screen
        await AsyncStorage.setItem(
          "pendingAppointment",
          JSON.stringify({
            ...appointmentData,
            selectedSlotId: reservedSlotIdValue,
          })
        );

        // Store reserved slot ID for cleanup
        await AsyncStorage.setItem("reservedSlotId", reservedSlotIdValue);

        // Create VNPay payment
        const paymentData = {
          amount: depositAmount,
          language: "vn",
          orderInfo: "Dat coc 200,000 VND cho lich hen",
          appointmentData: appointmentData,
          paymentType: "appointment",
          depositAmount: depositAmount,
          isMobileApp: true, // Explicit flag for mobile app
        };

        const response = await vnpayAPI.createPayment(paymentData);

        if (
          response.data?.data?.paymentUrl ||
          (response.data as any)?.paymentUrl
        ) {
          const paymentUrl =
            response.data?.data?.paymentUrl ||
            (response.data as any)?.paymentUrl;

          // Store transaction ref for later verification
          const transactionRef =
            response.data?.data?.transactionRef ||
            (response.data as any)?.transactionRef;
          await AsyncStorage.setItem("currentTransactionRef", transactionRef);

          console.log("Opening browser for payment...", transactionRef);

          // Open in EXTERNAL browser (Chrome/Safari) instead of in-app browser
          // This allows user to easily switch back to app using app switcher or home button
          await Linking.openURL(paymentUrl);

          // Show instruction to user
          Alert.alert(
            "Đang chuyển đến thanh toán",
            "Sau khi thanh toán xong, vui lòng MỞ LẠI ỨNG DỤNG (từ màn hình chính hoặc app switcher) để hoàn tất đặt lịch.",
            [{ text: "OK" }]
          );

          // Browser opened - loading will stop when user returns and payment is checked
          setLoading(false);
        } else {
          throw new Error("Failed to create payment URL");
        }
      } catch (reserveError) {
        console.error("Error reserving slot:", reserveError);

        // Release slot if reservation failed but slot was partially reserved
        if (reservedSlotId) {
          try {
            await releaseReservedSlot(reservedSlotId);
          } catch (releaseError) {
            console.error(
              "Error releasing slot after reservation failure:",
              releaseError
            );
          }
        }

        Alert.alert(
          "Lỗi",
          "Khung giờ đã được đặt. Vui lòng chọn khung giờ khác."
        );
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Không thể đặt lịch";
      Alert.alert("Lỗi", errorMessage);
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đặt lịch bảo dưỡng</Text>
        <Text style={styles.headerSubtitle}>Đặt cọc để giữ chỗ</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn xe *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.vehicleId}
              onValueChange={(value) =>
                setFormData({ ...formData, vehicleId: value })
              }
              style={styles.picker}
            >
              <Picker.Item label="Chọn xe của bạn" value="" />
              {vehicles.map((vehicle) => (
                <Picker.Item
                  key={vehicle._id}
                  label={`${vehicle.make} ${vehicle.model} (${vehicle.year})`}
                  value={vehicle._id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {technicians.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Chọn kỹ thuật viên (tùy chọn)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.technicianScroll}
              contentContainerStyle={styles.technicianScrollContent}
            >
              <TouchableOpacity
                style={[
                  styles.technicianCard,
                  !formData.technicianId && styles.technicianCardSelected,
                ]}
                onPress={() => setFormData({ ...formData, technicianId: null })}
              >
                <View style={styles.technicianAvatar}>
                  <Text style={styles.technicianAvatarText}>?</Text>
                </View>
                <Text style={styles.technicianName}>Tự động</Text>
                <Text style={styles.technicianDesc}>Chọn tốt nhất</Text>
                {!formData.technicianId && (
                  <View style={styles.selectedCheck}>
                    <Text style={styles.selectedCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>

              {technicians.map((tech) => {
                const isSelected = formData.technicianId === tech._id;
                const specs = tech.specializations || tech.specialization || [];

                return (
                  <TouchableOpacity
                    key={tech._id}
                    style={[
                      styles.technicianCard,
                      isSelected && styles.technicianCardSelected,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, technicianId: tech._id })
                    }
                  >
                    <View style={styles.technicianAvatar}>
                      <Text style={styles.technicianAvatarText}>
                        {tech.firstName[0]}
                        {tech.lastName[0]}
                      </Text>
                    </View>
                    <Text style={styles.technicianName} numberOfLines={1}>
                      {tech.firstName} {tech.lastName}
                    </Text>

                    {tech.performance && (
                      <View style={styles.technicianRating}>
                        <Text style={styles.starIcon}>⭐</Text>
                        <Text style={styles.ratingText}>
                          {tech.performance.customerRating?.toFixed(1) || "5.0"}
                        </Text>
                      </View>
                    )}

                    {specs.length > 0 && (
                      <Text style={styles.technicianSpecs} numberOfLines={1}>
                        {specs[0]}
                      </Text>
                    )}

                    {isSelected && (
                      <View style={styles.selectedCheck}>
                        <Text style={styles.selectedCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn ngày *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDateModal(true)}
          >
            <Text
              style={[
                styles.dateButtonText,
                { color: formData.scheduledDate ? "#111827" : "#9ca3af" },
              ]}
            >
              {formData.scheduledDate
                ? formatDateDisplay(formData.scheduledDate)
                : "Chọn ngày..."}
            </Text>
            <Text style={styles.dateButtonIcon}>📅</Text>
          </TouchableOpacity>

          <Modal
            visible={showDateModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDateModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chọn ngày</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDateModal(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.dateListContainer}>
                  {availableDates.map((dateStr) => {
                    const isSelected = formData.scheduledDate === dateStr;
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[
                          styles.dateItem,
                          isSelected && styles.dateItemSelected,
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, scheduledDate: dateStr });
                          setShowDateModal(false);
                        }}
                      >
                        <View style={styles.dateItemContent}>
                          <View style={styles.dateItemLeft}>
                            <Text
                              style={[
                                styles.dateDayName,
                                isSelected && styles.dateDayNameSelected,
                              ]}
                            >
                              {getDayName(dateStr)}
                            </Text>
                            <Text
                              style={[
                                styles.dateDisplay,
                                isSelected && styles.dateDisplaySelected,
                              ]}
                            >
                              {formatDateDisplay(dateStr)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.dateShort,
                              isSelected && styles.dateShortSelected,
                            ]}
                          >
                            {getShortDate(dateStr)}
                          </Text>
                        </View>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>

        {formData.scheduledDate && availableSlots.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chọn giờ *</Text>
            <View style={styles.timeSlotContainer}>
              {availableSlots.map((slot) => {
                const isSelected = selectedSlotId === slot._id;
                const availableCount = slot.availableCapacity;
                const timeStr = formatSlotTime(slot.start);

                return (
                  <TouchableOpacity
                    key={slot._id}
                    style={[
                      styles.timeSlot,
                      isSelected && styles.timeSlotSelected,
                    ]}
                    onPress={() => handleSlotSelect(slot._id)}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        isSelected && styles.timeSlotTextSelected,
                      ]}
                    >
                      {timeStr}
                    </Text>
                    <Text
                      style={[
                        styles.timeSlotInfo,
                        isSelected && styles.timeSlotInfoSelected,
                      ]}
                    >
                      {availableCount} chỗ
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {formData.scheduledDate && availableSlots.length === 0 && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ Không có khung giờ khả dụng cho ngày này. Vui lòng chọn ngày
              khác.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.customerNotes}
            onChangeText={(text) =>
              setFormData({ ...formData, customerNotes: text })
            }
            placeholder="Nhập ghi chú (không bắt buộc)"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Đặt cọc</Text>
          <Text style={styles.summaryAmount}>200,000 VNĐ</Text>
          <Text style={styles.summaryNote}>
            * Đặt cọc để giữ chỗ. Dịch vụ sẽ được xác định khi tiếp nhận xe.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={async () => {
              // Release slot if booking was started
              if (reservedSlotId) {
                try {
                  console.log("🔓 User cancelled booking - releasing slot");
                  await releaseReservedSlot(reservedSlotId);
                  await AsyncStorage.removeItem("reservedSlotId");
                  await AsyncStorage.removeItem("pendingAppointment");
                  await AsyncStorage.removeItem("currentTransactionRef");
                } catch (error) {
                  console.error("Error releasing slot on cancel:", error);
                }
              }
              if (onCancel) onCancel();
            }}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || checkingVehicle}
          >
            {loading || checkingVehicle ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Thanh toán đặt cọc</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#3b82f6",
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#e0e7ff",
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  picker: {
    height: 50,
  },
  serviceItem: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceItemSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
  },
  checkmark: {
    fontSize: 24,
    color: "#3b82f6",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  timeSlotContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  timeSlotSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#3b82f6",
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  timeSlotTextSelected: {
    color: "#fff",
  },
  timeSlotInfo: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2,
  },
  timeSlotInfoSelected: {
    color: "#fff",
  },
  warningContainer: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: "#92400e",
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryTitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  summaryNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
    fontStyle: "italic",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dateButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 16,
    flex: 1,
  },
  dateButtonIcon: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
  },
  closeButtonText: {
    fontSize: 20,
    color: "#6b7280",
  },
  dateListContainer: {
    maxHeight: 500,
  },
  dateItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dateItemSelected: {
    backgroundColor: "#eff6ff",
  },
  dateItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  dateItemLeft: {
    flex: 1,
  },
  dateDayName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  dateDayNameSelected: {
    color: "#3b82f6",
  },
  dateDisplay: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  dateDisplaySelected: {
    color: "#3b82f6",
  },
  dateShort: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
  },
  dateShortSelected: {
    color: "#3b82f6",
  },
  technicianScroll: {
    marginBottom: 16,
  },
  technicianScrollContent: {
    paddingRight: 16,
  },
  technicianCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 120,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  technicianCardSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  technicianAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  technicianAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  technicianName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
    textAlign: "center",
  },
  technicianDesc: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
  },
  technicianRating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  starIcon: {
    fontSize: 12,
    marginRight: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  technicianSpecs: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
  },
  selectedCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCheckText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default AppointmentBookingScreen;
