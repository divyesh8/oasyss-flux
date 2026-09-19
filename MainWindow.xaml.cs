using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using Microsoft.Web.WebView2.Wpf;
using System.Windows.Data;
using System.Web;
using System.Collections.ObjectModel;
using System.Text.Json;
using System.Windows.Media.Imaging;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Collections.Generic;
using System.Windows.Forms;
using System.Drawing;
using System.Drawing.Imaging;
using System.Linq;
using System.Text;
using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using System.Net.Http;
using System.Threading.Tasks;
using System.Windows.Threading;

namespace MyOverlayPOC
{

    public class GlobalKeyEventArgs : EventArgs
    {
        public Key Key { get; }
        public KBDLLHOOKSTRUCT Kbdllhookstruct { get; }
        public bool Handled { get; set; }

        public GlobalKeyEventArgs(KBDLLHOOKSTRUCT kbdllhookstruct)
        {
            Key = KeyInterop.KeyFromVirtualKey((int)kbdllhookstruct.vkCode);
            Kbdllhookstruct = kbdllhookstruct;
            Handled = false;
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct KBDLLHOOKSTRUCT
    {
        public uint vkCode;
        public uint scanCode;
        public KBDLLHOOKSTRUCTFlags flags;
        public uint time;
        public UIntPtr dwExtraInfo;
    }

    [Flags]
    public enum KBDLLHOOKSTRUCTFlags : uint
    {
        LLKHF_EXTENDED = 0x01,
        LLKHF_LOWER_IL_INJECTED = 0x02,
        LLKHF_INJECTED = 0x10,
        LLKHF_ALTDOWN = 0x20,
        LLKHF_UP = 0x80,
    }

    public sealed class GlobalKeyboardHook : IDisposable
    {
        private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);

        private const int WH_KEYBOARD_LL = 13;
        private const int WM_KEYDOWN = 0x0100;
        private const int WM_KEYUP = 0x0101;
        private const int WM_SYSKEYDOWN = 0x0104;
        private const int WM_SYSKEYUP = 0x0105;

        private readonly LowLevelKeyboardProc _proc;
        private IntPtr _hookId = IntPtr.Zero;
        private bool _isDisposed;
        private bool _minimizeOnFocusLoss = true;

        public event EventHandler<GlobalKeyEventArgs>? KeyDown;
        public event EventHandler<GlobalKeyEventArgs>? KeyUp;

        public GlobalKeyboardHook()
        {
            _proc = HookCallback;
            using (Process curProcess = Process.GetCurrentProcess())
            {
                ProcessModule? curModule = curProcess.MainModule;
                if (curModule != null && curModule.ModuleName != null)
                {
                    _hookId = SetWindowsHookEx(WH_KEYBOARD_LL, _proc, GetModuleHandle(curModule.ModuleName), 0);
                }
                else
                {
                    throw new InvalidOperationException("MainModule is null.");
                }
            }
        }

        private IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0)
            {
                try
                {
                    var kbdStruct = (KBDLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(KBDLLHOOKSTRUCT))!;
                    var args = new GlobalKeyEventArgs(kbdStruct);

                    if (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN)
                    {
                        KeyDown?.Invoke(this, args);
                    }
                    else if (wParam == (IntPtr)WM_KEYUP || wParam == (IntPtr)WM_SYSKEYUP)
                    {
                        KeyUp?.Invoke(this, args);
                    }

                    if (args.Handled)
                    {
                        return (IntPtr)1;
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Error in keyboard hook callback: {ex}");
                }
            }
            return CallNextHookEx(_hookId, nCode, wParam, lParam);
        }

        public void Dispose()
        {
            if (_isDisposed) return;

            if (_hookId != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_hookId);
                _hookId = IntPtr.Zero;
            }

            _isDisposed = true;
            GC.SuppressFinalize(this);
        }

        ~GlobalKeyboardHook()
        {
            Dispose();
        }
    }
    
public class AppSettings
{
    public double Width { get; set; }
    public double Height { get; set; }
    public bool RestoreTabsOnStartup { get; set; }
    public bool MinimizeOnFocusLoss { get; set; }
    public string Theme { get; set; } = "Dark";
    public double Opacity { get; set; } = 1.0;

    // AI Configuration
    public string GeminiApiKey { get; set; } = "";
    public string OpenAiApiKey { get; set; } = "";
    public string GroqApiKey { get; set; } = "";
    public string DefaultAiProvider { get; set; } = "Gemini";
    public string DefaultAiModel { get; set; } = "gemini-3.6-flash";

    // Transparency
    public bool TransparentMode { get; set; } = false;
    public double TransparencyLevel { get; set; } = 0.5;
}
    public class Bookmark : INotifyPropertyChanged
    {
        private string _name;
        public string Name
        {
            get => _name;
            set { _name = value; OnPropertyChanged(); }
        }

        private string _url;
        public string Url
        {
            get => _url;
            set { _url = value; OnPropertyChanged(); }
        }

        private BitmapImage? _favicon;
        public BitmapImage? Favicon
        {
            get => _favicon;
            set { _favicon = value; OnPropertyChanged(); }
        }

        public event PropertyChangedEventHandler? PropertyChanged;
        protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT
    {
        public int X;
        public int Y;
    }

    public class Screenshot : INotifyPropertyChanged
    {
        private BitmapImage _image;
        public BitmapImage Image
        {
            get => _image;
            set { _image = value; OnPropertyChanged(); }
        }
        public string FilePath { get; set; }

        public event PropertyChangedEventHandler? PropertyChanged;
        protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }

public class UsageData
{
    public bool UserInteracted { get; set; }
    public bool WasNotMinimized { get; set; }
    public double FocusTimeSeconds { get; set; }
    public double TotalActiveTimeSeconds { get; set; }
    public bool UrlChangedInAddressBar { get; set; }
    public int NewTabsOpened { get; set; }
}

    public partial class MainWindow : Window
    {
        private Border _webViewPlaceholder;
        private const int GWL_EXSTYLE = -20;
        private Border _webViewContentOverlay;
private readonly Dictionary<string, HashSet<CoreWebView2PermissionKind>> _grantedPermissions = new Dictionary<string, HashSet<CoreWebView2PermissionKind>>();
        private const int WS_EX_LAYERED = 0x00080000;
        private const int WS_EX_TOOLWINDOW = 0x00000080;
        private const uint WDA_EXCLUDEFROMCAPTURE = 0x00000011;
        private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
private System.Windows.Point _dragStartPoint;
    private TabItem? _draggedTab;

    public static readonly DependencyProperty IsTabDraggingProperty =
        DependencyProperty.Register("IsTabDragging", typeof(bool), typeof(MainWindow), new PropertyMetadata(false));

    public bool IsTabDragging
    {
        get { return (bool)GetValue(IsTabDraggingProperty); }
        set { SetValue(IsTabDraggingProperty, value); }
    }
        private const uint SWP_NOMOVE = 0x0002;
        private const uint SWP_NOSIZE = 0x0001;
        private const uint SWP_NOACTIVATE = 0x0010;
        private const uint SWP_SHOWWINDOW = 0x0040;
        private const uint SWP_NOZORDER = 0x0004;
        private const uint SWP_FRAMECHANGED = 0x0020;

        private const uint MOD_ALT = 0x0001;
        private const uint MOD_CONTROL = 0x0002;
        private const uint MOD_SHIFT = 0x0004;
        private const uint MOD_WIN = 0x0008;

        private readonly string _userDataFolder;
        private bool _isMuted = true;
        private System.Windows.Controls.Button _muteButton;
        private TextBlock _muteStatusText;
        private System.Windows.Controls.Button _backButton;
        private System.Windows.Controls.Button _forwardButton;
        private System.Windows.Controls.Button _refreshButton;
        private System.Windows.Controls.TextBox _addressBar;
        private bool _addressBarHasIntendedChanges = false;
        private bool _isMinimized = false;
        private System.Windows.Controls.Button _minimizeButton;
        private System.Windows.Controls.Button _exitButton;
        
        private double _originalHeight;
        private double _originalWidth;
        private Thickness _originalBorderPadding;
        private CornerRadius _originalBorderCornerRadius;
        
        private readonly string _bookmarksFilePath;
        public ObservableCollection<Bookmark> Bookmarks { get; set; }
        
        private System.Windows.Controls.Image _loadingSpinner;
        private readonly Dictionary<WebView2CompositionControl, bool> _tabLoadingStates = new Dictionary<WebView2CompositionControl, bool>();

private readonly GlobalKeyboardHook _keyboardHook;
private bool _ctrlPressed;
private bool _shiftPressed;
private bool _altPressed;
private bool _winPressed;
private readonly HashSet<uint> _swallowedKeys = new HashSet<uint>();

        private readonly string _screenshotsTempFolder;
        public ObservableCollection<Screenshot> Screenshots { get; set; }
        private Grid _screenshotTray;
        private System.Windows.Controls.Button _toggleScreenshotsButton;
        private readonly string _settingsFilePath;
        private uint _hotkeyModifiers = MOD_SHIFT | MOD_ALT;
private uint _hotkeyKey = 0x5A; // Z key
        private readonly HttpClient _usageTrackerHttpClient;
        private DispatcherTimer _usageTrackTimer;
        private int _usageTrackerPort;
        
        private bool _userInteractedInInterval = false;
        private bool _wasMinimizedInInterval = false;
        private DateTime _lastFocusTime;
        private TimeSpan _totalFocusTimeInInterval;
        private bool _isWindowFocused = false;
            private bool _urlChangedInInterval = false;
    private int _newTabsOpenedInInterval = 0;

        private readonly string _tabsFilePath;
        private bool _restoreTabsOnStartup = false;
private bool _minimizeOnFocusLoss = true;
        private bool _isDarkMode = true;
        private double _overlayOpacity = 1.0;
        private Grid _modalOverlay;

        // AI Chat
        private readonly AiChatService _aiChatService = new();
        private Grid? _aiChatPanel;
        private System.Windows.Controls.Button? _aiChatToggleButton;
        private ItemsControl? _aiChatMessagesControl;
        private System.Windows.Controls.TextBox? _aiChatInput;
        private System.Windows.Controls.ComboBox? _aiProviderCombo;
        private System.Windows.Controls.ComboBox? _aiModelCombo;
        private ScrollViewer? _aiChatScrollViewer;
        private bool _isAiChatVisible = false;
        private TextBlock? _aiSendingIndicator;

        // Transparency Toggle
        private bool _isTransparentMode = false;
        private double _transparencyLevel = 0.5;
        private System.Windows.Controls.Button? _transparencyToggleButton;
        private Slider? _transparencySlider;
        private Border? _transparencySliderPopup;

        // Startup Intro Video
        private Grid? _introOverlay;
        private MediaElement? _introMedia;
        private bool _introFinished = false;

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport("user32.dll")]
        private static extern int GetWindowLong(IntPtr hwnd, int index);

        [DllImport("user32.dll")]
        private static extern int SetWindowLong(IntPtr hwnd, int index, int newStyle);

        [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr", SetLastError = true)]
        private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll", EntryPoint = "GetWindowLong", SetLastError = true)]
        private static extern int GetWindowLong32(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr", SetLastError = true)]
        private static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

        [DllImport("user32.dll", EntryPoint = "SetWindowLong", SetLastError = true)]
        private static extern int SetWindowLong32(IntPtr hWnd, int nIndex, int dwNewLong);

        private static long GetWindowLongPtrSafe(IntPtr hWnd, int nIndex)
            => IntPtr.Size == 8 ? GetWindowLongPtr64(hWnd, nIndex).ToInt64() : GetWindowLong32(hWnd, nIndex);

        private static void SetWindowLongPtrSafe(IntPtr hWnd, int nIndex, long dwNewLong)
        {
            if (IntPtr.Size == 8) SetWindowLongPtr64(hWnd, nIndex, new IntPtr(dwNewLong));
            else SetWindowLong32(hWnd, nIndex, (int)dwNewLong);
        }

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetLayeredWindowAttributes(IntPtr hwnd, uint crKey, byte bAlpha, uint dwFlags);

        private const uint LWA_ALPHA = 0x2;

        [DllImport("user32.dll")]
        private static extern bool SetWindowDisplayAffinity(IntPtr hWnd, uint dwAffinity);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("user32.dll")]
        private static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);

        [DllImport("user32.dll")]
        private static extern IntPtr GetParent(IntPtr hWnd);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

        [DllImport("user32.dll")]
        private static extern bool IsWindowVisible(IntPtr hWnd);

        private const uint GW_OWNER = 4;
        private DispatcherTimer _dialogProtectionTimer;

        public MainWindow()
        {
            InitializeComponent();

            var originalContent = this.Content as UIElement;
            var newRootGrid = new Grid();
            this.Content = newRootGrid;

            _modalOverlay = new Grid
            {
                Background = new SolidColorBrush(System.Windows.Media.Color.FromArgb(0x88, 0, 0, 0)),
                Visibility = Visibility.Collapsed
            };

            if (originalContent != null)
            {
                newRootGrid.Children.Add(originalContent);
            }
            newRootGrid.Children.Add(_modalOverlay);

            InitializeIntroVideo(newRootGrid);

            _usageTrackerHttpClient = new HttpClient();
            
            var args = Environment.GetCommandLineArgs();
            var portArg = args.FirstOrDefault(a => a.StartsWith("/port:"));
            if (portArg != null && int.TryParse(portArg.Substring("/port:".Length), out int port))
            {
                _usageTrackerPort = port;
                InitializeUsageTracker();
            }
            else
            {
                Debug.WriteLine("WARNING: Usage tracker port not provided via command line arguments. Tracking is disabled.");
            }

            Mouse.OverrideCursor = System.Windows.Input.Cursors.Arrow;

            var workArea = System.Windows.SystemParameters.WorkArea;
            this.Height = workArea.Height * 0.87;
            this.Width = this.Height * 1.38;

            this.Topmost = true;
            this.SourceInitialized += MainWindow_SourceInitialized;
            this.Closed += MainWindow_Closed;
            this.Loaded += MainWindow_Loaded;
            this.MouseLeftButtonDown += MainWindow_MouseLeftButtonDown;
            this.Deactivated += MainWindow_Deactivated;

            _userDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "OasyssFlux");
            Directory.CreateDirectory(_userDataFolder);

            _settingsFilePath = Path.Combine(_userDataFolder, "settings.json");
            _tabsFilePath = Path.Combine(_userDataFolder, "tabs.json");
            LoadSettings();
            ApplyTheme(_isDarkMode);

            _bookmarksFilePath = Path.Combine(_userDataFolder, "bookmarks.json");
            Bookmarks = new ObservableCollection<Bookmark>();
            LoadBookmarks();
            
            _screenshotsTempFolder = Path.Combine(Path.GetTempPath(), "OasyssFlux_Screenshots");
            Directory.CreateDirectory(_screenshotsTempFolder);
            Screenshots = new ObservableCollection<Screenshot>();

            _keyboardHook = new GlobalKeyboardHook();
            _keyboardHook.KeyDown += GlobalKeyboardHook_KeyDown;
            _keyboardHook.KeyUp += GlobalKeyboardHook_KeyUp;

            this.DataContext = this;
            
            bool tabsRestored = RestoreTabsIfEnabled();
            if (!tabsRestored)
            {
                AddNewBrowserTab("https://www.google.com");
            }
        }

        #region Usage Tracking
