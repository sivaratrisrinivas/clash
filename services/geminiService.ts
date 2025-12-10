import { AnalysisResult, UploadedFile } from "../types";

export const analyzeDocuments = async (
  files: UploadedFile[],
  question: string
): Promise<AnalysisResult> => {
  // Use FormData for efficient file transfer (supports larger files)
  const formData = new FormData();
  formData.append('question', question);
  
  files.forEach((f, index) => {
    formData.append(`file_${index}`, f.file);
  });

  const apiUrl = '/api/analyze';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData, // FormData sets Content-Type automatically with boundary
    });

    if (!response.ok) {
      // Handle 413 Payload Too Large
      if (response.status === 413) {
        throw new Error('File size too large. Max 30MB per file, 50MB total.');
      }
      
      // Try to parse error JSON, fallback to status text
      let errorMessage = 'Failed to analyze documents';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data as AnalysisResult;
  } catch (error: any) {
    console.error("Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze documents. Please try again.");
  }
};