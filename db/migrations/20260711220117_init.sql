-- migrate:up
-- Create daypart enum type
CREATE TYPE daypart_enum AS ENUM('morning', 'afternoon');

-- Create vehicles table
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create locations table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  timezone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  start_location_id UUID REFERENCES locations(id),
  end_location_id UUID REFERENCES locations(id),
  daypart daypart_enum NOT NULL,
  duration_min INT NOT NULL,
  distance_km NUMERIC(8,2) NOT NULL,
  avg_speed_kmh NUMERIC(5,1),
  avg_consumption_kwh_100km NUMERIC(6,2),
  weather_start JSONB,
  weather_end JSONB,
  odometer_km NUMERIC(8,1),
  tracking_created TIMESTAMPTZ DEFAULT now(),
  tracking_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vehicle_id, end_time)
);

-- migrate:down
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS vehicles;
DROP TYPE IF EXISTS daypart_enum;
