import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { servicesAPI, partsAPI } from '../services/api';
import {
  BoltIcon,
  ClockIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  UserGroupIcon,
  CogIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  WrenchScrewdriverIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingParts, setLoadingParts] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await servicesAPI.getAll({ limit: 6 });
        setServices(response.data.data || []);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoadingServices(false);
      }
    };

    const fetchParts = async () => {
      try {
        const response = await partsAPI.getAll({ limit: 6 });
        setParts(response.data.data || []);
      } catch (error) {
        console.error('Error fetching parts:', error);
      } finally {
        setLoadingParts(false);
      }
    };

    fetchServices();
    fetchParts();
  }, []);

  const features = [
    {
      icon: BoltIcon,
      title: 'EV-Specialized Service',
      description: 'Comprehensive maintenance management designed specifically for electric vehicles with battery diagnostics, charging system checks, and motor maintenance.',
      color: 'text-blue-600'
    },
    {
      icon: ClockIcon,
      title: 'Real-Time Tracking',
      description: 'Live appointment status updates, service progress tracking, and instant notifications keep customers informed throughout the service process.',
      color: 'text-green-600'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure & Compliant',
      description: 'Enterprise-grade security with encrypted data storage, PCI DSS compliance for payments, and comprehensive audit trails.',
      color: 'text-purple-600'
    },
    {
      icon: ChartBarIcon,
      title: 'Advanced Analytics',
      description: 'Detailed reporting and analytics for service trends, revenue tracking, inventory management, and performance optimization.',
      color: 'text-orange-600'
    },
    {
      icon: UserGroupIcon,
      title: 'Multi-Role Support',
      description: 'Tailored interfaces for customers, staff, technicians, and administrators with role-based access control and permissions.',
      color: 'text-indigo-600'
    },
    {
      icon: CogIcon,
      title: 'Workflow Automation',
      description: 'Automated appointment scheduling, maintenance reminders, inventory alerts, and payment processing to streamline operations.',
      color: 'text-red-600'
    }
  ];

  const benefits = [
    'Reduce service completion time by up to 30%',
    'Improve customer satisfaction with real-time updates',
    'Optimize inventory management with AI-powered forecasting',
    'Streamline financial operations with integrated payments',
    'Enhance technician productivity with digital workflows',
    'Scale operations across multiple service centers'
  ];

  const stats = [
    { label: 'Service Centers', value: '50+', description: 'Locations supported' },
    { label: 'Vehicles Serviced', value: '10K+', description: 'Monthly maintenance' },
    { label: 'Customer Satisfaction', value: '98%', description: 'Average rating' },
    { label: 'Time Saved', value: '40%', description: 'Operational efficiency' }
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero Section - SPLASH Theme */}
      <section className="relative bg-gradient-to-br from-dark-900 via-dark-300 to-dark-200 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
                Future-Ready
                <span className="block text-lime-200">
                  EV Service
                </span>
                Management
              </h1>
              <p className="text-xl lg:text-2xl text-text-secondary mb-8 leading-relaxed">
                Comprehensive maintenance management system designed specifically for electric vehicle service centers. 
                Streamline operations, enhance customer experience, and optimize service delivery.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center px-8 py-4 bg-lime-200 text-dark-900 font-semibold rounded-lg hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-glow"
                  >
                    Go to Dashboard
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center px-8 py-4 bg-lime-200 text-dark-900 font-semibold rounded-lg hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-glow"
                    >
                      Get Started Free
                      <ArrowRightIcon className="ml-2 h-5 w-5" />
                    </Link>
                    <Link
                      to="/demo"
                      className="inline-flex items-center justify-center px-8 py-4 border-2 border-lime-200 text-lime-200 font-semibold rounded-lg hover:bg-lime-200/10 transition-all duration-200"
                    >
                      View Demo
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="relative">
              <div className="bg-dark-300 backdrop-blur-md rounded-2xl p-8 border border-lime-200 shadow-glow">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-lime-200 rounded-full animate-pulse"></div>
                    <span className="text-lime-200 text-text-muted">System Online</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-dark-200 rounded-lg p-4 border border-dark-100">
                      <div className="text-2xl font-bold text-lime-200">24/7</div>
                      <div className="text-sm text-text-muted">Monitoring</div>
                    </div>
                    <div className="bg-dark-200 rounded-lg p-4 border border-dark-100">
                      <div className="text-2xl font-bold text-lime-200">99.9%</div>
                      <div className="text-sm text-text-muted">Uptime</div>
                    </div>
                  </div>
                  <div className="text-sm text-text-secondary">
                    Real-time service center management dashboard
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - SPLASH Theme */}
      <section className="py-20 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Comprehensive EV Service Management
            </h2>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto">
              Everything you need to manage electric vehicle service operations efficiently,
              from customer intake to service completion and payment processing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-dark-300 rounded-xl p-8 shadow-lg hover:shadow-glow transition-all duration-300 transform hover:-translate-y-2 border border-dark-200 hover:border-lime-200"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-lime-200/20 mb-6 text-lime-200`}>
                  <feature.icon className={`h-6 w-6`} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section - SPLASH Theme */}
      <section className="py-20 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lime-200/20 mb-6">
              <WrenchScrewdriverIcon className="h-8 w-8 text-lime-200" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Our EV Services
            </h2>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto">
              Professional electric vehicle maintenance and repair services tailored to your EV's needs.
            </p>
          </div>

          {loadingServices ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-200"></div>
              <p className="mt-4 text-text-secondary">Loading services...</p>
            </div>
          ) : services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <div
                  key={service._id}
                  className="bg-dark-300 rounded-xl p-8 shadow-lg hover:shadow-glow transition-all duration-300 transform hover:-translate-y-2 border border-dark-200 hover:border-lime-200"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-lime-200/20 mb-6 text-lime-200">
                    <WrenchScrewdriverIcon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {service.name}
                  </h3>
                  {service.category && (
                    <span className="inline-block px-3 py-1 text-xs font-medium bg-lime-200/10 text-lime-200 rounded-full mb-4">
                      {service.category}
                    </span>
                  )}
                  <p className="text-text-secondary leading-relaxed mb-4">
                    {service.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-dark-200">
                    <span className="text-sm text-text-muted">Duration</span>
                    <span className="text-white font-semibold">{service.estimatedDuration} mins</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-text-muted">Price</span>
                    <span className="text-lime-200 font-bold">
                      {service.basePrice?.toLocaleString('vi-VN')} VND
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-text-secondary">No services available at the moment.</p>
            </div>
          )}

          {services.length > 0 && (
            <div className="text-center mt-12">
              <Link
                to="/customer-services"
                className="inline-flex items-center justify-center px-8 py-4 bg-lime-200 text-dark-900 font-semibold rounded-lg hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-glow"
              >
                View All Services
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Parts Section - SPLASH Theme */}
      <section className="py-20 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lime-200/20 mb-6">
              <CubeIcon className="h-8 w-8 text-lime-200" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Genuine EV Parts
            </h2>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto">
              High-quality genuine parts and components for all electric vehicle models.
            </p>
          </div>

          {loadingParts ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-200"></div>
              <p className="mt-4 text-text-secondary">Loading parts...</p>
            </div>
          ) : parts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {parts.map((part) => (
                <div
                  key={part._id}
                  className="bg-dark-300 rounded-xl p-8 shadow-lg hover:shadow-glow transition-all duration-300 transform hover:-translate-y-2 border border-dark-200 hover:border-lime-200"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-lime-200/20 mb-6 text-lime-200">
                    <CubeIcon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {part.name}
                  </h3>
                  {part.partNumber && (
                    <p className="text-sm text-text-muted mb-4">
                      Part #: {part.partNumber}
                    </p>
                  )}
                  <p className="text-text-secondary leading-relaxed mb-4 line-clamp-3">
                    {part.description || 'High-quality genuine part for electric vehicles'}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-dark-200">
                    <span className="text-sm text-text-muted">Stock</span>
                    <span className={`font-semibold ${part.inventory?.currentStock > 0 ? 'text-lime-200' : 'text-red-400'}`}>
                      {part.inventory?.currentStock > 0 ? `${part.inventory.currentStock} available` : 'Out of stock'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-text-muted">Price</span>
                    <span className="text-lime-200 font-bold">
                      {part.pricing?.retail?.toLocaleString('vi-VN')} VND
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-text-secondary">No parts available at the moment.</p>
            </div>
          )}

          {parts.length > 0 && (
            <div className="text-center mt-12">
              <Link
                to="/customer-parts"
                className="inline-flex items-center justify-center px-8 py-4 bg-lime-200 text-dark-900 font-semibold rounded-lg hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-glow"
              >
                View All Parts
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section - SPLASH Theme */}
      <section className="py-20 bg-gradient-to-r from-dark-300 to-dark-200 border-t-4 border-lime-200">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Transform Your EV Service Center?
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            Join leading service centers already using our platform to deliver exceptional EV maintenance services.
          </p>
          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-4 bg-lime-200 text-dark-900 font-semibold rounded-lg hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-glow"
              >
                Start Free Trial
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-lime-200 text-lime-200 font-semibold rounded-lg hover:bg-lime-200/10 transition-all duration-200"
              >
                Contact Sales
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
