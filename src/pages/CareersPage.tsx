import React, { useState } from 'react';

const CareersPage: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const jobs = [
    {
      id: 1,
      title: 'Kỹ Thuật Viên Xe Điện Cao Cấp',
      department: 'technical',
      location: 'TP. Hồ Chí Minh',
      type: 'Toàn thời gian',
      salary: 'Cạnh tranh',
      description: 'Tham gia đội ngũ kỹ thuật viên chuyên nghiệp về hệ thống pin, động cơ điện và cơ sở hạ tầng sạc xe điện.',
      requirements: ['5+ năm kinh nghiệm xe điện', 'Chứng chỉ ASE', 'Bằng kỹ sư điện']
    },
    {
      id: 2,
      title: 'Nhân Viên Tư Vấn Dịch Vụ',
      department: 'customer-service',
      location: 'TP. Hồ Chí Minh',
      type: 'Toàn thời gian',
      salary: 'Cạnh tranh + Hoa hồng',
      description: 'Cung cấp dịch vụ khách hàng xuất sắc và hướng dẫn kỹ thuật cho chủ xe điện cần bảo trì và sửa chữa.',
      requirements: ['2+ năm kinh nghiệm ô tô', 'Kỹ năng dịch vụ khách hàng', 'Kiến thức cơ bản về xe điện']
    },
    {
      id: 3,
      title: 'Quản Lý Phụ Tùng',
      department: 'operations',
      location: 'TP. Hồ Chí Minh',
      type: 'Toàn thời gian',
      salary: 'Cạnh tranh',
      description: 'Quản lý tồn kho phụ tùng và phụ kiện xe điện, đảm bảo mức tồn kho tối ưu và mối quan hệ nhà cung cấp.',
      requirements: ['3+ năm quản lý phụ tùng', 'Kinh nghiệm phần mềm tồn kho', 'Kiến thức chuỗi cung ứng']
    },
    {
      id: 4,
      title: 'Lập Trình Viên',
      department: 'technology',
      location: 'TP. Hồ Chí Minh',
      type: 'Toàn thời gian',
      salary: 'Cạnh tranh',
      description: 'Phát triển và duy trì nền tảng quản lý dịch vụ xe điện, tập trung vào trải nghiệm người dùng và độ tin cậy hệ thống.',
      requirements: ['Kinh nghiệm React/TypeScript', 'Backend Node.js', 'Kiến thức MongoDB']
    },
    {
      id: 5,
      title: 'Chuyên Viên Marketing',
      department: 'marketing',
      location: 'TP. Hồ Chí Minh',
      type: 'Toàn thời gian',
      salary: 'Cạnh tranh',
      description: 'Quảng bá dịch vụ xe điện của chúng tôi và xây dựng nhận thức thương hiệu trong thị trường xe điện đang phát triển.',
      requirements: ['Kinh nghiệm marketing kỹ thuật số', 'Chuyên môn mạng xã hội', 'Kỹ năng sáng tạo nội dung']
    },
    {
      id: 6,
      title: 'Thanh Tra Kiểm Soát Chất Lượng',
      department: 'technical',
      location: 'TP. Hồ Chí Minh',
      type: 'Toàn thời gian',
      salary: 'Cạnh tranh',
      description: 'Đảm bảo tất cả dịch vụ xe điện đáp ứng tiêu chuẩn chất lượng cao và yêu cầu quy định của chúng tôi.',
      requirements: ['Kinh nghiệm kiểm soát chất lượng', 'Nền tảng kỹ thuật', 'Chú ý đến chi tiết']
    }
  ];

  const departments = [
    { id: 'all', name: 'Tất Cả Phòng Ban', count: jobs.length },
    { id: 'technical', name: 'Kỹ Thuật', count: jobs.filter(j => j.department === 'technical').length },
    { id: 'customer-service', name: 'Dịch Vụ Khách Hàng', count: jobs.filter(j => j.department === 'customer-service').length },
    { id: 'operations', name: 'Vận Hành', count: jobs.filter(j => j.department === 'operations').length },
    { id: 'technology', name: 'Công Nghệ', count: jobs.filter(j => j.department === 'technology').length },
    { id: 'marketing', name: 'Marketing', count: jobs.filter(j => j.department === 'marketing').length }
  ];

  const filteredJobs = selectedDepartment === 'all'
    ? jobs
    : jobs.filter(job => job.department === selectedDepartment);

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">Tham Gia Đội Ngũ Của Chúng Tôi</h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Trở thành một phần của tương lai dịch vụ xe điện. Chúng tôi đang tìm kiếm các chuyên gia
            đam mê để giúp định hình ngành công nghiệp xe điện và mang lại trải nghiệm dịch vụ xuất sắc.
          </p>
        </div>

        {/* Why Join Us */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Tại Sao Chọn Trung Tâm Dịch Vụ Xe Điện?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Đổi Mới</h3>
              <p className="text-text-secondary">Làm việc với công nghệ xe điện tiên tiến và thiết bị dịch vụ hiện đại</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-lime-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-dark-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Phát Triển</h3>
              <p className="text-text-secondary">Cơ hội học tập liên tục và con đường thăng tiến nghề nghiệp</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Tác Động</h3>
              <p className="text-text-secondary">Đóng góp cho giao thông bền vững và bảo vệ môi trường</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Đội Ngũ</h3>
              <p className="text-text-secondary">Hợp tác với các chuyên gia đam mê trong môi trường hỗ trợ</p>
            </div>
          </div>
        </div>

        {/* Department Filter */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Lọc Theo Phòng Ban</h2>
          <div className="flex flex-wrap gap-3">
            {departments.map(dept => (
              <button
                key={dept.id}
                onClick={() => setSelectedDepartment(dept.id)}
                className={`px-4 py-2 rounded-lg text-text-muted transition-colors duration-200 ${
                  selectedDepartment === dept.id
                    ? 'bg-lime-600 text-dark-900'
                    : 'bg-dark-100 text-text-secondary hover:bg-dark-200'
                }`}
              >
                {dept.name} ({dept.count})
              </button>
            ))}
          </div>
        </div>

        {/* Job Listings */}
        <div className="space-y-6 mb-12">
          {filteredJobs.length === 0 ? (
            <div className="bg-dark-300 rounded-lg shadow-lg p-8 text-center">
              <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V8a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8m0 0V4" />
              </svg>
              <h3 className="text-lg text-text-muted text-white mb-2">Không có vị trí nào</h3>
              <p className="text-text-secondary">Kiểm tra lại sau để xem cơ hội mới trong phòng ban này.</p>
            </div>
          ) : (
            filteredJobs.map(job => (
              <div key={job.id} className="bg-dark-300 rounded-lg shadow-lg p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{job.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {job.location}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {job.type}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        {job.salary}
                      </span>
                    </div>
                  </div>
                  <button className="mt-4 lg:mt-0 bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 text-black font-semibold px-6 py-2 rounded-lg transition-colors duration-200">
                    Ứng Tuyển Ngay
                  </button>
                </div>

                <p className="text-text-secondary mb-4">{job.description}</p>

                <div>
                  <h4 className="font-semibold text-white mb-2">Yêu Cầu:</h4>
                  <ul className="list-disc list-inside text-text-secondary space-y-1">
                    {job.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Application Process */}
        <div className="bg-dark-900 rounded-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-6 text-center">Cách Ứng Tuyển</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-dark-300 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Gửi Hồ Sơ</h3>
              <p className="text-lime-100">Gửi CV và thư xin việc của bạn đến careers@evservicecenter.com</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-dark-300 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Quy Trình Phỏng Vấn</h3>
              <p className="text-lime-100">Phỏng vấn kỹ thuật và hành vi với đội ngũ tuyển dụng của chúng tôi</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-dark-300 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Tham Gia Đội Ngũ</h3>
              <p className="text-lime-100">Bắt đầu sự nghiệp của bạn trong thế giới công nghệ xe điện thú vị</p>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-lg text-lime-100 mb-4">
              Sẵn sàng tham gia đội ngũ của chúng tôi? Chúng tôi mong được gặp bạn!
            </p>
            <div className="bg-dark-300 rounded-lg p-6 max-w-2xl mx-auto">
              <p className="text-white mb-2">📧 <strong>Email:</strong> careers@evservicecenter.com</p>
              <p className="text-white mb-2">📍 <strong>Địa chỉ:</strong> Lô E2a-7, Đường D1, Long Thạnh Mỹ, Thành Phố Thủ Đức, Hồ Chí Minh</p>
              <p className="text-white">🏫 <strong>Trường:</strong> Đại học FPT TP. Hồ Chí Minh</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareersPage;