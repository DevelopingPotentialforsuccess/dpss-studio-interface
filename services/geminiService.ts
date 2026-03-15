import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Get and Rotate Keys
const getApiKey = (): string => {
  const raw = import.meta.env.VITE_GEMINI_API_KEY || "";
  if (!raw.includes(",")) return raw.trim();
  const keys = raw.split(",").map(k => k.trim()).filter(k => k.length > 0);
  return keys.length > 0 ? keys[Math.floor(Math.random() * keys.length)] : "";
};

// 2. Setup the AI Instance
export const genAI = new GoogleGenerativeAI(getApiKey());

// 3. Setup the Model Getter (App.tsx needs this)
export const getGenerativeModel = (modelName: string) => {
  const rotatedGenAI = new GoogleGenerativeAI(getApiKey());
  return rotatedGenAI.getGenerativeModel({ model: modelName });
};
