import { prisma } from "../lib/db.js";

export interface EpisodeProgressDTO {
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: Date;
}

export async function markWatched(
  libraryEntryId: string,
  seasonNumber: number,
  episodeNumber: number,
): Promise<EpisodeProgressDTO> {
  const row = await prisma.episodeProgress.upsert({
    where: {
      libraryEntryId_seasonNumber_episodeNumber: {
        libraryEntryId,
        seasonNumber,
        episodeNumber,
      },
    },
    create: { libraryEntryId, seasonNumber, episodeNumber },
    update: {},
  });

  return {
    seasonNumber: row.seasonNumber,
    episodeNumber: row.episodeNumber,
    watchedAt: row.watchedAt,
  };
}

export async function markUnwatched(
  libraryEntryId: string,
  seasonNumber: number,
  episodeNumber: number,
): Promise<boolean> {
  const result = await prisma.episodeProgress.deleteMany({
    where: { libraryEntryId, seasonNumber, episodeNumber },
  });
  return result.count > 0;
}

export async function listForEntry(libraryEntryId: string): Promise<EpisodeProgressDTO[]> {
  const rows = await prisma.episodeProgress.findMany({
    where: { libraryEntryId },
    orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
  });
  return rows.map((r) => ({
    seasonNumber: r.seasonNumber,
    episodeNumber: r.episodeNumber,
    watchedAt: r.watchedAt,
  }));
}

export async function countForEntry(libraryEntryId: string): Promise<number> {
  return prisma.episodeProgress.count({ where: { libraryEntryId } });
}

export async function countBySeason(
  libraryEntryId: string,
): Promise<{ seasonNumber: number; watched: number }[]> {
  const rows = await prisma.episodeProgress.groupBy({
    by: ["seasonNumber"],
    where: { libraryEntryId },
    _count: { _all: true },
    orderBy: { seasonNumber: "asc" },
  });
  return rows.map((r) => ({
    seasonNumber: r.seasonNumber,
    watched: r._count._all,
  }));
}
