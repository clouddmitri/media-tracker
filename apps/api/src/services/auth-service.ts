import { randomUUID } from "node:crypto";
import * as tokenRepo from "../repositories/refresh-token.repository.js";
import { generateRefreshToken, hashToken, signAccessToken } from "../lib/token.js";
import { env } from "../config/env.js";

export interface SessionMetadata {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export class TokenReuseError extends Error {
  constructor(readonly familyId: string) {
    super("Refresh token reuse detected");
    this.name = "TokenReuseError";
  }
}

export class InvalidTokenError extends Error {
  constructor(message = "Invalid or expired refresh token") {
    super(message);
    this.name = "InvalidTokenError";
  }
}

function refreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function issueTokenPair(
  userId: string,
  metadata: SessionMetadata = {},
): Promise<TokenPair> {
  const refreshToken = generateRefreshToken();
  const expiresAt = refreshExpiry();

  await tokenRepo.create({
    userId,
    familyId: randomUUID(),
    tokenHash: hashToken(refreshToken),
    expiresAt,
    userAgent: metadata.userAgent ?? null,
    ipAddress: metadata.ipAddress ?? null,
  });

  return {
    accessToken: await signAccessToken(userId),
    refreshToken,
    refreshExpiresAt: expiresAt,
  };
}

export async function rotateTokens(
  presentedToken: string,
  metadata: SessionMetadata = {},
): Promise<TokenPair> {
  const existing = await tokenRepo.findByHash(hashToken(presentedToken));

  if (existing === null) {
    throw new InvalidTokenError();
  }

  if (existing.usedAt !== null) {
    const revoked = await tokenRepo.revokeFamily(existing.familyId);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "refresh token reuse detected",
        event: "security",
        userId: existing.userId,
        familyId: existing.familyId,
        tokensRevoked: revoked,
        presentedFromIp: metadata.ipAddress,
        presentedFromUserAgent: metadata.userAgent,
      }),
    );
    throw new TokenReuseError(existing.familyId);
  }

  if (existing.revokedAt !== null) {
    throw new InvalidTokenError("Session has been revoked");
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    throw new InvalidTokenError("Session has expired");
  }

  const nextToken = generateRefreshToken();
  const expiresAt = refreshExpiry();

  const created = await tokenRepo.rotateAtomically(existing.id, {
    userId: existing.userId,
    familyId: existing.familyId,
    tokenHash: hashToken(nextToken),
    expiresAt,
    userAgent: metadata.userAgent ?? null,
    ipAddress: metadata.ipAddress ?? null,
  });

  if (created === null) {
    throw new InvalidTokenError();
  }

  return {
    accessToken: await signAccessToken(existing.userId),
    refreshToken: nextToken,
    refreshExpiresAt: expiresAt,
  };
}

export async function revokeSession(presentedToken: string): Promise<void> {
  const existing = await tokenRepo.findByHash(hashToken(presentedToken));
  if (existing !== null) {
    await tokenRepo.revokeFamily(existing.familyId);
  }
}

export async function revokeAllSessions(userId: string): Promise<number> {
  return tokenRepo.revokeAllForUser(userId);
}
