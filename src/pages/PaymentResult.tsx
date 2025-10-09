import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { vnpayAPI } from "../services/api";
import { useSocket } from "../contexts/SocketContext";

const PaymentResult: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { socket } = useSocket();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

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
    const appointmentId = queryParams.get("appointmentId");
    const error = queryParams.get("error");

    // Handle VNPay return
    if (vnp_ResponseCode && vnp_TxnRef) {
      const isVnPaySuccess = vnp_ResponseCode === "00";
      const amountInVND = parseInt(vnp_Amount) / 100; // Convert from VNPay format

      if (isVnPaySuccess) {
        setStatus("success");
        setPaymentInfo({
          success: true,
          transactionRef: vnp_TxnRef,
          amount: amountInVND.toString(),
          paymentDate: new Date(),
          vnpayTransaction: {
            transactionNo: vnp_TransactionNo,
            responseCode: vnp_ResponseCode,
            bankCode: queryParams.get("vnp_BankCode") || "",
            cardType: queryParams.get("vnp_CardType") || "",
            payDate: queryParams.get("vnp_PayDate") || "",
          },
          autoCreated: true, // Backend should have created the appointment
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
            transactionRef: vnp_TxnRef,
            amount: amountInVND,
            timestamp: new Date().toISOString(),
            method: "vnpay",
          })
        );

        // Trigger analytics events if available
        if (window.gtag) {
          window.gtag("event", "purchase", {
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
      }
    }
    // Handle regular payment result (from backend redirect)
    else if (success === "true" && transactionRef) {
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
        amount: amount,
      });
    }
  }, [location, navigate]);

  // Note: This function is now a fallback since appointment creation is handled by the backend
  const bookAppointmentAfterPayment = async (transactionRef: string) => {
    try {
      // Get pending appointment data from localStorage
      const pendingData = localStorage.getItem("pendingAppointment");
      if (!pendingData) {
        throw new Error("No pending appointment found");
      }

      const appointment = JSON.parse(pendingData);

      // Verify transactionRef matches
      if (appointment.paymentInfo?.transactionRef !== transactionRef) {
        throw new Error("Transaction reference mismatch");
      }

      // Book the appointment
      const appointmentData = {
        ...appointment,
        paymentInfo: {
          method: "vnpay",
          transactionRef: transactionRef,
          amount: appointment.amount,
          paymentDate: new Date(),
          status: "paid",
        },
      };

      // Import and call appointments API
      const { appointmentsAPI } = await import("../services/api");
      const createdAppointment = await appointmentsAPI.create(appointmentData);

      // Clear pending appointment
      localStorage.removeItem("pendingAppointment");

      return createdAppointment;
    } catch (error) {
      console.error("Error booking appointment after payment:", error);
      throw error;
    }
  };

  const verifyPaymentAndBookAppointment = async (transactionRef: string) => {
    try {
      // Verify the payment
      const verifyResponse = await vnpayAPI.verifyAppointmentPayment({
        transactionRef,
      });

      if (verifyResponse.data?.success) {
        // Try to book the appointment (fallback if backend creation failed)
        const appointment = await bookAppointmentAfterPayment(transactionRef);

        setStatus("success");
        setPaymentInfo({
          success: true,
          transactionRef,
          amount: verifyResponse.data.paymentInfo.amount,
          paymentDate: verifyResponse.data.paymentInfo.paymentDate,
          appointmentId: appointment._id,
          autoCreated: false, // Frontend fallback creation
        });

        // Show success message
        toast.success("Payment successful! Your appointment has been booked.");

        // Redirect to appointments page after 3 seconds
        setTimeout(() => {
          navigate("/appointments");
        }, 3000);
      } else {
        setStatus("error");
        setPaymentInfo({
          success: false,
          error: verifyResponse.data?.message || "Payment verification failed",
        });
      }
    } catch (error) {
      console.error("Payment verification or booking error:", error);
      setStatus("error");
      setPaymentInfo({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify payment or book appointment",
      });
    }
  };

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
                {paymentInfo?.autoCreated && (
                  <span className="text-green-600 font-medium">
                    {" "}
                    Please complete your appointment booking.
                  </span>
                )}
              </p>
              {paymentInfo && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(parseFloat(paymentInfo.amount))}
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
                    {paymentInfo.appointmentId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Appointment ID:</span>
                        <span className="font-medium text-sm text-green-600">
                          {paymentInfo.appointmentId}
                        </span>
                      </div>
                    )}
                    {paymentInfo.autoCreated && (
                      <div className="flex items-center justify-center mt-2 pt-2 border-t border-gray-200">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <svg
                            className="mr-1.5 h-2 w-2 text-green-400"
                            fill="currentColor"
                            viewBox="0 0 8 8"
                          >
                            <circle cx="4" cy="4" r="3" />
                          </svg>
                          Auto-booked
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500 mb-4">
                You will be redirected to complete your appointment booking in a
                few seconds...
              </p>
              <button
                onClick={() => navigate("/appointments")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                View Appointments
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
