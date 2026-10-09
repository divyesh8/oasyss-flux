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
        private readonly DispatcherTimer _suggestTimer;
        private readonly List<ScreenshotItem> _pendingScreenshots = new();
        public bool IsCompletelyTransparent { get; private set; } = false;

        [DllImport("gdi32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool DeleteObject(IntPtr hObject);

        public MiniAiTabWindow(AiChatService aiChatService)
        {
            _aiChatService = aiChatService;
            InitializeComponent();
            MiniGeminiModel.ItemsSource = new GeminiProvider().AvailableModels;
            MiniGeminiModel.SelectedIndex = 0;

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

        public bool IsInputFocused => SearchBox.IsKeyboardFocused || FollowUpBox.IsKeyboardFocused || (_geminiBrowser?.IsKeyboardFocusWithin ?? false);

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
            if (GeminiBrowserHost.IsMouseOver) return;
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
                if (!e.IsRepeat) ToggleCompleteTransparency();
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

                if (ResultsPanel.Visibility == Visibility.Visible || GeminiPanel.Visibility == Visibility.Visible)
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
        public Task ExecuteSearchAsync(string query) => SendMiniGeminiAsync(query, true);
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
                if (!e.IsRepeat) ToggleCompleteTransparency();
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

        private Task SubmitFollowUpAsync() => SendMiniGeminiAsync(FollowUpBox.Text.Trim(), false);
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
                if (ResultsPanel.Visibility != Visibility.Visible && GeminiPanel.Visibility != Visibility.Visible)
                {
                    this.Height = 68;
                }
                return;
            }

            bool inResults = ResultsPanel.Visibility == Visibility.Visible;
            LensAttachmentBar.Visibility = inResults ? Visibility.Collapsed : Visibility.Visible;
            FollowUpAttachmentBar.Visibility = inResults ? Visibility.Visible : Visibility.Collapsed;

            if (!inResults && GeminiPanel.Visibility != Visibility.Visible)
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
            GeminiPanel.Visibility = Visibility.Collapsed;
            ResultsPanel.Visibility = Visibility.Visible;
            if (this.Height < 360)
            {
                this.Height = 440;
            }
        }

        private void CollapseResults()
        {
            ResultsPanel.Visibility = Visibility.Collapsed;
            GeminiPanel.Visibility = Visibility.Collapsed;
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
