-- AlterTable
ALTER TABLE "ports" ADD COLUMN     "city_id" UUID;

-- AddForeignKey
ALTER TABLE "ports" ADD CONSTRAINT "ports_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

