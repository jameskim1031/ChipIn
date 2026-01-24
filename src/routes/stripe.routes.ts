import { Router } from "express";
import express from "express";
import { stripeWebhook } from "../controllers/stripe.controller";

export const stripeRouter = Router();

// Raw body required for webhook verification
stripeRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);
