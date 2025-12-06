import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysis } from "../types";

export const generateFortune = async (amount: number, totalAmount: number): Promise<AIAnalysis> => {
  try {
    // 1. Initialization
    // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
    // Assume this variable is pre-configured, valid, and accessible.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // 2. Prepare Prompt
    const isBigWin = amount > (totalAmount / 3);
    const context = isBigWin 
      ? "The user won a huge amount of money in a Red Packet game!" 
      : "The user won a small, humble amount in a Red Packet game.";

    const prompt = `
      Context: ${context}
      Amount won: $${amount}.
      Task: Generate a very short, witty, and festive fortune cookie style message (max 1 sentence) for this user.
      Also assign a "Luck Level" (e.g., "Super Lucky", "Modest Luck", "Future Rich").
    `;

    // 3. Call AI with strict JSON schema
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
              description: "The fortune message",
            },
            luckLevel: {
              type: Type.STRING,
              description: "The luck level string",
            },
          },
        },
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AIAnalysis;

  } catch (error) {
    console.error("Gemini Error:", error);
    // Fallback if AI fails
    return {
      message: "May wealth and prosperity come to you!",
      luckLevel: "Prosperous"
    };
  }
};