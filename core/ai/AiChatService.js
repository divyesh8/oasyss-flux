/**
 * Oasyss Flux — Divyesh Edition
 * Core Multi-Model AI Service
 * Supports Google Gemini, OpenAI ChatGPT, and Groq Cloud with zero extra dependencies.
 */

const https = require('https');
const EventEmitter = require('events');

const AvailableModels = {
  Gemini: [
    { displayName: 'Gemini 3.6 Flash', modelId: 'gemini-3.6-flash', provider: 'Gemini' },
    { displayName: 'Gemini 2.5 Flash', modelId: 'gemini-2.5-flash', provider: 'Gemini' }
  ],
  ChatGPT: [
    { displayName: 'GPT-4o Mini', modelId: 'gpt-4o-mini', provider: 'ChatGPT' },
    { displayName: 'GPT-4o', modelId: 'gpt-4o', provider: 'ChatGPT' },
    { displayName: 'GPT-3.5 Turbo', modelId: 'gpt-3.5-turbo', provider: 'ChatGPT' }
  ],
  Groq: [
    { displayName: 'Llama 3.1 70B (Fast)', modelId: 'llama-3.1-70b-versatile', provider: 'Groq' },
    { displayName: 'Llama 3.1 8B (Ultra-Fast)', modelId: 'llama-3.1-8b-instant', provider: 'Groq' }
  ]
};

class AiChatService extends EventEmitter {
  constructor() {
    super();
    this.engine = null;
    this.history = [];
  }

  bindEngine(engine) {
    this.engine = engine;
  }

  async initialize() {
    const logger = this.engine?.getSubsystem('logger');
    if (logger) {
      logger.info('ENGINE', 'AI multi-model inference provider ready (Gemini, ChatGPT, Groq)');
    }
  }

  getAvailableModels() {
    return AvailableModels;
  }

  async sendMessage(content, provider = 'Gemini', modelId = 'gemini-3.6-flash', apiKey = '') {
    const userMsg = { role: 'user', content, timestamp: new Date().toISOString() };
    this.history.push(userMsg);
    this.emit('message', userMsg);

    const logger = this.engine?.getSubsystem('logger');
    if (logger) {
      logger.info('ENGINE', `Dispatching AI query via ${provider} (${modelId})`);
    }

    let responseText = '';
    try {
      if (provider === 'Gemini') {
        responseText = await this._sendGemini(this.history, modelId, apiKey);
      } else if (provider === 'ChatGPT') {
        responseText = await this._sendOpenAi(this.history, modelId, apiKey);
      } else if (provider === 'Groq') {
        responseText = await this._sendGroq(this.history, modelId, apiKey);
      } else {
        responseText = `⚠️ Unsupported AI provider: ${provider}`;
      }
    } catch (err) {
      responseText = `❌ AI Request Error: ${err.message}`;
    }

    const assistantMsg = { role: 'assistant', content: responseText, timestamp: new Date().toISOString() };
    this.history.push(assistantMsg);
    this.emit('message', assistantMsg);

    return assistantMsg;
  }

  _sendGemini(history, modelId, apiKey) {
    if (!apiKey) {
      return Promise.resolve('⚠️ Gemini API key not set. Go to Settings → AI Configuration to add your key.\nGet a free key at: https://aistudio.google.com/apikey');
    }

    return new Promise((resolve, reject) => {
      const contents = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const payload = JSON.stringify({ contents });
      const path = `/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 400) {
              return resolve(`❌ Gemini API Error (${res.statusCode}): ${parsed?.error?.message || body.slice(0, 200)}`);
            }
            const candidate = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            resolve(candidate || 'No response received.');
          } catch (e) {
            resolve(`❌ Could not parse Gemini response:\n${body.slice(0, 200)}`);
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  _sendOpenAi(history, modelId, apiKey) {
    if (!apiKey) {
      return Promise.resolve('⚠️ OpenAI API key not set. Go to Settings → AI Configuration to add your key.\nGet a key at: https://platform.openai.com/api-keys');
    }

    return new Promise((resolve, reject) => {
      const messages = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      const payload = JSON.stringify({
        model: modelId,
        messages,
        max_tokens: 4096
      });

      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 400) {
              return resolve(`❌ OpenAI API Error (${res.statusCode}): ${parsed?.error?.message || body.slice(0, 200)}`);
            }
            const reply = parsed?.choices?.[0]?.message?.content;
            resolve(reply || 'No response received.');
          } catch (e) {
            resolve(`❌ Could not parse OpenAI response:\n${body.slice(0, 200)}`);
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  _sendGroq(history, modelId, apiKey) {
    if (!apiKey) {
      return Promise.resolve('⚠️ Groq API key not set. Go to Settings → AI Configuration to add your key.\nGet an ultra-fast key at: https://console.groq.com/keys');
    }

    return new Promise((resolve, reject) => {
      const messages = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      const payload = JSON.stringify({
        model: modelId,
        messages,
        max_tokens: 4096
      });

      const options = {
        hostname: 'api.groq.com',
        port: 443,
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 400) {
              return resolve(`❌ Groq API Error (${res.statusCode}): ${parsed?.error?.message || body.slice(0, 200)}`);
            }
            const reply = parsed?.choices?.[0]?.message?.content;
            resolve(reply || 'No response received.');
          } catch (e) {
            resolve(`❌ Could not parse Groq response:\n${body.slice(0, 200)}`);
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  clearHistory() {
    this.history = [];
    this.emit('cleared');
  }
}

module.exports = { AiChatService, AvailableModels };
