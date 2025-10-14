import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import ChatbotButton from '../Chatbot/ChatbotButton';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-industrial-900 flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <ChatbotButton />
    </div>
  );
};

export default Layout;