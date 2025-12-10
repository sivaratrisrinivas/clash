export enum AppState {
  LANDING = 'LANDING',
  UPLOADING = 'UPLOADING',
  QUESTION = 'QUESTION',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS'
}

export interface ConflictItem {
  value: string;
  source: string;
  context: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface AnalysisResult {
  question: string;
  conflicts: ConflictItem[];
  explanation: string;
  recommendation: string;
  timestamp: number;
}

export interface UploadedFile {
  file: File;
  id: string;
  base64?: string;
}
