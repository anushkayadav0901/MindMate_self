import { useState, useRef, useEffect } from 'react';
import Avatar3D from '../components/Avatar3D';
import { extractStructuredContent } from '../utils/pdfProcessor';
import { speechService } from '../utils/speech';
import { FileText, Upload, BookOpen, Pause, Play, Headphones, GraduationCap, X, Plus } from 'lucide-react';
import type { StructuredContent, Heading } from '../utils/pdfProcessor';

interface ProcessedTextbook {
  id: string;
  file: File;
  content: StructuredContent;
  loading: boolean;
}

export default function LearnPage() {
  const [textbooks, setTextbooks] = useState<ProcessedTextbook[]>([]);
  const [currentTextbookId, setCurrentTextbookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTextbook = textbooks.find(t => t.id === currentTextbookId) || textbooks[0];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => file.type === 'application/pdf');
    if (validFiles.length === 0) {
      alert('Please select valid PDF files');
      return;
    }

    setLoading(true);

    for (const file of validFiles) {
      const textbookId = `${file.name}-${Date.now()}`;
      
      // Add to textbooks list immediately
      setTextbooks(prev => [...prev, {
        id: textbookId,
        file,
        content: { document_title: file.name.replace('.pdf', ''), headings: [] },
        loading: true
      }]);

      setCurrentTextbookId(textbookId);

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 10, 90));
        }, 400);

        const { content, speechText } = await extractStructuredContent(file);
        
        clearInterval(progressInterval);
        setProgress(100);

        // Update the textbook with content
        setTextbooks(prev => prev.map(t => 
          t.id === textbookId 
            ? { ...t, content, loading: false }
            : t
        ));

        // Speak for the first file only
        if (textbooks.length === 0) {
          const message = `I've analyzed your textbook ${file.name}. ${speechText}`;
          await speechService.speak(message, { rate: 0.8 }, setIsSpeaking);
        }
      } catch (error) {
        console.error('Error processing textbook:', error);
        setTextbooks(prev => prev.map(t => 
          t.id === textbookId 
            ? { ...t, loading: false }
            : t
        ));
      }
    }

    setLoading(false);
    setTimeout(() => setProgress(0), 1000);
    
    // Reset file input to allow uploading same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeTextbook = (textbookId: string) => {
    setTextbooks(prev => {
      const updated = prev.filter(t => t.id !== textbookId);
      // If we're removing the current textbook, switch to another one
      if (currentTextbookId === textbookId && updated.length > 0) {
        setCurrentTextbookId(updated[0].id);
      } else if (updated.length === 0) {
        setCurrentTextbookId(null);
      }
      return updated;
    });
  };

  const handleReadSection = async (sectionIndex: number) => {
    if (!currentTextbook?.content) return;

    const section = currentTextbook.content.headings[sectionIndex];
    const sectionText = `${section.heading}. ${section.points?.join('. ') || ''}`;
    
    const message = `Section ${sectionIndex + 1}: ${sectionText.substring(0, 400)}`;
    await speechService.speak(message, { rate: 0.8 }, setIsSpeaking);
  };

  const handleReadContent = async () => {
    if (!currentTextbook?.content) return;

    if (isSpeaking) {
      speechService.stop();
      setIsSpeaking(false);
      setIsPaused(false);
    } else if (isPaused) {
      speechService.resume();
      setIsPaused(false);
    } else {
      const speechText = getContentForSpeech(currentTextbook.content);
      const message = `Here's the analysis of your textbook ${currentTextbook.file.name}. ${speechText}`;
      await speechService.speak(message, { rate: 0.8 }, setIsSpeaking);
    }
  };

  const handlePause = () => {
    if (isSpeaking && !isPaused) {
      speechService.pause();
      setIsPaused(true);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getContentForSpeech = (content: StructuredContent): string => {
    if (!content.headings || content.headings.length === 0) {
      return "I've extracted the textbook content for your study.";
    }
    if (content.headings.length === 1) {
      return `The textbook covers ${content.headings[0].heading}. ${content.headings[0].points?.[0]?.substring(0, 200) || ''}`;
    }
    let speechText = `This textbook has ${content.headings.length} chapters. `;
    content.headings.slice(0, 3).forEach((heading, index) => {
      speechText += `Chapter ${index + 1} is about ${heading.heading}. `;
    });
    return speechText;
  };

  const renderProgress = () => (
    <div className="text-center py-12">
      <div className="relative inline-block">
        <div className="animate-spin rounded-full h-20 w-20 border-4 border-white/20 border-t-teal-400 mx-auto mb-4" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-sm font-medium">{progress}%</span>
        </div>
      </div>
      <p className="text-white text-lg mb-2">AI is analyzing your textbook...</p>
      <p className="text-white/60 text-sm">
        Extracting chapters, key concepts, and study materials
      </p>
    </div>
  );

  const renderStructuredContent = () => {
    if (!currentTextbook?.content) return null;

    return (
      <div className="space-y-6">
        {/* Textbook Header */}
        <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20">
          <div className="flex items-center gap-3 mb-3">
            <GraduationCap className="w-8 h-8 text-teal-300" />
            <h2 className="text-2xl font-light text-white">Textbook Analysis</h2>
          </div>
          <h3 className="text-xl text-teal-300 font-medium">{currentTextbook.content.document_title}</h3>
          <p className="text-white/60 mt-2">
            {currentTextbook.content.headings.length} sections extracted • Ready for study
          </p>
        </div>

        {/* Chapters List */}
        <div className="space-y-4">
          {currentTextbook.content.headings.map((heading: Heading, index: number) => (
            <div key={index} className="p-6 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-teal-300" />
                  {/* BOLD HEADING - Using strong tag and larger font */}
                  <h3 className="text-xl font-bold text-white">
                    {heading.heading}
                  </h3>
                </div>
                <button
                  onClick={() => handleReadSection(index)}
                  className="px-4 py-2 rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-all flex items-center gap-2"
                >
                  <Headphones className="w-4 h-4" />
                  Read
                </button>
              </div>
              
              {heading.points && heading.points.length > 0 && (
                <ul className="space-y-3 ml-9">
                  {heading.points.map((point, pointIndex) => (
                    <li key={pointIndex} className="text-white/80 leading-relaxed text-sm">
                      • {point}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Reading Controls */}
        <div className="flex gap-4 justify-center pt-6">
          <button
            onClick={handleReadContent}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-400 to-green-400 text-white font-medium hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
          >
            {isSpeaking && !isPaused ? (
              <>
                <Pause className="w-5 h-5" />
                Stop Reading
              </>
            ) : (
              <>
                <Headphones className="w-5 h-5" />
                Read Textbook Summary
              </>
            )}
          </button>
          
          {isSpeaking && !isPaused && (
            <button
              onClick={handlePause}
              className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 transition-all"
            >
              Pause
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading || currentTextbook?.loading) return renderProgress();
    return renderStructuredContent();
  };

  // Upload section - show when no textbooks
  if (textbooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4">
        <Avatar3D mood="thinking" message="Upload textbook PDFs and I'll extract chapters and key concepts for your study!" />
        <div className="mt-12 w-full max-w-md">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            multiple // Allow multiple file selection
          />
          <button
            onClick={handleUploadClick}
            className="group w-full p-12 rounded-3xl bg-white/10 backdrop-blur-lg border-2 border-dashed border-white/30 hover:border-teal-300/50 hover:bg-white/20 transition-all"
          >
            <div className="flex flex-col items-center">
              <GraduationCap className="w-20 h-20 text-white/70 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-light text-white mb-2">Upload Textbooks</h3>
              <p className="text-white/60">AI will extract chapters and key concepts</p>
              <p className="text-white/40 text-sm mt-2">You can upload multiple textbooks</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-120px)] px-4 py-8">
      <Avatar3D isSpeaking={isSpeaking} mood="calm" />

      {/* Textbook Tabs */}
      <div className="flex gap-2 mb-6 max-w-4xl w-full overflow-x-auto">
        {textbooks.map((textbook) => (
          <div
            key={textbook.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all ${
              currentTextbookId === textbook.id
                ? 'bg-teal-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
            onClick={() => setCurrentTextbookId(textbook.id)}
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium max-w-32 truncate">
              {textbook.file.name.replace('.pdf', '')}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTextbook(textbook.id);
              }}
              className="hover:bg-white/20 rounded p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          onClick={handleUploadClick}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add More</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />
      </div>

      <div className="w-full max-w-4xl space-y-6">
        {/* File info section */}
        <div className="flex items-center justify-between p-6 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-teal-300" />
            <div>
              <h3 className="text-white font-medium">{currentTextbook.file.name}</h3>
              <p className="text-white/60 text-sm">
                {currentTextbook.loading ? 'AI Textbook Analysis in Progress...' : 'Textbook Analysis Complete'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUploadClick}
              className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all text-sm"
            >
              Add More
            </button>
            <button
              onClick={() => removeTextbook(currentTextbook.id)}
              className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all text-sm"
            >
              Remove
            </button>
          </div>
        </div>

        {/* Content section */}
        {renderContent()}
      </div>
    </div>
  );
}