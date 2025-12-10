export async function onRequestPost(context: { request: Request; env: { GEMINI_API_KEY: string } }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    // 1. Validate Env
    if (!context.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Server Error: No API Key" }), { status: 500, headers: corsHeaders });
    }

    // 2. Parse Form Data
    // Note: On free tier, parsing 40MB+ might still occasionally hit memory limits.
    // If this fails often, you must upload files one by one.
    let formData;
    try {
        formData = await context.request.formData();
    } catch (e) {
        return new Response(JSON.stringify({ error: "Upload too large for free server. Try fewer files." }), { status: 413, headers: corsHeaders });
    }

    const question = formData.get("question") as string;
    if (!question) return new Response(JSON.stringify({ error: "Missing question" }), { status: 400, headers: corsHeaders });

    const contentParts: any[] = [];
    
    // 3. Process & Upload Each File
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        try {
          // --- A. INITIALIZE UPLOAD ---
          const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${context.env.GEMINI_API_KEY}`;
          
          const initRes = await fetch(uploadUrl, {
            method: "POST",
            headers: {
              "X-Goog-Upload-Protocol": "resumable",
              "X-Goog-Upload-Command": "start",
              "X-Goog-Upload-Header-Content-Length": value.size.toString(),
              "X-Goog-Upload-Header-Content-Type": value.type || "application/pdf",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ file: { display_name: value.name } })
          });

          if (!initRes.ok) throw new Error(`Init failed: ${initRes.statusText}`);
          const uploadUrlHeader = initRes.headers.get("x-goog-upload-url");
          if (!uploadUrlHeader) throw new Error("Failed to get upload URL");

          // --- B. UPLOAD BYTES ---
          const uploadRes = await fetch(uploadUrlHeader, {
            method: "POST",
            headers: {
              "X-Goog-Upload-Command": "upload, finalize",
              "X-Goog-Upload-Offset": "0",
              "Content-Type": value.type || "application/pdf"
            },
            body: value
          });

          if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.statusText}`);
          const fileInfo = await uploadRes.json() as any;
          
          // --- C. WAIT FOR PROCESSING (POLLING) ---
          // Large files take time. We poll less frequently to save CPU.
          let state = fileInfo.file.state;
          let attempts = 0;
          
          // Poll up to 20 seconds (10 attempts * 2s)
          while (state === "PROCESSING" && attempts < 10) {
             await new Promise(r => setTimeout(r, 2000)); // Wait 2s
             
             const statusRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileInfo.file.name.split('/').pop()}?key=${context.env.GEMINI_API_KEY}`);
             const statusData = await statusRes.json() as any;
             
             state = statusData.state;
             if (state === "FAILED") throw new Error("Google failed to process this file.");
             attempts++;
          }

          if (state === "PROCESSING") {
             // If still processing, we skip this file to avoid server timeout
             console.warn(`File ${value.name} is taking too long to process. Skipped.`);
             continue;
          }

          // Add to parts list
          contentParts.push({
            file_data: {
              mime_type: value.type || "application/pdf",
              file_uri: fileInfo.file.uri
            }
          });

        } catch (e: any) {
          console.error(`Error handling ${value.name}:`, e.message);
        }
      }
    }

    if (contentParts.length === 0) {
      return new Response(JSON.stringify({ error: "No files could be processed successfully." }), { status: 500, headers: corsHeaders });
    }

    // 4. Generate Content (Using CORRECT Model)
    const prompt = `You are a senior investment analyst.
QUESTION: "${question}"
TASK: Compare the attached documents. Extract data, normalize units, find conflicts (>10% diff), and recommend the most reliable source.
Return STRICT JSON: { "conflicts": [{"value":"", "source":"", "context":"", "confidence":""}], "explanation":"", "recommendation":"" }`;

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", // CORRECT MODEL
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": context.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              ...contentParts,
              { text: prompt }
            ]
          }]
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return new Response(JSON.stringify({ error: "Gemini API Error", details: err }), { status: 502, headers: corsHeaders });
    }

    const data = await geminiRes.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean and Parse JSON
    const cleanJson = text.replace(/```json|```/g, '').trim();
    let result;
    try {
        result = JSON.parse(cleanJson);
    } catch {
        result = { 
            conflicts: [], 
            explanation: text, 
            recommendation: "Could not parse AI response into strict JSON." 
        };
    }

    return new Response(JSON.stringify({
      question,
      ...result,
      timestamp: Date.now()
    }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Critical Worker Error", details: err.message }), { status: 500, headers: corsHeaders });
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