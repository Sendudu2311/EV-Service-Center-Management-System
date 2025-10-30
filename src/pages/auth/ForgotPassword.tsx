import React, { useState } from "react";
import { Link } from "react-router-dom";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import axios from "axios";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post("/api/auth/forgot-password", { email });

      if (response.data.success) {
        setIsEmailSent(true);
        toast.success("Password reset email sent successfully!");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to send reset email"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-500 rounded-xl flex items-center justify-center">
                <EnvelopeIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-white">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="mt-4 text-sm text-text-secondary">
              The link will expire in 1 hour. If you don't see the email, check
              your spam folder.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                setIsEmailSent(false);
                setEmail("");
              }}
              className="w-full flex justify-center py-3 px-4 border border-dark-300 rounded-lg shadow-sm text-sm text-text-muted text-text-secondary bg-dark-300 hover:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500"
            >
              Send to different email
            </button>

            <Link
              to="/login"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm text-black font-semibold bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500"
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
            Forgot your password?
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
              className="mt-1 appearance-none relative block w-full px-3 py-3 border border-dark-300 bg-dark-300 placeholder-text-muted text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-400 focus:z-10 sm:text-sm"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !email}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-black bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Sending...
                </div>
              ) : (
                "Send reset link"
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

export default ForgotPassword;

