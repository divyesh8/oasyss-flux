using System;
using System.IO;
using System.Windows;

namespace MyOverlayPOC;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        try
        {
            File.AppendAllText("startup.log", $"[{DateTime.Now}] App.OnStartup called\n");
            
            AppDomain.CurrentDomain.UnhandledException += (s, args) =>
            {
                File.AppendAllText("startup.log", $"[{DateTime.Now}] AppDomain UnhandledException: {args.ExceptionObject}\n");
            };

            DispatcherUnhandledException += (s, args) =>
            {
                File.AppendAllText("startup.log", $"[{DateTime.Now}] DispatcherUnhandledException: {args.Exception}\n");
            };

            base.OnStartup(e);
            File.AppendAllText("startup.log", $"[{DateTime.Now}] base.OnStartup completed\n");
        }
        catch (Exception ex)
        {
            File.AppendAllText("startup.log", $"[{DateTime.Now}] OnStartup caught: {ex}\n");
        }
    }
}


