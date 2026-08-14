import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ép Quota xuống 5% để không bị hết quota do Bot cào web
  tracesSampleRate: 0.05,
});
