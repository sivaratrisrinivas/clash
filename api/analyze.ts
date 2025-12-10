import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { files, question } = req.body;

  if (!files || !Array.isArray(files) || !question) {
    return res.status(400).json({ error: "Missing files or question" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "API Key not configured" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Convert base64 files to parts
    const fileParts = files.map((f: { data: string; mimeType: string }) => ({
      inlineData: {
        data: f.data,
        mimeType: f.mimeType,
      },
    }));

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        conflicts: {
          type: Type.ARRAY,
          description: "List of conflicting or distinct data points found in the documents.",
          items: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.STRING, description: "The specific number, date, or fact extracted (e.g., '$20B', '15%')." },
              source: { type: Type.STRING, description: "The name of the document or organization source." },
              context: { type: Type.STRING, description: "Exact quote or location context. MUST include Page Number if available (e.g., 'Page 12: Total addressable market...')." },
              confidence: { type: Type.STRING, description: "Perceived reliability: 'High', 'Medium', or 'Low'." }
            },
            required: ["value", "source", "context", "confidence"]
          }
        },
        explanation: {
          type: Type.STRING,
          description: "A clear, human-readable explanation of WHY the numbers/facts differ (e.g., different definitions, dates, methodologies)."
        },
        recommendation: {
          type: Type.STRING,
          description: "A synthesized 'Bottom Line' recommendation on which number is likely most accurate for an investor."
        }
      },
      required: ["conflicts", "explanation", "recommendation"]
    };

    const promptText = `
      You are a senior investment analyst.
      Your task is to answer the user's question: "${question}" by reconciling data across the attached documents.
      
      1. EXTRACT: Find all specific mentions related to the question.
      2. COMPARE: Identify material conflicts (e.g., numbers differing by >10%) or distinct viewpoints.
      3. EXPLAIN: Why do they differ? (Methodology? Date? Scope? Definition?)
      
      Output Format Requirements:
      - Context: You MUST cite the Page Number if the document allows (e.g., "Page 5: ...").
      - Value: Normalize units where possible (e.g., convert all to USD Billions).
      - Recommendation: Give a decisive advice.
      
      Be brutally concise. No fluff.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [...fileParts, { text: promptText }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);

    return res.status(200).json({
      question,
      conflicts: data.conflicts || [],
      explanation: data.explanation || "Could not generate explanation.",
      recommendation: data.recommendation || "No recommendation available.",
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    return res.status(500).json({ 
      error: "Failed to analyze documents. Ensure files are valid and API key is correct.",
      details: error.message 
    });
  }
}