private void ToggleProgrammaticMinimize()
{
    if (_isMinimized)
    {
        RestoreWindow();
    }
    else
    {
        MinimizeCustom();
    }
}
        private void InitializeUsageTracker()
        {
            this.StateChanged += UsageTracker_WindowStateChanged;
            this.Activated += UsageTracker_WindowActivated;
            this.Deactivated += UsageTracker_WindowDeactivated;
            
            if (this.IsActive)
            {
                _isWindowFocused = true;
                _lastFocusTime = DateTime.UtcNow;
            }

            _usageTrackTimer = new DispatcherTimer();
            _usageTrackTimer.Interval = TimeSpan.FromSeconds(60);
            _usageTrackTimer.Tick += UsageTrackTimer_Tick;
            _usageTrackTimer.Start();
            Debug.WriteLine($"Usage tracker initialized for port {_usageTrackerPort}. Timer will tick every 2 minutes.");
        }
        
        private void UsageTracker_WindowStateChanged(object? sender, EventArgs e)
        {
            if (this.WindowState == WindowState.Minimized)
            {
                _wasMinimizedInInterval = true;
                if (_isWindowFocused)
                {
                        _totalFocusTimeInInterval += DateTime.UtcNow - _lastFocusTime;
                    _isWindowFocused = false;
                }
            }
            else if (this.IsActive && !_isWindowFocused)
            {
                _isWindowFocused = true;
                _lastFocusTime = DateTime.UtcNow;
            }
        }

        private void UsageTracker_WindowActivated(object? sender, EventArgs e)
        {
            if (!_isWindowFocused && this.WindowState != WindowState.Minimized)
            {
                _isWindowFocused = true;
                _lastFocusTime = DateTime.UtcNow;
            }
        }

private void UsageTracker_WindowDeactivated(object? sender, EventArgs e)
{
    if (_isWindowFocused)
    {
        _totalFocusTimeInInterval += DateTime.UtcNow - _lastFocusTime;
        _isWindowFocused = false;
    }

}
        private void MarkUserInteraction()
        {
            _userInteractedInInterval = true;
        }

        private void TabItem_PreviewMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            var tabItem = FindAncestor<TabItem>((DependencyObject)e.OriginalSource);
            if (tabItem == null) return;

            _draggedTab = tabItem;
            _dragStartPoint = e.GetPosition(this);
        }

        private void TabItem_PreviewMouseMove(object sender, System.Windows.Input.MouseEventArgs e)
        {
            if (_draggedTab == null || e.LeftButton != MouseButtonState.Pressed)
            {
                _draggedTab = null;
                return;
            }

            System.Windows.Point currentPosition = e.GetPosition(this);
            Vector diff = _dragStartPoint - currentPosition;

            if (Math.Abs(diff.X) > SystemParameters.MinimumHorizontalDragDistance ||
                Math.Abs(diff.Y) > SystemParameters.MinimumVerticalDragDistance)
            {
                TabItem tabToDrag = _draggedTab;
                _draggedTab = null;

                tabToDrag.GiveFeedback += TabItem_GiveFeedback;

                try
                {
                    IsTabDragging = true;
                    DragDrop.DoDragDrop(tabToDrag, tabToDrag, System.Windows.DragDropEffects.Move);
                }
                finally
                {
                    IsTabDragging = false;
                    tabToDrag.GiveFeedback -= TabItem_GiveFeedback;
                }
            }
        }
        private string GetSimplifiedUrl(Uri? uri)
        {
            if (uri == null)
            {
                return string.Empty;
            }

            string host = uri.Host;

            if (host.StartsWith("www.", StringComparison.OrdinalIgnoreCase))
            {
                host = host.Substring(4);
            }
            
            return host;
        }
        private void TabItem_Drop(object sender, System.Windows.DragEventArgs e)
        {
            var draggedTab = e.Data.GetData(typeof(TabItem)) as TabItem;
            var targetTab = FindAncestor<TabItem>((DependencyObject)e.OriginalSource);

            if (draggedTab == null || targetTab == null || draggedTab == targetTab)
            {
                return;
            }

            int sourceIndex = BrowserTabs.Items.IndexOf(draggedTab);
            int targetIndex = BrowserTabs.Items.IndexOf(targetTab);

            if (sourceIndex < 0 || targetIndex < 0)
            {
                return;
            }

            BrowserTabs.Items.RemoveAt(sourceIndex);
            BrowserTabs.Items.Insert(targetIndex, draggedTab);

            BrowserTabs.SelectedItem = draggedTab;
        }
        
        private void HeaderPanel_DragOver(object sender, System.Windows.DragEventArgs e)
        {
            var draggedTab = e.Data.GetData(typeof(TabItem)) as TabItem;
            if (draggedTab == null)
            {
                e.Effects = System.Windows.DragDropEffects.None;
            }
            else
            {
                e.Effects = System.Windows.DragDropEffects.Move;
            }
            e.Handled = true;
        }

        private void HeaderPanel_Drop(object sender, System.Windows.DragEventArgs e)
        {
            var draggedTab = e.Data.GetData(typeof(TabItem)) as TabItem;
            if (draggedTab == null) return;

            var targetTab = FindAncestor<TabItem>((DependencyObject)e.OriginalSource);
            if (targetTab == null)
            {
                int sourceIndex = BrowserTabs.Items.IndexOf(draggedTab);
                if (sourceIndex < 0) return;
                
                BrowserTabs.Items.RemoveAt(sourceIndex);
                BrowserTabs.Items.Insert(BrowserTabs.Items.Count, draggedTab);
                
                BrowserTabs.SelectedItem = draggedTab;
            }
        }
        private static T FindAncestor<T>(DependencyObject current) where T : DependencyObject
        {
            do
            {
                if (current is T)
                {
                    return (T)current;
                }
                current = VisualTreeHelper.GetParent(current);
            }
            while (current != null);
            return null;
        }

