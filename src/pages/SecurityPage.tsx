import React from 'react';

const SecurityPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Security & Trust</h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Your security is our top priority. Learn about the measures we take to protect
            your data and ensure a safe experience with our EV service platform.
          </p>
        </div>

        {/* Security Overview */}
        <div className="bg-dark-900 rounded-lg p-8 text-white mb-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-dark-300 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4">Your Data is Protected</h2>
            <p className="text-lg text-lime-100 max-w-2xl mx-auto">
              We employ industry-leading security practices and comply with international
              standards to safeguard your personal information and vehicle data.
            </p>
          </div>
        </div>

        {/* Security Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-dark-300 rounded-lg shadow-lg p-6">
            <div className="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Data Encryption</h3>
            <p className="text-text-secondary">
              All sensitive data is encrypted in transit and at rest using industry-standard
              AES-256 encryption. Your personal information and payment details are never
              stored in plain text.
            </p>
          </div>

          <div className="bg-dark-300 rounded-lg shadow-lg p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Secure Infrastructure</h3>
            <p className="text-text-secondary">
              Our systems are hosted on secure cloud infrastructure with 24/7 monitoring,
              regular security audits, and compliance with international security standards.
            </p>
          </div>

          <div className="bg-dark-300 rounded-lg shadow-lg p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Access Controls</h3>
            <p className="text-text-secondary">
              Multi-factor authentication, role-based access controls, and regular access
              reviews ensure that only authorized personnel can access sensitive information.
            </p>
          </div>

          <div className="bg-dark-300 rounded-lg shadow-lg p-6">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Compliance & Auditing</h3>
            <p className="text-text-secondary">
              Regular security audits, penetration testing, and compliance with GDPR, PDPA,
              and other international data protection regulations ensure ongoing security.
            </p>
          </div>
        </div>

        {/* Security Measures */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Our Security Measures</h2>

          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-6">
              <h3 className="text-lg font-semibold text-white mb-2">Network Security</h3>
              <ul className="text-text-secondary space-y-1">
                <li>• Web Application Firewall (WAF) protection</li>
                <li>• DDoS attack mitigation</li>
                <li>• SSL/TLS encryption for all connections</li>
                <li>• Regular vulnerability scanning</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 pl-6">
              <h3 className="text-lg font-semibold text-white mb-2">Data Protection</h3>
              <ul className="text-text-secondary space-y-1">
                <li>• End-to-end encryption for sensitive data</li>
                <li>• Secure backup and disaster recovery</li>
                <li>• Data anonymization and pseudonymization</li>
                <li>• Regular data retention reviews</li>
              </ul>
            </div>

            <div className="border-l-4 border-purple-500 pl-6">
              <h3 className="text-lg font-semibold text-white mb-2">User Authentication</h3>
              <ul className="text-text-secondary space-y-1">
                <li>• Multi-factor authentication (MFA)</li>
                <li>• Secure password policies</li>
                <li>• Session management and timeouts</li>
                <li>• Account lockout after failed attempts</li>
              </ul>
            </div>

            <div className="border-l-4 border-orange-500 pl-6">
              <h3 className="text-lg font-semibold text-white mb-2">Monitoring & Response</h3>
              <ul className="text-text-secondary space-y-1">
                <li>• 24/7 security monitoring</li>
                <li>• Automated threat detection</li>
                <li>• Incident response procedures</li>
                <li>• Regular security training for staff</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-dark-100 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Certifications & Standards</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lime-600 font-bold text-lg">ISO</span>
              </div>
              <h3 className="font-semibold text-white">ISO 27001</h3>
              <p className="text-sm text-text-secondary">Information Security</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold text-lg">PCI</span>
              </div>
              <h3 className="font-semibold text-white">PCI DSS</h3>
              <p className="text-sm text-text-secondary">Payment Security</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold text-lg">GDPR</span>
              </div>
              <h3 className="font-semibold text-white">GDPR</h3>
              <p className="text-sm text-text-secondary">Data Protection</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-orange-600 font-bold text-lg">SOC</span>
              </div>
              <h3 className="font-semibold text-white">SOC 2</h3>
              <p className="text-sm text-text-secondary">Trust Services</p>
            </div>
          </div>
        </div>

        {/* Contact Security */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Report Security Concerns</h2>
            <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
              If you discover a security vulnerability or have concerns about your data security,
              please contact our security team immediately. We take all reports seriously and
              will respond promptly.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-dark-900 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Security Team</h3>
                <p className="text-text-secondary text-sm mb-2">security@evservicecenter.com</p>
                <p className="text-text-secondary text-xs">Response within 24 hours</p>
              </div>

              <div className="bg-dark-900 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Emergency Hotline</h3>
                <p className="text-text-secondary text-sm mb-2">+84 987 654 321</p>
                <p className="text-text-secondary text-xs">24/7 availability</p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm text-text-secondary">
                We appreciate your help in keeping our platform secure for all users.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPage;
