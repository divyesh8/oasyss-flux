/**
 * Oasyss Flux — Divyesh Edition
 * Safe Browser Policy Unit & Integration Tests
 *
 * Validates:
 * 1. Default Policy Configuration (Institutional SEB-inspired baseline)
 * 2. Domain Allowlist: Exact match, Subdomain match, Wildcard support
 * 3. Anti-Spoofing Security: Prevents suffix bypass (e.g. example.com.attacker.com)
 * 4. Protocol Restrictions: Blocks dangerous schemes (javascript:, file:, data:, chrome:)
 * 5. HTTPS Enforcement: Rejects plain HTTP when enforceHttps = true
 * 6. Access Restricted Page Generation (Self-contained HTML, data URI, no leaks)
 * 7. Policy Mutation & Dynamic Rule Updates
 * 8. Download, Popup, and DevTools Restriction Flags
 * 9. Initial URL Validation upon entering Safe Browser Mode
 */

const assert = require('assert');
const SafeBrowserPolicy = require('../core/browser/SafeBrowserPolicy');

console.log('\n======================================================');
console.log('  RUNNING SAFE BROWSER POLICY TEST SUITE');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

// ──────────────────────────────────────────────
//  1. Default Policy Configuration
// ──────────────────────────────────────────────
console.log('--- 1. Default Policy Configuration ---');

it('instantiates with default institutional settings', () => {
  const policy = new SafeBrowserPolicy();
  assert.strictEqual(policy.enabled, true);
  assert.deepStrictEqual(policy.allowedDomains, ['example.com', 'srmist.edu.in']);
  assert.strictEqual(policy.allowDownloads, false);
  assert.strictEqual(policy.allowPopups, false);
  assert.strictEqual(policy.enforceHttps, true);
  assert.strictEqual(policy.blockDevTools, true);
});

it('accepts custom initial options', () => {
  const policy = new SafeBrowserPolicy({
    allowedDomains: ['myuniv.edu'],
    allowDownloads: true,
    enforceHttps: false
  });
  assert.deepStrictEqual(policy.allowedDomains, ['myuniv.edu']);
  assert.strictEqual(policy.allowDownloads, true);
  assert.strictEqual(policy.enforceHttps, false);
});

// ──────────────────────────────────────────────
//  2. Domain Allowlist & Subdomains
// ──────────────────────────────────────────────
console.log('\n--- 2. Domain Allowlist & Subdomains ---');

it('allows exact domain matches', () => {
  const policy = new SafeBrowserPolicy();
  assert.strictEqual(policy.isUrlAllowed('https://example.com'), true);
  assert.strictEqual(policy.isUrlAllowed('https://example.com/test/path?query=1'), true);
  assert.strictEqual(policy.isUrlAllowed('https://srmist.edu.in'), true);
  assert.strictEqual(policy.isUrlAllowed('https://srmist.edu.in/admissions/2026'), true);
});

it('allows subdomains of allowed domains', () => {
  const policy = new SafeBrowserPolicy();
  assert.strictEqual(policy.isUrlAllowed('https://portal.example.com'), true);
  assert.strictEqual(policy.isUrlAllowed('https://deep.sub.example.com/exam'), true);
  assert.strictEqual(policy.isUrlAllowed('https://evarsity.srmist.edu.in'), true);
});

it('supports explicit wildcard domain rules', () => {
  const policy = new SafeBrowserPolicy({ allowedDomains: ['*.ac.in'] });
  assert.strictEqual(policy.isUrlAllowed('https://university.ac.in'), true);
  assert.strictEqual(policy.isUrlAllowed('https://dept.university.ac.in'), true);
  assert.strictEqual(policy.isUrlAllowed('https://attacker.com'), false);
});

it('allows about:blank', () => {
  const policy = new SafeBrowserPolicy();
  assert.strictEqual(policy.isUrlAllowed('about:blank'), true);
});

// ──────────────────────────────────────────────
//  3. Anti-Spoofing & Negative Security
// ──────────────────────────────────────────────
console.log('\n--- 3. Anti-Spoofing Security ---');

it('strictly blocks suffix-spoofed domain attacks (e.g. example.com.attacker.com)', () => {
  const policy = new SafeBrowserPolicy();
  assert.strictEqual(policy.isUrlAllowed('https://example.com.attacker.com'), false);
  assert.strictEqual(policy.isUrlAllowed('https://example.com.evil.org/phish'), false);
  assert.strictEqual(policy.isUrlAllowed('https://srmist.edu.in.spoofsite.net'), false);
});

it('strictly blocks prefix-spoofed domain attacks (e.g. notexample.com)', () => {
  const policy = new SafeBrowserPolicy();
  assert.strictEqual(policy.isUrlAllowed('https://notexample.com'), false);
  assert.strictEqual(policy.isUrlAllowed('https://fake-example.com'), false);
  assert.strictEqual(policy.isUrlAllowed('https://srmist.edu.in.org'), false);
});

it('blocks completely disallowed domains', () => {
  const policy = new SafeBrowserPolicy();
  assert.strictEqual(policy.isUrlAllowed('https://google.com'), false);
  assert.strictEqual(policy.isUrlAllowed('https://github.com'), false);
  assert.strictEqual(policy.isUrlAllowed('https://malware.biz'), false);
});

// ──────────────────────────────────────────────
//  4. Protocol & Scheme Restrictions
// ──────────────────────────────────────────────
console.log('\n--- 4. Protocol & Scheme Restrictions ---');

