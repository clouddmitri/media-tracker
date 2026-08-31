import { tmdbClient } from "./client.js";
import {
  parseTmdbDate,
  mapMovieDetails,
  mapReview,
  mapSearchResult,
  mapTvDetails,
  type ExternalReviewItem,
  type SearchItem,
} from "./mappers.js";
import type {
  TmdbMovieDetails,
  TmdbPaginated,
  TmdbReview,
  TmdbSearchResult,
  TmdbTvDetails,
} from "./types.js";
import type { UpsertMediaItemInput } from "../../repositories/media-item.repository.js";

export type { SearchItem, ExternalReviewItem };

function withCorrelationId<T extends Record<string, unknown>>(
  options: T,
  correlationId?: string,
): T | (T & { correlationId: string }) {
  return correlationId === undefined ? options : { ...options, correlationId };
}

export async function getMovieDetails(
  tmdbId: number,
  correlationId?: string,
): Promise<UpsertMediaItemInput> {
  const raw = await tmdbClient.get<TmdbMovieDetails>(
    `movie/${String(tmdbId)}`,
    withCorrelationId({}, correlationId),
  );
  return mapMovieDetails(raw);
}

export async function getTvDetails(
  tmdbId: number,
  correlationId?: string,
): Promise<UpsertMediaItemInput> {
  const raw = await tmdbClient.get<TmdbTvDetails>(
    `tv/${String(tmdbId)}`,
    withCorrelationId({ query: { append_to_response: "external_ids" } }, correlationId),
  );
  return mapTvDetails(raw);
}

export async function getDetails(
  tmdbId: number,
  mediaType: "MOVIE" | "TV",
  correlationId?: string,
): Promise<UpsertMediaItemInput> {
  return mediaType === "MOVIE"
    ? getMovieDetails(tmdbId, correlationId)
    : getTvDetails(tmdbId, correlationId);
}

export interface SearchPage {
  items: SearchItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export async function searchMulti(
  query: string,
  page = 1,
  correlationId?: string,
): Promise<SearchPage> {
  const raw = await tmdbClient.get<TmdbPaginated<TmdbSearchResult>>(
    "search/multi",
    withCorrelationId({ query: { query, page, include_adult: "false" } }, correlationId),
  );

  return {
    items: raw.results.map(mapSearchResult).filter((item): item is SearchItem => item !== null),
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
  };
}

export async function getTrending(
  mediaType: "MOVIE" | "TV",
  window: "day" | "week" = "week",
  correlationId?: string,
): Promise<SearchItem[]> {
  const segment = mediaType === "MOVIE" ? "movie" : "tv";
  const raw = await tmdbClient.get<TmdbPaginated<TmdbSearchResult>>(
    `trending/${segment}/${window}`,
    withCorrelationId({}, correlationId),
  );

  return raw.results
    .map((r) => mapSearchResult({ ...r, media_type: segment }))
    .filter((item): item is SearchItem => item !== null);
}

export interface GenreItem {
  tmdbId: number;
  name: string;
}

export async function getGenres(
  mediaType: "MOVIE" | "TV",
  correlationId?: string,
): Promise<GenreItem[]> {
  const segment = mediaType === "MOVIE" ? "movie" : "tv";
  const raw = await tmdbClient.get<{ genres: { id: number; name: string }[] }>(
    `genre/${segment}/list`,
    withCorrelationId({}, correlationId),
  );
  return raw.genres.map((g) => ({ tmdbId: g.id, name: g.name }));
}

export async function getReviews(
  tmdbId: number,
  mediaType: "MOVIE" | "TV",
  correlationId?: string,
): Promise<ExternalReviewItem[]> {
  const segment = mediaType === "MOVIE" ? "movie" : "tv";
  const raw = await tmdbClient.get<TmdbPaginated<TmdbReview>>(
    `${segment}/${String(tmdbId)}/reviews`,
    withCorrelationId({}, correlationId),
  );
  return raw.results.map(mapReview);
}

export interface EpisodeItem {
  episodeNumber: number;
  name: string;
  airDate: Date | null;
  runtime: number | null;
}

export async function getSeasonDetails(
  tmdbId: number,
  seasonNumber: number,
  correlationId?: string,
): Promise<EpisodeItem[]> {
  const raw = await tmdbClient.get<{
    episodes: {
      episode_number: number;
      name: string;
      air_date: string | null;
      runtime: number | null;
    }[];
  }>(`tv/${String(tmdbId)}/season/${String(seasonNumber)}`, withCorrelationId({}, correlationId));

  return raw.episodes.map((e) => ({
    episodeNumber: e.episode_number,
    name: e.name,
    airDate: parseTmdbDate(e.air_date),
    runtime: e.runtime,
  }));
}
