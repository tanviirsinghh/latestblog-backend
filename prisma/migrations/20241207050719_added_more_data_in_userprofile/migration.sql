-- AlterTable
ALTER TABLE "User" ADD COLUMN     "Twitter" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "coverpicture" TEXT,
ADD COLUMN     "github" TEXT,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "location" TEXT,
ALTER COLUMN "blogName" DROP NOT NULL;
