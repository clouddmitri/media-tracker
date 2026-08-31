import type { Prisma } from "../generated/prisma/client.js";

export function toNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}
