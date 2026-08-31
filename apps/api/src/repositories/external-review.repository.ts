import { prisma } from "../lib/db.js";
import { toNumber } from "../lib/decimal.js";
import type { ExternalReview } from "../generated/prisma/client.js";
import type { ExternalReviewDTO } from "@media-tracker/shared";

function toDTO(row: ExternalReview): ExternalReviewDTO {
  return {
    id: row.id,
    author: row.author,
    content: row.content,
    rating: toNumber(row.rating),
    url: row.url,
    publishedAt: row.publishedAt,
    source: row.source,
  };
}

export async function findByMediaItem(
  mediaItemId: string,
  limit = 10,
): Promise<ExternalReviewDTO[]> {
  const rows = await prisma.externalReview.findMany({
    where: { mediaItemId },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit,
  });
  return rows.map(toDTO);
}

export interface UpsertReviewInput {
  externalId: string;
  author: string;
  content: string;
  rating: number | null;
  url: string;
  publishedAt: Date | null;
}

export async function upsertMany(
  mediaItemId: string,
  reviews: UpsertReviewInput[],
): Promise<number> {
  if (reviews.length === 0) return 0;

  const payloads = reviews.map((r) => ({
    mediaItemId,
    source: "TMDB" as const,
    externalId: r.externalId,
    author: r.author,
    content: r.content,
    rating: r.rating,
    url: r.url,
    publishedAt: r.publishedAt,
    fetchedAt: new Date(),
  }));

  await prisma.$transaction(
    payloads.map((data) =>
      prisma.externalReview.upsert({
        where: {
          source_externalId: { source: data.source, externalId: data.externalId },
        },
        create: data,
        update: {
          content: data.content,
          rating: data.rating,
          fetchedAt: data.fetchedAt,
        },
      }),
    ),
  );

  return payloads.length;
}
