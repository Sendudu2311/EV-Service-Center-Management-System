import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import EVChatbot from '../Chatbot/EVChatbot';

const ChatbotButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-copper-500 via-copper-600 to-copper-700 rounded-full shadow-metal-xl hover:shadow-metal-lg border-3 border-copper-400 flex items-center justify-center transition-all duration-300 hover:scale-110 group"
        aria-label="Open EV Assistant"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white group-hover:animate-bounce" />
        )}
        
        {/* Pulse effect */}
        {!isOpen && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-copper-400 opacity-75 animate-ping"></span>
        )}
        
        {/* Tooltip */}
        {!isOpen && (
          <div className="absolute right-full mr-3 px-3 py-2 panel-metal border border-steel-600 rounded-lg shadow-metal opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            <p className="text-sm text-industrial-100 font-semibold">Ask EV Assistant ⚡</p>
            <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-2 h-2 bg-industrial-800 border-r border-b border-steel-600 rotate-45"></div>
          </div>
        )}
      </button>

      {/* Chatbot Modal */}
      <EVChatbot isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default ChatbotButton;
