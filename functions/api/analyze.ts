// DIAGNOSTIC VERSION - Find exactly what crashes

export async function onRequestPost(context: { request: Request; env: { GEMINI_API_KEY: string } }) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  const diag: string[] = ["Step 0: Function loaded"];

  try {
    // Step 1: Check env
    diag.push(`Step 1: hasApiKey=${!!context.env.GEMINI_API_KEY}`);

    // Step 2: Parse formData
    let formData: FormData;
    try {
      formData = await context.request.formData();
      diag.push("Step 2: formData parsed");
    } catch (e: any) {
      diag.push(`Step 2 FAILED: ${e.message}`);
      return new Response(JSON.stringify({ question: "", conflicts: [], explanation: diag.join("\n"), recommendation: "", timestamp: Date.now() }), { status: 200, headers });
    }

    // Step 3: Get question
    const question = formData.get("question") as string || "no question";
    diag.push(`Step 3: question="${question.slice(0, 30)}..."`);

    // Step 4: Count files
    let fileCount = 0;
    const entries = Array.from(formData.entries());
    for (const [key] of entries) {
      if (key.startsWith("file_")) fileCount++;
    }
    diag.push(`Step 4: fileCount=${fileCount}`);

    // Step 5: Get first file info (without reading content)
    const file0 = formData.get("file_0");
    if (file0 && file0 instanceof File) {
      diag.push(`Step 5: file0 name=${file0.name}, size=${file0.size}, type=${file0.type}`);
    } else {
      diag.push(`Step 5: file0 not found or not File instance`);
    }

    // Step 6: Try to read file content
    if (file0 && file0 instanceof File) {
      try {
        const buffer = await file0.arrayBuffer();
        diag.push(`Step 6: arrayBuffer size=${buffer.byteLength}`);
        
        // Step 7: Convert small portion to base64
        const bytes = new Uint8Array(buffer);
        const testSize = Math.min(100, bytes.length);
        let testBinary = "";
        for (let i = 0; i < testSize; i++) {
          testBinary += String.fromCharCode(bytes[i]);
        }
        const testBase64 = btoa(testBinary);
        diag.push(`Step 7: base64 test (first 100 bytes) length=${testBase64.length}`);
        
        // Step 8: Convert full file
        let fullBinary = "";
        for (let i = 0; i < bytes.length; i++) {
          fullBinary += String.fromCharCode(bytes[i]);
        }
        const fullBase64 = btoa(fullBinary);
        diag.push(`Step 8: full base64 length=${fullBase64.length}`);
        
      } catch (e: any) {
        diag.push(`Step 6-8 FAILED: ${e.message}`);
      }
    }

    // Return diagnostic info
    return new Response(JSON.stringify({
      question,
      conflicts: [],
      explanation: diag.join("\n"),
      recommendation: "Diagnostic complete",
      timestamp: Date.now()
    }), { status: 200, headers });

  } catch (err: any) {
    diag.push(`CAUGHT ERROR: ${err.message}`);
    return new Response(JSON.stringify({
      question: "",
      conflicts: [],
      explanation: diag.join("\n"),
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
