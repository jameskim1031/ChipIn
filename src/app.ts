import express from "express";
import { healthRouter } from "./routes/health.routes";
import { testRouter } from "./routes/test.routes";
import { stripeRouter } from "./routes/stripe.routes";

export function createApp() {
  const app = express();

  // IMPORTANT:
  // Webhook router must be mounted BEFORE express.json()
  // because it uses express.raw() internally.
  app.use("/api/stripe", stripeRouter);

  // Normal JSON parsing for the rest
  app.use(express.json());

  app.use("/health", healthRouter);
  app.use("/api/test", testRouter);

  return app;
}
