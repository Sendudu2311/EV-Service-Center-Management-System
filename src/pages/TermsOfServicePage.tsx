import React from 'react';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-lg text-text-secondary">
            Last updated: October 21, 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-text-secondary leading-relaxed">
              By accessing and using the EV Service Center management system ("Service"), you accept and agree to be
              bound by the terms and provision of this agreement. If you do not agree to abide by the above, please
              do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
            <p className="text-text-secondary leading-relaxed">
              EV Service Center provides a comprehensive management system for electric vehicle servicing, including
              appointment scheduling, service tracking, parts management, invoicing, and customer relationship management.
              The system is available through web and mobile applications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts</h2>
            <div className="space-y-4">
              <p className="text-text-secondary">To use certain features of the Service, you must register for an account and provide accurate information:</p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You agree to notify us immediately of any unauthorized use of your account</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>We reserve the right to terminate accounts that violate these terms</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Service Usage</h2>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Permitted Use</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
                <li>Schedule and manage service appointments</li>
                <li>Access service history and vehicle information</li>
                <li>View and purchase parts and accessories</li>
                <li>Manage invoices and payment records</li>
                <li>Communicate with service providers</li>
              </ul>

              <h3 className="text-lg font-semibold text-white">Prohibited Use</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful or malicious code</li>
                <li>Attempt to gain unauthorized access to systems</li>
                <li>Use the service for fraudulent purposes</li>
                <li>Interfere with service operations</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Service Appointments</h2>
            <div className="space-y-4">
              <p className="text-text-secondary">Appointment booking and management is subject to the following terms:</p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li>Appointments are confirmed upon acceptance by the service center</li>
                <li>Cancellation policies vary by service type and must be reviewed before booking</li>
                <li>Late arrivals may result in appointment rescheduling</li>
                <li>Emergency services take priority over scheduled appointments</li>
                <li>Service estimates are approximate and may vary based on actual conditions</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Payment Terms</h2>
            <div className="space-y-4">
              <p className="text-text-secondary">Payment for services is governed by the following terms:</p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li>All fees must be paid in full before vehicle release</li>
                <li>Accepted payment methods include credit cards, debit cards, and approved digital wallets</li>
                <li>Additional charges may apply for rush services or after-hours work</li>
                <li>Disputed charges must be reported within 30 days of service completion</li>
                <li>Late payment fees may apply to overdue accounts</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Warranties and Liability</h2>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Service Warranties</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
                <li>Parts warranty: 6 months or 6,000 km, whichever comes first</li>
                <li>Labor warranty: 12 months or 12,000 km, whichever comes first</li>
                <li>Diagnostic services: 3 months or 3,000 km warranty</li>
                <li>Battery services: 12 months or 12,000 km warranty</li>
              </ul>

              <h3 className="text-lg font-semibold text-white">Limitation of Liability</h3>
              <p className="text-text-secondary leading-relaxed">
                EV Service Center's liability is limited to the amount paid for services. We are not liable for
                consequential damages, lost profits, or incidental damages. Some jurisdictions do not allow limitation
                of liability, so these limitations may not apply to you.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Intellectual Property</h2>
            <p className="text-text-secondary leading-relaxed">
              The Service and its original content, features, and functionality are owned by EV Service Center and
              are protected by copyright, trademark, and other intellectual property laws. You may not duplicate,
              copy, or reuse any portion of the service without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Privacy</h2>
            <p className="text-text-secondary leading-relaxed">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the
              Service, to understand our practices regarding the collection and use of your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Termination</h2>
            <p className="text-text-secondary leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior notice,
              for conduct that we believe violates these Terms or is harmful to other users, us, or third parties,
              or for any other reason at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Governing Law</h2>
            <p className="text-text-secondary leading-relaxed">
              These Terms shall be interpreted and governed by the laws of Vietnam, without regard to conflict of
              law provisions. Any disputes arising from these terms shall be resolved in the courts of Ho Chi Minh City.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Changes to Terms</h2>
            <p className="text-text-secondary leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of material changes via
              email or through the Service. Your continued use of the Service after such modifications constitutes
              acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Contact Information</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-dark-900 rounded-lg p-4">
              <p className="text-text-secondary"><strong>Email:</strong> legal@evservicecenter.com</p>
              <p className="text-text-secondary"><strong>Phone:</strong> +84 123 456 789</p>
              <p className="text-text-secondary"><strong>Address:</strong> 123 EV Service Center, Ho Chi Minh City, Vietnam</p>
            </div>
          </section>

          <section className="border-t pt-8">
            <p className="text-sm text-text-secondary text-center">
              By using EV Service Center, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
