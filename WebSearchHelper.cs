using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace MyOverlayPOC
{
    public class WebSearchResult
    {
        public string Query { get; set; } = string.Empty;
        public string? Heading { get; set; }
        public string? InstantAnswer { get; set; }
        public string? SourceUrl { get; set; }
        public List<string> Snippets { get; set; } = new();
        public List<string> RelatedTopics { get; set; } = new();
    }

    /// <summary>
    /// Provides zero-API-key web search, instant answers, and knowledge synthesis
    /// for Google Lens and the AI companion chat.
    /// </summary>
    public static class WebSearchHelper
    {
        private static readonly HttpClient _httpClient = CreateHttpClient();

        private static HttpClient CreateHttpClient()
        {
            var handler = new HttpClientHandler
            {
                AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate
            };
            var client = new HttpClient(handler)
            {
                Timeout = TimeSpan.FromSeconds(8)
            };
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
            return client;
        }

        public static async Task<WebSearchResult> FetchWebAnswerAsync(string query)
        {
            var result = new WebSearchResult { Query = query };
            if (string.IsNullOrWhiteSpace(query)) return result;

            // 1. Query DuckDuckGo Instant Answer API (fast, structured JSON, 0 API key)
            try
            {
                string ddgApiUrl = $"https://api.duckduckgo.com/?q={Uri.EscapeDataString(query)}&format=json&no_html=1&skip_disambig=1";
                string json = await _httpClient.GetStringAsync(ddgApiUrl);
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.TryGetProperty("Heading", out var headingProp))
                    result.Heading = headingProp.GetString();

                if (root.TryGetProperty("Answer", out var answerProp) && !string.IsNullOrWhiteSpace(answerProp.GetString()))
                    result.InstantAnswer = answerProp.GetString();
                else if (root.TryGetProperty("AbstractText", out var abstractProp) && !string.IsNullOrWhiteSpace(abstractProp.GetString()))
                    result.InstantAnswer = abstractProp.GetString();

                if (root.TryGetProperty("AbstractURL", out var urlProp) && !string.IsNullOrWhiteSpace(urlProp.GetString()))
                    result.SourceUrl = urlProp.GetString();

                if (root.TryGetProperty("RelatedTopics", out var topicsProp) && topicsProp.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in topicsProp.EnumerateArray())
                    {
                        if (item.TryGetProperty("Text", out var topicText) && !string.IsNullOrWhiteSpace(topicText.GetString()))
                        {
                            result.RelatedTopics.Add(topicText.GetString()!);
                            if (result.RelatedTopics.Count >= 3) break;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[WebSearch] DuckDuckGo API error: {ex.Message}");
            }

            // 2. Query DuckDuckGo HTML Search for top snippets
            try
            {
                string ddgHtmlUrl = $"https://html.duckduckgo.com/html/?q={Uri.EscapeDataString(query)}";
                using var request = new HttpRequestMessage(HttpMethod.Get, ddgHtmlUrl);
                using var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    string html = await response.Content.ReadAsStringAsync();
                    var snippetMatches = Regex.Matches(html, @"class=""result__snippet[^""]*"">([^<]+(?:<[^>]+>[^<]*)*)</a>", RegexOptions.IgnoreCase);
                    foreach (Match m in snippetMatches)
                    {
                        if (m.Groups.Count > 1)
                        {
                            string raw = m.Groups[1].Value;
                            string clean = Regex.Replace(raw, @"<[^>]+>", " ");
                            clean = WebUtility.HtmlDecode(clean).Trim();
                            clean = Regex.Replace(clean, @"\s+", " ");
                            if (clean.Length > 20 && !result.Snippets.Contains(clean))
                            {
                                result.Snippets.Add(clean);
                                if (result.Snippets.Count >= 3) break;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[WebSearch] DDG HTML search error: {ex.Message}");
            }

            // 3. Fallback to Wikipedia API if no instant answer was found
            if (string.IsNullOrWhiteSpace(result.InstantAnswer))
            {
                try
                {
                    string wikiSearchUrl = $"https://en.wikipedia.org/w/api.php?action=opensearch&search={Uri.EscapeDataString(query)}&limit=1&namespace=0&format=json";
                    string wikiJson = await _httpClient.GetStringAsync(wikiSearchUrl);
                    using var wikiDoc = JsonDocument.Parse(wikiJson);
                    var wikiArr = wikiDoc.RootElement;
                    if (wikiArr.GetArrayLength() >= 4)
                    {
                        var titles = wikiArr[1];
                        var urls = wikiArr[3];
                        if (titles.GetArrayLength() > 0)
                        {
                            string firstTitle = titles[0].GetString() ?? "";
                            if (!string.IsNullOrWhiteSpace(firstTitle))
                            {
                                string summaryUrl = $"https://en.wikipedia.org/api/rest_v1/page/summary/{Uri.EscapeDataString(firstTitle)}";
                                string summaryJson = await _httpClient.GetStringAsync(summaryUrl);
                                using var sumDoc = JsonDocument.Parse(summaryJson);
                                if (sumDoc.RootElement.TryGetProperty("extract", out var extractProp))
                                {
                                    result.InstantAnswer = extractProp.GetString();
                                    result.Heading ??= firstTitle;
                                    if (sumDoc.RootElement.TryGetProperty("content_urls", out var cu) &&
                                        cu.TryGetProperty("desktop", out var desk) &&
                                        desk.TryGetProperty("page", out var pageUrl))
                                    {
                                        result.SourceUrl ??= pageUrl.GetString();
                                    }
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"[WebSearch] Wikipedia API error: {ex.Message}");
                }
            }

            return result;
        }

        public static string FormatTextAnswer(string userMessage, WebSearchResult searchResult)
        {
            var sb = new StringBuilder();

            if (!string.IsNullOrWhiteSpace(searchResult.InstantAnswer))
            {
                if (!string.IsNullOrWhiteSpace(searchResult.Heading))
                {
                    sb.AppendLine($"### 💡 {searchResult.Heading}\n");
                }
                sb.AppendLine(searchResult.InstantAnswer.Trim());
                sb.AppendLine();
            }

            if (searchResult.Snippets.Count > 0)
            {
                sb.AppendLine("**🔎 Web Insights:**");
                foreach (var snippet in searchResult.Snippets)
                {
                    sb.AppendLine($"- {snippet}");
                }
                sb.AppendLine();
            }

            if (searchResult.RelatedTopics.Count > 0)
            {
                sb.AppendLine("**📌 Related Topics:**");
                foreach (var topic in searchResult.RelatedTopics)
                {
                    sb.AppendLine($"- {topic}");
                }
                sb.AppendLine();
            }

            if (string.IsNullOrWhiteSpace(searchResult.InstantAnswer) && searchResult.Snippets.Count == 0)
            {
                sb.AppendLine($"I searched the web for **\"{userMessage}\"**. You can view live Google search results using the link below:");
            }

            string googleSearchUrl = $"https://www.google.com/search?q={Uri.EscapeDataString(userMessage)}";
            sb.AppendLine($"🌐 [View Live Google Search Results]({googleSearchUrl})");
            sb.AppendLine("\n*(Answered via Web Search • Zero API keys required • Add an optional key in ⚙ Settings for conversational AI)*");

            return sb.ToString().Trim();
        }

        public static string SynthesizeGoogleLensAnswer(
            string userPrompt,
            string ocrText,
            WebSearchResult searchResult,
            string searchQuery,
            string searchUrl)
        {
            var sb = new StringBuilder();
            sb.AppendLine("### 📷 Google Lens Analysis");

            bool hasQuestion = !string.IsNullOrWhiteSpace(userPrompt) &&
                               !userPrompt.StartsWith("🔍 Google Lens", StringComparison.OrdinalIgnoreCase);

            // 1. Direct Answer Section
            sb.AppendLine("\n**💡 Answer:**");

            // Check if screen has an error or exception
            string? detectedError = FindDetectedError(ocrText);
            if (!string.IsNullOrWhiteSpace(detectedError))
            {
                sb.AppendLine($"• **Identified Error:** `{detectedError}`");
                if (searchResult.Snippets.Count > 0)
                {
                    sb.AppendLine($"• **Cause & Fix:** {searchResult.Snippets[0]}");
                }
                else if (!string.IsNullOrWhiteSpace(searchResult.InstantAnswer))
                {
                    sb.AppendLine($"• **Explanation:** {searchResult.InstantAnswer}");
                }
                else
                {
                    sb.AppendLine("• **Resolution:** Inspect the highlighted stack trace and check for missing null-checks, incorrect types, or invalid references.");
                }
            }
            else if (!string.IsNullOrWhiteSpace(searchResult.InstantAnswer))
            {
                if (hasQuestion)
                {
                    sb.AppendLine($"Regarding *\"{userPrompt}\"*: {searchResult.InstantAnswer.Trim()}");
                }
                else
                {
                    sb.AppendLine(searchResult.InstantAnswer.Trim());
                }
            }
            else if (searchResult.Snippets.Count > 0)
            {
                if (hasQuestion)
                {
                    sb.AppendLine($"Regarding *\"{userPrompt}\"*: {searchResult.Snippets[0]}");
                }
                else
                {
                    sb.AppendLine(searchResult.Snippets[0]);
                }
            }
            else if (!string.IsNullOrWhiteSpace(ocrText))
            {
                sb.AppendLine(hasQuestion
                    ? $"Analyzed the screen for *\"{userPrompt}\"*. Found relevant content matching your request."
                    : "Extracted visual elements and text from your whole screen. See detected content below.");
            }
            else
            {
                sb.AppendLine("Whole screen captured and copied to clipboard. Ready for visual search.");
            }

            // 2. Web Findings & Insights
            if (searchResult.Snippets.Count > 1 || searchResult.RelatedTopics.Count > 0)
            {
                sb.AppendLine("\n**🔎 Web Findings:**");
                for (int i = 1; i < searchResult.Snippets.Count; i++)
                {
                    sb.AppendLine($"- {searchResult.Snippets[i]}");
                }
                foreach (var topic in searchResult.RelatedTopics)
                {
                    sb.AppendLine($"- {topic}");
                }
            }

            // 3. OCR Text Block
            if (!string.IsNullOrWhiteSpace(ocrText))
            {
                string cleanOcr = ocrText.Trim();
                if (cleanOcr.Length > 900) cleanOcr = cleanOcr[..900] + "\n...";
                sb.AppendLine("\n**📝 Extracted Text on Screen (OCR):**");
                sb.AppendLine("```");
                sb.AppendLine(cleanOcr);
                sb.AppendLine("```");
            }

            // 4. Action Links
            sb.AppendLine("\n**🌐 Google Actions:**");
            if (!string.IsNullOrWhiteSpace(searchQuery))
            {
                sb.AppendLine($"- 🔍 [Open Google Search for \"{searchQuery}\"]({searchUrl})");
            }
            sb.AppendLine("- 🖼️ [Open Google Images](https://images.google.com) *(Screenshot copied to clipboard — press **Ctrl+V** in the search bar to reverse-search)*");

            return sb.ToString().Trim();
        }

        private static string? FindDetectedError(string ocrText)
        {
            if (string.IsNullOrWhiteSpace(ocrText)) return null;

            var errorKeywords = new[] { "Exception", "Error:", "Error ", "Failed", "FATAL", "Crash", "HRESULT", "CS[0-9]{4}" };
            var lines = ocrText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var line in lines)
            {
                var trimmed = line.Trim();
                if (errorKeywords.Any(k => trimmed.Contains(k, StringComparison.OrdinalIgnoreCase)) && trimmed.Length < 120)
                {
                    return trimmed;
                }
            }
            return null;
        }
    }
}
