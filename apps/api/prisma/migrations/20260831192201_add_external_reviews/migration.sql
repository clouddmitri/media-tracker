-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('TMDB');

-- CreateTable
CREATE TABLE "external_reviews" (
    "id" TEXT NOT NULL,
    "media_item_id" TEXT NOT NULL,
    "source" "ReviewSource" NOT NULL,
    "external_id" VARCHAR(100) NOT NULL,
    "author" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "rating" DECIMAL(3,1),
    "url" VARCHAR(500) NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "fetched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_reviews_media_item_id_published_at_idx" ON "external_reviews"("media_item_id", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "external_reviews_source_external_id_key" ON "external_reviews"("source", "external_id");

-- AddForeignKey
ALTER TABLE "external_reviews" ADD CONSTRAINT "external_reviews_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
