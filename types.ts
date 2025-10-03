
export enum FileStatus {
  Idle = 'idle',
  Processing = 'processing',
  Success = 'success',
  Error = 'error',
}

export interface InvoiceData {
  businessNumber: string;
  invoiceDate: string;
}

export interface ProcessedFile {
  id: string;
  originalFile: File;
  status: FileStatus;
  extractedData: InvoiceData | null;
  newName: string | null;
  errorMessage: string | null;
}
