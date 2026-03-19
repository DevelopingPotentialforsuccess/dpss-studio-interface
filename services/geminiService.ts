
import { GoogleGenAI, Type } from "@google/genai";
import { AISettings } from "../components/SettingsModule";

const getSettings = (): AISettings | null => {
  const saved = localStorage.getItem('dpss_ai_settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  }
  return null;
};

/**
 * Multi-Node Fallback Architecture
 * Automatically rotates keys when a quota or balance error occurs.
 */
const getFallbackKeys = () => {
  const settings = getSettings();
  const keys = [
    "AIzaSyDM0-uHXjX_LYwOLcs_j9virMFUL3eX2Xs", // Requested default
    "AIzaSyAMdJJiItIVmN3zjzWqhZZX94cL8PzGJ7M",
    "AIzaSyAqaqCaDHw2LQaYIke5CJ8ctM4oevspRig",
    "AIzaSyApBrvFBVOGsyzTKxJ5eBts70Hy6VMslp0",
    process.env.API_KEY, 
  ];

  if (settings?.useCustomKeys && settings.geminiKey) {
    // Prioritize user key
    return [settings.geminiKey, ...keys.filter(Boolean)] as string[];
  }

  return keys.filter(Boolean) as string[];
};

/**
 * Executes operation with automatic rotation between keys on quota exhaustion.
 */
async function runWithFallback<T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  const settings = getSettings();
  
  // If user explicitly chose a non-gemini provider, we should handle that
  // For now, we'll focus on Gemini but allow the user to provide their own key
  
  const uniqueKeys = Array.from(new Set(getFallbackKeys()));
  let lastError: any;

  for (const key of uniqueKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      return await operation(ai);
    } catch (e: any) {
      lastError = e;
      const msg = (e.message || "").toLowerCase();
      const isQuotaError = 
        msg.includes("quota") || 
        msg.includes("429") || 
        msg.includes("exhausted") || 
        msg.includes("limit") || 
        msg.includes("balance") ||
        msg.includes("billing") ||
        msg.includes("credit") ||
        msg.includes("capacity") ||
        msg.includes("service_unavailable") ||
        msg.includes("overloaded");

      if (isQuotaError) {
        console.warn(`[Node Rotation] Key ...${key.slice(-6)} busy. Switching node...`);
        continue;
      }
      throw e;
    }
  }
  throw lastError || new Error("All AI Laboratory Nodes are currently at capacity. Try again in 60s.");
}

export const generateTracingWords = async (prompt: string, count: number = 3): Promise<string[]> => {
  return await runWithFallback(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the topic: "${prompt}", generate exactly ${count} educational words suitable for kids. Return JSON with 'words' array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { words: { type: Type.ARRAY, items: { type: Type.STRING } } },
          required: ["words"]
        }
      }
    });
    return JSON.parse(response.text || '{"words":[]}').words;
  });
};

export const generateWordSearch = async (words: string[], level: number): Promise<string[][]> => {
  return await runWithFallback(async (ai) => {
    // Grid size based on level (1-10) -> 10x10 to 18x18
    const gridSize = 8 + Math.floor(level);
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a word search grid of size ${gridSize}x${gridSize}. 
      Include these words: ${words.join(', ')}. 
      Level ${level} difficulty (1 is easy/horizontal only, 10 is complex/all directions).
      Return JSON with 'grid' property as a 2D array of characters.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grid: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          },
          required: ["grid"]
        }
      }
    });
    const result = JSON.parse(response.text || '{"grid":[]}');
    return result.grid;
  });
};

export const generateObjectHint = async (imageUri: string, items: string[]): Promise<string> => {
  return await runWithFallback(async (ai) => {
    const base64Data = imageUri.split(',')[1];
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Data
          }
        },
        {
          text: `This is a hidden object scene. The user is looking for these items: ${items.join(', ')}. Pick ONE item that is moderately difficult to find and describe its exact location in the image in a friendly, helpful way (e.g., "The cat is hiding behind the blue chimney in the top right corner"). Keep it concise.`
        }
      ]
    });
    return response.text || "I can't quite see the objects right now. Try looking near the center!";
  });
};

export const generateIllustration = async (prompt: string, heroAvatars: string[] = []): Promise<string> => {
  return await runWithFallback(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: `Digital art: ${prompt}. Professional.`,
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!imgPart) throw new Error("Image node response empty.");
    return `data:image/png;base64,${imgPart.inlineData.data}`;
  });
};
