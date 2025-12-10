interface Env {
  GEMINI_API_KEY: string;
}

interface EventContext {
  request: Request;
  env: Env;
}

// Cloudflare Pages Function
export async function onRequestPost(context: EventContext): Promise<Response> {
  const { request, env } = context;
  
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // Check API key first
  if (!env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "API Key not configured", step: "init" }),
      { status: 500, headers }
    );
  }

  try {
    // Step 1: Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e: any) {
      return new Response(
        JSON.stringify({ error: "Failed to parse form data", details: e.message }),
        { status: 400, headers }
      );
    }

    const question = formData.get("question");
    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing question" }),
        { status: 400, headers }
      );
    }

    // Step 2: Extract files
    const fileParts: Array<{ inline_data: { mime_type: string; data: string } }> = [];
    
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        try {
          const buffer = await value.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          
          // Convert to base64 safely
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          
          fileParts.push({
            inline_data: {
              mime_type: value.type || "application/pdf",
              data: base64,
            },
          });
        } catch (e: any) {
          return new Response(
            JSON.stringify({ error: "Failed to process file", file: key, details: e.message }),
            { status: 400, headers }
          );
        }
      }
    }

    if (fileParts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No files uploaded" }),
        { status: 400, headers }
      );
    }

    // Step 3: Build prompt
    const promptText = `You are a senior investment analyst.
Answer the question: "${question}" by analyzing the attached documents.

1. EXTRACT relevant data points from each document
2. COMPARE and identify conflicts (>10% difference)  
3. EXPLAIN why they differ

Return JSON only:
{"conflicts":[{"value":"string","source":"string","context":"string","confidence":"High|Medium|Low"}],"explanation":"string","recommendation":"string"}`;

    // Step 4: Call Gemini API
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    
    const requestBody = {
      contents: [{
        role: "user",
        parts: [...fileParts, { text: promptText }]
      }],
      generationConfig: {
        temperature: 0.1,
      }
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(
        JSON.stringify({ 
          error: "Gemini API error", 
          status: geminiResponse.status,
          details: errorText.slice(0, 500) 
        }),
        { status: 502, headers }
      );
    }

    // Step 5: Parse response
    const geminiData = await geminiResponse.json() as any;
    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return new Response(
        JSON.stringify({ 
          error: "No response from Gemini",
          raw: JSON.stringify(geminiData).slice(0, 500)
        }),
        { status: 502, headers }
      );
    }

    // Step 6: Parse JSON from response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid JSON from Gemini",
          raw: responseText.slice(0, 500)
        }),
        { status: 502, headers }
      );
    }

    // Success
    return new Response(
      JSON.stringify({
        question,
        conflicts: data.conflicts || [],
        explanation: data.explanation || "",
        recommendation: data.recommendation || "",
        timestamp: Date.now(),
      }),
      { status: 200, headers }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        error: "Unexpected error",
        message: error.message,
        stack: error.stack?.slice(0, 500)
      }),
      { status: 500, headers }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
