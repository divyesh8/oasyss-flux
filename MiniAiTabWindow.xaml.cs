using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;

namespace MyOverlayPOC
{
    public class ScreenshotItem
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Base64 { get; set; } = "";
        public ImageSource? Preview { get; set; }
        public System.Drawing.Bitmap? RawBitmap { get; set; }
        public int Index { get; set; }
    }

    public partial class MiniAiTabWindow : Window
    {
        private readonly AiChatService _aiChatService;
        private readonly DispatcherTimer _suggestTimer;
        private readonly List<ScreenshotItem> _pendingScreenshots = new();
        private string _lastTopic = "";
        public bool IsCompletelyTransparent { get; private set; } = false;

        [DllImport("gdi32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool DeleteObject(IntPtr hObject);

        public MiniAiTabWindow(AiChatService aiChatService)
        {
            InitializeComponent();
            _aiChatService = aiChatService;

            _suggestTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(220)
            };
            _suggestTimer.Tick += SuggestTimer_Tick;

            this.SourceInitialized += (s, e) =>
            {
                var hwnd = new WindowInteropHelper(this).Handle;

                // 1. Exclude window from display and screen capture (stealth: invisible to OBS, Zoom, Teams, Discord, Snipping Tool, Proctoring tools)
                DisplayAffinityManager.ApplyCaptureAffinity(hwnd);

                // 2. Hide completely from Windows Alt+Tab and task switcher
                long exStyle = MainWindow.GetWindowLongPtrSafe(hwnd, MainWindow.GWL_EXSTYLE);
                MainWindow.SetWindowLongPtrSafe(hwnd, MainWindow.GWL_EXSTYLE, (exStyle | MainWindow.WS_EX_TOOLWINDOW) & ~MainWindow.WS_EX_APPWINDOW);

                // 3. Explicitly delete from Windows Shell taskbar
                TaskbarManager.HideFromTaskbar(hwnd);
            };

            this.Loaded += (s, e) =>
            {
                PositionAtTopCenter();
                FocusSearchBox();
            };
        }

        public void PositionAtTopCenter()
        {
            try
            {
                var screen = System.Windows.Forms.Screen.FromPoint(System.Windows.Forms.Cursor.Position);
                double screenLeft = screen.Bounds.Left;
                double screenWidth = screen.Bounds.Width;
                double screenTop = screen.Bounds.Top;

                this.Left = Math.Max(screenLeft + 20, screenLeft + (screenWidth - this.Width) / 2);
                this.Top = screenTop + 45;
            }
            catch
            {
                this.Left = 200;
                this.Top = 60;
            }
        }

        public void FocusSearchBox()
        {
            Dispatcher.InvokeAsync(() =>
            {
                SearchBox.Focus();
                SearchBox.SelectAll();
            }, DispatcherPriority.Input);
        }

        public bool IsInputFocused => SearchBox.IsKeyboardFocused;

        #region Instant Transparent Ghost Mode (Shift+T)
        public void ToggleCompleteTransparency()
        {
            IsCompletelyTransparent = !IsCompletelyTransparent;
            IntPtr hwnd = new WindowInteropHelper(this).Handle;

            if (IsCompletelyTransparent)
            {
                SuggestionsPopup.IsOpen = false;
                this.Opacity = 0.0;
                this.IsHitTestVisible = false;

                if (hwnd != IntPtr.Zero)
                {
                    long extendedStyle = MainWindow.GetWindowLongPtrSafe(hwnd, MainWindow.GWL_EXSTYLE);
                    MainWindow.SetWindowLongPtrSafe(hwnd, MainWindow.GWL_EXSTYLE, extendedStyle | MainWindow.WS_EX_TRANSPARENT);
                }
            }
            else
            {
                if (hwnd != IntPtr.Zero)
                {
                    long extendedStyle = MainWindow.GetWindowLongPtrSafe(hwnd, MainWindow.GWL_EXSTYLE);
                    MainWindow.SetWindowLongPtrSafe(hwnd, MainWindow.GWL_EXSTYLE, extendedStyle & ~MainWindow.WS_EX_TRANSPARENT);
                }

                this.IsHitTestVisible = true;
                this.Opacity = 1.0;
                this.Activate();
                FocusSearchBox();
            }
        }

        private void BtnTransparency_Click(object sender, RoutedEventArgs e)
        {
            ToggleCompleteTransparency();
        }
        #endregion

        #region Drag & Move
        private void RootBorder_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (e.OriginalSource is TextBox || e.OriginalSource is System.Windows.Controls.Primitives.TextBoxBase)
                return;

            if (e.OriginalSource is DependencyObject dep && FindVisualParent<Button>(dep) != null)
                return;

            if (e.ButtonState == MouseButtonState.Pressed)
            {
                try { DragMove(); } catch { }
            }
        }

        private static T? FindVisualParent<T>(DependencyObject child) where T : DependencyObject
        {
            DependencyObject parentObject = child;
            while (parentObject != null)
            {
                if (parentObject is T parent) return parent;
                parentObject = VisualTreeHelper.GetParent(parentObject);
            }
            return null;
        }
        #endregion

        #region Search Box & Autocomplete Suggestions
        private void SearchBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            bool hasText = !string.IsNullOrWhiteSpace(SearchBox.Text);
            BtnClearSearch.Visibility = hasText ? Visibility.Visible : Visibility.Collapsed;

            _suggestTimer.Stop();
            if (hasText && SearchBox.IsKeyboardFocused && ResultsPanel.Visibility != Visibility.Visible)
            {
                _suggestTimer.Start();
            }
            else
            {
                SuggestionsPopup.IsOpen = false;
            }
        }

        private async void SuggestTimer_Tick(object? sender, EventArgs e)
        {
            _suggestTimer.Stop();
            string query = SearchBox.Text.Trim();
            if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
            {
                SuggestionsPopup.IsOpen = false;
                return;
            }

            try
            {
                var suggestions = await WebSearchHelper.GetGoogleSuggestionsAsync(query);
                if (suggestions.Count > 0 && SearchBox.IsKeyboardFocused)
                {
                    SuggestionsList.ItemsSource = suggestions;
                    SuggestionsPopup.IsOpen = true;
                }
                else
                {
                    SuggestionsPopup.IsOpen = false;
                }
            }
            catch
            {
                SuggestionsPopup.IsOpen = false;
            }
        }

        private void SuggestionItem_Click(object sender, MouseButtonEventArgs e)
        {
            if (sender is FrameworkElement elem && elem.DataContext is string suggestion)
            {
                SuggestionsPopup.IsOpen = false;
                SearchBox.Text = suggestion;
                SearchBox.CaretIndex = suggestion.Length;
                _ = ExecuteSearchAsync(suggestion);
            }
        }

        private void BtnClearSearch_Click(object sender, RoutedEventArgs e)
        {
            SearchBox.Text = string.Empty;
            SuggestionsPopup.IsOpen = false;
            SearchBox.Focus();
        }

        private async void SearchBox_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                e.Handled = true;
                SuggestionsPopup.IsOpen = false;
                await ExecuteSearchAsync(SearchBox.Text.Trim());
            }
        }

        private void SearchBox_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            // Even when the cursor is actively typing in the search box, Shift+T immediately triggers instant transparency
            if (e.Key == Key.T && (Keyboard.Modifiers & ModifierKeys.Shift) == ModifierKeys.Shift &&
                !Keyboard.Modifiers.HasFlag(ModifierKeys.Control))
            {
                e.Handled = true;
                ToggleCompleteTransparency();
                return;
            }

            if (e.Key == Key.Escape)
            {
                e.Handled = true;
                if (IsCompletelyTransparent)
                {
                    ToggleCompleteTransparency();
                    return;
                }

                if (SuggestionsPopup.IsOpen)
                {
                    SuggestionsPopup.IsOpen = false;
                    return;
                }

                if (ResultsPanel.Visibility == Visibility.Visible)
                {
                    CollapseResults();
                    return;
                }

                // Transform / restore back to main window
                MainWindow.Instance?.ToggleMiniAiTab();
            }
            else if (e.Key == Key.C && Keyboard.Modifiers == ModifierKeys.Shift && string.IsNullOrWhiteSpace(SearchBox.Text))
            {
                e.Handled = true;
                MainWindow.Instance?.ToggleMiniAiTab();
            }
        }

        private async void BtnAskAi_Click(object sender, RoutedEventArgs e)
        {
            SuggestionsPopup.IsOpen = false;
            await ExecuteSearchAsync(SearchBox.Text.Trim());
        }
        #endregion

        #region Core AI Search Execution (Zero Login • No API Key)
        public async Task ExecuteSearchAsync(string query)
        {
            var screenshots = _pendingScreenshots.ToList();
            if (string.IsNullOrWhiteSpace(query) && screenshots.Count == 0) return;

            // Expand window to show results directly below the search bar
            ExpandToResults();

            // Set loading state
            LoadingIndicator.Visibility = Visibility.Visible;
            AnswerContentPanel.Visibility = Visibility.Collapsed;
            AnswerHeader.Text = screenshots.Count > 0 
                ? (screenshots.Count > 1 
                    ? $"✨ AI Overview • Google Lens ({screenshots.Count} Screens) • by div" 
                    : "✨ AI Overview • Google Lens • by div")
                : "✨ AI Overview • by div";
            AnswerBodyText.Text = "";

            // Reset conversation thread for new search
            _lastTopic = query;
            FollowUpMessagesPanel.Children.Clear();
            FollowUpBox.Text = "";

            // Clear pending attachment UI state
            _pendingScreenshots.Clear();
            UpdateAttachmentBars();

            try
            {
                string answerText = "";
                string geminiApiKey = !string.IsNullOrWhiteSpace(_aiChatService?.GeminiApiKey)
                    ? _aiChatService.GeminiApiKey
                    : GeminiProvider.DefaultGeminiApiKey;

                // Extract OCR from all attached screens
                var ocrSb = new System.Text.StringBuilder();
                for (int i = 0; i < screenshots.Count; i++)
                {
                    var s = screenshots[i];
                    if (s.RawBitmap != null)
                    {
                        try
                        {
                            string ocr = await ExtractTextFromBitmapAsync(s.RawBitmap);
                            if (!string.IsNullOrWhiteSpace(ocr))
                            {
                                ocrSb.AppendLine($"[Screen #{s.Index} Text]:\n{ocr.Trim()}");
                            }
                        }
                        catch { }
                    }
                }
                string fullOcr = ocrSb.ToString().Trim();

                // Call Real Google Gemini 3.5 Flash
                try
                {
                    var gemini = new GeminiProvider();
                    string prompt;
                    if (screenshots.Count > 0)
                    {
                        prompt = string.IsNullOrWhiteSpace(query)
                            ? $"You are Google Gemini AI. Analyze all {screenshots.Count} attached screenshot(s) in detail, solve visible questions, identify errors or code, and provide an accurate, clear response."
                            : $"You are Google Gemini AI. Based on the {screenshots.Count} attached screenshot(s), answer this question:\n\n{query}";

                        if (!string.IsNullOrWhiteSpace(fullOcr))
                        {
                            prompt += $"\n\nExtracted Screen Content:\n{fullOcr}";
                        }
                    }
                    else
                    {
                        prompt = query;
                    }

                    var chatMsg = new ChatMessage
                    {
                        Role = "user",
                        Content = prompt,
                        ImagesBase64 = screenshots.Select(s => s.Base64).ToList()
                    };

                    string gRes = await gemini.SendMessageAsync(new List<ChatMessage> { chatMsg }, "gemini-3.5-flash", geminiApiKey);
                    if (!string.IsNullOrWhiteSpace(gRes) && !gRes.StartsWith("❌") && !gRes.StartsWith("⚠️") && !gRes.Contains("API key", StringComparison.OrdinalIgnoreCase))
                    {
                        answerText = gRes;
                    }
                }
                catch (Exception gEx)
                {
                    System.Diagnostics.Debug.WriteLine($"[MiniAiTab] Gemini error: {gEx.Message}");
                }

                // Seamless Fallback if offline
                if (string.IsNullOrWhiteSpace(answerText))
                {
                    if (screenshots.Count > 0)
                    {
                        string searchSubject = !string.IsNullOrWhiteSpace(query) ? query : (!string.IsNullOrWhiteSpace(fullOcr) ? fullOcr : "Screen visual analysis");
                        var searchResult = await WebSearchHelper.FetchWebAnswerAsync(searchSubject);
                        string searchUrl = $"https://www.google.com/search?q={Uri.EscapeDataString(searchSubject)}";
                        answerText = WebSearchHelper.SynthesizeGoogleLensAnswer(query, fullOcr, searchResult, searchSubject, searchUrl);
                    }
                    else
                    {
                        var searchResult = await WebSearchHelper.FetchWebAnswerAsync(query);
                        answerText = WebSearchHelper.SynthesizeGoogleAiOverview(query, searchResult);
                    }
                }

                AnswerBodyText.Text = answerText;
                LoadingIndicator.Visibility = Visibility.Collapsed;
                AnswerContentPanel.Visibility = Visibility.Visible;
                AnswerScrollViewer.ScrollToTop();
            }
            catch
            {
                LoadingIndicator.Visibility = Visibility.Collapsed;
                AnswerContentPanel.Visibility = Visibility.Visible;
                AnswerBodyText.Text = WebSearchHelper.SynthesizeGoogleAiOverview(query, new WebSearchResult { Query = query });
            }
            finally
            {
                foreach (var s in screenshots)
                {
                    try { s.RawBitmap?.Dispose(); } catch { }
                }
                FollowUpBox.Focus();
            }
        }
        #endregion

        #region Follow-Up Conversation Thread (Ask anything)
        private async void BtnFollowUpSend_Click(object sender, RoutedEventArgs e)
        {
            await SubmitFollowUpAsync();
        }

        private async void FollowUpBox_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                e.Handled = true;
                await SubmitFollowUpAsync();
            }
        }

        private void FollowUpBox_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            // Shift+T triggers instant transparency even while typing in FollowUpBox
            if (e.Key == Key.T && (Keyboard.Modifiers & ModifierKeys.Shift) == ModifierKeys.Shift &&
                !Keyboard.Modifiers.HasFlag(ModifierKeys.Control))
            {
                e.Handled = true;
                ToggleCompleteTransparency();
                return;
            }

            if (e.Key == Key.Escape)
            {
                e.Handled = true;
                if (IsCompletelyTransparent)
                {
                    ToggleCompleteTransparency();
                    return;
                }
                CollapseResults();
            }
        }

        private async void BtnFollowUpPlus_Click(object sender, RoutedEventArgs e)
        {
            await CaptureScreenAndAttachAsync();
            FollowUpBox.Focus();
        }

        private async Task SubmitFollowUpAsync()
        {
            string followUp = FollowUpBox.Text.Trim();
            var screenshots = _pendingScreenshots.ToList();
            if (string.IsNullOrWhiteSpace(followUp) && screenshots.Count == 0) return;

            FollowUpBox.Text = "";
            _pendingScreenshots.Clear();
            UpdateAttachmentBars();

            // 1. Add User Question Bubble to thread
            var userBubble = new Border
            {
                Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#303134")),
                BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#3C4043")),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(12, 6, 12, 6),
                Margin = new Thickness(40, 4, 0, 8),
                HorizontalAlignment = HorizontalAlignment.Right
            };
            var userStack = new StackPanel();

            // Multi-screenshot gallery in message bubble
            if (screenshots.Count > 0)
            {
                var gallery = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 6) };
                foreach (var s in screenshots)
                {
                    var thumb = new Border
                    {
                        Width = 44,
                        Height = 28,
                        CornerRadius = new CornerRadius(4),
                        ClipToBounds = true,
                        Margin = new Thickness(0, 0, 6, 0),
                        BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#8AB4F8")),
                        BorderThickness = new Thickness(1)
                    };
                    thumb.Child = new Image { Source = s.Preview, Stretch = Stretch.UniformToFill };
                    gallery.Children.Add(thumb);
                }
                userStack.Children.Add(gallery);
            }

            var textSp = new StackPanel { Orientation = Orientation.Horizontal };
            textSp.Children.Add(new TextBlock { Text = "👤 ", FontSize = 11, VerticalAlignment = VerticalAlignment.Center });
            textSp.Children.Add(new TextBlock 
            { 
                Text = string.IsNullOrWhiteSpace(followUp) 
                    ? (screenshots.Count > 1 ? $"📷 Analyzed {screenshots.Count} Screenshots" : "📷 Analyzed Screenshot") 
                    : followUp, 
                Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E8EAED")), 
                FontSize = 12, 
                FontWeight = FontWeights.SemiBold, 
                TextWrapping = TextWrapping.Wrap 
            });
            userStack.Children.Add(textSp);
            userBubble.Child = userStack;
            FollowUpMessagesPanel.Children.Add(userBubble);

            // 2. Add Temporary Loading Indicator in thread
            var loadingBorder = new Border
            {
                Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#292A2D")),
                BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#3C4043")),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(12, 8, 12, 8),
                Margin = new Thickness(0, 4, 0, 8)
            };
            var loadingStack = new StackPanel { Orientation = Orientation.Horizontal };
            loadingStack.Children.Add(new TextBlock { Text = "✨ ", FontSize = 12, Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#8AB4F8")) });
            loadingStack.Children.Add(new TextBlock { Text = "Generating Gemini AI response...", FontSize = 11.5, Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#9AA0A6")), FontStyle = FontStyles.Italic });
            loadingBorder.Child = loadingStack;
            FollowUpMessagesPanel.Children.Add(loadingBorder);
            AnswerScrollViewer.ScrollToBottom();

            try
            {
                string answerText = "";
                string geminiApiKey = !string.IsNullOrWhiteSpace(_aiChatService?.GeminiApiKey)
                    ? _aiChatService.GeminiApiKey
                    : GeminiProvider.DefaultGeminiApiKey;

                // Extract OCR from all attached screens
                var ocrSb = new System.Text.StringBuilder();
                for (int i = 0; i < screenshots.Count; i++)
                {
                    var s = screenshots[i];
                    if (s.RawBitmap != null)
                    {
                        try
                        {
                            string ocr = await ExtractTextFromBitmapAsync(s.RawBitmap);
                            if (!string.IsNullOrWhiteSpace(ocr))
                            {
                                ocrSb.AppendLine($"[Screen #{s.Index} Text]:\n{ocr.Trim()}");
                            }
                        }
                        catch { }
                    }
                }
                string fullOcr = ocrSb.ToString().Trim();

                // Call Real Google Gemini 3.5 Flash
                try
                {
                    var gemini = new GeminiProvider();
                    string prompt;
                    if (screenshots.Count > 0)
                    {
                        prompt = $"Context: {_lastTopic}\nQuestion: {(string.IsNullOrWhiteSpace(followUp) ? "Analyze these screenshots and provide an answer." : followUp)}";
                        if (!string.IsNullOrWhiteSpace(fullOcr))
                        {
                            prompt += $"\n\nExtracted Screen Content:\n{fullOcr}";
                        }
                    }
                    else
                    {
                        prompt = $"Context: {_lastTopic}\nFollow-up question: {followUp}";
                    }

                    var chatMsg = new ChatMessage
                    {
                        Role = "user",
                        Content = prompt,
                        ImagesBase64 = screenshots.Select(s => s.Base64).ToList()
                    };

                    string gRes = await gemini.SendMessageAsync(new List<ChatMessage> { chatMsg }, "gemini-3.5-flash", geminiApiKey);
                    if (!string.IsNullOrWhiteSpace(gRes) && !gRes.StartsWith("❌") && !gRes.StartsWith("⚠️") && !gRes.Contains("API key", StringComparison.OrdinalIgnoreCase))
                    {
                        answerText = gRes;
                    }
                }
                catch { }

                if (string.IsNullOrWhiteSpace(answerText))
                {
                    if (screenshots.Count > 0)
                    {
                        string subject = !string.IsNullOrWhiteSpace(followUp) ? followUp : fullOcr;
                        var searchResult = await WebSearchHelper.FetchWebAnswerAsync(subject);
                        answerText = WebSearchHelper.SynthesizeGoogleLensAnswer(followUp, fullOcr, searchResult, subject, "");
                    }
                    else
                    {
                        var searchResult = await WebSearchHelper.FetchWebAnswerAsync(followUp);
                        answerText = WebSearchHelper.SynthesizeFollowUpAnswer(followUp, _lastTopic, searchResult);
                    }
                }

                // Remove loading border
                FollowUpMessagesPanel.Children.Remove(loadingBorder);

                // Add AI response card
                var aiCard = new Border
                {
                    Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#292A2D")),
                    BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#3C4043")),
                    BorderThickness = new Thickness(1),
                    CornerRadius = new CornerRadius(10),
                    Padding = new Thickness(14, 12, 14, 12),
                    Margin = new Thickness(0, 4, 0, 10)
                };
                var aiStack = new StackPanel();
                var headerDock = new DockPanel { LastChildFill = true, Margin = new Thickness(0, 0, 0, 8) };
                var badgeBorder = new Border
                {
                    Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E3A2F")),
                    BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#34A853")),
                    BorderThickness = new Thickness(1),
                    CornerRadius = new CornerRadius(3),
                    Padding = new Thickness(4, 1, 4, 1)
                };
                DockPanel.SetDock(badgeBorder, Dock.Right);
                badgeBorder.Child = new TextBlock 
                { 
                    Text = "GEMINI AI", 
                    FontSize = 8, 
                    FontWeight = FontWeights.Bold, 
                    Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#34A853")) 
                };
                headerDock.Children.Add(badgeBorder);

                var titleStack = new StackPanel { Orientation = Orientation.Horizontal };
                titleStack.Children.Add(new TextBlock { Text = "✨ ", FontSize = 12, Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#8AB4F8")) });
                titleStack.Children.Add(new TextBlock { Text = "AI Response", FontSize = 11, FontWeight = FontWeights.SemiBold, Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E8EAED")) });
                headerDock.Children.Add(titleStack);
                aiStack.Children.Add(headerDock);

                var bodyTb = new TextBox
                {
                    Text = answerText,
                    Background = Brushes.Transparent,
                    Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E8EAED")),
                    BorderThickness = new Thickness(0),
                    IsReadOnly = true,
                    TextWrapping = TextWrapping.Wrap,
                    FontSize = 12,
                    FontFamily = new FontFamily("Segoe UI, Inter"),
                    CaretBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#8AB4F8"))
                };
                aiStack.Children.Add(bodyTb);
                aiCard.Child = aiStack;
                FollowUpMessagesPanel.Children.Add(aiCard);

                AnswerScrollViewer.ScrollToBottom();
            }
            catch
            {
                FollowUpMessagesPanel.Children.Remove(loadingBorder);
                var errCard = new Border
                {
                    Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#292A2D")),
                    BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#3C4043")),
                    BorderThickness = new Thickness(1),
                    CornerRadius = new CornerRadius(10),
                    Padding = new Thickness(12, 10, 12, 10),
                    Margin = new Thickness(0, 4, 0, 8)
                };
                errCard.Child = new TextBlock
                {
                    Text = WebSearchHelper.SynthesizeFollowUpAnswer(followUp, _lastTopic, new WebSearchResult { Query = followUp }),
                    Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E8EAED")),
                    FontSize = 12,
                    TextWrapping = TextWrapping.Wrap
                };
                FollowUpMessagesPanel.Children.Add(errCard);
                AnswerScrollViewer.ScrollToBottom();
            }
            finally
            {
                foreach (var s in screenshots)
                {
                    try { s.RawBitmap?.Dispose(); } catch { }
                }
                FollowUpBox.Focus();
            }
        }
        #endregion

        #region Google Lens & Multi-Screenshot Support
        public void UpdateAttachmentBars()
        {
            AttachedScreensPanel.Children.Clear();
            FollowUpScreensPanel.Children.Clear();

            if (_pendingScreenshots.Count == 0)
            {
                LensAttachmentBar.Visibility = Visibility.Collapsed;
                FollowUpAttachmentBar.Visibility = Visibility.Collapsed;
                if (ResultsPanel.Visibility != Visibility.Visible)
                {
                    this.Height = 68;
                }
                return;
            }

            bool inResults = ResultsPanel.Visibility == Visibility.Visible;
            LensAttachmentBar.Visibility = inResults ? Visibility.Collapsed : Visibility.Visible;
            FollowUpAttachmentBar.Visibility = inResults ? Visibility.Visible : Visibility.Collapsed;

            if (!inResults)
            {
                this.Height = 104;
            }

            for (int i = 0; i < _pendingScreenshots.Count; i++)
            {
                var item = _pendingScreenshots[i];
                item.Index = i + 1;
                AttachedScreensPanel.Children.Add(CreateScreenshotChip(item));
                FollowUpScreensPanel.Children.Add(CreateScreenshotChip(item));
            }
        }

        private UIElement CreateScreenshotChip(ScreenshotItem item)
        {
            var chip = new Border
            {
                Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#303134")),
                BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#5F6368")),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(5),
                Padding = new Thickness(3, 2, 5, 2),
                Margin = new Thickness(0, 0, 6, 0),
                VerticalAlignment = VerticalAlignment.Center
            };

            var sp = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };

            var thumbBorder = new Border
            {
                Width = 32,
                Height = 20,
                CornerRadius = new CornerRadius(3),
                ClipToBounds = true,
                Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#121316")),
                Margin = new Thickness(0, 0, 4, 0)
            };
            var img = new Image { Source = item.Preview, Stretch = Stretch.UniformToFill };
            thumbBorder.Child = img;
            sp.Children.Add(thumbBorder);

            sp.Children.Add(new TextBlock
            {
                Text = $"Screen #{item.Index}",
                FontSize = 9.5,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E8EAED")),
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 4, 0)
            });

            var btnDel = new Button
            {
                Content = "✕",
                FontSize = 8.5,
                Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#9AA0A6")),
                Background = Brushes.Transparent,
                BorderThickness = new Thickness(0),
                Cursor = Cursors.Hand,
                Padding = new Thickness(2, 0, 2, 0),
                ToolTip = "Remove this screenshot"
            };
            btnDel.Click += (s, e) =>
            {
                _pendingScreenshots.Remove(item);
                try { item.RawBitmap?.Dispose(); } catch { }
                UpdateAttachmentBars();
            };
            sp.Children.Add(btnDel);

            chip.Child = sp;
            return chip;
        }

        private void BtnClearAllScreens_Click(object sender, RoutedEventArgs e)
        {
            foreach (var s in _pendingScreenshots)
            {
                try { s.RawBitmap?.Dispose(); } catch { }
            }
            _pendingScreenshots.Clear();
            UpdateAttachmentBars();
        }

        private async void BtnAddAnotherScreen_Click(object sender, RoutedEventArgs e)
        {
            await CaptureScreenAndAttachAsync();
        }

        private async void BtnLens_Click(object sender, RoutedEventArgs e)
        {
            await CaptureScreenAndAttachAsync();
        }

        public async Task CaptureScreenAndAttachAsync()
        {
            try
            {
                // 1. Briefly hide the mini tab so the screen capture is 100% clean
                double originalOpacity = this.Opacity;
                this.Opacity = 0.0;
                await Task.Delay(45);

                // 2. Capture the full active screen
                var (base64, imageSource, rawBitmap) = CaptureWholeScreen();

                // 3. Restore opacity and bring window to front
                this.Opacity = originalOpacity;
                this.Activate();

                if (string.IsNullOrEmpty(base64) || imageSource == null) return;

                var item = new ScreenshotItem
                {
                    Base64 = base64,
                    Preview = imageSource,
                    RawBitmap = rawBitmap,
                    Index = _pendingScreenshots.Count + 1
                };
                _pendingScreenshots.Add(item);

                UpdateAttachmentBars();

                if (ResultsPanel.Visibility == Visibility.Visible)
                {
                    FollowUpBox.Focus();
                }
                else
                {
                    SearchBox.Focus();
                }
            }
            catch (Exception ex)
            {
                this.Opacity = 1.0;
                System.Diagnostics.Debug.WriteLine($"[MiniAiTab] Lens screen capture error: {ex.Message}");
            }
        }

        private (string base64, ImageSource? imageSource, System.Drawing.Bitmap? rawBitmap) CaptureWholeScreen()
        {
            try
            {
                var hwnd = new WindowInteropHelper(this).Handle;
                var screen = System.Windows.Forms.Screen.FromHandle(hwnd) 
                             ?? System.Windows.Forms.Screen.PrimaryScreen 
                             ?? System.Windows.Forms.Screen.AllScreens[0];
                var bounds = screen.Bounds;

                var bitmap = new System.Drawing.Bitmap(bounds.Width, bounds.Height, System.Drawing.Imaging.PixelFormat.Format32bppArgb);
                using (var g = System.Drawing.Graphics.FromImage(bitmap))
                {
                    g.CopyFromScreen(bounds.X, bounds.Y, 0, 0, bounds.Size, System.Drawing.CopyPixelOperation.SourceCopy);
                }

                // Copy to clipboard for instant user access
                try
                {
                    IntPtr hBitmap = bitmap.GetHbitmap();
                    try
                    {
                        var wpfBmp = Imaging.CreateBitmapSourceFromHBitmap(
                            hBitmap,
                            IntPtr.Zero,
                            Int32Rect.Empty,
                            BitmapSizeOptions.FromEmptyOptions());
                        Clipboard.SetImage(wpfBmp);
                    }
                    finally
                    {
                        DeleteObject(hBitmap);
                    }
                }
                catch { }

                using var ms = new MemoryStream();
                bitmap.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                byte[] bytes = ms.ToArray();
                string base64 = Convert.ToBase64String(bytes);

                var bmpImage = new BitmapImage();
                bmpImage.BeginInit();
                bmpImage.StreamSource = new MemoryStream(bytes);
                bmpImage.CacheOption = BitmapCacheOption.OnLoad;
                bmpImage.EndInit();
                bmpImage.Freeze();

                return (base64, bmpImage, bitmap);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MiniAiTab] Screen capture error: {ex.Message}");
                return ("", null, null);
            }
        }

        private static async Task<string> ExtractTextFromBitmapAsync(System.Drawing.Bitmap bitmap)
        {
            try
            {
                using var ms = new MemoryStream();
                bitmap.Save(ms, System.Drawing.Imaging.ImageFormat.Bmp);
                ms.Position = 0;

                var ras = new Windows.Storage.Streams.InMemoryRandomAccessStream();
                using (var writer = new Windows.Storage.Streams.DataWriter(ras.GetOutputStreamAt(0)))
                {
                    writer.WriteBytes(ms.ToArray());
                    await writer.StoreAsync();
                    await writer.FlushAsync();
                }

                var decoder = await Windows.Graphics.Imaging.BitmapDecoder.CreateAsync(ras);
                var softwareBitmap = await decoder.GetSoftwareBitmapAsync();

                var engine = Windows.Media.Ocr.OcrEngine.TryCreateFromUserProfileLanguages()
                             ?? Windows.Media.Ocr.OcrEngine.TryCreateFromLanguage(new Windows.Globalization.Language("en-US"));

                if (engine == null) return "";

                var result = await engine.RecognizeAsync(softwareBitmap);
                return result.Text ?? "";
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MiniAiTab OCR] Error: {ex.Message}");
                return "";
            }
        }
        #endregion

        #region Expand, Collapse & Actions
        private void ExpandToResults()
        {
            ResultsPanel.Visibility = Visibility.Visible;
            if (this.Height < 360)
            {
                this.Height = 440;
            }
        }

        private void CollapseResults()
        {
            ResultsPanel.Visibility = Visibility.Collapsed;
            this.Height = (_pendingScreenshots.Count > 0) ? 104 : 68;
            UpdateAttachmentBars();
            SearchBox.Focus();
        }

        private void BtnCollapse_Click(object sender, RoutedEventArgs e)
        {
            CollapseResults();
        }

        private void BtnCopy_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                string text = AnswerBodyText.Text;
                if (!string.IsNullOrWhiteSpace(text))
                {
                    Clipboard.SetText(text);
                    AnswerHeader.Text = "✓ Answer Copied to Clipboard!";
                }
            }
            catch { }
        }
        #endregion

        #region Navigation & Transformation Controls
        private void BtnRestoreFull_Click(object sender, RoutedEventArgs e)
        {
            MainWindow.Instance?.ToggleMiniAiTab();
        }

        private void BtnClose_Click(object sender, RoutedEventArgs e)
        {
            MainWindow.Instance?.ToggleMiniAiTab();
        }

        protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
        {
            e.Cancel = true;
            this.Hide();
        }
        #endregion
    }
}
