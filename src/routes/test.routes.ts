import { Router } from "express";
import { sendCheckoutLink } from "../controllers/test.controller";
import {
  addInvitees,
  createInvitationLink,
  createGift,
  getGiftById,
  getJoinGiftByToken,
  getJoinInviteeStatus,
  getLatestInvitationLinkForGift,
  listGifts,
  lockAndSend,
  respondToJoinInvitation,
} from "../controllers/gift.controller";
import { getSessionStatusDb } from "../controllers/sessionStatus.controller";
import { makeRateLimitMiddleware } from "../middleware/rateLimit.middleware";
import { env } from "../config/env";

export const testRouter = Router();
const emailSendRateLimit = makeRateLimitMiddleware({
  keyPrefix: "email-send",
  windowMs: env.EMAIL_RATE_LIMIT_WINDOW_MS,
  max: env.EMAIL_RATE_LIMIT_MAX,
});

testRouter.post("/send-checkout-link", emailSendRateLimit, (req, res) =>
  sendCheckoutLink(req, res),
);

testRouter.post("/gifts", createGift);
testRouter.get("/gifts", listGifts);
testRouter.get("/gifts/:giftId", getGiftById);
testRouter.post("/gifts/:giftId/invitees", addInvitees);
testRouter.post("/gifts/:giftId/invitation-links", createInvitationLink);
testRouter.get(
  "/gifts/:giftId/invitation-links/latest",
  getLatestInvitationLinkForGift,
);
testRouter.get("/join/:token", getJoinGiftByToken);
testRouter.get("/join/:token/invitee-status", getJoinInviteeStatus);
testRouter.post("/join/:token/respond", respondToJoinInvitation);
testRouter.post("/gifts/:giftId/lock-and-send", emailSendRateLimit, lockAndSend);
testRouter.get("/session-status/:sessionId", getSessionStatusDb);
