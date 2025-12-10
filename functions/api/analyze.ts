export async function onRequestPost(context: { request: Request; env: { GEMINI_API_KEY: string } }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    // 1. Validate Env
    if (!context.env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "No API Key" }), { status: 500, headers: corsHeaders });
    }

    // 2. Parse Form Data
    const formData = await context.request.formData();
    const question = formData.get("question") as string;
    if (!question) return new Response(JSON.stringify({ error: "No question" }), { status: 400, headers: corsHeaders });

    const contentParts: any[] = [];
    
    // 3. Process & Upload Each File
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        try {
          // Upload to Gemini Files API
          // This avoids loading the Base64 string into memory
          const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${context.env.GEMINI_API_KEY}`;
          
          // Step A: Start Resumable Upload
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

          const uploadUrlHeader = initRes.headers.get("x-goog-upload-url");
          if (!uploadUrlHeader) throw new Error("Failed to get upload URL");

          // Step B: Upload Actual Bytes
          // We pass the File object directly; fetch handles streaming
          const uploadRes = await fetch(uploadUrlHeader, {
            method: "POST",
            headers: {
              "X-Goog-Upload-Command": "upload, finalize",
              "X-Goog-Upload-Offset": "0",
              "Content-Type": value.type || "application/pdf"
            },
            body: value
          });

          const fileInfo = await uploadRes.json() as any;
          const fileUri = fileInfo.file.uri;

          // Check state (wait for processing if needed)
          let state = fileInfo.file.state;
          while (state === "PROCESSING") {
             await new Promise(r => setTimeout(r, 1000));
             const statusRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileInfo.file.name.split('/').pop()}?key=${context.env.GEMINI_API_KEY}`);
             const statusData = await statusRes.json() as any;
             state = statusData.state;
             if (state === "FAILED") throw new Error("File processing failed");
          }

          // Add to parts list as a reference (file_data) instead of inline_data
          contentParts.push({
            file_data: {
              mime_type: value.type || "application/pdf",
              file_uri: fileUri
            }
          });

        } catch (e: any) {
          console.error(`Upload failed for ${value.name}: ${e.message}`);
        }
      }
    }

    if (contentParts.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to upload any files" }), { status: 500, headers: corsHeaders });
    }

    // 4. Call Gemini with File References (Lightweight!)
    const prompt = `You are a senior investment analyst.
QUESTION: "${question}"
TASK: Compare the attached documents. Extract data, normalize units, find conflicts (>10% diff), and recommend the most reliable source.
Return STRICT JSON: { "conflicts": [{"value":"", "source":"", "context":"", "confidence":""}], "explanation":"", "recommendation":"" }`;

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", // Use 2.5 Flash (stable)
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

    // 5. Handle Response
    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return new Response(JSON.stringify({ error: "Gemini Error", details: err }), { status: 502, headers: corsHeaders });
    }

    const data = await geminiRes.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean and Parse
    const cleanJson = text.replace(/```json|```/g, '').trim();
    let result;
    try {
        result = JSON.parse(cleanJson);
    } catch {
        result = { conflicts: [], explanation: text, recommendation: "Could not parse JSON" };
    }

    return new Response(JSON.stringify({
      question,
      ...result,
      timestamp: Date.now()
    }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Server Error", details: err.message }), { status: 500, headers: corsHeaders });
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