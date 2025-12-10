import React from 'react';
import { Share2, ArrowLeft, RefreshCw, Download } from 'lucide-react';
import { AnalysisResult } from '../types';
import { Button } from './Button';

interface ResultsStepProps {
  result: AnalysisResult;
  onReset: () => void;
  onAnalyzeAnother: () => void;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({ result, onReset, onAnalyzeAnother }) => {

  const handleShare = () => {
    const text = `CLASH MEMO: ${result.question}\n\nBOTTOM LINE: ${result.recommendation}\n\n${window.location.href}`;
    navigator.clipboard.writeText(text);
    alert("Summary copied to clipboard.");
  };

  const handleDownloadMemo = () => {
    // ... (keep existing handleDownloadMemo logic) ...
    const date = new Date().toLocaleDateString();
    const content = `
INVESTMENT MEMO - CLASH ANALYSIS
DATE: ${date}
QUESTION: ${result.question}

BOTTOM LINE RECOMMENDATION
${result.recommendation}

EXPLANATION OF CONFLICTS
${result.explanation}

DATA POINTS & SOURCES
${result.conflicts.map(c => `
• VALUE:      ${c.value}
  SOURCE:     ${c.source}
  CONFIDENCE: ${c.confidence}
  CONTEXT:    ${c.context}
`).join('')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Clash_Memo_${date.replace(/\//g, '-')}.txt`;
    link.click();
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-enter">

      {/* Navigation */}
      <div className="flex justify-between items-center mb-24 opacity-40 hover:opacity-100 transition-opacity duration-300">
        <button onClick={onAnalyzeAnother} className="text-sm text-[#111] dark:text-[#EEE] transition-colors flex items-center group">
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back
        </button>
        <div className="flex space-x-6">
          <button onClick={handleDownloadMemo} className="text-sm text-[#111] dark:text-[#EEE] transition-colors flex items-center hover:underline">
            Download Memo
            <Download className="w-4 h-4 ml-2" />
          </button>
          <button onClick={handleShare} className="text-sm text-[#111] dark:text-[#EEE] transition-colors flex items-center hover:underline">
            Copy Summary
            <Share2 className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-16 md:gap-24">

        {/* Main Column: Question & Data */}
        <div className="lg:col-span-8">
          <h1 className="text-3xl md:text-5xl font-light text-[#111] dark:text-white mb-20 leading-tight transition-colors duration-500">
            {result.question}
          </h1>

          <div className="space-y-12">
            {result.conflicts.map((item, idx) => (
              <div key={idx} className="group relative">
                {/* Subtle marker for the row */}
                <div className="absolute -left-4 top-2 bottom-2 w-0.5 bg-black dark:bg-white scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-3">
                  <span className="text-3xl font-normal text-[#111] dark:text-[#EEE] transition-colors duration-500">{item.value}</span>
                  <div className="flex items-center gap-3 mt-1 sm:mt-0">
                    <span className="text-xs px-2 py-1 rounded bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#666] dark:text-[#888] font-medium uppercase tracking-wide">{item.confidence}</span>
                    <span className="text-sm text-[#888] dark:text-[#666] font-medium transition-colors duration-500 uppercase tracking-wide">{item.source}</span>
                  </div>
                </div>
                <p className="text-[#555] dark:text-[#888] text-base leading-relaxed max-w-xl transition-colors duration-500">{item.context}</p>

                {/* Divider - only subtle if needed, relying on spacing mostly */}
                {idx !== result.conflicts.length - 1 && (
                  <div className="h-px bg-[#F5F5F5] dark:bg-[#1A1A1A] mt-12 w-full" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Insights */}
        <div className="lg:col-span-4 space-y-16 pt-2">

          <div>
            <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#AAA] dark:text-[#444] mb-6">Recommendation</span>
            {/* Added whitespace-pre-wrap to preserve JSON line breaks */}
            <p className="text-xl font-normal text-[#111] dark:text-[#EEE] leading-relaxed transition-colors duration-500 whitespace-pre-wrap">
              {result.recommendation}
            </p>
          </div>

          <div>
            <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#AAA] dark:text-[#444] mb-6">Explanation</span>
            {/* Added whitespace-pre-wrap to preserve JSON line breaks */}
            <p className="text-[#555] dark:text-[#999] text-sm leading-relaxed transition-colors duration-500 whitespace-pre-wrap">
              {result.explanation}
            </p>
          </div>

          <div className="pt-12">
            <Button variant="ghost" fullWidth onClick={onReset} size="sm" className="opacity-50 hover:opacity-100">
              <RefreshCw className="w-3 h-3 mr-2" />
              Start Over
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};