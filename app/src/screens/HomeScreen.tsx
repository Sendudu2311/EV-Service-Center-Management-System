import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Chatbot from '../components/Chat/Chatbot';

const HomeScreen: React.FC = () => {
  const [showChatbot, setShowChatbot] = useState(false);

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>EV Service Center</Text>
          <Text style={styles.headerSubtitle}>Trung tâm dịch vụ xe điện</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.welcomeText}>Chào mừng đến với EV Service Center</Text>
          <Text style={styles.descriptionText}>
            Hệ thống quản lý dịch vụ bảo dưỡng và sửa chữa xe điện chuyên nghiệp
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🚗 Dịch vụ của chúng tôi</Text>
            <Text style={styles.cardText}>
              • Bảo dưỡng định kỳ{'\n'}
              • Sửa chữa hệ thống điện{'\n'}
              • Kiểm tra pin và động cơ{'\n'}
              • Nâng cấp phần mềm{'\n'}
              • Thay thế phụ tùng
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💬 Cần hỗ trợ?</Text>
            <Text style={styles.cardText}>
              Hỏi trợ lý AI của chúng tôi bất kỳ câu hỏi nào về dịch vụ, lịch hẹn hoặc bảo dưỡng xe.
            </Text>
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => setShowChatbot(true)}
            >
              <Text style={styles.chatButtonText}>Bắt đầu trò chuyện</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📱 Tính năng chính</Text>
            <Text style={styles.cardText}>
              • Quản lý thông tin xe{'\n'}
              • Đặt lịch bảo dưỡng online{'\n'}
              • Theo dõi lịch sử dịch vụ{'\n'}
              • Thanh toán trực tuyến{'\n'}
              • Hỗ trợ AI 24/7
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowChatbot(true)}
      >
        <Text style={styles.floatingButtonText}>💬</Text>
      </TouchableOpacity>

      <Chatbot visible={showChatbot} onClose={() => setShowChatbot(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  content: {
    padding: 24,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
  },
  chatButton: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 28,
  },
});

export default HomeScreen;
