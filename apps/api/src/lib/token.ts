import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const ISSUER = "media-tracker";

export interface AccessTokenPayload {
  userId: string;
}

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${String(env.ACCESS_TOKEN_TTL_MINUTES)}m`)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      algorithms: ["HS256"],
    });
    return payload.sub === undefined ? null : { userId: payload.sub };
  } catch {
    return null;
  }
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
