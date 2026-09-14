
import { GoogleGenAI, GenerateContentResponse, Chat, Modality } from "@google/genai";
import { EnhancementLevel, Persona, OutputFormat } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const generatePromptFromImage = async (imageFile: File, baseModel: string = 'gemini-3.8-flash', imageInstructions: string = '', useDeepThink: boolean = false): Promise<{prompt: string, modelUsed: string}> => {
    const imagePart = await fileToGenerativePart(imageFile);
    let promptText = "You are an expert prompt engineer for generative art models. Describe this image in vivid detail. Focus on the subject, composition, lighting, artistic style, mood, and any specific visual elements. The description should be a complete and effective prompt that could be used to recreate a similar image. The final prompt should be detailed but concise, and kept under 4600 characters. Exclude generic fluff words like 'breathtaking', 'masterpiece', or 'octane render'. Use high-impact, technical rendering and stylistic terminology instead (e.g., 'path-traced', 'volumetric lighting', 'impasto', 'chiaroscuro').";
    
    if (imageInstructions && imageInstructions.trim() !== '') {
        promptText += `\n\nAdditionally, incorporate the following specific instructions or edits into the final prompt description:\n"""\n${imageInstructions}\n"""`;
    }

    const textPart = {
        text: promptText
    };
    
    const actualModel = useDeepThink ? 'gemini-3.1-pro-preview' : (baseModel.includes('gemma') ? 'gemini-3.8-flash' : baseModel);

    const config: any = {
        maxOutputTokens: 4624,
    };
    
    if (useDeepThink) {
        config.thinkingConfig = { thinkingBudget: 2048 };
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: actualModel,
        contents: { parts: [imagePart, textPart] },
        config: config
    });
    
    return { prompt: response.text || '', modelUsed: actualModel };
};

export const generatePromptFromText = async (idea: string, baseModel: string = 'gemini-3.8-flash', useSearch: boolean = false, useDeepThink: boolean = false): Promise<{prompt: string, modelUsed: string}> => {
    let systemInstruction = "You are an expert prompt engineer for generative art models. A user has provided an idea. Your task is to expand this idea into a detailed and vivid prompt. Focus on creating a complete scene, describing the subject, composition, lighting, artistic style, mood, and other specific visual elements. The final prompt must be under 4600 characters. Exclude generic fluff words like 'breathtaking', 'masterpiece', or 'octane render'. Use high-impact, technical rendering and stylistic terminology instead (e.g., 'path-traced', 'volumetric lighting', 'impasto', 'chiaroscuro'). Do not include any conversational text, just output the generated prompt.";
    
    if (useSearch) {
        systemInstruction += " Use the Google Search tool to look up specific characters, franchises, objects, or concepts mentioned by the user to include highly accurate and iconic details (e.g., exact weapon designs, character outfits, architectural styles) in the final prompt.";
    }

    const actualModel = useDeepThink ? 'gemini-3.1-pro-preview' : (baseModel.includes('gemma') ? baseModel : (useSearch ? 'gemini-3.8-flash' : baseModel));
    
    const isGemma = actualModel.includes('gemma');

    const config: any = {
        systemInstruction: systemInstruction,
        maxOutputTokens: isGemma ? 4096 : 4624,
    };
    
    if (useDeepThink) {
        config.thinkingConfig = { thinkingBudget: 2048 };
    }

    if (useSearch && !isGemma) {
        config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
        model: actualModel,
        contents: idea,
        config: config
    });

    return { prompt: response.text || '', modelUsed: actualModel + (useSearch ? ' (G-Search)' : '') };
};


