export type MediaTypeValue = "MOVIE" | "TV";

export type LibraryStatusValue = "WANT_TO_WATCH" | "WATCHING" | "COMPLETED" | "DROPPED" | "ON_HOLD";

export interface MediaItemDTO {
  id: string;
  tmdbId: number;
  imdbId: string | null;
  mediaType: MediaTypeValue;
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: Date | null;
  runtime: number | null;
  imdbRating: number | null;
  rottenTomatoes: number | null;
  metacritic: number | null;
  tmdbRating: number | null;
  syncedAt: Date;
  totalSeasons: number | null;
  totalEpisodes: number | null;
}

export interface LibraryEntryDTO {
  id: string;
  mediaItemId: string;
  status: LibraryStatusValue;
  version: number;
  userRating: number | null;
  review: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  statusChangedAt: Date;
  snapshotTitle: string;
  snapshotPosterPath: string | null;
  snapshotMediaType: MediaTypeValue;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ExternalReviewDTO {
  id: string;
  author: string;
  content: string;
  rating: number | null;
  url: string;
  publishedAt: Date | null;
  source: "TMDB";
}
