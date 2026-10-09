using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media.Imaging;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace MyOverlayPOC
{
    public partial class MiniAiTabWindow
    {
        private WebView2CompositionControl? _geminiBrowser;
        private Task? _geminiInitialization;
        private bool _openingGemini;
        private const string GeminiUrl = "https://gemini.google.com/app";

        private async Task OpenGeminiAsync(string question)
        {
            if (_openingGemini) return;
            _openingGemini = true;
            BtnAskAi.IsEnabled = false;
            SuggestionsPopup.IsOpen = false;
            ResultsPanel.Visibility = Visibility.Collapsed;
            GeminiPanel.Visibility = Visibility.Visible;
            Width = Math.Max(Width, 720);
            Height = Math.Max(Height, 620);
            try
            {
                _geminiInitialization ??= InitializeGeminiAsync();
                await _geminiInitialization;
                if (!string.IsNullOrWhiteSpace(question))
                {
                    string result = "not_ready";
                    // Wait briefly for Google's client-side composer to become available.
                    // The page remains visible so consent or sign-in requests can be handled normally.
                    for (int attempt = 0; attempt < 30; attempt++)
                    {
                        result = await PrepareGeminiDraftAsync(question);
                        if (result != "not_ready") break;
                        await Task.Delay(250);
                    }
                    GeminiStatus.Text = result switch
                    {
                        "prepared" => "Your question is in Gemini below. Press Gemini's Send button. Continue the conversation directly there.",
                        "existing_draft" => "Gemini already has an unsent draft. Send or clear it first; your question above has been kept.",
                        _ => "Ask directly in Gemini below, or use Copy question and paste it. Complete any page prompts first."
                    };
                }
                if (_pendingScreenshots.Count > 0)
                    GeminiStatus.Text += " Use Copy image to paste the latest attached screenshot into Gemini; image features may require sign-in.";
                _geminiBrowser?.Focus();
            }
            catch (Exception ex)
            {
                GeminiStatus.Text = "Gemini could not open. Check your connection and click Reload. " + ex.Message;
                if (_geminiInitialization?.IsFaulted == true)
                {
                    _geminiBrowser?.Dispose();
                    _geminiBrowser = null;
                    GeminiBrowserHost.Children.Clear();
                    _geminiInitialization = null;
                }
            }
            finally
            {
                _openingGemini = false;
                BtnAskAi.IsEnabled = true;
            }
        }

        private async Task InitializeGeminiAsync()
        {
            GeminiStatus.Text = "Opening Gemini's website...";
            var browser = new WebView2CompositionControl();
            _geminiBrowser = browser;
            GeminiBrowserHost.Children.Add(browser);
            string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "OasyssFlux", "GeminiWebView");
            var environment = await CoreWebView2Environment.CreateAsync(null, folder);
            var options = environment.CreateCoreWebView2ControllerOptions();
            options.ProfileName = "GeminiGuest";
            options.IsInPrivateModeEnabled = true;
            await browser.EnsureCoreWebView2Async(environment, options);
            var core = browser.CoreWebView2;
            core.Settings.IsPasswordAutosaveEnabled = false;
            core.Settings.IsGeneralAutofillEnabled = false;
            core.NewWindowRequested += (s, e) =>
            {
                e.Handled = true;
                if (Uri.TryCreate(e.Uri, UriKind.Absolute, out var uri) && uri.Scheme == "https")
                    core.Navigate(uri.AbsoluteUri);
            };
            core.NavigationStarting += (s, e) =>
            {
                if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var uri) || uri.Scheme != "https")
                    e.Cancel = true;
            };
            core.NavigationCompleted += (s, e) =>
            {
                if (!e.IsSuccess)
                    GeminiStatus.Text = $"The page could not load ({e.WebErrorStatus}). Check your connection and click Reload.";
                else if (!_openingGemini)
                    GeminiStatus.Text = "Ask and continue the conversation directly below. Signed-out features are controlled by Google.";
            };
            core.Navigate(GeminiUrl);
        }

        private async Task<string> PrepareGeminiDraftAsync(string question)
        {
            // Never put the user's question into a different site, hidden input, or existing draft.
            string prompt = JsonSerializer.Serialize(question);
            string script = """
                (() => {
                    if (location.origin !== 'https://gemini.google.com') return 'not_ready';
                    const editors = [...document.querySelectorAll('[contenteditable="true"][role="textbox"], textarea')]
                        .filter(e => e.getClientRects().length && !e.disabled && e.getAttribute('aria-hidden') !== 'true');
                    if (editors.length !== 1) return 'not_ready';
                    const editor = editors[0];
                    const previous = editor.tagName === 'TEXTAREA' ? editor.value : editor.innerText;
                    if (previous.trim()) return 'existing_draft';
                    const prompt = __PROMPT__;
                    editor.focus();
                    if (editor.tagName === 'TEXTAREA') {
                        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(editor, prompt);
                        editor.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        if (!document.execCommand('insertText', false, prompt)) return 'not_ready';
                    }
                    const actual = editor.tagName === 'TEXTAREA' ? editor.value : editor.innerText;
                    return actual.trim() === prompt.trim() ? 'prepared' : 'existing_draft';
                })()
                """;
            string response = await _geminiBrowser!.ExecuteScriptAsync(script.Replace("__PROMPT__", prompt));
            return JsonSerializer.Deserialize<string>(response) ?? "not_ready";
        }

        private void CopyGeminiQuestion_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(SearchBox.Text)) return;
                Clipboard.SetText(SearchBox.Text);
                GeminiStatus.Text = "Question copied. Paste it into Gemini below.";
            }
            catch { GeminiStatus.Text = "The clipboard is busy. Try again."; }
        }

        private void CopyGeminiImage_Click(object sender, RoutedEventArgs e)
        {
            if (_pendingScreenshots.Count == 0)
            {
                GeminiStatus.Text = "Capture an image with the camera button first.";
                return;
            }
            try
            {
                if (_pendingScreenshots[^1].Preview is BitmapSource image)
                {
                    Clipboard.SetImage(image);
                    GeminiStatus.Text = "Latest screenshot copied. Paste into Gemini; Google may require sign-in for images.";
                }
            }
            catch { GeminiStatus.Text = "The clipboard is busy. Try again."; }
        }

        private void NewGeminiChat_Click(object sender, RoutedEventArgs e)
        {
            _geminiBrowser?.CoreWebView2?.Navigate(GeminiUrl);
        }

        private async void ReloadGemini_Click(object sender, RoutedEventArgs e)
        {
            if (_openingGemini) return;
            if (_geminiBrowser?.CoreWebView2 != null) _geminiBrowser.Reload();
            else await OpenGeminiAsync(SearchBox.Text.Trim());
        }
    }
}
