using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace MyOverlayPOC
{
    [ComImport]
    [Guid("56FDF342-FD6D-11d0-958A-006097C9A090")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ITaskbarList
    {
        [PreserveSig]
        int HrInit();
        [PreserveSig]
        int AddTab(IntPtr hwnd);
        [PreserveSig]
        int DeleteTab(IntPtr hwnd);
        [PreserveSig]
        int ActivateTab(IntPtr hwnd);
        [PreserveSig]
        int SetActiveAlt(IntPtr hwnd);
    }

    [ComImport]
    [Guid("56FDF344-FD6D-11d0-958A-006097C9A090")]
    [ClassInterface(ClassInterfaceType.None)]
    internal class CoTaskbarList { }

    /// <summary>
    /// Manages taskbar presence dynamically for windows using the Windows Shell ITaskbarList API.
    /// </summary>
    public static class TaskbarManager
    {
        private static ITaskbarList? _taskbarList;
        private static bool _initialized = false;
        private static readonly object _lock = new();

        private static void EnsureInit()
        {
            if (_initialized) return;
            lock (_lock)
            {
                if (_initialized) return;
                try
                {
                    var co = new CoTaskbarList();
                    _taskbarList = (ITaskbarList)co;
                    _taskbarList.HrInit();
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"[TaskbarManager] Failed to init ITaskbarList: {ex.Message}");
                }
                finally
                {
                    _initialized = true;
                }
            }
        }

        /// <summary>
        /// Explicitly adds a window to the Windows taskbar.
        /// </summary>
        public static void ShowInTaskbar(IntPtr hwnd)
        {
            if (hwnd == IntPtr.Zero) return;
            EnsureInit();
            try
            {
                _taskbarList?.AddTab(hwnd);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[TaskbarManager] AddTab failed: {ex.Message}");
            }
        }

        /// <summary>
        /// Explicitly removes a window from the Windows taskbar.
        /// </summary>
        public static void HideFromTaskbar(IntPtr hwnd)
        {
            if (hwnd == IntPtr.Zero) return;
            EnsureInit();
            try
            {
                _taskbarList?.DeleteTab(hwnd);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[TaskbarManager] DeleteTab failed: {ex.Message}");
            }
        }
    }
}
