#!/usr/bin/env node
/**
 * Life Design — Launch Checklist
 *
 * Run with:  npx tsx scripts/launch-checklist.ts
 *
 * Performs pre-launch validation checks across the entire stack and
 * prints a pass/fail report to stdout. A non-zero exit code is returned
 * if any critical check fails, making it suitable for CI pipelines.
 *
 * Check categories:
 *   1. Required environment variables
 *   2. Supabase connectivity
 *   3. Required static files
 *   4. Vercel security headers
 *   5. PWA manifest validity
 *   6. No exposed secrets in source files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as https from 'node:https';
import * as http from 'node:http';

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

interface CheckResult {
  label: string;
  passed: boolean;
  note?: string;
  critical: boolean;
}

const results: CheckResult[] = [];

function pass(label: string, note?: string, critical = true): void {
  results.push({ label, passed: true, note, critical });
}

function fail(label: string, note?: string, critical = true): void {
  results.push({ label, passed: false, note, critical });
}

/** Resolve a path relative to the monorepo root. */
function root(...segments: string[]): string {
  // scripts/ is one level below the repo root
  return path.resolve(__dirname, '..', ...segments);
}

/** Returns file contents or null if the file does not exist. */
function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/** Walk a directory tree and yield all file paths. */
function* walkDir(dir: string, ignore: string[] = []): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (ignore.some((i) => fullPath.includes(i))) continue;
    if (entry.isDirectory()) {
      yield* walkDir(fullPath, ignore);
    } else {
      yield fullPath;
    }
  }
}

/** Perform a simple HTTP/HTTPS GET and resolve with the status code. */
function httpGet(url: string, timeoutMs = 5000): Promise<number> {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode ?? 0);
      res.resume();
    });
    req.on('error', () => resolve(0));
    req.on('timeout', () => { req.destroy(); resolve(0); });
  });
}

// ---------------------------------------------------------------------------
// 1. Environment variables
// ---------------------------------------------------------------------------

