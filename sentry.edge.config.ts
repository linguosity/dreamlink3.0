// This file configures the initialization of Sentry for edge features (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Monitoring — sample 20% of transactions
  tracesSampleRate: 0.2,

  // Setting this option to true will print useful debug information to the console
  debug: false,
});
