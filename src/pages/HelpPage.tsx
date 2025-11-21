import React, { useState } from 'react';

const HelpPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const faqs = [
    {
      id: 1,
      category: 'booking',
      question: 'Làm thế nào để đặt lịch hẹn dịch vụ?',
      answer: 'Để đặt lịch hẹn dịch vụ, đăng nhập vào tài khoản của bạn, điều hướng đến phần "Lịch Hẹn", và nhấp "Đặt Lịch Mới". Chọn xe của bạn, chọn loại dịch vụ, và chọn khung giờ có sẵn.'
    },
    {
      id: 2,
      category: 'booking',
      question: 'Tôi có thể đổi lịch hẹn không?',
      answer: 'Có, bạn có thể đổi lịch hẹn trước 24 giờ so với thời gian đã đặt. Vào trang lịch hẹn của bạn và nhấp "Đổi Lịch" trên lịch hẹn tương ứng.'
    },
    {
      id: 3,
      category: 'services',
      question: 'Bạn cung cấp những dịch vụ gì cho xe điện?',
      answer: 'Chúng tôi cung cấp dịch vụ xe điện toàn diện bao gồm chẩn đoán pin, bảo trì hệ thống sạc, sửa chữa động cơ và bộ điều khiển, quản lý nhiệt độ, cập nhật phần mềm và bảo trì chung.'
    },
    {
      id: 4,
      category: 'services',
      question: 'Một dịch vụ thông thường mất bao lâu?',
      answer: 'Thời gian dịch vụ thay đổi theo loại: chẩn đoán (15 phút), bảo trì cơ bản (30 phút), dịch vụ pin (1-2 giờ), và sửa chữa lớn (2-4 giờ hoặc hơn).'
    },
    {
      id: 5,
      category: 'parts',
      question: 'Bạn có bán phụ tùng và phụ kiện xe điện không?',
      answer: 'Có, chúng tôi duy trì kho phụ tùng xe điện chính hãng và tương thích bao gồm pin, bộ sạc, động cơ, bộ điều khiển và phụ kiện. Kiểm tra danh mục phụ tùng để biết tình trạng còn hàng.'
    },
    {
      id: 6,
      category: 'warranty',
      question: 'Những gì được bảo hành?',
      answer: 'Dịch vụ của chúng tôi đi kèm với bảo hành: 12 tháng/12.000km cho sửa chữa, 6 tháng/6.000km cho phụ tùng, và 3 tháng/3.000km cho chẩn đoán. Điều khoản bảo hành thay đổi theo loại dịch vụ.'
    },
    {
      id: 7,
      category: 'payment',
      question: 'Bạn chấp nhận những phương thức thanh toán nào?',
      answer: 'Chúng tôi chấp nhận thẻ tín dụng/ghi nợ, chuyển khoản ngân hàng, ví điện tử (MoMo, ZaloPay), và thanh toán tiền mặt. Tất cả giao dịch được xử lý an toàn.'
    },
    {
      id: 8,
      category: 'account',
      question: 'Làm thế nào để cập nhật thông tin xe của tôi?',
      answer: 'Vào trang hồ sơ của bạn và chọn "Xe". Bạn có thể thêm xe mới hoặc cập nhật thông tin xe hiện có bao gồm hãng, mẫu, năm sản xuất và số VIN.'
    }
  ];

  const categories = [
    { id: 'all', name: 'Tất Cả Chủ Đề', icon: '📚' },
    { id: 'booking', name: 'Đặt Lịch', icon: '📅' },
    { id: 'services', name: 'Dịch Vụ', icon: '🔧' },
    { id: 'parts', name: 'Phụ Tùng', icon: '⚙️' },
    { id: 'warranty', name: 'Bảo Hành', icon: '🛡️' },
    { id: 'payment', name: 'Thanh Toán', icon: '💳' },
    { id: 'account', name: 'Tài Khoản', icon: '👤' }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Trung Tâm Trợ Giúp</h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Tìm câu trả lời cho các câu hỏi thường gặp về trung tâm dịch vụ xe điện của chúng tôi.
            Không tìm thấy câu trả lời? Liên hệ đội ngũ hỗ trợ của chúng tôi.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-6 mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm trợ giúp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-dark-200 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Duyệt Theo Danh Mục</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-3 rounded-lg text-center transition-colors duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-dark-100 border-2 border-blue-500 text-lime-700'
                    : 'bg-dark-900 border-2 border-dark-200 text-text-secondary hover:bg-dark-100'
                }`}
              >
                <div className="text-2xl mb-1">{category.icon}</div>
                <div className="text-sm text-text-muted">{category.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-4">
          {filteredFaqs.length === 0 ? (
            <div className="bg-dark-300 rounded-lg shadow-lg p-8 text-center">
              <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.203-2.47M12 7v.01" />
              </svg>
              <h3 className="text-lg text-text-muted text-white mb-2">Không tìm thấy kết quả</h3>
              <p className="text-text-secondary">Hãy thử điều chỉnh từ khóa tìm kiếm hoặc duyệt các danh mục khác.</p>
            </div>
          ) : (
            filteredFaqs.map(faq => (
              <details key={faq.id} className="bg-dark-300 rounded-lg shadow-lg">
                <summary className="p-6 cursor-pointer hover:bg-dark-900 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg text-text-muted text-white pr-4">{faq.question}</h3>
                    <svg className="w-5 h-5 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-text-secondary leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-dark-900 rounded-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Vẫn cần trợ giúp?</h2>
          <p className="text-lg mb-6 text-lime-100">
            Đội ngũ hỗ trợ của chúng tôi sẵn sàng hỗ trợ bạn với bất kỳ câu hỏi hoặc thắc mắc nào.
          </p>
          <div className="space-x-4">
            <a
              href="/contact"
              className="bg-dark-300 text-lime-600 px-6 py-3 rounded-lg text-text-muted hover:bg-dark-900 transition-colors duration-200"
            >
              Liên Hệ Hỗ Trợ
            </a>
            <a
              href="tel:+84123456789"
              className="border-2 border-white text-white px-6 py-3 rounded-lg text-text-muted hover:bg-dark-700 transition-colors duration-200"
            >
              Gọi: +84 123 456 789
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 bg-dark-300 rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Liên Kết Nhanh</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a href="/customer-services" className="flex items-center p-4 border border-dark-200 rounded-lg hover:bg-dark-900 transition-colors duration-200">
              <div className="w-10 h-10 bg-dark-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-text-muted text-white">Duyệt Dịch Vụ</h3>
                <p className="text-sm text-text-secondary">Xem các dịch vụ có sẵn</p>
              </div>
            </a>

            <a href="/customer-parts" className="flex items-center p-4 border border-dark-200 rounded-lg hover:bg-dark-900 transition-colors duration-200">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-text-muted text-white">Danh Mục Phụ Tùng</h3>
                <p className="text-sm text-text-secondary">Tìm phụ tùng thay thế</p>
              </div>
            </a>

            <a href="/appointments" className="flex items-center p-4 border border-dark-200 rounded-lg hover:bg-dark-900 transition-colors duration-200">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-text-muted text-white">Lịch Hẹn Của Tôi</h3>
                <p className="text-sm text-text-secondary">Quản lý lịch đặt của bạn</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;