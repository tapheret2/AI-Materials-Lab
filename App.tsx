import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, FlaskConical, AlertCircle, CheckCircle2, Loader2, Microscope, Trash2, Layers, Info, ScanSearch } from 'lucide-react';
import { analyzeMaterialData } from './services/gemini';
import { AnalysisStatus, FileData } from './types';
import { MarkdownViewer } from './components/MarkdownViewer';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [files, setFiles] = useState<FileData[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Validation and Reading
  const readFile = (file: File): Promise<FileData> => {
    return new Promise((resolve, reject) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        reject(`File ${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
        return;
      }
      
      // Accept images
      if (!file.type.startsWith('image/')) {
        reject(`File ${file.name} is not a supported image type.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Extract base64 part (remove data:image/png;base64, prefix)
        const base64Data = result.split(',')[1];
        
        resolve({
          file,
          previewUrl: result,
          base64: base64Data,
          mimeType: file.type
        });
      };
      reader.onerror = () => reject(`Failed to read file ${file.name}`);
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (newFiles: FileList | File[]) => {
    setErrorMsg('');
    const fileArray = Array.from(newFiles);
    
    if (files.length + fileArray.length > MAX_FILES) {
      setErrorMsg(`Maximum ${MAX_FILES} files allowed.`);
      return;
    }

    try {
      const processedFiles = await Promise.all(fileArray.map(readFile));
      setFiles(prev => [...prev, ...processedFiles]);
    } catch (err: any) {
      setErrorMsg(err.toString());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input to allow same file selection again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [files]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (files.length === 0 && !notes.trim()) {
      setErrorMsg("Please provide figures or notes to perform analysis.");
      return;
    }

    setStatus(AnalysisStatus.ANALYZING);
    setErrorMsg('');
    setResult('');

    try {
      const imagesPayload = files.map(f => ({ base64: f.base64, mimeType: f.mimeType }));
      const analysis = await analyzeMaterialData(notes, imagesPayload);
      setResult(analysis);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setStatus(AnalysisStatus.ERROR);
      setErrorMsg(err.message || "An unexpected error occurred during analysis.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-teal-600 p-2 rounded-lg shadow-sm">
              <Microscope className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">AI Lab Assistant for Materials Science</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="hidden md:inline">Powered by Gemini 3 Pro</span>
            <div className="w-px h-4 bg-slate-300 hidden md:block"></div>
            <span className="font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full text-xs border border-teal-100 flex items-center gap-1">
              <ScanSearch className="w-3 h-3" />
              Data Extraction & Writing
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* File Upload Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-600" />
                Figures & Data
              </h2>
              <span className="text-xs text-slate-400">XRD, Raman, I-V, SEM</span>
            </div>
            
            <div className="p-6">
              {/* Drop Zone */}
              <div 
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-teal-500 hover:bg-teal-50/30 transition-all cursor-pointer group"
              >
                <div className="bg-slate-100 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6 text-slate-400 group-hover:text-teal-600" />
                </div>
                <p className="text-slate-900 font-medium mb-1">Click to upload or drag & drop</p>
                <p className="text-slate-500 text-xs">Upload plots for quantitative extraction ({MAX_FILES} max)</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                  multiple
                />
              </div>

              {/* File Previews Grid */}
              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {files.map((file, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 group h-24">
                      <img 
                        src={file.previewUrl} 
                        alt={`Preview ${idx}`} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="bg-white/90 text-red-600 p-1.5 rounded-full shadow-sm hover:bg-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-0.5 truncate backdrop-blur-sm">
                        {file.file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Text Input */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Experimental Context
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide context for the figures (e.g. 'Fig 1a is Pt/TiO2/Pt', 'Scan rate: 100 mV/s'). The AI will analyze the figure assuming NO paper exists yet."
                  className="w-full h-40 p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none text-sm text-slate-700 shadow-sm placeholder:text-slate-400"
                ></textarea>
                <div className="mt-2 text-xs text-slate-500 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  Tip: Quantitative values are only extracted if clearly visible.
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleAnalyze}
                disabled={status === AnalysisStatus.ANALYZING}
                className={`mt-6 w-full py-3 px-4 rounded-xl font-semibold text-white shadow-md transition-all flex items-center justify-center gap-2
                  ${status === AnalysisStatus.ANALYZING 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-teal-600 hover:bg-teal-700 hover:shadow-lg active:scale-[0.98]'
                  }`}
              >
                {status === AnalysisStatus.ANALYZING ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Extracting Data...
                  </>
                ) : (
                  <>
                    <ScanSearch className="w-5 h-5" />
                    Extract Data & Write Draft
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Analysis & Draft
              </h2>
              {status === AnalysisStatus.SUCCESS && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200">
                  Completed
                </span>
              )}
            </div>

            <div className="flex-grow p-6 md:p-8">
              {status === AnalysisStatus.IDLE && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <div className="bg-slate-50 p-6 rounded-full border border-slate-100">
                    <FlaskConical className="w-12 h-12 text-slate-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-slate-600">AI Lab Assistant Ready</p>
                    <p className="text-sm max-w-xs mx-auto mt-1">
                      Upload experimental figures. The system will extract quantitative data and generate a manuscript-style discussion.
                    </p>
                  </div>
                </div>
              )}

              {status === AnalysisStatus.ANALYZING && (
                <div className="h-full flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium text-slate-700">Analyzing Figures...</p>
                    <p className="text-sm text-slate-500 animate-pulse">
                      Reading plots, identifying peaks, and drafting discussion
                    </p>
                  </div>
                </div>
              )}

              {status === AnalysisStatus.ERROR && (
                <div className="h-full flex flex-col items-center justify-center text-red-500">
                  <AlertCircle className="w-12 h-12 mb-4" />
                  <p className="font-medium">Analysis Failed</p>
                  <p className="text-sm mt-2 text-slate-600">Please check your internet connection or try again.</p>
                </div>
              )}

              {status === AnalysisStatus.SUCCESS && result && (
                <div className="animate-fadeIn">
                  <div className="bg-teal-50/50 p-4 rounded-lg mb-6 border border-teal-100">
                    <h3 className="text-teal-900 font-semibold mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> 
                      Generated Analysis
                    </h3>
                    <p className="text-sm text-teal-800">
                      Quantitative values are extracted directly from the image. Review the confidence levels before use.
                    </p>
                  </div>
                  <MarkdownViewer content={result} />
                  
                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => navigator.clipboard.writeText(result)}
                      className="text-sm text-slate-500 hover:text-teal-600 transition-colors flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" /> Copy Text
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} AI Lab Assistant for Materials Science. Verify all extracted values.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;