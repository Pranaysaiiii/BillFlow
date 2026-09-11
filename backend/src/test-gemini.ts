import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

async function testGemini() {
  console.log('Testing Gemini API key:', apiKey.slice(0, 8) + '...' + apiKey.slice(-4));
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const result = await model.generateContent('Extract order: "10 PVC pipes" into JSON {"product": string, "qty": number}');
    console.log('✅ Gemini API Response Success!');
    console.log('Output:', result.response.text().trim());
  } catch (err: any) {
    console.error('⚠️ Gemini API Note/Error:', err.message || err);
  }
}

testGemini();
