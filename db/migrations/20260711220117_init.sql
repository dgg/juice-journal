-- migrate:up
-- Create pgcrypto extension (required for gen_random_bytes in nanoid function)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create nanoid function (from https://github.com/viascom/nanoid-postgres)
-- Generates a compact, URL-friendly unique identifier
DROP FUNCTION IF EXISTS nanoid(int, text, float);
CREATE OR REPLACE FUNCTION nanoid(
    size int DEFAULT 21,
    alphabet text DEFAULT '_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    additionalBytesFactor float DEFAULT 1.6
)
    RETURNS text
    LANGUAGE plpgsql
    VOLATILE
    PARALLEL SAFE
AS
$$
DECLARE
    alphabetArray  text[];
    alphabetLength int := 64;
    mask           int := 63;
    step           int := 34;
BEGIN
    IF size IS NULL OR size < 1 THEN
        RAISE EXCEPTION 'The size must be defined and greater than 0!';
    END IF;

    IF alphabet IS NULL OR length(alphabet) = 0 OR length(alphabet) > 255 THEN
        RAISE EXCEPTION 'The alphabet can''t be undefined, zero or bigger than 255 symbols!';
    END IF;

    IF additionalBytesFactor IS NULL OR additionalBytesFactor < 1 THEN
        RAISE EXCEPTION 'The additional bytes factor can''t be less than 1!';
    END IF;

    alphabetArray := regexp_split_to_array(alphabet, '');
    alphabetLength := array_length(alphabetArray, 1);
    mask := (2 << cast(floor(log(alphabetLength - 1) / log(2)) as int)) - 1;
    step := cast(ceil(additionalBytesFactor * mask * size / alphabetLength) AS int);

    IF step > 1024 THEN
        step := 1024;
    END IF;

    RETURN nanoid_optimized(size, alphabet, mask, step);
END
$$;

-- Optimized version of nanoid for better performance
DROP FUNCTION IF EXISTS nanoid_optimized(int, text, int, int);
CREATE OR REPLACE FUNCTION nanoid_optimized(
    size int,
    alphabet text,
    mask int,
    step int
)
    RETURNS text
    LANGUAGE plpgsql
    VOLATILE
    PARALLEL SAFE
AS
$$
DECLARE
    idBuilder      text := '';
    counter        int  := 0;
    bytes          bytea;
    alphabetIndex  int;
    alphabetArray  text[];
    alphabetLength int  := 64;
BEGIN
    alphabetArray := regexp_split_to_array(alphabet, '');
    alphabetLength := array_length(alphabetArray, 1);

    LOOP
        bytes := gen_random_bytes(step);
        FOR counter IN 0..step - 1
            LOOP
                alphabetIndex := (get_byte(bytes, counter) & mask) + 1;
                IF alphabetIndex <= alphabetLength THEN
                    idBuilder := idBuilder || alphabetArray[alphabetIndex];
                    IF length(idBuilder) = size THEN
                        RETURN idBuilder;
                    END IF;
                END IF;
            END LOOP;
    END LOOP;
END
$$;

-- Create daypart enum type
CREATE TYPE daypart_enum AS ENUM('morning', 'afternoon');

-- Create location enum type
CREATE TYPE location_enum AS ENUM('home', 'work');

-- Create vehicles table
CREATE TABLE vehicles (
  id TEXT PRIMARY KEY DEFAULT nanoid(16),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trips table
CREATE TABLE trips (
  id TEXT PRIMARY KEY DEFAULT nanoid(16),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  start_location location_enum NOT NULL,
  end_location location_enum NOT NULL,
  daypart daypart_enum NOT NULL,
  duration INT NOT NULL,
  distance NUMERIC(8,2) NOT NULL,
  speed NUMERIC(5,1),
  consumption NUMERIC(6,2),
  weather_start JSONB,
  weather_end JSONB,
  odometer NUMERIC(8,1),
  tracking_created TIMESTAMPTZ DEFAULT now(),
  tracking_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vehicle_id, end_time)
);

COMMENT ON COLUMN trips.duration IS 'duration(qudt:MIN)';
COMMENT ON COLUMN trips.distance IS 'distance(qudt:KiloM)';
COMMENT ON COLUMN trips.speed IS 'average speed(qudt:KiloM-PER-HR)';
COMMENT ON COLUMN trips.consumption IS 'average consumption(qudt:KiloW-HR-PER-HUNDRED-KiloM)';
COMMENT ON COLUMN trips.odometer IS 'odometer(qudt:KiloM)';

-- migrate:down
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS vehicles;
DROP TYPE IF EXISTS location_enum;
DROP TYPE IF EXISTS daypart_enum;
DROP FUNCTION IF EXISTS nanoid_optimized(int, text, int, int);
DROP FUNCTION IF EXISTS nanoid(int, text, float);
DROP EXTENSION IF EXISTS pgcrypto;