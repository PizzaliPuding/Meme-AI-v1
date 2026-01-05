
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const extractBase64 = (dataUrl: string) => {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : dataUrl;
};

export const getMagicCaptions = async (base64Image: string): Promise<string[]> => {
  const ai = getAI();
  const data = extractBase64(base64Image);
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data, mimeType: 'image/jpeg' } },
        { text: 'Analyze this image and provide 5 funny, clever meme captions that are highly relevant to the context. Keep them short and punchy. Return as a JSON array of strings.' }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Failed to parse captions", e);
    return ["When the code works on the first try", "Me waiting for the server to restart", "POV: You forgot to commit", "Is this a feature or a bug?", "My brain at 3 AM"];
  }
};

export const analyzeImageDeep = async (base64Image: string) => {
  const ai = getAI();
  const data = extractBase64(base64Image);

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { data, mimeType: 'image/jpeg' } },
        { text: 'Provide a detailed technical and artistic analysis of this image. Describe what is happening, the mood, the lighting, and the potential cultural relevance. Return as JSON.' }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          vibe: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['description', 'vibe', 'tags']
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const editImageAI = async (base64Image: string, prompt: string): Promise<string | null> => {
  const ai = getAI();
  const data = extractBase64(base64Image);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data, mimeType: 'image/jpeg' } },
        { text: prompt }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  return null;
};
