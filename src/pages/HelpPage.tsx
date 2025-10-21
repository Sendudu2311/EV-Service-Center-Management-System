import React, { useState } from 'react';

const HelpPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const faqs = [
    {
      id: 1,
      category: 'booking',
      question: 'How do I book a service appointment?',
      answer: 'To book a service appointment, log in to your account, navigate to the "Appointments" section, and click "New Appointment". Select your vehicle, choose the service type, and pick an available time slot.'
    },
    {
      id: 2,
      category: 'booking',
      question: 'Can I reschedule my appointment?',
      answer: 'Yes, you can reschedule your appointment up to 24 hours before the scheduled time. Go to your appointments page and click "Reschedule" on the relevant appointment.'
    },
    {
      id: 3,
      category: 'services',
      question: 'What services do you offer for electric vehicles?',
      answer: 'We offer comprehensive EV services including battery diagnostics, charging system maintenance, motor and controller repairs, thermal management, software updates, and general maintenance.'
    },
    {
      id: 4,
      category: 'services',
      question: 'How long does a typical service take?',
      answer: 'Service duration varies by type: diagnostics (15 minutes), basic maintenance (30 minutes), battery service (1-2 hours), and major repairs (2-4 hours or more).'
    },
    {
      id: 5,
      category: 'parts',
      question: 'Do you sell EV parts and accessories?',
      answer: 'Yes, we maintain an inventory of genuine and compatible EV parts including batteries, chargers, motors, controllers, and accessories. Check our parts catalog for availability.'
    },
    {
      id: 6,
      category: 'warranty',
      question: 'What is covered under warranty?',
      answer: 'Our services come with warranty coverage: 12 months/12,000km for repairs, 6 months/6,000km for parts, and 3 months/3,000km for diagnostics. Warranty terms vary by service type.'
    },
    {
      id: 7,
      category: 'payment',
      question: 'What payment methods do you accept?',
      answer: 'We accept credit/debit cards, bank transfers, e-wallets (MoMo, ZaloPay), and cash payments. All transactions are processed securely.'
    },
    {
      id: 8,
      category: 'account',
      question: 'How do I update my vehicle information?',
      answer: 'Go to your profile page and select "Vehicles". You can add new vehicles or update existing vehicle information including make, model, year, and VIN.'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Topics', icon: '📚' },
    { id: 'booking', name: 'Booking', icon: '📅' },
    { id: 'services', name: 'Services', icon: '🔧' },
    { id: 'parts', name: 'Parts', icon: '⚙️' },
    { id: 'warranty', name: 'Warranty', icon: '🛡️' },
    { id: 'payment', name: 'Payment', icon: '💳' },
    { id: 'account', name: 'Account', icon: '👤' }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions about our EV service center.
            Can't find what you're looking for? Contact our support team.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search for help..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-3 rounded-lg text-center transition-colors duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 border-2 border-blue-500 text-blue-700'
                    : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="text-2xl mb-1">{category.icon}</div>
                <div className="text-sm font-medium">{category.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-4">
          {filteredFaqs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.203-2.47M12 7v.01" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try adjusting your search terms or browse different categories.</p>
            </div>
          ) : (
            filteredFaqs.map(faq => (
              <details key={faq.id} className="bg-white rounded-lg shadow-lg">
                <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 pr-4">{faq.question}</h3>
                    <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-green-500 rounded-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
          <p className="text-lg mb-6 text-blue-100">
            Our support team is here to assist you with any questions or concerns.
          </p>
          <div className="space-x-4">
            <a
              href="/contact"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
            >
              Contact Support
            </a>
            <a
              href="tel:+84123456789"
              className="border-2 border-white text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
            >
              Call Us: +84 123 456 789
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a href="/customer-services" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Browse Services</h3>
                <p className="text-sm text-gray-600">View available services</p>
              </div>
            </a>

            <a href="/customer-parts" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Parts Catalog</h3>
                <p className="text-sm text-gray-600">Find replacement parts</p>
              </div>
            </a>

            <a href="/appointments" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">My Appointments</h3>
                <p className="text-sm text-gray-600">Manage your bookings</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;