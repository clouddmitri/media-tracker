import type { UpsertMediaItemInput } from "../../repositories/media-item.repository.js";
import { TMDB_IMAGE_BASE } from "./client.js";
import type { TmdbMovieDetails, TmdbReview, TmdbSearchResult, TmdbTvDetails } from "./types.js";

export function parseTmdbDate(value: string | undefined | null): Date | null {
  if (value === undefined || value === null || value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function posterUrl(path: string | null, size = "w500"): string | null {
  return path === null ? null : `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function mapMovieDetails(raw: TmdbMovieDetails): UpsertMediaItemInput {
  return {
    tmdbId: raw.id,
    mediaType: "MOVIE",
    imdbId: raw.imdb_id,
    title: raw.title,
    overview: raw.overview,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate: parseTmdbDate(raw.release_date),
    runtime: raw.runtime,
    tmdbRating: raw.vote_average,
    tmdbVoteCount: raw.vote_count,
  };
}

export function mapTvDetails(raw: TmdbTvDetails): UpsertMediaItemInput {
  return {
    tmdbId: raw.id,
    mediaType: "TV",
    imdbId: raw.external_ids?.imdb_id ?? null,
    title: raw.name,
    overview: raw.overview,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate: parseTmdbDate(raw.first_air_date),
    runtime: raw.episode_run_time?.[0] ?? null,
    tmdbRating: raw.vote_average,
    tmdbVoteCount: raw.vote_count,
    totalSeasons: raw.number_of_seasons,
    totalEpisodes: raw.number_of_episodes,
  };
}

export interface SearchItem {
  tmdbId: number;
  mediaType: "MOVIE" | "TV";
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: Date | null;
  tmdbRating: number | null;
}

export function mapSearchResult(raw: TmdbSearchResult): SearchItem | null {
  if (raw.media_type === "person") return null;

  const title = raw.media_type === "movie" ? raw.title : raw.name;
  if (title === undefined || title.trim() === "") return null;

  return {
    tmdbId: raw.id,
    mediaType: raw.media_type === "movie" ? "MOVIE" : "TV",
    title,
    overview: raw.overview ?? null,
    posterPath: raw.poster_path,
    releaseDate: parseTmdbDate(raw.media_type === "movie" ? raw.release_date : raw.first_air_date),
    tmdbRating: raw.vote_average ?? null,
  };
}

export interface ExternalReviewItem {
  externalId: string;
  author: string;
  content: string;
  rating: number | null;
  url: string;
  publishedAt: Date | null;
}

const REVIEW_MAX_LENGTH = 1000;

export function mapReview(raw: TmdbReview): ExternalReviewItem {
  const content =
    raw.content.length > REVIEW_MAX_LENGTH
      ? `${raw.content.slice(0, REVIEW_MAX_LENGTH)}…`
      : raw.content;

  return {
    externalId: raw.id,
    author: raw.author,
    content,
    rating: raw.author_details.rating,
    url: raw.url,
    publishedAt: parseTmdbDate(raw.created_at),
  };
}
