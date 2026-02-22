import { GoogleGenAI } from "@google/genai";

export async function generateLotusImage() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: 'A breathtakingly beautiful, single pink lotus flower in full bloom, no buds, ultra-detailed, ethereal Buddha light halo above, minimalist zen style, soft cinematic lighting, deep black background, high quality, buddhist aesthetic, spiritual and peaceful.',
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.warn("Lotus image generation skipped due to quota or network issue. Using fallback SVG.", error);
    return null;
  }
}
