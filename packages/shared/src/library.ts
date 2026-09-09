import { z } from "zod";

export const LIBRARY_STATUSES = [
  "WANT_TO_WATCH",
  "WATCHING",
  "COMPLETED",
  "DROPPED",
  "ON_HOLD",
] as const;

export const MEDIA_TYPES = ["MOVIE", "TV"] as const;

export const LIBRARY_SORT_FIELDS = [
  "statusChangedAt",
  "userRating",
  "snapshotTitle",
  "createdAt",
] as const;

export const addToLibrarySchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(MEDIA_TYPES),
  status: z.enum(LIBRARY_STATUSES).default("WANT_TO_WATCH"),
});

export const updateLibraryEntrySchema = z
  .object({
    status: z.enum(LIBRARY_STATUSES).optional(),
    userRating: z.number().min(0).max(10).multipleOf(0.5).nullable().optional(),
    review: z.string().max(2000).nullable().optional(),
    version: z.number().int().nonnegative().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined || data.userRating !== undefined || data.review !== undefined,
    { message: "At least one field must be provided" },
  );

export const listLibrarySchema = z.object({
  status: z.enum(LIBRARY_STATUSES).optional(),
  mediaType: z.enum(MEDIA_TYPES).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(LIBRARY_SORT_FIELDS).default("statusChangedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const episodeParamsSchema = z.object({
  season: z.coerce.number().int().min(0).max(100),
  episode: z.coerce.number().int().min(1).max(1000),
});

export type AddToLibraryInput = z.infer<typeof addToLibrarySchema>;
export type UpdateLibraryEntryInput = z.infer<typeof updateLibraryEntrySchema>;
export type ListLibraryQuery = z.infer<typeof listLibrarySchema>;
export type EpisodeParamsInput = z.infer<typeof episodeParamsSchema>;
