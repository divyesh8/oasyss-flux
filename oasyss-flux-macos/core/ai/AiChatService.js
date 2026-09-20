/**
 * Oasyss Flux — Divyesh Edition
 * Core Multi-Model AI Service (Hardened Network Boundaries)
 * Supports Google Gemini, OpenAI ChatGPT, and Groq Cloud via explicit HTTPS endpoints.
 * All queries sent to AI providers leave the local machine via encrypted TLS to reach
 * the respective provider's cloud inference infrastructure.
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

const ALLOWED_PROVIDERS = ['Gemini', 'ChatGPT', 'Groq'];

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

  validateRequest(content, provider, modelId) {
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Message content must be a non-empty string.');
    }
    if (content.length > 32768) {
      throw new Error('Message content exceeds maximum allowed length of 32KB.');
    }
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      throw new Error(`Unsupported AI provider: '${provider}'. Allowed: ${ALLOWED_PROVIDERS.join(', ')}`);
    }
    const validModels = AvailableModels[provider]?.map(m => m.modelId) || [];
    if (!validModels.includes(modelId)) {
      throw new Error(`Invalid model '${modelId}' for provider '${provider}'. Allowed: ${validModels.join(', ')}`);
    }
  }

  async sendMessage(content, provider = 'Gemini', modelId = 'gemini-3.6-flash', apiKey = '') {
    this.validateRequest(content, provider, modelId);

    const userMsg = { role: 'user', content, timestamp: new Date().toISOString() };
    this.history.push(userMsg);
    this.emit('message', userMsg);

    const logger = this.engine?.getSubsystem('logger');
    if (logger) {
      logger.info('ENGINE', `Dispatching outbound AI request to ${provider} (${modelId})`);
    }

    let responseText = '';
    try {
      if (provider === 'Gemini') {
        responseText = await this._sendGemini(this.history, modelId, apiKey);
      } else if (provider === 'ChatGPT') {
        responseText = await this._sendOpenAi(this.history, modelId, apiKey);
      } else if (provider === 'Groq') {
        responseText = await this._sendGroq(this.history, modelId, apiKey);
      }
    } catch (err) {
      // Sanitize error message to guarantee zero secret leakage
      const sanitized = err.message.replace(/[A-Za-z0-9_-]{20,}/g, '[REDACTED]');
      responseText = `❌ AI Request Error: ${sanitized}`;
    }

    const assistantMsg = { role: 'assistant', content: responseText, timestamp: new Date().toISOString() };
    this.history.push(assistantMsg);
    this.emit('message', assistantMsg);

    return assistantMsg;
  }

  _sendGemini(history, modelId, apiKey) {
    if (!apiKey) {
      return Promise.resolve('⚠️ Gemini API key not configured. Set your key in Settings → AI Configuration.');
    }

    return new Promise((resolve, reject) => {
      const contents = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const payload = JSON.stringify({ contents });

      // SECURITY: Pass API key via x-goog-api-key header instead of URL query parameter
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: `/v1beta/models/${encodeURIComponent(modelId)}:generateContent`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-goog-api-key': apiKey
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 400) {
              const errMsg = parsed?.error?.message ? parsed.error.message.replace(/[A-Za-z0-9_-]{20,}/g, '[REDACTED]') : 'API returned error';
              return resolve(`❌ Gemini API Error (${res.statusCode}): ${errMsg}`);
            }
            const candidate = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            resolve(candidate || 'No response received.');
          } catch {
            resolve('❌ Could not parse response from Gemini API.');
          }
        });
      });

      req.on('error', (err) => reject(new Error(`Network connection error: ${err.code || 'UNKNOWN'}`)));
      req.write(payload);
      req.end();
    });
  }

  _sendOpenAi(history, modelId, apiKey) {
    if (!apiKey) {
      return Promise.resolve('⚠️ OpenAI API key not configured. Set your key in Settings → AI Configuration.');
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
              const errMsg = parsed?.error?.message ? parsed.error.message.replace(/[A-Za-z0-9_-]{20,}/g, '[REDACTED]') : 'API returned error';
              return resolve(`❌ OpenAI API Error (${res.statusCode}): ${errMsg}`);
            }
            const reply = parsed?.choices?.[0]?.message?.content;
            resolve(reply || 'No response received.');
          } catch {
            resolve('❌ Could not parse response from OpenAI API.');
          }
        });
      });

      req.on('error', (err) => reject(new Error(`Network connection error: ${err.code || 'UNKNOWN'}`)));
      req.write(payload);
      req.end();
    });
  }

  _sendGroq(history, modelId, apiKey) {
    if (!apiKey) {
      return Promise.resolve('⚠️ Groq API key not configured. Set your key in Settings → AI Configuration.');
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
              const errMsg = parsed?.error?.message ? parsed.error.message.replace(/[A-Za-z0-9_-]{20,}/g, '[REDACTED]') : 'API returned error';
              return resolve(`❌ Groq API Error (${res.statusCode}): ${errMsg}`);
            }
            const reply = parsed?.choices?.[0]?.message?.content;
            resolve(reply || 'No response received.');
          } catch {
            resolve('❌ Could not parse response from Groq API.');
          }
        });
      });

      req.on('error', (err) => reject(new Error(`Network connection error: ${err.code || 'UNKNOWN'}`)));
      req.write(payload);
      req.end();
    });
  }

  clearHistory() {
    this.history = [];
    this.emit('cleared');
  }
}

module.exports = { AiChatService, AvailableModels, ALLOWED_PROVIDERS };
