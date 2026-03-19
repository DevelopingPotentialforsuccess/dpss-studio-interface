import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', node: process.version, env: process.env.NODE_ENV });
  });

  app.post('/api/ai/proxy', async (req, res) => {
    const { baseUrl, apiKey, model, messages, jsonMode, isImageGen, prompt } = req.body;
    const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    try {
      if (isImageGen && baseUrl.includes('openai.com')) {
        console.log(`[Proxy] Image generation request for ${model} at ${sanitizedBaseUrl}`);
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
        if (!response.ok) {
          console.error(`[Proxy] OpenAI Image Error:`, data);
          return res.status(response.status).json(data);
        }
        // Normalize to a common format for the frontend
        return res.json({ image: `data:image/png;base64,${data.data[0].b64_json}` });
      }

      console.log(`[Proxy] Chat request for ${model} at ${sanitizedBaseUrl}`);
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
        console.error(`[Proxy] Non-JSON response from ${baseUrl}:`, text);
        return res.status(response.status).json({ error: { message: `AI Provider returned non-JSON response: ${text.substring(0, 100)}...` } });
      }

      if (!response.ok) {
        console.error(`[Proxy] Error from ${baseUrl} (${response.status}):`, data);
      }
      
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error(`[Proxy] Critical failure for ${baseUrl}:`, error);
      res.status(500).json({ error: { message: `Internal Proxy Error: ${error.message}` } });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(3000, '0.0.0.0', () => console.log('Server running on port 3000'));
  return app;
}

const appPromise = startServer();
export default appPromise;