private async void UsageTrackTimer_Tick(object? sender, EventArgs e)
{
    Debug.WriteLine("Usage track timer ticked. Compiling and sending data.");
    if (_usageTrackerPort == 0) return;

    if (_isWindowFocused)
    {
        _totalFocusTimeInInterval += DateTime.UtcNow - _lastFocusTime;
        _lastFocusTime = DateTime.UtcNow;
    }

    var data = new UsageData
    {
        UserInteracted = _userInteractedInInterval,
        WasNotMinimized = !_wasMinimizedInInterval,
        FocusTimeSeconds = _totalFocusTimeInInterval.TotalSeconds,
        TotalActiveTimeSeconds = 120,
        UrlChangedInAddressBar = _urlChangedInInterval, 
        NewTabsOpened = _newTabsOpenedInInterval
    };
    
    try
    {
        string url = $"http://localhost:{_usageTrackerPort}/track";

        string jsonPayload = JsonSerializer.Serialize(data);
        var httpContent = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

        var response = await _usageTrackerHttpClient.PostAsync(url, httpContent);
        
        response.EnsureSuccessStatusCode();
        Debug.WriteLine("Successfully sent usage data to Python backend.");
    }
    catch (Exception ex)
    {
        Debug.WriteLine($"Error sending usage data: {ex.Message}");
    }
    finally
    {
        _userInteractedInInterval = false;
        _wasMinimizedInInterval = false;
        _totalFocusTimeInInterval = TimeSpan.Zero;
        _urlChangedInInterval = false;
        _newTabsOpenedInInterval = 0;
    }
}

        #endregion

        private void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            var template = BrowserTabs.Template;
            var newTabButton = template.FindName("NewTabButton", BrowserTabs) as System.Windows.Controls.Button;
            if (newTabButton != null) newTabButton.Click += NewTab_Click;

            _muteButton = template.FindName("MuteButtonInTemplate", BrowserTabs) as System.Windows.Controls.Button;
            _muteStatusText = template.FindName("MuteStatusTextBlock", BrowserTabs) as TextBlock;
            if (_muteButton != null) _muteButton.Click += MuteButton_Click;
            UpdateMuteStatusUI();

            _minimizeButton = template.FindName("MinimizeButton", BrowserTabs) as System.Windows.Controls.Button;
            if (_minimizeButton != null) _minimizeButton.Click += MinimizeButton_Click;

            _exitButton = template.FindName("ExitButton", BrowserTabs) as System.Windows.Controls.Button;
            if (_exitButton != null) _exitButton.Click += ExitButton_Click;

            _backButton = template.FindName("BackButton", BrowserTabs) as System.Windows.Controls.Button;
            _forwardButton = template.FindName("ForwardButton", BrowserTabs) as System.Windows.Controls.Button;
            _refreshButton = template.FindName("RefreshButton", BrowserTabs) as System.Windows.Controls.Button;
            _addressBar = template.FindName("AddressBar", BrowserTabs) as System.Windows.Controls.TextBox;
            _loadingSpinner = template.FindName("LoadingSpinner", BrowserTabs) as System.Windows.Controls.Image; 
            _webViewPlaceholder = template.FindName("WebViewPlaceholder", BrowserTabs) as Border;

            if (_backButton != null) _backButton.Click += (s, args) => GetCurrentWebView()?.GoBack();
            if (_forwardButton != null) _forwardButton.Click += (s, args) => GetCurrentWebView()?.GoForward();
            if (_refreshButton != null) _refreshButton.Click += (s, args) => GetCurrentWebView()?.Reload();

            if (_addressBar != null)
            {
                _addressBar.KeyDown += AddressBar_KeyDown;
                _addressBar.GotKeyboardFocus += AddressBar_GotKeyboardFocus;
                _addressBar.LostFocus += AddressBar_LostFocus;
                _addressBar.PreviewMouseLeftButtonDown += AddressBar_PreviewMouseLeftButtonDown;
            }
            
            _screenshotTray = template.FindName("ScreenshotTray", BrowserTabs) as Grid;
            _toggleScreenshotsButton = template.FindName("ToggleScreenshotsButton", BrowserTabs) as System.Windows.Controls.Button;
            if (_toggleScreenshotsButton != null)
            {
                _toggleScreenshotsButton.Click += ToggleScreenshotsButton_Click;
                _toggleScreenshotsButton.ToolTip = $"Toggle Screenshots Tray ({HotkeyToString(_hotkeyModifiers, _hotkeyKey)})";
            }

            // ── AI Chat Toggle Button ──
            _aiChatToggleButton = template.FindName("AiChatButton", BrowserTabs) as System.Windows.Controls.Button;
            if (_aiChatToggleButton != null)
            {
                _aiChatToggleButton.Click += AiChatToggle_Click;
                _aiChatToggleButton.ToolTip = "Open AI Chat";
            }

            // ── Transparency Toggle Button + Slider ──
            _transparencyToggleButton = template.FindName("TransparencyButton", BrowserTabs) as System.Windows.Controls.Button;
            if (_transparencyToggleButton != null)
            {
                _transparencyToggleButton.Click += TransparencyButton_Click;
                UpdateTransparencyButtonUI();
            }

            _transparencySliderPopup = template.FindName("TransparencySliderPopup", BrowserTabs) as Border;
            _transparencySlider = template.FindName("TransparencySliderControl", BrowserTabs) as Slider;
            if (_transparencySlider != null)
            {
                _transparencySlider.Value = _transparencyLevel;
                _transparencySlider.ValueChanged += TransparencySlider_ValueChanged;
            }

            // ── Build AI Chat Panel dynamically and inject into Row 3 grid ──
            BuildAiChatPanel();
            var aiChatHost = template.FindName("AiChatHost", BrowserTabs) as Grid;
            if (aiChatHost != null && _aiChatPanel != null)
            {
                aiChatHost.Children.Add(_aiChatPanel);
            }

            // Apply transparency if it was saved as active
            if (_isTransparentMode)
            {
                ApplyOverlayOpacity(_transparencyLevel);
                UpdateTransparencyButtonUI();
            }
        }

        #region Settings Management
        private bool RestoreTabsIfEnabled()
        {
            if (_restoreTabsOnStartup && File.Exists(_tabsFilePath))
            {
                try
                {
                    var json = File.ReadAllText(_tabsFilePath);
                    var urls = JsonSerializer.Deserialize<List<string>>(json);
                    if (urls != null && urls.Any())
                    {
                        BrowserTabs.Items.Clear();
                        foreach (var url in urls)
                        {
                            AddNewBrowserTab(url);
                        }
                        return true;
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Error loading tabs: {ex.Message}");
                }
            }
            return false;
        }

        private void SaveTabs()
        {
            try
            {
                var urlsToSave = new List<string>();
                foreach (TabItem tabItem in BrowserTabs.Items)
                {
                    if (tabItem.Content is WebView2CompositionControl webView && webView.Source != null)
                    {
                        urlsToSave.Add(webView.Source.ToString());
                    }
                }

                if (urlsToSave.Any())
                {
                    var options = new JsonSerializerOptions { WriteIndented = true };
                    var json = JsonSerializer.Serialize(urlsToSave, options);
                    File.WriteAllText(_tabsFilePath, json);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Could not save tabs: {ex.Message}");
            }
        }

private void LoadSettings()
{
    if (!File.Exists(_settingsFilePath)) return;
    try
    {
        var json = File.ReadAllText(_settingsFilePath);
        var settings = JsonSerializer.Deserialize<AppSettings>(json);
        if (settings != null)
        {
            if (settings.Width > 200) this.Width = settings.Width;
            if (settings.Height > 200) this.Height = settings.Height;
            _restoreTabsOnStartup = settings.RestoreTabsOnStartup;
            _minimizeOnFocusLoss = settings.MinimizeOnFocusLoss;
            _isDarkMode = !string.Equals(settings.Theme, "Light", StringComparison.OrdinalIgnoreCase);
            if (settings.Opacity >= 0.2 && settings.Opacity <= 1.0) _overlayOpacity = settings.Opacity;

            // AI Configuration
            _aiChatService.GeminiApiKey = settings.GeminiApiKey ?? "";
            _aiChatService.OpenAiApiKey = settings.OpenAiApiKey ?? "";
            _aiChatService.GroqApiKey = settings.GroqApiKey ?? "";
            _aiChatService.ActiveProviderName = settings.DefaultAiProvider ?? "Gemini";
            _aiChatService.ActiveModelId = settings.DefaultAiModel ?? "gemini-3.6-flash";

            // Transparency
            _isTransparentMode = settings.TransparentMode;
            if (settings.TransparencyLevel >= 0.1 && settings.TransparencyLevel <= 1.0)
                _transparencyLevel = settings.TransparencyLevel;
        }
    }
    catch (Exception ex)
    {
        System.Windows.MessageBox.Show($"Could not load settings: {ex.Message}");
    }
}


private void SaveSettings()
{
    try
    {
        var settings = new AppSettings
        {
            Width = this.Width,
            Height = this.Height,
            RestoreTabsOnStartup = _restoreTabsOnStartup,
            MinimizeOnFocusLoss = _minimizeOnFocusLoss,
            Theme = _isDarkMode ? "Dark" : "Light",
            Opacity = _overlayOpacity,

            // AI Configuration
            GeminiApiKey = _aiChatService.GeminiApiKey,
            OpenAiApiKey = _aiChatService.OpenAiApiKey,
            GroqApiKey = _aiChatService.GroqApiKey,
            DefaultAiProvider = _aiChatService.ActiveProviderName,
            DefaultAiModel = _aiChatService.ActiveModelId,

            // Transparency
            TransparentMode = _isTransparentMode,
            TransparencyLevel = _transparencyLevel
        };
        var options = new JsonSerializerOptions { WriteIndented = true };
        var json = JsonSerializer.Serialize(settings, options);
        File.WriteAllText(_settingsFilePath, json);

        if (_restoreTabsOnStartup)
        {
            SaveTabs();
        }
        else
        {
            if (File.Exists(_tabsFilePath))
            {
                File.Delete(_tabsFilePath);
            }
        }
    }
    catch (Exception ex)
    {
        System.Windows.MessageBox.Show($"Could not save settings: {ex.Message}");
    }
}
        
        private void ApplyTheme(bool dark)
        {
            _isDarkMode = dark;

            var res = System.Windows.Application.Current != null
                ? System.Windows.Application.Current.Resources
                : this.Resources;

            void Set(string key, string hex)
            {
                res[key] = new System.Windows.Media.SolidColorBrush(
                    (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(hex));
            }

            if (dark)
            {
                Set("Theme.AppBackground",     "#F00A0D14");
                Set("Theme.AppBorder",         "#4000D2FF");
                Set("Theme.Surface",           "#CC121726");
                Set("Theme.SurfaceAlt",        "#E0181F33");
                Set("Theme.SurfaceHover",      "#E8222B47");
                Set("Theme.SurfacePressed",    "#FF2B3659");
                Set("Theme.DialogBackground",  "#F50E1322");
                Set("Theme.Input",             "#D9141A2D");
                Set("Theme.Border",            "#332B3B60");
                Set("Theme.ScrollTrack",       "#20000000");
                Set("Theme.ScrollThumb",       "#553A4C73");
                Set("Theme.TextPrimary",       "#FFFFFFFF");
                Set("Theme.TextSecondary",     "#FFB8C7E0");
                Set("Theme.TextMuted",         "#FF7584A6");
                Set("Theme.TabSelectedBg",     "#E619223D");
                Set("Theme.TabSelectedBorder", "#CC00E5FF");
                Set("Theme.TabHover",          "#661E2847");
            }
            else
            {
                Set("Theme.AppBackground",     "#F0EDF2F9");
                Set("Theme.AppBorder",         "#5000A8CC");
                Set("Theme.Surface",           "#E6F7FAFD");
                Set("Theme.SurfaceAlt",        "#E6E5ECF6");
                Set("Theme.SurfaceHover",      "#E6D4E1F2");
                Set("Theme.SurfacePressed",    "#E6C3D5ED");
                Set("Theme.DialogBackground",  "#F5F2F6FC");
                Set("Theme.Input",             "#FFFFFFFF");
                Set("Theme.Border",            "#4098AEC9");
                Set("Theme.ScrollTrack",       "#15000000");
                Set("Theme.ScrollThumb",       "#508FA4C4");
                Set("Theme.TextPrimary",       "#FF0B1120");
                Set("Theme.TextSecondary",     "#FF24324D");
                Set("Theme.TextMuted",         "#FF64748B");
                Set("Theme.TabSelectedBg",     "#FFFFFFFF");
                Set("Theme.TabSelectedBorder", "#FF00B8D9");
                Set("Theme.TabHover",          "#50CCE5FF");
            }
        }

        private string HotkeyToString(uint modifiers, uint key)
        {
            var str = new StringBuilder();
            if ((modifiers & MOD_CONTROL) != 0) str.Append("Ctrl + ");
            if ((modifiers & MOD_ALT) != 0) str.Append("Alt + ");
            if ((modifiers & MOD_SHIFT) != 0) str.Append("Shift + ");
            if ((modifiers & MOD_WIN) != 0) str.Append("Win + ");
            str.Append(KeyInterop.KeyFromVirtualKey((int)key));
            return str.ToString();
        }
private Task<bool> ShowExitConfirmationDialog(string title, string message)
{
    var tcs = new TaskCompletionSource<bool>();

    var dialog = new Window
    {
        Title = title,
        Owner = this,
        WindowStyle = WindowStyle.None,
        AllowsTransparency = true,
        Background = System.Windows.Media.Brushes.Transparent,
        ShowInTaskbar = false,
        WindowStartupLocation = WindowStartupLocation.CenterOwner,
        Width = 400,
        SizeToContent = SizeToContent.Height,
    };
    MakeWindowNonDraggable(dialog);
    dialog.SourceInitialized += Dialog_SourceInitialized;

    var mainBorder = new Border { Style = (Style)FindResource("DialogBorderStyle"), Padding = new Thickness(20) };
    dialog.Content = mainBorder;

    var parentGrid = new Grid();
    mainBorder.Child = parentGrid;

var contentGrid = new Grid { Margin = new Thickness(0, 10, 0, 0) };
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // <-- fuck this thing
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

    var messageLabel = new TextBlock
    {
        Text = message,
        Style = (Style)FindResource("DialogTextStyle"),
        VerticalAlignment = VerticalAlignment.Center,
        HorizontalAlignment = System.Windows.HorizontalAlignment.Center,
        TextWrapping = TextWrapping.Wrap,
        FontSize = 15
    };
    Grid.SetRow(messageLabel, 0);

    var noButton = new System.Windows.Controls.Button { Content = "No", Style = (Style)FindResource("DialogButtonStyle"), Width = 85, IsCancel = true };
    noButton.Click += (s, e) => { tcs.TrySetResult(false); dialog.Close(); };
    var yesButton = new System.Windows.Controls.Button { Content = "Yes", Style = (Style)FindResource("DialogButtonStyle"), Width = 85, Margin = new Thickness(0, 0, 10, 0), IsDefault = true };
    yesButton.Click += (s, e) => { tcs.TrySetResult(true); dialog.Close(); };
    
    var webView = GetCurrentWebView();
    if (webView != null)
    {
        webView.Visibility = Visibility.Collapsed;
    }
    if (_webViewPlaceholder != null)
    {
        _webViewPlaceholder.Visibility = Visibility.Visible;
    }

    dialog.Closed += (s, e) => {
        _modalOverlay.Visibility = Visibility.Collapsed;
        if (webView != null)
        {
            webView.Visibility = Visibility.Visible;
        }
        if (_webViewPlaceholder != null)
        {
            _webViewPlaceholder.Visibility = Visibility.Collapsed;
        }
        if (!tcs.Task.IsCompleted)
        {
            tcs.TrySetResult(false);
        }
    };

    var buttonPanel = new StackPanel { Orientation = System.Windows.Controls.Orientation.Horizontal, HorizontalAlignment = System.Windows.HorizontalAlignment.Right, Margin = new Thickness(0, 15, 0, 0) };
    buttonPanel.Children.Add(yesButton);
    buttonPanel.Children.Add(noButton);

    Grid.SetRow(buttonPanel, 1);

    contentGrid.Children.Add(messageLabel);
    contentGrid.Children.Add(buttonPanel);

    var closeButton = new System.Windows.Controls.Button
    {
        Content = "✕",
        Style = (Style)FindResource("DialogCloseButtonStyle"),
        HorizontalAlignment = System.Windows.HorizontalAlignment.Right,
        VerticalAlignment = VerticalAlignment.Top,
        Margin = new Thickness(0, -20, -20, 0),
        IsCancel = true
    };
    closeButton.Click += (s, e) => dialog.Close();

    parentGrid.Children.Add(contentGrid);
    parentGrid.Children.Add(closeButton);

    _modalOverlay.Visibility = Visibility.Visible;
    dialog.Show();

    return tcs.Task;
}
private async void SettingsButton_Click(object sender, RoutedEventArgs e)
{
    var tcs = new TaskCompletionSource<bool>();

    var dialog = new Window
    {
        Title = "Settings",
        Owner = this,
        WindowStyle = WindowStyle.None,
        AllowsTransparency = true,
        Background = System.Windows.Media.Brushes.Transparent,
        ShowInTaskbar = false,
        WindowStartupLocation = WindowStartupLocation.CenterOwner,
        Width = 520,
        SizeToContent = SizeToContent.Height,
    };

    // FIXED :DDDD
    IntPtr hwnd = new WindowInteropHelper(dialog).EnsureHandle();
    SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);

    MakeWindowNonDraggable(dialog);
    dialog.SourceInitialized += Dialog_SourceInitialized;

    var mainBorder = new Border { Style = (Style)FindResource("DialogBorderStyle"), Padding = new Thickness(20) };
    dialog.Content = mainBorder;
    
    var parentGrid = new Grid();
    mainBorder.Child = parentGrid;

    double aspectRatio = this.Width / this.Height;
    bool _isUpdatingSliders = false;

    var contentGrid = new Grid { Margin = new Thickness(15, 25, 15, 15) };
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); 
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
    contentGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
    contentGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

    var widthLabel = new System.Windows.Controls.Label { Content = "Overlay Width:", Style = (Style)FindResource("DialogLabelStyle") };
    var heightLabel = new System.Windows.Controls.Label { Content = "Overlay Height:", Style = (Style)FindResource("DialogLabelStyle") };
    var screenshotHotkeyLabel = new System.Windows.Controls.Label { Content = "Screenshot Hotkey:", Style = (Style)FindResource("DialogLabelStyle") };
    var moveOverlayLabel = new System.Windows.Controls.Label { Content = "Move Overlay:", Style = (Style)FindResource("DialogLabelStyle") };
    var moveOverlayValue = new TextBlock { Text = "Shift + Alt + W/A/S/D", Style = (Style)FindResource("DialogTextStyle"), Margin = new Thickness(5) };
    var resizeOverlayLabel = new System.Windows.Controls.Label { Content = "Resize Overlay:", Style = (Style)FindResource("DialogLabelStyle") };
    var resizeOverlayValue = new TextBlock { Text = "Shift + Alt + Up/Down", Style = (Style)FindResource("DialogTextStyle"), Margin = new Thickness(5) };
    var minimizeOverlayLabel = new System.Windows.Controls.Label { Content = "Minimize/Restore Overlay:", Style = (Style)FindResource("DialogLabelStyle") };
    var minimizeOverlayValue = new TextBlock { Text = "Shift + Alt + C", Style = (Style)FindResource("DialogTextStyle"), Margin = new Thickness(5) };
    var restoreTabsLabel = new System.Windows.Controls.Label { Content = "Restore tabs on startup:", Style = (Style)FindResource("DialogLabelStyle") };
    var screenshotHotkeyValue = new TextBlock { Text = "Shift + Alt + Z", Style = (Style)FindResource("DialogTextStyle"), Margin = new Thickness(5) };
    var restoreTabsCheckBox = new System.Windows.Controls.CheckBox { IsChecked = _restoreTabsOnStartup, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(5), Style = (Style)FindResource("DialogCheckBoxStyle") };
    
    var minimizeOnLossFocusLabel = new System.Windows.Controls.Label { Content = "Minimize on focus loss:", Style = (Style)FindResource("DialogLabelStyle") };
    var minimizeOnLossFocusCheckBox = new System.Windows.Controls.CheckBox { IsChecked = _minimizeOnFocusLoss, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(5), Style = (Style)FindResource("DialogCheckBoxStyle") };

    var lockAspectRatioCheckBox = new System.Windows.Controls.CheckBox { Content = "Lock Aspect Ratio", IsChecked = true, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(5, 10, 5, 10), Style = (Style)FindResource("DialogCheckBoxStyle") };
    var widthSlider = new Slider { Minimum = 200, Maximum = SystemParameters.PrimaryScreenWidth, Value = this.Width, Margin = new Thickness(5), VerticalAlignment = VerticalAlignment.Center };
    var widthValueText = new System.Windows.Controls.TextBox { Text = this.Width.ToString("F0"), Width = 50, IsReadOnly = true, Style = (Style)FindResource("DialogTextBoxStyle"), TextAlignment = TextAlignment.Center };
    var widthPanel = new DockPanel();
    widthPanel.Children.Add(widthValueText);
    widthPanel.Children.Add(widthSlider);
    DockPanel.SetDock(widthValueText, Dock.Right);
    var heightSlider = new Slider { Minimum = 200, Maximum = SystemParameters.PrimaryScreenHeight, Value = this.Height, Margin = new Thickness(5), VerticalAlignment = VerticalAlignment.Center };
    var heightValueText = new System.Windows.Controls.TextBox { Text = this.Height.ToString("F0"), Width = 50, IsReadOnly = true, Style = (Style)FindResource("DialogTextBoxStyle"), TextAlignment = TextAlignment.Center };
    var heightPanel = new DockPanel();
    heightPanel.Children.Add(heightValueText);
    heightPanel.Children.Add(heightSlider);
    DockPanel.SetDock(heightValueText, Dock.Right);

    Grid.SetRow(widthLabel, 0); Grid.SetColumn(widthLabel, 0);
    Grid.SetRow(widthPanel, 0); Grid.SetColumn(widthPanel, 1);
    Grid.SetRow(heightLabel, 1); Grid.SetColumn(heightLabel, 0);
    Grid.SetRow(heightPanel, 1); Grid.SetColumn(heightPanel, 1);
    Grid.SetRow(lockAspectRatioCheckBox, 2); Grid.SetColumn(lockAspectRatioCheckBox, 1);
    Grid.SetRow(screenshotHotkeyLabel, 3); Grid.SetColumn(screenshotHotkeyLabel, 0);
    Grid.SetRow(screenshotHotkeyValue, 3); Grid.SetColumn(screenshotHotkeyValue, 1);
    Grid.SetRow(moveOverlayLabel, 4); Grid.SetColumn(moveOverlayLabel, 0);
    Grid.SetRow(moveOverlayValue, 4); Grid.SetColumn(moveOverlayValue, 1);
    Grid.SetRow(resizeOverlayLabel, 5); Grid.SetColumn(resizeOverlayLabel, 0);
    Grid.SetRow(resizeOverlayValue, 5); Grid.SetColumn(resizeOverlayValue, 1);
    Grid.SetRow(minimizeOverlayLabel, 6); Grid.SetColumn(minimizeOverlayLabel, 0);
    Grid.SetRow(minimizeOverlayValue, 6); Grid.SetColumn(minimizeOverlayValue, 1);
    Grid.SetRow(restoreTabsLabel, 7); Grid.SetColumn(restoreTabsLabel, 0);
    Grid.SetRow(restoreTabsCheckBox, 7); Grid.SetColumn(restoreTabsCheckBox, 1);

    Grid.SetRow(minimizeOnLossFocusLabel, 8); Grid.SetColumn(minimizeOnLossFocusLabel, 0);
    Grid.SetRow(minimizeOnLossFocusCheckBox, 8); Grid.SetColumn(minimizeOnLossFocusCheckBox, 1);

    lockAspectRatioCheckBox.Checked += (s, e) => { aspectRatio = widthSlider.Value / heightSlider.Value; };
    widthSlider.ValueChanged += (s, e) => { if (_isUpdatingSliders) return; widthValueText.Text = e.NewValue.ToString("F0"); this.Width = e.NewValue; if (lockAspectRatioCheckBox.IsChecked == true) { _isUpdatingSliders = true; double newHeight = e.NewValue / aspectRatio; if (newHeight >= heightSlider.Minimum && newHeight <= heightSlider.Maximum) { heightSlider.Value = newHeight; heightValueText.Text = newHeight.ToString("F0"); this.Height = newHeight; } _isUpdatingSliders = false; } SaveSettings(); };
    heightSlider.ValueChanged += (s, e) => { if (_isUpdatingSliders) return; heightValueText.Text = e.NewValue.ToString("F0"); this.Height = e.NewValue; if (lockAspectRatioCheckBox.IsChecked == true) { _isUpdatingSliders = true; double newWidth = e.NewValue * aspectRatio; if (newWidth >= widthSlider.Minimum && newWidth <= widthSlider.Maximum) { widthSlider.Value = newWidth; widthValueText.Text = newWidth.ToString("F0"); this.Width = newWidth; } _isUpdatingSliders = false; } SaveSettings(); };
    restoreTabsCheckBox.Click += (s, e) => { _restoreTabsOnStartup = restoreTabsCheckBox.IsChecked ?? false; SaveSettings(); };

    minimizeOnLossFocusCheckBox.Click += (s, e) => { _minimizeOnFocusLoss = minimizeOnLossFocusCheckBox.IsChecked ?? false; SaveSettings(); };

    contentGrid.Children.Add(widthLabel);
    contentGrid.Children.Add(widthPanel);
    contentGrid.Children.Add(heightLabel);
    contentGrid.Children.Add(heightPanel);
    contentGrid.Children.Add(lockAspectRatioCheckBox);
    contentGrid.Children.Add(screenshotHotkeyLabel);
    contentGrid.Children.Add(screenshotHotkeyValue);
    contentGrid.Children.Add(moveOverlayLabel);
    contentGrid.Children.Add(moveOverlayValue);
    contentGrid.Children.Add(resizeOverlayLabel);
    contentGrid.Children.Add(resizeOverlayValue);
    contentGrid.Children.Add(minimizeOverlayLabel);
    contentGrid.Children.Add(minimizeOverlayValue);
    contentGrid.Children.Add(restoreTabsLabel);
    contentGrid.Children.Add(restoreTabsCheckBox);

    contentGrid.Children.Add(minimizeOnLossFocusLabel);
    contentGrid.Children.Add(minimizeOnLossFocusCheckBox);

    contentGrid.RowDefinitions.Insert(9, new RowDefinition { Height = GridLength.Auto });
    var themeLabel = new System.Windows.Controls.Label { Content = "Appearance:", Style = (Style)FindResource("DialogLabelStyle") };
    var darkModeCheckBox = new System.Windows.Controls.CheckBox { Content = "Dark Mode", IsChecked = _isDarkMode, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(5), Style = (Style)FindResource("DialogCheckBoxStyle") };
    darkModeCheckBox.Click += (s, e) => { _isDarkMode = darkModeCheckBox.IsChecked ?? true; ApplyTheme(_isDarkMode); SaveSettings(); };
    Grid.SetRow(themeLabel, 9); Grid.SetColumn(themeLabel, 0);
    Grid.SetRow(darkModeCheckBox, 9); Grid.SetColumn(darkModeCheckBox, 1);
    contentGrid.Children.Add(themeLabel);
    contentGrid.Children.Add(darkModeCheckBox);

    contentGrid.RowDefinitions.Insert(10, new RowDefinition { Height = GridLength.Auto });
    var opacityLabel = new System.Windows.Controls.Label { Content = "Overlay Opacity:", Style = (Style)FindResource("DialogLabelStyle") };
    var opacitySlider = new Slider { Minimum = 0.04, Maximum = 1.0, Value = _overlayOpacity, Margin = new Thickness(5), VerticalAlignment = VerticalAlignment.Center };
    var opacityValueText = new System.Windows.Controls.TextBox { Text = ((int)(_overlayOpacity * 100)) + "%", Width = 50, IsReadOnly = true, Style = (Style)FindResource("DialogTextBoxStyle"), TextAlignment = TextAlignment.Center };
    var opacityPanel = new DockPanel();
    opacityPanel.Children.Add(opacityValueText);
    opacityPanel.Children.Add(opacitySlider);
    DockPanel.SetDock(opacityValueText, Dock.Right);

    opacitySlider.ValueChanged += (s, e) =>
    {
        opacityValueText.Text = ((int)(e.NewValue * 100)) + "%";
        ApplyOverlayOpacity(e.NewValue);
        SaveSettings();
    };

    Grid.SetRow(opacityLabel, 10); Grid.SetColumn(opacityLabel, 0);
    Grid.SetRow(opacityPanel, 10); Grid.SetColumn(opacityPanel, 1);
    contentGrid.Children.Add(opacityLabel);
    contentGrid.Children.Add(opacityPanel);

    // ── AI Configuration Section ──
    contentGrid.RowDefinitions.Insert(10, new RowDefinition { Height = GridLength.Auto });
    var aiSectionHeader = new TextBlock
    {
        Text = "── AI Configuration ──",
        Foreground = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0x00, 0xE5, 0xFF)),
        FontWeight = FontWeights.Bold,
        FontSize = 13,
        Margin = new Thickness(5, 15, 5, 5),
        HorizontalAlignment = System.Windows.HorizontalAlignment.Center
    };
    Grid.SetRow(aiSectionHeader, 10); Grid.SetColumn(aiSectionHeader, 0); Grid.SetColumnSpan(aiSectionHeader, 2);
    contentGrid.Children.Add(aiSectionHeader);

    // Gemini API Key
    contentGrid.RowDefinitions.Insert(11, new RowDefinition { Height = GridLength.Auto });
    var geminiLabel = new System.Windows.Controls.Label { Content = "Gemini API Key:", Style = (Style)FindResource("DialogLabelStyle") };
    var geminiKeyBox = new System.Windows.Controls.TextBox
    {
        Text = _aiChatService.GeminiApiKey,
        Style = (Style)FindResource("DialogTextBoxStyle"),
        Margin = new Thickness(5),
        ToolTip = "Free at aistudio.google.com/apikey"
    };
    geminiKeyBox.TextChanged += (s, ev) => { _aiChatService.GeminiApiKey = geminiKeyBox.Text.Trim(); SaveSettings(); };
    Grid.SetRow(geminiLabel, 11); Grid.SetColumn(geminiLabel, 0);
    Grid.SetRow(geminiKeyBox, 11); Grid.SetColumn(geminiKeyBox, 1);
    contentGrid.Children.Add(geminiLabel);
    contentGrid.Children.Add(geminiKeyBox);

    // OpenAI API Key
    contentGrid.RowDefinitions.Insert(12, new RowDefinition { Height = GridLength.Auto });
    var openaiLabel = new System.Windows.Controls.Label { Content = "OpenAI API Key:", Style = (Style)FindResource("DialogLabelStyle") };
    var openaiKeyBox = new System.Windows.Controls.TextBox
    {
        Text = _aiChatService.OpenAiApiKey,
        Style = (Style)FindResource("DialogTextBoxStyle"),
        Margin = new Thickness(5),
        ToolTip = "Get at platform.openai.com/api-keys"
    };
    openaiKeyBox.TextChanged += (s, ev) => { _aiChatService.OpenAiApiKey = openaiKeyBox.Text.Trim(); SaveSettings(); };
    Grid.SetRow(openaiLabel, 12); Grid.SetColumn(openaiLabel, 0);
    Grid.SetRow(openaiKeyBox, 12); Grid.SetColumn(openaiKeyBox, 1);
    contentGrid.Children.Add(openaiLabel);
    contentGrid.Children.Add(openaiKeyBox);

    // Groq API Key
    contentGrid.RowDefinitions.Insert(13, new RowDefinition { Height = GridLength.Auto });
    var groqLabel = new System.Windows.Controls.Label { Content = "Groq API Key:", Style = (Style)FindResource("DialogLabelStyle") };
    var groqKeyBox = new System.Windows.Controls.TextBox
    {
        Text = _aiChatService.GroqApiKey,
        Style = (Style)FindResource("DialogTextBoxStyle"),
        Margin = new Thickness(5),
        ToolTip = "Free at console.groq.com/keys"
    };
    groqKeyBox.TextChanged += (s, ev) => { _aiChatService.GroqApiKey = groqKeyBox.Text.Trim(); SaveSettings(); };
    Grid.SetRow(groqLabel, 13); Grid.SetColumn(groqLabel, 0);
    Grid.SetRow(groqKeyBox, 13); Grid.SetColumn(groqKeyBox, 1);
    contentGrid.Children.Add(groqLabel);
    contentGrid.Children.Add(groqKeyBox);

    // Transparency hotkey info
    contentGrid.RowDefinitions.Insert(14, new RowDefinition { Height = GridLength.Auto });
    var transparencyHotkeyLabel = new System.Windows.Controls.Label { Content = "Toggle Transparency:", Style = (Style)FindResource("DialogLabelStyle") };
    var transparencyHotkeyValue = new TextBlock { Text = "Shift + Alt + T", Style = (Style)FindResource("DialogTextStyle"), Margin = new Thickness(5) };
    Grid.SetRow(transparencyHotkeyLabel, 14); Grid.SetColumn(transparencyHotkeyLabel, 0);
    Grid.SetRow(transparencyHotkeyValue, 14); Grid.SetColumn(transparencyHotkeyValue, 1);
    contentGrid.Children.Add(transparencyHotkeyLabel);
    contentGrid.Children.Add(transparencyHotkeyValue);

    var closeButton = new System.Windows.Controls.Button { Content = "✕", Style = (Style)FindResource("DialogCloseButtonStyle"), HorizontalAlignment = System.Windows.HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Top, Margin = new Thickness(0, -20, -20, 0), IsCancel = true };
    closeButton.Click += (s, e) => dialog.Close();
    parentGrid.Children.Add(contentGrid);
    parentGrid.Children.Add(closeButton);

    var webView = GetCurrentWebView();
    if (webView != null)
    {
        webView.Visibility = Visibility.Collapsed;
    }
    if (_webViewPlaceholder != null)
    {
        _webViewPlaceholder.Visibility = Visibility.Visible;
    }

    dialog.Closed += (s, e) => {
        _modalOverlay.Visibility = Visibility.Collapsed;
        if (webView != null)
        {
            webView.Visibility = Visibility.Visible;
        }
        if (_webViewPlaceholder != null)
        {
            _webViewPlaceholder.Visibility = Visibility.Collapsed;
        }
        tcs.TrySetResult(true);
    };

    _modalOverlay.Visibility = Visibility.Visible;
    dialog.Show();

    await tcs.Task;
}

