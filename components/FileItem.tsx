import React from 'react';
import type { ProcessedFile } from '../types';
import { FileStatus } from '../types';

interface FileItemProps {
  file: ProcessedFile;
}

const StatusIndicator: React.FC<{ status: FileStatus }> = ({ status }) => {
  switch (status) {
    case FileStatus.Processing:
      return (
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm text-slate-500">分析中...</span>
        </div>
      );
    case FileStatus.Success:
      return (
        <div className="flex items-center space-x-2 text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          <span className="text-sm font-medium">成功</span>
        </div>
      );
    case FileStatus.Error:
      return (
        <div className="flex items-center space-x-2 text-red-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="text-sm font-medium">錯誤</span>
        </div>
      );
    default:
      return <span className="text-sm text-slate-400">等待中</span>;
  }
};

const FileItem: React.FC<FileItemProps> = ({ file }) => {
  return (
    <li className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="flex items-start justify-between space-x-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 truncate">{file.originalFile.name}</p>
          {file.status === FileStatus.Success && file.extractedData && (
            <div className="mt-2 text-xs text-slate-500 space-y-1">
              <p><span className="font-semibold">統一編號：</span> {file.extractedData.businessNumber}</p>
              <p><span className="font-semibold">開立日期：</span> {file.extractedData.invoiceDate}</p>
              <p className="text-green-700 font-medium"><span className="font-semibold">新檔名：</span> {file.newName}</p>
            </div>
          )}
          {file.status === FileStatus.Error && (
            <p className="mt-2 text-xs text-red-500">{file.errorMessage}</p>
          )}
        </div>
        <div className="flex-shrink-0">
          <StatusIndicator status={file.status} />
        </div>
      </div>
    </li>
  );
};

export default FileItem;