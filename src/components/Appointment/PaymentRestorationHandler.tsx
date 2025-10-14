import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { slotsAPI } from "../../services/api";

interface PaymentRestorationHandlerProps {
  children: React.ReactNode;
}

/**
 * Component to handle payment restoration logic completely separate from AppointmentForm
 * This prevents any re-render issues and state management problems
 */
const PaymentRestorationHandler: React.FC<PaymentRestorationHandlerProps> = ({
  children,
}) => {
  const navigate = useNavigate();
  const [isRestorationComplete, setIsRestorationComplete] = useState(false);
  const [restorationData, setRestorationData] = useState<any>(null);

  // Function to release slot when payment is not successful
  const releaseSlotOnPaymentFailure = async (slotId: string) => {
    try {
      console.log(
        "🔍 [PaymentRestorationHandler] Releasing slot due to payment failure:",
        slotId
      );
      await slotsAPI.release(slotId);
      console.log("✅ [PaymentRestorationHandler] Slot released successfully");
      toast.success("Previous slot reservation has been released.");
    } catch (error) {
      console.error(
        "❌ [PaymentRestorationHandler] Failed to release slot:",
        error
      );
      toast.error("Failed to release previous slot. Please contact support.");
    }
  };

  useEffect(() => {
    console.log(
      "🔍 [PaymentRestorationHandler] Starting payment restoration check..."
    );

    // Check for payment verification data
    const paymentVerifiedStr = localStorage.getItem("paymentVerified");
    const pendingDataStr = localStorage.getItem("pendingAppointment");

    if (paymentVerifiedStr && pendingDataStr) {
      console.log(
        "✅ [PaymentRestorationHandler] Found payment data, processing..."
      );

      const paymentData = JSON.parse(paymentVerifiedStr);
      const appointment = JSON.parse(pendingDataStr);

      console.log(
        "📋 [PaymentRestorationHandler] Appointment data:",
        appointment
      );
      console.log("📅 scheduledDate:", appointment.scheduledDate);
      console.log("⏰ scheduledTime:", appointment.scheduledTime);

      // Store restoration data
      setRestorationData({
        formData: {
          vehicleId: appointment.vehicleId || "",
          services:
            appointment.services?.map((s: any) =>
              typeof s === "string" ? s : s.serviceId
            ) || [],
          scheduledDate: appointment.scheduledDate || "",
          scheduledTime: appointment.scheduledTime || "",
          customerNotes: appointment.customerNotes || "",
          priority: appointment.priority || "normal",
          technicianId: appointment.technicianId || null,
        },
        selectedSlotId: appointment.selectedSlotId || null,
        reservedSlotId: appointment.selectedSlotId || null, // Add reservedSlotId
        paymentInfo: paymentData,
        paymentVerified: true,
      });

      // Clean up localStorage immediately
      localStorage.removeItem("pendingAppointment");
      localStorage.removeItem("paymentVerified");

      toast.success(
        "Payment verified! Please complete your appointment booking."
      );

      console.log(
        "✅ [PaymentRestorationHandler] Restoration data prepared:",
        restorationData
      );
    } else {
      console.log(
        "ℹ️ [PaymentRestorationHandler] No payment data found, checking for pending slots..."
      );

      // Check if there's a pending appointment with slot that needs to be released
      const pendingDataStr = localStorage.getItem("pendingAppointment");
      if (pendingDataStr) {
        try {
          const pendingAppointment = JSON.parse(pendingDataStr);
          if (pendingAppointment.selectedSlotId) {
            console.log(
              "⚠️ [PaymentRestorationHandler] Found pending slot without payment verification, releasing..."
            );
            releaseSlotOnPaymentFailure(pendingAppointment.selectedSlotId);

            // Clean up localStorage
            localStorage.removeItem("pendingAppointment");
            localStorage.removeItem("paymentVerified");
          }
        } catch (error) {
          console.error(
            "❌ [PaymentRestorationHandler] Error parsing pending appointment:",
            error
          );
          // Clean up corrupted data
          localStorage.removeItem("pendingAppointment");
          localStorage.removeItem("paymentVerified");
        }
      }
    }

    setIsRestorationComplete(true);
  }, []);

  if (!isRestorationComplete) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Pass restoration data to children via React.cloneElement
  return (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            restorationData: restorationData,
          } as any);
        }
        return child;
      })}
    </>
  );
};

export default PaymentRestorationHandler;
