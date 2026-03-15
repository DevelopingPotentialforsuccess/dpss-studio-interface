import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export const genAI = new GoogleGenerativeAI(API_KEY);

export const getGenerativeModel = (modelName: string) => {
  return genAI.getGenerativeModel({ model: modelName });
};
