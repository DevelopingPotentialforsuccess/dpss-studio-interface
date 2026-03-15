import { GoogleGenerativeAI } from "@google/generative-ai";

const getApiKey = (): string => {
  const raw = import.meta.env.VITE_GEMINI_API_KEY || "";
  // If there is no comma, just return the key trimmed
  if (!raw.includes(",")) return raw.trim();
  // If there are commas, pick one at random (Rotation)
  const keys = raw.split(",").map(k => k.trim()).filter(k => k.length > 0);
  return keys.length > 0 ? keys[Math.floor(Math.random() * keys.length)] : "";
};

export const genAI = new GoogleGenerativeAI(getApiKey());

export const getGenerativeModel = (modelName: string) => {
  return genAI.getGenerativeModel({ model: modelName });
};
