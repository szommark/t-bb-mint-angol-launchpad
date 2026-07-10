import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: "Return a single English placement test question.",
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        answerIndex: { type: Type.INTEGER },
        explanation: { type: Type.STRING },
      },
      required: ["question", "options", "answerIndex", "explanation"],
    },
  },
});

console.log("TEXT:", response.text);