#endregion

        #region Bookmark Management

        private void MainWindow_Closed(object sender, EventArgs e)
        {
            SaveBookmarks();
            SaveSettings();
            _keyboardHook?.Dispose();
            try
            {
                if (Directory.Exists(_screenshotsTempFolder))
                {
                    Directory.Delete(_screenshotsTempFolder, true);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not delete temp screenshot folder: {ex.Message}");
            }
        }

        private void LoadBookmarks()
        {
            if (!File.Exists(_bookmarksFilePath)) return;
            try
            {
                var json = File.ReadAllText(_bookmarksFilePath);
                var loadedBookmarks = JsonSerializer.Deserialize<ObservableCollection<Bookmark>>(json);
                if (loadedBookmarks != null)
                {
                    Bookmarks = loadedBookmarks;
                    foreach (var bookmark in Bookmarks)
                    {
                       UpdateFavicon(bookmark);
                    }
                }
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show($"Could not load bookmarks: {ex.Message}");
            }
        }

        private void SaveBookmarks()
        {
            try
            {
                var options = new JsonSerializerOptions { WriteIndented = true, IgnoreReadOnlyProperties = true };
                var json = JsonSerializer.Serialize(Bookmarks, options);
                File.WriteAllText(_bookmarksFilePath, json);
            }
            catch (Exception ex)
            {
                 System.Windows.MessageBox.Show($"Could not save bookmarks: {ex.Message}");
            }
        }
private void MinimizeCustom()
{
    if (_isMinimized) return;

    _originalHeight = this.Height;
    _originalWidth = this.Width;
    _originalBorderPadding = MainOverlayBorder.Padding;
    _originalBorderCornerRadius = MainOverlayBorder.CornerRadius;

    BrowserTabs.Visibility = Visibility.Collapsed;
    double newWidth = 22;
    this.Left += this.Width - newWidth;
    MainOverlayBorder.Padding = new Thickness(0);
    MainOverlayBorder.CornerRadius = new CornerRadius(0);
    this.Height = 22;
    this.Width = newWidth;
    _isMinimized = true;
}
private Task<(bool success, string name, string url)> ShowBookmarkDialog(string defaultName = "", string defaultUrl = "")
{
    var tcs = new TaskCompletionSource<(bool success, string name, string url)>();

    var dialog = new Window
    {
        Title = "Bookmark",
        Owner = this,
        WindowStyle = WindowStyle.None,
        AllowsTransparency = true,
        Background = System.Windows.Media.Brushes.Transparent,
        ShowInTaskbar = false,
        WindowStartupLocation = WindowStartupLocation.CenterOwner,
        Width = 450,
        Height = 180,
    };
    MakeWindowNonDraggable(dialog);
    dialog.SourceInitialized += Dialog_SourceInitialized;

    var mainBorder = new Border { Style = (Style)FindResource("DialogBorderStyle"), Padding = new Thickness(20) };
    dialog.Content = mainBorder;

    var parentGrid = new Grid();
    mainBorder.Child = parentGrid;

    var contentGrid = new Grid { Margin = new Thickness(0, 20, 0, 0) };
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
    contentGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
    contentGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
    contentGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

    var nameLabel = new System.Windows.Controls.Label { Content = "Name:", Style = (Style)FindResource("DialogLabelStyle"), Margin = new Thickness(0, 0, 10, 0) };
    var nameTextBox = new System.Windows.Controls.TextBox { Text = defaultName, Style = (Style)FindResource("DialogTextBoxStyle"), Margin = new Thickness(0, 5, 0, 5) };
    var urlLabel = new System.Windows.Controls.Label { Content = "URL:", Style = (Style)FindResource("DialogLabelStyle"), Margin = new Thickness(0, 0, 10, 0) };
    var urlTextBox = new System.Windows.Controls.TextBox { Text = defaultUrl, Style = (Style)FindResource("DialogTextBoxStyle"), Margin = new Thickness(0, 5, 0, 5) };

    Grid.SetRow(nameLabel, 0); Grid.SetColumn(nameLabel, 0);
    Grid.SetRow(nameTextBox, 0); Grid.SetColumn(nameTextBox, 1);
    Grid.SetRow(urlLabel, 1); Grid.SetColumn(urlLabel, 0);
    Grid.SetRow(urlTextBox, 1); Grid.SetColumn(urlTextBox, 1);

var okButton = new System.Windows.Controls.Button { Content = "OK", Style = (Style)FindResource("DialogButtonStyle"), Width = 85, Margin = new Thickness(0, 0, 10, 0), IsDefault = true };
    okButton.Click += (s, e) => { tcs.TrySetResult((true, nameTextBox.Text, urlTextBox.Text)); dialog.Close(); };

    var cancelButton = new System.Windows.Controls.Button { Content = "Cancel", Style = (Style)FindResource("DialogButtonStyle"), Width = 85, IsCancel = true };
    cancelButton.Click += (s, e) => { tcs.TrySetResult((false, "", "")); dialog.Close(); };
    
    var webView = GetCurrentWebView();
    if (webView != null)
    {
        webView.Visibility = Visibility.Collapsed;
    }
    if (_webViewPlaceholder != null)
    {
        _webViewPlaceholder.Visibility = Visibility.Visible;
    }

    dialog.Closed += (s, e) => {
        _modalOverlay.Visibility = Visibility.Collapsed;
        if (webView != null)
        {
            webView.Visibility = Visibility.Visible;
        }
        if (_webViewPlaceholder != null)
        {
            _webViewPlaceholder.Visibility = Visibility.Collapsed;
        }
        if (!tcs.Task.IsCompleted)
        {
            tcs.TrySetResult((false, "", ""));
        }
    };

            var buttonPanel = new StackPanel { Orientation = System.Windows.Controls.Orientation.Horizontal, HorizontalAlignment = System.Windows.HorizontalAlignment.Right, Margin = new Thickness(0, 15, 0, 0) };
        buttonPanel.Children.Add(okButton);
    buttonPanel.Children.Add(cancelButton);
    Grid.SetRow(buttonPanel, 3); Grid.SetColumnSpan(buttonPanel, 2);

    contentGrid.Children.Add(nameLabel);
    contentGrid.Children.Add(nameTextBox);
    contentGrid.Children.Add(urlLabel);
    contentGrid.Children.Add(urlTextBox);
    contentGrid.Children.Add(buttonPanel);
    
    var closeButton = new System.Windows.Controls.Button
    {
        Content = "✕",
        Style = (Style)FindResource("DialogCloseButtonStyle"),
        HorizontalAlignment = System.Windows.HorizontalAlignment.Right,
        VerticalAlignment = VerticalAlignment.Top,
        Margin = new Thickness(0, -20, -20, 0),
        IsCancel = true
    };
    closeButton.Click += (s, e) => dialog.Close();

    parentGrid.Children.Add(contentGrid);
    parentGrid.Children.Add(closeButton);

    _modalOverlay.Visibility = Visibility.Visible;
    dialog.Show();

    return tcs.Task;
}
private async void AddBookmarkButton_Click(object sender, RoutedEventArgs e)
{
    var webView = GetCurrentWebView();
    var currentUrl = webView?.Source?.ToString() ?? "https://www.google.com";
    var currentTitle = string.IsNullOrWhiteSpace(webView?.CoreWebView2?.DocumentTitle) ? "New Bookmark" : webView.CoreWebView2.DocumentTitle;


    BitmapImage currentFaviconSource = null;
    if (BrowserTabs.SelectedItem is TabItem currentTab && currentTab.Header is FrameworkElement tabHeader)
    {
        var faviconImageControl = FindChild<System.Windows.Controls.Image>(tabHeader);

        if (faviconImageControl != null && faviconImageControl.Source is BitmapImage bmp)
        {

            if (faviconImageControl.Name != "loadingSpinner" && faviconImageControl.Visibility == Visibility.Visible)
            {
                currentFaviconSource = bmp;
            }
        }
    }

    var (success, name, url) = await ShowBookmarkDialog(currentTitle, currentUrl);

    if (success)
    {
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(url))
        {
            System.Windows.MessageBox.Show("Bookmark name and URL cannot be empty.", "Invalid Input", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }
        var newBookmark = new Bookmark { Name = name, Url = url };

        if (currentFaviconSource != null)
        {
            newBookmark.Favicon = currentFaviconSource;
        }
        else
        {
            UpdateFavicon(newBookmark);
        }

        Bookmarks.Add(newBookmark);
    }
}
        private async void EditBookmark_Click(object sender, RoutedEventArgs e)
        {
            if (sender is MenuItem menuItem && menuItem.DataContext is Bookmark bookmarkToEdit)
            {
                var (success, name, url) = await ShowBookmarkDialog(bookmarkToEdit.Name, bookmarkToEdit.Url);
                if (success)
                {
                    if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(url))
                    {
                        System.Windows.MessageBox.Show("Bookmark name and URL cannot be empty.", "Invalid Input", MessageBoxButton.OK, MessageBoxImage.Warning);
                        return;
                    }
                    bookmarkToEdit.Name = name;
                    bookmarkToEdit.Url = url;
                    UpdateFavicon(bookmarkToEdit);
                }
            }
        }

