// SUPER MINIMAL TEST - Does the function even load?

export async function onRequestPost(context: { request: Request; env: { GEMINI_API_KEY: string } }) {
  // Return IMMEDIATELY to test if function loads at all
  return new Response(JSON.stringify({ 
    test: "Function loaded successfully!",
    hasApiKey: !!context.env.GEMINI_API_KEY,
    timestamp: Date.now()
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
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
