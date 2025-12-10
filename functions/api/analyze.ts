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
    const file = formData.get("file_0") as File;

    if (!question || !file) {
      return new Response(JSON.stringify({ error: "Missing file or question" }), { status: 400, headers: corsHeaders });
    }

    // 3. SAFE File Conversion (The Fix)
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 32768; // Process in 32KB chunks to prevent stack overflow/memory crash

    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      // Spread operator is safe for 32KB chunks
      binary += String.fromCharCode(...chunk);
    }
    
    const base64Data = btoa(binary);

    // 4. Call Gemini API
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
              { inline_data: { mime_type: file.type || "text/plain", data: base64Data } },
              { text: `Answer briefly: ${question}. Return STRICT JSON: {"conflicts":[{"value":"","source":"","confidence":"High|Medium|Low","context":""}],"explanation":"","recommendation":""}` }
            ]
          }]
        }),
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      return new Response(JSON.stringify({ error: "Gemini API Error", details: errorText }), { status: 502, headers: corsHeaders });
    }

    const geminiData = await geminiRes.json() as any;
    const textResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // 5. Parse AI Response
    let parsedResult;
    try {
      // Clean markdown code blocks if present
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