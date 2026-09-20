/**
 * Oasyss Flux — Divyesh Edition
 * Safe Browser Policy Engine
 * Enforces domain allowlist, popup blocking, download restrictions,
 * external protocol guards, and single-tab constraints.
 */

class SafeBrowserPolicy {
  constructor(options = {}) {
    this.enabled = options.enabled ?? true;
    this.allowedDomains = Array.isArray(options.allowedDomains)
      ? [...options.allowedDomains.map(d => typeof d === 'string' ? d.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim().toLowerCase() : d)].filter(Boolean)
      : ['example.com', 'srmist.edu.in'];

    this.allowPopups = options.allowPopups ?? false;
    this.allowDownloads = options.allowDownloads ?? false; // false | true | 'blocked' | 'allowed' | 'allowedForDomains'
    this.enforceHttps = options.enforceHttps ?? true;
    this.blockDevTools = options.blockDevTools ?? true;
    this.allowDevTools = options.allowDevTools ?? !this.blockDevTools;
    this.allowExternalProtocols = options.allowExternalProtocols ?? false;
    this.allowMultipleTabs = options.allowMultipleTabs ?? false;
  }

  /**
   * Evaluates if a given URL is permitted under current Safe Browser policy.
   * Uses strict hostname boundary matching (exact match or subdomain).
   * Prevents attacker spoofing like 'example.com.attacker.com'.
   * @param {string} url
   * @returns {boolean}
   */
  isAllowedUrl(url) {
    if (typeof url !== 'string' || !url.trim()) return false;
    const trimmed = url.trim();

    // about:blank is permitted as a safe neutral page
    if (trimmed === 'about:blank') return true;

    // Internal Safe Browser blocked page is always allowed
    if (trimmed.startsWith('data:text/html') && (trimmed.includes('Access%20Restricted') || trimmed.includes('ACCESS%20RESTRICTED') || trimmed.includes('Access Restricted'))) {
      return true;
    }

    try {
      const parsed = new URL(trimmed);
      const protocol = parsed.protocol.toLowerCase();

      // Only HTTP and HTTPS are permitted destinations
      if (protocol !== 'http:' && protocol !== 'https:') {
        return false;
      }

      // Enforce HTTPS if configured
      if (this.enforceHttps && protocol !== 'https:') {
        return false;
      }

      const hostname = parsed.hostname.toLowerCase();

      // Check against allowed domains
      return this.isHostnameAllowed(hostname);
    } catch {
      return false;
    }
  }

  /**
   * Alias for isAllowedUrl
   */
  isUrlAllowed(url) {
    return this.isAllowedUrl(url);
  }

