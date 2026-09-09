/*
  Warnings:

  - You are about to drop the `media_item_seasons` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "media_item_seasons" DROP CONSTRAINT "media_item_seasons_media_item_id_fkey";

-- DropTable
DROP TABLE "media_item_seasons";
