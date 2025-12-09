import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, UploadedFile } from "../types";

// Helper to read file as Base64
const fileToPart = (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g. "data:application/pdf;base64,")
      const base64Data = result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeDocuments = async (
  files: UploadedFile[],
  question: string
): Promise<AnalysisResult> => {
  
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Prepare file parts
  const fileParts = await Promise.all(files.map(f => fileToPart(f.file)));

  // 2. Define schema for structured output
  // note: SchemaType is deprecated, using Type instead.
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

  // 3. Construct the prompt
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [...fileParts, { text: promptText }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Low temperature for high factual accuracy
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);

    return {
      question,
      conflicts: data.conflicts || [],
      explanation: data.explanation || "Could not generate explanation.",
      recommendation: data.recommendation || "No recommendation available.",
      timestamp: Date.now()
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze documents. Ensure files are valid and API key is correct.");
  }
};