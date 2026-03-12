import { getGeminiClient } from './client';
import { Dimension } from '@life-design/core';

export interface VoiceAnalysisResult {
  mood: number;
  scores: Array<{ dimension: Dimension; score: number; note: string }>;
  journalEntry: string;
}

const VOICE_ANALYSIS_PROMPT = `You are a life coach and data extractor. You will be provided with a transcript of a user's spoken journal entry.
Your task is to:
1. Extract a mood score from 1-10.
2. Identify any mentioned life dimensions (Career, Finance, Health, Fitness, Family, Social, Romance, Growth) and assign a score (1-10) based on their sentiment, along with a short note explaining why.
3. Clean up the transcript into a polished, readable journal entry (fix grammar, remove fillers like "um", "ah").

Return ONLY a JSON object with this structure:
{
  "mood": number,
  "scores": [
    { "dimension": "career", "score": number, "note": "explanation" }
  ],
  "journalEntry": "polished text"
}

If a dimension isn't mentioned, do not include it in the scores array.`;

export async function analyzeVoiceJournal(transcript: string): Promise<VoiceAnalysisResult | null> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent([
      { text: VOICE_ANALYSIS_PROMPT },
      { text: `User Transcript: "${transcript}"` }
    ]);

    const response = await result.response;
    const text = response.text();
    return JSON.parse(text) as VoiceAnalysisResult;
  } catch (err) {
    console.error('Voice analysis failed:', err);
    return null;
  }
}