export const enhancePrompt = async(prompt: string, styles: string[], level: EnhancementLevel, persona?: Persona, baseModel: string = 'gemini-3.8-flash', useSearch: boolean = false, useDeepThink: boolean = false): Promise<{prompt: string, modelUsed: string}> => {
    let systemInstruction = persona ? persona.instruction : "You are a professional, objective AI art prompt engineer. Exclude generic fluff words like 'breathtaking', 'masterpiece', or 'octane render'. Use high-impact, technical rendering and stylistic terminology instead (e.g., 'path-traced', 'volumetric lighting', 'impasto', 'chiaroscuro').";
    
    if (useSearch) {
        systemInstruction += " Use Google Search to research any specific subjects, characters, or elements in the prompt to ensure their iconic details are accurately represented and enhanced.";
    }

    const styleTag = styles.length > 0 ? `[STYLE CONTEXT: ${styles.join(', ')}]` : "[STYLE CONTEXT: Detailed Realism]";
    
    // "Before and After" Logic: 
    // We prepend the style context and append a strict final instruction.
    let userPrompt = `${styleTag}\n\nORIGINAL INPUT PROMPT:\n"""\n${prompt}\n"""\n\nTASK: Enhance the prompt above by rigorously applying and integrating the requested style(s).`;

    switch (level) {
        case 1:
            systemInstruction += "\n\nSubtly improve the art prompt. Add minor details about lighting or composition. Keep changes minimal and true to the style. Output ONLY the resulting prompt.";
            break;
        case 3:
            systemInstruction += "\n\nDrastically embellish the prompt. Invent and blend artistic styles, reference specific movements, and describe intricate technical details (camera angles, lens types, cinematic mood). Output ONLY the final prompt.";
            break;
        case 2:
        default:
            systemInstruction += "\n\nMake the prompt more evocative, detailed, and technically specific for high-end text-to-image models. Output ONLY the final prompt.";
            break;
    }
    
    userPrompt += `\n\nFINAL INSTRUCTION: Ensure the artistic style(s) "${styles.join(', ') || 'masterpiece quality'}" is the dominant aesthetic. The final output must be a single, cohesive art prompt under 4600 characters. No conversational filler.`;

    const useReasoning = useDeepThink || styles.length > 0 || persona !== undefined || level === 3;
    const isGemma = baseModel.includes('gemma');
    
    let modelToUse = baseModel;
    if (useDeepThink) {
        modelToUse = 'gemini-3.1-pro-preview';
    } else if (isGemma) {
        if (useReasoning) {
            modelToUse = 'gemma-4-31b-it';
        }
    } else {
        modelToUse = useReasoning ? "gemini-3.8-flash" : (useSearch ? 'gemini-3.8-flash' : baseModel);
    }

    const config: any = {
        systemInstruction: systemInstruction,
        thinkingConfig: (useReasoning && (!isGemma || useDeepThink)) ? { thinkingBudget: 2048 } : undefined,
        maxOutputTokens: isGemma && !useDeepThink ? 4096 : 5648, 
    };

    if (useSearch && (!isGemma || useDeepThink)) {
        config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
        model: modelToUse,
        contents: userPrompt,
        config: config
    });

    return { prompt: response.text || '', modelUsed: modelToUse + (useSearch ? ' (G-Search)' : '') };
};

export const secondPassRefinement = async (prompt: string, format: OutputFormat, instructions: string, useSearch: boolean = false, useDeepThink: boolean = false): Promise<{prompt: string, modelUsed: string}> => {
    let systemInstruction = `You are a master prompt architect. Your task is to take an existing prompt and perform a "second pass" refinement based on the user's specific instructions. Exclude generic fluff words like 'breathtaking', 'masterpiece', or 'octane render'. Use high-impact, technical rendering and stylistic terminology instead (e.g., 'path-traced', 'volumetric lighting', 'impasto', 'chiaroscuro').
    
    CRITICAL REQUIREMENT: You MUST output the final prompt in the requested format: ${format.toUpperCase()}.
    
    If JSON: Output a valid JSON object with keys like "subject", "setting", "lighting", "style", "camera", "mood", and "full_prompt".
    If TOML: Output valid TOML format with similar keys.
    If TXT/Natural: Output plain text, optionally using markdown sections or block codes if it helps structure the prompt.
    
    The output should be highly detailed, aiming for 2600+ characters of rich, descriptive text to maximize the creative potential of the image generation model. Do not include conversational filler outside of the requested format.`;

    if (useSearch) {
        systemInstruction += " Use Google Search to verify and enrich specific details about the subjects or concepts mentioned.";
    }

    const userPrompt = `ORIGINAL PROMPT:\n"""\n${prompt}\n"""\n\nREFINEMENT INSTRUCTIONS:\n"""\n${instructions}\n"""\n\nFORMAT REQUIRED: ${format.toUpperCase()}`;

    const modelToUse = useDeepThink ? 'gemini-3.1-pro-preview' : 'gemini-3.8-flash';

    const config: any = {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 2048 },
        maxOutputTokens: 8192,
    };

    if (useSearch) {
        config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
        model: modelToUse,
        contents: userPrompt,
        config: config
    });

    return { prompt: response.text || '', modelUsed: modelToUse + (useSearch ? ' (G-Search)' : '') };
};

