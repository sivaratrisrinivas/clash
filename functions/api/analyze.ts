import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {

  if (!env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "API Key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Parse multipart/form-data
    const formData = await request.formData();
    const question = formData.get("question") as string;
    
    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get all files from form data
    const files: Array<{ data: ArrayBuffer; mimeType: string }> = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const arrayBuffer = await value.arrayBuffer();
        files.push({
          data: arrayBuffer,
          mimeType: value.type || "application/pdf",
        });
      }
    }

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "No files uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    // Convert files to base64 for Gemini API
    const fileParts = files.map((file) => {
      // Convert ArrayBuffer to base64
      const bytes = new Uint8Array(file.data);
      const binary = String.fromCharCode(...bytes);
      const base64 = btoa(binary);
      
      return {
        inlineData: {
          data: base64,
          mimeType: file.mimeType,
        },
      };
    });

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

    return new Response(JSON.stringify({
      question,
      conflicts: data.conflicts || [],
      explanation: data.explanation || "Could not generate explanation.",
      recommendation: data.recommendation || "No recommendation available.",
      timestamp: Date.now()
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to analyze documents. Ensure files are valid and API key is correct.",
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

