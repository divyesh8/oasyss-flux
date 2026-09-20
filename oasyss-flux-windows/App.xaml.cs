using System;
using System.Diagnostics;
using System.IO;
using System.Windows;

namespace MyOverlayPOC;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : Application
{
    private static string GetLogFilePath()
    {
        try
        {
            string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OasyssFlux", "logs");
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            return Path.Combine(dir, "startup.log");
        }
        catch
        {
            return Path.Combine(Path.GetTempPath(), "oasyssflux_startup.log");
        }
    }

    private static void SafeLog(string message)
    {
        try
        {
            File.AppendAllText(GetLogFilePath(), $"[{DateTime.UtcNow:O}] {message}\n");
        }
        catch
        {
            Debug.WriteLine(message);
        }
    }

    protected override void OnStartup(StartupEventArgs e)
    {
        try
        {
            SafeLog("App.OnStartup called");
            
            AppDomain.CurrentDomain.UnhandledException += (s, args) =>
            {
                SafeLog($"AppDomain UnhandledException: {args.ExceptionObject}");
            };

            DispatcherUnhandledException += (s, args) =>
            {
                SafeLog($"DispatcherUnhandledException: {args.Exception.Message}");
            };

            base.OnStartup(e);
            SafeLog("base.OnStartup completed");
        }
        catch (Exception ex)
        {
            SafeLog($"OnStartup caught exception: {ex.Message}");
        }
    }
}
