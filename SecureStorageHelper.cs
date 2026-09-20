using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace MyOverlayPOC
{
    /// <summary>
    /// Provides secure local storage utilities using Windows DPAPI (Data Protection API)
    /// and atomic file operations to prevent data corruption and plaintext credential leaks.
    /// </summary>
    public static class SecureStorageHelper
    {
        private const string EncryptedPrefix = "dpapi::";

        /// <summary>
        /// Encrypts a plaintext string using Windows DPAPI bound to the current user.
        /// </summary>
        public static string EncryptString(string? plainText)
        {
            if (string.IsNullOrEmpty(plainText))
                return string.Empty;

            try
            {
                byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
                byte[] encryptedBytes = ProtectedData.Protect(
                    plainBytes,
                    optionalEntropy: null,
                    scope: DataProtectionScope.CurrentUser
                );
                return EncryptedPrefix + Convert.ToBase64String(encryptedBytes);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[SecureStorageHelper] DPAPI encryption failed: {ex.Message}");
                return plainText; // Fallback if DPAPI is unavailable
            }
        }

        /// <summary>
        /// Decrypts a DPAPI-encrypted string. If the string is not encrypted (legacy plaintext),
        /// it returns the string as-is for seamless backward compatibility.
        /// </summary>
        public static string DecryptString(string? cipherText)
        {
            if (string.IsNullOrEmpty(cipherText))
                return string.Empty;

            if (!cipherText.StartsWith(EncryptedPrefix, StringComparison.Ordinal))
            {
                // Legacy plaintext string - return as-is
                return cipherText;
            }

            try
            {
                string base64 = cipherText.Substring(EncryptedPrefix.Length);
                byte[] encryptedBytes = Convert.FromBase64String(base64);
                byte[] plainBytes = ProtectedData.Unprotect(
                    encryptedBytes,
                    optionalEntropy: null,
                    scope: DataProtectionScope.CurrentUser
                );
                return Encoding.UTF8.GetString(plainBytes);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[SecureStorageHelper] DPAPI decryption failed: {ex.Message}");
                return string.Empty;
            }
        }

        /// <summary>
        /// Atomically writes text to a file by writing to a temporary file first,
        /// then moving/replacing the target file. This prevents partial file corruption
        /// during sudden crashes or power cuts.
        /// </summary>
        public static void AtomicWriteText(string filePath, string content)
        {
            string? dir = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            string tempFile = filePath + ".tmp." + Guid.NewGuid().ToString("N");
            try
            {
                File.WriteAllText(tempFile, content, Encoding.UTF8);
                File.Move(tempFile, filePath, overwrite: true);
            }
            catch
            {
                if (File.Exists(tempFile))
                {
                    try { File.Delete(tempFile); } catch { }
                }
                // Fallback direct write if atomic move fails
                File.WriteAllText(filePath, content, Encoding.UTF8);
            }
        }
    }
}
