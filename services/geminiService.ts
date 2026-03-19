
import { GoogleGenAI, Type } from "@google/genai";
import { AISettings } from "../components/SettingsModule";

const getSettings = (): AISettings => {
  const saved = localStorage.getItem('dpss_ai_settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return {
    geminiKey: '',
    openaiKey: '',
    deepseekKey: '',
    deepseekModel: 'deepseek-chat',
    grokKey: '',
    grokModel: 'grok-2-1212',
    primaryProvider: 'gemini',
    useCustomKeys: false
  };
};

/**
 * OpenAI-compatible API caller (via server proxy)
 */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: any[],
  jsonMode: boolean = false
) {
  try {
    const response = await fetch('/api/ai/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl, apiKey, model, messages, jsonMode })
    });

    if (response.status === 404) {
      throw new Error("Backend Proxy Not Found (404). If you are on Vercel, ensure you have deployed the full-stack version with the server.ts backend.");
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from proxy: ${text.slice(0, 100)}...`);
    }
    
    if (!response.ok) {
      console.error('AI Proxy Error:', data);
      throw new Error(data.error?.message || data.error || data.message || `AI Provider Error (${response.status})`);
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('AI Request Failed:', error);
    throw new Error(error.message || 'Failed to connect to AI Laboratory node.');
  }
}

/**
 * Clean JSON string from potential markdown blocks
 */
function cleanJSON(text: string): string {
  return text.replace(/```json\n?|```/g, '').trim();
}

/**
 * Unified AI Caller
 */
async function runAI(options: {
  prompt: string;
  systemInstruction?: string;
  jsonMode?: boolean;
  imageUri?: string;
  isImageGen?: boolean;
}) {
  const settings = getSettings();
  const provider = settings.useCustomKeys ? settings.primaryProvider : 'gemini';

  // 1. Handle Gemini (Built-in or Custom)
  if (provider === 'gemini') {
    const keys = [
      settings.useCustomKeys ? settings.geminiKey : '',
      process.env.API_KEY,
      process.env.GEMINI_API_KEY
    ].filter(Boolean) as string[];

    if (keys.length === 0) throw new Error("No Gemini API Key found. Please add one in Settings.");

    let lastError: any;
    for (const key of keys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        if (options.isImageGen) {
          // Warning for high-volume image generation on free tier
          if (!settings.useCustomKeys) {
            console.warn("Using shared Gemini key for image generation. Quota is extremely limited.");
          }

          const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: options.prompt,
            config: { imageConfig: { aspectRatio: "1:1" } }
          });
          
          const candidate = response.candidates?.[0];
          if (!candidate) throw new Error("No response from image generation node.");

          const imgPart = candidate.content?.parts.find(p => p.inlineData);
          if (!imgPart) {
            const finishReason = candidate.finishReason;
            if (finishReason === 'SAFETY') throw new Error("SAFETY BLOCK: The AI refused to generate this image due to safety filters. Try a different prompt.");
            if (finishReason === 'RECITATION') throw new Error("RECITATION BLOCK: The AI refused to generate this image because it might contain copyrighted content.");
            throw new Error(`Image generation failed (Reason: ${finishReason}). This usually means quota was exceeded or the prompt was blocked.`);
          }
          return `data:image/png;base64,${imgPart.inlineData.data}`;
        }

        const contents: any = options.imageUri ? [
          { inlineData: { mimeType: "image/png", data: options.imageUri.split(',')[1] } },
          { text: options.prompt }
        ] : options.prompt;

        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents,
          config: {
            systemInstruction: options.systemInstruction,
            responseMimeType: options.jsonMode ? "application/json" : undefined
          }
        });
        if (!response.text) throw new Error("Gemini returned an empty response.");
        return options.jsonMode ? cleanJSON(response.text) : response.text;
      } catch (e: any) {
        lastError = e;
        console.error(`Gemini Attempt Failed (Key: ${key.substring(0, 6)}...):`, e);
        // If it's a quota error, try the next key
        if (e.message?.toLowerCase().includes("quota") || e.message?.includes("429") || e.message?.includes("limit")) continue;
        // If it's a safety error, don't retry with other keys as it's prompt-related
        if (e.message?.includes("SAFETY")) throw e;
        throw new Error(`Gemini Error: ${e.message || 'Unknown error'}`);
      }
    }

    // If we exhausted all keys and still have a quota error
    const errText = lastError?.message || '';
    if (errText.toLowerCase().includes('quota') || errText.includes('429') || errText.includes('RESOURCE_EXHAUSTED')) {
      if (!settings.useCustomKeys) {
        throw new Error("QUOTA EXHAUSTED: The shared Gemini key has reached its limit. Please go to Settings, enter your OWN Gemini API key from Google AI Studio, and enable 'Use Custom Keys' to continue.");
      } else {
        throw new Error("QUOTA EXHAUSTED: Your personal Gemini API key has reached its limit. Please check your Google AI Studio dashboard or wait a few minutes.");
      }
    }
    throw lastError;
  }

  // 2. Handle OpenAI
  if (provider === 'openai') {
    if (!settings.openaiKey) throw new Error("OpenAI Key missing in Settings.");
    if (options.isImageGen) {
      const response = await fetch('/api/ai/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: 'https://api.openai.com/v1',
          apiKey: settings.openaiKey,
          model: 'dall-e-3',
          isImageGen: true,
          prompt: options.prompt
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "OpenAI Image Gen Failed");
      return data.image;
    }
    return await callOpenAICompatible(
      'https://api.openai.com/v1',
      settings.openaiKey,
      'gpt-4o',
      [{ role: 'system', content: options.systemInstruction || '' }, { role: 'user', content: options.prompt }],
      options.jsonMode
    );
  }

  // 3. Handle Deepseek
  if (provider === 'deepseek') {
    if (!settings.deepseekKey) throw new Error("Deepseek Key missing in Settings.");
    return await callOpenAICompatible(
      'https://api.deepseek.com/v1',
      settings.deepseekKey,
      settings.deepseekModel || 'deepseek-chat',
      [{ role: 'system', content: options.systemInstruction || '' }, { role: 'user', content: options.prompt }],
      options.jsonMode
    );
  }

  // 4. Handle Grok
  if (provider === 'grok') {
    if (!settings.grokKey) throw new Error("Grok Key missing in Settings.");
    return await callOpenAICompatible(
      'https://api.x.ai/v1',
      settings.grokKey,
      settings.grokModel || 'grok-2-1212',
      [{ role: 'system', content: options.systemInstruction || '' }, { role: 'user', content: options.prompt }],
      options.jsonMode
    );
  }

  throw new Error("Unknown Provider");
}

export const generateTracingWords = async (prompt: string, count: number = 3): Promise<string[]> => {
  try {
    const text = await runAI({
      prompt: `Generate exactly ${count} educational words suitable for kids based on: "${prompt}". Return JSON: {"words": ["word1", "word2", "word3"]}`,
      jsonMode: true
    });
    return JSON.parse(text || '{"words":[]}').words;
  } catch (e) {
    console.error("Tracing Words Error:", e);
    // Fallback words if AI fails
    return ["Apple", "Ball", "Cat"].slice(0, count);
  }
};

export const generateWordSearch = async (words: string[], level: number): Promise<string[][]> => {
  try {
    const gridSize = Math.min(15, 8 + Math.floor(level));
    const text = await runAI({
      prompt: `Create a word search grid of size ${gridSize}x${gridSize} containing: ${words.join(', ')}. Level ${level} difficulty. Return JSON: {"grid": [["A","B"],["C","D"]]}`,
      jsonMode: true
    });
    return JSON.parse(text || '{"grid":[]}').grid;
  } catch (e) {
    console.error("Word Search Error:", e);
    // Fallback empty grid
    return Array(10).fill(0).map(() => Array(10).fill("X"));
  }
};

export const generateObjectHint = async (imageUri: string, items: string[]): Promise<string> => {
  return await runAI({
    prompt: `This is a hidden object scene. The user is looking for: ${items.join(', ')}. Pick ONE item and describe its exact location in a friendly way.`,
    imageUri
  });
};

export const generateIllustration = async (prompt: string): Promise<string> => {
  return await runAI({
    prompt: `Digital art: ${prompt}. Professional, high quality, coloring book style if applicable.`,
    isImageGen: true
  });
};
