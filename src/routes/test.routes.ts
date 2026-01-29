import { Router } from "express";
import { sendCheckoutLink } from "../controllers/test.controller";
import { getSessionStatus } from "../store/session.store";
import {
  addInvitees,
  createGift,
  lockAndSend,
} from "../controllers/gift.controller";
import { getSessionStatusDb } from "../controllers/sessionStatus.controller";

export const testRouter = Router();

testRouter.post("/send-checkout-link", (req, res) =>
  sendCheckoutLink(req, res),
);

testRouter.post("/gifts", createGift);
testRouter.post("/gifts/:giftId/invitees", addInvitees);
testRouter.post("/gifts/:giftId/lock-and-send", lockAndSend);
testRouter.get("/session-status/:sessionId", getSessionStatusDb);
