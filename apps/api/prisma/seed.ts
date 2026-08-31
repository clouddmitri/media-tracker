import { faker } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { MediaType, LibraryStatus } from "../src/generated/prisma/enums.js";

config({ path: "../../.env" });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

const TMDB_GENRES = [
  { tmdbId: 28, name: "Action" },
  { tmdbId: 12, name: "Adventure" },
  { tmdbId: 16, name: "Animation" },
  { tmdbId: 35, name: "Comedy" },
  { tmdbId: 80, name: "Crime" },
  { tmdbId: 99, name: "Documentary" },
  { tmdbId: 18, name: "Drama" },
  { tmdbId: 14, name: "Fantasy" },
  { tmdbId: 27, name: "Horror" },
  { tmdbId: 9648, name: "Mystery" },
  { tmdbId: 10749, name: "Romance" },
  { tmdbId: 878, name: "Science Fiction" },
  { tmdbId: 53, name: "Thriller" },
  { tmdbId: 10752, name: "War" },
  { tmdbId: 37, name: "Western" },
];

const MEDIA_ITEM_COUNT = 500;
const LIBRARY_ENTRIES_PER_USER = 120;

function maybe<T>(value: T, nullRate = 0.2): T | null {
  return Math.random() < nullRate ? null : value;
}

async function truncateAll(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      episode_progress,
      library_entries,
      media_item_genres,
      media_items,
      genres,
      users,
      pipeline_runs
    RESTART IDENTITY CASCADE
  `);
}

async function main(): Promise<void> {
  console.log("Truncating…");
  await truncateAll();

  console.log("Seeding genres…");
  await prisma.genre.createMany({ data: TMDB_GENRES });
  const genres = await prisma.genre.findMany();

  console.log("Seeding users…");
  await prisma.user.createMany({
    data: [
      {
        email: "demo@example.com",
        passwordHash: "seed-placeholder-not-a-real-hash",
        displayName: "Demo User",
      },
      {
        email: "alex@example.com",
        passwordHash: "seed-placeholder-not-a-real-hash",
        displayName: "Alex",
      },
      {
        email: "sam@example.com",
        passwordHash: "seed-placeholder-not-a-real-hash",
        displayName: "Sam",
      },
    ],
  });
  const users = await prisma.user.findMany();

  console.log(`Seeding ${String(MEDIA_ITEM_COUNT)} media items…`);
  const mediaItemData = Array.from({ length: MEDIA_ITEM_COUNT }, (_, i) => {
    const isMovie = Math.random() < 0.6;
    const mediaType = isMovie ? MediaType.MOVIE : MediaType.TV;

    return {
      tmdbId: 1000 + i,
      imdbId: `tt${String(1000000 + i).padStart(7, "0")}`,
      mediaType,
      title: faker.music.songName(),
      overview: faker.lorem.paragraph(),
      posterPath: `/${faker.string.alphanumeric(20)}.jpg`,
      backdropPath: maybe(`/${faker.string.alphanumeric(20)}.jpg`, 0.15),
      releaseDate: faker.date.between({ from: "1975-01-01", to: "2026-06-01" }),
      runtime: isMovie
        ? faker.number.int({ min: 80, max: 180 })
        : faker.number.int({ min: 20, max: 60 }),
      imdbRating: maybe(faker.number.float({ min: 3, max: 9.5, fractionDigits: 1 }), 0.15),
      imdbVotes: maybe(faker.number.int({ min: 500, max: 2_000_000 }), 0.15),
      rottenTomatoes: maybe(faker.number.int({ min: 5, max: 100 }), 0.3),
      metacritic: maybe(faker.number.int({ min: 10, max: 100 }), 0.4),
      tmdbRating: faker.number.float({ min: 3, max: 9, fractionDigits: 1 }),
      tmdbVoteCount: faker.number.int({ min: 10, max: 30_000 }),
      syncedAt: faker.date.recent({ days: 30 }),
    };
  });

  await prisma.mediaItem.createMany({ data: mediaItemData });
  const mediaItems = await prisma.mediaItem.findMany();

  console.log("Linking genres…");
  const genreLinks = mediaItems.flatMap((item) => {
    const picked = faker.helpers.arrayElements(genres, { min: 1, max: 3 });
    return picked.map((g) => ({ mediaItemId: item.id, genreId: g.id }));
  });
  await prisma.mediaItemGenre.createMany({ data: genreLinks });

  console.log("Seeding library entries…");
  const statuses = Object.values(LibraryStatus);

  for (const user of users) {
    const picked = faker.helpers.arrayElements(mediaItems, LIBRARY_ENTRIES_PER_USER);

    const entries = picked.map((item) => {
      const status = faker.helpers.arrayElement(statuses);
      const isStarted = status !== LibraryStatus.WANT_TO_WATCH;
      const isFinished = status === LibraryStatus.COMPLETED;

      const startedAt = isStarted ? faker.date.past({ years: 2 }) : null;
      const completedAt =
        isFinished && startedAt ? faker.date.between({ from: startedAt, to: new Date() }) : null;

      return {
        userId: user.id,
        mediaItemId: item.id,
        status,
        userRating: isFinished
          ? maybe(faker.number.float({ min: 1, max: 10, multipleOf: 0.5 }), 0.25)
          : null,
        review: isFinished ? maybe(faker.lorem.paragraph(), 0.7) : null,
        startedAt,
        completedAt,
        statusChangedAt: completedAt ?? startedAt ?? faker.date.recent({ days: 90 }),
        snapshotTitle: item.title,
        snapshotPosterPath: item.posterPath,
        snapshotReleaseDate: item.releaseDate,
        snapshotMediaType: item.mediaType,
        snapshotAt: item.syncedAt,
      };
    });

    await prisma.libraryEntry.createMany({ data: entries });
  }

  console.log("Seeding episode progress…");
  const tvEntries = await prisma.libraryEntry.findMany({
    where: {
      snapshotMediaType: MediaType.TV,
      status: { in: [LibraryStatus.WATCHING, LibraryStatus.COMPLETED] },
    },
    take: 200,
  });

  const progress = tvEntries.flatMap((entry) => {
    const seasons = faker.number.int({ min: 1, max: 4 });
    const rows: {
      libraryEntryId: string;
      seasonNumber: number;
      episodeNumber: number;
      watchedAt: Date;
    }[] = [];

    for (let s = 1; s <= seasons; s++) {
      const episodes = faker.number.int({ min: 6, max: 12 });
      for (let e = 1; e <= episodes; e++) {
        rows.push({
          libraryEntryId: entry.id,
          seasonNumber: s,
          episodeNumber: e,
          watchedAt: faker.date.recent({ days: 365 }),
        });
      }
    }
    return rows;
  });

  await prisma.episodeProgress.createMany({ data: progress });

  console.log("\nDone:");
  console.table({
    users: users.length,
    genres: genres.length,
    mediaItems: mediaItems.length,
    genreLinks: genreLinks.length,
    libraryEntries: await prisma.libraryEntry.count(),
    episodeProgress: progress.length,
  });
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
