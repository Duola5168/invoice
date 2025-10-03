import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import FileUploader from './components/FileUploader';
import FileItem from './components/FileItem';
import { extractInvoiceInfo } from './services/geminiService';
import type { ProcessedFile, InvoiceData } from './types';
import { FileStatus } from './types';

// These will be available globally from the CDN scripts in index.html
declare const pdfjsLib: any;
declare const JSZip: any;
declare const saveAs: any;

const App: React.FC = () => {
    const [files, setFiles] = useState<ProcessedFile[]>([]);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFilesAdded = useCallback((newFiles: File[]) => {
        const processedFiles: ProcessedFile[] = newFiles.map(file => ({
            id: `${file.name}-${file.lastModified}`,
            originalFile: file,
            status: FileStatus.Idle,
            extractedData: null,
            newName: null,
            errorMessage: null,
        }));
        setFiles(prevFiles => [...prevFiles, ...processedFiles]);
    }, []);

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
        
        const formattedDate = extractedData.invoiceDate.replace(/\//g, '');
        const newName = `${extractedData.businessNumber}_${formattedDate}.pdf`;
        
        return { extractedData, newName };
    };

    const handleProcessFiles = async () => {
        setIsProcessing(true);
        
        const processingPromises = files
            .filter(f => f.status === FileStatus.Idle)
            .map(async (fileToProcess) => {
                setFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: FileStatus.Processing } : f));
                try {
                    const { extractedData, newName } = await processPdf(fileToProcess.originalFile);
                    setFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: FileStatus.Success, extractedData, newName } : f));
                } catch (error: any) {
                    setFiles(prev => prev.map(f => f.id === fileToProcess.id ? { ...f, status: FileStatus.Error, errorMessage: error.message || "An unknown error occurred" } : f));
                }
            });

        await Promise.all(processingPromises);
        setIsProcessing(false);
    };

    const handleDownloadAll = async () => {
        const successfulFiles = files.filter(f => f.status === FileStatus.Success && f.newName);
        if (successfulFiles.length === 0) return;

        const zip = new JSZip();
        for (const file of successfulFiles) {
            zip.file(file.newName!, file.originalFile);
        }

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "已重新命名的發票.zip");
    };
    
    const handleComposeEmail = () => {
        if (!recipientEmail) {
            alert("請輸入收件人的電子郵件地址。");
            return;
        }
        const successfulFiles = files.filter(f => f.status === FileStatus.Success);
        const subject = `發票文件 (${new Date().toLocaleDateString()})`;
        const body = `您好，\n\n附件為發票文件。\n\n此郵件由「智慧發票處理器」協助產生。請記得附上您剛剛下載的 '已重新命名的發票.zip' 檔案。\n\n祝好。`;
        
        window.location.href = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const successfulFilesCount = files.filter(f => f.status === FileStatus.Success).length;
    const idleFilesCount = files.filter(f => f.status === FileStatus.Idle).length;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
                <header className="text-center mb-10">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">智慧發票處理器</h1>
                    <p className="mt-4 text-lg text-slate-600">AI 驅動的 PDF 電子發票命名與郵件處理工具。</p>
                </header>

                <div className="space-y-8">
                    {/* Step 1 */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">
                        <h2 className="text-xl font-semibold mb-4 text-slate-800">第一步：上傳您的 PDF 發票</h2>
                        <FileUploader onFilesAdded={handleFilesAdded} disabled={isProcessing} />
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">
                            <h2 className="text-xl font-semibold mb-4 text-slate-800">檔案佇列</h2>
                            <ul className="space-y-3">
                                {files.map(file => <FileItem key={file.id} file={file} />)}
                            </ul>
                        </div>
                    )}

                    {/* Step 2 */}
                    {idleFilesCount > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 text-center">
                            <h2 className="text-xl font-semibold mb-4 text-slate-800">第二步：處理檔案</h2>
                            <p className="text-slate-500 mb-4">點擊下方按鈕，讓 AI 分析您上傳的發票。</p>
                            <button
                                onClick={handleProcessFiles}
                                disabled={isProcessing || idleFilesCount === 0}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
                            >
                                {isProcessing ? '處理中...' : `處理 ${idleFilesCount} 個檔案`}
                            </button>
                        </div>
                    )}

                    {/* Step 3 */}
                    {successfulFilesCount > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">
                            <h2 className="text-xl font-semibold mb-4 text-slate-800">第三步：下載並寄送郵件</h2>
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
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={handleDownloadAll}
                                        className="w-full sm:w-1/2 flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m9 13.5 3 3m0 0 3-3m-3 3v-6m1.06-4.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                                        </svg>
                                        全部下載 (.zip)
                                    </button>
                                    <button
                                        onClick={handleComposeEmail}
                                        disabled={!recipientEmail}
                                        className="w-full sm:w-1/2 flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                        </svg>
                                        撰寫郵件
                                    </button>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;