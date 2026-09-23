-- CreateEnum for trip status is intentionally avoided; status is a varchar to match the service layer.
CREATE TABLE "dispatch_trips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "shipment_id" UUID,
    "trip_number" VARCHAR(50) NOT NULL,
    "client_name" VARCHAR(255) NOT NULL,
    "container_number" VARCHAR(20),
    "container_type" VARCHAR(50),
    "pickup_location" VARCHAR(255),
    "delivery_location" VARCHAR(255),
    "driver_name" VARCHAR(150),
    "driver_phone" VARCHAR(50),
    "truck_plate" VARCHAR(50),
    "truck_type" VARCHAR(100),
    "status" VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    "scheduled_date" DATE,
    "departure_time" VARCHAR(10),
    "estimated_arrival" VARCHAR(10),
    "actual_arrival" VARCHAR(10),
    "cost_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sell_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EGP',
    "waybill_number" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_trips_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dispatch_trips_company_id_trip_number_key" ON "dispatch_trips"("company_id", "trip_number");

ALTER TABLE "dispatch_trips" ADD CONSTRAINT "dispatch_trips_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dispatch_trips" ADD CONSTRAINT "dispatch_trips_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON UPDATE CASCADE;
