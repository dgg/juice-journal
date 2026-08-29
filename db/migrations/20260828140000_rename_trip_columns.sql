-- migrate:up
-- Rename unit-suffixed columns to unit-free names
-- Units are documented via COMMENT ON COLUMN

ALTER TABLE trips RENAME COLUMN duration_min TO duration;
COMMENT ON COLUMN trips.duration IS 'duration(qudt:MIN)';

ALTER TABLE trips RENAME COLUMN distance_km TO distance;
COMMENT ON COLUMN trips.distance IS 'distance(qudt:KiloM)';

ALTER TABLE trips RENAME COLUMN avg_speed_kmh TO speed;
COMMENT ON COLUMN trips.speed IS 'average speed(qudt:KiloM-PER-HR)';

ALTER TABLE trips RENAME COLUMN avg_consumption_kwh_100km TO consumption;
COMMENT ON COLUMN trips.consumption IS 'average consumption(qudt_:KiloW-HR-PER-HUNDRED-KiloM)';

ALTER TABLE trips RENAME COLUMN odometer_km TO odometer;
COMMENT ON COLUMN trips.odometer IS 'odometer(qudt:KiloM)';

-- migrate:down
ALTER TABLE trips RENAME COLUMN duration TO duration_min;
ALTER TABLE trips RENAME COLUMN distance TO distance_km;
ALTER TABLE trips RENAME COLUMN speed TO avg_speed_kmh;
ALTER TABLE trips RENAME COLUMN consumption TO avg_consumption_kwh_100km;
ALTER TABLE trips RENAME COLUMN odometer TO odometer_km;
