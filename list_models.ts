import { GoogleGenAI } from "@google/genai";
async function listModels() {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  for await (const m of ai.models.list()) {
    console.log(m.name);
  }
}
listModels().catch(console.error);
