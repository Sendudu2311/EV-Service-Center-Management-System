import React from 'react';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Điều Khoản Dịch Vụ</h1>
          <p className="text-lg text-text-secondary">
            Cập nhật lần cuối: 13 tháng 11, 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Chấp Nhận Điều Khoản</h2>
            <p className="text-text-secondary leading-relaxed">
              Bằng việc truy cập và sử dụng hệ thống quản lý Trung Tâm Dịch Vụ Xe Điện ("Dịch Vụ"), bạn chấp nhận
              và đồng ý bị ràng buộc bởi các điều khoản và điều kiện của thỏa thuận này. Nếu bạn không đồng ý tuân
              thủ các điều khoản trên, vui lòng không sử dụng dịch vụ này.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Mô Tả Dịch Vụ</h2>
            <p className="text-text-secondary leading-relaxed">
              Trung Tâm Dịch Vụ Xe Điện cung cấp hệ thống quản lý toàn diện cho việc bảo dưỡng xe điện, bao gồm
              đặt lịch hẹn, theo dõi dịch vụ, quản lý phụ tùng, lập hóa đơn và quản lý quan hệ khách hàng.
              Hệ thống có sẵn thông qua ứng dụng web và di động.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Tài Khoản Người Dùng</h2>
            <div className="space-y-4">
              <p className="text-text-secondary">Để sử dụng một số tính năng của Dịch Vụ, bạn phải đăng ký tài khoản và cung cấp thông tin chính xác:</p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li>Bạn có trách nhiệm duy trì tính bảo mật của thông tin đăng nhập tài khoản</li>
                <li>Bạn đồng ý thông báo ngay lập tức cho chúng tôi về bất kỳ truy cập trái phép nào vào tài khoản</li>
                <li>Bạn chịu trách nhiệm về tất cả các hoạt động diễn ra dưới tài khoản của mình</li>
                <li>Chúng tôi có quyền chấm dứt tài khoản vi phạm các điều khoản này</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Sử Dụng Dịch Vụ</h2>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Sử Dụng Được Phép</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
                <li>Đặt lịch và quản lý các cuộc hẹn dịch vụ</li>
                <li>Truy cập lịch sử dịch vụ và thông tin xe</li>
                <li>Xem và mua phụ tùng và phụ kiện</li>
                <li>Quản lý hóa đơn và hồ sơ thanh toán</li>
                <li>Giao tiếp với nhà cung cấp dịch vụ</li>
              </ul>

              <h3 className="text-lg font-semibold text-white">Sử Dụng Bị Cấm</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
                <li>Vi phạm bất kỳ luật hoặc quy định hiện hành nào</li>
                <li>Xâm phạm quyền sở hữu trí tuệ</li>
                <li>Truyền tải mã độc hại hoặc có hại</li>
                <li>Cố gắng truy cập trái phép vào hệ thống</li>
                <li>Sử dụng dịch vụ cho mục đích gian lận</li>
                <li>Can thiệp vào hoạt động của dịch vụ</li>
              </ul>
            </div>
          </section>

          <section className="bg-lime-50/10 border-2 border-lime-400 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-lime-200 mb-4">⚡ 5. Chính Sách Đặt Lịch & Hủy Lịch Hẹn</h2>
            <div className="space-y-4">
              <p className="text-text-secondary">
                Đặt lịch và quản lý lịch hẹn tuân theo các điều khoản sau:
              </p>

              <div className="bg-dark-900 rounded-lg p-5 space-y-3">
                <h3 className="text-lg font-semibold text-white">📅 Đặt Lịch Hẹn</h3>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li>Lịch hẹn được xác nhận khi được trung tâm dịch vụ chấp nhận</li>
                  <li>Khách hàng cần đến đúng giờ theo lịch đã đặt</li>
                  <li>Đến muộn có thể dẫn đến việc hủy lịch hẹn</li>
                  <li><strong className="text-lime-200">Thời gian hoàn thành dịch vụ có thể thay đổi tùy thuộc vào tình trạng thực tế của xe và mức độ phức tạp của công việc</strong></li>
                </ul>
              </div>

              <div className="bg-dark-900 rounded-lg p-5 space-y-3">
                <h3 className="text-lg font-semibold text-white">🔄 Chính Sách Hủy Lịch & Hoàn Cọc</h3>
                <div className="space-y-4">
                  <p className="text-text-secondary">
                    <strong className="text-white">Quan trọng:</strong> Chính sách hoàn cọc áp dụng như sau:
                  </p>

                  <div className="border-l-4 border-green-500 pl-4 bg-green-900/20 py-3 rounded-r">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <h4 className="font-semibold text-green-200 mb-1">Hủy Trước 24 Giờ</h4>
                        <p className="text-text-secondary text-sm">
                          Nếu bạn hủy lịch hẹn <strong className="text-green-200">trước 24 giờ</strong> kể từ thời gian hẹn,
                          bạn sẽ được <strong className="text-green-200">hoàn lại 100% tiền cọc</strong>.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-l-4 border-yellow-500 pl-4 bg-yellow-900/20 py-3 rounded-r">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <h4 className="font-semibold text-yellow-200 mb-1">Hủy Trong Vòng 24 Giờ</h4>
                        <p className="text-text-secondary text-sm">
                          Nếu bạn hủy lịch hẹn <strong className="text-yellow-200">trong vòng 24 giờ</strong> trước thời gian hẹn,
                          bạn sẽ được <strong className="text-yellow-200">hoàn lại 80% tiền cọc</strong>.
                          Phí 20% được giữ lại để bù đắp chi phí vận hành.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-l-4 border-red-500 pl-4 bg-red-900/20 py-3 rounded-r">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">❌</span>
                      <div>
                        <h4 className="font-semibold text-red-200 mb-1">Không Đến Hoặc Không Thông Báo</h4>
                        <p className="text-text-secondary text-sm">
                          Nếu bạn <strong className="text-red-200">không đến theo lịch hẹn mà không thông báo trước</strong>,
                          bạn sẽ <strong className="text-red-200">mất toàn bộ (100%) tiền cọc</strong>.
                          Điều này giúp đảm bảo công bằng cho các khách hàng khác đang chờ đợi.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-dark-900/50 rounded-lg p-4">
                    <p className="text-sm text-text-secondary">
                      <strong className="text-white">Lưu ý:</strong> Để hủy lịch hẹn, vui lòng truy cập trang "Lịch Hẹn"
                      trong tài khoản của bạn hoặc liên hệ với chúng tôi qua hotline. Thời gian hoàn cọc: 3-7 ngày làm việc.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-dark-900 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-white mb-3">📝 Thông Tin Thêm</h3>
                <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                  <li>Dự trù thời gian dịch vụ chỉ mang tính chất tham khảo</li>
                  <li>Thời gian thực tế có thể khác nhau tùy thuộc vào tình trạng xe và phụ tùng</li>
                  <li>Chúng tôi sẽ thông báo kịp thời nếu có thay đổi về thời gian hoặc chi phí</li>
                  <li>Khách hàng sẽ được tư vấn trước khi thực hiện bất kỳ công việc bổ sung nào</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Điều Khoản Thanh Toán</h2>
            <div className="space-y-4">
              <p className="text-text-secondary">Thanh toán cho dịch vụ tuân theo các điều khoản sau:</p>
              <ul className="list-disc list-inside text-text-secondary space-y-2 ml-4">
                <li>Tất cả các khoản phí phải được thanh toán đầy đủ trước khi nhận xe</li>
                <li>Phương thức thanh toán được chấp nhận bao gồm thẻ tín dụng, thẻ ghi nợ và ví điện tử được phê duyệt</li>
                <li>Phí bổ sung có thể áp dụng cho dịch vụ gấp hoặc làm ngoài giờ</li>
                <li>Tranh chấp về phí phải được báo cáo trong vòng 30 ngày kể từ khi hoàn thành dịch vụ</li>
                <li>Phí trả chậm có thể áp dụng cho các tài khoản quá hạn</li>
                <li>Tất cả giá được tính bằng VND và đã bao gồm VAT 10%</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Bảo Hành & Trách Nhiệm Pháp Lý</h2>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Bảo Hành Dịch Vụ</h3>
              <ul className="list-disc list-inside text-text-secondary space-y-1 ml-4">
                <li>Bảo hành phụ tùng: 6 tháng hoặc 6.000 km, tùy theo điều kiện nào đến trước</li>
                <li>Bảo hành công: 12 tháng hoặc 12.000 km, tùy theo điều kiện nào đến trước</li>
                <li>Dịch vụ chẩn đoán: Bảo hành 3 tháng hoặc 3.000 km</li>
                <li>Dịch vụ pin: Bảo hành 12 tháng hoặc 12.000 km</li>
              </ul>

              <h3 className="text-lg font-semibold text-white">Giới Hạn Trách Nhiệm</h3>
              <p className="text-text-secondary leading-relaxed">
                Trách nhiệm pháp lý của Trung Tâm Dịch Vụ Xe Điện được giới hạn ở số tiền đã thanh toán cho dịch vụ.
                Chúng tôi không chịu trách nhiệm về thiệt hại do hậu quả, mất lợi nhuận hoặc thiệt hại ngẫu nhiên.
                Một số khu vực pháp lý không cho phép giới hạn trách nhiệm, vì vậy các giới hạn này có thể không áp dụng cho bạn.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Sở Hữu Trí Tuệ</h2>
            <p className="text-text-secondary leading-relaxed">
              Dịch vụ và nội dung gốc, tính năng và chức năng của nó thuộc sở hữu của Trung Tâm Dịch Vụ Xe Điện và
              được bảo vệ bởi luật bản quyền, nhãn hiệu và các luật sở hữu trí tuệ khác. Bạn không được sao chép,
              nhân bản hoặc tái sử dụng bất kỳ phần nào của dịch vụ mà không có sự cho phép bằng văn bản.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Quyền Riêng Tư</h2>
            <p className="text-text-secondary leading-relaxed">
              Quyền riêng tư của bạn rất quan trọng đối với chúng tôi. Vui lòng xem Chính Sách Bảo Mật của chúng tôi,
              nó cũng điều chỉnh việc bạn sử dụng Dịch vụ, để hiểu các thông lệ của chúng tôi về việc thu thập và
              sử dụng thông tin cá nhân của bạn.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Chấm Dứt</h2>
            <p className="text-text-secondary leading-relaxed">
              Chúng tôi có thể chấm dứt hoặc đình chỉ tài khoản và quyền truy cập Dịch vụ của bạn ngay lập tức,
              không cần thông báo trước, đối với hành vi mà chúng tôi cho là vi phạm các Điều khoản này hoặc có hại
              cho người dùng khác, chúng tôi hoặc bên thứ ba, hoặc vì bất kỳ lý do nào khác theo quyết định của chúng tôi.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Luật Điều Chỉnh</h2>
            <p className="text-text-secondary leading-relaxed">
              Các Điều khoản này sẽ được giải thích và điều chỉnh bởi luật pháp Việt Nam, không xét đến các quy định
              về xung đột pháp luật. Bất kỳ tranh chấp nào phát sinh từ các điều khoản này sẽ được giải quyết tại
              tòa án Thành phố Hồ Chí Minh.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Thay Đổi Điều Khoản</h2>
            <p className="text-text-secondary leading-relaxed">
              Chúng tôi có quyền sửa đổi các điều khoản này bất kỳ lúc nào. Chúng tôi sẽ thông báo cho người dùng
              về các thay đổi quan trọng qua email hoặc thông qua Dịch vụ. Việc bạn tiếp tục sử dụng Dịch vụ sau
              những sửa đổi như vậy đồng nghĩa với việc chấp nhận các điều khoản được cập nhật.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Thông Tin Liên Hệ</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Nếu bạn có bất kỳ câu hỏi nào về Điều Khoản Dịch Vụ này, vui lòng liên hệ với chúng tôi:
            </p>
            <div className="bg-dark-900 rounded-lg p-4">
              <p className="text-text-secondary"><strong>Email:</strong> legal@evservicecenter.com</p>
              <p className="text-text-secondary"><strong>Điện thoại:</strong> +84 123 456 789</p>
              <p className="text-text-secondary"><strong>Địa chỉ:</strong> Lô E2a-7, Đường D1, Long Thạnh Mỹ, Thành Phố Thủ Đức, Hồ Chí Minh</p>
              <p className="text-text-secondary"><strong>Trường:</strong> Đại học FPT TP. Hồ Chí Minh</p>
            </div>
          </section>

          <section className="border-t pt-8">
            <p className="text-sm text-text-secondary text-center">
              Bằng việc sử dụng Trung Tâm Dịch Vụ Xe Điện, bạn xác nhận rằng bạn đã đọc, hiểu và đồng ý bị ràng buộc bởi các Điều Khoản Dịch Vụ này.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;