-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MOVIE', 'TV');

-- CreateEnum
CREATE TYPE "LibraryStatus" AS ENUM ('WANT_TO_WATCH', 'WATCHING', 'COMPLETED', 'DROPPED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_items" (
    "id" TEXT NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "imdb_id" VARCHAR(20),
    "media_type" "MediaType" NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "overview" TEXT,
    "poster_path" VARCHAR(255),
    "backdrop_path" VARCHAR(255),
    "release_date" DATE,
    "runtime" INTEGER,
    "imdb_rating" DECIMAL(3,1),
    "imdb_votes" INTEGER,
    "rotten_tomatoes" INTEGER,
    "metacritic" INTEGER,
    "tmdb_rating" DECIMAL(3,1),
    "tmdb_vote_count" INTEGER,
    "synced_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_item_genres" (
    "media_item_id" TEXT NOT NULL,
    "genre_id" TEXT NOT NULL,

    CONSTRAINT "media_item_genres_pkey" PRIMARY KEY ("media_item_id","genre_id")
);

-- CreateTable
CREATE TABLE "library_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "media_item_id" TEXT NOT NULL,
    "status" "LibraryStatus" NOT NULL DEFAULT 'WANT_TO_WATCH',
    "user_rating" DECIMAL(3,1),
    "review" TEXT,
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "status_changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot_title" VARCHAR(500) NOT NULL,
    "snapshot_poster_path" VARCHAR(255),
    "snapshot_release_date" DATE,
    "snapshot_media_type" "MediaType" NOT NULL,
    "snapshot_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "library_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_progress" (
    "id" TEXT NOT NULL,
    "library_entry_id" TEXT NOT NULL,
    "season_number" INTEGER NOT NULL,
    "episode_number" INTEGER NOT NULL,
    "watched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "episode_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_runs" (
    "id" TEXT NOT NULL,
    "job_type" VARCHAR(100) NOT NULL,
    "status" "PipelineStatus" NOT NULL,
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "error_detail" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),

    CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "media_items_synced_at_idx" ON "media_items"("synced_at");

-- CreateIndex
CREATE UNIQUE INDEX "media_items_tmdb_id_media_type_key" ON "media_items"("tmdb_id", "media_type");

-- CreateIndex
CREATE UNIQUE INDEX "genres_tmdb_id_key" ON "genres"("tmdb_id");

-- CreateIndex
CREATE INDEX "media_item_genres_genre_id_idx" ON "media_item_genres"("genre_id");

-- CreateIndex
CREATE INDEX "library_entries_user_id_status_idx" ON "library_entries"("user_id", "status");

-- CreateIndex
CREATE INDEX "library_entries_media_item_id_idx" ON "library_entries"("media_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "library_entries_user_id_media_item_id_key" ON "library_entries"("user_id", "media_item_id");

-- CreateIndex
CREATE INDEX "episode_progress_library_entry_id_idx" ON "episode_progress"("library_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "episode_progress_library_entry_id_season_number_episode_num_key" ON "episode_progress"("library_entry_id", "season_number", "episode_number");

-- CreateIndex
CREATE INDEX "pipeline_runs_job_type_started_at_idx" ON "pipeline_runs"("job_type", "started_at");

-- AddForeignKey
ALTER TABLE "media_item_genres" ADD CONSTRAINT "media_item_genres_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_item_genres" ADD CONSTRAINT "media_item_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_progress" ADD CONSTRAINT "episode_progress_library_entry_id_fkey" FOREIGN KEY ("library_entry_id") REFERENCES "library_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rating and score bounds enforced at the database level.
-- Application validation is bypassable by anything connecting directly.

ALTER TABLE "library_entries"
  ADD CONSTRAINT "library_entries_user_rating_range"
  CHECK ("user_rating" IS NULL OR ("user_rating" >= 0 AND "user_rating" <= 10));

ALTER TABLE "media_items"
  ADD CONSTRAINT "media_items_rotten_tomatoes_range"
  CHECK ("rotten_tomatoes" IS NULL OR ("rotten_tomatoes" BETWEEN 0 AND 100));

ALTER TABLE "media_items"
  ADD CONSTRAINT "media_items_metacritic_range"
  CHECK ("metacritic" IS NULL OR ("metacritic" BETWEEN 0 AND 100));

ALTER TABLE "media_items"
  ADD CONSTRAINT "media_items_imdb_rating_range"
  CHECK ("imdb_rating" IS NULL OR ("imdb_rating" >= 0 AND "imdb_rating" <= 10));

ALTER TABLE "episode_progress"
  ADD CONSTRAINT "episode_progress_valid_numbers"
  CHECK ("season_number" >= 0 AND "episode_number" > 0);

ALTER TABLE "library_entries"
  ADD CONSTRAINT "library_entries_completed_after_started"
  CHECK ("started_at" IS NULL OR "completed_at" IS NULL OR "completed_at" >= "started_at");
