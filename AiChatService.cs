using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Net.Http;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace MyOverlayPOC
{
    // ──────────────────────────────────────────────
    //  Data Models
    // ──────────────────────────────────────────────

    public class ChatMessage : INotifyPropertyChanged
    {
        private string _content = "";
        public string Role { get; set; } = "user";

        public string Content
        {
            get => _content;
            set { _content = value; OnPropertyChanged(); }
        }

        public DateTime Timestamp { get; set; } = DateTime.Now;
        public bool IsUser => Role == "user";

        public event PropertyChangedEventHandler? PropertyChanged;
        protected void OnPropertyChanged([CallerMemberName] string? name = null)
            => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
    }

    public class AiModelInfo
    {
        public string DisplayName { get; set; } = "";
        public string ModelId { get; set; } = "";
        public string Provider { get; set; } = "";
    }

    // ──────────────────────────────────────────────
    //  Provider Interface
    // ──────────────────────────────────────────────

    public interface IAiProvider
    {
        string Name { get; }
        List<AiModelInfo> AvailableModels { get; }
        Task<string> SendMessageAsync(List<ChatMessage> history, string modelId, string apiKey);
    }

    // ──────────────────────────────────────────────
    //  Google Gemini Provider (free tier)
    // ──────────────────────────────────────────────

    public class GeminiProvider : IAiProvider
    {
        public string Name => "Gemini";

        public List<AiModelInfo> AvailableModels => new()
        {
            new AiModelInfo { DisplayName = "Gemini 3.6 Flash", ModelId = "gemini-3.6-flash", Provider = "Gemini" },
        };

        public async Task<string> SendMessageAsync(List<ChatMessage> history, string modelId, string apiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
                return "⚠️ Gemini API key not set. Go to Settings → AI Configuration to add your key.\nGet a free key at: https://aistudio.google.com/apikey";

            using var client = new HttpClient();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{modelId}:generateContent?key={apiKey}";

            // Build Gemini conversation format
            var contents = new List<object>();
            foreach (var msg in history)
            {
                contents.Add(new
                {
                    role = msg.IsUser ? "user" : "model",
                    parts = new[] { new { text = msg.Content } }
                });
            }

            var requestBody = JsonSerializer.Serialize(new { contents });
            var response = await client.PostAsync(url,
                new StringContent(requestBody, Encoding.UTF8, "application/json"));

            var responseText = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return $"❌ Gemini API Error ({(int)response.StatusCode}): {ExtractErrorMessage(responseText)}";
            }

            try
            {
                using var doc = JsonDocument.Parse(responseText);
                var text = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();
                return text ?? "No response received.";
            }
            catch
            {
                return $"❌ Could not parse Gemini response:\n{responseText[..Math.Min(responseText.Length, 300)]}";
            }
        }

        private static string ExtractErrorMessage(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("error", out var err) &&
                    err.TryGetProperty("message", out var msg))
                    return msg.GetString() ?? json;
            }
            catch { }
            return json[..Math.Min(json.Length, 200)];
        }
    }

    // ──────────────────────────────────────────────
    //  OpenAI ChatGPT Provider
    // ──────────────────────────────────────────────

    public class OpenAiProvider : IAiProvider
    {
        public string Name => "ChatGPT";

        public List<AiModelInfo> AvailableModels => new()
        {
            new AiModelInfo { DisplayName = "GPT-4o Mini", ModelId = "gpt-4o-mini", Provider = "ChatGPT" },
            new AiModelInfo { DisplayName = "GPT-4o", ModelId = "gpt-4o", Provider = "ChatGPT" },
            new AiModelInfo { DisplayName = "GPT-3.5 Turbo", ModelId = "gpt-3.5-turbo", Provider = "ChatGPT" },
        };

        public async Task<string> SendMessageAsync(List<ChatMessage> history, string modelId, string apiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
                return "⚠️ OpenAI API key not set. Go to Settings → AI Configuration to add your key.\nGet a key at: https://platform.openai.com/api-keys";

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            var messages = history.Select(m => new
            {
                role = m.IsUser ? "user" : "assistant",
                content = m.Content
            }).ToList();

            var requestBody = JsonSerializer.Serialize(new
            {
                model = modelId,
                messages,
                max_tokens = 4096
            });

            var response = await client.PostAsync("https://api.openai.com/v1/chat/completions",
                new StringContent(requestBody, Encoding.UTF8, "application/json"));

            var responseText = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return $"❌ OpenAI API Error ({(int)response.StatusCode}): {ExtractErrorMessage(responseText)}";
            }

            try
            {
                using var doc = JsonDocument.Parse(responseText);
                var text = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString();
                return text ?? "No response received.";
            }
            catch
            {
                return $"❌ Could not parse OpenAI response:\n{responseText[..Math.Min(responseText.Length, 300)]}";
            }
        }

        private static string ExtractErrorMessage(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("error", out var err) &&
                    err.TryGetProperty("message", out var msg))
                    return msg.GetString() ?? json;
            }
            catch { }
            return json[..Math.Min(json.Length, 200)];
        }
    }

    // ──────────────────────────────────────────────
    //  Groq Provider (OpenAI-compatible)
    // ──────────────────────────────────────────────

    public class GroqProvider : IAiProvider
    {
        public string Name => "Groq";

        public List<AiModelInfo> AvailableModels => new()
        {
            new AiModelInfo { DisplayName = "Llama 3.1 70B", ModelId = "llama-3.1-70b-versatile", Provider = "Groq" },
            new AiModelInfo { DisplayName = "Llama 3.1 8B", ModelId = "llama-3.1-8b-instant", Provider = "Groq" },
            new AiModelInfo { DisplayName = "Mixtral 8x7B", ModelId = "mixtral-8x7b-32768", Provider = "Groq" },
            new AiModelInfo { DisplayName = "Gemma 2 9B", ModelId = "gemma2-9b-it", Provider = "Groq" },
        };

        public async Task<string> SendMessageAsync(List<ChatMessage> history, string modelId, string apiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
                return "⚠️ Groq API key not set. Go to Settings → AI Configuration to add your key.\nGet a free key at: https://console.groq.com/keys";

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            var messages = history.Select(m => new
            {
                role = m.IsUser ? "user" : "assistant",
                content = m.Content
            }).ToList();

            var requestBody = JsonSerializer.Serialize(new
            {
                model = modelId,
                messages,
                max_tokens = 4096
            });

            var response = await client.PostAsync("https://api.groq.com/openai/v1/chat/completions",
                new StringContent(requestBody, Encoding.UTF8, "application/json"));

            var responseText = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return $"❌ Groq API Error ({(int)response.StatusCode}): {ExtractErrorMessage(responseText)}";
            }

            try
            {
                using var doc = JsonDocument.Parse(responseText);
                var text = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString();
                return text ?? "No response received.";
            }
            catch
            {
                return $"❌ Could not parse Groq response:\n{responseText[..Math.Min(responseText.Length, 300)]}";
            }
        }

        private static string ExtractErrorMessage(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("error", out var err) &&
                    err.TryGetProperty("message", out var msg))
                    return msg.GetString() ?? json;
            }
            catch { }
            return json[..Math.Min(json.Length, 200)];
        }
    }

    // ──────────────────────────────────────────────
    //  AI Chat Service Orchestrator
    // ──────────────────────────────────────────────

    public class AiChatService
    {
        private readonly Dictionary<string, IAiProvider> _providers;
        public ObservableCollection<ChatMessage> Messages { get; } = new();

        public string ActiveProviderName { get; set; } = "Gemini";
        public string ActiveModelId { get; set; } = "gemini-3.6-flash";
        public bool IsProcessing { get; private set; }

        // API Keys (set from settings)
        public string GeminiApiKey { get; set; } = "";
        public string OpenAiApiKey { get; set; } = "";
        public string GroqApiKey { get; set; } = "";

        public AiChatService()
        {
            var gemini = new GeminiProvider();
            var openAi = new OpenAiProvider();
            var groq = new GroqProvider();

            _providers = new Dictionary<string, IAiProvider>
            {
                { gemini.Name, gemini },
                { openAi.Name, openAi },
                { groq.Name, groq }
            };
        }

        public List<string> GetProviderNames() => _providers.Keys.ToList();

        public List<AiModelInfo> GetModelsForProvider(string providerName)
        {
            return _providers.TryGetValue(providerName, out var provider)
                ? provider.AvailableModels
                : new List<AiModelInfo>();
        }

        public string GetApiKeyForProvider(string providerName)
        {
            return providerName switch
            {
                "Gemini" => GeminiApiKey,
                "ChatGPT" => OpenAiApiKey,
                "Groq" => GroqApiKey,
                _ => ""
            };
        }

        public async Task<string> SendAsync(string userMessage)
        {
            if (string.IsNullOrWhiteSpace(userMessage)) return "";

            // Add user message
            Messages.Add(new ChatMessage
            {
                Role = "user",
                Content = userMessage,
                Timestamp = DateTime.Now
            });

            IsProcessing = true;

            try
            {
                if (!_providers.TryGetValue(ActiveProviderName, out var provider))
                    return $"❌ Unknown provider: {ActiveProviderName}";

                var apiKey = GetApiKeyForProvider(ActiveProviderName);
                var history = Messages.ToList();
                var response = await provider.SendMessageAsync(history, ActiveModelId, apiKey);

                // Add assistant message
                Messages.Add(new ChatMessage
                {
                    Role = "assistant",
                    Content = response,
                    Timestamp = DateTime.Now
                });

                return response;
            }
            catch (HttpRequestException ex)
            {
                var errorMsg = $"❌ Network error: {ex.Message}";
                Messages.Add(new ChatMessage { Role = "assistant", Content = errorMsg, Timestamp = DateTime.Now });
                return errorMsg;
            }
            catch (TaskCanceledException)
            {
                var errorMsg = "❌ Request timed out. Please try again.";
                Messages.Add(new ChatMessage { Role = "assistant", Content = errorMsg, Timestamp = DateTime.Now });
                return errorMsg;
            }
            catch (Exception ex)
            {
                var errorMsg = $"❌ Error: {ex.Message}";
                Messages.Add(new ChatMessage { Role = "assistant", Content = errorMsg, Timestamp = DateTime.Now });
                return errorMsg;
            }
            finally
            {
                IsProcessing = false;
            }
        }

        public void ClearHistory()
        {
            Messages.Clear();
        }
    }
}
