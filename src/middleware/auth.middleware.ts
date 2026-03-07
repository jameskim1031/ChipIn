import type { NextFunction, Request, Response } from "express";
import { supabase } from "../services/supabase.service";

function extractBearerToken(authHeader: string | undefined) {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = extractBearerToken(req.header("authorization"));
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user)
    return res.status(401).json({ error: "Invalid or expired token" });

  req.accessToken = token;
  req.authUser = { id: data.user.id, email: data.user.email ?? null };
  return next();
}
