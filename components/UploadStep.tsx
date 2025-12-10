import React, { useRef, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { UploadedFile } from '../types';
import { Button } from './Button';

interface UploadStepProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onContinue: () => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({ files, onFilesChange, onContinue }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFiles(Array.from(event.target.files));
    }
  };

  const processFiles = (newFiles: File[]) => {
    setError(null);
    const validFiles = newFiles.filter(f => f.type === 'application/pdf' || f.type === 'text/plain');
    
    if (validFiles.length !== newFiles.length) {
      setError("Only PDF and text files supported.");
    }
    
    if (files.length + validFiles.length > 5) {
      setError("Maximum 5 documents.");
      return;
    }

    // Check file sizes (30MB per file limit)
    const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB per file
    const totalSize = [...files, ...validFiles].reduce((sum, f) => sum + f.file.size, 0);
    const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total (Vercel Pro limit)

    const oversizedFiles = validFiles.filter(f => f.file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setError(`File too large: ${oversizedFiles[0].name}. Max 30MB per file.`);
      return;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      setError(`Total file size exceeds 50MB limit. Current: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    const uploaded: UploadedFile[] = validFiles.map(f => ({
      file: f,
      id: Math.random().toString(36).substring(7)
    }));

    onFilesChange([...files, ...uploaded]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  const handleLoadDemo = () => {
    const file1 = new File(
      ["The global AI market size was valued at $196.63 billion in 2023. Source: Grand View Research."], 
      "GrandView_AI_Report_2023.txt", 
      { type: "text/plain" }
    );
    const file2 = new File(
      ["The global artificial intelligence market size is projected to reach $305.90 billion in 2024. However, in 2023 it was approximately $150.2 billion. Source: Fortune Business Insights."], 
      "Fortune_AI_Market_2024.txt", 
      { type: "text/plain" }
    );
    processFiles([file1, file2]);
  };

  return (
    <div className="w-full max-w-xl mx-auto animate-enter">
      
      {/* The "Tray" - A subtle surface */}
      <div 
        className={`
          relative rounded-3xl transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]
          ${isDragging 
            ? 'bg-[#EFEFEF] dark:bg-[#222] scale-[1.02]' 
            : 'bg-[#FAFAFA] dark:bg-[#111] hover:bg-[#F5F5F5] dark:hover:bg-[#151515]'}
          cursor-pointer group
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => files.length === 0 && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          className="hidden" 
          accept=".pdf,.txt" 
          multiple 
        />
        
        {files.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center border border-transparent group-hover:border-[#E5E5E5] dark:group-hover:border-[#222] rounded-3xl transition-colors duration-500">
             <p className="text-xl font-medium text-[#111] dark:text-[#EEE] tracking-tight mb-2">Drop documents here</p>
             <p className="text-[#888] dark:text-[#555] font-light">PDFs or text files</p>
             <p className="text-xs text-[#AAA] dark:text-[#444] mt-2">Max 30MB per file, 50MB total</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm animate-enter transition-colors duration-500">
                <div className="flex items-center space-x-4 overflow-hidden">
                  <div className="truncate">
                    <p className="text-sm font-medium text-[#111] dark:text-[#EEE] truncate max-w-[200px]">{f.file.name}</p>
                    <p className="text-xs text-[#999] dark:text-[#666]">{(f.file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#333] text-[#999] dark:text-[#666] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {/* Add more button */}
            {files.length < 5 && (
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="flex items-center justify-center p-4 border border-dashed border-[#E0E0E0] dark:border-[#333] rounded-2xl text-sm text-[#888] dark:text-[#666] hover:bg-[#FAFAFA] dark:hover:bg-[#111] transition-colors cursor-pointer opacity-50 hover:opacity-100"
               >
                 Add another
               </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-8 text-center text-sm text-[#E53935] font-medium animate-enter">
          {error}
        </div>
      )}

      {/* Action Area */}
      <div className="mt-16 flex flex-col items-center justify-center space-y-8">
        {files.length >= 2 ? (
          <Button onClick={onContinue} size="lg" className="shadow-2xl shadow-black/10 dark:shadow-white/5 px-12">
            Continue
          </Button>
        ) : (
          files.length === 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleLoadDemo(); }}
              className="text-xs font-medium text-[#BBB] dark:text-[#444] hover:text-[#111] dark:hover:text-[#AAA] transition-colors"
            >
              Try with example data
            </button>
          )
        )}
      </div>
    </div>
  );
};