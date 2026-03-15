import { GoogleGenerativeAI } from "@google/generative-ai";

// This is the simplest possible way to load the key
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// Log to the browser console (Press F12 to see) 
// This will show if the key is empty or loaded
console.log("Gemini Engine: Key starts with", API_KEY.substring(0, 4));

export const genAI = new GoogleGenerativeAI(API_KEY);

export const getGenerativeModel = (modelName: string) => {
  return genAI.getGenerativeModel({ model: modelName });
};
