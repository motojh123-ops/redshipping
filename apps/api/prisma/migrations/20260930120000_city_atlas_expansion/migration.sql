-- AlterTable
ALTER TABLE "cities" ADD COLUMN     "city_code" VARCHAR(20),
ADD COLUMN     "is_logistics_hub" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "state" VARCHAR(150),
ADD COLUMN     "timezone" VARCHAR(64),
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

