import { GoogleGenAI, Type } from "@google/genai";

// Initialize the client. 
// NOTE: We assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface ParsedEventData {
  title: string;
  location: string;
  startTime?: string;
  description: string;
  activityType: string;
}

export const parseEventFromText = async (text: string): Promise<ParsedEventData | null> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key provided for Gemini.");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Extract event details from the following user text. 
      If a specific date is mentioned (e.g. "next friday"), calculate the ISO string assuming today is ${new Date().toISOString()}.
      If no specific time is given, leave it null.
      
      User text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short, catchy title for the event" },
            location: { type: Type.STRING, description: "The physical location or venue" },
            startTime: { type: Type.STRING, description: "ISO 8601 date string if a time is derived, else null" },
            description: { type: Type.STRING, description: "A friendly description based on the text" },
            activityType: { type: Type.STRING, description: "One word category e.g. Sport, Food, Social, Work" },
          },
          required: ["title", "location", "description", "activityType"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ParsedEventData;
    }
    return null;
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return null;
  }
};
