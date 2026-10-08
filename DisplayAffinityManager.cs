using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace MyOverlayPOC
{
    /// <summary>
    /// Centralized manager for Windows Display Affinity (WDA_EXCLUDEFROMCAPTURE).
    /// Ensures capture exclusion is applied reliably, accounts for OS build versions,
    /// and automatically protects dynamic WPF/Win32 popups and tooltips from capture leaks.
    /// </summary>
    public static class DisplayAffinityManager
    {
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetWindowDisplayAffinity(IntPtr hWnd, uint dwAffinity);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool GetWindowDisplayAffinity(IntPtr hWnd, out uint pdwAffinity);

        [DllImport("user32.dll")]
        private static extern IntPtr SetWinEventHook(
            uint eventMin,
            uint eventMax,
            IntPtr hmodWinEventProc,
            WinEventDelegate lpfnWinEventProc,
            uint idProcess,
            uint idThread,
            uint dwFlags);

        [DllImport("user32.dll")]
        private static extern bool IsWindow(IntPtr hWnd);

        private delegate void WinEventDelegate(
            IntPtr hWinEventHook,
            uint eventType,
            IntPtr hwnd,
            int idObject,
            int idChild,
            uint dwEventThread,
            uint dwmsEventTime);

        private const uint EVENT_OBJECT_SHOW = 0x8002;
        private const uint WINEVENT_OUTOFCONTEXT = 0x0000;
        private const int OBJID_WINDOW = 0;

        public const uint WDA_NONE = 0x00000000;
        public const uint WDA_MONITOR = 0x00000001;              // Renders as black box in capture
        public const uint WDA_EXCLUDEFROMCAPTURE = 0x00000011;  // Completely excluded from capture (Windows 10 2004+)

        private static bool _popupHandlerInitialized = false;
        private static WinEventDelegate? _winEventDelegate;
        private static IntPtr _winEventHook = IntPtr.Zero;

        /// <summary>
        /// True if the current operating system supports WDA_EXCLUDEFROMCAPTURE (Windows 10 Build >= 19041).
        /// </summary>
        public static bool IsExcludeFromCaptureSupported { get; } = CheckSupport();

        private static bool CheckSupport()
        {
            try
            {
                var os = Environment.OSVersion;
                if (os.Platform == PlatformID.Win32NT)
                {
                    // Windows 10 Build 19041 (Version 2004) or Windows 11
                    return os.Version.Major > 10 || (os.Version.Major == 10 && os.Version.Build >= 19041);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[DisplayAffinityManager] OS version check error: {ex.Message}");
            }
            return false;
        }

        /// <summary>
        /// Applies the strongest supported capture exclusion affinity to the specified HWND.
        /// Falls back gracefully to WDA_MONITOR on older Windows releases.
        /// </summary>
        public static bool ApplyCaptureAffinity(IntPtr hwnd)
        {
            if (hwnd == IntPtr.Zero)
                return false;

            uint targetAffinity = IsExcludeFromCaptureSupported ? WDA_EXCLUDEFROMCAPTURE : WDA_MONITOR;

            bool success = SetWindowDisplayAffinity(hwnd, targetAffinity);
            if (!success)
            {
                int error = Marshal.GetLastWin32Error();
                Debug.WriteLine($"[DisplayAffinityManager] SetWindowDisplayAffinity failed on HWND 0x{hwnd:X} with error code {error}. Attempting fallback.");
                
                // If WDA_EXCLUDEFROMCAPTURE failed, attempt WDA_MONITOR
                if (targetAffinity == WDA_EXCLUDEFROMCAPTURE)
                {
                    success = SetWindowDisplayAffinity(hwnd, WDA_MONITOR);
                }
            }

            return success;
        }

        private static readonly System.Collections.Generic.HashSet<IntPtr> _excludedFromAffinityHwnds = new();

        /// <summary>
        /// Marks an HWND as visible to screen capture / display (sets WDA_NONE) and prevents automatic re-application.
        /// </summary>
        public static bool MarkVisibleToCapture(IntPtr hwnd)
        {
            if (hwnd == IntPtr.Zero)
                return false;

            lock (_excludedFromAffinityHwnds)
            {
                _excludedFromAffinityHwnds.Add(hwnd);
            }
            return SetWindowDisplayAffinity(hwnd, WDA_NONE);
        }

        /// <summary>
        /// Unmarks an HWND so that capture exclusion is re-applied (sets WDA_EXCLUDEFROMCAPTURE).
        /// </summary>
        public static bool UnmarkVisibleToCapture(IntPtr hwnd)
        {
            if (hwnd == IntPtr.Zero)
                return false;

            lock (_excludedFromAffinityHwnds)
            {
                _excludedFromAffinityHwnds.Remove(hwnd);
            }
            return ApplyCaptureAffinity(hwnd);
        }

        /// <summary>
        /// Registers a WinEvent hook for the current process to intercept window and popup show events,
        /// ensuring that dynamically created popup HWNDs (tooltips, context menus, combo boxes)
        /// automatically inherit capture exclusion without visual leaks.
        /// </summary>
        public static void InitializePopupAffinityHandler()
        {
            if (_popupHandlerInitialized)
                return;

            _popupHandlerInitialized = true;

            try
            {
                uint currentProcessId = (uint)Process.GetCurrentProcess().Id;
                _winEventDelegate = OnWinEvent;
                _winEventHook = SetWinEventHook(
                    EVENT_OBJECT_SHOW,
                    EVENT_OBJECT_SHOW,
                    IntPtr.Zero,
                    _winEventDelegate,
                    currentProcessId,
                    0,
                    WINEVENT_OUTOFCONTEXT
                );
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[DisplayAffinityManager] WinEvent hook initialization error: {ex.Message}");
            }
        }

        private static void OnWinEvent(
            IntPtr hWinEventHook,
            uint eventType,
            IntPtr hwnd,
            int idObject,
            int idChild,
            uint dwEventThread,
            uint dwmsEventTime)
        {
            if (eventType == EVENT_OBJECT_SHOW && idObject == OBJID_WINDOW && hwnd != IntPtr.Zero)
            {
                try
                {
                    lock (_excludedFromAffinityHwnds)
                    {
                        if (_excludedFromAffinityHwnds.Contains(hwnd))
                            return;
                    }

                    if (IsWindow(hwnd))
                    {
                        ApplyCaptureAffinity(hwnd);
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"[DisplayAffinityManager] Error in OnWinEvent: {ex.Message}");
                }
            }
        }

        /// <summary>
        /// Verifies and reapplies display affinity if it was reset (e.g. following a DPI change or display reconfiguration).
        /// </summary>
        public static void EnsureAffinity(IntPtr hwnd)
        {
            if (hwnd == IntPtr.Zero)
                return;

            lock (_excludedFromAffinityHwnds)
            {
                if (_excludedFromAffinityHwnds.Contains(hwnd))
                    return;
            }

            uint targetAffinity = IsExcludeFromCaptureSupported ? WDA_EXCLUDEFROMCAPTURE : WDA_MONITOR;

            if (GetWindowDisplayAffinity(hwnd, out uint currentAffinity))
            {
                if (currentAffinity != targetAffinity)
                {
                    ApplyCaptureAffinity(hwnd);
                }
            }
            else
            {
                ApplyCaptureAffinity(hwnd);
            }
        }
    }
}
