import React from 'react';

const SecurityPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Bảo Mật & Tin Cậy</h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Bảo mật của bạn là ưu tiên hàng đầu của chúng tôi. Tìm hiểu về các biện pháp chúng tôi thực hiện để bảo vệ
            dữ liệu của bạn và đảm bảo trải nghiệm an toàn với nền tảng dịch vụ xe điện của chúng tôi.
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
            <h2 className="text-2xl font-bold mb-4">Dữ Liệu Của Bạn Được Bảo Vệ</h2>
            <p className="text-lg text-lime-100 max-w-2xl mx-auto">
              Chúng tôi áp dụng các thông lệ bảo mật hàng đầu trong ngành và tuân thủ các tiêu chuẩn quốc tế
              để bảo vệ thông tin cá nhân và dữ liệu xe của bạn.
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
            <h3 className="text-xl font-bold text-white mb-3">Mã Hóa Dữ Liệu</h3>
            <p className="text-text-secondary">
              Tất cả dữ liệu nhạy cảm được mã hóa trong quá trình truyền tải và lưu trữ bằng mã hóa
              AES-256 tiêu chuẩn ngành. Thông tin cá nhân và chi tiết thanh toán của bạn không bao giờ
              được lưu trữ dưới dạng văn bản thuần.
            </p>
          </div>

          <div className="bg-dark-300 rounded-lg shadow-lg p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Cơ Sở Hạ Tầng An Toàn</h3>
            <p className="text-text-secondary">
              Hệ thống của chúng tôi được lưu trữ trên cơ sở hạ tầng đám mây an toàn với giám sát 24/7,
              kiểm tra bảo mật thường xuyên và tuân thủ các tiêu chuẩn bảo mật quốc tế.
            </p>
          </div>

          <div className="bg-dark-300 rounded-lg shadow-lg p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Kiểm Soát Truy Cập</h3>
            <p className="text-text-secondary">
              Xác thực đa yếu tố, kiểm soát truy cập dựa trên vai trò và đánh giá quyền truy cập thường xuyên
              đảm bảo chỉ nhân viên được ủy quyền mới có thể truy cập thông tin nhạy cảm.
            </p>
          </div>

          <div className="bg-dark-300 rounded-lg shadow-lg p-6">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Tuân Thủ & Kiểm Tra</h3>
            <p className="text-text-secondary">
              Kiểm tra bảo mật thường xuyên, kiểm tra thâm nhập và tuân thủ GDPR, PDPA,
              và các quy định bảo vệ dữ liệu quốc tế khác đảm bảo bảo mật liên tục.
            </p>
          </div>
        </div>

        {/* Security Measures */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Các Biện Pháp Bảo Mật Của Chúng Tôi</h2>

          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-6">
              <h3 className="text-lg font-semibold text-white mb-2">Bảo Mật Mạng</h3>
              <ul className="text-text-secondary space-y-1">
                <li>• Bảo vệ Tường Lửa Ứng Dụng Web (WAF)</li>
                <li>• Giảm thiểu tấn công DDoS</li>
                <li>• Mã hóa SSL/TLS cho tất cả kết nối</li>
                <li>• Quét lỗ hổng bảo mật thường xuyên</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 pl-6">
              <h3 className="text-lg font-semibold text-white mb-2">Bảo Vệ Dữ Liệu</h3>
              <ul className="text-text-secondary space-y-1">
                <li>• Mã hóa đầu cuối cho dữ liệu nhạy cảm</li>
                <li>• Sao lưu an toàn và phục hồi thảm họa</li>
                <li>• Ẩn danh và giả danh hóa dữ liệu</li>
                <li>• Đánh giá lưu giữ dữ liệu thường xuyên</li>
              </ul>
            </div>

            <div className="border-l-4 border-purple-500 pl-6">
              <h3 className="text-lg font-semibold text-white mb-2">Xác Thực Người Dùng</h3>
              <ul className="text-text-secondary space-y-1">
                <li>• Xác thực đa yếu tố (MFA)</li>
                <li>• Chính sách mật khẩu an toàn</li>
                <li>• Quản lý phiên và hết hạn tự động</li>
                <li>• Khóa tài khoản sau các lần đăng nhập thất bại</li>
              </ul>
            </div>

            <div className="border-l-4 border-orange-500 pl-6">
              <h3 className="text-lg font-semibold text-white mb-2">Giám Sát & Phản Hồi</h3>
              <ul className="text-text-secondary space-y-1">
                <li>• Giám sát bảo mật 24/7</li>
                <li>• Phát hiện mối đe dọa tự động</li>
                <li>• Quy trình phản hồi sự cố</li>
                <li>• Đào tạo bảo mật thường xuyên cho nhân viên</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-dark-100 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Chứng Nhận & Tiêu Chuẩn</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-lime-600 font-bold text-lg">ISO</span>
              </div>
              <h3 className="font-semibold text-white">ISO 27001</h3>
              <p className="text-sm text-text-secondary">Bảo Mật Thông Tin</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold text-lg">PCI</span>
              </div>
              <h3 className="font-semibold text-white">PCI DSS</h3>
              <p className="text-sm text-text-secondary">Bảo Mật Thanh Toán</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold text-lg">GDPR</span>
              </div>
              <h3 className="font-semibold text-white">GDPR</h3>
              <p className="text-sm text-text-secondary">Bảo Vệ Dữ Liệu</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-orange-600 font-bold text-lg">SOC</span>
              </div>
              <h3 className="font-semibold text-white">SOC 2</h3>
              <p className="text-sm text-text-secondary">Dịch Vụ Tin Cậy</p>
            </div>
          </div>
        </div>

        {/* Contact Security */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Báo Cáo Vấn Đề Bảo Mật</h2>
            <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
              Nếu bạn phát hiện lỗ hổng bảo mật hoặc có lo ngại về bảo mật dữ liệu của mình,
              vui lòng liên hệ ngay với đội ngũ bảo mật của chúng tôi. Chúng tôi xem xét nghiêm túc tất cả báo cáo
              và sẽ phản hồi nhanh chóng.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-dark-900 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Đội Ngũ Bảo Mật</h3>
                <p className="text-text-secondary text-sm mb-2">security@evservicecenter.com</p>
                <p className="text-text-secondary text-xs">Phản hồi trong vòng 24 giờ</p>
              </div>

              <div className="bg-dark-900 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Hotline Khẩn Cấp</h3>
                <p className="text-text-secondary text-sm mb-2">+84 987 654 321</p>
                <p className="text-text-secondary text-xs">Hỗ trợ 24/7</p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm text-text-secondary">
                Chúng tôi đánh giá cao sự giúp đỡ của bạn trong việc giữ nền tảng của chúng tôi an toàn cho tất cả người dùng.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPage;