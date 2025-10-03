import React, { useState, useCallback } from 'react';
import FileUploader from './components/FileUploader';
import { extractInvoiceInfo } from './services/geminiService';
import type { ProcessedFile, InvoiceData } from './types';
import { FileStatus } from './types';

// These will be available globally from the CDN scripts in index.html
declare const pdfjsLib: any;
declare const saveAs: any;

const presetEmails = [
    { name: '富元機電', email: 'fuhyuan.w5339@msa.hinet.net' }
];

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
      return null;
  }
};


const App: React.FC = () => {
    const [file, setFile] = useState<ProcessedFile | null>(null);
    const [recipientEmail, setRecipientEmail] = useState('');

    const processPdf = async (file: File): Promise<{ extractedData: InvoiceData, newName: string }> => {
        const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (!context) {
            throw new Error("Could not get canvas context");
        }

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
        const extractedData = await extractInvoiceInfo(base64Image);
        
        const formattedDate = extractedData.invoiceDate.replace(/[\/\-]/g, '');
        const newName = `${extractedData.businessNumber}_${formattedDate}.pdf`;
        
        return { extractedData, newName };
    };

    const handleFileAdded = useCallback(async (newFile: File) => {
        const processedFile: ProcessedFile = {
            id: `${newFile.name}-${newFile.lastModified}`,
            originalFile: newFile,
            status: FileStatus.Processing,
            extractedData: null,
            newName: null,
            errorMessage: null,
        };
        setFile(processedFile);

        try {
            const { extractedData, newName } = await processPdf(newFile);
            setFile(prev => prev ? { ...prev, status: FileStatus.Success, extractedData, newName } : null);
        } catch (error: any) {
            setFile(prev => prev ? { ...prev, status: FileStatus.Error, errorMessage: error.message || "發生未知錯誤" } : null);
        }
    }, []);

    const handleInvoiceDataChange = useCallback((field: keyof InvoiceData, value: string) => {
        setFile(prevFile => {
            if (!prevFile || !prevFile.extractedData) return prevFile;

            const updatedData = {
                ...prevFile.extractedData,
                [field]: value,
            };
            
            const formattedDate = updatedData.invoiceDate.replace(/[\/\-]/g, '');
            const newName = `${updatedData.businessNumber}_${formattedDate}.pdf`;
            
            return {
                ...prevFile,
                extractedData: updatedData,
                newName: newName,
            };
        });
    }, []);

    const handleDownload = () => {
        if (file?.status === FileStatus.Success && file.newName) {
            saveAs(file.originalFile, file.newName);
        }
    };
    
    const handleComposeEmail = () => {
        if (!recipientEmail) {
            alert("請輸入收件人的電子郵件地址。");
            return;
        }
        const subject = `發票文件：${file?.newName || file?.originalFile.name}`;
        const body = `您好，\n\n附件為發票文件。\n\n此郵件由「智慧發票處理器」協助產生。請記得附上您剛剛下載的檔案。\n\n祝好。`;
        
        window.location.href = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleReset = () => {
        setFile(null);
        setRecipientEmail('');
    };

    const isStep3Disabled = file?.status !== FileStatus.Success;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
                <header className="text-center mb-10">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">智慧發票處理器</h1>
                    <p className="mt-4 text-lg text-slate-600">AI 驅動的 PDF 電子發票命名與郵件處理工具。</p>
                </header>

                <div className="space-y-8">
                    {/* Step 1 & 2 */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-slate-800">上傳並分析發票</h2>
                             {file && (
                                <button onClick={handleReset} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                                    清除檔案
                                </button>
                            )}
                        </div>
                       
                        <FileUploader onFileAdded={handleFileAdded} disabled={!!file} />

                        {file && (
                             <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <div className="flex items-start justify-between space-x-4">
                                     <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-900 truncate">{file.originalFile.name}</p>
                                        
                                        {file.status === FileStatus.Success && file.extractedData && (
                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3 text-xs">
                                              <div className="sm:col-span-3">
                                                <label htmlFor="buyerName" className="block text-xs font-medium text-slate-600">買方</label>
                                                <input 
                                                  type="text" 
                                                  id="buyerName"
                                                  value={file.extractedData.buyerName}
                                                  onChange={(e) => handleInvoiceDataChange('buyerName', e.target.value)}
                                                  className="mt-1 block w-full px-2 py-1.5 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                />
                                              </div>
                                              <div>
                                                <label htmlFor="businessNumber" className="block text-xs font-medium text-slate-600">統一編號</label>
                                                <input 
                                                  type="text" 
                                                  id="businessNumber"
                                                  value={file.extractedData.businessNumber}
                                                  onChange={(e) => handleInvoiceDataChange('businessNumber', e.target.value)}
                                                  className="mt-1 block w-full px-2 py-1.5 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                />
                                              </div>
                                              <div>
                                                <label htmlFor="invoiceDate" className="block text-xs font-medium text-slate-600">日期</label>
                                                <input 
                                                  type="text" 
                                                  id="invoiceDate"
                                                  value={file.extractedData.invoiceDate}
                                                  onChange={(e) => handleInvoiceDataChange('invoiceDate', e.target.value)}
                                                  className="mt-1 block w-full px-2 py-1.5 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                />
                                              </div>
                                               <div className="sm:col-span-3 pt-1">
                                                 <p className="text-green-800 bg-green-50 rounded-md px-2 py-1.5 font-medium text-sm"><span className="font-semibold text-slate-600">新檔名：</span> {file.newName}</p>
                                               </div>
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
                            </div>
                        )}
                    </div>
                    
                    {/* Step 3 */}
                    <div className={`transition-opacity duration-500 ${isStep3Disabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">
                            <h2 className="text-xl font-semibold mb-4 text-slate-800">下載並寄送郵件</h2>
                             <div className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">收件人電子郵件</label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="recipient@example.com"
                                    />
                                    <div className="mt-2">
                                        <p className="text-xs text-slate-500 mb-1">或選擇預設地址：</p>
                                        <div className="flex flex-wrap gap-2">
                                            {presetEmails.map((preset) => (
                                                <button
                                                    key={preset.name}
                                                    type="button"
                                                    onClick={() => setRecipientEmail(preset.email)}
                                                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                >
                                                    {preset.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={handleDownload}
                                        className="w-full sm:w-1/2 flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                        下載 PDF
                                    </button>
                                    <button
                                        onClick={handleComposeEmail}
                                        disabled={!recipientEmail}
                                        className="w-full sm:w-1/2 flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25-2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                        </svg>
                                        撰寫郵件
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;