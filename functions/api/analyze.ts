// CLASH: Minimal working version - single file only
// Testing if basic functionality works

export async function onRequestPost(context: { request: Request; env: { GEMINI_API_KEY: string } }) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    // Check API key
    if (!context.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "No API key", step: 1 }), { status: 500, headers });
    }

    // Parse form data
    const formData = await context.request.formData();
    const question = formData.get("question");
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "No question", step: 2 }), { status: 400, headers });
    }

    // Get ONLY file_0 (proven to work)
    const file0 = formData.get("file_0");
    if (!file0 || !(file0 instanceof File)) {
      return new Response(JSON.stringify({ error: "No file_0", step: 3 }), { status: 400, headers });
    }

    // Convert to base64 (simple byte-by-byte)
    const buffer = await file0.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // Call Gemini
    const res = await fetch(
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
              { inline_data: { mime_type: file0.type || "text/plain", data: base64 } },
              { text: `Question: ${question}\n\nAnalyze and return JSON: {"conflicts":[],"explanation":"your analysis","recommendation":""}` }
            ]
          }]
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: "Gemini error", status: res.status, details: err.slice(0, 200) }), { status: 502, headers });
    }

    const data = await res.json() as any;
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

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
    }), { status: 200, headers });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack?.slice(0, 200) }), { status: 500, headers });
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
