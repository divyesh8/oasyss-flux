using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using Microsoft.Web.WebView2.Wpf;

namespace MyOverlayPOC
{
    internal static class WebViewDropForwarder
    {
        public static void Attach(WebView2CompositionControl webView)
        {
            if (webView == null) return;

            webView.AllowDrop = true;

            webView.AddHandler(UIElement.DragEnterEvent, new DragEventHandler(OnDragOver), true);
            webView.AddHandler(UIElement.DragOverEvent,  new DragEventHandler(OnDragOver), true);
            webView.AddHandler(UIElement.DropEvent,      new DragEventHandler(OnDrop),     true);
        }

        private static void OnDragOver(object sender, DragEventArgs e)
        {
            if (e.Data != null && e.Data.GetDataPresent(System.Windows.DataFormats.FileDrop))
            {
                e.Effects = System.Windows.DragDropEffects.Copy;
                e.Handled = true;
            }
        }

        private static void OnDrop(object sender, DragEventArgs e)
        {
            if (!(sender is WebView2CompositionControl webView)) return;
            if (webView.CoreWebView2 == null) return;
            if (e.Data == null || !e.Data.GetDataPresent(System.Windows.DataFormats.FileDrop)) return;

            var files = e.Data.GetData(System.Windows.DataFormats.FileDrop) as string[];
            if (files == null || files.Length == 0) return;
            string filePath = files[0];

            var dip = e.GetPosition(webView);
            double zoom = 1.0;
            try { zoom = webView.ZoomFactor; } catch { }
            int x = (int)Math.Round(dip.X / zoom);
            int y = (int)Math.Round(dip.Y / zoom);

            e.Effects = System.Windows.DragDropEffects.Copy;
            e.Handled = true;

            webView.Dispatcher.BeginInvoke(new Action(async () =>
            {
                try { await InjectAsync(webView, filePath, x, y); }
                catch (Exception ex) { Debug.WriteLine($"Screenshot drop injection failed: {ex.Message}"); }
            }));
        }

        private static async Task InjectAsync(WebView2CompositionControl webView, string filePath, int x, int y)
        {
            if (!File.Exists(filePath)) return;

            // Primary: inject a real, trusted drop through Chromium's input pipeline (CDP).
            try
            {
                var dragData = new
                {
                    items = Array.Empty<object>(),
                    files = new[] { filePath },
                    dragOperationsMask = 1 // copy
                };

                async Task Dispatch(string type)
                {
                    var p = new { type, x, y, data = dragData, modifiers = 0 };
                    await webView.CoreWebView2.CallDevToolsProtocolMethodAsync(
                        "Input.dispatchDragEvent", JsonSerializer.Serialize(p));
                }

                await Dispatch("dragEnter");
                await Dispatch("dragOver");
                await Dispatch("drop");
                return;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"CDP drop failed, falling back to JS: {ex.Message}");
            }

            await InjectViaScriptAsync(webView, filePath, x, y);
        }

        private static async Task InjectViaScriptAsync(WebView2CompositionControl webView, string filePath, int x, int y)
        {
            byte[] bytes = await File.ReadAllBytesAsync(filePath);
            string base64 = Convert.ToBase64String(bytes);
            string name = Path.GetFileName(filePath);

            // SECURITY FIX: Never use unsafe string interpolation with user-controlled filenames.
            // JsonSerializer.Serialize guarantees strict JSON-escaping for quotes, newlines, and metacharacters.
            string jsonBase64 = JsonSerializer.Serialize(base64);
            string jsonName = JsonSerializer.Serialize(name);

            string script = $@"
(function(b64, name, x, y) {{
    try {{
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const file = new File([arr], name, {{ type: 'image/png' }});
        const dt = new DataTransfer();
        dt.items.add(file);

        const target = document.elementFromPoint(x, y) || document.body;

        let input = (target.closest && target.closest('input[type=file]'))
                 || (target.querySelector && target.querySelector('input[type=file]'));
        if (input) {{
            input.files = dt.files;
            input.dispatchEvent(new Event('input',  {{ bubbles: true }}));
            input.dispatchEvent(new Event('change', {{ bubbles: true }}));
        }}

        const opts = {{ bubbles: true, cancelable: true, composed: true, dataTransfer: dt, clientX: x, clientY: y }};
        target.dispatchEvent(new DragEvent('dragenter', opts));
        target.dispatchEvent(new DragEvent('dragover',  opts));
        target.dispatchEvent(new DragEvent('drop',      opts));
    }} catch (err) {{ console.error('screenshot drop fallback failed:', err); }}
}})({jsonBase64}, {jsonName}, {x}, {y});";

            await webView.CoreWebView2.ExecuteScriptAsync(script);
        }
    }
}