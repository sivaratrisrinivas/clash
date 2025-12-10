interface Env {
  GEMINI_API_KEY: string;
}

// Helper: ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  if (!env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "API Key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await request.formData();
    const question = formData.get("question") as string;
    
    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get all files from form data
    const fileParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const arrayBuffer = await value.arrayBuffer();
        fileParts.push({
          inlineData: {
            data: arrayBufferToBase64(arrayBuffer),
            mimeType: value.type || "application/pdf",
          },
        });
      }
    }

    if (fileParts.length === 0) {
      return new Response(JSON.stringify({ error: "No files uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const promptText = `You are a senior investment analyst.
Your task is to answer the user's question: "${question}" by reconciling data across the attached documents.

1. EXTRACT: Find all specific mentions related to the question.
2. COMPARE: Identify material conflicts (e.g., numbers differing by >10%) or distinct viewpoints.
3. EXPLAIN: Why do they differ? (Methodology? Date? Scope? Definition?)

Output as JSON with this exact structure:
{
  "conflicts": [
    {
      "value": "The specific number or fact (e.g., '$20B', '15%')",
      "source": "Document or organization name",
      "context": "Quote with page number if available (e.g., 'Page 12: ...')",
      "confidence": "High, Medium, or Low"
    }
  ],
  "explanation": "Why the numbers/facts differ",
  "recommendation": "Which source to trust and why"
}

Be brutally concise. No fluff.`;

    // Call Gemini REST API directly (SDK doesn't work in Workers)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [...fileParts, { text: promptText }]
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API Error:", errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json() as any;
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error("No response from Gemini");
    }

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
    console.error("Analysis Error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to analyze documents.",
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

