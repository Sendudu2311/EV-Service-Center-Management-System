import React, { useState } from 'react';
import { contactsAPI } from '../services/api';
import toast from 'react-hot-toast';

const ContactPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      await contactsAPI.create({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject,
        message: formData.message.trim(),
      });

      toast.success('Thank you for your message! We will get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      toast.error(error.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">Liên Hệ Với Chúng Tôi</h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Có câu hỏi về dịch vụ xe điện của chúng tôi? Chúng tôi sẵn sàng hỗ trợ. Liên hệ với đội ngũ của chúng tôi
            và chúng tôi sẽ phản hồi sớm nhất có thể.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="bg-dark-300 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Thông Tin Liên Hệ</h2>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Điện Thoại</h3>
                  <p className="text-text-secondary">+84 123 456 789</p>
                  <p className="text-text-secondary">+84 987 654 321</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Email</h3>
                  <p className="text-text-secondary">info@evservicecenter.com</p>
                  <p className="text-text-secondary">support@evservicecenter.com</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Giờ Làm Việc</h3>
                  <p className="text-text-secondary">Thứ Hai - Thứ Sáu: 8:00 AM - 6:00 PM</p>
                  <p className="text-text-secondary">Thứ Bảy: 9:00 AM - 4:00 PM</p>
                  <p className="text-text-secondary">Chủ Nhật: Nghỉ</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-dark-300 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Gửi Tin Nhắn Cho Chúng Tôi</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm text-text-muted text-text-secondary mb-2">
                  Họ và Tên *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-dark-300 rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-transparent"
                  placeholder="Họ và tên của bạn"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm text-text-muted text-text-secondary mb-2">
                  Địa Chỉ Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-dark-300 rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-transparent"
                  placeholder="email.cua.ban@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm text-text-muted text-text-secondary mb-2">
                  Chủ Đề *
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-dark-300 rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-transparent"
                >
                  <option value="">Chọn chủ đề</option>
                  <option value="service">Hỏi Về Dịch Vụ</option>
                  <option value="appointment">Đặt Lịch Hẹn</option>
                  <option value="parts">Phụ Tùng & Phụ Kiện</option>
                  <option value="warranty">Yêu Cầu Bảo Hành</option>
                  <option value="feedback">Phản Hồi</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm text-text-muted text-text-secondary mb-2">
                  Tin Nhắn *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-dark-300 rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-transparent"
                  placeholder="Vui lòng mô tả chi tiết yêu cầu của bạn..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 disabled:bg-lime-400 text-black font-semibold px-6 py-3 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang gửi...
                  </div>
                ) : (
                  'Gửi Tin Nhắn'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Map Section */}
        <div className="mt-16 bg-dark-300 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Tìm Chúng Tôi</h2>
          <div className="mb-4">
            <div className="bg-dark-900 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">📍 Địa Chỉ Của Chúng Tôi</h3>
              <p className="text-text-secondary">
                <strong>Đại học FPT TP. Hồ Chí Minh</strong><br />
                Lô E2a-7, Đường D1, Long Thạnh Mỹ, Thành Phố Thủ Đức, Hồ Chí Minh<br />
                Việt Nam 700000
              </p>
            </div>
          </div>
          <div className="bg-dark-200 rounded-lg overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.4436614907906!2d106.80730131531652!3d10.841127592290317!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752731176b07b1%3A0xb752b24b379bae5e!2sFPT%20University%20HCMC!5e0!3m2!1sen!2s!4v1697123456789!5m2!1sen!2s"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Vị trí Đại học FPT TP. Hồ Chí Minh"
            ></iframe>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-text-secondary">
              Tọa lạc tại Đại học FPT TP. Hồ Chí Minh - Dễ dàng tiếp cận từ các tuyến đường chính và phương tiện giao thông công cộng
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
