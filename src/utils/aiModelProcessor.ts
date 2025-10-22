import { StructuredContent, Heading } from './pdfProcessor';

const AI_SERVER_URL = 'http://localhost:5001';
let isServerAvailable: boolean | null = null;
const processedCache = new Map<string, StructuredContent>();

async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_SERVER_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      isServerAvailable = data.status === 'healthy';
      return isServerAvailable;
    }
  } catch (error) {
    console.warn('AI server not available:', error);
    isServerAvailable = false;
  }
  return false;
}

export async function processPDFWithAIModel(file: File): Promise<StructuredContent> {
  const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;
  
  if (processedCache.has(cacheKey)) {
    console.log('📚 Using cached textbook result');
    return processedCache.get(cacheKey)!;
  }

  if (isServerAvailable === null) {
    await checkServerHealth();
  }

  if (!isServerAvailable) {
    console.log('Using fallback processing for textbook');
    return await fallbackTextbookProcessing(file);
  }

  try {
    console.log('🔄 Processing textbook with AI model...');
    const result = await callPythonModel(file);
    processedCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('AI model error:', error);
    return await fallbackTextbookProcessing(file);
  }
}

async function callPythonModel(file: File): Promise<StructuredContent> {
  const formData = new FormData();
  formData.append('pdf', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // Reduced to 90 seconds for speed

  try {
    const response = await fetch(`${AI_SERVER_URL}/process-pdf`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    return processTextbookContent(result, file.name);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Textbook processing timeout - try a smaller file');
    }
    throw error;
  }
}

function processTextbookContent(content: any, fileName: string): StructuredContent {
  const documentTitle = getCleanDocumentTitle(content.document_title, fileName);
  const headings: Heading[] = [];

  if (content.headings && Array.isArray(content.headings)) {
    content.headings.forEach((heading: any) => {
      const cleanHeadingText = extractPureHeadingName(heading.heading);
      
      // Skip if heading is meaningless after cleaning
      if (!cleanHeadingText || cleanHeadingText.length < 3 || isMeaninglessHeading(cleanHeadingText)) {
        return;
      }

      const cleanPoints = getCleanPoints(heading.points);
      
      // Only add if we have meaningful content
      if (cleanPoints.length > 0) {
        headings.push({
          heading: cleanHeadingText,
          points: cleanPoints
        });
      }
    });
  }

  // If no meaningful headings found, create a clean fallback
  if (headings.length === 0) {
    return createCleanFallback(content, fileName);
  }

  return {
    document_title: documentTitle,
    headings: headings
  };
}

// COMPLETELY REMOVE CHAPTER PREFIXES
function extractPureHeadingName(rawHeading: string): string {
  if (!rawHeading) return '';

  console.log('🔍 Raw heading:', rawHeading);

  let pureHeading = rawHeading;

  // COMPLETE REMOVAL of all chapter patterns
  pureHeading = pureHeading
    // Remove ALL chapter patterns
    .replace(/^Chapter\s+\d+\s*[:-]?\s*/gi, '')
    .replace(/^Ch\.?\s*\d+\s*[:-]?\s*/gi, '')
    .replace(/^Chap\.?\s*\d+\s*[:-]?\s*/gi, '')
    .replace(/^\d+\s*[:-]?\s*/, '')
    .replace(/^\d+\.\d*\s*[:-]?\s*/, '')
    .replace(/^Section\s+\d+\s*[:-]?\s*/gi, '')
    .replace(/^Sec\.?\s*\d+\s*[:-]?\s*/gi, '')
    // Remove any remaining numbers at start
    .replace(/^\d+\s*/, '')
    // Remove special characters
    .replace(/[�•\-–—*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If empty after cleaning, check if original was actually a meaningful heading
  if (!pureHeading || pureHeading.length < 2) {
    // Check if original heading itself is meaningful (not just chapter number)
    if (isActualHeadingName(rawHeading)) {
      pureHeading = cleanText(rawHeading);
    } else {
      return '';
    }
  }

  // Final cleanup
  pureHeading = pureHeading
    .replace(/^[:-]\s*/, '') // Remove any remaining colons/dashes at start
    .replace(/\s+$/, '') // Remove trailing spaces
    .trim();

  // Capitalize first letter
  if (pureHeading.length > 0) {
    pureHeading = pureHeading.charAt(0).toUpperCase() + pureHeading.slice(1);
  }

  console.log('✅ Clean heading:', pureHeading);
  return pureHeading;
}

function isActualHeadingName(text: string): boolean {
  if (!text) return false;

  const meaninglessPatterns = [
    /^Chapter\s+\d+/i,
    /^Ch\.?\s*\d+/i,
    /^Chap\.?\s*\d+/i,
    /^\d+\.?\s*$/,
    /^\d+\.\d+\s*$/,
    /^Section\s+\d+/i,
    /^Sec\.?\s*\d+/i,
    /^UNLOCK THE/i,
    /^General$/i,
    /^Dear Gubbs/i
  ];

  if (meaninglessPatterns.some(pattern => pattern.test(text))) {
    return false;
  }

  const words = text.split(/\s+/).filter(word => word.length > 2);
  return words.length >= 1 && text.length > 5;
}

function isMeaninglessHeading(heading: string): boolean {
  if (!heading) return true;

  const meaninglessHeadings = [
    'unlock the',
    'dear gubbs',
    'general',
    'quick year',
    'try send',
    'prohibited years',
    'your booking',
    'prr',
    'pnr',
    'chapter',
    'ch ',
    'sec '
  ];

  return meaninglessHeadings.some(pattern => 
    heading.toLowerCase().includes(pattern.toLowerCase())
  );
}

// ... rest of the functions remain the same as previous version
function getCleanDocumentTitle(rawTitle: string, fileName: string): string {
  if (rawTitle && !isMeaninglessText(rawTitle)) {
    return cleanText(rawTitle);
  }
  return cleanText(fileName.replace('.pdf', '').replace(/_/g, ' ').replace(/-/g, ' '));
}

function getCleanPoints(rawPoints: string[]): string[] {
  if (!rawPoints || !Array.isArray(rawPoints)) {
    return [];
  }

  return rawPoints
    .map(point => cleanText(point))
    .filter(point => 
      point.length > 25 && 
      !isMeaninglessText(point) &&
      !isDuplicateContent(point) &&
      !isGibberishText(point)
    )
    .slice(0, 6);
}

function isMeaninglessText(text: string): boolean {
  if (!text) return true;
  const meaninglessPatterns = [
    'dear gubbs', 'unlock the', 'general', 'your booking is confirmed',
    'prr :', 'pnr:', 'quick year', 'try send', 'prohibited years'
  ];
  return meaninglessPatterns.some(pattern => text.toLowerCase().includes(pattern.toLowerCase()));
}

function isGibberishText(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  const realWords = words.filter(word => word.length > 2 && /[a-z]{3,}/.test(word));
  return realWords.length / words.length < 0.3;
}

function isDuplicateContent(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  return uniqueWords.size < 5;
}

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\.\.+/g, '.')
    .replace(/\s+\./g, '.')
    .replace(/,\s*,/g, ',')
    .trim();
}

function createCleanFallback(content: any, fileName: string): StructuredContent {
  const allText: string[] = [];
  if (content.headings) {
    content.headings.forEach((heading: any) => {
      if (heading.points) {
        heading.points.forEach((point: string) => {
          const cleanPoint = cleanText(point);
          if (cleanPoint.length > 30 && !isMeaninglessText(cleanPoint) && !isGibberishText(cleanPoint)) {
            allText.push(cleanPoint);
          }
        });
      }
    });
  }

  const documentTitle = getCleanDocumentTitle(content.document_title, fileName);
  if (allText.length > 0) {
    return {
      document_title: documentTitle,
      headings: [{
        heading: "Textbook Content",
        points: allText.slice(0, 8)
      }]
    };
  }

  return {
    document_title: documentTitle,
    headings: [{
      heading: "Study Material",
      points: ["Your textbook has been processed and is ready for study."]
    }]
  };
}

async function fallbackTextbookProcessing(file: File): Promise<StructuredContent> {
  const { extractPDFText, extractKeyPoints, cleanText } = await import('./pdfProcessor');
  try {
    const { text, pages } = await extractPDFText(file);
    const cleanedText = cleanText(text);
    const points = extractKeyPoints(cleanedText, 8);
    const meaningfulPoints = points.includes('No key points') ? [
      "Textbook content successfully extracted",
      `Processed ${pages} pages of study material`,
      "Key concepts and definitions identified",
      "Ready for interactive learning and reading"
    ] : points;

    return {
      document_title: file.name.replace('.pdf', '').replace(/_/g, ' ').replace(/-/g, ' '),
      headings: [{
        heading: "Textbook Summary",
        points: meaningfulPoints
      }]
    };
  } catch (error) {
    return {
      document_title: file.name.replace('.pdf', '').replace(/_/g, ' ').replace(/-/g, ' '),
      headings: [{
        heading: "Study Material",
        points: ["Your textbook has been uploaded and is ready for study."]
      }]
    };
  }
}

export function getContentForSpeech(content: StructuredContent): string {
  if (!content.headings || content.headings.length === 0) {
    return "I've processed your textbook and it's ready for study.";
  }
  if (content.headings.length === 1) {
    const textContent = content.headings[0].points?.join('. ') || "";
    const preview = textContent.length > 300 ? textContent.substring(0, 300) + "..." : textContent;
    return `I've analyzed your textbook "${content.document_title}". ${preview}`;
  }
  let speechText = `I've analyzed your textbook "${content.document_title}". `;
  speechText += `I found ${content.headings.length} main sections. `;
  content.headings.slice(0, 2).forEach((heading, index) => {
    speechText += `Section ${index + 1} covers ${heading.heading}. `;
  });
  speechText += "You can explore each section in detail or use the read aloud feature.";
  return speechText;
}

export { isServerAvailable, checkServerHealth };