import { GoogleGenAI, Type } from "@google/genai";
import type { InvoiceData } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        businessNumber: {
            type: Type.STRING,
            description: "The 8-digit business number (統一編號).",
        },
        invoiceDate: {
            type: Type.STRING,
            description: "The invoice issue date in YYYY/MM/DD format (開立日期).",
        },
    },
    required: ["businessNumber", "invoiceDate"],
};

export const extractInvoiceInfo = async (base64Image: string): Promise<InvoiceData> => {
    try {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
            },
        };

        const textPart = {
            text: "這是一張台灣的電子發票。請辨識並回傳 JSON 格式的統一編號和開立日期。統一編號是8位數字。開立日期請使用 YYYY/MM/DD 格式。",
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        const jsonString = response.text.trim();
        const data = JSON.parse(jsonString);
        
        if (data.businessNumber && data.invoiceDate) {
            return data as InvoiceData;
        } else {
            throw new Error("從 AI 收到的資料結構無效。");
        }
    } catch (error) {
        console.error("Error extracting invoice info:", error);
        throw new Error("發票分析失敗，請重試。");
    }
};