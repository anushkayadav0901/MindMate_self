import { useState } from 'react';
import Avatar3D from '../components/Avatar3D';
import { speechService } from '../utils/speech';
import { Send, Sparkles } from 'lucide-react';

interface Message {
  text: string;
  sender: 'user' | 'avatar';
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hi! I'm here to support you emotionally. How can I help you today?",
      sender: 'avatar',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const supportiveResponses = [
    "I hear you. It's completely okay to feel this way.",
    "Thank you for sharing that with me. Your feelings are valid.",
    "That sounds challenging. Remember, you're not alone in this.",
    "I'm here for you. Take your time, there's no rush.",
    "You're doing great by expressing your feelings. That takes courage.",
    "It's okay to not be okay sometimes. Be kind to yourself.",
    "I appreciate you opening up. How can I support you better?",
    "Remember to take care of yourself. You deserve peace and happiness.",
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    setTimeout(async () => {
      const responseText =
        supportiveResponses[Math.floor(Math.random() * supportiveResponses.length)];

      const avatarMessage: Message = {
        text: responseText,
        sender: 'avatar',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, avatarMessage]);
      await speechService.speak(responseText, { rate: 0.85 }, setIsSpeaking);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] px-4 py-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-center">
        <Avatar3D isSpeaking={isSpeaking} mood="calm" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-6 px-4">
        {messages.map((message, index) => (
          <div
            key={`message-${message.timestamp.getTime()}-${index}`}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-4 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-gradient-to-r from-teal-400 to-green-400 text-white'
                  : 'bg-white/10 backdrop-blur-lg border border-white/20 text-white'
              }`}
            >
              {message.sender === 'avatar' && (
                <Sparkles className="w-4 h-4 text-yellow-300 mb-2" />
              )}
              <p className="leading-relaxed">{message.text}</p>
              <p
                className={`text-xs mt-2 ${
                  message.sender === 'user' ? 'text-white/70' : 'text-white/50'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Share your thoughts..."
          className="flex-1 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
        />
        <button
          type="submit"
          className="px-6 py-4 rounded-2xl bg-gradient-to-r from-teal-400 to-green-400 text-white font-medium hover:shadow-lg hover:scale-105 transition-all"
        >
          <Send className="w-6 h-6" />
        </button>
      </form>

      <p className="text-center text-white/50 text-sm mt-4">
        This is a supportive space. Remember, for professional help, please reach out to a qualified therapist.
      </p>
    </div>
  );
}