  /**
   * Validates a hostname against the allowlist.
   * @param {string} hostname
   * @returns {boolean}
   */
  isHostnameAllowed(hostname) {
    if (!hostname || typeof hostname !== 'string') return false;
    const targetHost = hostname.toLowerCase().trim();

    for (let domain of this.allowedDomains) {
      let cleanDomain = domain.toLowerCase().trim();
      if (!cleanDomain) continue;

      // Wildcard domain handling (e.g. *.example.com or *.ac.in)
      if (cleanDomain.startsWith('*.')) {
        cleanDomain = cleanDomain.slice(2);
        if (targetHost === cleanDomain || targetHost.endsWith('.' + cleanDomain)) {
          return true;
        }
        continue;
      }

      // Exact match (e.g. example.com === example.com)
      if (targetHost === cleanDomain) {
        return true;
      }

      // Subdomain match (e.g. portal.example.com ends with .example.com)
      // Strictly requires dot separator to prevent example.com.attacker.com matching example.com
      if (targetHost.endsWith('.' + cleanDomain)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Adds a domain to the allowlist.
   * @param {string} domain
   */
  addAllowedDomain(domain) {
    if (typeof domain === 'string' && domain.trim()) {
      const clean = domain.trim().toLowerCase();
      if (!this.allowedDomains.includes(clean)) {
        this.allowedDomains.push(clean);
      }
    }
  }

  /**
   * Removes a domain from the allowlist.
   * @param {string} domain
   */
  removeAllowedDomain(domain) {
    if (typeof domain === 'string') {
      const clean = domain.trim().toLowerCase();
      this.allowedDomains = this.allowedDomains.filter(d => d !== clean);
    }
  }

  /**
   * Checks whether a download is allowed from the given URL.
   * @param {string} url
   * @returns {boolean}
   */
  isDownloadAllowed(url) {
    if (this.allowDownloads === true || this.allowDownloads === 'allowed') {
      return true;
    }
    if (this.allowDownloads === 'allowedForDomains') {
      return this.isAllowedUrl(url);
    }
    return false;
  }

  /**
   * Updates policy configuration dynamically.
   * @param {Object} options
   */
  updatePolicy(options = {}) {
    if (Array.isArray(options.allowedDomains)) {
      this.allowedDomains = options.allowedDomains
        .map(d => typeof d === 'string' ? d.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim().toLowerCase() : d)
        .filter(Boolean);
    }
    if (options.allowPopups !== undefined) this.allowPopups = !!options.allowPopups;
    if (options.allowDownloads !== undefined) this.allowDownloads = options.allowDownloads;
    if (options.enforceHttps !== undefined) this.enforceHttps = !!options.enforceHttps;
    if (options.blockDevTools !== undefined) {
      this.blockDevTools = !!options.blockDevTools;
      this.allowDevTools = !this.blockDevTools;
    }
    if (options.allowDevTools !== undefined) {
      this.allowDevTools = !!options.allowDevTools;
      this.blockDevTools = !this.allowDevTools;
    }
    if (options.allowExternalProtocols !== undefined) this.allowExternalProtocols = !!options.allowExternalProtocols;
    if (options.allowMultipleTabs !== undefined) this.allowMultipleTabs = !!options.allowMultipleTabs;
    return this;
  }

  /**
   * Validates an initial URL upon entering Safe Browser mode.
   * Returns url if allowed, or the blocked page data URI if disallowed.
   * @param {string} url
   * @returns {string}
   */
  validateInitialUrl(url) {
    if (this.isAllowedUrl(url)) {
      return url;
    }
    return this.getBlockedPageUrl(url);
  }

  /**
   * Generates self-contained HTML for the blocked navigation page.
   * @param {string} attemptedUrl
   * @returns {string}
   */
  getBlockedPageHtml(attemptedUrl = '') {
    const safeUrl = String(attemptedUrl)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ACCESS RESTRICTED — Flux Safe Browser</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #08090B;
      color: #F3F4F6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      user-select: none;
    }
    .card {
      background: #0F1115;
      border: 1px solid #1F242C;
      border-radius: 12px;
      padding: 40px;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }
    .shield-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px auto;
      color: #E5A93C;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #FFFFFF;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    p {
      font-size: 13px;
      color: #9CA3AF;
      line-height: 1.6;
      margin-bottom: 14px;
    }
    .url-box {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #E5A93C;
      background: #171A21;
      border: 1px solid #232832;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 16px 0 24px 0;
      word-break: break-all;
    }
    .policy-note {
      font-size: 11px;
      color: #6B7280;
      margin-bottom: 24px;
    }
    .btn-return {
      background: #00DF81;
      color: #08090B;
      border: none;
      padding: 10px 24px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.04em;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: opacity 150ms ease;
    }
    .btn-return:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="shield-icon">
      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <h1>ACCESS RESTRICTED</h1>
    <p>This website isn't available in OASYSS FLUX SAFE BROWSER.</p>
    <div class="url-box">${safeUrl || 'Unknown Destination'}</div>
    <p class="policy-note">Institutional Exam & Security Policy does not permit navigation to this destination.</p>
    <button class="btn-return" onclick="window.history.length > 1 ? window.history.back() : window.location.href='about:blank';">
      <span>&larr;</span> Return
    </button>
  </div>
</body>
</html>`;
  }

  /**
   * Alias for getBlockedPageHtml
   */
  getAccessRestrictedHtml(attemptedUrl = '') {
    return this.getBlockedPageHtml(attemptedUrl);
  }

  /**
   * Returns a data URI containing the blocked page HTML.
   * @param {string} attemptedUrl
   * @returns {string}
   */
  getBlockedPageUrl(attemptedUrl = '') {
    return 'data:text/html;charset=utf-8,' + encodeURIComponent(this.getBlockedPageHtml(attemptedUrl));
  }

  /**
   * Alias for getBlockedPageUrl
   */
  getAccessRestrictedDataUri(attemptedUrl = '') {
    return this.getBlockedPageUrl(attemptedUrl);
  }

  /**
   * Serializes current policy state.
   */
  toJSON() {
    return {
      enabled: this.enabled,
      allowedDomains: [...this.allowedDomains],
      allowPopups: this.allowPopups,
      allowDownloads: this.allowDownloads,
      enforceHttps: this.enforceHttps,
      blockDevTools: this.blockDevTools,
      allowDevTools: this.allowDevTools,
      allowExternalProtocols: this.allowExternalProtocols,
      allowMultipleTabs: this.allowMultipleTabs
    };
  }
}

module.exports = SafeBrowserPolicy;
