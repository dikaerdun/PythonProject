
import { GoogleGenAI, Type } from "@google/genai";
import { MindfulnessTip } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getMindfulnessTip = async (): Promise<MindfulnessTip> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "请用中文生成一条极简、宁静的正念呼吸建议。字数在25字以内。关注当下、呼吸的质感或4Hz脑波频率带来的深度放松感。语气要像一位禅师。",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "建议的简短标题" },
            content: { type: Type.STRING, description: "建议的具体内容" }
          },
          required: ["title", "content"]
        }
      }
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to fetch tip:", error);
    return {
      title: "深呼吸",
      content: "感受空气充满肺部，随每一次呼气带走身体的压力。"
    };
  }
};
