import { GoogleGenerativeAI } from "@google/generativeai";

// 1. Function to pick a random key from your list of 10
const getRotatedKey = () => {
  const rawKeys = import.meta.env.VITE_GEMINI_API_KEY || "";
  const keys = rawKeys.split(",").map(k => k.trim()).filter(k => !!k);
  if (keys.length === 0) return "";
  return keys[Math.floor(Math.random() * keys.length)];
};

// 2. Export the AI instance so App.tsx can see it
// ADDED "export" HERE - THIS WAS THE MISSING PIECE
export const genAI = new GoogleGenerativeAI(getRotatedKey());

// 3. Helper to get the model
export const getGenerativeModel = (modelName: string) => {
  return genAI.getGenerativeModel({ model: modelName });
};
