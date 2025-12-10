// CLASH: Minimum Viable Conflict Analyzer
// Extracts answers from ALL documents, detects conflicts, explains differences

export async function onRequestPost(context: { request: Request; env: { GEMINI_API_KEY: string } }) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    if (!context.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ 
        question: "", answers: [], hasConflict: false, 
        explanation: "API key not configured", recommendation: "", timestamp: Date.now() 
      }), { status: 200, headers });
    }

    const formData = await context.request.formData();
    const question = formData.get("question") as string;
    
    if (!question) {
      return new Response(JSON.stringify({ 
        question: "", answers: [], hasConflict: false,
        explanation: "No question provided", recommendation: "", timestamp: Date.now() 
      }), { status: 200, headers });
    }

    // Collect ALL files
    const files: { name: string; data: string; type: string }[] = [];
    
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const buffer = await value.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // Safe base64 conversion
        let binary = '';
        const chunkSize = 32768;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          binary += String.fromCharCode(...chunk);
        }
        
        files.push({
          name: value.name,
          data: btoa(binary),
          type: value.type || "application/pdf"
        });
      }
    }

    if (files.length === 0) {
      return new Response(JSON.stringify({ 
        question, answers: [], hasConflict: false,
        explanation: "No files uploaded", recommendation: "", timestamp: Date.now() 
      }), { status: 200, headers });
    }

    // Build file parts for Gemini
    const fileParts = files.map(f => ({
      inline_data: { mime_type: f.type, data: f.data }
    }));

    const fileList = files.map(f => f.name).join(", ");

    // EXTRACTION PROMPT - Get answers from ALL documents
    const extractionPrompt = `You are analyzing ${files.length} documents to answer: "${question}"

DOCUMENTS: ${fileList}

TASK: Extract the answer to this question from EACH document.

For EACH document, find:
1. The specific answer (exact value/number/statement)
2. Page number where found (if visible)
3. The exact quote containing the answer

Return ONLY valid JSON (no markdown):
{
  "answers": [
    {
      "value": "The specific answer (e.g., '$20B', '15%', 'Company X')",
      "source": "Filename.pdf",
      "page": 12,
      "quote": "Exact quote from document",
      "confidence": "High"
    }
  ],
  "hasConflict": true or false,
  "explanation": "If hasConflict is true, explain WHY the answers differ (methodology, timeframe, scope). If false, just say 'Values are consistent.'",
  "recommendation": "If hasConflict is true, which value to trust and why. If false, leave empty."
}

CONFLICT DETECTION:
- Numbers differ by >10% = conflict
- Contradictory statements = conflict  
- Different timeframes = conflict
- ~10% variance = normal, no conflict

Be precise. Extract from ALL documents.`;

    // Call Gemini with ALL documents
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": context.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [...fileParts, { text: extractionPrompt }] }],
          generationConfig: { temperature: 0.1 }
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ 
        question, answers: [], hasConflict: false,
        explanation: `API Error: ${errText.slice(0, 200)}`, recommendation: "", timestamp: Date.now() 
      }), { status: 200, headers });
    }

    const data = await res.json() as any;
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean markdown
    text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { 
        answers: [], 
        hasConflict: false,
        explanation: text, 
        recommendation: "" 
      };
    }

    // Ensure answers array exists
    const answers = parsed.answers || [];
    
    // Also populate legacy 'conflicts' field for backward compatibility
    const conflicts = answers.map((a: any) => ({
      value: a.value || "",
      source: a.source || "",
      context: a.quote || "",
      confidence: a.confidence || "Medium"
    }));

    return new Response(JSON.stringify({
      question,
      answers,
      conflicts, // Legacy compatibility
      hasConflict: parsed.hasConflict || false,
      explanation: parsed.explanation || "",
      recommendation: parsed.recommendation || "",
      timestamp: Date.now(),
    }), { status: 200, headers });

  } catch (err: any) {
    return new Response(JSON.stringify({ 
      question: "", answers: [], conflicts: [], hasConflict: false,
      explanation: `Error: ${err.message}`, recommendation: "", timestamp: Date.now() 
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
