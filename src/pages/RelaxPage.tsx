import { useState } from 'react';
import BreathingExercise from '../components/BreathingExercise';
import Avatar3D from '../components/Avatar3D';
import { fetchMotivationalQuote, type Quote } from '../utils/quotes';
import { speechService } from '../utils/speech';
import { Sparkles, Wind } from 'lucide-react';

// Fix 1: Remove empty interface entirely since no props are needed
export default function RelaxPage() {
  const [mode, setMode] = useState<'choose' | 'breathing' | 'quote'>('choose');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBreathingComplete = () => {
    setMode('quote');
    loadAndSpeakQuote();
  };

  const loadAndSpeakQuote = async () => {
    setLoading(true);
    const newQuote = await fetchMotivationalQuote();
    setQuote(newQuote);
    setLoading(false);

    const message = `${newQuote.text} - ${newQuote.author}`;
    await speechService.speak(message, { rate: 0.85 }, setIsSpeaking);
  };

  const startBreathing = () => {
    setMode('breathing');
  };

  const startQuotes = () => {
    setMode('quote');
    loadAndSpeakQuote();
  };

  // Fix 2: Extract quote content rendering to avoid nested ternary
  const renderQuoteContent = () => {
    if (loading) {
      return (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white mx-auto mb-4" />
          <p className="text-white/70">Finding inspiration...</p>
        </div>
      );
    }

    if (quote) {
      return (
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20">
            <Sparkles className="w-8 h-8 text-yellow-300 mx-auto mb-6" />
            <blockquote className="text-2xl font-light text-white text-center leading-relaxed mb-4">
              "{quote.text}"
            </blockquote>
            <p className="text-white/70 text-center text-lg">- {quote.author}</p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={loadAndSpeakQuote}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-400 to-green-400 text-white font-medium hover:shadow-lg hover:scale-105 transition-all"
            >
              Another Quote
            </button>
            <button
              onClick={() => setMode('breathing')}
              className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 transition-all"
            >
              Breathing Exercise
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderChooseMode = () => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4">
      <Avatar3D mood="calm" message="Let's find your peace. Choose a relaxation method:" />

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <button
          onClick={startBreathing}
          className="group p-8 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 transition-all hover:scale-105 hover:shadow-2xl"
        >
          <Wind className="w-16 h-16 text-teal-300 mx-auto mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-light text-white mb-2">Breathing Exercise</h3>
          <p className="text-white/70">Follow the rhythm for 30 seconds</p>
        </button>

        <button
          onClick={startQuotes}
          className="group p-8 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 transition-all hover:scale-105 hover:shadow-2xl"
        >
          <Sparkles className="w-16 h-16 text-yellow-300 mx-auto mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-light text-white mb-2">Motivational Quotes</h3>
          <p className="text-white/70">Listen to inspiring wisdom</p>
        </button>
      </div>
    </div>
  );

  const renderBreathingMode = () => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4">
      <BreathingExercise duration={30} onComplete={handleBreathingComplete} />
    </div>
  );

  const renderQuoteMode = () => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4">
      <Avatar3D isSpeaking={isSpeaking} mood="calm" />

      <div className="mt-12 w-full max-w-2xl">
        {renderQuoteContent()}
      </div>
    </div>
  );

  // Fix 3: Use switch statement instead of nested ternary/if-else
  switch (mode) {
    case 'choose':
      return renderChooseMode();
    case 'breathing':
      return renderBreathingMode();
    case 'quote':
      return renderQuoteMode();
    default:
      return renderChooseMode();
  }
}