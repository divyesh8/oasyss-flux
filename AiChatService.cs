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

        public string? ImageBase64 { get; set; }
        public System.Windows.Media.ImageSource? ImagePreview { get; set; }
        public bool HasImage => !string.IsNullOrEmpty(ImageBase64);

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

        public override string ToString() => DisplayName;
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
            new AiModelInfo { DisplayName = "Gemini 2.5 Flash", ModelId = "gemini-2.5-flash", Provider = "Gemini" },
            new AiModelInfo { DisplayName = "Gemini 2.5 Pro", ModelId = "gemini-2.5-pro", Provider = "Gemini" },
            new AiModelInfo { DisplayName = "Gemini 2.5 Flash-Lite", ModelId = "gemini-2.5-flash-lite", Provider = "Gemini" },
            new AiModelInfo { DisplayName = "Gemini 2.0 Flash", ModelId = "gemini-2.0-flash", Provider = "Gemini" },
            new AiModelInfo { DisplayName = "Gemini 1.5 Flash", ModelId = "gemini-1.5-flash", Provider = "Gemini" },
            new AiModelInfo { DisplayName = "Gemini 1.5 Pro", ModelId = "gemini-1.5-pro", Provider = "Gemini" },
        };

        public async Task<string> SendMessageAsync(List<ChatMessage> history, string modelId, string apiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
                return "⚠️ Gemini API key not set. Click ⚙ Settings at the top to paste your key.\nGet a free key at: https://aistudio.google.com/apikey";

            using var client = new HttpClient();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{modelId}:generateContent?key={apiKey}";

            // Build Gemini conversation format with multimodal vision support
            var contents = new List<object>();
            foreach (var msg in history)
            {
                var parts = new List<object>();
                if (!string.IsNullOrEmpty(msg.ImageBase64))
                {
                    parts.Add(new
                    {
                        inline_data = new
                        {
                            mime_type = "image/png",
                            data = msg.ImageBase64
                        }
                    });
                }
                if (!string.IsNullOrEmpty(msg.Content))
                {
                    parts.Add(new { text = msg.Content });
                }
                contents.Add(new
                {
                    role = msg.IsUser ? "user" : "model",
                    parts = parts.ToArray()
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
            new AiModelInfo { DisplayName = "GPT-4o", ModelId = "gpt-4o", Provider = "ChatGPT" },
            new AiModelInfo { DisplayName = "GPT-4o Mini", ModelId = "gpt-4o-mini", Provider = "ChatGPT" },
            new AiModelInfo { DisplayName = "o3-mini", ModelId = "o3-mini", Provider = "ChatGPT" },
            new AiModelInfo { DisplayName = "o1", ModelId = "o1", Provider = "ChatGPT" },
            new AiModelInfo { DisplayName = "o1-mini", ModelId = "o1-mini", Provider = "ChatGPT" },
            new AiModelInfo { DisplayName = "ChatGPT-4o Latest", ModelId = "chatgpt-4o-latest", Provider = "ChatGPT" },
        };

        public async Task<string> SendMessageAsync(List<ChatMessage> history, string modelId, string apiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
                return "⚠️ OpenAI API key not set. Click ⚙ Settings at the top to paste your key.\nGet a key at: https://platform.openai.com/api-keys";

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            bool isReasoningModel = modelId.StartsWith("o1") || modelId.StartsWith("o3");
            bool supportsVision = !(modelId == "o1-mini" || modelId == "o3-mini");

            var messages = new List<object>();
            foreach (var m in history)
            {
                if (!string.IsNullOrEmpty(m.ImageBase64) && supportsVision)
                {
                    var contentList = new List<object>();
                    if (!string.IsNullOrEmpty(m.Content))
                    {
                        contentList.Add(new { type = "text", text = m.Content });
                    }
                    contentList.Add(new
                    {
                        type = "image_url",
                        image_url = new { url = $"data:image/png;base64,{m.ImageBase64}" }
                    });
                    messages.Add(new
                    {
                        role = m.IsUser ? "user" : "assistant",
                        content = contentList
                    });
                }
                else
                {
                    messages.Add(new
                    {
                        role = m.IsUser ? "user" : "assistant",
                        content = m.Content
                    });
                }
            }

            object requestObj = isReasoningModel
                ? new { model = modelId, messages, max_completion_tokens = 4096 }
                : new { model = modelId, messages, max_tokens = 4096 };

            var requestBody = JsonSerializer.Serialize(requestObj);

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
            new AiModelInfo { DisplayName = "Llama 3.3 70B Versatile", ModelId = "llama-3.3-70b-versatile", Provider = "Groq" },
            new AiModelInfo { DisplayName = "DeepSeek R1 Distill 70B", ModelId = "deepseek-r1-distill-llama-70b", Provider = "Groq" },
            new AiModelInfo { DisplayName = "Llama 3.1 8B Instant", ModelId = "llama-3.1-8b-instant", Provider = "Groq" },
            new AiModelInfo { DisplayName = "Qwen 3.8 27B Vision", ModelId = "qwen/qwen3.8-27b", Provider = "Groq" },
            new AiModelInfo { DisplayName = "OpenAI GPT-OSS 120B", ModelId = "openai/gpt-oss-120b", Provider = "Groq" },
            new AiModelInfo { DisplayName = "Gemma 2 9B", ModelId = "gemma2-9b-it", Provider = "Groq" },
        };

        public async Task<string> SendMessageAsync(List<ChatMessage> history, string modelId, string apiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
                return "⚠️ Groq API key not set. Click ⚙ Settings at the top to paste your key.\nGet a free key at: https://console.groq.com/keys";

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            bool supportsVision = modelId.Contains("qwen") || modelId.Contains("vision");

            var messages = new List<object>();
            foreach (var m in history)
            {
                if (!string.IsNullOrEmpty(m.ImageBase64) && supportsVision)
                {
                    var contentList = new List<object>();
                    if (!string.IsNullOrEmpty(m.Content))
                    {
                        contentList.Add(new { type = "text", text = m.Content });
                    }
                    contentList.Add(new
                    {
                        type = "image_url",
                        image_url = new { url = $"data:image/png;base64,{m.ImageBase64}" }
                    });
                    messages.Add(new
                    {
                        role = m.IsUser ? "user" : "assistant",
                        content = contentList
                    });
                }
                else
                {
                    messages.Add(new
                    {
                        role = m.IsUser ? "user" : "assistant",
                        content = m.Content
                    });
                }
            }

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
    //  Anthropic Claude Provider
    // ──────────────────────────────────────────────

    public class ClaudeProvider : IAiProvider
    {
        public string Name => "Claude";

        public List<AiModelInfo> AvailableModels => new()
        {
            new AiModelInfo { DisplayName = "Claude 3.7 Sonnet", ModelId = "claude-3-7-sonnet-20250219", Provider = "Claude" },
            new AiModelInfo { DisplayName = "Claude 3.5 Sonnet", ModelId = "claude-3-5-sonnet-20241022", Provider = "Claude" },
            new AiModelInfo { DisplayName = "Claude 3.5 Haiku", ModelId = "claude-3-5-haiku-20241022", Provider = "Claude" },
            new AiModelInfo { DisplayName = "Claude 3 Opus", ModelId = "claude-3-opus-20240229", Provider = "Claude" },
        };

        public async Task<string> SendMessageAsync(List<ChatMessage> history, string modelId, string apiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
                return "⚠️ Claude API key not set. Click ⚙ Settings at the top to paste your key.\nGet a key at: https://console.anthropic.com/settings/keys";

            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("x-api-key", apiKey);
            client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

            var messages = new List<object>();
            foreach (var m in history)
            {
                if (!string.IsNullOrEmpty(m.ImageBase64))
                {
                    var contentList = new List<object>
                    {
                        new
                        {
                            type = "image",
                            source = new
                            {
                                type = "base64",
                                media_type = "image/png",
                                data = m.ImageBase64
                            }
                        }
                    };
                    if (!string.IsNullOrEmpty(m.Content))
                    {
                        contentList.Add(new { type = "text", text = m.Content });
                    }
                    messages.Add(new
                    {
                        role = m.IsUser ? "user" : "assistant",
                        content = contentList
                    });
                }
                else
                {
                    messages.Add(new
                    {
                        role = m.IsUser ? "user" : "assistant",
                        content = m.Content
                    });
                }
            }

            var requestBody = JsonSerializer.Serialize(new
            {
                model = modelId,
                messages,
                max_tokens = 4096
            });

            var response = await client.PostAsync("https://api.anthropic.com/v1/messages",
                new StringContent(requestBody, Encoding.UTF8, "application/json"));

            var responseText = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return $"❌ Claude API Error ({(int)response.StatusCode}): {ExtractErrorMessage(responseText)}";
            }

            try
            {
                using var doc = JsonDocument.Parse(responseText);
                var contentArray = doc.RootElement.GetProperty("content");
                foreach (var item in contentArray.EnumerateArray())
                {
                    if (item.TryGetProperty("type", out var type) && type.GetString() == "text" &&
                        item.TryGetProperty("text", out var text))
                    {
                        return text.GetString() ?? "No response received.";
                    }
                }
                return "No response text received.";
            }
            catch
            {
                return $"❌ Could not parse Claude response:\n{responseText[..Math.Min(responseText.Length, 300)]}";
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
        public string ActiveModelId { get; set; } = "gemini-2.5-flash";
        public bool IsProcessing { get; private set; }

        // API Keys (set from settings)
        public string GeminiApiKey { get; set; } = "";
        public string OpenAiApiKey { get; set; } = "";
        public string GroqApiKey { get; set; } = "";
        public string ClaudeApiKey { get; set; } = "";

        public AiChatService()
        {
            var gemini = new GeminiProvider();
            var openAi = new OpenAiProvider();
            var groq = new GroqProvider();
            var claude = new ClaudeProvider();

            _providers = new Dictionary<string, IAiProvider>
            {
                { gemini.Name, gemini },
                { openAi.Name, openAi },
                { groq.Name, groq },
                { claude.Name, claude }
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
                "Claude" => ClaudeApiKey,
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

                // Zero API Key required: seamlessly answer via WebSearchHelper if no key is configured
                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    var searchResult = await WebSearchHelper.FetchWebAnswerAsync(userMessage);
                    var freeAnswer = WebSearchHelper.FormatTextAnswer(userMessage, searchResult);
                    Messages.Add(new ChatMessage
                    {
                        Role = "assistant",
                        Content = freeAnswer,
                        Timestamp = DateTime.Now
                    });
                    return freeAnswer;
                }

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

        public async Task<string> SendWithImageAsync(
            string userMessage,
            string base64Image,
            System.Windows.Media.ImageSource? preview = null,
            string? ocrContext = null)
        {
            // Add user message with attached image
            Messages.Add(new ChatMessage
            {
                Role = "user",
                Content = userMessage,
                ImageBase64 = base64Image,
                ImagePreview = preview,
                Timestamp = DateTime.Now
            });

            IsProcessing = true;

            try
            {
                // Ensure a vision-capable provider with an API key is selected if available
                string providerName = ActiveProviderName;
                string apiKey = GetApiKeyForProvider(providerName);

                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    if (!string.IsNullOrWhiteSpace(OpenAiApiKey))
                    {
                        providerName = "ChatGPT";
                        apiKey = OpenAiApiKey;
                        ActiveProviderName = "ChatGPT";
                        ActiveModelId = "gpt-4o";
                    }
                    else if (!string.IsNullOrWhiteSpace(GeminiApiKey))
                    {
                        providerName = "Gemini";
                        apiKey = GeminiApiKey;
                        ActiveProviderName = "Gemini";
                        ActiveModelId = "gemini-2.5-flash";
                    }
                    else if (!string.IsNullOrWhiteSpace(ClaudeApiKey))
                    {
                        providerName = "Claude";
                        apiKey = ClaudeApiKey;
                        ActiveProviderName = "Claude";
                        ActiveModelId = "claude-3-5-sonnet-20241022";
                    }
                }

                // If an API key is available, use multimodal AI vision
                if (!string.IsNullOrWhiteSpace(apiKey) && _providers.TryGetValue(providerName, out var provider))
                {
                    string modelId = ActiveModelId;
                    if (providerName == "ChatGPT" && (modelId == "o1-mini" || modelId == "o3-mini"))
                        modelId = "gpt-4o";
                    if (providerName == "Gemini" && !modelId.Contains("flash") && !modelId.Contains("pro"))
                        modelId = "gemini-2.5-flash";

                    var history = Messages.ToList();

                    // If OCR text was detected on the screenshot, enrich prompt with context so AI has both vision AND textual fidelity
                    if (!string.IsNullOrWhiteSpace(ocrContext))
                    {
                        var lastMsg = history.LastOrDefault(m => m.IsUser);
                        if (lastMsg != null)
                        {
                            var enrichedHistory = new List<ChatMessage>(history);
                            enrichedHistory[enrichedHistory.Count - 1] = new ChatMessage
                            {
                                Role = "user",
                                Content = $"{userMessage}\n\n[Screenshot Extracted Text]:\n{ocrContext.Trim()}",
                                ImageBase64 = base64Image,
                                ImagePreview = preview,
                                Timestamp = lastMsg.Timestamp
                            };
                            history = enrichedHistory;
                        }
                    }

                    var response = await provider.SendMessageAsync(history, modelId, apiKey);

                    // Add assistant response in the AI tab only
                    Messages.Add(new ChatMessage
                    {
                        Role = "assistant",
                        Content = response,
                        Timestamp = DateTime.Now
                    });

                    return response;
                }
                else
                {
                    // Zero API Key fallback: Answer the user's doubt from the screenshot content + Web Knowledge
                    string response = await GenerateZeroKeyLensAnswerAsync(userMessage, ocrContext);

                    Messages.Add(new ChatMessage
                    {
                        Role = "assistant",
                        Content = response,
                        Timestamp = DateTime.Now
                    });

                    return response;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[AiChatService] Vision send error: {ex.Message}");
                // Fallback to local analysis on error so the user always gets an answer in the AI tab
                string fallback = await GenerateZeroKeyLensAnswerAsync(userMessage, ocrContext);
                Messages.Add(new ChatMessage
                {
                    Role = "assistant",
                    Content = fallback,
                    Timestamp = DateTime.Now
                });
                return fallback;
            }
            finally
            {
                IsProcessing = false;
            }
        }

        private async Task<string> GenerateZeroKeyLensAnswerAsync(string userMessage, string? ocrContext)
        {
            var sb = new StringBuilder();
            sb.AppendLine("### 📷 Google Lens Analysis");

            if (!string.IsNullOrWhiteSpace(ocrContext))
            {
                // Find matching section in OCR for user query
                string relevantSnippet = ExtractRelevantOcrSnippet(ocrContext, userMessage);

                // Fetch web answers for the relevant snippet from the screenshot
                var webResult = await WebSearchHelper.FetchWebAnswerAsync(relevantSnippet);

                sb.AppendLine("\n**💡 Answer to your question:**");
                if (!string.IsNullOrWhiteSpace(webResult.InstantAnswer))
                {
                    sb.AppendLine(webResult.InstantAnswer.Trim());
                }
                else if (webResult.Snippets.Count > 0)
                {
                    sb.AppendLine(webResult.Snippets[0]);
                }
                else
                {
                    sb.AppendLine($"Analyzed the screenshot for: *\"{userMessage}\"*. Here is the relevant content found:");
                }

                if (!string.IsNullOrWhiteSpace(relevantSnippet))
                {
                    sb.AppendLine("\n**🖼️ Detected Content from Screenshot:**");
                    sb.AppendLine($"> {relevantSnippet}");
                }

                if (webResult.Snippets.Count > 1)
                {
                    sb.AppendLine("\n**🔎 Web Insights:**");
                    for (int i = 1; i < webResult.Snippets.Count; i++)
                    {
                        sb.AppendLine($"- {webResult.Snippets[i]}");
                    }
                }

                sb.AppendLine("\n**📝 Extracted Text from Screenshot (OCR):**");
                string cleanOcr = ocrContext.Trim();
                if (cleanOcr.Length > 800) cleanOcr = cleanOcr[..800] + "\n...";
                sb.AppendLine("```");
                sb.AppendLine(cleanOcr);
                sb.AppendLine("```");
            }
            else
            {
                sb.AppendLine("\n**💡 Screen Captured:**");
                sb.AppendLine("Screenshot attached. No text elements detected on screen.");
            }

            return sb.ToString().Trim();
        }

        private static string ExtractRelevantOcrSnippet(string ocrText, string userQuery)
        {
            if (string.IsNullOrWhiteSpace(ocrText)) return userQuery;

            var lines = ocrText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                               .Select(l => l.Trim())
                               .Where(l => l.Length > 2)
                               .ToList();

            var match = System.Text.RegularExpressions.Regex.Match(userQuery, @"(?:question|q|problem|exercise|item|no\.?)\s*(\d+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success)
            {
                string num = match.Groups[1].Value;
                var idx = lines.FindIndex(l => System.Text.RegularExpressions.Regex.Match(l, $@"(?:\b{num}[\.\)]|\bquestion\s*{num}\b)", System.Text.RegularExpressions.RegexOptions.IgnoreCase).Success);
                if (idx >= 0)
                {
                    return string.Join(" ", lines.Skip(idx).Take(4));
                }
            }

            // Error search
            if (userQuery.Contains("error", StringComparison.OrdinalIgnoreCase) ||
                userQuery.Contains("exception", StringComparison.OrdinalIgnoreCase) ||
                userQuery.Contains("bug", StringComparison.OrdinalIgnoreCase))
            {
                var err = lines.FirstOrDefault(l =>
                    l.Contains("Exception", StringComparison.OrdinalIgnoreCase) ||
                    l.Contains("Error", StringComparison.OrdinalIgnoreCase));
                if (!string.IsNullOrWhiteSpace(err)) return err;
            }

            // Default: pick the top 2-3 lines of text
            return string.Join(" ", lines.Take(3));
        }

        public void ClearHistory()
        {
            Messages.Clear();
        }
    }
}
