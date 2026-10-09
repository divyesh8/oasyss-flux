using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace MyOverlayPOC
{
    public class GeminiProvider : IAiProvider
    {
        public const string DefaultModelId = "gemini-3.8-flash";
        public static string DefaultGeminiApiKey => Environment.GetEnvironmentVariable("GEMINI_API_KEY") ?? "";
        private static readonly HttpClient SharedClient = new() { Timeout = TimeSpan.FromSeconds(120) };
        private readonly HttpClient _client;
        public GeminiProvider(HttpClient? client = null) => _client = client ?? SharedClient;
        public string Name => "Gemini";
        public List<AiModelInfo> AvailableModels => new()
        {
            new() { DisplayName = "Gemini 3.8 Flash (Stable)", ModelId = DefaultModelId, Provider = Name },
            new() { DisplayName = "Gemini 3.5 Flash-Lite", ModelId = "gemini-3.5-flash-lite", Provider = Name },
            new() { DisplayName = "Gemini 3.1 Pro (Preview)", ModelId = "gemini-3.1-pro-preview", Provider = Name },
            new() { DisplayName = "Gemini Flash Latest", ModelId = "gemini-flash-latest", Provider = Name },
            new() { DisplayName = "Gemini 3.5 Flash", ModelId = "gemini-3.5-flash", Provider = Name },
            new() { DisplayName = "Gemini 3.1 Flash-Lite", ModelId = "gemini-3.1-flash-lite", Provider = Name },
            new() { DisplayName = "Gemini 2.5 Flash (Existing projects)", ModelId = "gemini-2.5-flash", Provider = Name },
            new() { DisplayName = "Gemini 2.5 Pro (Existing projects)", ModelId = "gemini-2.5-pro", Provider = Name }
        };

        public async Task<string> SendMessageAsync(List<ChatMessage> history, string modelId, string apiKey)
        {
            apiKey = (string.IsNullOrWhiteSpace(apiKey) ? DefaultGeminiApiKey : apiKey).Trim();
            if (apiKey.Length == 0) return "⚠️ No Gemini API key is configured. Use Gemini Web for Google's signed-out website.";
            if (string.IsNullOrWhiteSpace(modelId)) modelId = DefaultModelId;
            if (modelId.Any(c => !char.IsAsciiLetterOrDigit(c) && c != '-' && c != '.' && c != '_'))
                return "❌ Invalid Gemini model name.";

            var contents = new List<object>();
            foreach (var message in history)
            {
                var parts = new List<object>();
                var images = new List<string>();
                if (!string.IsNullOrEmpty(message.ImageBase64)) images.Add(message.ImageBase64);
                if (message.ImagesBase64 != null) images.AddRange(message.ImagesBase64);
                foreach (var image in images.Where(i => !string.IsNullOrEmpty(i)).Distinct())
                    parts.Add(new { inline_data = new { mime_type = "image/png", data = image } });
                if (!string.IsNullOrEmpty(message.Content)) parts.Add(new { text = message.Content });
                if (parts.Count > 0) contents.Add(new { role = message.IsUser ? "user" : "model", parts });
            }
            if (contents.Count == 0) return "⚠️ Enter a question or attach an image.";
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post,
                    $"https://generativelanguage.googleapis.com/v1beta/models/{modelId}:generateContent");
                request.Headers.Add("x-goog-api-key", apiKey);
                request.Content = new StringContent(JsonSerializer.Serialize(new { contents }), Encoding.UTF8, "application/json");
                using var response = await _client.SendAsync(request);
                string body = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode)
                {
                    string message = "Google could not complete the request.";
                    try
                    {
                        using var error = JsonDocument.Parse(body);
                        if (error.RootElement.TryGetProperty("error", out var detail) && detail.TryGetProperty("message", out var text))
                            message = text.GetString() ?? message;
                    }
                    catch (JsonException) { }
                    message = message.Replace(apiKey, "[redacted]", StringComparison.Ordinal);
                    return $"❌ Gemini ({(int)response.StatusCode}, {modelId}): {message}";
                }
                using var document = JsonDocument.Parse(body);
                var root = document.RootElement;
                if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                {
                    string reason = root.TryGetProperty("promptFeedback", out var feedback) && feedback.TryGetProperty("blockReason", out var block)
                        ? block.GetString() ?? "unknown" : "no candidate returned";
                    return $"⚠️ Gemini returned no answer ({reason}).";
                }
                var candidate = candidates[0];
                var answer = new StringBuilder();
                if (candidate.TryGetProperty("content", out var content) && content.TryGetProperty("parts", out var responseParts))
                {
                    foreach (var part in responseParts.EnumerateArray())
                    {
                        if (part.TryGetProperty("thought", out var thought) && thought.ValueKind == JsonValueKind.True) continue;
                        if (part.TryGetProperty("text", out var text)) answer.Append(text.GetString());
                    }
                }
                string finish = candidate.TryGetProperty("finishReason", out var finishReason) ? finishReason.GetString() ?? "" : "";
                if (answer.Length == 0) return $"⚠️ Gemini returned no text ({finish}).";
                if (finish == "MAX_TOKENS") answer.Append("\n\n⚠️ Gemini reached its response limit. Ask it to continue from the last line.");
                return answer.ToString();
            }
            catch (TaskCanceledException) { return "❌ Gemini timed out. Your question is kept; please retry."; }
            catch (HttpRequestException) { return "❌ Cannot connect to Gemini. Check your internet connection and retry."; }
            catch (JsonException) { return "❌ Gemini returned an unreadable response. Please retry."; }
        }
    }

    /// <summary>Commits only successful exchanges so retries do not duplicate user turns.</summary>
    public sealed class GeminiSearchSession
    {
        private readonly IAiProvider _provider;
        private readonly List<ChatMessage> _history = new();
        public GeminiSearchSession(IAiProvider provider) => _provider = provider;
        public IReadOnlyList<ChatMessage> History => _history.AsReadOnly();
        public static bool IsFailure(string answer) => string.IsNullOrWhiteSpace(answer) || answer.StartsWith("❌") || answer.StartsWith("⚠️");

        public async Task<string> SendAsync(string question, List<string> images, string model, string key, bool newConversation)
        {
            var requestHistory = newConversation ? new List<ChatMessage>() : new List<ChatMessage>(_history);
            requestHistory.Add(new ChatMessage { Role = "user", Content = question, ImagesBase64 = new List<string>(images) });
            string answer = await _provider.SendMessageAsync(requestHistory, model, key);
            if (!IsFailure(answer))
            {
                _history.Clear();
                _history.AddRange(requestHistory);
                _history.Add(new ChatMessage { Role = "assistant", Content = answer });
            }
            return answer;
        }
    }
}
