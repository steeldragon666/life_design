/**
 * Centralised runtime configuration with validation.
 *
 * Call `validateConfig()` once at application startup (e.g. in your root
 * layout or server entry point) to surface missing environment variables
 * as clear, actionable error messages before any request is served.
 *
 * All subsequent code should call `getConfig()` to obtain the cached singleton
 * rather than reading `process.env` directly.
 */

export interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
    publishableKey: string;
    prices: {
      monthly: string;
      annual: string;
      lifetime: string;
    };
  };
  googleAi: {
    apiKey: string;
  };
  oauth: {
    strava: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    google: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
  };
  encryption: {
    key: string;
  };
  monitoring: {
    sentryDsn: string;
    posthogKey: string;
    posthogHost: string;
  };
  app: {
    url: string;
    name: string;
  };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Reads an env var and throws a descriptive error if it is absent or empty.
 *
 * @param name - The environment variable name.
 * @param context - Human-readable description of where the value comes from.
 * @returns The non-empty string value.
 * @throws {Error} When the variable is missing or empty.
 */
function required(name: string, context: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `[config] Missing required environment variable "${name}".\n` +
        `  Where to find it: ${context}\n` +
        `  Copy .env.example to .env.local and populate all required values.`,
    );
  }
  return value.trim();
}

/**
 * Reads an optional env var, returning a fallback when absent.
 *
 * @param name - The environment variable name.
 * @param fallback - Default value if the variable is absent (default: '').
 * @returns The value or the fallback.
 */
function optional(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim();
}

// ─── Singleton cache ─────────────────────────────────────────────────────────

let cachedConfig: AppConfig | null = null;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validates all required environment variables and returns a fully-typed
 * `AppConfig` object.
 *
 * Should be called once at startup. Subsequent calls return the cached instance
 * without re-reading `process.env`.
 *
 * @returns A validated, immutable `AppConfig` object.
 * @throws {Error} With a descriptive message listing each missing variable.
 */
export function validateConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const errors: string[] = [];

  function collect(name: string, context: string): string {
    try {
      return required(name, context);
    } catch (err) {
      errors.push((err as Error).message);
      return '';
    }
  }

  const config: AppConfig = {
    supabase: {
      url: collect('NEXT_PUBLIC_SUPABASE_URL', 'Supabase dashboard → Settings → API → Project URL'),
      anonKey: collect('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase dashboard → Settings → API → anon public key'),
      serviceRoleKey: collect('SUPABASE_SERVICE_ROLE_KEY', 'Supabase dashboard → Settings → API → service_role secret key'),
    },
    stripe: {
      secretKey: collect('STRIPE_SECRET_KEY', 'Stripe dashboard → Developers → API keys → Secret key'),
      webhookSecret: collect('STRIPE_WEBHOOK_SECRET', 'Stripe dashboard → Developers → Webhooks → Signing secret'),
      publishableKey: collect('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'Stripe dashboard → Developers → API keys → Publishable key'),
      prices: {
        monthly: collect('STRIPE_PRICE_MONTHLY', 'Stripe dashboard → Products → Life Design Monthly → Price ID'),
        annual: collect('STRIPE_PRICE_ANNUAL', 'Stripe dashboard → Products → Life Design Annual → Price ID'),
        lifetime: collect('STRIPE_PRICE_LIFETIME', 'Stripe dashboard → Products → Life Design Lifetime → Price ID'),
      },
    },
    googleAi: {
      apiKey: collect('GOOGLE_AI_API_KEY', 'Google AI Studio → API keys (https://aistudio.google.com)'),
    },
    oauth: {
      strava: {
        clientId: collect('STRAVA_CLIENT_ID', 'https://www.strava.com/settings/api → Client ID'),
        clientSecret: collect('STRAVA_CLIENT_SECRET', 'https://www.strava.com/settings/api → Client Secret'),
        redirectUri: collect('STRAVA_REDIRECT_URI', 'Must match the Authorization Callback Domain at strava.com/settings/api'),
      },
      google: {
        clientId: collect('GOOGLE_CLIENT_ID', 'Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID'),
        clientSecret: collect('GOOGLE_CLIENT_SECRET', 'Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client Secret'),
        redirectUri: collect('GOOGLE_REDIRECT_URI', 'Must match an Authorised redirect URI in Google Cloud Console'),
      },
    },
    encryption: {
      key: collect('ENCRYPTION_KEY', 'Generate with: openssl rand -hex 32  (256-bit hex key for AES token encryption)'),
    },
    monitoring: {
      sentryDsn: optional('NEXT_PUBLIC_SENTRY_DSN'),
      posthogKey: optional('NEXT_PUBLIC_POSTHOG_KEY'),
      posthogHost: optional('NEXT_PUBLIC_POSTHOG_HOST', 'https://app.posthog.com'),
    },
    app: {
      url: collect('NEXT_PUBLIC_APP_URL', 'The public-facing URL of the deployed app (no trailing slash)'),
      name: optional('NEXT_PUBLIC_APP_NAME', 'Life Design'),
    },
  };

  if (errors.length > 0) {
    throw new Error(
      `[config] ${errors.length} required environment variable(s) are missing:\n\n` +
        errors.join('\n\n'),
    );
  }

  cachedConfig = Object.freeze(config) as AppConfig;
  return cachedConfig;
}

/**
 * Returns the cached, validated `AppConfig` singleton.
 *
 * `validateConfig()` must have been called at least once before this function
 * is used; typically at app startup in a root layout or middleware.
 *
 * @returns The validated `AppConfig` singleton.
 * @throws {Error} If called before `validateConfig()` with missing env vars.
 */
export function getConfig(): AppConfig {
  if (!cachedConfig) {
    return validateConfig();
  }
  return cachedConfig;
}

/**
 * Resets the config singleton. For use in tests only.
 *
 * @internal
 */
export function _resetConfig(): void {
  cachedConfig = null;
}
