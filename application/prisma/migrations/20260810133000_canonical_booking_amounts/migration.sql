-- Integer base units are canonical: meters, seconds, and currency minor units.
-- The dropped floating-point fields were display duplicates and can be derived.
ALTER TABLE "Booking"
  DROP COLUMN "distance",
  DROP COLUMN "duration",
  DROP COLUMN "price";
