import { prisma } from "../lib/db.js";
import type { RefreshToken } from "../generated/prisma/client.js";

export interface CreateTokenInput {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export async function create(input: CreateTokenInput): Promise<RefreshToken> {
  return prisma.refreshToken.create({ data: input });
}

export async function findByHash(tokenHash: string): Promise<RefreshToken | null> {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

export async function revokeFamily(familyId: string): Promise<number> {
  const result = await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export async function revokeAllForUser(userId: string): Promise<number> {
  const result = await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export async function deleteExpired(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() }, revokedAt: null },
  });
  return result.count;
}

export async function rotateAtomically(
  oldTokenId: string,
  next: CreateTokenInput,
): Promise<RefreshToken | null> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.refreshToken.updateMany({
      where: { id: oldTokenId, usedAt: null, revokedAt: null },
      data: { usedAt: new Date() },
    });

    if (claimed.count === 0) return null;

    return tx.refreshToken.create({ data: next });
  });
}
