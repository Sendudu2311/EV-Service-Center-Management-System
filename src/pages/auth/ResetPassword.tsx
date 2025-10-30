import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import axios from "axios";

const ResetPassword: React.FC = () => {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  const { resetToken } = useParams<{ resetToken: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Validate token format
    if (!resetToken || resetToken.length < 10) {
      setIsValidToken(false);
    }
  }, [resetToken]);

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
      const response = await axios.put(
        `/api/auth/reset-password/${resetToken}`,
        {
          password: formData.password,
        }
      );

      if (response.data.success) {
        toast.success("Password reset successful!");
        navigate("/login");
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        setIsValidToken(false);
      }
      toast.error(error.response?.data?.message || "Password reset failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">!</span>
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-white">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              This password reset link is invalid or has expired.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              to="/forgot-password"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm text-black font-semibold bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500"
            >
              Request new reset link
            </Link>

            <Link
              to="/login"
              className="w-full flex justify-center py-3 px-4 border border-dark-300 rounded-lg shadow-sm text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500"
            >
              Back to login
            </Link>
          </div>
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
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            Enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm text-text-muted text-text-secondary"
              >
                New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full px-3 py-3 pr-10 border border-dark-300 bg-dark-300 placeholder-text-muted text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-400 focus:z-10 sm:text-sm"
                  placeholder="Enter new password"
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
                Confirm New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full px-3 py-3 pr-10 border border-dark-300 bg-dark-300 placeholder-text-muted text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-400 focus:z-10 sm:text-sm"
                  placeholder="Confirm new password"
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

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-black bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Resetting...
                </div>
              ) : (
                "Reset Password"
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="text-text-muted text-lime-600 hover:text-lime-500"
            >
              ← Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

