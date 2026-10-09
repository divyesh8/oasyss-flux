using System;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace MyOverlayPOC
{
    public partial class MiniAiTabWindow
    {
        private readonly AiChatService _aiChatService;
        private readonly GeminiSearchSession _apiSession = new(new GeminiProvider());
        private bool _apiBusy;

        private async void OpenGeminiWeb_Click(object sender, RoutedEventArgs e)
        {
            if (!_apiBusy) await OpenGeminiAsync(SearchBox.Text.Trim());
        }

        private async Task SendMiniGeminiAsync(string question, bool newConversation)
        {
            if (_apiBusy || _openingGemini) return;
            string key = _aiChatService.GetApiKeyForProvider("Gemini");
            if (string.IsNullOrWhiteSpace(key))
            {
                await OpenGeminiAsync(question);
                return;
            }
            var images = _pendingScreenshots.ToList();
            if (string.IsNullOrWhiteSpace(question) && images.Count == 0) return;
            if (string.IsNullOrWhiteSpace(question)) question = "Analyze the attached screenshots and answer the questions shown.";
            _apiBusy = true;
            BtnAskAi.IsEnabled = false;
            MiniGeminiModel.IsEnabled = false;
            ExpandToResults();
            Width = Math.Max(Width, 680);
            Height = Math.Max(Height, 540);
            SuggestionsPopup.IsOpen = false;
            LoadingIndicator.Visibility = Visibility.Visible;
            if (newConversation) AnswerContentPanel.Visibility = Visibility.Collapsed;
            string model = (MiniGeminiModel.SelectedItem as AiModelInfo)?.ModelId ?? GeminiProvider.DefaultModelId;
            AnswerHeader.Text = "Responding...";
            try
            {
                string answer = await _apiSession.SendAsync(question, images.Select(i => i.Base64).ToList(), model, key, newConversation);
                bool failed = GeminiSearchSession.IsFailure(answer);
                if (newConversation)
                {
                    AnswerBodyText.Text = answer;
                    FollowUpMessagesPanel.Children.Clear();
                }
                else AddApiExchange(question, answer);
                AnswerHeader.Text = failed ? "Request failed — retry or use Web" : "Gemini response";
                if (!failed)
                {
                    foreach (var image in images)
                    {
                        _pendingScreenshots.Remove(image);
                        image.RawBitmap?.Dispose();
                    }
                    UpdateAttachmentBars();
                    FollowUpBox.Clear();
                }
            }
            catch (Exception)
            {
                AnswerHeader.Text = "Request failed — please retry";
                if (newConversation) AnswerBodyText.Text = "Gemini could not complete this request. Your question and images have been kept.";
                else AddApiExchange(question, "Gemini could not complete this request. Please retry.");
            }
            finally
            {
                LoadingIndicator.Visibility = Visibility.Collapsed;
                AnswerContentPanel.Visibility = Visibility.Visible;
                BtnAskAi.IsEnabled = true;
                MiniGeminiModel.IsEnabled = true;
                _apiBusy = false;
                AnswerScrollViewer.ScrollToBottom();
                FollowUpBox.Focus();
            }
        }

        private void AddApiExchange(string question, string answer)
        {
            var card = new StackPanel { Margin = new Thickness(0, 12, 0, 6) };
            card.Children.Add(new TextBlock { Text = question, TextWrapping = TextWrapping.Wrap, Foreground = Brushes.LightSkyBlue, Margin = new Thickness(0, 0, 0, 6) });
            card.Children.Add(new TextBox
            {
                Text = answer, IsReadOnly = true, TextWrapping = TextWrapping.Wrap,
                FontFamily = new FontFamily("Consolas"), FontSize = 12, Background = Brushes.Transparent,
                Foreground = Brushes.WhiteSmoke, BorderThickness = new Thickness(0)
            });
            var copy = new Button { Content = "Copy response", HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 6, 0, 0) };
            copy.Click += (s, e) => { try { Clipboard.SetText(answer); } catch { AnswerHeader.Text = "Clipboard is busy — try again"; } };
            card.Children.Add(copy);
            FollowUpMessagesPanel.Children.Add(card);
        }
    }
}
