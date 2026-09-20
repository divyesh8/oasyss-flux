using System;
using System.IO;

namespace MyOverlayPOC.Platform.Windows
{
    /// <summary>
    /// Oasyss Flux — Divyesh Edition
    /// Windows Platform Adapter Interface & Implementation.
    /// Exposes Windows-specific capture exclusion (WDA_EXCLUDEFROMCAPTURE),
    /// DPAPI credential protection, WinEvent hooks, and local AppData paths.
    /// </summary>
    public class WindowsPlatformAdapter
    {
        public string PlatformName => "Windows 11";
        public string Arch => Environment.Is64BitOperatingSystem ? "x64" : "x86";

        public string GetAppDataDir()
        {
            string appData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "OasyssFlux"
            );
            if (!Directory.Exists(appData))
            {
                Directory.CreateDirectory(appData);
            }
            return appData;
        }

        public string GetLogsDir()
        {
            string logs = Path.Combine(GetAppDataDir(), "logs");
            if (!Directory.Exists(logs))
            {
                Directory.CreateDirectory(logs);
            }
            return logs;
        }

        public bool ApplyCaptureAffinity(IntPtr hwnd)
        {
            return DisplayAffinityManager.ApplyCaptureAffinity(hwnd);
        }

        public void InitializePopupAffinityHandler()
        {
            DisplayAffinityManager.InitializePopupAffinityHandler();
        }

        public string Encrypt(string plaintext)
        {
            return SecureStorageHelper.EncryptString(plaintext);
        }

        public string Decrypt(string ciphertext)
        {
            return SecureStorageHelper.DecryptString(ciphertext);
        }
    }
}
