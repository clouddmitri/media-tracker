-- CreateTable
CREATE TABLE "media_item_seasons" (
    "media_item_id" TEXT NOT NULL,
    "season_number" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "episode_count" INTEGER NOT NULL,
    "air_date" DATE,
    "poster_path" VARCHAR(255),

    CONSTRAINT "media_item_seasons_pkey" PRIMARY KEY ("media_item_id","season_number")
);

-- AddForeignKey
ALTER TABLE "media_item_seasons" ADD CONSTRAINT "media_item_seasons_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
