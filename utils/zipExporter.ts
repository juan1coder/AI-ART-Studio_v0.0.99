import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { HistoryItem, ArtStyle, Persona } from '../types';

export const exportAllToZip = async (
  history: HistoryItem[],
  customStyles: ArtStyle[],
  customPersonas: Persona[]
) => {
  const zip = new JSZip();

  // 1. Prompt History
  if (history.length > 0) {
    // Generate JSON
    zip.file("prompt_history.json", JSON.stringify(history, null, 2));

    // Generate Text
    const textContent = history.map(item => {
        let entry = `Timestamp: ${new Date(item.timestamp).toLocaleString()}\n`;
        if (item.wasInspired) entry += `source: AI Inspiration\n`;
        else if (item.originalIdea) entry += `userIdea: ${item.originalIdea}\n`;
        else if (item.imagePreviewUrl) entry += `source: From Image\n`;

        if (item.preEnhancementPrompt) entry += `basePrompt: ${item.preEnhancementPrompt}\n`;
        if (item.styleUsed) entry += `style: ${Array.isArray(item.styleUsed) ? item.styleUsed.join(', ') : item.styleUsed}\n`;
        if (item.personaUsed) entry += `persona: ${item.personaUsed}\n`;
        if (item.enhancementLevel) entry += `level: ${item.enhancementLevel}\n`;
        if (item.secondPassFormat) entry += `secondPassFormat: ${item.secondPassFormat}\n`;
        if (item.modelUsed) entry += `modelUsed: ${item.modelUsed}\n`;
        entry += `finalEmbellishedIdea: ${item.prompt}\n\n---\n\n`;
        return entry;
    }).join('');
    zip.file("prompt_history.txt", textContent);
  }

  // 2. Custom Styles
  if (customStyles.length > 0) {
    zip.file("custom_styles.json", JSON.stringify(customStyles, null, 2));
  }

  // 3. Custom Personas
  if (customPersonas.length > 0) {
    zip.file("custom_personas.json", JSON.stringify(customPersonas, null, 2));
  }

  // 4. Generate the zip and trigger download
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `prompt_studio_export_${Date.now()}.zip`);
};
