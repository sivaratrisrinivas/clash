export async function onRequestPost(context: { request: Request; env: { GEMINI_API_KEY: string } }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    // 1. Validate Environment
    if (!context.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfigured: No API Key" }), { status: 500, headers: corsHeaders });
    }

    // 2. Parse Request
    const formData = await context.request.formData();
    const question = formData.get("question") as string;

    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), { status: 400, headers: corsHeaders });
    }

    // 3. Process Files (Memory Optimized)
    const fileParts: { inline_data: { mime_type: string; data: string } }[] = [];
    const fileNames: string[] = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        try {
          const arrayBuffer = await value.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          
          // Optimization: Use Array.join() instead of string concatenation +=
          // This prevents memory fragmentation which causes 503 errors
          const chunks: string[] = [];
          const chunkSize = 32768; // 32KB
          const len = bytes.byteLength;

          for (let i = 0; i < len; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
            chunks.push(String.fromCharCode(...chunk));
          }
          
          const binaryString = chunks.join("");
          const base64Data = btoa(binaryString);

          fileParts.push({
            inline_data: {
              mime_type: value.type || "application/pdf",
              data: base64Data
            }
          });
          fileNames.push(value.name);
          
        } catch (fileError: any) {
          console.error(`Failed to process file ${key}:`, fileError.message);
        }
      }
    }

    if (fileParts.length === 0) {
      return new Response(JSON.stringify({ error: "No valid files uploaded" }), { status: 400, headers: corsHeaders });
    }

    // 4. Build Prompt
    const documentList = fileNames.join(", ");
    const prompt = `You are a senior investment analyst comparing ${fileParts.length} document(s).

QUESTION: "${question}"

DOCUMENTS: ${documentList}

TASK:
1. EXTRACT: Find all specific data points related to the question from EACH document
2. NORMALIZE: Convert all values to standard units (billions USD, percentages)
3. COMPARE: Identify conflicts where values differ by >10% or statements contradict
4. EXPLAIN: Why do conflicts exist? (methodology, timeframe, scope, definitions)
5. RECOMMEND: Which source is most reliable and why

Return ONLY valid JSON (no markdown, no code blocks):
{
  "conflicts": [
    {
      "value": "The specific number or fact (e.g., '$196.63 billion')",
      "source": "Document filename",
      "context": "Exact quote with page if available",
      "confidence": "High, Medium, or Low"
    }
  ],
  "explanation": "Clear explanation of WHY the values differ",
  "recommendation": "Which value to trust and why"
}

If no conflicts found, still list all extracted values in conflicts array.`;

    // 5. Call Gemini API
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
            parts: [
              ...fileParts,
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
          }
        }),
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      return new Response(JSON.stringify({ error: "Gemini API Error", details: errorText }), { status: 502, headers: corsHeaders });
    }

    const geminiData = await geminiRes.json() as any;
    const textResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // 6. Parse Response
    let parsedResult;
    try {
      const cleanJson = textResponse.replace(/```json|```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (e) {
      parsedResult = { 
        conflicts: [], 
        explanation: "Raw response: " + textResponse, 
        recommendation: "Could not parse AI response." 
      };
    }

    return new Response(JSON.stringify({
      question,
      ...parsedResult,
      timestamp: Date.now()
    }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Worker Error", details: err.message }), { status: 500, headers: corsHeaders });
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