import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface QuestionStepProps {
  onAnalyze: (question: string) => void;
  onBack: () => void;
}

export const QuestionStep: React.FC<QuestionStepProps> = ({ onAnalyze, onBack }) => {
  const [question, setQuestion] = useState('');

  const suggestions = [
    "Market size",
    "Growth rate",
    "Key competitors",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim().length > 3) {
      onAnalyze(question);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-enter relative flex flex-col items-center">
      <button 
        onClick={onBack} 
        className="absolute -top-32 left-0 text-[#CCC] hover:text-[#111] dark:text-[#333] dark:hover:text-[#EEE] transition-colors p-2"
      >
        <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
      </button>

      <form onSubmit={handleSubmit} className="w-full text-center">
        
        {/* Input Container */}
        {/* 
           Design Note: 
           Using a pill-shape container with subtle contrast to the background. 
           Colors: Light: #F2F2F2 on #FAFAFA. Dark: #161616 on #0A0A0A.
        */}
        <div className="relative w-full max-w-2xl mx-auto mb-12 group">
          <div className="absolute inset-0 bg-[#F2F2F2] dark:bg-[#161616] rounded-[2.5rem] transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-focus-within:scale-[1.02] group-focus-within:shadow-2xl group-focus-within:shadow-black/5 dark:group-focus-within:shadow-white/5" />
          
          <input
            id="question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What do you need to know?"
            className="relative w-full bg-transparent text-3xl md:text-4xl font-light text-[#111] dark:text-[#EEE] placeholder-[#CCC] dark:placeholder-[#444] text-center border-none focus:ring-0 py-8 px-8 rounded-[2.5rem] caret-[#111] dark:caret-white transition-colors duration-500"
            autoFocus
            autoComplete="off"
          />
        </div>
        
        {/* Suggestions */}
        <div className="flex flex-wrap justify-center gap-3 mb-16 opacity-0 animate-enter" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuestion(`What is the ${q.toLowerCase()}?`)}
              className="px-5 py-2.5 bg-transparent border border-[#E5E5E5] dark:border-[#222] text-[#888] dark:text-[#666] text-sm rounded-full hover:border-[#CCC] dark:hover:border-[#444] hover:text-[#111] dark:hover:text-[#DDD] transition-all duration-300"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Submit Button */}
        <div className={`transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] ${question.trim().length > 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <Button 
            type="submit" 
            size="lg" 
            className="shadow-2xl shadow-black/10 dark:shadow-white/5 px-10"
          >
            Run Analysis
          </Button>
        </div>
      </form>
    </div>
  );
};
