import type { Response } from "express";
import { isProduction } from "../config/env.js";

export const REFRESH_COOKIE = "refresh_token";
const COOKIE_PATH = "/api/v1/auth";

export function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: COOKIE_PATH,
    expires: expiresAt,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: COOKIE_PATH,
  });
}
