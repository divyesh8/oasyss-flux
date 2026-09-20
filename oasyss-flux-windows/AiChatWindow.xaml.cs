using System;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media.Imaging;

namespace MyOverlayPOC
{
    public partial class AiChatWindow : Window
    {
        private readonly AiChatService _aiChatService;
        private string? _pendingBase64;
        private System.Windows.Media.ImageSource? _pendingImagePreview;
        private System.Drawing.Bitmap? _pendingRawBitmap;

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("gdi32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool DeleteObject(IntPtr hObject);

        [StructLayout(LayoutKind.Sequential)]
        private struct POINT
        {
            public int X;
            public int Y;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        public AiChatWindow(AiChatService aiChatService)
        {
            InitializeComponent();
            _aiChatService = aiChatService;

            MessagesControl.ItemsSource = _aiChatService.Messages;

            _aiChatService.Messages.CollectionChanged += (s, e) =>
            {
                Dispatcher.InvokeAsync(() =>
                {
                    MessagesScrollViewer.ScrollToEnd();
                });
            };

            foreach (var name in _aiChatService.GetProviderNames())
            {
                ProviderCombo.Items.Add(name);
            }
            ProviderCombo.SelectedItem = _aiChatService.ActiveProviderName;
            PopulateModels();

            this.SourceInitialized += (s, e) =>
            {
                var hwnd = new WindowInteropHelper(this).Handle;
                // Exclude from display/screen capture (stealth AI bypass)
                DisplayAffinityManager.ApplyCaptureAffinity(hwnd);

                // Ensure it is completely hidden from taskbar and Alt+Tab
                long exStyle = MainWindow.GetWindowLongPtrSafe(hwnd, -20); // GWL_EXSTYLE
                MainWindow.SetWindowLongPtrSafe(hwnd, -20, (exStyle | 0x00000080) & ~0x00040000); // WS_EX_TOOLWINDOW & ~WS_EX_APPWINDOW

                // Explicitly delete tab from Windows Shell taskbar
                TaskbarManager.HideFromTaskbar(hwnd);
            };
        }

        private void PopulateModels()
        {
            ModelCombo.Items.Clear();
            var models = _aiChatService.GetModelsForProvider(_aiChatService.ActiveProviderName);
            foreach (var m in models)
            {
                ModelCombo.Items.Add(m);
            }
            ModelCombo.DisplayMemberPath = "DisplayName";
            var active = models.FirstOrDefault(m => m.ModelId == _aiChatService.ActiveModelId) ?? models.FirstOrDefault();
            if (active != null)
            {
                ModelCombo.SelectedItem = active;
                _aiChatService.ActiveModelId = active.ModelId;
            }
        }

        private void ProviderCombo_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
        {
            if (ProviderCombo.SelectedItem is string provider)
            {
                _aiChatService.ActiveProviderName = provider;
                var models = _aiChatService.GetModelsForProvider(provider);
                if (models.Any())
                {
                    _aiChatService.ActiveModelId = models[0].ModelId;
                }
                PopulateModels();
            }
        }

        private void ModelCombo_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
        {
            if (ModelCombo.SelectedItem is AiModelInfo model)
            {
                _aiChatService.ActiveModelId = model.ModelId;
            }
        }

        #region Window Control Buttons
        private void BtnMinimize_Click(object sender, RoutedEventArgs e)
        {
            this.WindowState = WindowState.Minimized;
        }

        private void BtnClose_Click(object sender, RoutedEventArgs e)
        {
            this.Hide();
        }

        private void BtnClear_Click(object sender, RoutedEventArgs e)
        {
            _aiChatService.ClearHistory();
        }
        #endregion

        #region Settings Overlay & API Keys
        private void BtnSettings_Click(object sender, RoutedEventArgs e)
        {
            // Populate current keys
            SettingsGeminiKeyBox.Text = _aiChatService.GeminiApiKey;
            SettingsGroqKeyBox.Text = _aiChatService.GroqApiKey;
            SettingsOpenAiKeyBox.Text = _aiChatService.OpenAiApiKey;
            SettingsStatusText.Text = string.Empty;
            AiSettingsOverlay.Visibility = Visibility.Visible;
        }

        private void BtnCloseSettings_Click(object sender, RoutedEventArgs e)
        {
            AiSettingsOverlay.Visibility = Visibility.Collapsed;
        }

        private void BtnPasteGemini_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (Clipboard.ContainsText())
                {
                    SettingsGeminiKeyBox.Text = Clipboard.GetText().Trim();
                }
            }
            catch { }
        }