private async void DeleteBookmark_Click(object sender, RoutedEventArgs e)
{
    if (sender is MenuItem menuItem && menuItem.DataContext is Bookmark bookmarkToDelete)
    {
        bool shouldDelete = await ShowExitConfirmationDialog("Confirm Delete", $"Are you sure you want to delete the '{bookmarkToDelete.Name}' bookmark?");
        if (shouldDelete)
        {
            Bookmarks.Remove(bookmarkToDelete);
        }
    }
}private void Bookmark_RightClick(object sender, MouseButtonEventArgs e)
        {
            if (sender is FrameworkElement element && element.DataContext is Bookmark bookmark)
            {
                // Prevent any default context menus
                e.Handled = true; 
                ShowCustomBookmarkMenu(bookmark);
            }
        }

        private void ShowCustomBookmarkMenu(Bookmark bookmark)
        {
            GetCursorPos(out POINT cursor);

            var menuWindow = new Window
            {
                Owner = this,
                ShowInTaskbar = false, // Corrected typo that my own dumbass made
                WindowStyle = WindowStyle.None,
                AllowsTransparency = true,
                Background = System.Windows.Media.Brushes.Transparent,
                SizeToContent = SizeToContent.WidthAndHeight,
                WindowStartupLocation = WindowStartupLocation.Manual,
                Left = cursor.X + 2,
                Top = cursor.Y + 2,
                Topmost = true
            };

            menuWindow.SourceInitialized += Dialog_SourceInitialized;

            EventHandler? deactivatedHandler = null;
            deactivatedHandler = (s, args) => menuWindow.Close();
            menuWindow.Deactivated += deactivatedHandler;
            
            var menuItemStyle = new Style(typeof(System.Windows.Controls.Button));
            
            menuItemStyle.Setters.Add(new Setter(BackgroundProperty, System.Windows.Media.Brushes.Transparent));
            menuItemStyle.Setters.Add(new Setter(ForegroundProperty, System.Windows.Media.Brushes.Lime));
            menuItemStyle.Setters.Add(new Setter(BorderThicknessProperty, new Thickness(0)));
            menuItemStyle.Setters.Add(new Setter(PaddingProperty, new Thickness(12, 6, 12, 6)));
            menuItemStyle.Setters.Add(new Setter(HorizontalContentAlignmentProperty, System.Windows.HorizontalAlignment.Left));
            menuItemStyle.Setters.Add(new Setter(CursorProperty, System.Windows.Input.Cursors.Hand));

            var controlTemplate = new ControlTemplate(typeof(System.Windows.Controls.Button));
            
            var border = new FrameworkElementFactory(typeof(Border));
            border.Name = "templateBorder";
            border.SetBinding(Border.BackgroundProperty, new System.Windows.Data.Binding("Background") { RelativeSource = RelativeSource.TemplatedParent });
            

            var contentPresenter = new FrameworkElementFactory(typeof(ContentPresenter));
            contentPresenter.SetValue(HorizontalAlignmentProperty, System.Windows.HorizontalAlignment.Left);
            contentPresenter.SetValue(VerticalAlignmentProperty, VerticalAlignment.Center);

            contentPresenter.SetBinding(ContentPresenter.MarginProperty, new System.Windows.Data.Binding("Padding") { RelativeSource = RelativeSource.TemplatedParent }); // <-- FUCKFUCKFUCKFUCKFUCKFUFKCKCKCKC
            
            border.AppendChild(contentPresenter);
            controlTemplate.VisualTree = border;
            
            var trigger = new Trigger { Property = IsMouseOverProperty, Value = true };
            trigger.Setters.Add(new Setter(Border.BackgroundProperty, new SolidColorBrush(System.Windows.Media.Color.FromRgb(0, 100, 0)), "templateBorder"));
            
            controlTemplate.Triggers.Add(trigger);
            
            menuItemStyle.Setters.Add(new Setter(TemplateProperty, controlTemplate));
            
            var editButton = new System.Windows.Controls.Button { Content = "Edit", Style = menuItemStyle };
            editButton.Click += (s, args) =>
            {
                menuWindow.Deactivated -= deactivatedHandler;
                menuWindow.Close();
                PerformEditBookmark(bookmark);
            };

            var deleteButton = new System.Windows.Controls.Button { Content = "Delete", Style = menuItemStyle };
            deleteButton.Click += (s, args) =>
            {
                menuWindow.Deactivated -= deactivatedHandler;
                menuWindow.Close();
                PerformDeleteBookmark(bookmark);
            };

            var menuPanel = new StackPanel();
            menuPanel.Children.Add(editButton);
            menuPanel.Children.Add(deleteButton);

            var menuBorder = new Border
            {
                Background = System.Windows.Media.Brushes.Black,
                BorderBrush = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0x55, 0x55, 0x55)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(4),
                Child = menuPanel
            };

            menuWindow.Content = menuBorder;
            menuWindow.Show();
            menuWindow.Activate();
        }
        private void Bookmark_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button button && button.DataContext is Bookmark bookmark)
            {
                Navigate(bookmark.Url);
            }
        }
        private async void PerformEditBookmark(Bookmark bookmarkToEdit)
        {
            var (success, name, url) = await ShowBookmarkDialog(bookmarkToEdit.Name, bookmarkToEdit.Url);
            if (success)
            {
                if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(url))
                {
                    System.Windows.MessageBox.Show("Bookmark name and URL cannot be empty.", "Invalid Input", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
                bookmarkToEdit.Name = name;
                bookmarkToEdit.Url = url;
                UpdateFavicon(bookmarkToEdit);
            }
        }

        private async void PerformDeleteBookmark(Bookmark bookmarkToDelete)
        {
            bool shouldDelete = await ShowExitConfirmationDialog("Confirm Delete", $"Are you sure you want to delete the '{bookmarkToDelete.Name}' bookmark?");
            if (shouldDelete)
            {
                Bookmarks.Remove(bookmarkToDelete);
            }
        }        private void UpdateFavicon(Bookmark bookmark)
        {
            if (!Uri.TryCreate(bookmark.Url, UriKind.Absolute, out var uri)) return;
            
            var faviconUrl = $"https://www.google.com/s2/favicons?domain={uri.Host}&sz=16";
            try
            {
                var bitmap = new BitmapImage();
                bitmap.BeginInit();
                bitmap.UriSource = new Uri(faviconUrl, UriKind.Absolute);
                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                bitmap.EndInit();
                bookmark.Favicon = bitmap;
            }
            catch
            {
                bookmark.Favicon = null; 
            }
        }

        #endregion
        
        private void MainWindow_SourceInitialized(object sender, EventArgs e)
        {
            IntPtr hwnd = new WindowInteropHelper(this).Handle;
            int extendedStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
            SetWindowLong(hwnd, GWL_EXSTYLE, extendedStyle | WS_EX_LAYERED | WS_EX_TOOLWINDOW);
            SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
            SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
            ApplyOverlayOpacity(_overlayOpacity);
        }

        private void ApplyOverlayOpacity(double opacity)
        {
            // Clamp so the overlay can never fully vanish while still eating mouse input
            _overlayOpacity = Math.Clamp(opacity, 0.04, 1.0);
            this.Opacity = _overlayOpacity;
        }

        #region Transparency Toggle

        private void ToggleTransparencyMode()
        {
            _isTransparentMode = !_isTransparentMode;
            if (_isTransparentMode)
            {
                ApplyOverlayOpacity(_transparencyLevel);
            }
            else
            {
                ApplyOverlayOpacity(1.0);
            }
            UpdateTransparencyButtonUI();
            SaveSettings();
        }

        private void TransparencySlider_ValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
        {
            _transparencyLevel = e.NewValue;
            if (_isTransparentMode)
            {
                ApplyOverlayOpacity(_transparencyLevel);
            }
            SaveSettings();
        }

        private void TransparencyButton_Click(object sender, RoutedEventArgs e)
        {
            if (_transparencySliderPopup != null)
            {
                _transparencySliderPopup.Visibility = _transparencySliderPopup.Visibility == Visibility.Visible
                    ? Visibility.Collapsed : Visibility.Visible;
            }
        }

        private void UpdateTransparencyButtonUI()
        {
            if (_transparencyToggleButton != null)
            {
                var img = _transparencyToggleButton.Content as System.Windows.Controls.Image;
                if (img != null)
                {
                    img.Opacity = _isTransparentMode ? 0.5 : 1.0;
                }
                _transparencyToggleButton.ToolTip = _isTransparentMode
                    ? $"Transparency ON ({(int)(_transparencyLevel * 100)}%) — Shift+Alt+T"
                    : "Transparency OFF — Shift+Alt+T";
            }
        }

        #endregion

        #region Resize Overlay

        private void ResizeOverlay(double delta)
        {
            double aspectRatio = this.Width / this.Height;
            double newHeight = this.Height + delta;
            double newWidth = newHeight * aspectRatio;

            // Clamp to reasonable bounds
            var workArea = System.Windows.SystemParameters.WorkArea;
            newHeight = Math.Clamp(newHeight, 300, workArea.Height);
            newWidth = Math.Clamp(newWidth, 300, workArea.Width);

            this.Height = newHeight;
            this.Width = newWidth;
            SaveSettings();
        }

        #endregion

        #region Intro Video

        private void InitializeIntroVideo(Grid rootGrid)
        {
            try
            {
                // Look for intro.mp4 next to the executable or in the app directory
                string appDir = AppDomain.CurrentDomain.BaseDirectory;
                string videoPath = Path.Combine(appDir, "intro.mp4");

                if (!File.Exists(videoPath))
                {
                    // Fallback checks
                    var parentDir = Directory.GetParent(appDir)?.FullName;
                    if (parentDir != null && File.Exists(Path.Combine(parentDir, "intro.mp4")))
                    {
                        videoPath = Path.Combine(parentDir, "intro.mp4");
                    }
                }

                if (!File.Exists(videoPath))
                {
                    Debug.WriteLine("intro.mp4 not found, skipping intro video.");
                    _introFinished = true;
                    return;
                }

                _introOverlay = new Grid
                {
                    Background = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0x0A, 0x0D, 0x14)),
                    Visibility = Visibility.Visible,
                    HorizontalAlignment = System.Windows.HorizontalAlignment.Stretch,
                    VerticalAlignment = VerticalAlignment.Stretch
                };

                _introMedia = new MediaElement
                {
                    Source = new Uri(videoPath, UriKind.Absolute),
                    LoadedBehavior = MediaState.Manual,
                    UnloadedBehavior = MediaState.Stop,
                    Stretch = Stretch.Uniform,
                    Volume = 0.85
                };

                _introMedia.MediaEnded += (s, e) => DismissIntroVideo();
                _introMedia.MediaFailed += (s, e) => DismissIntroVideo();

                _introOverlay.Children.Add(_introMedia);

                // Subtle "Click or press Esc to skip" watermark badge
                var skipBadge = new Border
                {
                    Background = new SolidColorBrush(System.Windows.Media.Color.FromArgb(0x60, 0x0A, 0x0E, 0x1A)),
                    BorderBrush = new SolidColorBrush(System.Windows.Media.Color.FromArgb(0x80, 0x00, 0xE5, 0xFF)),
                    BorderThickness = new Thickness(1),
                    CornerRadius = new CornerRadius(6),
                    Padding = new Thickness(10, 4, 10, 4),
                    HorizontalAlignment = System.Windows.HorizontalAlignment.Right,
                    VerticalAlignment = VerticalAlignment.Bottom,
                    Margin = new Thickness(0, 0, 16, 16),
                    Cursor = System.Windows.Input.Cursors.Hand
                };
                var skipText = new TextBlock
                {
                    Text = "SKIP (ESC)",
                    Foreground = new SolidColorBrush(System.Windows.Media.Color.FromArgb(0xCC, 0x00, 0xE5, 0xFF)),
                    FontSize = 10,
                    FontWeight = FontWeights.SemiBold,
                    FontFamily = new System.Windows.Media.FontFamily("Consolas, Segoe UI")
                };
                skipBadge.Child = skipText;
                skipBadge.MouseLeftButtonDown += (s, e) => DismissIntroVideo();
                _introOverlay.Children.Add(skipBadge);

                _introOverlay.MouseLeftButtonDown += (s, e) => DismissIntroVideo();

                rootGrid.Children.Add(_introOverlay);

                this.Loaded += (s, e) =>
                {
                    try
                    {
                        _introMedia?.Play();
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"Error playing intro video: {ex.Message}");
                        DismissIntroVideo();
                    }
                };
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Failed to setup intro video: {ex.Message}");
                _introFinished = true;
            }
        }

        private void DismissIntroVideo()
        {
            if (_introFinished || _introOverlay == null) return;
            _introFinished = true;

            try
            {
                _introMedia?.Stop();
            }
            catch { }

            var fadeAnim = new System.Windows.Media.Animation.DoubleAnimation
            {
                From = 1.0,
                To = 0.0,
                Duration = TimeSpan.FromMilliseconds(400)
            };

            fadeAnim.Completed += (s, e) =>
            {
                if (_introOverlay != null)
                {
                    _introOverlay.Visibility = Visibility.Collapsed;
                    _introOverlay = null;
                    _introMedia = null;
                }
            };

            _introOverlay.BeginAnimation(UIElement.OpacityProperty, fadeAnim);
        }

        #endregion

        #region AI Chat

        private void BuildAiChatPanel()
        {
            _aiChatPanel = new Grid
            {
                Visibility = Visibility.Collapsed,
                Margin = new Thickness(5, 0, 5, 5)
            };
            _aiChatPanel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // header
            _aiChatPanel.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // messages
            _aiChatPanel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // input

            // ── Header: Provider + Model selectors + Clear button ──
            var headerPanel = new DockPanel { Margin = new Thickness(0, 5, 0, 5) };

            var clearBtn = new System.Windows.Controls.Button
            {
                Content = "🗑 Clear",
                Style = (Style)FindResource("ModernButtonStyle"),
                Margin = new Thickness(5, 0, 0, 0),
                Padding = new Thickness(8, 4, 8, 4),
                FontSize = 12
            };
            clearBtn.Click += (s, e) => { _aiChatService.ClearHistory(); };
            DockPanel.SetDock(clearBtn, Dock.Right);
            headerPanel.Children.Add(clearBtn);

            _aiProviderCombo = new System.Windows.Controls.ComboBox
            {
                Width = 100,
                Margin = new Thickness(0, 0, 5, 0),
                Background = (System.Windows.Media.Brush)FindResource("Theme.Surface"),
                Foreground = (System.Windows.Media.Brush)FindResource("Theme.TextPrimary"),
                BorderBrush = (System.Windows.Media.Brush)FindResource("Theme.Border"),
                FontSize = 12
            };
            foreach (var name in _aiChatService.GetProviderNames())
                _aiProviderCombo.Items.Add(name);
            _aiProviderCombo.SelectedItem = _aiChatService.ActiveProviderName;
            _aiProviderCombo.SelectionChanged += AiProviderCombo_SelectionChanged;
            headerPanel.Children.Add(_aiProviderCombo);

            _aiModelCombo = new System.Windows.Controls.ComboBox
            {
                Width = 160,
                Margin = new Thickness(0, 0, 5, 0),
                Background = (System.Windows.Media.Brush)FindResource("Theme.Surface"),
                Foreground = (System.Windows.Media.Brush)FindResource("Theme.TextPrimary"),
                BorderBrush = (System.Windows.Media.Brush)FindResource("Theme.Border"),
                FontSize = 12
            };
            PopulateModelCombo();
            headerPanel.Children.Add(_aiModelCombo);

            Grid.SetRow(headerPanel, 0);
            _aiChatPanel.Children.Add(headerPanel);

            // ── Messages ScrollViewer ──
            _aiChatScrollViewer = new ScrollViewer
            {
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
                Style = (Style)FindResource("DarkThinScrollViewerStyle")
            };

            _aiChatMessagesControl = new ItemsControl
            {
                ItemsSource = _aiChatService.Messages,
                Margin = new Thickness(0, 5, 0, 5)
            };

            // Item template for chat messages
            var msgTemplate = new DataTemplate(typeof(ChatMessage));
            var borderFactory = new FrameworkElementFactory(typeof(Border));
            borderFactory.SetValue(Border.CornerRadiusProperty, new CornerRadius(8));
            borderFactory.SetValue(Border.PaddingProperty, new Thickness(10, 6, 10, 6));
            borderFactory.SetValue(Border.MarginProperty, new Thickness(5, 3, 5, 3));
            borderFactory.SetValue(Border.MaxWidthProperty, 500.0);

            var textFactory = new FrameworkElementFactory(typeof(TextBlock));
            textFactory.SetBinding(TextBlock.TextProperty, new System.Windows.Data.Binding("Content"));
            textFactory.SetValue(TextBlock.TextWrappingProperty, TextWrapping.Wrap);
            textFactory.SetValue(TextBlock.FontSizeProperty, 13.0);

            borderFactory.AppendChild(textFactory);
            msgTemplate.VisualTree = borderFactory;

            // Use a style trigger to differentiate user vs AI messages
            var msgStyle = new Style(typeof(ContentPresenter));

            var userTrigger = new DataTrigger
            {
                Binding = new System.Windows.Data.Binding("IsUser"),
                Value = true
            };
            userTrigger.Setters.Add(new Setter(FrameworkElement.HorizontalAlignmentProperty, System.Windows.HorizontalAlignment.Right));
            msgStyle.Triggers.Add(userTrigger);

            var aiTrigger = new DataTrigger
            {
                Binding = new System.Windows.Data.Binding("IsUser"),
                Value = false
            };
            aiTrigger.Setters.Add(new Setter(FrameworkElement.HorizontalAlignmentProperty, System.Windows.HorizontalAlignment.Left));
            msgStyle.Triggers.Add(aiTrigger);

            _aiChatMessagesControl.ItemContainerStyle = msgStyle;
            _aiChatMessagesControl.ItemTemplate = msgTemplate;

            _aiChatScrollViewer.Content = _aiChatMessagesControl;

            var msgBorder = new Border
            {
                Background = (System.Windows.Media.Brush)FindResource("Theme.Surface"),
                CornerRadius = new CornerRadius(8),
                Padding = new Thickness(5)
            };
            msgBorder.Child = _aiChatScrollViewer;

            Grid.SetRow(msgBorder, 1);
            _aiChatPanel.Children.Add(msgBorder);

            // ── Sending indicator ──
            _aiSendingIndicator = new TextBlock
            {
                Text = "⏳ Thinking...",
                Foreground = (System.Windows.Media.Brush)FindResource("Theme.TextMuted"),
                FontSize = 12,
                Margin = new Thickness(10, 2, 0, 2),
                Visibility = Visibility.Collapsed
            };

            // ── Input area ──
            var inputGrid = new Grid { Margin = new Thickness(0, 5, 0, 0) };
            inputGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            inputGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            inputGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            inputGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            Grid.SetRow(_aiSendingIndicator, 0);
            Grid.SetColumnSpan(_aiSendingIndicator, 2);
            inputGrid.Children.Add(_aiSendingIndicator);

            _aiChatInput = new System.Windows.Controls.TextBox
            {
                AcceptsReturn = false,
                TextWrapping = TextWrapping.Wrap,
                MaxHeight = 80,
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                Background = (System.Windows.Media.Brush)FindResource("Theme.Input"),
                Foreground = (System.Windows.Media.Brush)FindResource("Theme.TextPrimary"),
                BorderBrush = (System.Windows.Media.Brush)FindResource("Theme.Border"),
                CaretBrush = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0x00, 0xE5, 0xFF)),
                Padding = new Thickness(8, 6, 8, 6),
                FontSize = 13,
                VerticalContentAlignment = VerticalAlignment.Center
            };
            _aiChatInput.KeyDown += AiChatInput_KeyDown;

            var sendButton = new System.Windows.Controls.Button
            {
                Content = "Send",
                Style = (Style)FindResource("DialogButtonStyle"),
                Margin = new Thickness(5, 0, 0, 0),
                Padding = new Thickness(15, 6, 15, 6),
                FontSize = 13,
                VerticalAlignment = VerticalAlignment.Bottom
            };
            sendButton.Click += AiSendButton_Click;

            Grid.SetRow(_aiChatInput, 1);
            Grid.SetColumn(_aiChatInput, 0);
            Grid.SetRow(sendButton, 1);
            Grid.SetColumn(sendButton, 1);
            inputGrid.Children.Add(_aiChatInput);
            inputGrid.Children.Add(sendButton);

            Grid.SetRow(inputGrid, 2);
            _aiChatPanel.Children.Add(inputGrid);

            // Apply background colors after messages are added
            _aiChatService.Messages.CollectionChanged += (s, e) =>
            {
                Dispatcher.InvokeAsync(() =>
                {
                    _aiChatScrollViewer?.ScrollToEnd();
                    ApplyMessageColors();
                });
            };
        }

        private void ApplyMessageColors()
        {
            if (_aiChatMessagesControl == null) return;

            for (int i = 0; i < _aiChatMessagesControl.Items.Count; i++)
            {
                var container = _aiChatMessagesControl.ItemContainerGenerator.ContainerFromIndex(i) as ContentPresenter;
                if (container == null) continue;

                var msg = _aiChatMessagesControl.Items[i] as ChatMessage;
                if (msg == null) continue;

                // Find the Border in the template
                container.ApplyTemplate();
                if (VisualTreeHelper.GetChildrenCount(container) > 0)
                {
                    var border = VisualTreeHelper.GetChild(container, 0) as Border;
                    if (border != null)
                    {
                        if (msg.IsUser)
                        {
                            border.Background = new LinearGradientBrush(
                                System.Windows.Media.Color.FromRgb(0x00, 0xA8, 0xE8),
                                System.Windows.Media.Color.FromRgb(0x7B, 0x61, 0xFF),
                                new System.Windows.Point(0, 0),
                                new System.Windows.Point(1, 1));
                            var tb = border.Child as TextBlock;
                            if (tb != null) tb.Foreground = System.Windows.Media.Brushes.White;
                        }
                        else
                        {
                            border.Background = (System.Windows.Media.Brush)FindResource("Theme.SurfaceAlt");
                            var tb = border.Child as TextBlock;
                            if (tb != null) tb.Foreground = (System.Windows.Media.Brush)FindResource("Theme.TextPrimary");
                        }
                    }
                }
            }
        }

        private void PopulateModelCombo()
        {
            if (_aiModelCombo == null) return;
            _aiModelCombo.Items.Clear();

            var models = _aiChatService.GetModelsForProvider(_aiChatService.ActiveProviderName);
            foreach (var model in models)
            {
                _aiModelCombo.Items.Add(model);
            }
            _aiModelCombo.DisplayMemberPath = "DisplayName";

            var activeModel = models.FirstOrDefault(m => m.ModelId == _aiChatService.ActiveModelId)
                              ?? models.FirstOrDefault();
            if (activeModel != null)
            {
                _aiModelCombo.SelectedItem = activeModel;
                _aiChatService.ActiveModelId = activeModel.ModelId;
            }
        }

        private void AiProviderCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_aiProviderCombo?.SelectedItem is string provider)
            {
                _aiChatService.ActiveProviderName = provider;
                var models = _aiChatService.GetModelsForProvider(provider);
                if (models.Any())
                {
                    _aiChatService.ActiveModelId = models[0].ModelId;
                }
                PopulateModelCombo();
                SaveSettings();
            }
        }

        private void AiModelCombo_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_aiModelCombo?.SelectedItem is AiModelInfo model)
            {
                _aiChatService.ActiveModelId = model.ModelId;
                SaveSettings();
            }
        }

        private void ToggleAiChat()
        {
            _isAiChatVisible = !_isAiChatVisible;
            if (_aiChatPanel != null)
            {
                _aiChatPanel.Visibility = _isAiChatVisible ? Visibility.Visible : Visibility.Collapsed;
            }

            // Toggle browser content area visibility
            if (_webViewPlaceholder != null)
            {
                // When AI chat is visible, collapse the browser view area
                var contentPresenter = _webViewPlaceholder.Parent as Grid;
                if (contentPresenter != null)
                {
                    foreach (UIElement child in contentPresenter.Children)
                    {
                        if (child is ContentPresenter cp && cp.Name == "PART_SelectedContentHost")
                        {
                            cp.Visibility = _isAiChatVisible ? Visibility.Collapsed : Visibility.Visible;
                        }
                    }
                }
            }

            // Update button appearance
            if (_aiChatToggleButton != null)
            {
                _aiChatToggleButton.ToolTip = _isAiChatVisible ? "Switch to Browser" : "Open AI Chat";
            }
        }

        private void AiChatToggle_Click(object sender, RoutedEventArgs e)
        {
            ToggleAiChat();
        }

        private async void AiSendButton_Click(object sender, RoutedEventArgs e)
        {
            await SendAiMessage();
        }

        private async void AiChatInput_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == Key.Enter && !System.Windows.Input.Keyboard.Modifiers.HasFlag(ModifierKeys.Shift))
            {
                e.Handled = true;
                await SendAiMessage();
            }
        }

        private async Task SendAiMessage()
        {
            if (_aiChatInput == null || string.IsNullOrWhiteSpace(_aiChatInput.Text)) return;
            if (_aiChatService.IsProcessing) return;

            var userText = _aiChatInput.Text.Trim();
            _aiChatInput.Text = "";
            _aiChatInput.IsEnabled = false;

            if (_aiSendingIndicator != null)
                _aiSendingIndicator.Visibility = Visibility.Visible;

            try
            {
                await _aiChatService.SendAsync(userText);
            }
            finally
            {
                _aiChatInput.IsEnabled = true;
                _aiChatInput.Focus();
                if (_aiSendingIndicator != null)
                    _aiSendingIndicator.Visibility = Visibility.Collapsed;
            }
        }

        #endregion


        private bool AreHotkeyModifiersActive()
        {
            bool ctrlRequired = (_hotkeyModifiers & MOD_CONTROL) != 0;
            bool shiftRequired = (_hotkeyModifiers & MOD_SHIFT) != 0;
            bool altRequired = (_hotkeyModifiers & MOD_ALT) != 0;
            bool winRequired = (_hotkeyModifiers & MOD_WIN) != 0;

            return _ctrlPressed == ctrlRequired &&
                   _shiftPressed == shiftRequired &&
                   _altPressed == altRequired &&
                   _winPressed == winRequired;
        }

