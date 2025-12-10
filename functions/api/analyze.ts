// CLASH: Document Conflict Analyzer - Full Version

export async function onRequestPost(context: { request: Request; env: { GEMINI_API_KEY: string } }) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    if (!context.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ 
        question: "",
        conflicts: [],
        explanation: "API key not configured. Please set GEMINI_API_KEY in Cloudflare dashboard.",
        recommendation: "",
        timestamp: Date.now()
      }), { status: 200, headers });
    }

    const formData = await context.request.formData();
    const question = formData.get("question") as string;
    
    if (!question) {
      return new Response(JSON.stringify({ 
        question: "",
        conflicts: [],
        explanation: "No question provided.",
        recommendation: "",
        timestamp: Date.now()
      }), { status: 200, headers });
    }

    // Collect all files
    const fileParts: { inline_data: { mime_type: string; data: string } }[] = [];
    const fileNames: string[] = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const buffer = await value.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // Safe byte-by-byte base64 conversion
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
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
      return new Response(JSON.stringify({ 
        question,
        conflicts: [],
        explanation: "No files were uploaded.",
        recommendation: "",
        timestamp: Date.now()
      }), { status: 200, headers });
    }

    // Build prompt
    const prompt = `You are a senior investment analyst comparing documents.

QUESTION: "${question}"
DOCUMENTS: ${fileNames.join(", ")}

TASK:
1. EXTRACT data points related to the question from each document
2. COMPARE and identify conflicts (values differing >10% or contradictions)
3. EXPLAIN why differences exist
4. RECOMMEND which source to trust

Return ONLY valid JSON (no markdown):
{"conflicts":[{"value":"string","source":"string","context":"string","confidence":"High|Medium|Low"}],"explanation":"string","recommendation":"string"}`;

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
          contents: [{ parts: [...fileParts, { text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ 
        question,
        conflicts: [],
        explanation: `Gemini API error (${res.status}): ${errText.slice(0, 200)}`,
        recommendation: "",
        timestamp: Date.now()
      }), { status: 200, headers });
    }

    const data = await res.json() as any;
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean markdown wrappers
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
      explanation: parsed.explanation || "",
      recommendation: parsed.recommendation || "",
      timestamp: Date.now(),
    }), { status: 200, headers });

  } catch (err: any) {
    return new Response(JSON.stringify({ 
      question: "",
      conflicts: [],
      explanation: `Error: ${err.message}`,
      recommendation: "",
      timestamp: Date.now()
    }), { status: 200, headers });
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
