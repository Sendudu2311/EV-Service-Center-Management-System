import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import axios from "axios";

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [userId, setUserId] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      const { confirmPassword: _confirmPassword, ...registerData } = formData;
      const response = await axios.post("/api/auth/register", registerData);

      if (response.data.success) {
        setUserId(response.data.data.userId);
        setShowOTPForm(true);
        toast.success(
          "Registration successful! Please check your email for verification code."
        );
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      const response = await axios.post("/api/auth/verify-email", {
        email: formData.email,
        otp,
      });

      if (response.data.success) {
        // Auto login after successful verification
        localStorage.setItem("token", response.data.data.token);
        await login(formData.email, formData.password);
        toast.success("Email verified successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OTP verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await axios.post("/api/auth/resend-otp", { email: formData.email });
      toast.success("New OTP sent to your email");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resend OTP");
    }
  };

  if (showOTPForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-lime-200 to-lime-300 shadow-glow hover:shadow-lg transition-all duration-200 transform hover:scale-110 rounded-xl flex items-center justify-center">
                <span className="text-dark-900 font-bold text-2xl">EV</span>
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
              Verify your email
            </h2>
            <p className="mt-2 text-center text-sm text-text-secondary">
              We sent a 6-digit code to {formData.email}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
            <div>
              <label
                htmlFor="otp"
                className="block text-sm text-text-muted text-text-secondary"
              >
                Verification Code
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                maxLength={6}
                required
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-dark-300 placeholder-text-muted text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-400 focus:z-10 sm:text-sm text-center text-2xl font-bold tracking-widest"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isVerifying || otp.length !== 6}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-black bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isVerifying ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  "Verify Email"
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-text-secondary">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="text-text-muted text-lime-600 hover:text-lime-500"
                >
                  Resend OTP
                </button>
              </p>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowOTPForm(false)}
                className="text-sm text-text-muted text-text-secondary hover:text-text-muted"
              >
                ← Back to registration
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-lime-200 to-lime-300 shadow-glow hover:shadow-lg transition-all duration-200 transform hover:scale-110 rounded-xl flex items-center justify-center">
              <span className="text-dark-900 font-bold text-2xl">EV</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            Join EV Service Center as a customer
          </p>
          <p className="mt-1 text-center text-sm text-text-secondary">
            Or{" "}
            <Link
              to="/login"
              className="text-text-muted text-lime-600 hover:text-lime-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm text-text-muted text-text-secondary"
                >
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-3 border border-dark-300 placeholder-text-muted text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-400 focus:z-10 sm:text-sm"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm text-text-muted text-text-secondary"
                >
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-3 border border-dark-300 placeholder-text-muted text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-400 focus:z-10 sm:text-sm"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm text-text-muted text-text-secondary"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-dark-300 placeholder-text-muted text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-400 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm text-text-muted text-text-secondary"
              >
                Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-dark-300 placeholder-text-muted text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-400 focus:z-10 sm:text-sm"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm text-text-muted text-text-secondary"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full px-3 py-3 pr-10 border border-dark-300 placeholder-text-muted text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-400 focus:z-10 sm:text-sm"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-text-muted" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-text-muted" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm text-text-muted text-text-secondary"
              >
                Confirm password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full px-3 py-3 pr-10 border border-dark-300 placeholder-text-muted text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-400 focus:z-10 sm:text-sm"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-text-muted" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-text-muted" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="agree-terms"
              name="agree-terms"
              type="checkbox"
              required
              className="h-4 w-4 text-lime-600 focus:ring-lime-500 border-dark-300 rounded"
            />
            <label
              htmlFor="agree-terms"
              className="ml-2 block text-sm text-white"
            >
              I agree to the{" "}
              <Link to="/terms" className="text-lime-600 hover:text-lime-500">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-lime-600 hover:text-lime-500">
                Privacy Policy
              </Link>
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-black bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Creating account...
                </div>
              ) : (
                "Create account"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
