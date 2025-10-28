import React, { useState } from 'react';
import { X } from 'lucide-react';
import EVChatbot from '../Chatbot/EVChatbot';
import '../../styles/MeowlChatbot.css';

const ChatbotButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Meowl Peeking Out - Fixed Position at Bottom Right Corner */}
      <div className={`meowl-mascot-peek ${isOpen ? 'peek-in' : ''}`}>
        <div className="meowl-image-container" onClick={() => setIsOpen(!isOpen)}>
          {/* Meowl Image - Peeking Out */}
          <img 
            src="/meowl.png" 
            alt="EV Assistant Meowl"
            className="meowl-image"
          />

          {/* Close Icon Overlay */}
          {isOpen && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none">
              <X className="w-6 h-6 text-copper-400" />
            </div>
          )}
        </div>
      </div>

      {/* Chatbot Modal */}
      <EVChatbot isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default ChatbotButton;
