import React, { useEffect, useState } from 'react';
import { UploadedFile } from '../types';

interface ProcessingStepProps {
  files: UploadedFile[];
}

export const ProcessingStep: React.FC<ProcessingStepProps> = ({ files }) => {
  const [statusText, setStatusText] = useState("Reading");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const steps = [
      { p: 15, text: "Reading documents..." },
      { p: 35, text: "Identifying metrics..." },
      { p: 60, text: "Comparing sources..." },
      { p: 80, text: "Resolving conflicts..." },
      { p: 95, text: "Finalizing..." },
    ];

    let currentStep = 0;
    
    // Non-linear timing for a more organic feel
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setStatusText(steps[currentStep].text);
        setProgress(steps[currentStep].p);
        currentStep++;
      }
    }, 800);

    return () => clearInterval(interval);
  }, [files]);

  return (
    <div className="w-full max-w-md mx-auto text-center py-20 animate-enter">
      
      {/* The Breathing Indicator */}
      <div className="relative h-1 w-full bg-[#F0F0F0] dark:bg-[#222] rounded-full overflow-hidden mb-12 transition-colors duration-500">
        <div 
          className="absolute top-0 left-0 h-full bg-[#111] dark:bg-[#EEE] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <h2 className="text-xl font-normal text-[#111] dark:text-white mb-2 transition-colors duration-500">{statusText}</h2>
      <p className="text-sm text-[#999] dark:text-[#666] font-light transition-colors duration-500">Processing {files.length} sources</p>
    </div>
  );
};