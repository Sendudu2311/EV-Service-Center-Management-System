import React from 'react';
import { Link } from 'react-router-dom';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">About EV Service Center</h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Leading the future of electric vehicle maintenance with innovative technology
            and exceptional service quality.
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Our Mission</h2>
          <p className="text-lg text-text-secondary leading-relaxed mb-6">
            At EV Service Center, we are committed to revolutionizing electric vehicle maintenance
            through cutting-edge technology, expert technicians, and unparalleled customer service.
            Our comprehensive management system ensures every EV receives the specialized care it deserves.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Innovation</h3>
              <p className="text-text-secondary">Leveraging the latest technology for efficient EV servicing</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Quality</h3>
              <p className="text-text-secondary">Certified technicians ensuring top-tier service standards</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Customer First</h3>
              <p className="text-text-secondary">Putting your satisfaction and vehicle safety first</p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-dark-900 rounded-lg p-8 text-white mb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">500+</div>
              <div className="text-lime-100">EVs Serviced</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">50+</div>
              <div className="text-lime-100">Expert Technicians</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">99%</div>
              <div className="text-lime-100">Customer Satisfaction</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">24/7</div>
              <div className="text-lime-100">Support Available</div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Experience the Future?</h2>
          <p className="text-lg text-text-secondary mb-8">
            Join thousands of EV owners who trust us with their vehicles.
          </p>
          <div className="space-x-4">
            <Link
              to="/register"
              className="bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 text-black font-semibold px-8 py-3 rounded-lg transition-colors duration-200"
            >
              Get Started
            </Link>
            <Link
              to="/contact"
              className="bg-dark-300 hover:bg-dark-900 text-lime-600 border border-blue-600 px-8 py-3 rounded-lg text-text-muted transition-colors duration-200"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
