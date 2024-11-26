/*
  Warnings:

  - You are about to drop the column `url` on the `User` table. All the data in the column will be lost.
  - Made the column `blogName` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "url",
ADD COLUMN     "profilePicture" TEXT,
ALTER COLUMN "blogName" SET NOT NULL,
ALTER COLUMN "blogName" DROP DEFAULT,
ALTER COLUMN "blogName" SET DATA TYPE TEXT;
