import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { slotsAPI, appointmentsAPI } from "../services/api";
// import { useSocket } from "../contexts/SocketContext"; // Not used

const PaymentResult: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const { socket } = useSocket(); // Not used in this component
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [paymentInfo, setPaymentInfo] = useState<{
    success: boolean;
    transactionRef?: string;
    amount?: string;
    error?: string;
    paymentDate?: Date;
    vnpayTransaction?: {
      transactionNo?: string;
      responseCode?: string;
      bankCode?: string;
      cardType?: string;
      payDate?: string;
    };
  } | null>(null);
  const [appointmentCreated, setAppointmentCreated] = useState(false);
  const [appointmentData, setAppointmentData] = useState<{
    appointmentId: string;
    appointmentNumber: string;
    scheduledDate: string;
    scheduledTime: string;
    [key: string]: unknown;
  } | null>(null);
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  const [appointmentCreationAttempts, setAppointmentCreationAttempts] =
    useState(0);

  // Function to release slot when payment fails
  const releaseSlotOnPaymentFailure = async () => {
    try {
      const pendingAppointmentStr = localStorage.getItem("pendingAppointment");
      if (pendingAppointmentStr) {
        const pendingAppointment = JSON.parse(pendingAppointmentStr);
        if (pendingAppointment.selectedSlotId) {
          await slotsAPI.release(pendingAppointment.selectedSlotId);
          toast.success("Previous slot reservation has been released.");
        }
      }
    } catch (error) {
      console.error("❌ [PaymentResult] Failed to release slot:", error);
      toast.error("Failed to release previous slot. Please contact support.");
    }
  };

  // Function to create appointment after successful payment
  const createAppointmentAfterPayment = useCallback(
    async (
      paymentData: {
        transactionRef: string;
        amount: string;
        paymentDate: Date;
        vnpayTransaction?: {
          transactionNo?: string;
          responseCode?: string;
          bankCode?: string;
          cardType?: string;
          payDate?: string;
        };
      },
      appointmentData: {
        vehicleId: string;
        scheduledDate: string;
        scheduledTime: string;
        selectedSlotId?: string;
        technicianId?: string;
        customerNotes?: string;
        priority?: string;
        services: unknown[];
        [key: string]: unknown;
      }
    ) => {
      // Check localStorage for existing appointment creation
      const appointmentCreationKey = `appointment_creation_${paymentData.transactionRef}`;
      const existingCreation = localStorage.getItem(appointmentCreationKey);

      if (existingCreation) {
        return;
      }

      // Prevent duplicate appointment creation
      if (isCreatingAppointment || appointmentCreated) {
        return;
      }

      // Prevent too many attempts
      if (appointmentCreationAttempts >= 2) {
        return;
      }

      // Mark appointment creation as started
      localStorage.setItem(
        appointmentCreationKey,
        JSON.stringify({
          started: true,
          timestamp: new Date().toISOString(),
          transactionRef: paymentData.transactionRef,
        })
      );

      setIsCreatingAppointment(true);
      setAppointmentCreationAttempts((prev) => prev + 1);

      try {
        // Check if appointment already exists for this transaction
        try {
          const existingAppointments = await appointmentsAPI.getAll();
          console.log("🔍 [PaymentResult] API Response:", existingAppointments);

          // Handle different response formats
          const appointments =
            existingAppointments.data?.data || existingAppointments.data || [];
          const existingAppointment = Array.isArray(appointments)
            ? appointments.find(
                (apt: { paymentInfo?: { transactionRef?: string } }) =>
                  apt.paymentInfo?.transactionRef === paymentData.transactionRef
              )
            : null;

          if (existingAppointment) {
            console.log(
              "⚠️ [PaymentResult] Appointment already exists for transaction:",
              paymentData.transactionRef,
              existingAppointment
            );
            setAppointmentCreated(true);
            setAppointmentData({
              appointmentId: existingAppointment._id,
              appointmentNumber: existingAppointment.appointmentNumber,
              scheduledDate: existingAppointment.scheduledDate,
              scheduledTime: existingAppointment.scheduledTime,
            });
            return;
          }
        } catch (checkError) {
          console.error(
            "❌ [PaymentResult] Failed to check existing appointments:",
            checkError
          );
          // Continue with creation if check fails
        }

        // Send payment success email first
        try {
          console.log("📧 [PaymentResult] Sending payment success email...");

          // Call VNPay verify endpoint to trigger payment success email
          const emailResponse = await fetch(
            "/api/vnpay/verify-appointment-payment",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                transactionRef: paymentData.transactionRef,
                paymentType: "deposit",
              }),
            }
          );

          if (emailResponse.ok) {
            console.log("✅ Payment success email sent");
          } else {
            console.warn(
              "⚠️ Failed to send payment success email, continuing with appointment creation"
            );
          }
        } catch (emailError) {
          console.error("❌ Error sending payment success email:", emailError);
          // Don't fail the appointment creation if email fails
        }

        // Create appointment with payment info
        const appointmentPayload = {
          ...appointmentData,
          services: [], // Empty services for deposit booking
          paymentInfo: {
            transactionRef: paymentData.transactionRef,
            paymentMethod: "vnpay",
            depositAmount: parseFloat(paymentData.amount),
            paidAmount: parseFloat(paymentData.amount),
            paymentDate: paymentData.paymentDate,
          },
          depositInfo: {
            amount: 200000,
            paid: true,
            paidAt: paymentData.paymentDate,
          },
          bookingType: "deposit_booking",
          status: "confirmed",
          paymentStatus: "partial",
          ...(appointmentData.selectedSlotId && {
            slotId: appointmentData.selectedSlotId,
            skipSlotReservation: true, // Slot already reserved
          }),
        };

        const response = await appointmentsAPI.create(appointmentPayload);
        const appointment = response.data?.data;

        setAppointmentCreated(true);
        setAppointmentData({
          appointmentId: appointment._id,
          appointmentNumber: appointment.appointmentNumber,
          scheduledDate: appointment.scheduledDate,
          scheduledTime: appointment.scheduledTime,
        });

        toast.success("Deposit payment successful! Appointment confirmed.");

        // Clean up localStorage
        localStorage.removeItem("pendingAppointment");
        localStorage.removeItem("paymentVerified");
        localStorage.removeItem(appointmentCreationKey);

        // Redirect to appointments page after successful verification
        setTimeout(() => {
          navigate("/appointments");
        }, 2000);
      } catch (error: unknown) {
        console.error(
          "❌ [PaymentResult] Failed to create appointment:",
          error
        );
        const errorMessage =
          error instanceof Error && "response" in error
            ? (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            : "Failed to create appointment";
        toast.error(errorMessage || "Failed to create appointment");

        // Release slot if appointment creation fails
        if (appointmentData.selectedSlotId) {
          try {
            await slotsAPI.release(appointmentData.selectedSlotId);
          } catch (releaseErr) {
            console.error("Failed to release slot:", releaseErr);
          }
        }
      } finally {
        setIsCreatingAppointment(false);
        // Clean up localStorage on error too
        localStorage.removeItem(appointmentCreationKey);
      }
    },
    [
      isCreatingAppointment,
      appointmentCreated,
      appointmentCreationAttempts,
      navigate,
    ]
  );

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);

    // Check for VNPay return parameters
    const vnp_ResponseCode = queryParams.get("vnp_ResponseCode");
    const vnp_TxnRef = queryParams.get("vnp_TxnRef");
    const vnp_Amount = queryParams.get("vnp_Amount");
    const vnp_TransactionNo = queryParams.get("vnp_TransactionNo");

    // Check for regular payment result parameters
    const success = queryParams.get("success");
    const transactionRef = queryParams.get("transactionRef");
    const amount = queryParams.get("amount");
    // const appointmentId = queryParams.get("appointmentId"); // Not used
    const error = queryParams.get("error");

    // Handle VNPay return
    if (vnp_ResponseCode && vnp_TxnRef) {
      const isVnPaySuccess = vnp_ResponseCode === "00";
      const amountInVND = parseInt(vnp_Amount || "0") / 100; // Convert from VNPay format

      if (isVnPaySuccess) {
        setStatus("success");
        setPaymentInfo({
          success: true,
          transactionRef: vnp_TxnRef || "",
          amount: amountInVND.toString(),
          paymentDate: new Date(),
          vnpayTransaction: {
            transactionNo: vnp_TransactionNo || "",
            responseCode: vnp_ResponseCode || "",
            bankCode: queryParams.get("vnp_BankCode") || "",
            cardType: queryParams.get("vnp_CardType") || "",
            payDate: queryParams.get("vnp_PayDate") || "",
          },
        });

        toast.success(
          "Payment successful! Please complete your appointment booking.",
          {
            duration: 6000,
            icon: "✅",
          }
        );

        // Store payment success in localStorage for analytics
        localStorage.setItem(
          "lastPaymentSuccess",
          JSON.stringify({
            transactionRef: vnp_TxnRef || "",
            amount: amountInVND,
            timestamp: new Date().toISOString(),
            method: "vnpay",
          })
        );

        // Trigger analytics events if available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).gtag && vnp_TxnRef) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).gtag("event", "purchase", {
            transaction_id: vnp_TxnRef,
            value: amountInVND,
            currency: "VND",
          });
        }

        // Get pending appointment data and create appointment
        const pendingAppointmentStr =
          localStorage.getItem("pendingAppointment");
        if (pendingAppointmentStr) {
          // Check if appointment creation is already in progress or completed
          const appointmentCreationKey = `appointment_creation_${vnp_TxnRef}`;
          const existingCreation = localStorage.getItem(appointmentCreationKey);

          if (existingCreation) {
            return;
          }

          const pendingAppointment = JSON.parse(pendingAppointmentStr);
          const paymentData = {
            transactionRef: vnp_TxnRef,
            amount: amountInVND.toString(),
            paymentDate: new Date(),
            vnpayTransaction: {
              transactionNo: vnp_TransactionNo || undefined,
              responseCode: vnp_ResponseCode || undefined,
              bankCode: queryParams.get("vnp_BankCode") || undefined,
              cardType: queryParams.get("vnp_CardType") || undefined,
              payDate: queryParams.get("vnp_PayDate") || undefined,
            },
          };

          // Create appointment automatically
          createAppointmentAfterPayment(paymentData, pendingAppointment);
        }
      } else {
        setStatus("error");
        setPaymentInfo({
          success: false,
          error: `Payment failed with response code: ${vnp_ResponseCode}`,
          amount: amountInVND.toString(),
        });

        // Release slot when VNPay payment fails
        releaseSlotOnPaymentFailure();
      }
    }
    // Handle regular payment result (from backend redirect)
    else if (success === "true" && transactionRef && amount) {
      setStatus("success");
      setPaymentInfo({
        success: true,
        transactionRef,
        amount: amount,
      });

      toast.success("Payment successful! Creating your appointment...", {
        duration: 6000,
        icon: "✅",
      });

      // Get pending appointment data and create appointment
      const pendingAppointmentStr = localStorage.getItem("pendingAppointment");
      if (pendingAppointmentStr) {
        // Check if appointment creation is already in progress or completed
        const appointmentCreationKey = `appointment_creation_${transactionRef}`;
        const existingCreation = localStorage.getItem(appointmentCreationKey);

        if (existingCreation) {
          return;
        }

        const pendingAppointment = JSON.parse(pendingAppointmentStr);
        const paymentData = {
          transactionRef: transactionRef,
          amount: amount,
          paymentDate: new Date(),
        };

        // Create appointment automatically
        createAppointmentAfterPayment(paymentData, pendingAppointment);
      }
    } else {
      setStatus("error");
      setPaymentInfo({
        success: false,
        error: error || "Payment failed",
        amount: amount || "",
      });

      // Release slot when payment fails
      releaseSlotOnPaymentFailure();
    }
  }, [
    location,
    navigate,
    createAppointmentAfterPayment,
    appointmentCreated,
    appointmentCreationAttempts,
    isCreatingAppointment,
  ]);

  // Note: This function is now a fallback since appointment creation is handled by the backend
  // Note: Appointment creation is now handled by the backend

  // Note: Payment verification is now handled by the backend

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Processing Payment...
          </h2>
          <p className="text-text-secondary">
            Please wait while we verify your payment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="max-w-md w-full bg-dark-300 rounded-lg shadow-lg p-6">
        <div className="text-center">
          {status === "success" ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Payment Successful!
              </h2>
              <p className="text-text-secondary mb-4">
                {appointmentCreated
                  ? "Your appointment has been created successfully!"
                  : "Your payment has been processed successfully. Creating your appointment..."}
              </p>
              {paymentInfo && (
                <div className="bg-dark-900 rounded-lg p-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Amount:</span>
                      <span className="text-text-muted">
                        {paymentInfo.amount
                          ? formatCurrency(parseFloat(paymentInfo.amount))
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Transaction:</span>
                      <span className="text-text-muted text-sm">
                        {paymentInfo.transactionRef}
                      </span>
                    </div>
                    {paymentInfo.vnpayTransaction && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Bank:</span>
                          <span className="text-text-muted text-sm">
                            {paymentInfo.vnpayTransaction.bankCode}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Card Type:</span>
                          <span className="text-text-muted text-sm">
                            {paymentInfo.vnpayTransaction.cardType}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">
                            VNPay Transaction:
                          </span>
                          <span className="text-text-muted text-sm">
                            {paymentInfo.vnpayTransaction.transactionNo}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {appointmentCreated && appointmentData && (
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Appointment Number:</span>
                      <span className="text-text-muted text-sm">
                        {appointmentData.appointmentNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Scheduled Date:</span>
                      <span className="text-text-muted text-sm">
                        {new Date(
                          appointmentData.scheduledDate
                        ).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Scheduled Time:</span>
                      <span className="text-text-muted text-sm">
                        {appointmentData.scheduledTime}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => navigate("/appointments")}
                  className="w-full bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 text-white hover:text-dark-900 px-6 py-2 rounded-lg text-text-muted transition-colors duration-200"
                >
                  View My Appointments
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full bg-dark-200 hover:bg-dark-300 text-gray-800 px-6 py-2 rounded-lg text-text-muted transition-colors duration-200"
                >
                  Back to Home
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Payment Failed
              </h2>
              <p className="text-text-secondary mb-4">
                {paymentInfo?.error || "Your payment could not be processed."}
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/appointments")}
                  className="w-full bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 text-white hover:text-dark-900 px-6 py-2 rounded-lg text-text-muted transition-colors duration-200"
                >
                  Back to Appointments
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="w-full bg-dark-200 hover:bg-dark-300 text-gray-800 px-6 py-2 rounded-lg text-text-muted transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;
