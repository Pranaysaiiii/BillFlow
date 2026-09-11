import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

async function listModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data: any = await res.json();
    if (data.models) {
      console.log('Available models:', data.models.map((m: any) => m.name));
    } else {
      console.log('Response:', data);
    }
  } catch (err: any) {
    console.error('Fetch error:', err);
  }
}

listModels();
