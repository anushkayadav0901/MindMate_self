// Define proper types for Speech Recognition API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }
  
  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
  }
  
  // Fix: Use type alias instead of interface for function types
  type SpeechRecognitionEventCallback = (event: SpeechRecognitionEvent) => void;
  type SpeechRecognitionErrorCallback = (event: SpeechRecognitionErrorEvent) => void;
  type SpeechRecognitionEndCallback = () => void;
  
  // Fix: Use type alias for constructor signature instead of interface
  type SpeechRecognitionConstructor = new () => SpeechRecognition;
  
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: SpeechRecognitionEventCallback | null;
    onerror: SpeechRecognitionErrorCallback | null;
    onend: SpeechRecognitionEndCallback | null;
  }
  
  declare global {
    interface Window {
      SpeechRecognition: SpeechRecognitionConstructor;
      webkitSpeechRecognition: SpeechRecognitionConstructor;
    }
  }
  
  export class VoiceRecognitionService {
    private readonly recognition: SpeechRecognition | null = null;
    private isListening: boolean = false;
  
    constructor() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
      }
    }
  
    isSupported(): boolean {
      return !!this.recognition;
    }
  
    startListening(onResult: (transcript: string) => void, onError?: (error: string) => void): void {
      if (!this.recognition || this.isListening) return;
  
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      };
  
      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        onError?.(event.error);
      };
  
      this.recognition.onend = () => {
        this.isListening = false;
      };
  
      try {
        this.recognition.start();
        this.isListening = true;
      } catch (error) {
        console.error('Error starting recognition:', error);
        this.isListening = false;
        onError?.(error instanceof Error ? error.message : String(error));
      }
    }
  
    stopListening(): void {
      if (this.recognition && this.isListening) {
        this.recognition.stop();
        this.isListening = false;
      }
    }
  
    getIsListening(): boolean {
      return this.isListening;
    }
  }
  
  export const voiceRecognition = new VoiceRecognitionService();