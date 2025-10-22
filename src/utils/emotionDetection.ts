import * as faceapi from 'face-api.js';

export type EmotionType = 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised' | 'neutral';
export type MoodType = 'stressed' | 'calm' | 'happy' | 'neutral';

export interface EmotionScores {
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
  neutral: number;
}

let modelsLoaded = false;

export async function loadEmotionModels(): Promise<void> {
  if (modelsLoaded) return;

  try {
    const MODEL_URL = '/models';

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
    console.log('Emotion detection models loaded');
  } catch (error) {
    console.error('Error loading emotion models:', error);
    throw error;
  }
}

export async function detectEmotion(videoElement: HTMLVideoElement): Promise<{
  emotion: EmotionType;
  mood: MoodType;
  scores: EmotionScores;
} | null> {
  try {
    if (!modelsLoaded) {
      await loadEmotionModels();
    }

    const detection = await faceapi
      .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    if (!detection) {
      return null;
    }

    const expressions = detection.expressions;
    const scores: EmotionScores = {
      happy: expressions.happy,
      sad: expressions.sad,
      angry: expressions.angry,
      fearful: expressions.fearful,
      disgusted: expressions.disgusted,
      surprised: expressions.surprised,
      neutral: expressions.neutral,
    };

    // Fix 1: Add initial value to reduce() call
    const dominantEmotion = Object.entries(scores).reduce((a, b) =>
      a[1] > b[1] ? a : b, ['neutral', 0]
    )[0] as EmotionType;

    // Fix 2: Remove unused emotion parameter
    const mood = emotionToMood(scores);

    return {
      emotion: dominantEmotion,
      mood,
      scores,
    };
  } catch (error) {
    console.error('Error detecting emotion:', error);
    return null;
  }
}

// Fix 2: Remove unused emotion parameter
function emotionToMood(scores: EmotionScores): MoodType {
  const stressScore = scores.angry + scores.fearful + scores.sad + scores.disgusted;

  if (stressScore > 0.4) {
    return 'stressed';
  }

  if (scores.happy > 0.5) {
    return 'happy';
  }

  if (scores.neutral > 0.6 || (scores.happy > 0.2 && scores.neutral > 0.3)) {
    return 'calm';
  }

  return 'neutral';
}

export async function startEmotionMonitoring(
  videoElement: HTMLVideoElement,
  onEmotionDetected: (result: { emotion: EmotionType; mood: MoodType; scores: EmotionScores }) => void,
  intervalMs: number = 3000
): Promise<() => void> {
  await loadEmotionModels();

  const interval = setInterval(async () => {
    const result = await detectEmotion(videoElement);
    if (result) {
      onEmotionDetected(result);
    }
  }, intervalMs);

  return () => clearInterval(interval);
}