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

-- Drop foreign key constraints to allow column type changes
ALTER TABLE trips DROP CONSTRAINT trips_vehicle_id_fkey;
ALTER TABLE trips DROP CONSTRAINT trips_start_location_id_fkey;
ALTER TABLE trips DROP CONSTRAINT trips_end_location_id_fkey;

-- Alter primary key columns from UUID to TEXT with nanoid default
ALTER TABLE vehicles ALTER COLUMN id TYPE TEXT, ALTER COLUMN id SET DEFAULT nanoid(16);
ALTER TABLE locations ALTER COLUMN id TYPE TEXT, ALTER COLUMN id SET DEFAULT nanoid(16);
ALTER TABLE trips ALTER COLUMN id TYPE TEXT, ALTER COLUMN id SET DEFAULT nanoid(16);

-- Alter foreign key columns from UUID to TEXT
ALTER TABLE trips ALTER COLUMN vehicle_id TYPE TEXT;
ALTER TABLE trips ALTER COLUMN start_location_id TYPE TEXT;
ALTER TABLE trips ALTER COLUMN end_location_id TYPE TEXT;

-- Recreate foreign key constraints with TEXT columns
ALTER TABLE trips ADD CONSTRAINT trips_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);
ALTER TABLE trips ADD CONSTRAINT trips_start_location_id_fkey
  FOREIGN KEY (start_location_id) REFERENCES locations(id);
ALTER TABLE trips ADD CONSTRAINT trips_end_location_id_fkey
  FOREIGN KEY (end_location_id) REFERENCES locations(id);

-- migrate:down
-- Note: This migration cannot safely roll back existing nanoid values to UUID.
-- Down migration drops FKs, alters columns back to UUID with gen_random_uuid() default,
-- and drops the nanoid function. Existing nanoid text rows are cleared.

-- Drop foreign key constraints
ALTER TABLE trips DROP CONSTRAINT trips_vehicle_id_fkey;
ALTER TABLE trips DROP CONSTRAINT trips_start_location_id_fkey;
ALTER TABLE trips DROP CONSTRAINT trips_end_location_id_fkey;

-- Clear existing rows to avoid casting errors
DELETE FROM trips;
DELETE FROM locations;
DELETE FROM vehicles;

-- Alter primary key columns back to UUID
ALTER TABLE trips ALTER COLUMN id TYPE UUID USING gen_random_uuid(), ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE locations ALTER COLUMN id TYPE UUID USING gen_random_uuid(), ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE vehicles ALTER COLUMN id TYPE UUID USING gen_random_uuid(), ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Alter foreign key columns back to UUID
ALTER TABLE trips ALTER COLUMN vehicle_id TYPE UUID;
ALTER TABLE trips ALTER COLUMN start_location_id TYPE UUID;
ALTER TABLE trips ALTER COLUMN end_location_id TYPE UUID;

-- Recreate foreign key constraints with UUID columns
ALTER TABLE trips ADD CONSTRAINT trips_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);
ALTER TABLE trips ADD CONSTRAINT trips_start_location_id_fkey
  FOREIGN KEY (start_location_id) REFERENCES locations(id);
ALTER TABLE trips ADD CONSTRAINT trips_end_location_id_fkey
  FOREIGN KEY (end_location_id) REFERENCES locations(id);

-- Drop the nanoid functions
DROP FUNCTION IF EXISTS nanoid_optimized(int, text, int, int);
DROP FUNCTION IF EXISTS nanoid(int, text, float);
