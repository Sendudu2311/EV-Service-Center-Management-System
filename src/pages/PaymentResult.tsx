import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { slotsAPI } from "../services/api";
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

  // Function to release slot when payment fails
  const releaseSlotOnPaymentFailure = async () => {
    try {
      const pendingAppointmentStr = localStorage.getItem("pendingAppointment");
      if (pendingAppointmentStr) {
        const pendingAppointment = JSON.parse(pendingAppointmentStr);
        if (pendingAppointment.selectedSlotId) {
          console.log(
            "🔍 [PaymentResult] Releasing slot due to payment failure:",
            pendingAppointment.selectedSlotId
          );
          await slotsAPI.release(pendingAppointment.selectedSlotId);
          console.log("✅ [PaymentResult] Slot released successfully");
          toast.success("Previous slot reservation has been released.");
        }
      }
    } catch (error) {
      console.error("❌ [PaymentResult] Failed to release slot:", error);
      toast.error("Failed to release previous slot. Please contact support.");
    }
  };

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

        // Store payment verification and redirect to appointments page with pre-filled data
        localStorage.setItem(
          "paymentVerified",
          JSON.stringify({
            transactionRef: vnp_TxnRef,
            amount: amountInVND,
            paymentDate: new Date(),
            vnpayTransaction: {
              transactionNo: vnp_TransactionNo,
              responseCode: vnp_ResponseCode,
              bankCode: queryParams.get("vnp_BankCode") || "",
              cardType: queryParams.get("vnp_CardType") || "",
              payDate: queryParams.get("vnp_PayDate") || "",
            },
          })
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

        // Redirect to appointments page to show appointment form with pre-filled data
        setTimeout(() => {
          navigate("/appointments?payment=success&showForm=true");
        }, 2000);
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

      toast.success(
        "Payment successful! Please complete your appointment booking.",
        {
          duration: 6000,
          icon: "✅",
        }
      );

      // Store payment verification data for AppointmentForm
      localStorage.setItem(
        "paymentVerified",
        JSON.stringify({
          transactionRef: transactionRef,
          amount: parseInt(amount),
          paymentDate: new Date(),
        })
      );

      // Redirect to appointments page to show appointment form
      setTimeout(() => {
        navigate("/appointments?payment=success&showForm=true");
      }, 2000);
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
  }, [location, navigate]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Processing Payment...
          </h2>
          <p className="text-gray-600">
            Please wait while we verify your payment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600 mb-4">
                Your payment has been processed successfully.
                <span className="text-green-600 font-medium">
                  {" "}
                  Please complete your appointment booking.
                </span>
              </p>
              {paymentInfo && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">
                        {paymentInfo.amount
                          ? formatCurrency(parseFloat(paymentInfo.amount))
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction:</span>
                      <span className="font-medium text-sm">
                        {paymentInfo.transactionRef}
                      </span>
                    </div>
                    {paymentInfo.vnpayTransaction && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bank:</span>
                          <span className="font-medium text-sm">
                            {paymentInfo.vnpayTransaction.bankCode}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Card Type:</span>
                          <span className="font-medium text-sm">
                            {paymentInfo.vnpayTransaction.cardType}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            VNPay Transaction:
                          </span>
                          <span className="font-medium text-sm">
                            {paymentInfo.vnpayTransaction.transactionNo}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500 mb-4">
                You will be redirected to complete your appointment booking in a
                few seconds...
              </p>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                You will be redirected shortly
              </button>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Failed
              </h2>
              <p className="text-gray-600 mb-4">
                {paymentInfo?.error || "Your payment could not be processed."}
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/appointments")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Back to Appointments
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-medium transition-colors duration-200"
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