private void GlobalKeyboardHook_KeyUp(object? sender, GlobalKeyEventArgs e)
{
    if (_swallowedKeys.Remove(e.Kbdllhookstruct.vkCode))
    {
        e.Handled = true;
    }

    switch (e.Key)
    {
        case Key.LeftCtrl: case Key.RightCtrl: _ctrlPressed = false; break;
        case Key.LeftShift: case Key.RightShift: _shiftPressed = false; break;
        case Key.LeftAlt: case Key.RightAlt: _altPressed = false; break;
        case Key.LWin: case Key.RWin: _winPressed = false; break;
    }
}

private void GlobalKeyboardHook_KeyDown(object? sender, GlobalKeyEventArgs e)
{
    switch (e.Key)
    {
        case Key.LeftCtrl: case Key.RightCtrl: _ctrlPressed = true; break;
        case Key.LeftShift: case Key.RightShift: _shiftPressed = true; break;
        case Key.LeftAlt: case Key.RightAlt: _altPressed = true; break;
        case Key.LWin: case Key.RWin: _winPressed = true; break;
    }

    if (!_introFinished && (e.Key == Key.Escape || e.Key == Key.Space))
    {
        Dispatcher.Invoke(DismissIntroVideo);
        e.Handled = true;
        return;
    }

    bool handled = false;
    int modifiersPressedCount = (_ctrlPressed ? 1 : 0) + (_shiftPressed ? 1 : 0) + (_altPressed ? 1 : 0) + (_winPressed ? 1 : 0);

    if (_shiftPressed && _altPressed)
    {
        var actionKey = e.Key;
        if (actionKey == Key.W || actionKey == Key.A || actionKey == Key.S || actionKey == Key.D)
        {
            int moveAmount = 50;
            Dispatcher.Invoke(() =>
            {
                if (actionKey == Key.W) this.Top -= moveAmount;
                else if (actionKey == Key.A) this.Left -= moveAmount;
                else if (actionKey == Key.S) this.Top += moveAmount;
                else if (actionKey == Key.D) this.Left += moveAmount;
            });
            handled = true;
        }
        else if (actionKey == Key.C)
        {
            Dispatcher.Invoke(ToggleProgrammaticMinimize);
            handled = true;
        }
        else if (actionKey == Key.T)
        {
            Dispatcher.Invoke(ToggleTransparencyMode);
            handled = true;
        }
        // Resize: Shift+Alt+Up = bigger, Shift+Alt+Down = smaller
        else if (actionKey == Key.Up)
        {
            Dispatcher.Invoke(() => ResizeOverlay(50));
            handled = true;
        }
        else if (actionKey == Key.Down)
        {
            Dispatcher.Invoke(() => ResizeOverlay(-50));
            handled = true;
        }
        else if (actionKey == Key.LeftAlt || actionKey == Key.RightAlt)
        {
            handled = true;
        }
    }

    if (AreHotkeyModifiersAPotentialMatch())
    {
        bool isActionKey = e.Kbdllhookstruct.vkCode == _hotkeyKey;
        bool isRequiredModifier =
            (((_hotkeyModifiers & MOD_CONTROL) != 0) && (e.Key == Key.LeftCtrl || e.Key == Key.RightCtrl)) ||
            (((_hotkeyModifiers & MOD_SHIFT) != 0) && (e.Key == Key.LeftShift || e.Key == Key.RightShift)) ||
            (((_hotkeyModifiers & MOD_ALT) != 0) && (e.Key == Key.LeftAlt || e.Key == Key.RightAlt)) ||
            (((_hotkeyModifiers & MOD_WIN) != 0) && (e.Key == Key.LWin || e.Key == Key.RWin));

        if (AreHotkeyModifiersActive() && isActionKey)
        {
            Dispatcher.Invoke(CaptureActiveScreen);
            handled = true;
        }
        else if (isRequiredModifier && modifiersPressedCount > 1)
        {
            handled = true;
        }
    }

    if (handled)
    {
        e.Handled = true;
        _swallowedKeys.Add(e.Kbdllhookstruct.vkCode);
    }
}

        private void CaptureActiveScreen()
        {
            GetCursorPos(out POINT cursorPoint);
            var activeScreen = Screen.AllScreens.FirstOrDefault(s => s.Bounds.Contains(cursorPoint.X, cursorPoint.Y)) ?? Screen.PrimaryScreen;
            if (activeScreen == null) return;
            var bounds = activeScreen.Bounds;

            using (var bitmap = new Bitmap(bounds.Width, bounds.Height, System.Drawing.Imaging.PixelFormat.Format32bppArgb))
            {
                using (var graphics = Graphics.FromImage(bitmap))
                {
                    graphics.CopyFromScreen(bounds.X, bounds.Y, 0, 0, bounds.Size, CopyPixelOperation.SourceCopy);
                }
                
                var bitmapImage = BitmapToImageSource(bitmap);
                var tempFilePath = Path.Combine(_screenshotsTempFolder, $"{Guid.NewGuid()}.png");
                bitmap.Save(tempFilePath, ImageFormat.Png);

                var screenshot = new Screenshot
                {
                    Image = bitmapImage,
                    FilePath = tempFilePath
                };
                Screenshots.Add(screenshot);
                
                if (_screenshotTray.Visibility == Visibility.Collapsed)
                {
                    _screenshotTray.Visibility = Visibility.Visible;
                }
            }
        }