        private void BtnPasteGroq_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (Clipboard.ContainsText())
                {
                    SettingsGroqKeyBox.Text = Clipboard.GetText().Trim();
                }
            }
            catch { }
        }

        private void BtnPasteOpenAi_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (Clipboard.ContainsText())
                {
                    SettingsOpenAiKeyBox.Text = Clipboard.GetText().Trim();
                }
            }
            catch { }
        }

        private void BtnSaveSettings_Click(object sender, RoutedEventArgs e)
        {
            _aiChatService.GeminiApiKey = SettingsGeminiKeyBox.Text.Trim();
            _aiChatService.GroqApiKey = SettingsGroqKeyBox.Text.Trim();
            _aiChatService.OpenAiApiKey = SettingsOpenAiKeyBox.Text.Trim();

            MainWindow.Instance?.SaveSettings();

            SettingsStatusText.Text = "✓ API Keys saved successfully!";
        }
        #endregion

        #region Google Lens & Screen Capture
        private void AttachScreenshot(string base64, System.Windows.Media.ImageSource? imageSource, System.Drawing.Bitmap? rawBitmap)
        {
            _pendingBase64 = base64;
            _pendingImagePreview = imageSource;
            _pendingRawBitmap?.Dispose();
            _pendingRawBitmap = rawBitmap;

            AttachedImageThumb.Source = imageSource;
            AttachedImageBar.Visibility = Visibility.Visible;
            InputBox.Focus();
        }

        private void ClearAttachment()
        {
            _pendingBase64 = null;
            _pendingImagePreview = null;
            _pendingRawBitmap?.Dispose();
            _pendingRawBitmap = null;

            AttachedImageThumb.Source = null;
            AttachedImageBar.Visibility = Visibility.Collapsed;
        }

        private void BtnClearAttachment_Click(object sender, RoutedEventArgs e)
        {
            ClearAttachment();
        }

        private async void BtnGoogleLens_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var (base64, imageSource, rawBitmap) = CaptureBrowser();
                if (string.IsNullOrEmpty(base64)) return;

                // Directly paste / attach the screenshot
                AttachScreenshot(base64, imageSource, rawBitmap);

                // If user already entered text, search immediately with those instructions
                string prompt = InputBox.Text.Trim();
                if (!string.IsNullOrEmpty(prompt))
                {
                    await ExecuteSearchAsync();
                }
                else
                {
                    InputBox.Focus();
                }
            }
            catch (Exception ex)
            {
                _aiChatService.Messages.Add(new ChatMessage
                {
                    Role = "assistant",
                    Content = $"❌ Google Lens capture failed: {ex.Message}"
                });
            }
        }

        private (string base64, System.Windows.Media.ImageSource? imageSource, System.Drawing.Bitmap? rawBitmap) CaptureBrowser()
        {
            try
            {
                var mainWindow = MainWindow.Instance;
                System.Drawing.Rectangle bounds;

                if (mainWindow != null && mainWindow.IsVisible && mainWindow.WindowState != WindowState.Minimized)
                {
                    var hwnd = new WindowInteropHelper(mainWindow).Handle;
                    if (GetWindowRect(hwnd, out RECT rect) && (rect.Right - rect.Left > 100) && (rect.Bottom - rect.Top > 100))
                    {
                        bounds = new System.Drawing.Rectangle(rect.Left, rect.Top, rect.Right - rect.Left, rect.Bottom - rect.Top);
                    }
                    else
                    {
                        var point = mainWindow.PointToScreen(new System.Windows.Point(0, 0));
                        bounds = new System.Drawing.Rectangle((int)point.X, (int)point.Y, (int)mainWindow.ActualWidth, (int)mainWindow.ActualHeight);
                    }
                }
                else
                {
                    var screen = System.Windows.Forms.Screen.PrimaryScreen ?? System.Windows.Forms.Screen.AllScreens[0];
                    bounds = screen.Bounds;
                }

                var bitmap = new System.Drawing.Bitmap(bounds.Width, bounds.Height, System.Drawing.Imaging.PixelFormat.Format32bppArgb);
                using (var g = System.Drawing.Graphics.FromImage(bitmap))
                {
                    g.CopyFromScreen(bounds.X, bounds.Y, 0, 0, bounds.Size, System.Drawing.CopyPixelOperation.SourceCopy);
                }

                // Copy screenshot directly to clipboard so user can paste it anywhere
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
                catch (Exception clipEx)
                {
                    System.Diagnostics.Debug.WriteLine($"[AiChatWindow] Clipboard set error: {clipEx.Message}");
                }

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
                System.Diagnostics.Debug.WriteLine($"[AiChatWindow] Screen capture error: {ex.Message}");
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
                System.Diagnostics.Debug.WriteLine($"[OCR] Error: {ex.Message}");
                return "";
            }
        }
        #endregion

        #region Messaging, Hotkeys & Search
        private async void BtnSend_Click(object sender, RoutedEventArgs e)
        {
            await ExecuteSearchAsync();
        }

        private void InputBox_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.T && Keyboard.Modifiers == ModifierKeys.Shift)
            {
                e.Handled = true;
                ToggleCompleteTransparency();
                return;
            }

            // Support Ctrl+V image pasting into chat attachment
            if (e.Key == Key.V && Keyboard.Modifiers == ModifierKeys.Control && Clipboard.ContainsImage())
            {
                try
                {
                    var image = Clipboard.GetImage();
                    if (image != null)
                    {
                        e.Handled = true;
                        using var ms = new MemoryStream();
                        var encoder = new PngBitmapEncoder();
                        encoder.Frames.Add(BitmapFrame.Create(image));
                        encoder.Save(ms);
                        byte[] bytes = ms.ToArray();
                        string base64 = Convert.ToBase64String(bytes);

                        using var rawStream = new MemoryStream(bytes);
                        var rawBmp = new System.Drawing.Bitmap(rawStream);

                        AttachScreenshot(base64, image, rawBmp);
                    }
                }
                catch { }
            }
        }

        private async void InputBox_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter && !Keyboard.Modifiers.HasFlag(ModifierKeys.Shift))
            {
                e.Handled = true;
                await ExecuteSearchAsync();
            }
        }

        private async Task ExecuteSearchAsync()
        {
            var text = InputBox.Text.Trim();
            bool hasAttachment = !string.IsNullOrEmpty(_pendingBase64);

            if (string.IsNullOrWhiteSpace(text) && !hasAttachment) return;

            InputBox.Text = string.Empty;
            BtnSend.IsEnabled = false;
            BtnGoogleLens.IsEnabled = false;
            if (BtnInputLens != null) BtnInputLens.IsEnabled = false;

            string? base64 = _pendingBase64;
            System.Windows.Media.ImageSource? preview = _pendingImagePreview;
            System.Drawing.Bitmap? rawBmp = _pendingRawBitmap;

            // Clear pending attachment UI
            _pendingBase64 = null;
            _pendingImagePreview = null;
            _pendingRawBitmap = null;
            AttachedImageThumb.Source = null;
            AttachedImageBar.Visibility = Visibility.Collapsed;

            try
            {
                if (hasAttachment && !string.IsNullOrEmpty(base64))
                {
                    string userPrompt = string.IsNullOrWhiteSpace(text)
                        ? "🔍 Google Lens: Scan browser screen"
                        : text;

                    string apiKey = _aiChatService.GetApiKeyForProvider(_aiChatService.ActiveProviderName);

                    if (!string.IsNullOrWhiteSpace(apiKey))
                    {
                        // User has configured an API key: use multimodal AI reasoning
                        await _aiChatService.SendWithImageAsync(userPrompt, base64, preview);
                    }
                    else
                    {
                        // ZERO API KEY REQUIRED: Use native Windows OCR + Google Search integration!
                        _aiChatService.Messages.Add(new ChatMessage
                        {
                            Role = "user",
                            Content = userPrompt,
                            ImageBase64 = base64,
                            ImagePreview = preview,
                            Timestamp = DateTime.Now
                        });

                        // Run local Windows OCR
                        string ocrText = "";
                        if (rawBmp != null)
                        {
                            try
                            {
                                ocrText = await ExtractTextFromBitmapAsync(rawBmp);
                            }
                            catch (Exception ocrEx)
                            {
                                System.Diagnostics.Debug.WriteLine($"[OCR] Error: {ocrEx.Message}");
                            }
                        }

                        // Determine search query
                        string searchQuery = "";
                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            searchQuery = text;
                        }
                        else if (!string.IsNullOrWhiteSpace(ocrText))
                        {
                            var lines = ocrText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                                               .Select(l => l.Trim())
                                               .Where(l => l.Length > 3 && !l.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                                               .Take(2);
                            searchQuery = string.Join(" ", lines);
                        }

                        // Launch search in browser
                        string searchUrl;
                        if (!string.IsNullOrWhiteSpace(searchQuery))
                        {
                            searchUrl = $"https://www.google.com/search?q={Uri.EscapeDataString(searchQuery)}";
                        }
                        else
                        {
                            searchUrl = "https://images.google.com";
                        }

                        MainWindow.Instance?.Dispatcher.Invoke(() =>
                        {
                            MainWindow.Instance.AddNewBrowserTab(searchUrl);
                        });

                        // Report back in AI Chat with clean results
                        var sb = new StringBuilder();
                        sb.AppendLine("🔍 **Google Lens Scan Complete** (No API Key Required)");
                        sb.AppendLine("✓ Full browser screenshot captured & copied to clipboard.");
                        if (!string.IsNullOrWhiteSpace(searchQuery))
                        {
                            sb.AppendLine($"✓ Opened Google Search in browser: *\"{searchQuery}\"*");
                        }
                        else
                        {
                            sb.AppendLine("✓ Opened Google Images in browser (press Ctrl+V in the tab to search by image).");
                        }

                        if (!string.IsNullOrWhiteSpace(ocrText))
                        {
                            sb.AppendLine("\n**Detected Text on Screen (OCR):**");
                            string cleanOcr = ocrText.Trim();
                            if (cleanOcr.Length > 800) cleanOcr = cleanOcr[..800] + "\n...";
                            sb.AppendLine(cleanOcr);
                        }

                        sb.AppendLine("\n💡 *Tip: To also get direct AI answers in this chat, paste a free key in ⚙ Settings.*");

                        _aiChatService.Messages.Add(new ChatMessage
                        {
                            Role = "assistant",
                            Content = sb.ToString(),
                            Timestamp = DateTime.Now
                        });
                    }
                }
                else
                {
                    // Normal text-only message
                    await _aiChatService.SendAsync(text);
                }
            }
            catch (Exception ex)
            {
                _aiChatService.Messages.Add(new ChatMessage
                {
                    Role = "assistant",
                    Content = $"❌ Error: {ex.Message}",
                    Timestamp = DateTime.Now
                });
            }
            finally
            {
                rawBmp?.Dispose();
                BtnSend.IsEnabled = true;
                BtnGoogleLens.IsEnabled = true;
                if (BtnInputLens != null) BtnInputLens.IsEnabled = true;
                InputBox.Focus();
            }
        }

        public void FocusInput()
        {
            InputBox.Focus();
        }

        public bool IsInputFocused => InputBox.IsKeyboardFocused;

        public bool IsCompletelyTransparent { get; private set; } = false;
        private double _savedOpacity = 1.0;

        public void ToggleCompleteTransparency()
        {
            IsCompletelyTransparent = !IsCompletelyTransparent;
            IntPtr hwnd = new WindowInteropHelper(this).Handle;

            if (IsCompletelyTransparent)
            {
                _savedOpacity = this.Opacity > 0.04 ? this.Opacity : 1.0;
                this.Opacity = 0.0;
                this.IsHitTestVisible = false;
                this.Visibility = Visibility.Hidden;

                if (hwnd != IntPtr.Zero)
                {
                    long extendedStyle = MainWindow.GetWindowLongPtrSafe(hwnd, MainWindow.GWL_EXSTYLE);
                    MainWindow.SetWindowLongPtrSafe(hwnd, MainWindow.GWL_EXSTYLE, extendedStyle | MainWindow.WS_EX_TRANSPARENT);
                }
            }
            else
            {
                this.Visibility = Visibility.Visible;
                if (hwnd != IntPtr.Zero)
                {
                    long extendedStyle = MainWindow.GetWindowLongPtrSafe(hwnd, MainWindow.GWL_EXSTYLE);
                    MainWindow.SetWindowLongPtrSafe(hwnd, MainWindow.GWL_EXSTYLE, extendedStyle & ~MainWindow.WS_EX_TRANSPARENT);
                }

                this.IsHitTestVisible = true;
                this.Opacity = _savedOpacity > 0.04 ? _savedOpacity : 1.0;
                this.Activate();
                FocusInput();
            }
        }

        protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
        {
            e.Cancel = true;
            this.Hide();
        }
        #endregion
    }
}
