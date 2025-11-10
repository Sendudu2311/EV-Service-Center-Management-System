import React from 'react';

const PrivacyPolicyPage: React.FC = () => {
  const sections = [
    {
      id: 'introduction',
      title: 'Introduction',
      content: `Welcome to the EV Service Center Management System ("we," "us," or "our"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our electric vehicle service center management platform.`
    },
    {
      id: 'information-collection',
      title: 'Information We Collect',
      subsections: [
        {
          title: 'Personal Information',
          items: [
            'Name, email address, and phone number',
            'Account credentials and authentication data',
            'Role information (Customer, Staff, Technician, Administrator)',
            'Service center location and contact details'
          ]
        },
        {
          title: 'Vehicle Information',
          items: [
            'Vehicle make, model, year, and VIN',
            'Battery type, capacity, and charging power specifications',
            'EV-specific data (motor type, charging port compatibility)',
            'Service history, maintenance records, and diagnostic data',
            'EV checklist results and battery health reports'
          ]
        },
        {
          title: 'Service & Transaction Data',
          items: [
            'Appointment details and service reception forms',
            'Part requests and inventory transactions',
            'Service progress and technician notes',
            'Vietnamese invoices with VND amounts and 10% VAT',
            'Payment information processed through Stripe',
            'Transaction history and financial records'
          ]
        },
        {
          title: 'Technical Information',
          items: [
            'IP address, device information, and browser type',
            'Usage patterns, system logs, and performance data',
            'Real-time Socket.io connection data',
            'Cookies and session tokens (JWT)'
          ]
        }
      ]
    },
    {
      id: 'information-use',
      title: 'How We Use Your Information',
      items: [
        'Manage the 14-state appointment workflow (from booking to completion)',
        'Process service receptions and EV checklists',
        'Handle parts requests with approval workflows',
        'Generate Vietnamese-compliant invoices with 10% VAT',
        'Process payments securely through Stripe integration',
        'Provide real-time status updates via Socket.io',
        'Enable role-based dashboards and access control',
        'Send notifications about service progress and appointments',
        'Maintain vehicle service history and diagnostic records',
        'Analyze service trends and optimize operations',
        'Ensure system security and prevent fraud',
        'Comply with Vietnamese business and tax regulations'
      ]
    },
    {
      id: 'information-sharing',
      title: 'Information Sharing and Disclosure',
      content: `We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:`,
      subsections: [
        {
          title: 'Service Providers',
          description: 'We share data with trusted third-party service providers:',
          items: [
            'MongoDB Atlas for secure database hosting',
            'Stripe for payment processing (PCI DSS compliant)',
            'Email service providers (Nodemailer) for notifications',
            'Cloud hosting providers for application infrastructure'
          ]
        },
        {
          title: 'Legal Requirements',
          description: 'When required by Vietnamese law or to protect our rights, safety, and property, or in response to lawful requests by public authorities.'
        },
        {
          title: 'Business Transfers',
          description: 'In connection with a merger, acquisition, or sale of assets, provided the acquiring party agrees to protect your information.'
        },
        {
          title: 'With Your Consent',
          description: 'When you explicitly consent to sharing your information for specific purposes.'
        }
      ]
    },
    {
      id: 'data-security',
      title: 'Data Security',
      content: `We implement comprehensive security measures to protect your information:`,
      items: [
        'JWT (JSON Web Token) authentication with bcrypt password hashing',
        'Role-based access control (RBAC) for multi-role system',
        'Encrypted data transmission via HTTPS/TLS',
        'Secure MongoDB database with authentication and encryption',
        'PCI DSS compliant payment processing through Stripe',
        'Regular security assessments and vulnerability testing',
        'Audit trails for all critical operations',
        'Secure session management and token expiration',
        'Input validation and sanitization to prevent injection attacks'
      ],
      disclaimer: `However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee absolute security.`
    },
    {
      id: 'data-retention',
      title: 'Data Retention',
      content: `We retain your personal information for as long as necessary to provide our services and comply with legal obligations:`,
      items: [
        'Account information: Retained while your account is active',
        'Service history: Retained indefinitely for warranty and regulatory compliance',
        'Vehicle diagnostics: Retained for maintenance tracking and safety recalls',
        'Financial records: Retained for 10 years per Vietnamese tax regulations',
        'Appointment records: Retained for 5 years for audit purposes',
        'Parts inventory logs: Retained for 3 years for accounting compliance'
      ]
    },
    {
      id: 'user-rights',
      title: 'Your Rights',
      content: `You have the following rights regarding your personal information:`,
      subsections: [
        {
          title: 'Access',
          description: 'Request a copy of the personal information we hold about you, including service history, vehicle data, and transaction records.'
        },
        {
          title: 'Correction',
          description: 'Request correction of inaccurate or incomplete information through your dashboard or by contacting support.'
        },
        {
          title: 'Deletion',
          description: 'Request deletion of your personal information, subject to legal retention requirements and active service obligations.'
        },
        {
          title: 'Data Portability',
          description: 'Request transfer of your data in a structured, machine-readable format (JSON/CSV).'
        },
        {
          title: 'Objection',
          description: 'Object to processing of your personal information for marketing or analytics purposes.'
        },
        {
          title: 'Restriction',
          description: 'Request restriction of processing in certain circumstances, such as during dispute resolution.'
        }
      ],
      contact: `To exercise these rights, please contact us at privacy@evservicecenter.com or through your account settings.`
    },
    {
      id: 'cookies',
      title: 'Cookies and Tracking Technologies',
      content: `We use cookies and similar technologies to enhance your experience:`,
      types: [
        {
          type: 'Essential Cookies',
          description: 'Required for authentication (JWT tokens), session management, and basic functionality. These cannot be disabled.'
        },
        {
          type: 'Functional Cookies',
          description: 'Remember your preferences, language settings, and dashboard customizations.'
        },
        {
          type: 'Performance Cookies',
          description: 'Analyze usage patterns, monitor system performance, and identify optimization opportunities.'
        },
        {
          type: 'Real-Time Tracking',
          description: 'Socket.io connections for live appointment updates, notifications, and chat functionality.'
        }
      ],
      control: `You can control cookie settings through your browser preferences. However, disabling essential cookies may affect system functionality and prevent you from using certain features.`
    },
    {
      id: 'third-party',
      title: 'Third-Party Services',
      content: `Our platform integrates with the following third-party services:`,
      services: [
        {
          name: 'Stripe',
          purpose: 'Payment processing for Vietnamese invoices',
          compliance: 'PCI DSS Level 1 certified',
          policy: 'https://stripe.com/privacy'
        },
        {
          name: 'MongoDB Atlas',
          purpose: 'Database hosting and management',
          compliance: 'SOC 2 Type II, ISO 27001',
          policy: 'https://www.mongodb.com/legal/privacy-policy'
        },
        {
          name: 'Email Service Provider',
          purpose: 'Transactional emails and notifications',
          compliance: 'GDPR compliant',
          policy: 'Contact for details'
        }
      ],
      disclaimer: `These services have their own privacy policies. We encourage you to review them. We are not responsible for the privacy practices of these third parties.`
    },
    {
      id: 'vietnamese-compliance',
      title: 'Vietnamese Legal Compliance',
      content: `Our platform is designed to comply with Vietnamese regulations:`,
      items: [
        'Personal Data Protection Decree 13/2023/NĐ-CP compliance',
        'Vietnamese currency (VND) and 10% VAT calculations',
        'Vietnamese invoice standards and tax reporting',
        'Data localization requirements for sensitive information',
        'Vietnamese business practices and service industry standards',
        'Financial record retention per Ministry of Finance regulations'
      ]
    },
    {
      id: 'international-transfers',
      title: 'International Data Transfers',
      content: `While our primary operations are in Vietnam, your information may be transferred to and processed in other countries for the following purposes:`,
      items: [
        'Cloud infrastructure hosting (MongoDB Atlas, AWS)',
        'Payment processing through Stripe',
        'Email service providers',
        'Technical support and maintenance'
      ],
      safeguards: `We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards, including standard contractual clauses and data processing agreements.`
    },
    {
      id: 'children-privacy',
      title: 'Children\'s Privacy',
      content: `Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from minors. If we become aware that we have collected such information, we will take immediate steps to delete it. Parents or guardians who believe we may have collected information from a minor should contact us immediately.`
    },
    {
      id: 'changes',
      title: 'Changes to This Privacy Policy',
      content: `We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or business operations. We will notify you of any material changes by:`,
      items: [
        'Posting the updated policy on this page',
        'Updating the "Last updated" date',
        'Sending email notifications for significant changes',
        'Displaying in-app notifications upon login'
      ],
      acceptance: `Your continued use of our services after such changes constitutes acceptance of the updated policy. We encourage you to review this Privacy Policy periodically.`
    },
    {
      id: 'contact',
      title: 'Contact Us',
      content: `If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:`,
      contactInfo: {
        email: 'privacy@evservicecenter.com',
        phone: '+84 123 456 789',
        address: '123 EV Service Center, District 1, Ho Chi Minh City, Vietnam',
        support: 'Use the in-app support chat for immediate assistance',
        hours: 'Monday - Friday: 8:00 AM - 6:00 PM (GMT+7)'
      }
    }
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero Section - SPLASH Theme */}
      <section className="relative bg-gradient-to-br from-dark-900 via-dark-300 to-dark-200 text-white overflow-hidden border-b-4 border-lime-200">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Privacy Policy
            </h1>
            <p className="text-lg text-text-secondary mb-2">
              EV Service Center Management System
            </p>
            <p className="text-sm text-lime-200">
              Last updated: January 6, 2025
            </p>
          </div>
        </div>
      </section>

      {/* Table of Contents - SPLASH Theme */}
      <section className="sticky top-0 z-40 bg-dark-300/95 backdrop-blur-md border-b border-lime-200/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 overflow-x-auto py-3 scrollbar-thin scrollbar-thumb-lime-200/20 scrollbar-track-transparent">
            <span className="text-xs font-bold text-lime-200 whitespace-nowrap uppercase tracking-wider">
              Sections:
            </span>
            <div className="flex gap-2 flex-wrap">
              {sections.map((section, index) => (
                <button
                  key={index}
                  onClick={() => scrollToSection(section.id)}
                  className="group relative text-xs px-3 py-1.5 rounded-md bg-dark-200/80 text-text-secondary hover:bg-dark-200 hover:text-lime-200 transition-all duration-200 whitespace-nowrap border border-transparent hover:border-lime-200/50"
                >
                  <span className="relative z-10">{index + 1}. {section.title}</span>
                  <div className="absolute inset-0 bg-lime-200/0 group-hover:bg-lime-200/5 rounded-md transition-all duration-200"></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content Section - SPLASH Theme */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {sections.map((section, index) => (
            <section
              key={index}
              id={section.id}
              className="bg-dark-300 rounded-xl p-8 shadow-lg border border-dark-200 hover:border-lime-200/50 transition-all duration-300"
            >
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6 flex items-center">
                <span className="inline-block w-2 h-8 bg-lime-200 rounded-full mr-4"></span>
                {index + 1}. {section.title}
              </h2>

              {section.content && (
                <p className="text-text-secondary leading-relaxed mb-6">
                  {section.content}
                </p>
              )}

              {section.items && (
                <ul className="space-y-3 mb-6">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-3">
                      <div className="w-1.5 h-1.5 bg-lime-200 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-text-secondary leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.subsections && (
                <div className="space-y-6">
                  {section.subsections.map((subsection, idx) => (
                    <div key={idx} className="bg-dark-200 rounded-lg p-6 border border-dark-100">
                      <h3 className="text-lg font-semibold text-white mb-3">
                        {subsection.title}
                      </h3>
                      {subsection.description && (
                        <p className="text-text-secondary mb-3">{subsection.description}</p>
                      )}
                      {subsection.items && (
                        <ul className="space-y-2">
                          {subsection.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-start space-x-3">
                              <div className="w-1.5 h-1.5 bg-lime-200 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-text-secondary text-sm">{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {section.types && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {section.types.map((type, idx) => (
                    <div key={idx} className="bg-dark-200 rounded-lg p-5 border border-dark-100">
                      <h4 className="text-sm font-bold text-lime-200 mb-2">{type.type}</h4>
                      <p className="text-text-secondary text-sm">{type.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {section.services && (
                <div className="space-y-4 mb-6">
                  {section.services.map((service, idx) => (
                    <div key={idx} className="bg-dark-200 rounded-lg p-5 border border-dark-100">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-bold text-white">{service.name}</h4>
                        <span className="text-xs px-2 py-1 bg-lime-200/20 text-lime-200 rounded-full">{service.compliance}</span>
                      </div>
                      <p className="text-text-secondary text-sm mb-2">{service.purpose}</p>
                      <a href={service.policy} target="_blank" rel="noopener noreferrer" className="text-xs text-lime-200 hover:underline">
                        Privacy Policy →
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {section.disclaimer && (
                <div className="bg-dark-200 rounded-lg p-5 border-l-4 border-lime-200 mt-4">
                  <p className="text-text-secondary text-sm italic">{section.disclaimer}</p>
                </div>
              )}

              {section.contact && (
                <div className="bg-dark-200 rounded-lg p-5 border-l-4 border-lime-200 mt-4">
                  <p className="text-text-secondary text-sm">{section.contact}</p>
                </div>
              )}

              {section.control && (
                <div className="bg-dark-200 rounded-lg p-5 border-l-4 border-lime-200 mt-4">
                  <p className="text-text-secondary text-sm">{section.control}</p>
                </div>
              )}

              {section.safeguards && (
                <div className="bg-dark-200 rounded-lg p-5 border-l-4 border-lime-200 mt-4">
                  <p className="text-text-secondary text-sm italic">{section.safeguards}</p>
                </div>
              )}

              {section.acceptance && (
                <div className="bg-dark-200 rounded-lg p-5 border-l-4 border-lime-200 mt-4">
                  <p className="text-text-secondary text-sm">{section.acceptance}</p>
                </div>
              )}

              {section.contactInfo && (
                <div className="bg-dark-200 rounded-lg p-6 border border-dark-100 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-lime-200 mb-1">Email</p>
                      <p className="text-text-secondary text-sm">{section.contactInfo.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-lime-200 mb-1">Phone</p>
                      <p className="text-text-secondary text-sm">{section.contactInfo.phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-semibold text-lime-200 mb-1">Address</p>
                      <p className="text-text-secondary text-sm">{section.contactInfo.address}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-lime-200 mb-1">Support</p>
                      <p className="text-text-secondary text-sm">{section.contactInfo.support}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-lime-200 mb-1">Business Hours</p>
                      <p className="text-text-secondary text-sm">{section.contactInfo.hours}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-dark-300 rounded-lg px-8 py-6 border border-lime-200 shadow-lg">
            <p className="text-text-secondary text-sm mb-2">
              Thank you for trusting the EV Service Center Management System with your information.
            </p>
            <p className="text-lime-200 text-xs font-semibold">
              Your privacy and security are our top priorities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
