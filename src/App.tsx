import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

// Pages
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/Dashboard";
import VehiclesPage from "./pages/VehiclesPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import AllVehiclesPage from "./pages/AllVehiclesPage";
import WorkQueuePage from "./pages/WorkQueuePage";
import ProfilePage from "./pages/ProfilePage";
import ServiceCentersPage from "./pages/ServiceCentersPage";
import UsersPage from "./pages/UsersPage";
import ServiceReceptionPage from "./pages/ServiceReceptionPage";
import PartsPage from "./pages/PartsPage";
import ServicesPage from "./pages/ServicesPage";
import CustomerServicesPage from "./pages/CustomerServicesPage";
import CustomerPartsPage from "./pages/CustomerPartsPage";
import ServiceHistoryPage from "./pages/ServiceHistoryPage";
import InvoicesPage from "./pages/InvoicesPage";
import PaymentResult from "./pages/PaymentResult";
import CustomerTransactionsPage from "./pages/CustomerTransactionsPage";
import StaffTransactionsPage from "./pages/StaffTransactionsPage";
import SlotManagerPage from "./pages/SlotManagerPage";
import TechnicianSlotsPage from "./pages/TechnicianSlotsPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import HelpPage from "./pages/HelpPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import SecurityPage from "./pages/SecurityPage";
import CareersPage from "./pages/CareersPage";
import ContactManagementPage from "./pages/ContactManagementPage";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <Layout>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route
                  path="/reset-password/:resetToken"
                  element={<ResetPassword />}
                />

                {/* Static pages */}
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/careers" element={<CareersPage />} />

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Customer routes */}
                <Route
                  path="/vehicles"
                  element={
                    <ProtectedRoute roles={["customer"]}>
                      <VehiclesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Customer Transactions */}
                <Route
                  path="/transactions"
                  element={
                    <ProtectedRoute roles={["customer"]}>
                      <CustomerTransactionsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Customer Services Catalog */}
                <Route
                  path="/customer-services"
                  element={
                    <ProtectedRoute roles={["customer"]}>
                      <CustomerServicesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Customer Parts Catalog */}
                <Route
                  path="/customer-parts"
                  element={
                    <ProtectedRoute roles={["customer"]}>
                      <CustomerPartsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Service History */}
                <Route
                  path="/service-history"
                  element={
                    <ProtectedRoute roles={["customer"]}>
                      <ServiceHistoryPage />
                    </ProtectedRoute>
                  }
                />

                {/* Appointments - accessible by customers, staff, and admins */}
                <Route
                  path="/appointments"
                  element={
                    <ProtectedRoute roles={["customer", "staff", "admin"]}>
                      <AppointmentsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Staff routes */}
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute roles={["staff", "admin"]}>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/slots"
                  element={
                    <ProtectedRoute roles={["staff", "admin"]}>
                      <SlotManagerPage />
                    </ProtectedRoute>
                  }
                />

                {/* Staff/Admin vehicle management */}
                <Route
                  path="/manage-vehicles"
                  element={
                    <ProtectedRoute roles={["staff", "admin", "technician"]}>
                      <AllVehiclesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Technician routes */}
                <Route
                  path="/work-queue"
                  element={
                    <ProtectedRoute roles={["technician"]}>
                      <WorkQueuePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/my-slots"
                  element={
                    <ProtectedRoute roles={["technician"]}>
                      <TechnicianSlotsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Service Reception routes */}
                <Route
                  path="/service-reception/:appointmentId"
                  element={
                    <ProtectedRoute roles={["technician", "staff", "admin"]}>
                      <ServiceReceptionPage />
                    </ProtectedRoute>
                  }
                />

                {/* Services Management routes */}
                <Route
                  path="/services"
                  element={
                    <ProtectedRoute roles={["staff", "admin", "technician"]}>
                      <ServicesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Parts Management routes */}
                <Route
                  path="/parts"
                  element={
                    <ProtectedRoute roles={["staff", "admin", "technician"]}>
                      <PartsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Invoice Management routes */}
                <Route
                  path="/invoices"
                  element={
                    <ProtectedRoute roles={["staff", "admin"]}>
                      <InvoicesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Staff Transaction Management */}
                <Route
                  path="/manage-transactions"
                  element={
                    <ProtectedRoute roles={["staff", "admin"]}>
                      <StaffTransactionsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Contact Management */}
                <Route
                  path="/manage-contacts"
                  element={
                    <ProtectedRoute roles={["staff", "admin"]}>
                      <ContactManagementPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin routes */}
                <Route
                  path="/service-centers"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <ServiceCentersPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold text-white mb-4">
                            Admin Panel
                          </h1>
                          <p className="text-text-secondary">
                            Admin features coming soon...
                          </p>
                        </div>
                      </div>
                    </ProtectedRoute>
                  }
                />

                {/* Profile and Settings */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold text-white mb-4">
                            Settings
                          </h1>
                          <p className="text-text-secondary">
                            Settings page coming soon...
                          </p>
                        </div>
                      </div>
                    </ProtectedRoute>
                  }
                />

                {/* Payment Result */}
                <Route path="/payment/result" element={<PaymentResult />} />

                {/* VNPay Return URL */}
                <Route
                  path="/payment/vnpay-return"
                  element={<PaymentResult />}
                />

                {/* 404 Page */}
                <Route
                  path="*"
                  element={
                    <div className="min-h-screen flex items-center justify-center bg-dark-900">
                      <div className="text-center">
                        <h1 className="text-6xl font-bold text-white mb-4">
                          404
                        </h1>
                        <p className="text-xl text-text-secondary mb-8">
                          Page not found
                        </p>
                        <a
                          href="/"
                          className="bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 text-dark-900 px-6 py-3 rounded-lg transition-colors duration-200"
                        >
                          Go Home
                        </a>
                      </div>
                    </div>
                  }
                />
              </Routes>
            </Layout>

            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#363636",
                  color: "#fff",
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: "#10B981",
                    secondary: "#fff",
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: "#EF4444",
                    secondary: "#fff",
                  },
                },
              }}
            />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