export const generateInspirationalPrompt = async (baseModel: string = 'gemini-3.8-flash'): Promise<{prompt: string, modelUsed: string}> => {
    const response = await ai.models.generateContent({
        model: baseModel,
        contents: "Based on current trending digital art on platforms like ArtStation, create one inspiring and detailed AI art prompt. The prompt should be ready to use in a text-to-image model. Be creative and describe a full, visually striking scene. Exclude generic fluff words like 'breathtaking', 'masterpiece', or 'octane render'. Use high-impact, technical rendering and stylistic terminology instead (e.g., 'path-traced', 'volumetric lighting', 'impasto', 'chiaroscuro'). Only output the prompt itself, with no conversational text.",
        config: {
            tools: [{googleSearch: {}}],
        },
    });
    
    return { prompt: response.text || '', modelUsed: baseModel };
};


export const generateImageFromPrompt = async (prompt: string, aspectRatio: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: aspectRatio,
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
    }
    
    throw new Error("Image generation failed to produce an image.");
};

export const editImage = async (base64ImageData: string, mimeType: string, newPrompt: string): Promise<{ newImageBase64: string | null, textResponse: string | null }> => {
    const imagePart = {
      inlineData: {
        data: base64ImageData,
        mimeType: mimeType,
      },
    };
    const textPart = { text: newPrompt };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          imagePart,
          textPart,
        ],
      },
      config: {
          systemInstruction: "You are an image editing AI. You will be given an image and a user request for changes. Your task is to return the edited image. You should also return a new, complete art prompt that reflects the changes you made to the image. Exclude generic fluff words like 'breathtaking', 'masterpiece', or 'octane render'. Use high-impact, technical rendering and stylistic terminology instead (e.g., 'path-traced', 'volumetric lighting', 'impasto', 'chiaroscuro'). Return *only* the new prompt in the text part of your response. Do not add any conversational text or markdown.",
          responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let newImageBase64: string | null = null;
    let textResponse: string | null = null;

    if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
                textResponse = part.text.trim();
            } else if (part.inlineData) {
                newImageBase64 = part.inlineData.data;
            }
        }
    }
    
    if (!newImageBase64) {
        textResponse = textResponse || "Image editing failed to produce a new image. The model may not have understood the request.";
    }
    
    return { newImageBase64, textResponse };
};

export const createChatSession = (): Chat => {
    return ai.chats.create({
        model: 'gemini-3.8-flash',
        config: {
            systemInstruction: "You are a prompt refinement AI. You will be given a main prompt to work on, and a user request for changes. Your task is to rewrite and return *only* the new, complete prompt that incorporates the user's request. Exclude generic fluff words like 'breathtaking', 'masterpiece', or 'octane render'. Use high-impact, technical rendering and stylistic terminology instead (e.g., 'path-traced', 'volumetric lighting', 'impasto', 'chiaroscuro'). Do not add any conversational text, introductions, or markdown formatting. Just output the modified prompt, which should be under 4600 characters.",
        },
    });
};