it('blocks dangerous schemes regardless of domain', () => {
  const policy = new SafeBrowserPolicy();
  assert.strictEqual(policy.isUrlAllowed('javascript:alert(document.cookie)'), false);
  assert.strictEqual(policy.isUrlAllowed('data:text/html,<h1>Hacked</h1>'), false);
  assert.strictEqual(policy.isUrlAllowed('file:///C:/Windows/System32/drivers/etc/hosts'), false);
  assert.strictEqual(policy.isUrlAllowed('chrome://settings'), false);
  assert.strictEqual(policy.isUrlAllowed('edge://flags'), false);
  assert.strictEqual(policy.isUrlAllowed('vbscript:msgbox'), false);
});

it('blocks malformed or empty URLs', () => {
  const policy = new SafeBrowserPolicy();
  assert.strictEqual(policy.isUrlAllowed(''), false);
  assert.strictEqual(policy.isUrlAllowed(null), false);
  assert.strictEqual(policy.isUrlAllowed(undefined), false);
  assert.strictEqual(policy.isUrlAllowed('not-a-valid-url'), false);
});

// ──────────────────────────────────────────────
//  5. HTTPS Enforcement
// ──────────────────────────────────────────────
console.log('\n--- 5. HTTPS Enforcement ---');

it('rejects plain HTTP when enforceHttps = true', () => {
  const policy = new SafeBrowserPolicy({ enforceHttps: true });
  assert.strictEqual(policy.isUrlAllowed('http://example.com'), false);
  assert.strictEqual(policy.isUrlAllowed('http://srmist.edu.in'), false);
});

it('allows plain HTTP when enforceHttps = false (if domain allowed)', () => {
  const policy = new SafeBrowserPolicy({ enforceHttps: false });
  assert.strictEqual(policy.isUrlAllowed('http://example.com'), true);
  assert.strictEqual(policy.isUrlAllowed('http://attacker.com'), false);
});

// ──────────────────────────────────────────────
//  6. Access Restricted Page Generation
// ──────────────────────────────────────────────
console.log('\n--- 6. Access Restricted Page Generation ---');

it('generates self-contained Access Restricted HTML with escaped content', () => {
  const policy = new SafeBrowserPolicy();
  const dangerousUrl = 'https://malicious.site/<script>alert(1)</script>';
  const html = policy.getAccessRestrictedHtml(dangerousUrl);

  assert.ok(html.includes('ACCESS RESTRICTED'), 'Must include institutional header');
  assert.ok(html.includes('OASYSS FLUX SAFE BROWSER'), 'Must identify browser');
  assert.ok(!html.includes('<script>alert(1)</script>'), 'Must escape dangerous URL');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'Must contain HTML-escaped URL');
  assert.ok(html.includes('Institutional Exam & Security Policy'), 'Must explain policy constraint');
  // Verify no external script/link tags
  assert.ok(!html.includes('<link rel="stylesheet" href="http'), 'No external stylesheet');
  assert.ok(!html.includes('<script src="http'), 'No external scripts');
});

it('generates a valid data: URI with encoded HTML', () => {
  const policy = new SafeBrowserPolicy();
  const dataUri = policy.getAccessRestrictedDataUri('https://blocked.com');
  assert.ok(dataUri.startsWith('data:text/html;charset=utf-8,'), 'Must start with data:text/html');
  const decoded = decodeURIComponent(dataUri.replace('data:text/html;charset=utf-8,', ''));
  assert.ok(decoded.includes('ACCESS RESTRICTED'));
  assert.ok(decoded.includes('https://blocked.com'));
});

// ──────────────────────────────────────────────
//  7. Policy Mutation & Dynamic Rule Updates
// ──────────────────────────────────────────────
console.log('\n--- 7. Policy Mutation & Dynamic Updates ---');

it('updates allowed domains and normalizes inputs', () => {
  const policy = new SafeBrowserPolicy();
  policy.updatePolicy({ allowedDomains: ['https://NewUniversity.edu/', '  EXAM.PORTAL.COM  '] });

  assert.strictEqual(policy.isUrlAllowed('https://newuniversity.edu'), true);
  assert.strictEqual(policy.isUrlAllowed('https://exam.portal.com'), true);
  // Previous domains are now disallowed
  assert.strictEqual(policy.isUrlAllowed('https://example.com'), false);
});

it('updates flags dynamically', () => {
  const policy = new SafeBrowserPolicy();
  assert.strictEqual(policy.allowDownloads, false);
  policy.updatePolicy({ allowDownloads: true, allowPopups: true });
  assert.strictEqual(policy.allowDownloads, true);
  assert.strictEqual(policy.allowPopups, true);
});

// ──────────────────────────────────────────────
//  8. Initial URL Validation on Safe Browser Entry
// ──────────────────────────────────────────────
console.log('\n--- 8. Initial URL Validation on Safe Browser Entry ---');

it('validates initial URL and keeps it if allowed', () => {
  const policy = new SafeBrowserPolicy();
  const url = 'https://example.com/welcome';
  const result = policy.validateInitialUrl(url);
  assert.strictEqual(result, url);
});

it('validates initial URL and returns Access Restricted page if disallowed', () => {
  const policy = new SafeBrowserPolicy();
  const disallowedUrl = 'https://reddit.com/r/funny';
  const result = policy.validateInitialUrl(disallowedUrl);
  assert.ok(result.startsWith('data:text/html;charset=utf-8,'));
  assert.ok(decodeURIComponent(result).includes('reddit.com'));
});

// ──────────────────────────────────────────────
//  Summary
// ──────────────────────────────────────────────
console.log('\n======================================================');
console.log(`  SAFE BROWSER POLICY TESTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
