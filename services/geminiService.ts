import { AnalysisResult, UploadedFile } from "../types";

// Helper to read file as Base64
const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g. "data:application/pdf;base64,")
      const base64Data = result.split(',')[1];
      resolve({
        data: base64Data,
        mimeType: file.type,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeDocuments = async (
  files: UploadedFile[],
  question: string
): Promise<AnalysisResult> => {
  // Prepare file parts for API
  const fileParts = await Promise.all(files.map(f => fileToBase64(f.file)));

  // Call Vercel API route (or local dev server)
  const apiUrl = import.meta.env.DEV 
    ? '/api/analyze' 
    : '/api/analyze';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: fileParts,
        question,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze documents');
    }

    const data = await response.json();
    return data as AnalysisResult;
  } catch (error: any) {
    console.error("Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze documents. Please try again.");
  }
};