import { Router } from "express";
import { sendCheckoutLink } from "../controllers/test.controller";
import { getSessionStatus } from "../store/session.store";

export const testRouter = Router();

testRouter.post("/send-checkout-link", (req, res) =>
  sendCheckoutLink(req, res),
);

testRouter.get("/session-status/:sessionId", (req, res) => {
  const status = getSessionStatus(req.params.sessionId);
  if (!status) return res.status(404).json({ error: "Unknown sessionId" });
  return res.json({ ok: true, status });
});
