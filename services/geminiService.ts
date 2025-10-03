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
            description: "買方的 8 位數統一編號。",
        },
        invoiceDate: {
            type: Type.STRING,
            description: "發票開立日期，格式為 YYYY-MM-DD。",
        },
        buyerName: {
            type: Type.STRING,
            description: "買方的公司全名。",
        },
    },
    required: ["businessNumber", "invoiceDate", "buyerName"],
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
            text: "這是一張台灣的電子發票證明聯。請辨識並回傳 JSON 格式的資訊。\n- 買方統一編號 (businessNumber): '買方' 欄位旁邊的 8 位數字。\n- 買方名稱 (buyerName): '買方' 欄位對應的公司名稱。\n- 發票日期 (invoiceDate): 在 '電子發票證明聯' 標題下方的日期，並使用 YYYY-MM-DD 格式。",
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
        
        if (data.businessNumber && data.invoiceDate && data.buyerName) {
            return data as InvoiceData;
        } else {
            throw new Error("從 AI 收到的資料結構無效。");
        }
    } catch (error) {
        console.error("Error extracting invoice info:", error);
        throw new Error("發票分析失敗，請重試。");
    }
};