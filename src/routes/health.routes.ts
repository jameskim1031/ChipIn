import { Router } from "express";
import { sendCheckoutLink } from "../controllers/test.controller";
import { getSessionStatus } from "../store/session.store";

export const healthRouter = Router();

healthRouter.get("/", (req, res) => {
  return res.json({ ok: true });
});
