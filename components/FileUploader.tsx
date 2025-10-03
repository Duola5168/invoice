import React, { useState, useCallback } from 'react';

interface FileUploaderProps {
  onFilesAdded: (files: File[]) => void;
  disabled: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesAdded, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    // FIX: Explicitly type `file` as `File` to resolve TypeScript error.
    const files = Array.from(e.dataTransfer.files).filter((file: File) => file.type === 'application/pdf');
    if (files.length > 0) {
      onFilesAdded(files);
    }
  }, [onFilesAdded, disabled]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // FIX: Explicitly type `file` as `File` to resolve TypeScript error.
      const files = Array.from(e.target.files).filter((file: File) => file.type === 'application/pdf');
      if (files.length > 0) {
        onFilesAdded(files);
      }
    }
  };

  const baseClasses = "relative block w-full rounded-lg border-2 border-dashed p-12 text-center transition-colors duration-200";
  const idleClasses = "border-slate-300 hover:border-indigo-400";
  const draggingClasses = "border-indigo-500 bg-indigo-50";
  const disabledClasses = "border-slate-200 bg-slate-100 cursor-not-allowed";

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={`${baseClasses} ${disabled ? disabledClasses : (isDragging ? draggingClasses : idleClasses)}`}
    >
        <svg className="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>

      <span className="mt-2 block text-sm font-semibold text-slate-900">
        將 PDF 發票拖放到此處
      </span>
      <span className="mt-1 block text-xs text-slate-500">或</span>
      <label htmlFor="file-upload" className={`mt-2 font-semibold text-indigo-600 ${disabled ? 'cursor-not-allowed text-indigo-300' : 'cursor-pointer hover:text-indigo-500'}`}>
        <span>從您的裝置選擇檔案</span>
        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept=".pdf" onChange={handleFileChange} disabled={disabled} />
      </label>
    </div>
  );
};

export default FileUploader;