
export interface HistoryItem {
  id: string;
  imagePreviewUrl: string; // Data URL for the image
  prompt: string; // This will be the final prompt
  timestamp: number;
  originalIdea?: string; // From the text box

  // Enhancement details
  preEnhancementPrompt?: string;
  styleUsed?: string | string[];
  styleNamesUsed?: string[];
  personaUsed?: string;
  enhancementLevel?: EnhancementLevel;
  secondPassFormat?: OutputFormat;
  modelUsed?: string;

  // Inspiration flag
  wasInspired?: boolean;
}


export interface ChatMessage {
  id:string;
  role: 'user' | 'model';
  text: string;
  timestamp?: number;
  basePromptContext?: string;
}

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:3' | '3:4';

export type EnhancementLevel = 1 | 2 | 3;

export type OutputFormat = 'json' | 'txt' | 'toml' | 'natural';

export interface ArtStyle {
  name: string;
  value: string;
}

export interface Persona {
  name: string;
  description: string;
  instruction: string;
}
