import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (req, res) => {
  return res.json({ ok: true });
});
