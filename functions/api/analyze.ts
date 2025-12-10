// Minimal test function to diagnose 503 errors
export async function onRequestPost(context: { request: Request; env: { GEMINI_API_KEY: string } }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    // Step 1: Check if function loads at all
    const step1 = "Function loaded";

    // Step 2: Check env
    const hasKey = !!context.env.GEMINI_API_KEY;
    if (!hasKey) {
      return new Response(JSON.stringify({ error: "No API key", step: 2 }), { status: 500, headers: corsHeaders });
    }

    // Step 3: Parse request
    const formData = await context.request.formData();
    const question = formData.get("question") as string;
    if (!question) {
      return new Response(JSON.stringify({ error: "No question", step: 3 }), { status: 400, headers: corsHeaders });
    }

    // Step 4: Get files
    const files: { name: string; size: number; type: string }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        files.push({ name: value.name, size: value.size, type: value.type });
      }
    }
    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "No files", step: 4 }), { status: 400, headers: corsHeaders });
    }

    // Step 5: Convert first file to base64 (Optimized)
    const firstFile = formData.get("file_0") as File;
    const buffer = await firstFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    let binary = "";
    const len = bytes.byteLength;
    const chunkSize = 32768; // 32KB chunks to avoid stack overflow
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      // Apply arguments limit requires chunking
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64 = btoa(binary);

    // Step 6: Call Gemini
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
              { inline_data: { mime_type: firstFile.type || "text/plain", data: base64 } },
              { text: `Answer briefly: ${question}. Return JSON: {"conflicts":[],"explanation":"","recommendation":""}` }
            ]
          }]
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(JSON.stringify({ error: "Gemini failed", status: geminiRes.status, details: errText.slice(0, 300) }), { status: 502, headers: corsHeaders });
    }

    const geminiData = await geminiRes.json() as any;
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    // Try parse JSON
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { conflicts: [], explanation: text, recommendation: "" };
    }

    return new Response(JSON.stringify({
      question,
      conflicts: parsed.conflicts || [],
      explanation: parsed.explanation || text,
      recommendation: parsed.recommendation || "",
      timestamp: Date.now(),
    }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack?.slice(0, 300) }), { status: 500, headers: corsHeaders });
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
