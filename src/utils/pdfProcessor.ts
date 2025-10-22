import { processPDFWithAIModel, getContentForSpeech } from './aiModelProcessor';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface StructuredContent {
  document_title: string;
  headings: Heading[];
}

export interface Heading {
  heading: string;
  points: string[];
}

interface PDFContent {
  text: string;
  pages: number;
}

// Use proper types from pdfjs-dist
interface TextItem {
  str: string;
}

interface TextContent {
  items: TextItem[];
}

// Main function that uses your AI model
export async function extractStructuredContent(file: File): Promise<{
  content: StructuredContent;
  text: string;
  speechText: string;
}> {
  try {
    console.log('Starting AI model processing...');
    
    // Use your AI model for structured content
    const structuredContent = await processPDFWithAIModel(file);
    
    // Convert to text formats
    const fullText = structuredContentToText(structuredContent);
    const speechText = getContentForSpeech(structuredContent);
    
    console.log('AI model processing completed:', structuredContent);
    
    return {
      content: structuredContent,
      text: fullText,
      speechText: speechText
    };
  } catch (error) {
    console.error('Error in structured content extraction:', error);
    throw error;
  }
}

// Convert structured content to readable text
export function structuredContentToText(content: StructuredContent): string {
  let text = `Document: ${content.document_title}\n\n`;
  
  content.headings.forEach((heading, index) => {
    text += `## ${heading.heading}\n\n`;
    
    if (heading.points && heading.points.length > 0) {
      heading.points.forEach((point, pointIndex) => {
        text += `${pointIndex + 1}. ${point}\n`;
      });
    }
    text += '\n';
  });
  
  return text;
}

// Keep your existing text extraction as fallback
export async function extractPDFText(file: File): Promise<PDFContent> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent() as TextContent;
      
      const pageText = textContent.items
        .map((item: TextItem) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    return {
      text: fullText.trim(),
      pages: numPages,
    };
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Simple summarization (fallback)
export function summarizePDFContent(text: string, maxLength: number = 500): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

  if (sentences.length === 0) {
    return 'No meaningful content found in the PDF.';
  }

  const keywords = extractKeywords(text);
  const scoredSentences = sentences.map(sentence => ({
    sentence: sentence.trim(),
    score: scoreSentence(sentence, keywords),
  }));

  scoredSentences.sort((a, b) => b.score - a.score);

  let summary = '';
  const topSentences = scoredSentences.slice(0, Math.min(5, sentences.length));

  for (const item of topSentences) {
    if (summary.length + item.sentence.length + 2 <= maxLength) {
      summary += item.sentence + '. ';
    } else {
      break;
    }
  }

  if (summary.length === 0 && topSentences.length > 0) {
    summary = topSentences[0].sentence.substring(0, maxLength - 3) + '...';
  }

  return summary.trim() || 'Unable to generate summary.';
}

export function extractKeyPoints(text: string, count: number = 5): string[] {
  const sentences = text
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 30)
    .map(s => s.trim());

  if (sentences.length === 0) {
    return ['No key points could be extracted from the document.'];
  }

  const keywords = extractKeywords(text);
  const scoredSentences = sentences.map(sentence => ({
    sentence,
    score: scoreSentence(sentence, keywords),
  }));

  scoredSentences.sort((a, b) => b.score - a.score);

  return scoredSentences
    .slice(0, Math.min(count, scoredSentences.length))
    .map(item => {
      // Clean up the sentence and ensure it ends properly
      let cleaned = item.sentence.trim();
      if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
        cleaned += '.';
      }
      return cleaned;
    });
}

// Helper functions for text processing
function extractKeywords(text: string): Map<string, number> {
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const wordCount = new Map<string, number>();

  const stopWords = new Set([
    'this', 'that', 'with', 'from', 'have', 'been', 'were', 'will',
    'their', 'there', 'when', 'where', 'what', 'which', 'would', 'could',
    'should', 'about', 'after', 'before', 'through', 'during', 'than',
    'then', 'more', 'most', 'some', 'such', 'into', 'just', 'only',
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any',
    'can', 'her', 'was', 'one', 'our', 'out', 'has', 'had', 'him',
    'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way',
    'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too',
    'use', 'these', 'those', 'while', 'because', 'however', 'therefore',
    'although', 'though', 'unless', 'until', 'whether', 'while'
  ]);

  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  });

  return wordCount;
}

function scoreSentence(sentence: string, keywords: Map<string, number>): number {
  const words = sentence.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  let score = 0;

  words.forEach(word => {
    score += keywords.get(word) || 0;
  });

  // Prefer longer sentences (but not too long)
  score += Math.min(sentence.length / 100, 5);

  // Bonus for sentences that start with capital letters (likely proper sentences)
  if (/^[A-Z]/.test(sentence.trim())) {
    score += 2;
  }

  // Bonus for sentences containing key phrases
  const keyPhrases = ['important', 'key', 'summary', 'conclusion', 'result', 'finding', 'study', 'research'];
  keyPhrases.forEach(phrase => {
    if (sentence.toLowerCase().includes(phrase)) {
      score += 3;
    }
  });

  return score;
}

// Additional utility function for better text processing
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();
}

// Function to estimate reading time
export function estimateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const words = text.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}
// Add this function to your existing pdfProcessor.ts
export function extractTextbookSections(text: string, maxSections: number = 10): string[] {
  // Split by common textbook section markers
  const sectionMarkers = [
    /\n\s*\d+\.\s+[A-Z]/g,      // "1. INTRODUCTION"
    /\n\s*Chapter\s+\d+/gi,     // "Chapter 1"
    /\n\s*\d+\.\d+\.\s+[A-Z]/g, // "1.1. OVERVIEW" 
    /\n\s*[A-Z][A-Z\s]{10,}\n/g // ALL CAPS headings
  ];
  
  let sections: string[] = [text];
  
  for (const marker of sectionMarkers) {
    if (sections.length >= maxSections) break;
    
    const newSections: string[] = [];
    sections.forEach(section => {
      const split = section.split(marker);
      if (split.length > 1) {
        newSections.push(...split.filter(s => s.trim().length > 100));
      } else {
        newSections.push(section);
      }
    });
    sections = newSections;
  }
  
  return sections.slice(0, maxSections).filter(section => section.trim().length > 200);
}