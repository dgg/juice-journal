-- migrate:up

INSERT INTO vehicles (description)
VALUES ('commuter');

INSERT INTO locations (label, latitude, longitude, timezone)
VALUES ('home', 0, 0, 'Europe/Copenhagen'),
       ('work', 0, 0, 'Europe/Copenhagen');

-- migrate:down

DELETE FROM locations WHERE label IN ('home', 'work');
DELETE FROM vehicles WHERE description = 'commuter';