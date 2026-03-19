import express from 'express';
import path from 'path';

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', node: process.version, env: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
});

app.get('/api/ai/config', (req, res) => {
  res.json({
    hasBuiltInGemini: !!(process.env.GEMINI_API_KEY || process.env.API_KEY),
    env: process.env.NODE_ENV
  });
});

app.post('/api/ai/proxy', async (req, res) => {
  const { baseUrl, apiKey, model, messages, jsonMode, isImageGen, prompt } = req.body;
  const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  try {
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
