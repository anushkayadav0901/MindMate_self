import { useState, useEffect } from 'react';
import Avatar3D from '../components/Avatar3D';
import { speechService } from '../utils/speech';
import { voiceRecognition } from '../utils/voiceRecognition';
import { Mic, MicOff, MessageSquare } from 'lucide-react';

// Fix: Mark props as read-only
interface HomePageProps {
  readonly onNavigate: (page: 'home' | 'learn' | 'relax' | 'chat') => void;
  readonly onMoodDetected?: (mood: string) => void;
}

export default function HomePage({ onNavigate, onMoodDetected }: HomePageProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [greeting, setGreeting] = useState('');
  const [avatarMood, setAvatarMood] = useState<'happy' | 'calm' | 'neutral' | 'thinking'>('happy');

  useEffect(() => {
    const greetingMessage = "Hey there! How are you feeling today? Would you like to relax or start learning?";
    setGreeting(greetingMessage);

    const timer = setTimeout(() => {
      speechService.speak(greetingMessage, { rate: 0.9 }, setIsSpeaking);
    }, 1000);

    return () => {
      clearTimeout(timer);
      speechService.stop();
    };
  }, []);

  const handleVoiceInput = () => {
    if (isListening) {
      voiceRecognition.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      voiceRecognition.startListening(
        (transcript) => {
          setUserInput(transcript);
          setIsListening(false);
          handleUserResponse(transcript);
        },
        (error) => {
          console.error('Voice recognition error:', error);
          setIsListening(false);
        }
      );
    }
  };

  const handleTextInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      handleUserResponse(userInput);
    }
  };

  const handleUserResponse = async (response: string) => {
    const lowerResponse = response.toLowerCase();

    setAvatarMood('thinking');

    if (
      lowerResponse.includes('stress') ||
      lowerResponse.includes('anxious') ||
      lowerResponse.includes('worried') ||
      lowerResponse.includes('overwhelm') ||
      lowerResponse.includes('relax')
    ) {
      onMoodDetected?.('stressed');
      const message = "I sense you need some relaxation. Let me help you calm down.";
      await speechService.speak(message, { rate: 0.85 }, setIsSpeaking);
      setTimeout(() => onNavigate('relax'), 1000);
    } else if (
      lowerResponse.includes('learn') ||
      lowerResponse.includes('study') ||
      lowerResponse.includes('read') ||
      lowerResponse.includes('pdf')
    ) {
      onMoodDetected?.('calm');
      const message = "Great! Let's start a learning session. You can upload a PDF and I'll help you study.";
      await speechService.speak(message, { rate: 0.9 }, setIsSpeaking);
      setTimeout(() => onNavigate('learn'), 1000);
    } else if (
      lowerResponse.includes('good') ||
      lowerResponse.includes('great') ||
      lowerResponse.includes('happy') ||
      lowerResponse.includes('fine')
    ) {
      onMoodDetected?.('happy');
      setAvatarMood('happy');
      const message = "That's wonderful! Would you like to learn something new or just relax?";
      await speechService.speak(message, { rate: 0.9 }, setIsSpeaking);
    } else if (
      lowerResponse.includes('chat') ||
      lowerResponse.includes('talk')
    ) {
      const message = "I'm here to listen. Let's have a chat.";
      await speechService.speak(message, { rate: 0.9 }, setIsSpeaking);
      setTimeout(() => onNavigate('chat'), 1000);
    } else {
      const message = "I'm here for you. You can say 'relax' for breathing exercises or 'learn' to study with a PDF.";
      await speechService.speak(message, { rate: 0.9 }, setIsSpeaking);
    }

    setUserInput('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4">
      <Avatar3D isSpeaking={isSpeaking} mood={avatarMood} message={greeting} />

      <div className="mt-12 w-full max-w-lg space-y-4">
        <form onSubmit={handleTextInput} className="flex gap-3">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type how you're feeling..."
            className="flex-1 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            className={`px-6 py-4 rounded-2xl backdrop-blur-lg border transition-all ${
              isListening
                ? 'bg-red-500/30 border-red-400/50 animate-pulse'
                : 'bg-white/10 border-white/20 hover:bg-white/20'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? (
              <MicOff className="w-6 h-6 text-red-300" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
          <button
            type="submit"
            className="px-6 py-4 rounded-2xl bg-gradient-to-r from-teal-400 to-green-400 text-white font-medium hover:shadow-lg hover:scale-105 transition-all"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        </form>

        <div className="flex gap-4 justify-center mt-8">
          <button
            onClick={() => onNavigate('relax')}
            className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 transition-all hover:scale-105"
          >
            Relax
          </button>
          <button
            onClick={() => onNavigate('learn')}
            className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 transition-all hover:scale-105"
          >
            Learn
          </button>
        </div>
      </div>

      {voiceRecognition.isSupported() === false && (
        <p className="mt-6 text-white/50 text-sm">Voice input not supported in this browser</p>
      )}
    </div>
  );
}