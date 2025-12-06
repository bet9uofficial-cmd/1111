import { AIAnalysis } from "../types";

// Note: We use dynamic import for @google/genai inside the function
// to prevent any initialization errors during the app load phase.

export const generateFortune = async (amount: number, totalAmount: number): Promise<AIAnalysis> => {
  try {
    // 1. Safe API Key Retrieval
    // We try multiple common ways environment variables are stored in frontend build tools.
    let apiKey: string | undefined = undefined;

    // Check for Vite env vars (import.meta.env)
    // Using try-catch to avoid syntax errors in older environments
    try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
        // @ts-ignore
        apiKey = import.meta.env.VITE_API_KEY;
      }
    } catch (e) { /* ignore reference errors */ }

    // Check for standard Node/Webpack env vars (process.env)
    if (!apiKey) {
      try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
          apiKey = process.env.API_KEY;
        }
      } catch (e) { /* ignore reference errors */ }
    }

    // 2. Guard Clause: If no key, return fallback immediately.
    // This prevents the GoogleGenAI constructor from ever being called with undefined.
    if (!apiKey) {
      console.warn("API_KEY is missing. Returning offline fortune.");
      return {
        message: "May wealth and prosperity come to you!",
        luckLevel: "Good Fortune"
      };
    }

    // 3. Dynamic Import & Initialization
    // Only import the SDK if we have a key and are ready to make a request.
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    // 4. Prepare Prompt
    const isBigWin = amount > (totalAmount / 3);
    const context = isBigWin 
      ? "The user won a huge amount of money in a Red Packet game!" 
      : "The user won a small, humble amount in a Red Packet game.";

    const prompt = `
      Context: ${context}
      Amount won: $${amount}.
      Task: Generate a very short, witty, and festive fortune cookie style message (max 1 sentence) for this user.
      Also assign a "Luck Level" (e.g., "Super Lucky", "Modest Luck", "Future Rich").
      
      Return valid JSON only:
      {
        "message": "The fortune message",
        "luckLevel": "The luck level string"
      }
    `;

    // 5. Call AI
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AIAnalysis;

  } catch (error) {
    console.error("Gemini Error:", error);
    // Fallback if AI fails or key is invalid during request
    return {
      message: "May wealth and prosperity come to you!",
      luckLevel: "Prosperous"
    };
  }
};