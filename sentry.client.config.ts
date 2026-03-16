import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable when DSN is configured in production
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === "production",

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session replay (optional, low sample rate)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,

  // Environment
  environment: process.env.NODE_ENV,
});
