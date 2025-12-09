import React, { useState, useEffect } from 'react';
import { AppState, UploadedFile, AnalysisResult } from './types';
import { UploadStep } from './components/UploadStep';
import { QuestionStep } from './components/QuestionStep';
import { ProcessingStep } from './components/ProcessingStep';
import { ResultsStep } from './components/ResultsStep';
import { analyzeDocuments } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.UPLOADING); // Start immediately
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [question, setQuestion] = useState<string>('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async (q: string) => {
    setQuestion(q);
    setState(AppState.PROCESSING);

    try {
      const result = await analyzeDocuments(files, q);
      setResult(result);
      setState(AppState.RESULTS);
    } catch (error) {
      alert("Analysis interruption. Please retry.");
      setState(AppState.QUESTION);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setQuestion('');
    setResult(null);
    setState(AppState.UPLOADING);
  };

  const handleAnalyzeAnother = () => {
    setQuestion('');
    setResult(null);
    setState(AppState.QUESTION);
  };

  return (
    <div className="min-h-screen flex flex-col items-center selection:bg-gray-200 selection:text-black dark:selection:bg-gray-800 dark:selection:text-white transition-colors duration-500">
      
      {/* Brand Watermark - Top Left */}
      <div 
        className="fixed top-8 left-8 z-50 cursor-pointer opacity-40 hover:opacity-100 transition-opacity" 
        onClick={() => window.location.href = '/'}
      >
        <span className="font-bold text-xs tracking-[0.2em] text-black dark:text-white transition-colors duration-500">CLASH</span>
      </div>

      {/* Main Stage */}
      <main className="flex-grow w-full max-w-5xl px-6 flex items-center justify-center py-20">
        
        {state === AppState.UPLOADING && (
          <UploadStep 
            files={files} 
            onFilesChange={setFiles} 
            onContinue={() => setState(AppState.QUESTION)} 
          />
        )}

        {state === AppState.QUESTION && (
          <QuestionStep 
            onAnalyze={handleAnalyze} 
            onBack={() => setState(AppState.UPLOADING)} 
          />
        )}

        {state === AppState.PROCESSING && (
          <ProcessingStep files={files} />
        )}

        {state === AppState.RESULTS && result && (
          <ResultsStep 
            result={result} 
            onReset={handleReset} 
            onAnalyzeAnother={handleAnalyzeAnother}
          />
        )}
      </main>
    </div>
  );
};

export default App;