import express from 'express';
import path from 'path';
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());

// Initialize Gemini on server
const getGeminiClient = (apiKey?: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) return null;
  return new GoogleGenAI(key);
};

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    node: process.version, 
    env: process.env.NODE_ENV, 
    vercel: !!process.env.VERCEL,
    hasGeminiKey: !!(process.env.GEMINI_API_KEY || process.env.API_KEY)
  });
});

app.get('/api/ai/config', (req, res) => {
  res.json({
    hasBuiltInGemini: !!(process.env.GEMINI_API_KEY || process.env.API_KEY),
    env: process.env.NODE_ENV
  });
});

app.post('/api/ai/proxy', async (req, res) => {
  const { provider, baseUrl, apiKey, model, messages, jsonMode, isImageGen, prompt, systemInstruction, imageUri } = req.body;
  
  try {
    // 1. Handle Gemini via SDK on Server
    if (provider === 'gemini') {
      const genAI = getGeminiClient(apiKey);
      if (!genAI) {
        return res.status(400).json({ error: { message: "Gemini API Key missing on server. Please set GEMINI_API_KEY in environment variables." } });
      }

      const geminiModel = genAI.getGenerativeModel({ 
        model: model || "gemini-1.5-flash",
        systemInstruction: systemInstruction
      });

      if (isImageGen) {
        // Note: Image generation via generateContent is experimental/specific to some models
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const candidate = response.candidates?.[0];
        const imgPart = candidate?.content?.parts.find(p => p.inlineData);
        
        if (!imgPart) {
          return res.status(400).json({ error: { message: `Image generation failed. Reason: ${candidate?.finishReason || 'Unknown'}` } });
        }
        return res.json({ image: `data:image/png;base64,${imgPart.inlineData.data}` });
      }

      let contents: any;
      if (imageUri) {
        contents = [
          { inlineData: { mimeType: "image/png", data: imageUri.split(',')[1] } },
          { text: prompt }
        ];
      } else if (messages && messages.length > 0) {
        // Convert OpenAI messages to Gemini contents
        contents = messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
      } else {
        contents = prompt;
      }

      const result = await geminiModel.generateContent({
        contents,
        generationConfig: {
          responseMimeType: jsonMode ? "application/json" : "text/plain"
        }
      });
      
      const response = await result.response;
      return res.json({ text: response.text() });
    }

    // 2. Handle OpenAI-compatible APIs
    const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    if (isImageGen && baseUrl.includes('openai.com')) {
      const response = await fetch(`${sanitizedBaseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json'
        })
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json(data);
      return res.json({ image: `data:image/png;base64,${data.data[0].b64_json}` });
    }

    const response = await fetch(`${sanitizedBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: jsonMode ? { type: 'json_object' } : undefined
      })
    });

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      return res.status(response.status).json({ error: { message: `AI Provider returned non-JSON response: ${text.substring(0, 100)}...` } });
    }
    
    res.status(response.status).json(data);
  } catch (error: any) {
    res.status(500).json({ error: { message: `Internal Proxy Error: ${error.message}` } });
  }
});

async function setup() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  if (!process.env.VERCEL) {
    const port = Number(process.env.PORT) || 3000;
    app.listen(port, '0.0.0.0', () => console.log(`Server running on port ${port}`));
  }
}

process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

setup();

export default app;
