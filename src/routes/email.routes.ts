import { Router } from "express";
import express from "express";
import { resendWebhook } from "../controllers/email.controller";

export const emailRouter = Router();

emailRouter.post(
  "/resend/webhook",
  express.raw({ type: "application/json" }),
  resendWebhook,
);
