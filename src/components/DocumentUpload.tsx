import React, { useRef, useState } from 'react';
import { Upload, File, FileText, AlertCircle, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { put } from '@vercel/blob';
import GlassCard from './GlassCard';

interface DocumentUploadProps {
  onUploadSuccess: (newDoc: any) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStage, setUploadStage] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    setSuccessMsg(null);
    setSelectedFile(null);

    const validTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValid = validTypes.includes(file.type) || ['pdf', 'txt', 'docx', 'doc'].includes(fileExtension || '');

    if (!isValid) {
      setError('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum supported size is 10MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);
    setProgress(10);
    setUploadStage('Reading binary buffer stream...');

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

    // Stage updates
    const simulateStage = (pct: number, stageName: string, delay: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setProgress(pct);
          setUploadStage(stageName);
          resolve();
        }, delay);
      });
    };

    try {
      let type: 'pdf' | 'docx' | 'txt' = 'txt';

      if (fileExtension === 'pdf') {
        type = 'pdf';
      } else if (fileExtension === 'docx' || fileExtension === 'doc') {
        type = 'docx';
      }

      await simulateStage(25, 'Requesting secure upload token...', 600);
      
      const tokenRes = await fetch('/api/upload-token');
      if (!tokenRes.ok) throw new Error('Failed to get upload token');
      const { token } = await tokenRes.json();

      await simulateStage(50, 'Uploading directly to Vercel Blob...', 600);
      
      const blob = await put(selectedFile.name, selectedFile, {
        access: 'public',
        token: token,
        allowOverwrite: true,
        addRandomSuffix: true
      });
      
      const fileUrl = blob.url;

      await simulateStage(75, 'Deploying vector embedding models...', 600);
      await simulateStage(90, 'Vaulting document into research index...', 400);

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedFile.name,
          type,
          fileUrl, // Using direct URL instead of base64
          size: formatBytes(selectedFile.size)
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to upload document');
      }

      const newDoc = await response.json();
      setProgress(100);
      setUploadStage('Workspace vaulted successfully!');
      setSuccessMsg(`"${selectedFile.name}" successfully vaulted into Library!`);
      setSelectedFile(null);
      onUploadSuccess(newDoc);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string || '';
        const base64Data = result.split(',')[1] || '';
        resolve(base64Data);
      };
      reader.onerror = () => reject(new Error('Failed to read file buffer'));
      reader.readAsDataURL(file);
    });
  };

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <GlassCard className="border border-white/5 hover:border-brand-purple/20 transition-all p-8 relative overflow-hidden" id="doc-upload-card">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/5 blur-3xl rounded-full translate-x-10 -translate-y-10" />

      {isUploading ? (
        <div className="py-10 flex flex-col items-center justify-center space-y-5 max-w-xs mx-auto">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-brand-purple/20 border-t-brand-cyan animate-spin" />
            <span className="absolute text-xs font-black text-white">{progress}%</span>
          </div>
          <div className="text-center space-y-1.5 w-full">
            <p className="text-xs font-bold text-white uppercase tracking-wider">{uploadStage}</p>
            <p className="text-[10px] text-gray-500 font-semibold">Gemini Agent is mapping content vectors...</p>
            <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden mt-3">
              <motion.div
                className="bg-gradient-to-r from-brand-cyan to-brand-purple h-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        </div>
      ) : selectedFile ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-6 flex flex-col items-center text-center space-y-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple shadow-lg shadow-brand-purple/5">
            <FileText className="w-7 h-7 text-brand-purple" />
          </div>
          
          <div className="space-y-1.5 max-w-sm">
            <h4 className="text-sm font-extrabold text-white truncate max-w-[280px] mx-auto">{selectedFile.name}</h4>
            <div className="flex items-center justify-center space-x-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <span className="text-brand-cyan">{selectedFile.name.split('.').pop()?.toUpperCase()}</span>
              <span>•</span>
              <span>{formatBytes(selectedFile.size)}</span>
            </div>
          </div>

          <div className="w-full max-w-xs p-3.5 rounded-xl bg-white/3 border border-white/5 text-left text-[10px] space-y-1.5">
            <div className="flex items-center space-x-1.5 text-gray-400 font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span>Vault Validator Checks</span>
            </div>
            <p className="text-gray-500 font-normal leading-normal">
              File type check passed. File fits under the 10MB workspace limit. Ready to classify and parse.
            </p>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => setSelectedFile(null)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              CANCEL
            </button>
            <button
              onClick={handleUploadSubmit}
              className="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/95 text-white font-extrabold text-xs shadow-lg shadow-brand-purple/20 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <span>PROCESS WITH GEMINI AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={`rounded-2xl border border-dashed border-white/5 hover:border-brand-purple/30 py-10 px-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragging ? 'bg-brand-purple/10 border-brand-purple/40 scale-[0.99] shadow-inner shadow-brand-purple/10' : 'bg-transparent'
          }`}
          id="dropzone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt,.docx,.doc"
            className="hidden"
            id="file-input-manual"
          />

          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-purple/10 to-brand-cyan/10 flex items-center justify-center mx-auto border border-white/5 shadow-lg shadow-brand-purple/5 group-hover:scale-105 transition-transform">
              <Upload className="w-8 h-8 text-brand-purple" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Drag & Drop files here, or <span className="text-brand-cyan hover:underline">browse</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">Supports PDF, DOCX, and TXT files (up to 10MB)</p>
            </div>
          </div>
        </div>
      )}

      {/* Feedbacks */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center space-x-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left"
          id="upload-error"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center space-x-2 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-left"
          id="upload-success"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}
    </GlassCard>
  );
};
export default DocumentUpload;
