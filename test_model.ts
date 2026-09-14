import { GoogleGenAI } from "@google/genai";
async function checkModel(modelId: string) {
  const ai = new GoogleGenAI({apiKey: process.env.VITE_GEMINI_API_KEY}); 
}
