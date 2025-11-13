import React from 'react';
import { Link } from 'react-router-dom';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">Về Trung Tâm Dịch Vụ Xe Điện</h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Dẫn đầu tương lai bảo trì xe điện với công nghệ đổi mới
            và chất lượng dịch vụ xuất sắc.
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Sứ Mệnh Của Chúng Tôi</h2>
          <p className="text-lg text-text-secondary leading-relaxed mb-6">
            Tại Trung Tâm Dịch Vụ Xe Điện, chúng tôi cam kết cách mạng hóa việc bảo trì xe điện
            thông qua công nghệ tiên tiến, kỹ thuật viên chuyên nghiệp và dịch vụ khách hàng tuyệt vời.
            Hệ thống quản lý toàn diện của chúng tôi đảm bảo mọi xe điện đều nhận được sự chăm sóc chuyên biệt xứng đáng.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Đổi Mới</h3>
              <p className="text-text-secondary">Áp dụng công nghệ mới nhất cho dịch vụ xe điện hiệu quả</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Chất Lượng</h3>
              <p className="text-text-secondary">Kỹ thuật viên được chứng nhận đảm bảo tiêu chuẩn dịch vụ hàng đầu</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Khách Hàng Là Trên Hết</h3>
              <p className="text-text-secondary">Đặt sự hài lòng và an toàn xe của bạn lên hàng đầu</p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-dark-900 rounded-lg p-8 text-white mb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">500+</div>
              <div className="text-lime-100">Xe Điện Đã Phục Vụ</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">50+</div>
              <div className="text-lime-100">Kỹ Thuật Viên Chuyên Nghiệp</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">99%</div>
              <div className="text-lime-100">Sự Hài Lòng Khách Hàng</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">24/7</div>
              <div className="text-lime-100">Hỗ Trợ Luôn Sẵn Sàng</div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Sẵn Sàng Trải Nghiệm Tương Lai?</h2>
          <p className="text-lg text-text-secondary mb-8">
            Tham gia cùng hàng ngàn chủ xe điện tin tưởng chúng tôi với xe của họ.
          </p>
          <div className="space-x-4">
            <Link
              to="/register"
              className="bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 text-black font-semibold px-8 py-3 rounded-lg transition-colors duration-200"
            >
              Bắt Đầu Ngay
            </Link>
            <Link
              to="/contact"
              className="bg-dark-300 hover:bg-dark-900 text-lime-600 border border-blue-600 px-8 py-3 rounded-lg text-text-muted transition-colors duration-200"
            >
              Liên Hệ Chúng Tôi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;