private bool AreHotkeyModifiersAPotentialMatch()
{
    bool ctrlRequired = (_hotkeyModifiers & MOD_CONTROL) != 0;
    bool shiftRequired = (_hotkeyModifiers & MOD_SHIFT) != 0;
    bool altRequired = (_hotkeyModifiers & MOD_ALT) != 0;
    bool winRequired = (_hotkeyModifiers & MOD_WIN) != 0;

    if (_ctrlPressed && !ctrlRequired) return false;
    if (_shiftPressed && !shiftRequired) return false;
    if (_altPressed && !altRequired) return false;
    if (_winPressed && !winRequired) return false;

    return true;
}
        private BitmapImage BitmapToImageSource(Bitmap bitmap)
        {
            using (var memory = new MemoryStream())
            {
                bitmap.Save(memory, ImageFormat.Png);
                memory.Position = 0;
                var bitmapImage = new BitmapImage();
                bitmapImage.BeginInit();
                bitmapImage.StreamSource = memory;
                bitmapImage.CacheOption = BitmapCacheOption.OnLoad;
                bitmapImage.EndInit();
                bitmapImage.Freeze();
                return bitmapImage;
            }
        }

        private void ToggleScreenshotsButton_Click(object sender, RoutedEventArgs e)
        {
            if (_screenshotTray != null)
            {
                _screenshotTray.Visibility = _screenshotTray.Visibility == Visibility.Collapsed ? Visibility.Visible : Visibility.Collapsed;
            }
        }

        private void DeleteScreenshot_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button button && button.DataContext is Screenshot screenshotToDelete)
            {
                Screenshots.Remove(screenshotToDelete);
                try
                {
                    if (File.Exists(screenshotToDelete.FilePath))
                    {
                        File.Delete(screenshotToDelete.FilePath);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error deleting screenshot file: {ex.Message}");
                }
            }
        }

        private void Screenshot_MouseMove(object sender, System.Windows.Input.MouseEventArgs e)
        {
            if (e.LeftButton == MouseButtonState.Pressed && sender is System.Windows.Controls.Image image)
            {
                if (image.DataContext is Screenshot screenshot && File.Exists(screenshot.FilePath))
                {
                    image.GiveFeedback += Screenshot_GiveFeedback;

                    var data = new System.Windows.DataObject(System.Windows.DataFormats.FileDrop, new[] { screenshot.FilePath });
                    DragDrop.DoDragDrop(image, data, System.Windows.DragDropEffects.Copy);

                    image.GiveFeedback -= Screenshot_GiveFeedback;
                }
            }
        }
        private void Screenshot_GiveFeedback(object sender, System.Windows.GiveFeedbackEventArgs e)
        {
            e.UseDefaultCursors = false;
            Mouse.SetCursor(System.Windows.Input.Cursors.Arrow);
            e.Handled = true;
        }
        private void TabItem_GiveFeedback(object sender, System.Windows.GiveFeedbackEventArgs e)
        {
            e.UseDefaultCursors = false;
            Mouse.SetCursor(System.Windows.Input.Cursors.Arrow);
            e.Handled = true;
        }

        private void UpdateSpinnerState(bool isLoading)
        {
            Dispatcher.Invoke(() =>
            {
                if (_loadingSpinner != null)
                {
                    _loadingSpinner.Visibility = isLoading ? Visibility.Visible : Visibility.Collapsed;
                }
                if (_refreshButton != null)
                {
                    _refreshButton.Visibility = isLoading ? Visibility.Collapsed : Visibility.Visible;
                }
            });
        }

        private WebView2CompositionControl? GetCurrentWebView()
        {
            if (BrowserTabs.SelectedItem is TabItem selectedTab) return selectedTab.Content as WebView2CompositionControl;
            return null;
        }

        private void NewTab_Click(object sender, RoutedEventArgs e) => AddNewBrowserTab("https://www.google.com");
        
        private async Task InjectTooltipSuppressionScript(CoreWebView2 coreWebView2)
        {
            const string script = @"
(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        /* Hide tooltips from popular frameworks like Bootstrap, jQuery UI, etc. */
        .tooltip, 
        .ui-tooltip,
        [data-bs-toggle='tooltip'],
        [role='tooltip'],
        /* Added common selectors from previous script for robustness */
        [class*=""tooltip""], [id*=""tooltip""], [class*=""tippy-box""], 
        [data-tippy-root], tp-yt-paper-tooltip,.ytp-tooltip {
            display: none!important;
            visibility: hidden!important;
            opacity: 0!important;
            pointer-events: none!important; /* Added for extra safety */
        }
    `;
    requestAnimationFrame(() => {
        if (document.head) {
            document.head.appendChild(style);
        }
    });

    const neutralizeTooltip = (element) => {
        if (element.hasAttribute('title') && element.getAttribute('title').trim() !== '') {
            const titleText = element.getAttribute('title');
            element.setAttribute('data-hidden-title', titleText);
            element.removeAttribute('title');
        }
    };

    const processInitialDOM = () => {
        document.querySelectorAll('[title]').forEach(neutralizeTooltip);
    };

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.hasAttribute('title')) {
                            neutralizeTooltip(node);
                        }
                        node.querySelectorAll('[title]').forEach(neutralizeTooltip);
                    }
                });
            } else if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
                neutralizeTooltip(mutation.target);
            }
        }
    });

    const startObserver = () => {
        observer.disconnect(); 

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['title']
            });
        } else {
            new MutationObserver((_, obs) => {
                if (document.body) {
                    processInitialDOM();
                    observer.observe(document.body, {
                         childList: true,
                         subtree: true,
                         attributes: true,
                         attributeFilter: ['title']
                    });
                    obs.disconnect();
                }
            }).observe(document.documentElement, { childList: true });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            processInitialDOM();
            startObserver();
        });
    } else {
        processInitialDOM();
        startObserver();
    }
})();
";
            await coreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(script);
        }
private async void AddNewBrowserTab(string url)
        {
            _newTabsOpenedInInterval++;
            var newTab = new TabItem();
            var headerPanel = new Grid();
            headerPanel.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            headerPanel.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            headerPanel.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var closeButton = new System.Windows.Controls.Button
            {
                Content = "x",
                Tag = newTab,
                Margin = new Thickness(5, 0, 0, 0),
                Padding = new Thickness(4, 0, 4, 0),
                FontWeight = FontWeights.Bold,
                FontSize = 12,
                Width = 15,
                VerticalContentAlignment = VerticalAlignment.Center,
                Cursor = System.Windows.Input.Cursors.Hand
            };
            closeButton.Click += CloseTabOnHeader_Click;
            Grid.SetColumn(closeButton, 2);
            
            // Apply the style
            closeButton.Style = (Style)FindResource("TabCloseButtonStyle");
            
            var faviconContainer = new Grid
            {
                Width = 16,
                Height = 16,
                Margin = new Thickness(0, 0, 5, 0),
                VerticalAlignment = VerticalAlignment.Center
            };

            var iconBackground = new Border
            {
                Background = System.Windows.Media.Brushes.White,
                CornerRadius = new CornerRadius(3),
                Visibility = Visibility.Collapsed // Start hidden
            };

            var faviconImage = new System.Windows.Controls.Image();
            iconBackground.Child = faviconImage;


            var loadingSpinner = new System.Windows.Controls.Image
            {
                Source = new System.Windows.Media.Imaging.BitmapImage(new Uri("./loading.png", UriKind.Relative)),
                Style = (Style)FindResource("LoadingSpinnerStyle"),
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = System.Windows.HorizontalAlignment.Center,
                Visibility = Visibility.Visible
            };



            faviconContainer.Children.Add(iconBackground);
            faviconContainer.Children.Add(loadingSpinner);
            Grid.SetColumn(faviconContainer, 0);

            var titleContainerGrid = new Grid();
            Grid.SetColumn(titleContainerGrid, 1);

            var titleTextBlock = new TextBlock
            {
                Text = "Loading...",
                VerticalAlignment = VerticalAlignment.Center,
                TextTrimming = TextTrimming.CharacterEllipsis,
                HorizontalAlignment = System.Windows.HorizontalAlignment.Stretch,
            };
            titleTextBlock.SetResourceReference(TextBlock.ForegroundProperty, "Theme.TextPrimary");

            titleContainerGrid.Children.Add(titleTextBlock);
            headerPanel.Children.Add(faviconContainer);
            headerPanel.Children.Add(titleContainerGrid);
            headerPanel.Children.Add(closeButton);
            newTab.Header = headerPanel;

            var webView = new WebView2CompositionControl();
            newTab.Content = webView;

            _tabLoadingStates[webView] = true; 

            BrowserTabs.Items.Add(newTab);
            BrowserTabs.SelectedItem = newTab;

            var environment = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(null, _userDataFolder);
            await webView.EnsureCoreWebView2Async(environment);

            // Allow screenshots to be dropped into the web content.
            try { WebViewDropForwarder.Attach(webView); }
            catch (Exception ex) { Debug.WriteLine($"Drop forwarder attach failed: {ex.Message}"); }

            Action fetchFavicon = () =>
            {
                if (webView.CoreWebView2 == null) return;

                string? host = null;
                try
                {
                    if (Uri.TryCreate(webView.CoreWebView2.Source, UriKind.Absolute, out var uri))
                    {
                        host = uri.Host;
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Error getting host from CoreWebView2.Source: {ex.Message}");
                }

                if (!string.IsNullOrEmpty(host) && host != "about:blank")
                {
                    var faviconUrl = $"https://www.google.com/s2/favicons?domain={host}&sz=16";
                    try
                    {
                        var bitmap = new System.Windows.Media.Imaging.BitmapImage();

                        bitmap.DownloadCompleted += (s, e) =>
                        {
                            bitmap.Freeze();
                            faviconImage.Source = bitmap;
                            iconBackground.Visibility = Visibility.Visible;
                            loadingSpinner.Visibility = Visibility.Collapsed;
                        };

                        bitmap.DownloadFailed += (s, e) =>
                        {
                            Debug.WriteLine($"Google Favicon download failed for {host}: {e.ErrorException?.Message}");
                            faviconImage.Source = null;
                            iconBackground.Visibility = Visibility.Collapsed;
                            loadingSpinner.Visibility = Visibility.Collapsed;
                        };

                        bitmap.BeginInit();
                        bitmap.CreateOptions = BitmapCreateOptions.IgnoreImageCache;
                        bitmap.CacheOption = BitmapCacheOption.OnDemand; 
                        bitmap.UriSource = new Uri(faviconUrl, UriKind.Absolute);
                        bitmap.EndInit();

                    }
                    catch (Exception ex)
                    {
                        // This catches errors from BeginInit/UriSource/EndInit
                        Debug.WriteLine($"Google Favicon download *initiation* failed for {host}: {ex.Message}");
                        faviconImage.Source = null;
                        iconBackground.Visibility = Visibility.Collapsed;
                        loadingSpinner.Visibility = Visibility.Collapsed;
                    }
                }
                else
                {
                    faviconImage.Source = null;
                    iconBackground.Visibility = Visibility.Collapsed;
                    loadingSpinner.Visibility = Visibility.Collapsed;
                }
            };

            webView.CoreWebView2.PermissionRequested += CoreWebView2_PermissionRequested;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

            if (_usageTrackerPort > 0)
            {
                webView.CoreWebView2.SourceChanged += (s, args) => MarkUserInteraction();
                webView.CoreWebView2.NavigationStarting += (s, args) => MarkUserInteraction();
            }

            string cursorScript = @"
                (function() {
                    'use strict';

                    const style = document.createElement('style');
                    style.textContent = '* { cursor: default !important; }';
                    requestAnimationFrame(() => {
                        if (document.head) document.head.appendChild(style);
                    });
                })();
            ";

            await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(cursorScript);

            await InjectTooltipSuppressionScript(webView.CoreWebView2);
            
            webView.CoreWebView2.NewWindowRequested += (s, e) =>
            {
                e.Handled = true;
                AddNewBrowserTab(e.Uri);
            };
            
            webView.CoreWebView2.NavigationStarting += (s, args) =>
            {
                _tabLoadingStates[webView] = true;
                if (GetCurrentWebView() == webView)
                {
                    UpdateSpinnerState(isLoading: true);
                }
                

                Dispatcher.Invoke(() => {
                    loadingSpinner.Visibility = Visibility.Visible;
                    iconBackground.Visibility = Visibility.Collapsed;
                    faviconImage.Source = null;
                });
            };
            webView.CoreWebView2.NavigationCompleted += (s, args) =>
            {
                _tabLoadingStates[webView] = false;
                if (GetCurrentWebView() == webView)
                {
                    UpdateSpinnerState(isLoading: false);
                }
                Dispatcher.Invoke(fetchFavicon);
            };
            
            webView.DefaultBackgroundColor = System.Drawing.Color.Transparent;
            webView.CoreWebView2.IsMuted = _isMuted;
            webView.CoreWebView2.HistoryChanged += CoreWebView2_HistoryChanged;
            webView.CoreWebView2.SourceChanged += CoreWebView2_SourceChanged;
            webView.Source = new Uri(url);

            webView.CoreWebView2.DocumentTitleChanged += (s, args) => Dispatcher.Invoke(() => titleTextBlock.Text = webView.CoreWebView2.DocumentTitle);

            if (_addressBar != null)
            {
                _addressBar.Focus();
            }
        }
private void CoreWebView2_PermissionRequested(object? sender, CoreWebView2PermissionRequestedEventArgs e)
{
    e.State = CoreWebView2PermissionState.Allow;
}
private void MainWindow_Deactivated(object? sender, EventArgs e)
{
    if (_minimizeOnFocusLoss && !_isMinimized && this.OwnedWindows.Count == 0)
    {
        MinimizeCustom();
    }
}
        private void AddressBar_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                _addressBarHasIntendedChanges = true;
                _urlChangedInInterval = true;

                var webView = GetCurrentWebView();
                Navigate(_addressBar.Text);
                webView?.Focus();
            }
        }
        private void AddressBar_PreviewMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            var textBox = sender as System.Windows.Controls.TextBox;
            if (textBox != null && !textBox.IsKeyboardFocusWithin)
            {
                e.Handled = true;
                textBox.Focus();
            }
        }

private void AddressBar_GotKeyboardFocus(object sender, KeyboardFocusChangedEventArgs e)
        {
            var textBox = sender as System.Windows.Controls.TextBox;
            if (textBox != null)
            {

                var webView = GetCurrentWebView();
                if (webView != null && webView.Source != null)
                {
                    textBox.Text = webView.Source.ToString();
                }

                textBox.SelectAll();
                _addressBarHasIntendedChanges = false;
            }
        }

private void AddressBar_LostFocus(object sender, RoutedEventArgs e)
        {
            if (!_addressBarHasIntendedChanges)
            {
                var webView = GetCurrentWebView();
                if (webView != null && webView.Source != null)
                {
                    _addressBar.Text = GetSimplifiedUrl(webView.Source);
                }
            }
        }

private void Dialog_SourceInitialized(object? sender, EventArgs e)
{
    if (sender is Window window)
    {
        IntPtr hwnd = new WindowInteropHelper(window).Handle;
        
        // Add the same extended window styles as the main window to ensure exclusion works reliably
        int extendedStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
        SetWindowLong(hwnd, GWL_EXSTYLE, extendedStyle | WS_EX_LAYERED | WS_EX_TOOLWINDOW);
        SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
        
        SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
    }
}
        private void Navigate(string address)
        {
            var webView = GetCurrentWebView();
            if (webView == null) return;

            Uri uri;
            if (Uri.TryCreate(address, UriKind.Absolute, out uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
            {
                webView.CoreWebView2.Navigate(address);
            }
            else if (!address.Contains(" ") && address.Contains("."))
            {
                webView.CoreWebView2.Navigate("http://" + address);
            }
            else
            {
                string searchUrl = $"https://www.google.com/search?q={HttpUtility.UrlEncode(address)}";
                webView.CoreWebView2.Navigate(searchUrl);
            }
        }
        
        private void UpdateNavButtonState()
        {
            var webView = GetCurrentWebView();
            if (_backButton != null) _backButton.IsEnabled = webView?.CanGoBack ?? false;
            if (_forwardButton != null) _forwardButton.IsEnabled = webView?.CanGoForward ?? false;
        }

        private void CoreWebView2_HistoryChanged(object? sender, object e) => Dispatcher.Invoke(UpdateNavButtonState);

private void CoreWebView2_SourceChanged(object? sender, Microsoft.Web.WebView2.Core.CoreWebView2SourceChangedEventArgs e)
        {
             var webView = GetCurrentWebView();
             if (webView != null && _addressBar != null && webView.Source != null)
             {
                 Dispatcher.Invoke(() => {
                    if (!_addressBar.IsKeyboardFocusWithin)
                    {
                        _addressBar.Text = GetSimplifiedUrl(webView.Source);
                    }
                 });
             }
        }
        
        private void BrowserTabs_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (e.Source is System.Windows.Controls.TabControl)
            {
                UpdateNavButtonState();
                var webView = GetCurrentWebView();
                if (webView != null)
                {
if (_addressBar != null && webView.Source != null)
                    {
                        if (!_addressBar.IsKeyboardFocusWithin)
                        {
                            _addressBar.Text = GetSimplifiedUrl(webView.Source);
                        }
                    }
                    
                    _tabLoadingStates.TryGetValue(webView, out bool isLoading);
                    UpdateSpinnerState(isLoading);
                }
                else
                {
                    if (_addressBar != null)
                    {
                        _addressBar.Text = string.Empty;
                    }
                    UpdateSpinnerState(false);
                }
            }
        }

private void MinimizeButton_Click(object sender, RoutedEventArgs e)
{
    MinimizeCustom();
}

        private void RestoreWindow()
        {
            if (!_isMinimized) return;

            this.Left = this.Left + this.Width - _originalWidth;
            this.Height = _originalHeight;
            this.Width = _originalWidth;
            MainOverlayBorder.Padding = _originalBorderPadding;
            MainOverlayBorder.CornerRadius = _originalBorderCornerRadius;
            BrowserTabs.Visibility = Visibility.Visible;
            _isMinimized = false;
        }

        private void MainWindow_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (_isMinimized)
            {
                if (e.ClickCount >= 2) RestoreWindow();
                else DragMove();
            }
            else
            {
                if (e.Source == MainOverlayBorder || 
                   (e.Source is Grid grid && grid.Name != "templateRoot") ||
                    e.Source is DockPanel || 
                   (e.Source is Border border && border.Name != "MainOverlayBorder" && border.TemplatedParent == null))
                {
                    if (e.ButtonState == MouseButtonState.Pressed)
                    {
                        try { DragMove(); } catch (InvalidOperationException) { /* Can happen during rapid clicks, safe to ignore. */ }
                    }
                }
            }
        }

        private async void CloseTabOnHeader_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button closeButton && closeButton.Tag is TabItem tabToClose)
            {
                if (BrowserTabs.Items.Count == 1)
                {
                    bool shouldExit = await ShowExitConfirmationDialog("Confirm Exit", "This is the last tab. Are you sure you want to exit?");
                    if (shouldExit)
                    {
                        System.Windows.Application.Current.Shutdown();
                    }
                }
                else
                {
                    CloseTab(tabToClose);
                }
            }
        }

        private void UpdateMuteStatusUI()
        {
            if (_muteButton != null)
            {
                if (_muteButton.Content is System.Windows.Controls.Image muteImage)
                {
                    var uriString = _isMuted ? "muted.png" : "sound.png";
                    muteImage.Source = new BitmapImage(new Uri(uriString, UriKind.Relative));
                }
            }
            if (_muteStatusText != null) _muteStatusText.Text = _isMuted ? "Muted" : "Not Muted";
        }

        private void MuteButton_Click(object sender, RoutedEventArgs e)
        {
            _isMuted = !_isMuted;
            UpdateMuteStatusUI();

            foreach (TabItem tabItem in BrowserTabs.Items)
            {
                if (tabItem.Content is WebView2 webView && webView.CoreWebView2 != null)
                    webView.CoreWebView2.IsMuted = _isMuted;
            }
        }
#region Window Drag Prevention
        private void MakeWindowNonDraggable(Window window)
        {
            window.SourceInitialized += (s, e) =>
            {
                var handle = new WindowInteropHelper(window).Handle;
                var source = HwndSource.FromHwnd(handle);
                source?.AddHook(WndProc);
            };
        }
        private static IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            const int WM_NCLBUTTONDOWN = 0x00A1;
            const int HTCAPTION = 2;

            if (msg == WM_NCLBUTTONDOWN && wParam.ToInt32() == HTCAPTION)
            {

                handled = true;
            }

            return IntPtr.Zero;
        }
        #endregion
private async void ExitButton_Click(object sender, RoutedEventArgs e)
{
    bool shouldExit = await ShowExitConfirmationDialog("Confirm Exit", "Are you sure you want to exit?");
    if (shouldExit)
    {
        System.Windows.Application.Current.Shutdown();
    }
}
private T FindChild<T>(DependencyObject parent) where T : DependencyObject
{
    if (parent == null) return null;
    T foundChild = null;
    int childrenCount = System.Windows.Media.VisualTreeHelper.GetChildrenCount(parent);
    for (int i = 0; i < childrenCount; i++)
    {
        var child = System.Windows.Media.VisualTreeHelper.GetChild(parent, i);
        if (child is T t)
        {
            foundChild = t;
            break;
        }
        else
        {
            foundChild = FindChild<T>(child);
            if (foundChild != null) break;
        }
    }
    return foundChild;
}
        private void CloseTab(TabItem tabItem)
        {
            if (tabItem.Content is WebView2CompositionControl webView) 
            {
                _tabLoadingStates.Remove(webView); 
                
                if (webView.CoreWebView2 != null)
                {
                    webView.CoreWebView2.HistoryChanged -= CoreWebView2_HistoryChanged;
                    webView.CoreWebView2.SourceChanged -= CoreWebView2_SourceChanged;
                }
                webView.Dispose();
            }

            BrowserTabs.Items.Remove(tabItem);

        }
    }
}