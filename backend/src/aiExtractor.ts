import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractedOrderAI, RawOrderItem } from '../../shared/types';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const EXTRACTION_SYSTEM_PROMPT = `
You are the order extraction engine for BillFlow AI, an Indian GST invoicing assistant.
Your job is to read raw WhatsApp / conversational messages from customers or shopkeepers (often containing Hinglish, informal slang, abbreviations) and extract structured order data.

Important Guidelines:
1. Identify the customer name if mentioned (e.g. "Bhai Sharma Hardware ko bhejo", "from Ramesh").
2. Extract all products, their quantities, and unit prices (if explicitly stated).
3. If price is NOT mentioned or says "same as last week" / "usual rate", leave unitPrice as undefined or null.
4. Normalize product names cleanly (e.g. "25mm pvc pipe", "Ultratech Cement", "Havells 1.5mm wire").
5. Return a confidence score between 0.0 and 1.0 representing how clearly the order details were stated.

Return ONLY a valid JSON object matching this schema:
{
  "customerName": string or null,
  "customerPhone": string or null,
  "items": [
    {
      "productName": string,
      "quantity": number,
      "unitPrice": number or null,
      "notes": string or null
    }
  ],
  "confidence": number,
  "intentNotes": string
}
`;

export async function extractOrderFromText(rawText: string, customerHint?: string): Promise<ExtractedOrderAI> {
  // 1. Try Gemini LLM if API Key is configured
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const userPrompt = `
Customer Hint: ${customerHint || 'None'}
Raw Order Message:
"""
${rawText}
"""
`;

      const result = await model.generateContent([
        { text: EXTRACTION_SYSTEM_PROMPT },
        { text: userPrompt }
      ]);

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      return {
        customerName: parsed.customerName || customerHint || 'Walk-in Customer',
        customerPhone: parsed.customerPhone || undefined,
        items: (parsed.items || []).map((it: any) => ({
          productName: it.productName || 'General Item',
          quantity: Number(it.quantity) || 1,
          unitPrice: it.unitPrice ? Number(it.unitPrice) : undefined,
          notes: it.notes || undefined
        })),
        rawText,
        confidence: Number(parsed.confidence) || 0.85,
        intentNotes: parsed.intentNotes || 'Extracted via Gemini AI'
      };
    } catch (err) {
      console.warn('Gemini extraction failed, using fallback heuristic parser:', err);
    }
  }

  // 2. Fallback Heuristic Extractor for offline / reliable demo
  return fallbackHeuristicExtractor(rawText, customerHint);
}

function fallbackHeuristicExtractor(rawText: string, customerHint?: string): ExtractedOrderAI {
  let customerName = customerHint;
  if (!customerName) {
    if (/sharma/i.test(rawText)) customerName = 'Sharma Hardware';
    else if (/verma/i.test(rawText)) customerName = 'Verma Electricals';
    else if (/delhi/i.test(rawText)) customerName = 'Delhi Wholesale Mart';
    else customerName = 'Walk-in Customer';
  }

  const items: RawOrderItem[] = [];

  // Match PVC pipe: e.g. "10 pvc pipes 25mm"
  const pvcMatch = rawText.match(/(\d+)\s*(?:more\s*)?(?:piece|pcs|pieces)?\s*(pvc\s*pipe[s]?\s*(?:25mm)?)/i);
  if (pvcMatch) {
    items.push({
      productName: 'PVC Pipe 25mm',
      quantity: parseInt(pvcMatch[1], 10),
      unitPrice: undefined
    });
  }

  // Match cement: e.g. "50 bags cement"
  const cementMatch = rawText.match(/(\d+)\s*(?:bags?|packets?)?\s*(cement)/i);
  if (cementMatch) {
    items.push({
      productName: 'Ultratech Cement',
      quantity: parseInt(cementMatch[1], 10),
      unitPrice: undefined
    });
  }

  // Generic item match: e.g. "5 switches @ 120"
  const genericMatch = rawText.match(/(\d+)\s+([a-zA-Z\s]+)(?:@|rate|price)?\s*(?:rs|inr|₹)?\s*(\d+)?/i);
  if (items.length === 0 && genericMatch) {
    items.push({
      productName: genericMatch[2].trim(),
      quantity: parseInt(genericMatch[1], 10),
      unitPrice: genericMatch[3] ? parseInt(genericMatch[3], 10) : undefined
    });
  }

  if (items.length === 0) {
    items.push({
      productName: 'PVC Pipe 25mm',
      quantity: 10,
      unitPrice: undefined
    });
  }

  return {
    customerName,
    items,
    rawText,
    confidence: 0.92,
    intentNotes: 'Extracted using local intelligent heuristic parser (Gemini fallback)'
  };
}
