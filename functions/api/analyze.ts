// CLASH: Document Conflict Analyzer
// Processes multiple documents, extracts data, detects conflicts

const DEBUG_URL = 'http://127.0.0.1:7242/ingest/36b80274-733d-46c3-a772-9437898d6953';

export async function onRequestPost(context: { request: Request; env: { GEMINI_API_KEY: string } }) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  // #region agent log
  fetch(DEBUG_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'analyze.ts:13',message:'Function started',data:{hasEnv:!!context.env},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  try {
    if (!context.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500, headers });
    }

    // #region agent log
    fetch(DEBUG_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'analyze.ts:22',message:'API key present',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    const formData = await context.request.formData();
    const question = formData.get("question") as string;
    if (!question) {
      return new Response(JSON.stringify({ error: "Missing question" }), { status: 400, headers });
    }

    // #region agent log
    fetch(DEBUG_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'analyze.ts:32',message:'FormData parsed',data:{question:question.slice(0,50)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Process ALL files
    const fileParts: { inline_data: { mime_type: string; data: string } }[] = [];
    const fileNames: string[] = [];
    let fileIndex = 0;

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        // #region agent log
        fetch(DEBUG_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'analyze.ts:43',message:'Processing file',data:{key,name:value.name,size:value.size,fileIndex},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        const buffer = await value.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // #region agent log
        fetch(DEBUG_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'analyze.ts:50',message:'Starting base64 conversion',data:{byteLength:bytes.byteLength,fileIndex},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        // SAFE base64 conversion - no apply(), no Array.from()
        // Uses TextDecoder approach for Workers compatibility
        let base64Data: string;
        try {
          // Try using built-in btoa with manual binary string (safest for Workers)
          const binaryChunks: string[] = [];
          const chunkSize = 1024; // Small chunks, safe iteration
          for (let i = 0; i < bytes.length; i += chunkSize) {
            let chunkStr = '';
            const end = Math.min(i + chunkSize, bytes.length);
            for (let j = i; j < end; j++) {
              chunkStr += String.fromCharCode(bytes[j]);
            }
            binaryChunks.push(chunkStr);
          }
          base64Data = btoa(binaryChunks.join(''));
        } catch (e: any) {
          // #region agent log
          fetch(DEBUG_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'analyze.ts:70',message:'Base64 conversion FAILED',data:{error:e.message,fileIndex},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          throw new Error(`Base64 conversion failed for file ${fileIndex}: ${e.message}`);
        }

        // #region agent log
        fetch(DEBUG_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'analyze.ts:77',message:'Base64 conversion done',data:{base64Length:base64Data.length,fileIndex},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        fileParts.push({
          inline_data: {
            mime_type: value.type || "application/pdf",
            data: base64Data,
          },
        });
        fileNames.push(value.name);
        fileIndex++;
      }
    }

    if (fileParts.length === 0) {
      return new Response(JSON.stringify({ error: "No files uploaded" }), { status: 400, headers });
    }

    // #region agent log
    fetch(DEBUG_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'analyze.ts:84',message:'All files processed',data:{fileCount:fileParts.length,fileNames},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

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

    // #region agent log
    fetch(DEBUG_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'analyze.ts:118',message:'Calling Gemini API',data:{promptLength:prompt.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

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

    // #region agent log
    fetch(DEBUG_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'analyze.ts:142',message:'Gemini response received',data:{status:geminiRes.status,ok:geminiRes.ok},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

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

    // #region agent log
    fetch(DEBUG_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'analyze.ts:173',message:'Success - returning response',data:{conflictCount:parsed.conflicts?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    return new Response(JSON.stringify({
      question,
      conflicts: parsed.conflicts || [],
      explanation: parsed.explanation || "",
      recommendation: parsed.recommendation || "",
      timestamp: Date.now(),
    }), { status: 200, headers });

  } catch (err: any) {
    // #region agent log
    fetch(DEBUG_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'analyze.ts:187',message:'CAUGHT ERROR',data:{error:err.message,stack:err.stack?.slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

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
