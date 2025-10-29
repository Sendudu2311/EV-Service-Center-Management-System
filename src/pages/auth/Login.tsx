import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import GoogleLoginButton from "../../components/Common/GoogleLoginButton";
import toast from "react-hot-toast";

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Always redirect to dashboard after login
  const redirectTo = "/dashboard";

  // Auto-redirect when authentication succeeds
  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);

      // Login success - navigation will be handled by useEffect
      toast.success("Login successful!");
    } catch (error) {
      console.error("Login error:", error);
      toast.error((error as Error).message || "Login failed");
      // Clear any invalid tokens
      localStorage.removeItem("token");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center group">
            <div className="w-16 h-16 bg-gradient-to-r from-lime-200 to-lime-300 rounded-xl flex items-center justify-center shadow-glow group-hover:shadow-lg transition-all duration-200 transform group-hover:scale-110">
              <span className="text-dark-900 font-bold text-2xl">EV</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            Or{" "}
            <Link
              to="/register"
              className="text-text-muted text-lime-600 hover:text-lime-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
                placeholder="Enter your email"
                value={formData.email}
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
                  autoComplete="current-password"
                  required
                  className="appearance-none relative block w-full px-3 py-3 pr-10 border border-dark-300 bg-dark-300 placeholder-text-muted text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-400 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
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
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="text-text-muted text-lime-600 hover:text-lime-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm text-text-muted rounded-lg text-white bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-dark-900 text-text-muted">
                  Or continue with
                </span>
              </div>
            </div>
          </div>

          {/* Google Login */}
          <div className="mt-6">
            <GoogleLoginButton
              onSuccess={() => {
                // Navigation will be handled by useEffect
                toast.success("Google login successful!");
              }}
              onError={(error: string) => {
                toast.error(error);
              }}
              disabled={isLoading}
            />
          </div>

          {/* Demo accounts */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-dark-900 text-text-muted">
                  Demo Accounts
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    email: "customer1@gmail.com",
                    password: "Customer123!@#",
                  })
                }
                className="w-full inline-flex justify-center py-2 px-4 border border-dark-300 rounded-md shadow-sm bg-dark-300 text-sm text-text-muted text-text-muted hover:bg-dark-900"
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    email: "staff.central@evservice.com",
                    password: "Staff123!@#",
                  })
                }
                className="w-full inline-flex justify-center py-2 px-4 border border-dark-300 rounded-md shadow-sm bg-dark-300 text-sm text-text-muted text-text-muted hover:bg-dark-900"
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    email: "tech1@evservice.com",
                    password: "Tech123!@#",
                  })
                }
                className="w-full inline-flex justify-center py-2 px-4 border border-dark-300 rounded-md shadow-sm bg-dark-300 text-sm text-text-muted text-text-muted hover:bg-dark-900"
              >
                Technician
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    email: "admin@evservice.com",
                    password: "Admin123!@#",
                  })
                }
                className="w-full inline-flex justify-center py-2 px-4 border border-dark-300 rounded-md shadow-sm bg-dark-300 text-sm text-text-muted text-text-muted hover:bg-dark-900"
              >
                Admin
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
