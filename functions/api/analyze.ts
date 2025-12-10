// CLASH: Document Conflict Analyzer
// Processes multiple documents, extracts data, detects conflicts

export async function onRequestPost(context: { request: Request; env: { GEMINI_API_KEY: string } }) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    if (!context.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500, headers });
    }

    const formData = await context.request.formData();
    const question = formData.get("question") as string;
    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), { status: 400, headers });
    }

    // Process ALL files
    const fileParts: { inline_data: { mime_type: string; data: string } }[] = [];
    const fileNames: string[] = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const buffer = await value.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // Optimized base64 conversion
        let binary = "";
        const len = bytes.byteLength;
        const chunkSize = 32768;
        for (let i = 0; i < len; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        
        fileParts.push({
          inline_data: {
            mime_type: value.type || "application/pdf",
            data: btoa(binary),
          },
        });
        fileNames.push(value.name);
      }
    }

    if (fileParts.length === 0) {
      return new Response(JSON.stringify({ error: "No files uploaded" }), { status: 400, headers });
    }

    // Comprehensive prompt for conflict detection
    const prompt = `You are a senior investment analyst comparing multiple documents.

QUESTION: "${question}"

DOCUMENTS: ${fileNames.join(", ")}

TASK:
1. EXTRACT: Find all specific data points related to the question from EACH document
2. NORMALIZE: Convert all values to standard units (billions USD, percentages)
3. COMPARE: Identify conflicts where values differ by >10% or statements contradict
4. EXPLAIN: Why do conflicts exist? (methodology, timeframe, scope, definitions)
5. RECOMMEND: Which source is most reliable and why

RESPOND WITH PURE JSON (no markdown, no code blocks):
{
  "conflicts": [
    {
      "value": "The specific number or fact (e.g., '$196.63 billion')",
      "source": "Document name",
      "context": "Exact quote with page if available",
      "confidence": "High, Medium, or Low"
    }
  ],
  "explanation": "Clear explanation of WHY the values differ",
  "recommendation": "Which value to trust and why"
}

If no conflicts found, still list all extracted values in conflicts array.
Be specific with numbers. Cite sources.`;

    // Call Gemini with ALL documents
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": context.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [...fileParts, { text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
          }
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(JSON.stringify({ 
        error: "Gemini API error", 
        status: geminiRes.status,
        details: errText.slice(0, 500) 
      }), { status: 502, headers });
    }

    const geminiData = await geminiRes.json() as any;
    let text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean markdown code blocks if present
    text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // If JSON parsing fails, return raw text as explanation
      parsed = {
        conflicts: [],
        explanation: text,
        recommendation: "Could not parse structured response"
      };
    }

    return new Response(JSON.stringify({
      question,
      conflicts: parsed.conflicts || [],
      explanation: parsed.explanation || "",
      recommendation: parsed.recommendation || "",
      timestamp: Date.now(),
    }), { status: 200, headers });

  } catch (err: any) {
    return new Response(JSON.stringify({ 
      error: err.message,
      stack: err.stack?.slice(0, 300) 
    }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
