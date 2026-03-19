
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
    grokKey: '',
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
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: options.prompt,
            config: { imageConfig: { aspectRatio: "1:1" } }
          });
          const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
          if (!imgPart) throw new Error("Image node response empty.");
          return `data:image/png;base64,${imgPart.inlineData.data}`;
        }

        const contents: any = options.imageUri ? [
          { inlineData: { mimeType: "image/png", data: options.imageUri.split(',')[1] } },
          { text: options.prompt }
        ] : options.prompt;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents,
          config: {
            systemInstruction: options.systemInstruction,
            responseMimeType: options.jsonMode ? "application/json" : undefined
          }
        });
        if (!response.text) throw new Error("Gemini returned an empty response.");
        return response.text;
      } catch (e: any) {
        lastError = e;
        console.error(`Gemini Attempt Failed (Key: ${key.substring(0, 6)}...):`, e);
        if (e.message?.includes("expired") || e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("limit")) continue;
        throw new Error(`Gemini Error: ${e.message || 'Unknown error'}`);
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
      'deepseek-chat',
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
      'grok-2-1212',
      [{ role: 'system', content: options.systemInstruction || '' }, { role: 'user', content: options.prompt }],
      options.jsonMode
    );
  }

  throw new Error("Unknown Provider");
}

export const generateTracingWords = async (prompt: string, count: number = 3): Promise<string[]> => {
  const text = await runAI({
    prompt: `Generate exactly ${count} educational words suitable for kids based on: "${prompt}". Return JSON: {"words": ["word1", "word2", "word3"]}`,
    jsonMode: true
  });
  return JSON.parse(text || '{"words":[]}').words;
};

export const generateWordSearch = async (words: string[], level: number): Promise<string[][]> => {
  const gridSize = 8 + Math.floor(level);
  const text = await runAI({
    prompt: `Create a word search grid of size ${gridSize}x${gridSize} containing: ${words.join(', ')}. Level ${level} difficulty. Return JSON: {"grid": [["A","B"],["C","D"]]}`,
    jsonMode: true
  });
  return JSON.parse(text || '{"grid":[]}').grid;
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
