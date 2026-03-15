import { GoogleGenerativeAI } from "@google/generative-ai";

const key = import.meta.env.VITE_GEMINI_API_KEY || "";

export const genAI = new GoogleGenerativeAI(key);

export const getGenerativeModel = (modelName: string) => {
  return genAI.getGenerativeModel({ model: modelName });
};
