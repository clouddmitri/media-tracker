import { prisma } from "../lib/db.js";

export interface LibraryStats {
  statusCounts: { status: string; count: number }[];
  totalMinutes: number;
  completionRate: number | null;
  averageRating: number | null;
  ratingDistribution: { bucket: number; count: number; percentage: number }[];
  topGenres: { name: string; count: number }[];
  activityByMonth: { month: string; count: number }[];
}

interface StatsRow {
  status_counts: unknown;
  total_minutes: number | null;
  completed: number;
  dropped: number;
  average_rating: number | null;
  rating_distribution: unknown;
  top_genres: unknown;
  activity_by_month: unknown;
}

export async function getLibraryStats(userId: string): Promise<LibraryStats> {
  const [row] = await prisma.$queryRaw<StatsRow[]>`
    WITH entries AS (
      SELECT
        le.id,
        le.status,
        le.user_rating,
        le.status_changed_at,
        le.media_item_id,
        mi.runtime,
        mi.media_type
      FROM library_entries le
      JOIN media_items mi ON mi.id = le.media_item_id
      WHERE le.user_id = ${userId}
    ),

    watch_time AS (
      SELECT COALESCE(SUM(minutes), 0)::int AS total_minutes
      FROM (
        SELECT COALESCE(runtime, 0) AS minutes
        FROM entries
        WHERE media_type = 'MOVIE' AND status = 'COMPLETED'

        UNION ALL

        SELECT COALESCE(e.runtime, 0) * COUNT(ep.id) AS minutes
        FROM entries e
        LEFT JOIN episode_progress ep ON ep.library_entry_id = e.id
        WHERE e.media_type = 'TV'
        GROUP BY e.id, e.runtime
      ) AS parts
    ),

    status_agg AS (
      SELECT json_agg(
        json_build_object('status', status, 'count', count)
        ORDER BY count DESC
      ) AS status_counts
      FROM (
        SELECT status, COUNT(*)::int AS count
        FROM entries
        GROUP BY status
      ) s
    ),

    rating_agg AS (
      SELECT json_agg(
        json_build_object('bucket', bucket, 'count', count, 'percentage', percentage)
        ORDER BY bucket
      ) AS rating_distribution
      FROM (
        SELECT
          FLOOR(user_rating)::int AS bucket,
          COUNT(*)::int AS count,
          ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)::float AS percentage
        FROM entries
        WHERE user_rating IS NOT NULL
        GROUP BY FLOOR(user_rating)
      ) r
    ),

    genre_agg AS (
      SELECT json_agg(
        json_build_object('name', name, 'count', count)
        ORDER BY count DESC
      ) AS top_genres
      FROM (
        SELECT g.name, COUNT(*)::int AS count
        FROM entries e
        JOIN media_item_genres mig ON mig.media_item_id = e.media_item_id
        JOIN genres g ON g.id = mig.genre_id
        GROUP BY g.name
        ORDER BY count DESC
        LIMIT 8
      ) g
    ),

    activity_agg AS (
      SELECT json_agg(
        json_build_object('month', month, 'count', count)
        ORDER BY month
      ) AS activity_by_month
      FROM (
        SELECT
          to_char(date_trunc('month', status_changed_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS count
        FROM entries
        WHERE status_changed_at >= now() - interval '12 months'
        GROUP BY date_trunc('month', status_changed_at)
      ) a
    )

    SELECT
      status_agg.status_counts,
      watch_time.total_minutes,
      (SELECT COUNT(*)::int FROM entries WHERE status = 'COMPLETED') AS completed,
      (SELECT COUNT(*)::int FROM entries WHERE status = 'DROPPED') AS dropped,
      (SELECT ROUND(AVG(user_rating), 2)::float FROM entries WHERE user_rating IS NOT NULL) AS average_rating,
      rating_agg.rating_distribution,
      genre_agg.top_genres,
      activity_agg.activity_by_month
    FROM status_agg, watch_time, rating_agg, genre_agg, activity_agg`;

  if (row === undefined) {
    return emptyStats();
  }

  const finished = row.completed + row.dropped;

  return {
    statusCounts: (row.status_counts as LibraryStats["statusCounts"] | null) ?? [],
    totalMinutes: row.total_minutes ?? 0,
    completionRate: finished === 0 ? null : Math.round((row.completed / finished) * 1000) / 10,
    averageRating: row.average_rating,
    ratingDistribution:
      (row.rating_distribution as LibraryStats["ratingDistribution"] | null) ?? [],
    topGenres: (row.top_genres as LibraryStats["topGenres"] | null) ?? [],
    activityByMonth: (row.activity_by_month as LibraryStats["activityByMonth"] | null) ?? [],
  };
}

function emptyStats(): LibraryStats {
  return {
    statusCounts: [],
    totalMinutes: 0,
    completionRate: null,
    averageRating: null,
    ratingDistribution: [],
    topGenres: [],
    activityByMonth: [],
  };
}
