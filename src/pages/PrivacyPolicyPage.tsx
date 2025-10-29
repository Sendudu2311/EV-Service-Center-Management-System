import React from 'react';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-lg text-text-secondary">
            Last updated: October 21, 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p className="text-text-secondary leading-relaxed">
              At EV Service Center ("we," "us," or "our"), we are committed to protecting your privacy and ensuring
              the security of your personal information. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our electric vehicle service management system.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Personal Information</h3>
                <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
                  <li>Name, email address, phone number</li>
                  <li>Vehicle information (make, model, year, VIN)</li>
                  <li>Service history and appointment details</li>
                  <li>Payment information and transaction history</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Technical Information</h3>
                <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
                  <li>IP address and location data</li>
                  <li>Device information and browser type</li>
                  <li>Usage patterns and system logs</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-text-secondary mb-4">We use the collected information for the following purposes:</p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li>Provide and maintain our EV service management system</li>
              <li>Process service appointments and manage vehicle maintenance</li>
              <li>Handle payments and maintain transaction records</li>
              <li>Communicate with you about services and updates</li>
              <li>Improve our services and develop new features</li>
              <li>Ensure security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Information Sharing and Disclosure</h2>
            <p className="text-text-secondary mb-4">We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:</p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li><strong>Service Providers:</strong> With trusted third-party service providers who assist in operating our system</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>Consent:</strong> With your explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Data Security</h2>
            <p className="text-text-secondary leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction. This includes encryption of sensitive data,
              secure server infrastructure, and regular security assessments. However, no method of transmission over the
              internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Data Retention</h2>
            <p className="text-text-secondary leading-relaxed">
              We retain your personal information for as long as necessary to provide our services, comply with legal
              obligations, resolve disputes, and enforce our agreements. Service history and vehicle information may
              be retained indefinitely for warranty and regulatory compliance purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Your Rights</h2>
            <p className="text-text-secondary mb-4">You have the following rights regarding your personal information:</p>
            <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
              <li><strong>Portability:</strong> Request transfer of your data in a structured format</li>
              <li><strong>Objection:</strong> Object to processing of your personal information</li>
              <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-text-secondary leading-relaxed">
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, and maintain
              session security. You can control cookie settings through your browser preferences, though disabling
              cookies may affect functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Third-Party Services</h2>
            <p className="text-text-secondary leading-relaxed">
              Our system may integrate with third-party services for payment processing, authentication, and analytics.
              These services have their own privacy policies, and we encourage you to review them. We are not responsible
              for the privacy practices of these third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. International Data Transfers</h2>
            <p className="text-text-secondary leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. We ensure that
              such transfers comply with applicable data protection laws and implement appropriate safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Children's Privacy</h2>
            <p className="text-text-secondary leading-relaxed">
              Our services are not intended for children under 13 years of age. We do not knowingly collect personal
              information from children under 13. If we become aware that we have collected such information, we will
              take steps to delete it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-text-secondary leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting
              the new policy on this page and updating the "Last updated" date. Your continued use of our services after
              such changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Contact Us</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-dark-900 rounded-lg p-4">
              <p className="text-text-secondary"><strong>Email:</strong> privacy@evservicecenter.com</p>
              <p className="text-text-secondary"><strong>Phone:</strong> +84 123 456 789</p>
              <p className="text-text-secondary"><strong>Address:</strong> 123 EV Service Center, Ho Chi Minh City, Vietnam</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