async function checkEnvironmentVariables(): Promise<void> {
  console.log('\n\x1b[2m--- Environment Variables ---\x1b[0m');

  // Load .env.local if present
  const envLocalPath = root('apps', 'web', '.env.local');
  const envLocal = readFile(envLocalPath) ?? '';
  const envLines = envLocal.split('\n');
  const envMap: Record<string, string> = {};
  for (const line of envLines) {
    const [k, ...rest] = line.split('=');
    if (k && !k.startsWith('#')) envMap[k.trim()] = rest.join('=').trim();
  }

  // Merge with process.env
  const env = { ...envMap, ...process.env };

  const required: Array<{ key: string; critical: boolean; hint: string }> = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL',    critical: true,  hint: 'Supabase project URL'                   },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', critical: true, hint: 'Supabase anon/public key'              },
    { key: 'SUPABASE_SERVICE_ROLE_KEY',   critical: true,  hint: 'Supabase service-role key (server only)' },
    { key: 'NEXT_PUBLIC_APP_URL',         critical: false, hint: 'Public app URL (e.g. https://lifedesign.app)' },
    { key: 'STRIPE_SECRET_KEY',           critical: true,  hint: 'Stripe secret key'                      },
    { key: 'STRIPE_WEBHOOK_SECRET',       critical: true,  hint: 'Stripe webhook signing secret'           },
    { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', critical: true, hint: 'Stripe publishable key'           },
    { key: 'GOOGLE_AI_API_KEY',           critical: true,  hint: 'Google Gemini API key'                  },
  ];

  for (const { key, critical, hint } of required) {
    const value = env[key];
    if (value && value.length > 0) {
      pass(`Env: ${key} is set`, undefined, critical);
    } else {
      fail(`Env: ${key} is missing`, hint, critical);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Supabase connectivity
// ---------------------------------------------------------------------------

async function checkSupabaseConnectivity(): Promise<void> {
  console.log('\n\x1b[2m--- Supabase Connectivity ---\x1b[0m');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    fail('Supabase: URL reachable', 'NEXT_PUBLIC_SUPABASE_URL not set — skipped', true);
    return;
  }

  // Ping the Supabase health endpoint
  const healthUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/`;
  const statusCode = await httpGet(healthUrl);

  if (statusCode >= 200 && statusCode < 500) {
    pass('Supabase: URL reachable', `HTTP ${statusCode} from ${healthUrl}`);
  } else if (statusCode === 0) {
    fail('Supabase: URL reachable', `No response from ${healthUrl} — network error or invalid URL`, true);
  } else {
    // 5xx means reachable but internal error; still counts as reachable
    pass('Supabase: URL reachable', `HTTP ${statusCode} from ${healthUrl} (server-side error)`);
  }
}

// ---------------------------------------------------------------------------
// 3. Required files
// ---------------------------------------------------------------------------

async function checkRequiredFiles(): Promise<void> {
  console.log('\n\x1b[2m--- Required Files ---\x1b[0m');

  const required: Array<{ label: string; path: string; critical: boolean }> = [
    { label: 'PWA manifest',      path: root('apps/web/public/manifest.json'),       critical: true  },
    { label: 'Service worker',    path: root('apps/web/src/app/sw.ts'),               critical: false },
    { label: 'Sitemap',           path: root('apps/web/src/app/sitemap.ts'),          critical: true  },
    { label: 'Robots',            path: root('apps/web/src/app/robots.ts'),           critical: true  },
    { label: 'Marketing landing', path: root('apps/web/src/app/(marketing)/page.tsx'), critical: true },
    { label: 'Privacy page',      path: root('apps/web/src/app/(marketing)/privacy/page.tsx'), critical: true },
    { label: 'Terms page',        path: root('apps/web/src/app/(marketing)/terms/page.tsx'), critical: true },
    { label: 'Pricing page',      path: root('apps/web/src/app/(public)/pricing/page.tsx'), critical: true },
    { label: 'Layout',            path: root('apps/web/src/app/layout.tsx'),          critical: true  },
    { label: 'vercel.json',       path: root('vercel.json'),                          critical: true  },
    { label: 'Mobile app.json',   path: root('apps/mobile/app.json'),                critical: false },
  ];

  for (const { label, path: filePath, critical } of required) {
    if (fs.existsSync(filePath)) {
      pass(`File exists: ${label}`, undefined, critical);
    } else {
      fail(`File missing: ${label}`, filePath, critical);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Vercel security headers
// ---------------------------------------------------------------------------

async function checkVercelSecurityHeaders(): Promise<void> {
  console.log('\n\x1b[2m--- Vercel Security Headers ---\x1b[0m');

  const content = readFile(root('vercel.json'));
  if (!content) {
    fail('vercel.json: file readable', 'File not found', true);
    return;
  }

  let config: unknown;
  try {
    config = JSON.parse(content);
  } catch {
    fail('vercel.json: valid JSON', 'JSON parse error', true);
    return;
  }

  pass('vercel.json: valid JSON');

  const headers = ((config as Record<string, unknown>)?.headers ?? []) as Array<{
    source: string;
    headers: Array<{ key: string; value: string }>;
  }>;

  const requiredHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Referrer-Policy',
    'Permissions-Policy',
  ];

  const allHeaderKeys = headers.flatMap((rule) => rule.headers.map((h) => h.key));

  for (const requiredKey of requiredHeaders) {
    if (allHeaderKeys.includes(requiredKey)) {
      pass(`Security header: ${requiredKey}`);
    } else {
      fail(`Security header: ${requiredKey} missing in vercel.json`, undefined, false);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. PWA manifest validity
// ---------------------------------------------------------------------------

async function checkPwaManifest(): Promise<void> {
  console.log('\n\x1b[2m--- PWA Manifest ---\x1b[0m');

  const content = readFile(root('apps/web/public/manifest.json'));
  if (!content) {
    fail('PWA manifest: file readable', undefined, true);
    return;
  }

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(content);
  } catch {
    fail('PWA manifest: valid JSON', 'JSON parse error', true);
    return;
  }

  pass('PWA manifest: valid JSON');

  const requiredFields: Array<{ key: string; critical: boolean }> = [
    { key: 'name',             critical: true  },
    { key: 'short_name',       critical: true  },
    { key: 'start_url',        critical: true  },
    { key: 'display',          critical: true  },
    { key: 'background_color', critical: false },
    { key: 'theme_color',      critical: false },
    { key: 'icons',            critical: true  },
  ];

  for (const { key, critical } of requiredFields) {
    if (key in manifest && manifest[key] !== undefined && manifest[key] !== '') {
      pass(`PWA manifest: "${key}" present`, undefined, critical);
    } else {
      fail(`PWA manifest: "${key}" missing or empty`, undefined, critical);
    }
  }

  // Validate icons array
  const icons = manifest.icons as Array<Record<string, string>> | undefined;
  if (Array.isArray(icons) && icons.length > 0) {
    pass(`PWA manifest: ${icons.length} icon(s) declared`);

    const has192 = icons.some((i) => i.sizes?.includes('192'));
    const has512 = icons.some((i) => i.sizes?.includes('512'));
    const hasMaskable = icons.some((i) => i.purpose?.includes('maskable') || i.purpose?.includes('any maskable'));

    if (has192) pass('PWA manifest: 192px icon present');
    else fail('PWA manifest: no 192px icon — required for Android', undefined, false);

    if (has512) pass('PWA manifest: 512px icon present');
    else fail('PWA manifest: no 512px icon — required for install prompt', undefined, false);

    if (hasMaskable) pass('PWA manifest: maskable icon present');
    else fail('PWA manifest: no maskable icon — Android adaptive icons need this', undefined, false);
  }

  // Check display mode
  const validDisplayModes = ['standalone', 'fullscreen', 'minimal-ui', 'browser'];
  if (validDisplayModes.includes(manifest.display as string)) {
    pass(`PWA manifest: display="${manifest.display}" valid`);
  } else {
    fail(`PWA manifest: display="${manifest.display}" invalid`, `Must be one of: ${validDisplayModes.join(', ')}`, true);
  }
}

// ---------------------------------------------------------------------------
// 6. Secret exposure scan
// ---------------------------------------------------------------------------

async function checkNoExposedSecrets(): Promise<void> {
  console.log('\n\x1b[2m--- Secret Exposure Scan ---\x1b[0m');

  // Patterns that should NEVER appear in client-side code
  const secretPatterns: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /sk_live_[a-zA-Z0-9]{20,}/,                 name: 'Stripe live secret key (sk_live_...)' },
    { pattern: /sk_test_[a-zA-Z0-9]{20,}/,                 name: 'Stripe test secret key (sk_test_...)' },
    { pattern: /whsec_[a-zA-Z0-9]{20,}/,                   name: 'Stripe webhook secret (whsec_...)' },
    { pattern: /service_role["\s:]+ey[A-Za-z0-9._-]{20,}/, name: 'Supabase service role JWT' },
    { pattern: /AIza[0-9A-Za-z_-]{35}/,                    name: 'Google API key (AIza...)' },
    { pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,name: 'Private key block' },
  ];

  // Only scan client bundle directories and source that ships to the browser
  const scanDirs = [
    root('apps/web/src'),
    root('apps/web/public'),
    root('packages/core/src'),
  ];

  // Extensions to scan
  const scanExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.env', '.env.local']);

  // Directories to ignore
  const ignoreDirs = ['node_modules', '.next', '.git', 'dist', '.turbo'];

  const findings: Array<{ file: string; pattern: string }> = [];

  for (const dir of scanDirs) {
    for (const filePath of walkDir(dir, ignoreDirs)) {
      const ext = path.extname(filePath);
      if (!scanExtensions.has(ext)) continue;

      const content = readFile(filePath);
      if (!content) continue;

      for (const { pattern, name } of secretPatterns) {
        if (pattern.test(content)) {
          findings.push({ file: filePath.replace(root(), ''), pattern: name });
        }
      }
    }
  }

  if (findings.length === 0) {
    pass('Secret scan: no exposed secrets found in client source');
  } else {
    for (const { file, pattern } of findings) {
      fail(`Secret exposed: ${pattern}`, `Found in ${file}`, true);
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Additional pre-launch checks
// ---------------------------------------------------------------------------

async function checkMiscellaneous(): Promise<void> {
  console.log('\n\x1b[2m--- Miscellaneous ---\x1b[0m');

  // Check layout.tsx references manifest
  const layout = readFile(root('apps/web/src/app/layout.tsx'));
  if (layout?.includes('manifest.json')) {
    pass('layout.tsx: links to manifest.json');
  } else {
    fail('layout.tsx: missing manifest.json link', undefined, true);
  }

  // Check layout.tsx has theme-color meta
  if (layout?.includes('theme-color')) {
    pass('layout.tsx: theme-color meta tag present');
  } else {
    fail('layout.tsx: missing theme-color meta tag', undefined, false);
  }

  // Check apple-mobile-web-app-capable
  if (layout?.includes('apple-mobile-web-app-capable')) {
    pass('layout.tsx: Apple PWA meta tags present');
  } else {
    fail('layout.tsx: missing Apple PWA meta tags', undefined, false);
  }

  // Check og:image is configured
  if (layout?.includes('og-image')) {
    pass('layout.tsx: og:image configured');
  } else {
    fail('layout.tsx: og:image not configured', 'Add Open Graph image for social sharing', false);
  }

  // Check twitter:card
  if (layout?.includes('twitter') && layout?.includes('summary_large_image')) {
    pass('layout.tsx: Twitter card configured');
  } else {
    fail('layout.tsx: Twitter card not configured', undefined, false);
  }

  // Verify mobile app.json has HealthKit
  const appJson = readFile(root('apps/mobile/app.json'));
  if (appJson?.includes('com.apple.developer.healthkit')) {
    pass('mobile/app.json: HealthKit entitlements present');
  } else {
    fail('mobile/app.json: HealthKit entitlements missing', undefined, false);
  }

  // Verify mobile has ACTIVITY_RECOGNITION
  if (appJson?.includes('ACTIVITY_RECOGNITION')) {
    pass('mobile/app.json: Android activity recognition permission present');
  } else {
    fail('mobile/app.json: Android ACTIVITY_RECOGNITION permission missing', undefined, false);
  }

  // Check robots.ts disallows /dashboard
  const robots = readFile(root('apps/web/src/app/robots.ts'));
  if (robots?.includes('/dashboard')) {
    pass('robots.ts: /dashboard is disallowed');
  } else {
    fail('robots.ts: /dashboard not disallowed — check robots config', undefined, false);
  }

  // Check sitemap includes base URL
  const sitemap = readFile(root('apps/web/src/app/sitemap.ts'));
  if (sitemap?.includes('NEXT_PUBLIC_APP_URL')) {
    pass('sitemap.ts: uses NEXT_PUBLIC_APP_URL');
  } else {
    fail('sitemap.ts: NEXT_PUBLIC_APP_URL not referenced', undefined, false);
  }
}

// ---------------------------------------------------------------------------
// Main — run all checks and print report
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('\n\x1b[1m\x1b[36m====================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m  Life Design — Launch Checklist    \x1b[0m');
  console.log('\x1b[1m\x1b[36m====================================\x1b[0m');
  console.log(`\x1b[2m  ${new Date().toISOString()}\x1b[0m`);

  // Run all checks
  await checkEnvironmentVariables();
  await checkSupabaseConnectivity();
  await checkRequiredFiles();
  await checkVercelSecurityHeaders();
  await checkPwaManifest();
  await checkNoExposedSecrets();
  await checkMiscellaneous();

  // ---------------------------------------------------------------------------
  // Print summary
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[1m\x1b[36m====================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m  Results                           \x1b[0m');
  console.log('\x1b[1m\x1b[36m====================================\x1b[0m\n');

  let criticalFailures = 0;
  let warnings = 0;
  let passes = 0;

  for (const result of results) {
    if (result.passed) {
      passes++;
      const icon = '\x1b[32m\u2713\x1b[0m'; // green checkmark
      const note = result.note ? `\x1b[2m (${result.note})\x1b[0m` : '';
      console.log(`  ${icon}  ${result.label}${note}`);
    } else if (result.critical) {
      criticalFailures++;
      const icon = '\x1b[31m\u2717\x1b[0m'; // red cross
      const note = result.note ? `\x1b[2m — ${result.note}\x1b[0m` : '';
      console.log(`  ${icon}  \x1b[31m${result.label}\x1b[0m${note}`);
    } else {
      warnings++;
      const icon = '\x1b[33m\u26a0\x1b[0m'; // yellow warning
      const note = result.note ? `\x1b[2m — ${result.note}\x1b[0m` : '';
      console.log(`  ${icon}  \x1b[33m${result.label}\x1b[0m${note}`);
    }
  }

  // Summary line
  const total = results.length;
  console.log('\n  ─────────────────────────────────');
  console.log(
    `  Total: ${total}  |  ` +
    `\x1b[32m${passes} passed\x1b[0m  |  ` +
    `\x1b[33m${warnings} warnings\x1b[0m  |  ` +
    `\x1b[31m${criticalFailures} critical failures\x1b[0m`,
  );

  if (criticalFailures > 0) {
    console.log(`\n  \x1b[31m\u2717 NOT READY TO LAUNCH — ${criticalFailures} critical issue(s) must be resolved.\x1b[0m\n`);
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`\n  \x1b[33m\u26a0 REVIEW BEFORE LAUNCH — ${warnings} warning(s) should be addressed.\x1b[0m\n`);
    process.exit(0);
  } else {
    console.log(`\n  \x1b[32m\u2713 READY TO LAUNCH — all checks passed.\x1b[0m\n`);
    process.exit(0);
  }
}

main().catch((err: unknown) => {
  console.error('\n\x1b[31mLaunch checklist crashed:\x1b[0m', err);
  process.exit(1);
});
