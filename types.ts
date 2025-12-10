export enum AppState {
  LANDING = 'LANDING',
  UPLOADING = 'UPLOADING',
  QUESTION = 'QUESTION',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS'
}

// Each answer extracted from a document
export interface Answer {
  value: string;
  source: string;      // filename
  page?: number;       // page number if found
  quote?: string;      // exact quote from document
  confidence: 'High' | 'Medium' | 'Low';
}

// Legacy type for compatibility
export interface ConflictItem {
  value: string;
  source: string;
  context: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface AnalysisResult {
  question: string;
  answers: Answer[];           // All answers from all documents
  hasConflict: boolean;        // True if values differ >10%
  explanation: string;         // AI explanation (only meaningful if hasConflict)
  recommendation: string;      // Which value to trust
  timestamp: number;
  // Legacy field for compatibility
  conflicts?: ConflictItem[];
}

export interface UploadedFile {
  file: File;
  id: string;
  base64?: string;
}
