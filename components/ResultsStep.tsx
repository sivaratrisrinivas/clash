import React from 'react';
import { AlertTriangle, CheckCircle, ArrowLeft, Download, Copy, RotateCcw } from 'lucide-react';
import { AnalysisResult, Answer } from '../types';

interface ResultsStepProps {
  result: AnalysisResult;
  onReset: () => void;
  onAnalyzeAnother: () => void;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({ result, onReset, onAnalyzeAnother }) => {
  
  // Use new 'answers' field if available, fallback to legacy 'conflicts'
  const answers: Answer[] = result.answers || (result.conflicts || []).map(c => ({
    value: c.value,
    source: c.source,
    quote: c.context,
    confidence: c.confidence
  }));

  const hasConflict = result.hasConflict ?? answers.length > 1;

  const handleCopy = () => {
    const text = `Q: ${result.question}\n\n${answers.map(a => `${a.value} ← ${a.source}`).join('\n')}\n\n${hasConflict ? '⚠️ Conflict detected\n\n' : '✓ Consistent\n\n'}${result.explanation}\n\n→ ${result.recommendation}`;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
  };

  const handleDownload = () => {
    const date = new Date().toLocaleDateString();
    const content = `
CLASH ANALYSIS
==============
Date: ${date}

Q: ${result.question}

ANSWERS FROM SOURCES
--------------------
${answers.map(a => `${a.value}  ←  ${a.source}${a.page ? ` (page ${a.page})` : ''}
   "${a.quote || 'No quote available'}"`).join('\n\n')}

${hasConflict ? '⚠️ CONFLICT DETECTED' : '✓ VALUES CONSISTENT'}

${hasConflict ? `WHY THEY DIFFER
----------------
${result.explanation}

RECOMMENDATION
--------------
→ ${result.recommendation}` : ''}
`.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clash-analysis-${date.replace(/\//g, '-')}.txt`;
    link.click();
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-enter">
      
      {/* Navigation */}
      <div className="flex justify-between items-center mb-8 text-sm opacity-60 hover:opacity-100 transition-opacity">
        <button onClick={onAnalyzeAnother} className="flex items-center gap-2 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-4">
          <button onClick={handleDownload} className="flex items-center gap-1 hover:underline">
            <Download className="w-4 h-4" /> Download
          </button>
          <button onClick={handleCopy} className="flex items-center gap-1 hover:underline">
            <Copy className="w-4 h-4" /> Copy
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="border border-[#333] dark:border-[#444] rounded-lg overflow-hidden bg-[#0a0a0a]">
        
        {/* Question Header */}
        <div className="px-6 py-5 border-b border-[#333] dark:border-[#444]">
          <span className="text-xs uppercase tracking-widest text-[#666] mb-2 block">Question</span>
          <h1 className="text-2xl font-medium text-white">{result.question}</h1>
        </div>

        {/* Answers List */}
        <div className="px-6 py-6 space-y-4">
          {answers.map((answer, idx) => (
            <div key={idx} className="flex items-baseline justify-between group">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-semibold text-white">{answer.value}</span>
                <span className="text-[#666]">←</span>
                <span className="text-sm text-[#888]">{answer.source}</span>
                {answer.page && (
                  <span className="text-xs text-[#555]">(p.{answer.page})</span>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                answer.confidence === 'High' ? 'bg-green-900/30 text-green-400' :
                answer.confidence === 'Medium' ? 'bg-yellow-900/30 text-yellow-400' :
                'bg-red-900/30 text-red-400'
              }`}>
                {answer.confidence}
              </span>
            </div>
          ))}
        </div>

        {/* Conflict Indicator */}
        <div className={`px-6 py-4 border-t border-[#333] ${hasConflict ? 'bg-amber-950/20' : 'bg-emerald-950/20'}`}>
          {hasConflict ? (
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">These values conflict</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Values are consistent</span>
            </div>
          )}
        </div>

        {/* Explanation - Only show if there's content */}
        {result.explanation && (
          <div className="px-6 py-5 border-t border-[#333]">
            <span className="text-xs uppercase tracking-widest text-[#666] mb-3 block">
              {hasConflict ? 'Why They Differ' : 'Analysis'}
            </span>
            <p className="text-[#aaa] leading-relaxed">{result.explanation}</p>
          </div>
        )}

        {/* Recommendation - Only show if conflict exists */}
        {hasConflict && result.recommendation && (
          <div className="px-6 py-5 border-t border-[#333] bg-[#111]">
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 text-xl">→</span>
              <p className="text-white font-medium">{result.recommendation}</p>
            </div>
          </div>
        )}
      </div>

      {/* Start Over */}
      <div className="mt-8 text-center">
        <button 
          onClick={onReset}
          className="text-sm text-[#666] hover:text-white transition-colors flex items-center gap-2 mx-auto"
        >
          <RotateCcw className="w-4 h-4" />
          Start Over
        </button>
      </div>
    </div>
  );
};
