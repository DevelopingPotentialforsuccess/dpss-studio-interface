import { GoogleGenerativeAI } from "@google/generativeai";

// 1. Get the one test key from Vercel settings
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// 2. Initialize the client
export const genAI = new GoogleGenerativeAI(API_KEY);

// 3. Helper to get the model
export const getGenerativeModel = (modelName: string) => {
  return genAI.getGenerativeModel({ model: modelName });
};
