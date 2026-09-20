/**
 * Oasyss Flux — Divyesh Edition
 * Automated Security Static Analysis Scanner (Phase 23)
 * Audits repository source code for dangerous patterns:
 * - Dynamic JavaScript execution (eval, new Function)
 * - Unsafe string interpolation in WebView2 / ExecuteScriptAsync
 * - Unsanitized shell execution (exec, execSync)
 * - Secret leakage into logs, telemetry, or exceptions
 * - Plaintext fallback patterns
 * - Hardcoded credentials
 *
 * FAILS CLOSED (exit code 1) IF DANGEROUS PATTERNS ARE DETECTED WITHOUT JUSTIFICATION.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const SCAN_DIRS = [
  path.join(ROOT, 'oasyss-flux-macos', 'core'),
  path.join(ROOT, 'oasyss-flux-macos', 'platform'),
  path.join(ROOT, 'oasyss-flux-macos', 'ui'),
  path.join(ROOT, 'oasyss-flux-macos', 'scripts'),
  path.join(ROOT, 'oasyss-flux-macos', 'assets'),
  path.join(ROOT, 'oasyss-flux-windows')
];

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'Release',
  'bin',
  'obj',
  '.vs'
]);

// Explicit allowlist with strict justification
const ALLOWLIST = [
  {
    fileMatch: /scripts[/\\]build-macos\.js$/,
    pattern: /spawnSync|execSync/,
    reason: 'Build pipeline script invokes electron-packager and Apple lipo toolchain.'
  },
  {
    fileMatch: /scripts[/\\]compile-helpers\.js$/,
    pattern: /execSync/,
    reason: 'Swift helper compilation script invokes swiftc and lipo on build host.'
  },
  {
    fileMatch: /tests[/\\]test-macos-artifact\.js$/,
    pattern: /execSync/,
    reason: 'Artifact verification script inspects Mach-O lipo headers on build host.'
  },
  {
    fileMatch: /platform[/\\]macos[/\\]MacPlatformAdapter\.js$/,
    pattern: /spawnSync/,
    reason: 'Platform adapter executes native Swift helper with argument array and stdin secret protocol.'
  },
  {
    fileMatch: /scripts[/\\]scan-security\.js$/,
    pattern: /.*/,
    reason: 'Security scanner itself defines search patterns.'
  }
];

const SECURITY_RULES = [
  {
    id: 'SEC-RULE-01',
    name: 'Dynamic Code Execution (eval)',
    regex: /\beval\s*\(/,
    severity: 'CRITICAL',
    description: 'Dynamic code execution via eval() is strictly forbidden.'
  },
  {
    id: 'SEC-RULE-02',
    name: 'Dynamic Code Execution (new Function)',
    regex: /new\s+Function\s*\(/,
    severity: 'CRITICAL',
    description: 'Dynamic code execution via new Function() is strictly forbidden.'
  },
  {
    id: 'SEC-RULE-03',
    name: 'Unsafe String Interpolation in ExecuteScriptAsync',
    regex: /ExecuteScriptAsync\s*\(\s*\$["']/,
    severity: 'CRITICAL',
    description: 'ExecuteScriptAsync must use strictly escaped JSON serialization, never raw string interpolation.'
  },
  {
    id: 'SEC-RULE-04',
    name: 'Unsafe Plaintext Fallback Pattern',
    regex: /catch\s*\([^)]*\)\s*\{\s*return\s+(plaintext|secret|key);?\s*\}/i,
    severity: 'CRITICAL',
    description: 'Silently falling back to plaintext upon encryption failure is strictly prohibited. Fail closed.'
  },
  {
    id: 'SEC-RULE-05',
    name: 'Hardcoded API Key Pattern',
    regex: /(AIza[0-9A-Za-z-_]{35}|sk-[0-9A-Za-z]{20,}|gsk_[0-9A-Za-z]{20,})/,
    severity: 'CRITICAL',
    description: 'Hardcoded API key detected in source code.'
  },
  {
    id: 'SEC-RULE-06',
    name: 'Dangerous Pseudo-Protocol',
    regex: /["']javascript:\s*[^"']+["']/i,
    severity: 'HIGH',
    description: 'Dangerous javascript: pseudo-protocol found in source code.'
  },
  {
    id: 'SEC-RULE-07',
    name: 'Raw Secret Logging',
    regex: /(console\.log|logger\.\w+)\s*\([^)]*(apiKey|secretKey|password|bearer|Authorization)[^)]*\)/i,
    severity: 'HIGH',
    description: 'Potential logging of credentials or authorization tokens.'
  },
  {
    id: 'SEC-RULE-08',
    name: 'Unsanitized Shell Execution',
    regex: /\b(exec|execSync)\s*\(\s*`[^`]*\$\{/,
    severity: 'CRITICAL',
    description: 'Shell execution with template string interpolation enables command injection. Use spawnSync with argument arrays.'
  }
];

function isAllowlisted(filePath, patternName) {
  return ALLOWLIST.some(item => {
    if (item.fileMatch.test(filePath)) {
      if (item.pattern.test(patternName)) {
        return true;
      }
    }
    return false;
  });
}

function scanFile(filePath, violations) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.js', '.cs', '.swift', '.html', '.xaml', '.json', '.plist', '.sh'].includes(ext)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of SECURITY_RULES) {
      if (rule.regex.test(line)) {
        if (!isAllowlisted(filePath, rule.name)) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            description: rule.description,
            file: path.relative(ROOT, filePath),
            line: i + 1,
            code: line.trim()
          });
        }
      }
    }
  }
}

function scanDirectory(dir, violations) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath, violations);
    } else if (entry.isFile()) {
      scanFile(fullPath, violations);
    }
  }
}

async function runSecurityScan() {
  console.log('====================================================');
  console.log('Oasyss Flux: Automated Security Static Analysis');
  console.log('Scanning for injection, secret leaks & dangerous patterns');
  console.log('====================================================\n');

  const violations = [];

  for (const dir of SCAN_DIRS) {
    scanDirectory(dir, violations);
  }

  if (violations.length === 0) {
    console.log('✓ [PASS] Zero security rule violations detected across all source files.');
    console.log('Static security audit passed with 100% compliance.\n');
    process.exit(0);
  } else {
    console.error(`❌ [FAIL] ${violations.length} security rule violation(s) detected:\n`);
    for (const v of violations) {
      console.error(`[${v.severity}] ${v.ruleId}: ${v.ruleName}`);
      console.error(`  Location: ${v.file}:${v.line}`);
      console.error(`  Code:     ${v.code}`);
      console.error(`  Details:  ${v.description}\n`);
    }
    console.error('FAIL CLOSED: Build/CI halted due to security violations.');
    process.exit(1);
  }
}

runSecurityScan().catch(err => {
  console.error('Security scan failed with runtime error:', err);
  process.exit(1);
});
