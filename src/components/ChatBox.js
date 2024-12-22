import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import './ChatBox.css';

function ChatBox({ onClose, landlordName }) {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: landlordName, message: `Hello! How can I help you today?` }
  ]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      setChatHistory([...chatHistory, { sender: 'You', message: message.trim() }]);
      setMessage('');
      // landlord response
      setTimeout(() => {
        setChatHistory(prev => [...prev, { 
          sender: landlordName, 
          message: "Thank you for your message. I'll get back to you soon!" 
        }]);
      }, 1000);
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-header">
        <h3>Chat with {landlordName}</h3>
        <button onClick={onClose} className="close-btn">
          <X size={20} />
        </button>
      </div>
      <div className="chat-messages">
        {chatHistory.map((chat, index) => (
          <div 
            key={index} 
            className={`message ${chat.sender === 'You' ? 'sent' : 'received'}`}
          >
            <strong>{chat.sender}:</strong> {chat.message}
          </div>
        ))}
      </div>
      <form onSubmit={handleSendMessage} className="chat-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button type="submit">
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}

export default ChatBox;

